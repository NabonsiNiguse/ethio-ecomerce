/**
 * Chat API service — wraps all /api/chat/* endpoints.
 */
import api from "./axios";

export interface Conversation {
  id: number;
  conversation_type: "support" | "buyer_seller" | "order_linked";
  order: number | null;
  title: string;
  created_at: string;
  updated_at: string;
  participants: { user: number; username: string; role: string; joined_at: string }[];
  unread_count: number;
  last_message: { id: number; content: string; sender_id: number; created_at: string } | null;
}

export interface ChatMessage {
  id: number;
  sender: number;
  sender_username: string;
  content: string;
  msg_type: "text" | "delivery_update" | "system";
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
  attachments: { id: number; file_url: string; mime_type: string; file_name: string }[];
}

export interface QuickReply {
  id: number;
  title: string;
  body: string;
}

// ── Conversations ─────────────────────────────────────────────────────────────

export const listConversations = () =>
  api.get<Conversation[]>("/api/chat/conversations").then(r => r.data);

export const getConversation = (id: number) =>
  api.get<Conversation>(`/api/chat/conversations/${id}`).then(r => r.data);

export const createConversation = (payload: {
  conversation_type: string;
  order_id?: number;
  participant_ids: number[];
  title?: string;
}) => api.post<Conversation>("/api/chat/conversations", payload).then(r => r.data);

export const addParticipant = (convId: number, userId: number) =>
  api.post(`/api/chat/conversations/${convId}/participants`, { user_id: userId });

// ── Messages ──────────────────────────────────────────────────────────────────

export const listMessages = (convId: number, params?: { before_id?: number; limit?: number }) =>
  api.get<ChatMessage[]>(`/api/chat/conversations/${convId}/messages`, { params }).then(r => r.data);

export const searchMessages = (convId: number, q: string) =>
  api.get<ChatMessage[]>(`/api/chat/conversations/${convId}/messages/search`, { params: { q } }).then(r => r.data);

export const editMessage = (msgId: number, content: string) =>
  api.patch<ChatMessage>(`/api/chat/messages/${msgId}`, { content }).then(r => r.data);

export const deleteMessage = (msgId: number) =>
  api.delete(`/api/chat/messages/${msgId}`);

// ── Order context ─────────────────────────────────────────────────────────────

export const getConversationContext = (convId: number) =>
  api.get(`/api/chat/conversations/${convId}/context`).then(r => r.data);

// ── Inbox ─────────────────────────────────────────────────────────────────────

export const getInbox = () =>
  api.get<Conversation[]>("/api/chat/inbox").then(r => r.data);

// ── Quick replies ─────────────────────────────────────────────────────────────

export const listQuickReplies = () =>
  api.get<QuickReply[]>("/api/chat/quick-replies").then(r => r.data);

export const createQuickReply = (title: string, body: string) =>
  api.post<QuickReply>("/api/chat/quick-replies", { title, body }).then(r => r.data);

export const deleteQuickReply = (id: number) =>
  api.delete(`/api/chat/quick-replies/${id}`);

// ── Push tokens ───────────────────────────────────────────────────────────────

export const registerPushToken = (token: string, platform: "fcm" | "apns" | "webpush" = "webpush") =>
  api.post("/api/chat/push-tokens", { token, platform });

export const unregisterPushToken = (token: string) =>
  api.delete(`/api/chat/push-tokens/${token}`);

export interface ProductCard {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  category: string;
  seller_id: number;
  seller_name: string;
  in_stock: boolean;
}

// ── Start buyer-seller chat from product page ─────────────────────────────────

export const startConversation = (productId: number) =>
  api.post<{ conversation: Conversation; product_card: ProductCard }>(
    '/api/chat/conversations/start',
    { product_id: productId }
  ).then(r => r.data);

/**
 * Get or create a support conversation for the current user.
 * Returns the conversation id to use as the WebSocket room.
 */
export const getOrCreateSupportConversation = async (currentUserId: number): Promise<number> => {
  const convos = await listConversations();
  const existing = convos.find(c => c.conversation_type === "support");
  if (existing) return existing.id;
  const created = await createConversation({
    conversation_type: "support",
    participant_ids: [currentUserId],
    title: "Support",
  });  return created.id;
};
