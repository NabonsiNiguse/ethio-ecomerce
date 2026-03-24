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
}

export default function ProductCard({ product, view = "grid" }: Props) {
  const imageUrl = product.images?.[0]?.image_url ?? null;
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const wished = has(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated()) { toast.error("Sign in to add to cart"); return; }
    setAdding(true);
    try { await addItem(product.id, 1); toast.success(`${product.name} added!`); }
    catch { toast.error("Failed to add"); }
    finally { setAdding(false); }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle(product.id, product.name);
  };

  /* ── LIST VIEW ── */
  if (view === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1e2130] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <Link href={`/products/${product.id}`}
          className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50 dark:bg-white/5">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill sizes="112px"
              className="object-cover transition duration-200 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-gray-300">🛍️</div>
          )}
        </Link>
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {product.category?.name}
            </span>
            <Link href={`/products/${product.id}`}>
              <p className="mt-0.5 text-[15px] font-semibold text-gray-900 dark:text-gray-100 hover:text-brand-600 line-clamp-2 transition">
                {product.name}
              </p>
            </Link>
            <StarRating rating={4.2} count={24} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[18px] font-bold text-gray-900 dark:text-gray-100">
                {Number(product.price).toFixed(2)}{" "}
                <span className="text-[13px] font-medium text-gray-500">ETB</span>
              </p>
              {product.stock > 0 && product.stock <= 5 && (
                <p className="text-[11px] font-medium text-orange-500">Only {product.stock} left</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleWishlist}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  wished
                    ? "border-rose-200 bg-rose-50 text-rose-500"
                    : "border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                }`}
                aria-label="Toggle wishlist">
                <svg className="h-4 w-4" fill={wished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button onClick={handleAddToCart} disabled={adding}
                className="rounded-lg bg-brand-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 active:scale-95 disabled:opacity-60 transition">
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
      whileHover={{ y: -5, boxShadow: "0 12px 36px rgba(0,0,0,0.13)" }}
      className="group relative flex flex-col rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1e2130] shadow-sm overflow-hidden transition-all duration-200"
    >
      {/* Quick actions — appear on hover */}
      <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Wishlist */}
        <button onClick={handleWishlist}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border bg-white dark:bg-[#1e2130] shadow-sm transition hover:scale-110 ${
            wished
              ? "border-rose-200 text-rose-500"
              : "border-gray-200 dark:border-white/10 text-gray-400 hover:border-rose-200 hover:text-rose-500"
          }`}
          aria-label="Toggle wishlist">
          <svg className="h-4 w-4" fill={wished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {/* Quick view */}
        <Link href={`/products/${product.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2130] shadow-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition hover:scale-110"
          aria-label="Quick view">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </Link>
      </div>

      {/* Wishlist always visible when wished */}
      {wished && (
        <button onClick={handleWishlist}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white shadow-sm text-rose-500 group-hover:opacity-0 transition"
          aria-label="Remove from wishlist">
          <svg className="h-4 w-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      )}

      <Link href={`/products/${product.id}`} className="block">
        {/* Image */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-50 dark:bg-white/5">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-gray-200">🛍️</div>
          )}
          {/* Stock badges */}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute bottom-2 left-2 rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              Only {product.stock} left
            </span>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
              <span className="rounded-md bg-gray-800 px-3 py-1.5 text-[12px] font-bold text-white">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {product.category?.name}
          </span>
          <p className="mt-1 text-[14px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
            {product.name}
          </p>
          <StarRating rating={4.2} count={24} />
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[18px] font-bold text-gray-900 dark:text-gray-100">
              {Number(product.price).toFixed(2)}
            </span>
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">ETB</span>
          </div>
          {product.stock > 0 && (
            <p className="mt-1 text-[11px] font-medium text-brand-600">✓ In Stock · Fast Delivery</p>
          )}
        </div>
      </Link>

      {/* Add to Cart */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock === 0}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {adding ? "Adding…" : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
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
            className={`h-3 w-3 ${i <= full ? "text-amber-400" : i === full + 1 && half ? "text-amber-300" : "text-gray-200"}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] text-gray-400">({count})</span>
    </div>
  );
}
