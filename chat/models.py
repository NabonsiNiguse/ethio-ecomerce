"""
Chat models — production-grade schema.

Tables:
  Conversation          — chat session (support / buyer_seller / order_linked)
  Participant           — user membership in a conversation
  Message               — persisted message with soft-delete + edit support
  MessageRecipientStatus— per-recipient delivery/read tracking
  Attachment            — file linked to a message
  QuickReplyTemplate    — saved reply snippets for sellers/support
  AuditLog              — immutable record of edits/deletes/moderation
  PushToken             — FCM/APNS/WebPush device tokens

SQLite-compatible: no tsvector, no partitioning (those are PostgreSQL-only).
Switch DB_HOST env var to enable PostgreSQL in production.
"""

import re
import html

from django.conf import settings
from django.db import models
from django.utils import timezone


# ── PII regex patterns ────────────────────────────────────────────────────────
_PII_PATTERNS = [
    re.compile(r'\+251\d{9}'),           # +251XXXXXXXXX
    re.compile(r'\b0\d{9}\b'),           # 0XXXXXXXXX
    re.compile(r'\b251\d{9}\b'),         # 251XXXXXXXXX
    re.compile(r'\+[1-9]\d{6,14}'),      # generic international
    re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+'),  # email
]

def filter_pii(text: str) -> str:
    """Replace phone numbers and emails with a placeholder."""
    for pattern in _PII_PATTERNS:
        text = pattern.sub('[contact info removed]', text)
    return text

def sanitize_message(text: str) -> str:
    """Escape HTML special chars to prevent XSS, then filter PII."""
    return filter_pii(html.escape(text))


# ── Conversation ──────────────────────────────────────────────────────────────

class Conversation(models.Model):
    class Type(models.TextChoices):
        support      = 'support',      'Support'
        buyer_seller = 'buyer_seller',  'Buyer-Seller'
        order_linked = 'order_linked',  'Order-Linked'

    conversation_type = models.CharField(max_length=20, choices=Type.choices, default=Type.buyer_seller)
    # Nullable — only set when conversation_type == order_linked
    order = models.ForeignKey(
        'purchases.Order',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='conversations',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_conversations',
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Conversation({self.id}, {self.conversation_type})'


# ── Participant ───────────────────────────────────────────────────────────────

class Participant(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participations')
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [('conversation', 'user')]
        indexes = [models.Index(fields=['conversation', 'user'])]

    def __str__(self):
        return f'Participant(conv={self.conversation_id}, user={self.user_id})'


# ── Message ───────────────────────────────────────────────────────────────────

class Message(models.Model):
    class MsgType(models.TextChoices):
        text            = 'text',            'Text'
        delivery_update = 'delivery_update', 'Delivery Update'
        system          = 'system',          'System'

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='chat_messages',
    )
    content = models.TextField()
    msg_type = models.CharField(max_length=20, choices=MsgType.choices, default=MsgType.text)

    # Edit / soft-delete
    is_deleted = models.BooleanField(default=False)
    edited_at  = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['conversation', 'created_at'])]

    def __str__(self):
        return f'Message({self.id}, conv={self.conversation_id})'


# ── MessageRecipientStatus ────────────────────────────────────────────────────

class MessageRecipientStatus(models.Model):
    class Status(models.TextChoices):
        sent      = 'sent',      'Sent'
        delivered = 'delivered', 'Delivered'
        read      = 'read',      'Read'

    message    = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='recipient_statuses')
    recipient  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='message_statuses')
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.sent)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('message', 'recipient')]
        indexes = [models.Index(fields=['message', 'recipient'])]

    def __str__(self):
        return f'MRS(msg={self.message_id}, user={self.recipient_id}, {self.status})'


# ── Attachment ────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

class Attachment(models.Model):
    message   = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file_url  = models.URLField(max_length=500)
    mime_type = models.CharField(max_length=100)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)  # bytes
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Attachment({self.id}, msg={self.message_id})'


# ── QuickReplyTemplate ────────────────────────────────────────────────────────

class QuickReplyTemplate(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quick_replies')
    title = models.CharField(max_length=100)
    body  = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'QuickReply({self.id}, {self.title[:30]})'


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(models.Model):
    class Action(models.TextChoices):
        edit     = 'edit',     'Edit'
        delete   = 'delete',   'Delete'
        moderate = 'moderate', 'Moderate'

    actor          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action         = models.CharField(max_length=20, choices=Action.choices)
    conversation   = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True)
    message        = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True)
    previous_content = models.TextField(blank=True, default='')
    new_content    = models.TextField(blank=True, default='')
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'AuditLog({self.action}, actor={self.actor_id})'


# ── PushToken ─────────────────────────────────────────────────────────────────

class PushToken(models.Model):
    class Platform(models.TextChoices):
        fcm      = 'fcm',      'FCM'
        apns     = 'apns',     'APNS'
        webpush  = 'webpush',  'Web Push'

    user     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_tokens')
    token    = models.TextField(unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices, default=Platform.fcm)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'PushToken({self.platform}, user={self.user_id})'
