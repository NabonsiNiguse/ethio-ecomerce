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
