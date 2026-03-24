"""
ChatConsumer — production WebSocket handler.

URL: ws/chat/<conversation_id>/?token=<jwt>

Supported inbound event types:
  { "type": "chat_message",  "content": "Hello!" }
  { "type": "typing",        "is_typing": true }
  { "type": "read_receipt",  "message_id": 42 }

Outbound event types:
  history | chat_message | typing | read_receipt | delivered |
  message_edited | delivery_update | rate_limit_exceeded | error
"""

import json
import time
from collections import defaultdict

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone


# ── Simple in-process rate limiter (per user, per worker) ────────────────────
_rate_buckets: dict[int, list[float]] = defaultdict(list)
RATE_LIMIT = 30   # messages
RATE_WINDOW = 60  # seconds


def _check_rate_limit(user_id: int) -> bool:
    """Return True if allowed, False if rate-limited."""
    now = time.monotonic()
    bucket = _rate_buckets[user_id]
    # Drop timestamps outside the window
    _rate_buckets[user_id] = [t for t in bucket if now - t < RATE_WINDOW]
    if len(_rate_buckets[user_id]) >= RATE_LIMIT:
        return False
    _rate_buckets[user_id].append(now)
    return True


class ChatConsumer(AsyncWebsocketConsumer):

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def connect(self) -> None:
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.group_name = f'conversation_{self.conversation_id}'
        self.user = self.scope.get('user')
        self.is_typing = False

        # 1. Auth check
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # 2. Participant check
        allowed = await self._check_participant()
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # 3. Send history
        history = await self._get_history()
        await self.send(text_data=json.dumps({'type': 'history', 'messages': history}))

    async def disconnect(self, code: int) -> None:
        # Auto-stop typing on disconnect
        if getattr(self, 'is_typing', False) and hasattr(self, 'group_name'):
            await self.channel_layer.group_send(self.group_name, {
                'type': 'chat.typing',
                'sender_id': self.user.id,
                'sender_username': self.user.username,
                'is_typing': False,
            })
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data: str = '', bytes_data: bytes = None) -> None:
        # Reject oversized payloads (64 KB)
        if text_data and len(text_data.encode()) > 65536:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'payload_too_large',
                'detail': 'Message exceeds 64 KB limit.',
            }))
            await self.close(code=1009)
            return

        try:
            payload = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'invalid_payload', 'detail': 'Invalid JSON.',
            }))
            return

        msg_type = payload.get('type', 'chat_message')

        if msg_type == 'chat_message':
            await self._handle_chat_message(payload)
        elif msg_type == 'typing':
            await self._handle_typing(payload)
        elif msg_type == 'read_receipt':
            await self._handle_read_receipt(payload)
        else:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'unknown_type',
                'detail': f'Unknown message type: {msg_type}',
            }))

    # ── Inbound handlers ──────────────────────────────────────────────────────

    async def _handle_chat_message(self, payload: dict) -> None:
        content = (payload.get('content') or '').strip()
        if not content:
            return

        # Rate limit
        if not _check_rate_limit(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'rate_limit_exceeded',
                'detail': 'Too many messages. Slow down.',
            }))
            return

        # Persist + broadcast
        msg_data = await self._save_message(content)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat.message',
            **msg_data,
        })

    async def _handle_typing(self, payload: dict) -> None:
        self.is_typing = bool(payload.get('is_typing', False))
        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat.typing',
            'sender_id': self.user.id,
            'sender_username': self.user.username,
            'is_typing': self.is_typing,
        })

    async def _handle_read_receipt(self, payload: dict) -> None:
        message_id = payload.get('message_id')
        if not message_id:
            return
        await self._mark_read(message_id)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat.read_receipt',
            'message_id': message_id,
            'reader_id': self.user.id,
            'reader_username': self.user.username,
            'read_at': timezone.now().isoformat(),
        })

    # ── Group event handlers (called by channel layer) ────────────────────────

    async def chat_message(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'content': event['content'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'created_at': event['created_at'],
            'msg_type': event.get('msg_type', 'text'),
        }))
        # Mark as delivered for this recipient
        if event['sender_id'] != self.user.id:
            await self._mark_delivered(event['id'])
            await self.channel_layer.group_send(self.group_name, {
                'type': 'chat.delivered',
                'message_id': event['id'],
                'recipient_id': self.user.id,
            })

    async def chat_typing(self, event: dict) -> None:
        if event['sender_id'] == self.user.id:
            return
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'is_typing': event['is_typing'],
        }))

    async def chat_read_receipt(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'reader_id': event['reader_id'],
            'reader_username': event['reader_username'],
            'read_at': event['read_at'],
        }))

    async def chat_delivered(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            'type': 'delivered',
            'message_id': event['message_id'],
            'recipient_id': event['recipient_id'],
        }))

    async def chat_message_edited(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_at': event['edited_at'],
        }))

    async def chat_delivery_update(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            'type': 'delivery_update',
            'message_id': event['message_id'],
            'content': event['content'],
            'created_at': event['created_at'],
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _check_participant(self) -> bool:
        from .models import Conversation, Participant
        try:
            conv = Conversation.objects.get(pk=self.conversation_id)
        except Conversation.DoesNotExist:
            return False
        self.conversation_obj = conv
        return Participant.objects.filter(
            conversation=conv, user=self.user
        ).exists()

    @database_sync_to_async
    def _save_message(self, content: str) -> dict:
        from .models import Message, MessageRecipientStatus, Participant, sanitize_message
        clean = sanitize_message(content)
        msg = Message.objects.create(
            conversation=self.conversation_obj,
            sender=self.user,
            content=clean,
        )
        # Create sent status for every other participant
        recipients = Participant.objects.filter(
            conversation=self.conversation_obj
        ).exclude(user=self.user).values_list('user_id', flat=True)
        MessageRecipientStatus.objects.bulk_create([
            MessageRecipientStatus(message=msg, recipient_id=uid, status='sent')
            for uid in recipients
        ])
        # Bump conversation updated_at
        self.conversation_obj.updated_at = timezone.now()
        self.conversation_obj.save(update_fields=['updated_at'])
        return {
            'id': msg.id,
            'content': msg.content,
            'sender_id': self.user.id,
            'sender_username': self.user.username,
            'created_at': msg.created_at.isoformat(),
            'msg_type': msg.msg_type,
        }

    @database_sync_to_async
    def _get_history(self) -> list:
        from .models import Message
        msgs = (
            Message.objects
            .filter(conversation=self.conversation_obj)
            .select_related('sender')
            .order_by('-created_at')[:50]
        )
        return [
            {
                'id': m.id,
                'content': m.content if not m.is_deleted else '[message deleted]',
                'sender_id': m.sender_id,
                'sender_username': m.sender.username if m.sender else 'deleted',
                'created_at': m.created_at.isoformat(),
                'msg_type': m.msg_type,
                'is_deleted': m.is_deleted,
                'edited_at': m.edited_at.isoformat() if m.edited_at else None,
            }
            for m in reversed(list(msgs))
        ]

    @database_sync_to_async
    def _mark_read(self, message_id: int) -> None:
        from .models import MessageRecipientStatus
        MessageRecipientStatus.objects.filter(
            message_id=message_id,
            recipient=self.user,
        ).update(status='read', updated_at=timezone.now())

    @database_sync_to_async
    def _mark_delivered(self, message_id: int) -> None:
        from .models import MessageRecipientStatus
        MessageRecipientStatus.objects.filter(
            message_id=message_id,
            recipient=self.user,
            status='sent',
        ).update(status='delivered', updated_at=timezone.now())
