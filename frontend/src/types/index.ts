export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  seller: { id: number; username: string; role: string };
  category: Category;
  images: ProductImage[];
  created_at: string;
}

export interface CartItem {
  id: number;
  product: { id: number; name: string; price: string };
  quantity: number;
  line_total: string;
  added_at: string;
}

export interface Cart {
  id: number;
  is_active: boolean;
  items: CartItem[];
  total_price: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product: { id: number; name: string; price: string };
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: number;
  status: string;
  total_price: string;
  items: OrderItem[];
  payment?: { transaction_id: string; status: string; amount: string };
  shipping_full_name?: string;
  shipping_phone?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  profile_image: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  role: string;
  is_verified: boolean;
}

export interface Delivery {
  id: number;
  order: number;
  status: "pending" | "assigned" | "picked" | "delivered";
  shipping_address: string;
  distance_km: number | null;
  delivery_fee: number;
  otp_verified: boolean;
  assigned_at: string | null;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryFeeEstimate {
  distance_km: number;
  delivery_fee: number;
  currency: string;
}

export interface ChatMessage {
  id?: number;
  // New schema fields
  content?: string;
  msg_type?: "text" | "delivery_update" | "system";
  is_deleted?: boolean;
  edited_at?: string | null;
  created_at?: string;
  // Legacy / WS broadcast fields (kept for compatibility)
  message?: string;
  sender_id: number;
  sender_username: string;
  timestamp?: string;
  is_read?: boolean;
}

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
