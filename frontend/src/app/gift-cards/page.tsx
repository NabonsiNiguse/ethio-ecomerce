"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { PaginatedResponse } from "@/types";
import type { Product } from "@/components/ProductCard";

// ── Real Unsplash images for each occasion ──────────────────────────────────
const OCCASIONS = [
  {
    label: "Birthday",
    href: "/products?category_name=Electronics",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop",
    gradient: "from-pink-500 to-rose-600",
    badge: "🎂 Most Popular",
  },
  {
    label: "Appreciation",
    href: "/products?category_name=Beauty",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=260&fit=crop",
    gradient: "from-amber-400 to-yellow-500",
    badge: "💛 Top Gifted",
  },
  {
    label: "Celebration",
    href: "/products?category_name=Fashion",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=260&fit=crop",
    gradient: "from-violet-500 to-purple-700",
    badge: "🎉 Trending",
  },
  {
    label: "Any Occasion",
    href: "/products",
    image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=260&fit=crop",
    gradient: "from-teal-400 to-cyan-600",
    badge: "🎁 Universal",
  },
];

// ── Real brand gift cards with Unsplash images ───────────────────────────────
const BRANDS = [
  {
    name: "Electronics",
    href: "/products?category_name=Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=180&fit=crop",
    color: "from-blue-600 to-indigo-700",
  },
  {
    name: "Fashion",
    href: "/products?category_name=Fashion",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=180&fit=crop",
    color: "from-pink-500 to-rose-600",
  },
  {
    name: "Books",
    href: "/products?category_name=Books",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=180&fit=crop",
    color: "from-amber-500 to-orange-600",
  },
  {
    name: "Sports",
    href: "/products?category_name=Sports",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&h=180&fit=crop",
    color: "from-green-500 to-emerald-700",
  },
  {
    name: "Home & Kitchen",
    href: "/products?category_name=Home+and+Kitchen",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=180&fit=crop",
    color: "from-orange-400 to-amber-600",
  },
  {
    name: "Beauty",
    href: "/products?category_name=Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=180&fit=crop",
    color: "from-purple-500 to-violet-700",
  },
];

const AMOUNTS = ["$25", "$50", "$100", "$200", "Custom"];

