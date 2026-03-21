"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { isAuthenticated, getUserFromToken, getToken } from "@/lib/auth";
import { useCart } from "@/context/CartContext";
import { Product, PaginatedResponse, UserInfo } from "@/types";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

// ─── Hero slides ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    badge: "New Arrivals",
    headline: "Shop smarter,",
    accent: "live better",
    sub: "Discover thousands of products at unbeatable prices with fast delivery.",
    cta: "Shop Now",
    href: "/products",
    bg: "from-brand-600 to-indigo-800",
    emoji: "🛍️",
  },
  {
    id: 2,
    badge: "Limited Offer",
    headline: "Up to 50% off",
    accent: "Best Sellers",
    sub: "Grab the hottest deals before they're gone. New discounts every day.",
    cta: "See Deals",
    href: "/products",
    bg: "from-violet-600 to-purple-800",
    emoji: "🔥",
  },
  {
    id: 3,
    badge: "Free Shipping",
    headline: "Orders over",
    accent: "$50 ship free",
    sub: "No promo code needed. Just add to cart and enjoy free delivery.",
    cta: "Start Shopping",
    href: "/products",
    bg: "from-sky-600 to-cyan-800",
    emoji: "🚚",
  },
];

const VALUE_PROPS = [
  { icon: "🚚", title: "Free Shipping", desc: "On all orders over $50" },
  { icon: "↩️", title: "Easy Returns", desc: "30-day hassle-free returns" },
  { icon: "🔒", title: "Secure Payments", desc: "256-bit SSL encryption" },
  { icon: "💬", title: "24/7 Support", desc: "We're always here to help" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [slide, setSlide] = useState(0);
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<number | null>(null);

  // Client-only auth check
  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    if (auth) {
      const payload = getUserFromToken(getToken());
      setUsername(payload?.username ?? "");
    }
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fetch featured products
  useEffect(() => {
    api
      .get<PaginatedResponse<Product>>("/api/products/")
      .then(({ data }) => setProducts(data.results.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!authed) {
      toast.error("Please sign in to add items to cart.");
      return;
    }
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setAddingId(null);
    }
  };

  const featured = products.slice(0, 4);
  const bestSellers = products.slice(4, 8);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Personalized greeting bar (auth only) ── */}
      <AnimatePresence>
        {authed && username && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white"
          >
            👋 Welcome back, <span className="font-bold">{username}</span>! Ready to shop?
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Carousel ── */}
      <section className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45 }}
            className={`bg-gradient-to-br ${SLIDES[slide].bg} px-6 py-20 md:py-28`}
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center text-white">
              <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                {SLIDES[slide].badge}
              </span>
              <div className="text-6xl">{SLIDES[slide].emoji}</div>
              <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                {SLIDES[slide].headline}{" "}
                <span className="text-yellow-300">{SLIDES[slide].accent}</span>
              </h1>
              <p className="max-w-lg text-lg text-white/80">{SLIDES[slide].sub}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={SLIDES[slide].href}>
                  <Button size="lg" className="bg-white text-brand-700 hover:bg-gray-100">
                    {SLIDES[slide].cta}
                  </Button>
                </Link>
                {!authed && (
                  <Link href="/auth/register">
                    <Button size="lg" className="border border-white/50 bg-white/10 text-white hover:bg-white/20">
                      Sign up free
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === slide ? "w-6 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800 md:grid-cols-4 md:divide-y-0">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex flex-col items-center gap-1 px-6 py-5 text-center">
              <span className="text-2xl">{v.icon}</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{v.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader
          title="Featured Products"
          subtitle="Hand-picked just for you"
          href="/products"
        />
        <ProductGrid
          products={featured}
          loading={loadingProducts}
          onAddToCart={handleAddToCart}
          addingId={addingId}
        />
      </section>

      {/* ── Guest CTA Banner ── */}
      {!authed && (
        <section className="mx-4 mb-14 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-700 px-8 py-12 text-center text-white shadow-xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-3xl font-extrabold">Get exclusive deals</p>
            <p className="max-w-md text-white/80">
              Create a free account and unlock member-only discounts, order tracking, and more.
            </p>
            <div className="flex gap-3">
              <Link href="/auth/register">
                <Button className="bg-white text-brand-700 hover:bg-gray-100" size="lg">
                  Register Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button className="border border-white/40 bg-white/10 text-white hover:bg-white/20" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── Best Sellers ── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader
          title={authed ? "Recommended for You" : "Best Sellers"}
          subtitle={authed ? "Based on popular picks" : "Our most loved products"}
          href="/products"
        />
        <ProductGrid
          products={bestSellers}
          loading={loadingProducts}
          onAddToCart={handleAddToCart}
          addingId={addingId}
        />
      </section>

      {/* ── Auth user quick links ── */}
      {authed && (
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {QUICK_LINKS.map((q) => (
              <Link key={q.label} href={q.href}>
                <motion.div
                  whileHover={{ y: -3 }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="text-3xl">{q.icon}</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{q.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Quick links for auth users ─────────────────────────────────────────────
const QUICK_LINKS = [
  { icon: "📦", label: "My Orders", href: "/dashboard" },
  { icon: "🛒", label: "Cart", href: "/cart" },
  { icon: "👤", label: "Profile", href: "/dashboard" },
  { icon: "🏷️", label: "Browse All", href: "/products" },
];

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>
      </div>
      <Link href={href} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-500">
        View all →
      </Link>
    </div>
  );
}

// ─── Product grid with quick-add ─────────────────────────────────────────────
function ProductGrid({
  products,
  loading,
  onAddToCart,
  addingId,
}: {
  products: Product[];
  loading: boolean;
  onAddToCart: (p: Product) => void;
  addingId: number | null;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4 }}
          className="group relative rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <Link href={`/products/${product.id}`} className="block">
            <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
              {product.images?.[0]?.image_url ? (
                <Image
                  src={product.images[0].image_url}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">🛍️</div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{product.category?.name}</p>
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{product.name}</p>
              <p className="mt-1 text-base font-bold text-brand-600 dark:text-brand-500">
                ${Number(product.price).toFixed(2)}
              </p>
            </div>
          </Link>
          {/* Quick add button */}
          <div className="px-3 pb-3">
            <Button
              size="sm"
              className="w-full"
              loading={addingId === product.id}
              onClick={() => onAddToCart(product)}
            >
              Add to Cart
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
