# Requirements Document

## Introduction

This document defines the requirements for upgrading the Ethio eCommerce chat system from its current minimal implementation to a production-grade, horizontally scalable real-time messaging platform. The existing system has a basic `ChatRoom`/`ChatMessage` model, a single `ChatConsumer`, and an `InMemoryChannelLayer`. The new system must support buyer-seller messaging, customer support, order-linked conversations, delivery tracking updates in chat, AI-assisted reply suggestions, push notifications, file attachments, message search, moderation, and privacy protection — all built on top of the existing Django + Django Channels + Redis + PostgreSQL + Next.js stack.

The frontend 3-column premium UI (`ChatWindow.tsx`, `FloatingChat.tsx`, `chat/[room]/page.tsx`) is already implemented and must not be redesigned. The backend must expose the APIs and WebSocket events that the existing frontend expects.

---

## Glossary

- **Chat_System**: The complete real-time messaging backend and its REST/WebSocket APIs.
- **Conversation**: A persistent, named chat session between two or more participants (replaces the current `ChatRoom` model).
- **Message**: A single text or media unit sent within a Conversation.
- **Participant**: A `User` who is a member of a Conversation.
- **Sender**: The `User` who authored a given Message.
- **Recipient**: Any Participant in a Conversation who is not the Sender of a given Message.
- **Consumer**: The Django Channels `AsyncWebsocketConsumer` that handles WebSocket connections.
- **Channel_Layer**: The Redis-backed pub/sub layer used to broadcast events across multiple Consumer instances.
- **Vendor_Inbox**: The aggregated view of all Conversations for a seller-role User, including unread counts.
- **Admin_Moderator**: A User with `role=admin` who has read access to all Conversations.
- **AI_Assistant**: The server-side component that generates reply suggestions for support Conversations.
- **Privacy_Filter**: The server-side regex component that detects and redacts PII (phone numbers, email addresses) from Message content.
- **Notification_Service**: The component responsible for sending FCM/APNS/Web Push notifications to offline Users.
- **Attachment**: A file (image, document) uploaded and linked to a Message.
- **Quick_Reply_Template**: A pre-defined short text snippet a User can send with one click.
- **Audit_Log**: An immutable record of Message edits and soft-deletes.
- **Message_Status**: The delivery/read state of a Message for each Recipient (`sent`, `delivered`, `read`).
- **Order_Context**: Metadata linking a Conversation to a specific order, including order status and delivery progress.
- **Full_Text_Search**: PostgreSQL `tsvector`-based search over Message content.
- **Rate_Limiter**: The component that enforces per-user message send rate limits.
- **JWT_Authenticator**: The component that validates Bearer JWT tokens on both HTTP and WebSocket connections.

---

## Requirements

### Requirement 1: Scalable Data Model

**User Story:** As a platform engineer, I want a normalized PostgreSQL schema for conversations, participants, messages, attachments, and per-recipient message status, so that the system can support millions of messages without data integrity issues.

#### Acceptance Criteria

1. THE Chat_System SHALL replace the existing `ChatRoom`/`ChatMessage` models with a schema containing at minimum: `Conversation`, `Participant`, `Message`, `MessageRecipientStatus`, and `Attachment` tables.
2. THE Chat_System SHALL store a `conversation_type` field on `Conversation` with values `support`, `buyer_seller`, and `order_linked`.
3. WHEN a Conversation has `conversation_type = order_linked`, THE Chat_System SHALL store a non-null foreign key to the associated order on the `Conversation` record.
4. THE Chat_System SHALL store a `status` field on `Message` with values `sent`, `delivered`, and `read`, tracked per Recipient via the `MessageRecipientStatus` table.
5. THE Chat_System SHALL apply a composite database index on `(conversation_id, created_at)` on the `Message` table.
6. THE Chat_System SHALL apply a composite database index on `(conversation_id, user_id)` on the `Participant` table.
7. THE Chat_System SHALL store `edited_at` and `is_deleted` fields on `Message` to support non-destructive edits and soft deletes.
8. THE Chat_System SHALL store a `tsvector` column on `Message` for full-text search, updated via a PostgreSQL trigger or `save()` override.

