"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import toast from "react-hot-toast";

interface WishlistContextValue {
  items: number[];
  toggle: (productId: number, productName?: string) => void;
  has: (productId: number) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const KEY = "ethio_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (productId: number, productName?: string) => {
    setItems((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem(KEY, JSON.stringify(next));
      if (next.includes(productId)) {
        toast.success(`${productName ?? "Item"} added to wishlist ❤️`);
      } else {
        toast(`${productName ?? "Item"} removed from wishlist`, { icon: "💔" });
      }
      return next;
    });
  };

  const has = (productId: number) => items.includes(productId);

  return (
    <WishlistContext.Provider value={{ items, toggle, has, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider");
  return ctx;
};
