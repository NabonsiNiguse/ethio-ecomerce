"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import toast from "react-hot-toast";

interface Props {
  productId?: number;
  categoryId?: number;
  title?: string;
  subtitle?: string;
}

export default function AIRecommendations({
  productId,
  categoryId,
  title = "Recommended for You",
  subtitle = "AI-powered picks based on your activity",
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  useEffect(() => {
    const params = new URLSearchParams({ limit: "8" });
    if (productId)  params.set("product_id", String(productId));
    if (categoryId) params.set("category_id", String(categoryId));

    api.get<Product[]>(`/api/ai/recommendations?${params}`)
      .then(({ data }) => setProducts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, categoryId]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          AI Powered
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <ProductCard
                  product={p}
                  onAddToCart={async () => {
                    try { await addItem(p.id, 1); toast.success(`${p.name} added!`); }
                    catch { toast.error("Please sign in first."); }
                  }}
                  onToggleWishlist={() => toggle(p.id, p.name)}
                  isWishlisted={has(p.id)}
                />
              </motion.div>
            ))}
      </div>
    </section>
  );
}