---

### Requirement 2: WebSocket Connection and Authentication

**User Story:** As a user, I want my WebSocket connection to be authenticated and authorized, so that only legitimate participants can join a conversation.

#### Acceptance Criteria

1. WHEN a WebSocket connection request arrives, THE JWT_Authenticator SHALL validate the Bearer token supplied as a query parameter (`?token=`) before the Consumer accepts the connection.
2. IF the JWT token is absent or invalid, THEN THE Consumer SHALL reject the connection with close code `4001`.
3. IF the authenticated User is not a Participant of the requested Conversation, THEN THE Consumer SHALL reject the connection with close code `4003`.
4. WHEN a valid connection is established, THE Consumer SHALL join the Redis Channel_Layer group named `conversation_{id}`.
5. THE Chat_System SHALL support at least 10,000 concurrent WebSocket connections by routing through the Redis Channel_Layer with horizontal Daphne worker scaling.
6. WHEN a Consumer disconnects, THE Consumer SHALL leave the Channel_Layer group and release all associated resources.

---

### Requirement 3: Full Message Flow

**User Story:** As a user, I want messages I send to be immediately visible to all participants and reliably persisted, so that no messages are lost and the UI feels instant.

#### Acceptance Criteria

1. WHEN a Sender sends a `chat_message` WebSocket event, THE Consumer SHALL broadcast the message to all members of the Channel_Layer group within 100ms of receipt.
2. AFTER broadcasting, THE Consumer SHALL persist the Message to the PostgreSQL database asynchronously without blocking the broadcast.
3. WHEN a Message is persisted, THE Chat_System SHALL create a `MessageRecipientStatus` record with `status = sent` for each Recipient.
4. WHEN a Recipient's Consumer receives the broadcast, THE Consumer SHALL update the `MessageRecipientStatus` for that Recipient to `delivered` and emit a `delivered` event back to the Sender's Consumer.
5. WHEN a Recipient sends a `read_receipt` WebSocket event for a Message, THE Consumer SHALL update the `MessageRecipientStatus` for that Recipient to `read` and broadcast a `read_receipt` event to all Participants.
6. THE Chat_System SHALL return paginated message history via `GET /api/chat/conversations/{id}/messages?before_id={id}&limit={n}` with a maximum page size of 100 messages.
7. WHEN a WebSocket connection is established, THE Consumer SHALL send the last 50 messages of the Conversation as a `history` event.

---

### Requirement 4: Typing Indicators

**User Story:** As a user, I want to see when the other party is typing, so that the conversation feels live and responsive.

#### Acceptance Criteria

1. WHEN a Sender sends a `typing` WebSocket event with `is_typing: true`, THE Consumer SHALL broadcast a `typing` event to all other Participants in the Conversation.
2. WHEN a Sender sends a `typing` WebSocket event with `is_typing: false`, THE Consumer SHALL broadcast the stop-typing event to all other Participants.
3. THE Consumer SHALL NOT echo typing events back to the originating Sender.
4. IF a Sender's WebSocket connection closes while `is_typing` is `true`, THEN THE Consumer SHALL broadcast a stop-typing event for that Sender to all other Participants.

---

### Requirement 5: Order-Linked Conversations and Delivery Tracking

**User Story:** As a buyer, I want to see my order status and delivery progress updates directly inside the chat, so that I don't have to leave the conversation to track my order.

#### Acceptance Criteria

1. WHEN a Conversation has `conversation_type = order_linked`, THE Chat_System SHALL expose order metadata (status, payment status, estimated delivery) via `GET /api/chat/conversations/{id}/context`.
2. WHEN the logistics system updates a delivery status for an order linked to a Conversation, THE Chat_System SHALL inject a system Message of type `delivery_update` into that Conversation with the new status text.
3. THE Chat_System SHALL broadcast the `delivery_update` system Message to all Participants via the Channel_Layer group.
4. THE Chat_System SHALL expose delivery progress steps (Order Placed, Processing, Shipped, Out for Delivery, Delivered) as structured data within the order context response.

