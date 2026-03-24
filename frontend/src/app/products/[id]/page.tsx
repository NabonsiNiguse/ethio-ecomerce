"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product, ProductImage, PaginatedResponse } from "@/types";
import Button from "@/components/ui/Button";
import { SkeletonProductDetail } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ProductCard";
import ProductCard from "@/components/ProductCard";
import { startConversation } from "@/lib/chat";
import { isAuthenticated } from "@/lib/auth";

// Mock reviews — replace with real API when available
const MOCK_REVIEWS = [
  { id: 1, user: "Abebe K.", rating: 5, comment: "Excellent product! Fast delivery and great quality.", date: "2026-03-10" },
  { id: 2, user: "Tigist M.", rating: 4, comment: "Good value for money. Would recommend.", date: "2026-03-05" },
  { id: 3, user: "Dawit H.", rating: 4, comment: "Exactly as described. Happy with the purchase.", date: "2026-02-28" },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"description" | "reviews" | "shipping">("description");
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [copied, setCopied] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Product>(`/api/products/${id}/`)
      .then(({ data }) => {
        setProduct(data);
        // Fetch related products from same category
        if (data.category?.name) {
          api.get<PaginatedResponse<Product>>(`/api/products/?category_name=${encodeURIComponent(data.category.name)}&page_size=4`)
            .then(({ data: rel }) => setRelated(rel.results.filter((p) => p.id !== data.id).slice(0, 4)))
            .catch(() => {});
        }
      })
      .catch(() => toast.error("Product not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      toast.success(`${product.name} added to cart!`);
    } catch {
      toast.error("Failed to add. Are you logged in?");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      router.push("/checkout");
    } catch {
      toast.error("Failed. Are you logged in?");
      setAdding(false);
    }
  };

  const handleChatWithSeller = async () => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    if (!product) return;
    setChatLoading(true);
    try {
      const { conversation } = await startConversation(product.id);
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error("Could not start chat. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleShare = async () => {    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) return <SkeletonProductDetail />;
  if (!product) return (
    <main className="flex min-h-[50vh] items-center justify-center text-gray-400">Product not found.</main>
  );

  const images = product.images ?? [];
  const currentImage = images[activeImg]?.image_url ?? null;
  const inStock = product.stock > 0;
  const wished = has(product.id);
  const avgRating = 4.2;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-600">Products</Link>
        {product.category && <>
          <span>/</span>
          <Link href={`/products?category_name=${encodeURIComponent(product.category.name)}`} className="hover:text-brand-600">
            {product.category.name}
          </Link>
        </>}
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-10 lg:flex-row"
      >
        {/* ── Gallery ── */}
        <div className="flex flex-col gap-3 lg:w-1/2">
          <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-[420px]">
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
                  <Image src={currentImage} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">🛍️</div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Wishlist + Share overlay */}
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <button
                onClick={() => toggle(product.id, product.name)}
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110 dark:bg-gray-900/90 ${wished ? "text-red-500" : "text-gray-400"}`}
                aria-label="Wishlist"
              >
                {wished ? "❤️" : "🤍"}
              </button>
              <button
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110 dark:bg-gray-900/90 text-gray-500"
                aria-label="Share"
              >
                {copied ? "✅" : "🔗"}
              </button>
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: ProductImage, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImg ? "border-brand-500" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>

          {/* Rating summary */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((i) => (
                <span key={i} className={`text-lg ${i <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}>★</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{avgRating}</span>
            <span className="text-sm text-gray-400">({MOCK_REVIEWS.length} reviews)</span>
          </div>

          <p className="mb-4 text-4xl font-extrabold text-brand-600 dark:text-brand-500">
            ${Number(product.price).toFixed(2)}
          </p>

          {/* Stock */}
          <div className="mb-5 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              inStock ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-green-500" : "bg-red-500"}`} />
              {inStock ? `${product.stock} in stock` : "Out of stock"}
            </span>
            {inStock && product.stock <= 10 && (
              <span className="text-xs font-semibold text-orange-500">⚡ Only {product.stock} left!</span>
            )}
          </div>

          {/* Seller */}
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-600 dark:bg-brand-900/30">
              {product.seller?.username?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Sold by</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{product.seller?.username}</p>
            </div>
            <button
              onClick={handleChatWithSeller}
              disabled={chatLoading}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 active:scale-95 disabled:opacity-60 transition"
            >
              {chatLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              Chat with Seller
            </button>
          </div>

          {inStock && (
            <div className="mb-5 flex items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition">−</button>
                <span className="w-10 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition">+</button>
              </div>
              <Button onClick={handleAddToCart} loading={adding} size="lg" className="flex-1">
                🛒 Add to Cart
              </Button>
            </div>
          )}

          <Button
            onClick={handleBuyNow}
            disabled={!inStock || adding}
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
          >
            ⚡ Buy Now
          </Button>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: "🔒", label: "Secure Payment" },
              { icon: "🚚", label: "Fast Delivery" },
              { icon: "↩️", label: "Easy Returns" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl bg-gray-50 py-2 dark:bg-gray-800">
                <p className="text-lg">{b.icon}</p>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Tabs: Description / Reviews / Shipping ── */}
      <div className="mt-12">
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800">
          {(["description", "reviews", "shipping"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-6 py-3 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t}
              {tab === t && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="py-6"
          >
            {tab === "description" && (
              <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
                {product.description
                  ? <p className="leading-relaxed">{product.description}</p>
                  : <p className="text-gray-400 italic">No description available.</p>
                }
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-6">
                {/* Rating summary */}
                <div className="flex items-center gap-6 rounded-2xl bg-gray-50 p-5 dark:bg-gray-800">
                  <div className="text-center">
                    <p className="text-5xl font-black text-gray-900 dark:text-gray-100">{avgRating}</p>
                    <div className="mt-1 flex justify-center">
                      {[1,2,3,4,5].map((i) => (
                        <span key={i} className={`text-lg ${i <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{MOCK_REVIEWS.length} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map((star) => {
                      const count = MOCK_REVIEWS.filter((r) => r.rating === star).length;
                      const pct = (count / MOCK_REVIEWS.length) * 100;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-gray-500">{star}</span>
                          <span className="text-yellow-400">★</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-2 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-4 text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review list */}
                {MOCK_REVIEWS.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-5 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-600 dark:bg-brand-900/30">
                          {review.user[0]}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{review.user}</span>
                      </div>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex mb-2">
                      {[1,2,3,4,5].map((i) => (
                        <span key={i} className={`text-sm ${i <= review.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                  </div>
                ))}

                {/* Write review */}
                <div className="rounded-2xl border border-gray-100 p-5 dark:border-gray-800">
                  <p className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Write a Review</p>
                  <div className="mb-3 flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <button key={i} onClick={() => setNewReview((r) => ({ ...r, rating: i }))}
                        className={`text-2xl transition hover:scale-110 ${i <= newReview.rating ? "text-yellow-400" : "text-gray-200"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Share your experience..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview((r) => ({ ...r, comment: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <Button
                    className="mt-3"
                    onClick={() => { toast.success("Review submitted! (demo)"); setNewReview({ rating: 5, comment: "" }); }}
                  >
                    Submit Review
                  </Button>
                </div>
              </div>
            )}

            {tab === "shipping" && (
              <div className="space-y-4">
                {[
                  { icon: "🚚", title: "Standard Delivery", desc: "3–5 business days · Free on orders over 500 ETB" },
                  { icon: "⚡", title: "Express Delivery", desc: "1–2 business days · 150 ETB" },
                  { icon: "↩️", title: "Returns Policy", desc: "30-day hassle-free returns. Item must be unused and in original packaging." },
                  { icon: "🔒", title: "Secure Packaging", desc: "All items are carefully packed to prevent damage during transit." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Related Products</h2>
            <Link href={`/products?category_name=${encodeURIComponent(product.category?.name ?? "")}`}
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
