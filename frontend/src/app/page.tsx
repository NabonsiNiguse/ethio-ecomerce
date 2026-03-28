"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { isAuthenticated, getUserFromToken, getToken } from "@/lib/auth";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product, PaginatedResponse } from "@/types";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import AIRecommendations from "@/components/AIRecommendations";

const CATEGORIES = [
  { icon: "💻", label: "Electronics",    href: "/products?category_name=Electronics" },
  { icon: "👗", label: "Fashion",        href: "/products?category_name=Fashion" },
  { icon: "🏠", label: "Home & Kitchen", href: "/products?category_name=Home+and+Kitchen" },
  { icon: "📚", label: "Books",          href: "/products?category_name=Books" },
  { icon: "⚽", label: "Sports",         href: "/products?category_name=Sports" },
  { icon: "💄", label: "Beauty",         href: "/products?category_name=Beauty" },
  { icon: "🎁", label: "Gift Cards",     href: "/gift-cards" },
  { icon: "🔥", label: "Deals",          href: "/products?sort=deals" },
];

const VALUE_PROPS = [
  { icon: "🚚", title: "Free Shipping",    desc: "On orders over 500 ETB" },
  { icon: "↩️", title: "Easy Returns",     desc: "30-day hassle-free returns" },
  { icon: "🔒", title: "Secure Payments",  desc: "Chapa encrypted checkout" },
  { icon: "💬", title: "24/7 Support",     desc: "Live chat always available" },
];

export default function HomePage() {
  const [authed,   setAuthed]   = useState(false);
  const [username, setUsername] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    if (auth) setUsername(getUserFromToken(getToken())?.username ?? "");
  }, []);

  useEffect(() => {
    api.get<PaginatedResponse<Product>>("/api/products/?page_size=12")
      .then(({ data }) => setProducts(data.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!authed) { toast.error("Please sign in to add items to cart."); return; }
    setAddingId(product.id);
    try { await addItem(product.id, 1); toast.success(`${product.name} added!`); }
    catch { toast.error("Failed to add item."); }
    finally { setAddingId(null); }
  };

  const featured    = products.slice(0, 4);
  const bestSellers = products.slice(4, 8);
  const trending    = products.slice(8, 12);

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#0f1117]">

      {/* ── Welcome bar ── */}
      {mounted && authed && username && (
        <div className="bg-brand-600 px-4 py-2 text-center text-[13px] font-medium text-white">
          Welcome back, <span className="font-bold">{username}</span>!
          <Link href="/dashboard" className="ml-3 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold hover:bg-white/30 transition">
            My Dashboard →
          </Link>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-teal-500">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-8 py-16 md:flex-row md:items-center md:py-20">
          <div className="flex-1 text-white">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-widest backdrop-blur-sm">
              🚚 Special Offer
            </span>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl lg:text-[52px]">
              Free shipping on orders<br />
              <span className="text-yellow-300">over 500 ETB</span>
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/80">
              Discover thousands of products at unbeatable prices. Shop smarter, live better with Ethio eCommerce.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="rounded-full bg-white px-8 py-3 text-[15px] font-bold text-brand-700 shadow-lg hover:shadow-xl transition"
                >
                  Shop Now
                </motion.button>
              </Link>
              {mounted && !authed && (
                <Link href="/auth/register">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="rounded-full border border-white/40 bg-white/10 px-8 py-3 text-[15px] font-semibold text-white hover:bg-white/20 transition"
                  >
                    Sign up free
                  </motion.button>
                </Link>
              )}
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0 md:w-[320px]">
            {[
              { label: "Products",    value: "10,000+", icon: "🛍️" },
              { label: "Sellers",     value: "500+",    icon: "🏪" },
              { label: "Orders/day",  value: "2,000+",  icon: "📦" },
              { label: "Happy users", value: "50,000+", icon: "⭐" },
            ].map(m => (
              <div key={m.label} className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 text-white border border-white/10">
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-xl font-black">{m.value}</div>
                <div className="text-[12px] text-white/70 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="bg-white dark:bg-[#16181f] border-b border-gray-100 dark:border-white/[0.08]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-y divide-gray-100 md:grid-cols-4 md:divide-y-0 px-0">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex items-center gap-3 px-8 py-5">
              <span className="text-2xl flex-shrink-0">{v.icon}</span>
              <div>
                <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{v.title}</p>
                <p className="text-[12px] text-gray-400 dark:text-gray-500">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 py-8 space-y-12">

        {/* ── Category strip ── */}
        <section>
          <h2 className="mb-5 text-[18px] font-bold text-gray-900 dark:text-gray-100">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link key={cat.label} href={cat.href}>
                <motion.div
                  whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
                  className="flex flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#1e2130] px-6 py-4 shadow-sm cursor-pointer transition"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{cat.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Featured Products ── */}
        <section>
          <SectionHeader title="Featured Products" subtitle="Hand-picked just for you" href="/products" />
          <ProductGrid products={featured} loading={loading} />
        </section>

        {/* ── Guest CTA ── */}
        {mounted && !authed && (
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-teal-500 px-8 py-12 text-center text-white shadow-lg">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center gap-4">
              <p className="text-3xl font-extrabold">Get exclusive deals</p>
              <p className="max-w-md text-[16px] text-white/80 leading-relaxed">Create a free account and unlock member-only discounts, order tracking, and more.</p>
              <div className="flex gap-3">
                <Link href="/auth/register">
                  <button className="rounded-full bg-white px-7 py-3 text-[14px] font-bold text-brand-700 hover:bg-gray-100 transition shadow">Register Free</button>
                </Link>
                <Link href="/auth/login">
                  <button className="rounded-full border border-white/40 bg-white/10 px-7 py-3 text-[14px] font-semibold text-white hover:bg-white/20 transition">Sign In</button>
                </Link>
              </div>
            </motion.div>
          </section>
        )}

        {/* ── Best Sellers ── */}
        <section>
          <SectionHeader
            title={mounted && authed ? "Recommended for You" : "Best Sellers"}
            subtitle={mounted && authed ? "Based on popular picks" : "Our most loved products"}
            href="/products"
          />
          <ProductGrid products={bestSellers} loading={loading} />
        </section>

        {/* ── Trending Now ── */}
        <section>
          <SectionHeader title="Trending Now" subtitle="What everyone is buying" href="/products" />
          <ProductGrid products={trending} loading={loading} />
        </section>

        {/* ── AI Recommendations ── */}
        <AIRecommendations
          title="AI Picks for You"
          subtitle="Personalized recommendations powered by AI"
        />

        {/* ── Auth quick links ── */}
        {mounted && authed && (
          <section>
            <h2 className="mb-5 text-[18px] font-bold text-gray-900 dark:text-gray-100">Quick Access</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: "📦", label: "My Orders",  href: "/dashboard?tab=orders" },
                { icon: "🚚", label: "Deliveries", href: "/dashboard?tab=delivery" },
                { icon: "❤️", label: "Wishlist",   href: "/wishlist" },
                { icon: "💬", label: "My Chats",   href: "/chat/support_me" },
              ].map((q) => (
                <Link key={q.label} href={q.href}>
                  <motion.div
                    whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#1e2130] p-6 text-center shadow-sm cursor-pointer transition"
                  >
                    <span className="text-3xl">{q.icon}</span>
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{q.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500">{subtitle}</p>
      </div>
      <Link href={href} className="text-[13px] font-semibold text-brand-600 hover:text-brand-700 hover:underline transition">
        View all →
      </Link>
    </div>
  );
}

function ProductGrid({ products, loading }: { products: Product[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (!products.length) return null;
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