---

### Requirement 6: Vendor Inbox

**User Story:** As a seller, I want a unified inbox showing all my conversations with unread counts, so that I can manage buyer inquiries efficiently.

#### Acceptance Criteria

1. THE Chat_System SHALL expose `GET /api/chat/inbox` for authenticated Users with `role = seller`, returning all Conversations where the User is a Participant, ordered by most recent Message timestamp.
2. THE Chat_System SHALL include an `unread_count` field per Conversation in the inbox response, calculated as the number of Messages where the seller's `MessageRecipientStatus.status` is not `read`.
3. WHEN a seller reads a Message, THE Chat_System SHALL decrement the `unread_count` for that Conversation in subsequent inbox responses.
4. THE Chat_System SHALL cache inbox unread counts in Redis with a TTL of 60 seconds to reduce database load.

---

### Requirement 7: Admin Moderation (God View)

**User Story:** As an admin, I want to read any conversation on the platform, so that I can moderate content and resolve disputes.

#### Acceptance Criteria

1. WHEN a User with `role = admin` requests `GET /api/chat/conversations`, THE Chat_System SHALL return all Conversations on the platform regardless of Participant membership.
2. WHEN a User with `role = admin` requests `GET /api/chat/conversations/{id}/messages`, THE Chat_System SHALL return the full message history for that Conversation.
3. IF a non-admin User requests a Conversation they are not a Participant of, THEN THE Chat_System SHALL return HTTP 403.
4. THE Chat_System SHALL record an Audit_Log entry whenever an Admin_Moderator reads a Conversation they are not a Participant of, including the admin's user ID, the conversation ID, and the timestamp.

---

### Requirement 8: Privacy and PII Protection

**User Story:** As a platform operator, I want phone numbers and email addresses to be automatically redacted from messages, so that buyers and sellers cannot bypass the platform to transact off-platform.

#### Acceptance Criteria

1. WHEN a Message is received by the Consumer, THE Privacy_Filter SHALL scan the message content using regex patterns for Ethiopian and international phone number formats and email address formats before persistence.
2. IF the Privacy_Filter detects PII in a Message, THEN THE Chat_System SHALL replace the detected PII with the placeholder `[contact info removed]` in the persisted Message content.
3. THE Privacy_Filter SHALL detect phone numbers matching the patterns: `+251XXXXXXXXX`, `0XXXXXXXXX`, `251XXXXXXXXX`, and generic international formats `+[1-9][0-9]{6,14}`.
4. THE Privacy_Filter SHALL detect email addresses matching the RFC 5321 simplified pattern `[^@\s]+@[^@\s]+\.[^@\s]+`.
5. THE Chat_System SHALL broadcast the redacted Message content to all Participants, not the original.

---

### Requirement 9: Message Edit and Soft Delete

**User Story:** As a user, I want to edit or delete messages I have sent, so that I can correct mistakes without losing conversation context.

#### Acceptance Criteria

1. WHEN a Sender sends a `PATCH /api/chat/messages/{id}` request with new content, THE Chat_System SHALL update the Message content and set `edited_at` to the current timestamp.
2. THE Chat_System SHALL create an Audit_Log entry for every Message edit, storing the previous content, new content, editor user ID, and timestamp.
3. WHEN a Message is edited, THE Chat_System SHALL broadcast an `message_edited` WebSocket event to all Participants in the Conversation.
4. WHEN a Sender sends a `DELETE /api/chat/messages/{id}` request, THE Chat_System SHALL set `is_deleted = true` on the Message and replace the content with `[message deleted]`.
5. THE Chat_System SHALL NOT physically delete Message records from the database.
6. IF a non-Sender User attempts to edit or delete a Message, THEN THE Chat_System SHALL return HTTP 403.

---

### Requirement 10: File Attachments

**User Story:** As a user, I want to send images and documents in chat, so that I can share product photos, receipts, and other relevant files.

#### Acceptance Criteria

