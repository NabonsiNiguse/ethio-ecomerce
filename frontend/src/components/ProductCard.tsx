"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Product } from "@/types";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { isAuthenticated } from "@/lib/auth";
import toast from "react-hot-toast";

export type { Product };
export { SkeletonCard as ProductCardSkeleton };

interface Props {
  product: Product;
  view?: "grid" | "list";
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
}

export default function ProductCard({ product, view = "grid", onAddToCart, onToggleWishlist, isWishlisted }: Props) {
  const imageUrl = product.images?.[0]?.image_url ?? null;
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  const wished = isWishlisted !== undefined ? isWishlisted : has(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart) { onAddToCart(); return; }
    if (!isAuthenticated()) { toast.error("Sign in to add to cart"); return; }
    setAdding(true);
    try { await addItem(product.id, 1); toast.success(`${product.name} added!`); }
    catch { toast.error("Failed to add"); }
    finally { setAdding(false); }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onToggleWishlist) { onToggleWishlist(); return; }
    toggle(product.id, product.name);
  };

  const inStock = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  /* ── LIST VIEW ── */
  if (view === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900"
      >
        <Link href={`/products/${product.id}`}
          className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill sizes="96px"
              className="object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">🛍️</div>
          )}
        </Link>
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{product.category?.name}</span>
            <Link href={`/products/${product.id}`}>
              <p className="mt-0.5 text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 transition dark:text-gray-100">
                {product.name}
              </p>
            </Link>
            <StarRating rating={4.2} count={24} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {Number(product.price).toLocaleString()} <span className="text-xs font-medium text-gray-400">ETB</span>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleWishlist}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  wished ? "border-rose-200 bg-rose-50 text-rose-500" : "border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-gray-700"
                }`} aria-label="Toggle wishlist">
                <svg className="h-3.5 w-3.5" fill={wished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button onClick={handleAddToCart} disabled={adding || !inStock}
                className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 active:scale-95 disabled:opacity-50 transition">
                {adding ? "Adding…" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── GRID VIEW ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Wishlist button */}
      <button onClick={handleWishlist}
        className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-xl border bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110 dark:bg-gray-900/90 ${
          wished ? "border-rose-200 text-rose-500" : "border-gray-200 text-gray-300 hover:border-rose-200 hover:text-rose-500 dark:border-gray-700"
        }`} aria-label="Toggle wishlist">
        <svg className="h-3.5 w-3.5" fill={wished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <Link href={`/products/${product.id}`} className="block">
        {/* Image */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-50 dark:bg-gray-800">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.06]" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-gray-200">🛍️</div>
          )}
          {/* Badges */}
          {lowStock && (
            <span className="absolute bottom-2 left-2 rounded-lg bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              Only {product.stock} left
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] dark:bg-gray-900/70">
              <span className="rounded-xl bg-gray-800 px-3 py-1.5 text-xs font-bold text-white dark:bg-gray-700">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {product.category?.name}
          </span>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-gray-900 line-clamp-2 dark:text-gray-100">
            {product.name}
          </p>
          <StarRating rating={4.2} count={24} />
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[17px] font-bold text-gray-900 dark:text-gray-100">
              {Number(product.price).toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-gray-400">ETB</span>
          </div>
          {inStock && (
            <p className="mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✓ In Stock</p>
          )}
        </div>
      </Link>

      {/* Add to Cart */}
      <div className="mt-auto px-3.5 pb-3.5">
        <button
          onClick={handleAddToCart}
          disabled={adding || !inStock}
          className="w-full rounded-xl bg-brand-600 py-2 text-[12px] font-semibold text-white hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {adding ? "Adding…" : !inStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </motion.div>
  );
}

export function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="mt-1.5 flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <svg key={i}
            className={`h-3 w-3 ${i <= full ? "text-amber-400" : i === full + 1 && half ? "text-amber-300" : "text-gray-200 dark:text-gray-700"}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
}
