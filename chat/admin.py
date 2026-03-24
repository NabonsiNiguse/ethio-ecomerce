"""
chat/admin.py — Full admin control for the chat system.
Admins can read, moderate, and manage all conversations and messages.
"""
from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.db.models import Count

from .models import (
    Conversation, Participant, Message, MessageRecipientStatus,
    Attachment, QuickReplyTemplate, AuditLog, PushToken,
)


# ── Inlines ───────────────────────────────────────────────────────────────────

class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0
    fields = ("user", "joined_at")
    readonly_fields = ("joined_at",)


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "msg_type", "content_preview", "is_deleted", "created_at")
    readonly_fields = ("sender", "msg_type", "content_preview", "is_deleted", "created_at")
    show_change_link = True
    can_delete = False
    ordering = ("-created_at",)
    max_num = 20

    def content_preview(self, obj):
        text = obj.content[:80] + "…" if len(obj.content) > 80 else obj.content
        if obj.is_deleted:
            return mark_safe('<em style="color:#9ca3af;">[deleted]</em>')
        return text
    content_preview.short_description = "Content"


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    fields = ("file_preview", "file_name", "mime_type", "file_size", "created_at")
    readonly_fields = ("file_preview", "file_name", "mime_type", "file_size", "created_at")
    can_delete = False

    def file_preview(self, obj):
        if obj.mime_type and obj.mime_type.startswith("image/"):
            return format_html('<img src="{}" style="height:40px;border-radius:4px;" />', obj.file_url)
        return format_html('<a href="{}" target="_blank">📎 {}</a>', obj.file_url, obj.file_name or "file")
    file_preview.short_description = "File"