1. THE Chat_System SHALL expose `POST /api/chat/messages/{id}/attachments` accepting multipart form data with a file field.
2. THE Chat_System SHALL store uploaded files in an S3-compatible object storage bucket and persist the storage URL in the `Attachment` table.
3. THE Chat_System SHALL accept file types: JPEG, PNG, GIF, WebP, PDF, and DOCX.
4. IF an uploaded file exceeds 10 MB, THEN THE Chat_System SHALL return HTTP 413 with a descriptive error message.
5. WHEN an Attachment is saved, THE Chat_System SHALL broadcast an `attachment_added` WebSocket event to all Participants containing the attachment URL and MIME type.

---

### Requirement 11: Quick Reply Templates

**User Story:** As a seller or support agent, I want to send pre-defined reply templates with one click, so that I can respond to common questions quickly and consistently.

#### Acceptance Criteria

1. THE Chat_System SHALL expose `GET /api/chat/quick-replies` returning the list of Quick_Reply_Templates available to the authenticated User.
2. THE Chat_System SHALL expose `POST /api/chat/quick-replies` allowing Users with `role = seller` or `role = admin` to create new Quick_Reply_Templates with a `title` and `body` field.
3. THE Chat_System SHALL expose `DELETE /api/chat/quick-replies/{id}` allowing the owner of a Quick_Reply_Template to delete it.
4. WHEN a User sends a message using a Quick_Reply_Template, THE Chat_System SHALL treat it as a standard Message with the template body as content.

---

### Requirement 12: AI-Assisted Reply Suggestions

**User Story:** As a support agent or seller, I want the system to suggest relevant replies based on the incoming message, so that I can respond faster and more accurately.

#### Acceptance Criteria

1. WHEN a new Message is received in a `support` or `buyer_seller` Conversation, THE AI_Assistant SHALL generate up to 3 reply suggestions based on the Message content.
2. THE AI_Assistant SHALL deliver suggestions via a `ai_suggestions` WebSocket event sent only to the Recipient (not the Sender).
3. THE AI_Assistant SHALL generate suggestions within 2 seconds of the triggering Message being received.
4. WHERE an AI provider integration is configured, THE AI_Assistant SHALL call the configured provider API; WHERE no provider is configured, THE AI_Assistant SHALL return rule-based suggestions from a predefined template set.
5. IF the AI provider API call fails or times out after 1.5 seconds, THEN THE AI_Assistant SHALL fall back to rule-based suggestions without surfacing the error to the User.

---

### Requirement 13: Push Notifications

**User Story:** As a user, I want to receive push notifications for new messages when I am not actively using the app, so that I don't miss important communications.

#### Acceptance Criteria

1. THE Notification_Service SHALL send a push notification to a Recipient when a new Message arrives and the Recipient does not have an active WebSocket connection to the Conversation.
2. THE Chat_System SHALL expose `POST /api/chat/push-tokens` allowing authenticated Users to register FCM, APNS, or Web Push subscription tokens.
3. THE Chat_System SHALL expose `DELETE /api/chat/push-tokens/{token}` allowing Users to deregister a push token.
4. THE Notification_Service SHALL include the Conversation name, Sender display name, and a truncated (max 100 characters) message preview in the notification payload.
5. IF the push provider returns a token-expired or token-invalid error, THEN THE Notification_Service SHALL delete the corresponding push token record from the database.
6. THE Notification_Service SHALL deliver notifications asynchronously via a task queue (Celery or Django-Q) and SHALL NOT block the WebSocket message flow.

---

### Requirement 14: Full-Text Message Search

**User Story:** As a user, I want to search for messages by keyword within a conversation, so that I can find past information quickly.

#### Acceptance Criteria

1. THE Chat_System SHALL expose `GET /api/chat/conversations/{id}/messages/search?q={query}` returning Messages whose `tsvector` column matches the query.
2. THE Chat_System SHALL return search results ordered by relevance rank (PostgreSQL `ts_rank`) descending.
3. THE Chat_System SHALL return a maximum of 50 results per search request.
4. IF the authenticated User is not a Participant of the Conversation (and not an Admin_Moderator), THEN THE Chat_System SHALL return HTTP 403.
5. THE Chat_System SHALL support multi-word queries using PostgreSQL `plainto_tsquery`.