export default function GiftCardShopPage() {
  const { addItem } = useCart();
  const [authed, setAuthed] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState("$50");
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  // Fetch real products from backend
  useEffect(() => {
    api.get<PaginatedResponse<Product>>("/api/products/?page_size=4")
      .then(({ data }) => setFeaturedProducts(data.results.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!authed) { toast.error("Please sign in to add items to cart."); return; }
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch { toast.error("Failed to add item."); }
    finally { setAddingId(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&h=400&fit=crop"
            alt="Gift cards hero"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="relative mx-auto max-w-[1400px] px-6 py-16 text-center text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="mb-3 inline-block rounded-full bg-brand-100 border border-brand-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700">
              🎁 Gift Card Shop
            </span>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
              The Gift Card Shop
            </h1>
            <p className="mt-3 text-lg text-gray-300 max-w-xl mx-auto">
              Give the perfect gift — every time, for any occasion. Delivered instantly.
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { icon: "🎁", label: "Redeem a gift card", style: "bg-brand-600 hover:bg-brand-700 text-white" },
                { icon: "💰", label: "View your balance", style: "bg-white/10 hover:bg-white/20 text-white border border-white/20" },
                { icon: "🔄", label: "Reload", style: "bg-white/10 hover:bg-white/20 text-white border border-white/20" },
              ].map((btn) => (
                <motion.button
                  key={btn.label}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow transition ${btn.style}`}
                >
                  <span>{btn.icon}</span> {btn.label}
                </motion.button>
              ))}
            </div>

            {/* Amount selector */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
              <span className="text-sm text-gray-400">Amount:</span>
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    selectedAmount === amt
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-300 text-gray-700 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 py-10 space-y-14">

        {/* ── PROMO BANNERS ── */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">New Product Features</h2>
          <div className="grid gap-5 sm:grid-cols-2">

            {/* Banner 1 — real image */}
            <motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer">
              <div className="relative h-56">
                <Image
                  src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=700&h=400&fit=crop"
                  alt="eGreeting card"
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="mb-2 w-fit rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                  ✨ New Feature
                </span>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Pair your gift card with a personalized eGreeting card
                </h3>
                <p className="mt-1 text-sm text-white/80">Add a heartfelt message and make your gift truly special.</p>
                <button className="mt-3 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-purple-700 hover:bg-gray-100 transition shadow">
                  Learn more →
                </button>
              </div>
            </motion.div>

            {/* Banner 2 — real image */}
            <motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer">
              <div className="relative h-56">
                <Image
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=700&h=400&fit=crop"
                  alt="Send gift card"
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-rose-900/60 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="mb-2 w-fit rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                  🔗 Shareable Link
                </span>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Send a gift card your way
                </h3>
                <p className="mt-1 text-sm text-white/80">Choose Shareable Link — share via WhatsApp, Telegram, or email.</p>
                <button className="mt-3 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-orange-700 hover:bg-gray-100 transition shadow">
                  Send now →
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SHOP BY OCCASION ── */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Shop gift cards by occasion</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {OCCASIONS.map((occ, i) => (
              <motion.div
                key={occ.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <Link href={occ.href} className="group block overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all dark:bg-gray-900">
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={occ.image}
                      alt={occ.label}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${occ.gradient} opacity-50`} />
                    <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {occ.badge}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{occ.label}</p>
                      <p className="text-xs text-gray-400">Gift cards</p>
                    </div>
                    <svg className="h-4 w-4 text-gray-400 group-hover:text-brand-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── SHOP BY CATEGORY (real images) ── */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Shop by category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {BRANDS.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -5 }}
              >
                <Link href={brand.href} className="group block overflow-hidden rounded-xl bg-white shadow hover:shadow-lg transition-all dark:bg-gray-900">
                  <div className="relative h-28 overflow-hidden">
                    <Image
                      src={brand.image}
                      alt={brand.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${brand.color} opacity-40 group-hover:opacity-60 transition`} />
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{brand.name}</p>
                    <p className="text-xs text-brand-600 group-hover:underline">Shop now</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURED PRODUCTS FROM DB ── */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Featured Products</h2>
              <p className="text-sm text-gray-400">Live from our store</p>
            </div>
            <Link href="/products" className="text-sm font-semibold text-brand-600 hover:underline">
              View all →
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="group overflow-hidden rounded-2xl bg-white shadow hover:shadow-lg transition-all dark:bg-gray-900"
                >
                  <Link href={`/products/${product.id}`} className="block">
                    <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {product.images?.[0]?.image_url ? (
                        <Image
                          src={product.images[0].image_url}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400">{product.category?.name}</p>
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{product.name}</p>
                      <p className="mt-1 text-base font-bold text-brand-600">${Number(product.price).toFixed(2)}</p>
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={addingId === product.id}
                      className="w-full rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-60"
                    >
                      {addingId === product.id ? "Adding..." : "Add to Cart"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900 dark:text-gray-100">How gift cards work</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: "🛒", title: "Choose a card", desc: "Pick from hundreds of brands and occasions" },
              { icon: "✉️", title: "Send it instantly", desc: "Deliver by email, link, or print at home" },
              { icon: "🎉", title: "They redeem it", desc: "Recipient shops with their gift card balance" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl dark:bg-orange-900/30">
                  {item.icon}
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl shadow-xl"
        >
          <div className="relative h-48">
            <Image
              src="https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1400&h=400&fit=crop"
              alt="Gift card CTA"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-gray-900/60" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
            <p className="text-3xl font-extrabold">Give the gift of choice</p>
            <p className="mt-2 text-gray-300">Gift cards never expire and can be used on thousands of products.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="rounded-full bg-brand-600 px-8 py-3 font-semibold hover:bg-brand-700 transition shadow-lg"
              >
                Buy a gift card
              </motion.button>
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="rounded-full border border-white/30 bg-white/10 px-8 py-3 font-semibold hover:bg-white/20 transition"
                >
                  Browse products
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-10 bg-gray-900 py-8 text-center text-sm text-gray-400">
        <p className="font-semibold text-gray-300">Ethio eCommerce</p>
        <p className="mt-1 text-xs">Powered by STEM Engineering · © 2026</p>
        <div className="mt-3 flex justify-center gap-6">
          {["Privacy", "Terms", "Help", "Contact"].map((l) => (
            <a key={l} href="#" className="hover:text-white transition">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