# ── Conversation Admin ────────────────────────────────────────────────────────

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "type_badge", "title_display", "order",
        "participant_count", "message_count", "created_by", "updated_at",
    )
    list_display_links = ("id", "title_display")
    list_filter = ("conversation_type", "created_at")
    search_fields = ("title", "created_by__username", "participants__user__username")
    ordering = ("-updated_at",)
    list_per_page = 30
    readonly_fields = ("created_at", "updated_at", "created_by")
    inlines = [ParticipantInline, MessageInline]

    fieldsets = (
        ("Conversation", {
            "fields": ("conversation_type", "title", "order", "created_by"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["delete_all_messages"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("created_by", "order").annotate(
            _participant_count=Count("participants", distinct=True),
            _message_count=Count("messages", distinct=True),
        )

    def type_badge(self, obj):
        colors = {
            "support":      "#7c3aed",
            "buyer_seller": "#0f766e",
            "order_linked": "#2563eb",
        }
        icons = {"support": "🎧", "buyer_seller": "🏪", "order_linked": "📦"}
        color = colors.get(obj.conversation_type, "#6b7280")
        icon = icons.get(obj.conversation_type, "💬")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">{} {}</span>',
            color, icon, obj.conversation_type.replace("_", " ").title()
        )
    type_badge.short_description = "Type"

    def title_display(self, obj):
        if obj.title.startswith("product:"):
            parts = obj.title.split(":")
            return f"🛍️ {parts[2] if len(parts) > 2 else obj.title}"
        return obj.title or f"Conversation #{obj.id}"
    title_display.short_description = "Title"

    def participant_count(self, obj):
        return obj._participant_count
    participant_count.short_description = "Participants"

    def message_count(self, obj):
        return obj._message_count
    message_count.short_description = "Messages"

    @admin.action(description="🗑️ Soft-delete all messages in selected conversations")
    def delete_all_messages(self, request, queryset):
        total = 0
        for conv in queryset:
            total += conv.messages.filter(is_deleted=False).update(
                is_deleted=True, content="[message deleted]"
            )
        self.message_user(request, f"{total} message(s) soft-deleted.")


# ── Message Admin ─────────────────────────────────────────────────────────────

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id", "conversation_link", "sender", "type_badge",
        "content_preview", "deleted_badge", "created_at",
    )
    list_display_links = ("id",)
    list_filter = ("msg_type", "is_deleted", "created_at")
    search_fields = ("content", "sender__username", "conversation__title")
    ordering = ("-created_at",)
    list_per_page = 50
    readonly_fields = ("created_at", "edited_at")
    inlines = [AttachmentInline]

    fieldsets = (
        ("Message", {
            "fields": ("conversation", "sender", "msg_type", "content", "is_deleted"),
        }),
        ("Edit History", {
            "fields": ("edited_at",),
            "classes": ("collapse",),
        }),
        ("Meta", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    actions = ["soft_delete_messages", "restore_messages"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("sender", "conversation")

    def conversation_link(self, obj):
        return format_html(
            '<a href="/admin/chat/conversation/{}/change/">Conv #{}</a>',
            obj.conversation_id, obj.conversation_id
        )
    conversation_link.short_description = "Conversation"

    def type_badge(self, obj):
        colors = {"text": "#0f766e", "delivery_update": "#2563eb", "system": "#7c3aed"}
        color = colors.get(obj.msg_type, "#6b7280")
        return format_html(
            '<span style="color:{};font-weight:700;font-size:11px;">{}</span>',
            color, obj.msg_type
        )
    type_badge.short_description = "Type"

    def content_preview(self, obj):
        if obj.is_deleted:
            return mark_safe('<em style="color:#9ca3af;">[deleted]</em>')
        text = obj.content[:100] + "…" if len(obj.content) > 100 else obj.content
        return text
    content_preview.short_description = "Content"

    def deleted_badge(self, obj):
        if obj.is_deleted:
            return mark_safe('<span style="color:#dc2626;font-weight:700;">Deleted</span>')
        return mark_safe('<span style="color:#16a34a;">Active</span>')
    deleted_badge.short_description = "State"

    @admin.action(description="🗑️ Soft-delete selected messages")
    def soft_delete_messages(self, request, queryset):
        updated = queryset.filter(is_deleted=False).update(is_deleted=True, content="[message deleted]")
        self.message_user(request, f"{updated} message(s) soft-deleted.")

    @admin.action(description="♻️ Restore selected messages (un-delete)")
    def restore_messages(self, request, queryset):
        # Only restores the is_deleted flag — content is already overwritten
        updated = queryset.filter(is_deleted=True).update(is_deleted=False)
        self.message_user(request, f"{updated} message(s) restored (content may be lost).")


# ── AuditLog Admin ────────────────────────────────────────────────────────────

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id", "actor", "action_badge", "conversation", "message",
        "ip_address", "created_at",
    )
    list_filter = ("action", "created_at")
    search_fields = ("actor__username", "ip_address")
    ordering = ("-created_at",)
    list_per_page = 50
    readonly_fields = (
        "actor", "action", "conversation", "message",
        "previous_content", "new_content", "ip_address", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # Audit logs are immutable

    def action_badge(self, obj):
        colors = {"edit": "#d97706", "delete": "#dc2626", "moderate": "#7c3aed"}
        color = colors.get(obj.action, "#6b7280")
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>', color, obj.action.upper()
        )
    action_badge.short_description = "Action"


# ── QuickReplyTemplate Admin ──────────────────────────────────────────────────

@admin.register(QuickReplyTemplate)
class QuickReplyTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "title", "body_preview", "created_at")
    search_fields = ("title", "body", "owner__username")
    list_filter = ("created_at",)
    list_per_page = 50

    def body_preview(self, obj):
        return obj.body[:80] + "…" if len(obj.body) > 80 else obj.body
    body_preview.short_description = "Body"


# ── Participant Admin ─────────────────────────────────────────────────────────

@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "user", "joined_at")
    search_fields = ("user__username", "conversation__title")
    list_filter = ("joined_at",)
    list_per_page = 50


# ── MessageRecipientStatus Admin ──────────────────────────────────────────────

@admin.register(MessageRecipientStatus)
class MessageRecipientStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "recipient", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("recipient__username",)
    list_per_page = 50


# ── Attachment Admin ──────────────────────────────────────────────────────────

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "file_preview", "mime_type", "file_size_display", "created_at")
    search_fields = ("file_name", "message__conversation__title")
    list_filter = ("mime_type",)
    list_per_page = 50

    def file_preview(self, obj):
        if obj.mime_type and obj.mime_type.startswith("image/"):
            return format_html('<img src="{}" style="height:36px;border-radius:4px;" />', obj.file_url)
        return format_html('<a href="{}" target="_blank">📎 {}</a>', obj.file_url, obj.file_name or "file")
    file_preview.short_description = "File"

    def file_size_display(self, obj):
        if obj.file_size > 1_048_576:
            return f"{obj.file_size / 1_048_576:.1f} MB"
        if obj.file_size > 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        return f"{obj.file_size} B"
    file_size_display.short_description = "Size"


# ── PushToken Admin ───────────────────────────────────────────────────────────

@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "platform", "token_preview", "created_at")
    list_filter = ("platform",)
    search_fields = ("user__username",)
    list_per_page = 50

    def token_preview(self, obj):
        return obj.token[:30] + "…" if len(obj.token) > 30 else obj.token
    token_preview.short_description = "Token"