---

### Requirement 15: Rate Limiting and Security

**User Story:** As a platform operator, I want message sending to be rate-limited and all inputs sanitized, so that the system is protected from abuse, spam, and injection attacks.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a maximum of 30 messages per minute per authenticated User over WebSocket.
2. IF a User exceeds the rate limit, THEN THE Consumer SHALL send a `rate_limit_exceeded` error event to that User's WebSocket connection and discard the excess messages.
3. THE Chat_System SHALL sanitize all Message content to prevent XSS by escaping HTML special characters before persistence.
4. THE JWT_Authenticator SHALL validate token expiry, signature, and issuer on every WebSocket connection attempt.
5. THE Chat_System SHALL enforce HTTPS/WSS in production by rejecting plain HTTP/WS upgrade requests when `DEBUG = False`.
6. THE Chat_System SHALL log all authentication failures, rate limit violations, and moderation events to the application audit log with user ID, IP address, and timestamp.

---

### Requirement 16: Performance and Scalability

**User Story:** As a platform engineer, I want the chat system to handle high concurrency with low latency, so that the platform can scale to thousands of simultaneous users.

#### Acceptance Criteria

1. THE Chat_System SHALL use `django-db-connection-pool` or `pgbouncer` to maintain a PostgreSQL connection pool, limiting maximum connections to a configurable value (default 20 per worker).
2. THE Chat_System SHALL cache the last 50 messages of each active Conversation in Redis with a TTL of 300 seconds to reduce database reads on WebSocket connect.
3. THE Channel_Layer SHALL use `channels_redis.core.RedisChannelLayer` in all non-development environments, configured via the `REDIS_URL` environment variable.
4. THE Chat_System SHALL apply table partitioning on the `Message` table by `created_at` month when the total message count exceeds 1,000,000 rows, as a documented migration step.
5. WHEN the Redis Channel_Layer is unavailable, THE Consumer SHALL log the error and close the WebSocket connection with code `1011` (internal error) rather than silently dropping messages.

---

### Requirement 17: REST API Conversation Management

**User Story:** As a client application, I want REST endpoints to create, list, and manage conversations, so that the frontend can initialize chat sessions without requiring an active WebSocket.

#### Acceptance Criteria

1. THE Chat_System SHALL expose `POST /api/chat/conversations` accepting `conversation_type`, optional `order_id`, and a list of `participant_ids` to create a new Conversation.
2. THE Chat_System SHALL expose `GET /api/chat/conversations` returning all Conversations where the authenticated User is a Participant, ordered by most recent Message timestamp.
3. THE Chat_System SHALL expose `GET /api/chat/conversations/{id}` returning the Conversation metadata and Participant list.
4. WHEN creating a Conversation with `conversation_type = order_linked`, THE Chat_System SHALL verify that the requesting User is the buyer or seller of the referenced order; IF not, THE Chat_System SHALL return HTTP 403.
5. THE Chat_System SHALL expose `POST /api/chat/conversations/{id}/participants` allowing Participants to add new members to a Conversation.

---

### Requirement 18: Message Parser and Serialization

**User Story:** As a developer, I want all WebSocket message payloads to follow a strict, documented schema, so that the frontend and backend remain in sync and bugs are caught early.

#### Acceptance Criteria

1. THE Chat_System SHALL parse all incoming WebSocket JSON payloads and return a structured error event `{ "type": "error", "code": "invalid_payload", "detail": "..." }` for any payload that fails schema validation.
2. THE Chat_System SHALL serialize all outgoing WebSocket events as UTF-8 JSON with a `type` field present on every event.
3. THE Chat_System SHALL define a serializer for each outgoing event type: `history`, `chat_message`, `typing`, `read_receipt`, `delivered`, `message_edited`, `attachment_added`, `ai_suggestions`, `delivery_update`, `rate_limit_exceeded`, and `error`.
4. FOR ALL valid Message objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).
5. IF a WebSocket payload exceeds 64 KB, THEN THE Consumer SHALL reject it with an `error` event and close code `1009` (message too big).
