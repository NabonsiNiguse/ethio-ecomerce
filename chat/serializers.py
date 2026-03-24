from rest_framework import serializers
from .models import (
    Conversation, Participant, Message, MessageRecipientStatus,
    Attachment, QuickReplyTemplate, PushToken,
)


class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role     = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model  = Participant
        fields = ('user', 'username', 'role', 'joined_at')


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Attachment
        fields = ('id', 'file_url', 'mime_type', 'file_name', 'file_size', 'created_at')


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    attachments     = AttachmentSerializer(many=True, read_only=True)
    content         = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = (
            'id', 'sender', 'sender_username', 'content', 'msg_type',
            'is_deleted', 'edited_at', 'created_at', 'attachments',
        )
        read_only_fields = fields

    def get_content(self, obj):
        return '[message deleted]' if obj.is_deleted else obj.content


class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = (
            'id', 'conversation_type', 'order', 'title',
            'created_at', 'updated_at', 'participants',
            'unread_count', 'last_message',
        )

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return MessageRecipientStatus.objects.filter(
            message__conversation=obj,
            recipient=user,
        ).exclude(status='read').count()

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'id': msg.id,
            'content': '[message deleted]' if msg.is_deleted else msg.content[:100],
            'sender_id': msg.sender_id,
            'created_at': msg.created_at.isoformat(),
        }


class ConversationCreateSerializer(serializers.Serializer):
    conversation_type = serializers.ChoiceField(choices=Conversation.Type.choices)
    order_id          = serializers.IntegerField(required=False, allow_null=True)
    participant_ids   = serializers.ListField(child=serializers.IntegerField(), min_length=0, default=list)
    title             = serializers.CharField(max_length=255, required=False, default='')


class QuickReplySerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuickReplyTemplate
        fields = ('id', 'title', 'body', 'created_at')
        read_only_fields = ('id', 'created_at')


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PushToken
        fields = ('id', 'token', 'platform', 'created_at')
        read_only_fields = ('id', 'created_at')


class MessageEditSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1)
