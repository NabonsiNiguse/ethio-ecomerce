"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import api from "@/lib/axios";
import { Cart } from "@/types";
import { isAuthenticated } from "@/lib/auth";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      setLoading(true);
      const { data } = await api.get<{ cart: Cart }>("/api/cart");
      setCart(data.cart);
    } catch {
      // session expired or network error — cart stays null
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addItem = async (productId: number, quantity = 1) => {
    const { data } = await api.post<{ cart: Cart }>("/api/cart/add", {
      product_id: productId,
      quantity,
    });
    setCart(data.cart);
  };

  const removeItem = async (productId: number) => {
    const { data } = await api.delete<{ cart: Cart }>("/api/cart/remove", {
      data: { product_id: productId },
    });
    setCart(data.cart);
  };

  return (
    <CartContext.Provider value={{ cart, loading, addItem, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
