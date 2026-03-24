"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/axios";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const { items, toggle } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) { setLoading(false); return; }
    Promise.all(
      items.map((id) => api.get<Product>(`/api/products/${id}/`).then((r) => r.data).catch(() => null))
    ).then((results) => {
      setProducts(results.filter(Boolean) as Product[]);
    }).finally(() => setLoading(false));
  }, [items]);

  const handleAddAll = async () => {
    if (!isAuthenticated()) { toast.error("Sign in to add to cart"); return; }
    let added = 0;
    for (const p of products) {
      try { await addItem(p.id, 1); added++; } catch {}
    }
    toast.success(`${added} item${added !== 1 ? "s" : ""} added to cart!`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">❤️ My Wishlist</h1>
          <p className="text-sm text-gray-400">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
        </div>
        {products.length > 0 && (
          <button
            onClick={handleAddAll}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            Add All to Cart
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-24 text-center"
        >
          <span className="text-6xl">🤍</span>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Your wishlist is empty</h2>
          <p className="text-gray-400">Save items you love by clicking the heart icon.</p>
          <Link href="/products" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition">
            Browse Products
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
