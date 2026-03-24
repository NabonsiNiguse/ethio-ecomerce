from django.urls import path
from .views import (
    StartConversationView,
    ConversationListCreateView,
    ConversationDetailView,
    AddParticipantView,
    MessageListView,
    MessageSearchView,
    ConversationContextView,
    MessageEditView,
    AttachmentUploadView,
    InboxView,
    QuickReplyListCreateView,
    QuickReplyDeleteView,
    PushTokenView,
)

urlpatterns = [
    # Start buyer-seller chat from a product page
    path('chat/conversations/start',                        StartConversationView.as_view(),       name='chat-start'),

    # Conversations
    path('chat/conversations',                              ConversationListCreateView.as_view(), name='chat-conversations'),
    path('chat/conversations/<int:pk>',                     ConversationDetailView.as_view(),     name='chat-conversation-detail'),
    path('chat/conversations/<int:pk>/participants',        AddParticipantView.as_view(),          name='chat-add-participant'),
    path('chat/conversations/<int:pk>/messages',            MessageListView.as_view(),             name='chat-messages'),
    path('chat/conversations/<int:pk>/messages/search',     MessageSearchView.as_view(),           name='chat-search'),
    path('chat/conversations/<int:pk>/context',             ConversationContextView.as_view(),     name='chat-context'),

    # Messages
    path('chat/messages/<int:msg_id>',                      MessageEditView.as_view(),             name='chat-message-edit'),
    path('chat/messages/<int:msg_id>/attachments',          AttachmentUploadView.as_view(),        name='chat-attachments'),

    # Inbox
    path('chat/inbox',                                      InboxView.as_view(),                   name='chat-inbox'),

    # Quick replies
    path('chat/quick-replies',                              QuickReplyListCreateView.as_view(),    name='chat-quick-replies'),
    path('chat/quick-replies/<int:pk>',                     QuickReplyDeleteView.as_view(),        name='chat-quick-reply-delete'),

    # Push tokens
    path('chat/push-tokens',                                PushTokenView.as_view(),               name='chat-push-tokens'),
    path('chat/push-tokens/<str:token>',                    PushTokenView.as_view(),               name='chat-push-token-delete'),
]
