"""
Chat REST API views.

Endpoints:
  POST   /api/chat/conversations/start                    — start buyer-seller chat from product
  POST   /api/chat/conversations                          — create conversation
  GET    /api/chat/conversations                          — list my conversations
  GET    /api/chat/conversations/<id>                     — conversation detail
  POST   /api/chat/conversations/<id>/participants        — add participant
  GET    /api/chat/conversations/<id>/messages            — paginated history
  GET    /api/chat/conversations/<id>/messages/search     — full-text search
  GET    /api/chat/conversations/<id>/context             — order context
  PATCH  /api/chat/messages/<id>                          — edit message
  DELETE /api/chat/messages/<id>                          — soft-delete message
  POST   /api/chat/messages/<id>/attachments              — upload attachment
  GET    /api/chat/inbox                                  — seller inbox
  GET    /api/chat/quick-replies                          — list templates
  POST   /api/chat/quick-replies                          — create template
  DELETE /api/chat/quick-replies/<id>                     — delete template
  POST   /api/chat/push-tokens                            — register push token
  DELETE /api/chat/push-tokens/<token>                    — deregister push token
"""

import os
import uuid

from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Conversation, Participant, Message, MessageRecipientStatus,
    Attachment, QuickReplyTemplate, AuditLog, PushToken,
    sanitize_message, ALLOWED_MIME_TYPES,
)
from .serializers import (
    ConversationSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageEditSerializer,
    QuickReplySerializer, PushTokenSerializer,
)

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


def _is_participant(user, conversation):
    return Participant.objects.filter(conversation=conversation, user=user).exists()


# ── Conversation list / create ────────────────────────────────────────────────

class ConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'admin':
            qs = Conversation.objects.all()
        else:
            qs = Conversation.objects.filter(participants__user=user)
        qs = qs.prefetch_related('participants__user').order_by('-updated_at')
        return Response(ConversationSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        ser = ConversationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Validate order ownership for order_linked
        order = None
        if d['conversation_type'] == Conversation.Type.order_linked:
            order_id = d.get('order_id')
            if not order_id:
                return Response({'detail': 'order_id required for order_linked conversations.'},
                                status=status.HTTP_400_BAD_REQUEST)
            from purchases.models import Order
            try:
                order = Order.objects.get(pk=order_id)
            except Order.DoesNotExist:
                return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
            # Only buyer or seller of the order may create
            seller_ids = order.items.values_list('product__seller_id', flat=True)
            if request.user.id != order.user_id and request.user.id not in seller_ids:
                return Response({'detail': 'Not authorized for this order.'}, status=status.HTTP_403_FORBIDDEN)

        conv = Conversation.objects.create(
            conversation_type=d['conversation_type'],
            order=order,
            title=d.get('title', ''),
            created_by=request.user,
        )
        # Add creator + requested participants
        all_ids = set(d['participant_ids']) | {request.user.id}
        for uid in all_ids:
            Participant.objects.get_or_create(conversation=conv, user_id=uid)

        return Response(
            ConversationSerializer(conv, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


# ── Conversation detail ───────────────────────────────────────────────────────

class ConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_conv(self, pk, user):
        try:
            conv = Conversation.objects.prefetch_related('participants__user').get(pk=pk)
        except Conversation.DoesNotExist:
            return None, Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.role != 'admin' and not _is_participant(user, conv):
            # Audit log for admin access
            return None, Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'admin' and not _is_participant(user, conv):
            AuditLog.objects.create(
                actor=user, action='moderate', conversation=conv,
            )
        return conv, None

    def get(self, request, pk):
        conv, err = self._get_conv(pk, request.user)
        if err:
            return err
        return Response(ConversationSerializer(conv, context={'request': request}).data)


# ── Add participant ───────────────────────────────────────────────────────────

class AddParticipantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_participant(request.user, conv):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        Participant.objects.get_or_create(conversation=conv, user_id=user_id)
        return Response({'detail': 'Participant added.'})


# ── Message history ───────────────────────────────────────────────────────────

class MessageListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'admin' and not _is_participant(request.user, conv):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Message.objects.filter(conversation=conv).select_related('sender').prefetch_related('attachments').order_by('-created_at')
        before_id = request.query_params.get('before_id')
        if before_id:
            try:
                qs = qs.filter(id__lt=int(before_id))
            except ValueError:
                pass
        limit = min(int(request.query_params.get('limit', 50)), 100)
        messages = list(reversed(list(qs[:limit])))
        return Response(MessageSerializer(messages, many=True).data)


# ── Message search ────────────────────────────────────────────────────────────

class MessageSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'admin' and not _is_participant(request.user, conv):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response([])

        # Simple icontains search (works on SQLite; swap for tsvector on PostgreSQL)
        qs = (
            Message.objects
            .filter(conversation=conv, is_deleted=False, content__icontains=q)
            .select_related('sender')
            .prefetch_related('attachments')
            .order_by('-created_at')[:50]
        )
        return Response(MessageSerializer(list(qs), many=True).data)


# ── Order context ─────────────────────────────────────────────────────────────

class ConversationContextView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = Conversation.objects.select_related('order__delivery').get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'admin' and not _is_participant(request.user, conv):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if conv.conversation_type != Conversation.Type.order_linked or not conv.order:
            return Response({'detail': 'No order context for this conversation.'}, status=status.HTTP_400_BAD_REQUEST)

        order = conv.order
        delivery = getattr(order, 'delivery', None)
        steps = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']
        status_map = {
            'pending':   1, 'paid': 2, 'shipped': 3,
            'delivered': 4,
        }
        current_step = status_map.get(order.status, 0)

        return Response({
            'order_id':      order.id,
            'order_status':  order.status,
            'total_price':   str(order.total_price),
            'delivery_status': delivery.status if delivery else None,
            'delivery_steps': [
                {'label': s, 'completed': i < current_step}
                for i, s in enumerate(steps)
            ],
        })


# ── Message edit / soft-delete ────────────────────────────────────────────────

class MessageEditView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, msg_id):
        try:
            msg = Message.objects.select_related('conversation').get(pk=msg_id)
        except Message.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if msg.sender_id != request.user.id:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        ser = MessageEditSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new_content = sanitize_message(ser.validated_data['content'])

        AuditLog.objects.create(
            actor=request.user, action='edit',
            conversation=msg.conversation, message=msg,
            previous_content=msg.content, new_content=new_content,
            ip_address=_get_client_ip(request),
        )
        msg.content = new_content
        msg.edited_at = timezone.now()
        msg.save(update_fields=['content', 'edited_at'])

        # Broadcast edit event via channel layer
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                f'conversation_{msg.conversation_id}',
                {
                    'type': 'chat.message_edited',
                    'message_id': msg.id,
                    'content': msg.content,
                    'edited_at': msg.edited_at.isoformat(),
                },
            )
        return Response(MessageSerializer(msg).data)

    def delete(self, request, msg_id):
        try:
            msg = Message.objects.get(pk=msg_id)
        except Message.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if msg.sender_id != request.user.id:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        AuditLog.objects.create(
            actor=request.user, action='delete',
            conversation=msg.conversation, message=msg,
            previous_content=msg.content,
            ip_address=_get_client_ip(request),
        )
        msg.is_deleted = True
        msg.content = '[message deleted]'
        msg.save(update_fields=['is_deleted', 'content'])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Attachments ───────────────────────────────────────────────────────────────

class AttachmentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, msg_id):
        try:
            msg = Message.objects.select_related('conversation').get(pk=msg_id)
        except Message.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_participant(request.user, msg.conversation):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'file field required.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > MAX_ATTACHMENT_BYTES:
            return Response({'detail': 'File exceeds 10 MB limit.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        if file.content_type not in ALLOWED_MIME_TYPES:
            return Response({'detail': f'File type {file.content_type} not allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save to MEDIA_ROOT (swap for S3 in production)
        from django.conf import settings as django_settings
        ext = os.path.splitext(file.name)[1]
        filename = f'{uuid.uuid4().hex}{ext}'
        save_path = os.path.join(django_settings.MEDIA_ROOT, 'chat_attachments', filename)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        file_url = f'{django_settings.MEDIA_URL}chat_attachments/{filename}'
        attachment = Attachment.objects.create(
            message=msg,
            file_url=file_url,
            mime_type=file.content_type,
            file_name=file.name,
            file_size=file.size,
        )

        # Broadcast attachment_added
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                f'conversation_{msg.conversation_id}',
                {
                    'type': 'chat.message',
                    'id': msg.id,
                    'content': f'[attachment: {file.name}]',
                    'sender_id': request.user.id,
                    'sender_username': request.user.username,
                    'created_at': msg.created_at.isoformat(),
                    'msg_type': 'text',
                },
            )
        return Response({
            'id': attachment.id,
            'file_url': attachment.file_url,
            'mime_type': attachment.mime_type,
            'file_name': attachment.file_name,
        }, status=status.HTTP_201_CREATED)


# ── Seller inbox ──────────────────────────────────────────────────────────────

class InboxView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('seller', 'admin'):
            return Response({'detail': 'Sellers only.'}, status=status.HTTP_403_FORBIDDEN)
        qs = (
            Conversation.objects
            .filter(participants__user=request.user)
            .prefetch_related('participants__user')
            .order_by('-updated_at')
        )
        return Response(ConversationSerializer(qs, many=True, context={'request': request}).data)


# ── Quick replies ─────────────────────────────────────────────────────────────

class QuickReplyListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = QuickReplyTemplate.objects.filter(owner=request.user)
        return Response(QuickReplySerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role not in ('seller', 'admin'):
            return Response({'detail': 'Sellers and admins only.'}, status=status.HTTP_403_FORBIDDEN)
        ser = QuickReplySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(owner=request.user)
        return Response(QuickReplySerializer(obj).data, status=status.HTTP_201_CREATED)


class QuickReplyDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            obj = QuickReplyTemplate.objects.get(pk=pk, owner=request.user)
        except QuickReplyTemplate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Push tokens ───────────────────────────────────────────────────────────────

class PushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = PushTokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj, _ = PushToken.objects.get_or_create(
            token=ser.validated_data['token'],
            defaults={
                'user': request.user,
                'platform': ser.validated_data.get('platform', 'fcm'),
            },
        )
        return Response(PushTokenSerializer(obj).data, status=status.HTTP_201_CREATED)

    def delete(self, request, token):
        PushToken.objects.filter(user=request.user, token=token).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Start buyer-seller conversation from a product ────────────────────────────

class StartConversationView(APIView):
    """
    POST /api/chat/conversations/start
    Body: { "product_id": 42 }

    Creates (or reopens) a buyer_seller conversation between the current user
    and the product's seller. Returns the conversation + pinned product context.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from catalog.models import Product
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'detail': 'product_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.select_related('seller', 'category').get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        buyer  = request.user
        seller = product.seller

        if buyer.id == seller.id:
            return Response({'detail': 'You cannot chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find existing buyer_seller conversation between these two users for this product
        existing = (
            Conversation.objects
            .filter(
                conversation_type=Conversation.Type.buyer_seller,
                title__startswith=f'product:{product_id}:',
            )
            .filter(participants__user=buyer)
            .filter(participants__user=seller)
            .first()
        )

        if existing:
            conv = existing
        else:
            conv = Conversation.objects.create(
                conversation_type=Conversation.Type.buyer_seller,
                title=f'product:{product_id}:{product.name[:80]}',
                created_by=buyer,
            )
            Participant.objects.create(conversation=conv, user=buyer)
            Participant.objects.create(conversation=conv, user=seller)

            # Inject a system message pinning the product context
            from .models import sanitize_message
            Message.objects.create(
                conversation=conv,
                sender=None,
                content=f'[Product] {product.name} — {product.price} ETB',
                msg_type=Message.MsgType.system,
            )

        # Build pinned product card payload
        images = list(product.images.order_by('sort_order').values('image_url')[:1])
        product_card = {
            'id':          product.id,
            'name':        product.name,
            'price':       str(product.price),
            'image_url':   images[0]['image_url'] if images else None,
            'category':    product.category.name if product.category else '',
            'seller_id':   seller.id,
            'seller_name': seller.username,
            'in_stock':    product.stock > 0,
        }

        return Response({
            'conversation': ConversationSerializer(conv, context={'request': request}).data,
            'product_card': product_card,
        }, status=status.HTTP_200_OK)


# ── Inject system message into order-linked conversations ─────────────────────

def inject_order_system_message(order_id: int, text: str) -> None:
    """
    Called from purchases/logistics signals to push a system message
    into any order-linked conversation for this order.
    Broadcasts via channel layer so connected clients see it instantly.
    """
    convs = Conversation.objects.filter(
        conversation_type=Conversation.Type.order_linked,
        order_id=order_id,
    )
    for conv in convs:
        msg = Message.objects.create(
            conversation=conv,
            sender=None,
            content=text,
            msg_type=Message.MsgType.system,
        )
        conv.updated_at = msg.created_at
        conv.save(update_fields=['updated_at'])

        # Broadcast to WebSocket group
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            layer = get_channel_layer()
            if layer:
                async_to_sync(layer.group_send)(
                    f'conversation_{conv.id}',
                    {
                        'type': 'chat.delivery_update',
                        'message_id': msg.id,
                        'content': msg.content,
                        'created_at': msg.created_at.isoformat(),
                    },
                )
        except Exception:
            pass
