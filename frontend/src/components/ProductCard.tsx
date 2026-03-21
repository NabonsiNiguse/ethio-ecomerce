"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Product } from "@/types";

// Re-export so existing imports of `Product` from this file still work
export type { Product };
export { SkeletonCard as ProductCardSkeleton };

export default function ProductCard({ product }: { product: Product }) {
  const imageUrl = product.images?.[0]?.image_url ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/products/${product.id}`} className="block group">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          {/* Image */}
          <div className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm dark:text-gray-600">
                No image
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="mb-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
              {product.category?.name}
            </p>
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {product.name}
            </p>
            <p className="mt-1.5 text-base font-bold text-brand-600 dark:text-brand-500">
              ${Number(product.price).toFixed(2)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
