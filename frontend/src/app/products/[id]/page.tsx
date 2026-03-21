"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useCart } from "@/context/CartContext";
import { Product, ProductImage } from "@/types";
import Button from "@/components/ui/Button";
import { SkeletonProductDetail } from "@/components/ui/Skeleton";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get<Product>(`/api/products/${id}/`)
      .then(({ data }) => setProduct(data))
      .catch(() => toast.error("Product not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      setAdding(true);
      await addItem(product.id, qty);
      toast.success(`${product.name} added to cart!`);
    } catch {
      toast.error("Failed to add. Are you logged in?");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <SkeletonProductDetail />;
  if (!product)
    return (
      <main className="flex min-h-[50vh] items-center justify-center text-gray-400">
        Product not found.
      </main>
    );

  const images = product.images ?? [];
  const currentImage = images[activeImg]?.image_url ?? null;
  const inStock = product.stock > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-10 lg:flex-row"
      >
        {/* ── Gallery ── */}
        <div className="flex flex-col gap-3 lg:w-1/2">
          <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-96">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {currentImage ? (
                  <Image
                    src={currentImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-600">
                    No image
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: ProductImage, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition
                    ${i === activeImg
                      ? "border-brand-500"
                      : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <Image src={img.image_url} alt={`view ${i + 1}`} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="flex flex-col lg:w-1/2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-500">
            {product.category?.name}
          </p>
          <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {product.name}
          </h1>
          <p className="mb-4 text-3xl font-extrabold text-brand-600 dark:text-brand-500">
            ${Number(product.price).toFixed(2)}
          </p>

          <span className={`mb-5 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold
            ${inStock
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
            {inStock ? `${product.stock} in stock` : "Out of stock"}
          </span>

          {product.description && (
            <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {product.description}
            </p>
          )}

          {inStock && (
            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                >
                  +
                </button>
              </div>

              <Button onClick={handleAddToCart} loading={adding} size="lg" className="flex-1">
                Add to Cart
              </Button>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Sold by{" "}
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {product.seller?.username}
            </span>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
