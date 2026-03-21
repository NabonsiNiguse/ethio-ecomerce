"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCategories, Category } from "@/context/CategoriesContext";

const NAV_ITEMS = [
  { icon: "🏠", label: "Home",         href: "/" },
  { icon: "🛍️", label: "All Products", href: "/products" },
  { icon: "🎁", label: "Gift Cards",   href: "/gift-cards" },
  { icon: "🛒", label: "Cart",         href: "/cart" },
  { icon: "📦", label: "My Orders",    href: "/dashboard" },
  { icon: "👤", label: "Profile",      href: "/dashboard" },
];

const CAT_ICONS: Record<string, string> = {
  Electronics: "💻", Fashion: "👗", "Home and Kitchen": "🏠",
  Books: "📚", Sports: "⚽", Beauty: "💄",
};

const FALLBACK_CATS = [
  "Electronics", "Fashion", "Home and Kitchen", "Books", "Sports", "Beauty",
];

function SidebarBody({
  pathname,
  categories,
  onClose,
}: {
  pathname: string;
  categories: Category[];
  onClose?: () => void;
}) {
  const [catOpen, setCatOpen] = useState(true);

  const displayCats = categories.length > 0
    ? categories
    : FALLBACK_CATS.map((name, id) => ({ id, name }));

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]));

  const isCatActive = (name: string) =>
    pathname.includes(`category_name=${encodeURIComponent(name)}`);

  return (
    <div className="flex flex-col h-full py-6">

      {/* ── MAIN MENU ─────────────────────────────────────────────────── */}
      <div className="px-4 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
          Main Menu
        </p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-all ${
                isActive(item.href)
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              {/* Left border indicator */}
              {isActive(item.href) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-orange-500" />
              )}
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ── DIVIDER ───────────────────────────────────────────────────── */}
      <div className="mx-4 my-4 h-px bg-white/8" />

      {/* ── CATEGORIES ────────────────────────────────────────────────── */}
      <div className="px-4 flex-1">
        <button
          onClick={() => setCatOpen(v => !v)}
          className="flex w-full items-center justify-between mb-3 group"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition">
            Categories
          </p>
          <motion.svg
            animate={{ rotate: catOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-3.5 w-3.5 text-gray-600"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        <AnimatePresence initial={false}>
          {catOpen && (
            <motion.div
              key="cats"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1">
                {displayCats.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all ${
                      isCatActive(cat.name)
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    {isCatActive(cat.name) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange-500" />
                    )}
                    <span className="text-sm w-5 text-center flex-shrink-0">
                      {CAT_ICONS[cat.name] ?? "🏷️"}
                    </span>
                    <span className="flex-1">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── PROMO CARD ────────────────────────────────────────────────── */}
      <div className="mx-4 mt-6">
        <div
          className="rounded-2xl p-4 shadow-lg"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #e11d48 100%)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
            🎉 Special Offer
          </p>
          <p className="text-[14px] font-black text-white leading-snug">
            Free shipping on orders over 500 ETB
          </p>
          <Link
            href="/products"
            onClick={onClose}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-white/30 transition"
          >
            Shop now
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const categories = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className="fixed left-0 z-30 hidden w-[260px] overflow-y-auto lg:block"
        style={{
          top: "var(--header-h)",
          height: "calc(100vh - var(--header-h))",
          background: "#0B1220",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <SidebarBody pathname={pathname} categories={categories} />
      </aside>

      {/* ── Mobile FAB ──────────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-[13px] font-bold text-white shadow-xl lg:hidden transition hover:scale-105"
        style={{ background: "linear-gradient(135deg, #f97316, #e11d48)" }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
      </button>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="ov"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="dr"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="fixed left-0 top-0 z-50 h-full w-[260px] overflow-y-auto shadow-2xl lg:hidden"
              style={{ background: "#0B1220", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <span className="text-xl">🇪🇹</span>
                  <span className="text-[15px] font-black text-orange-400">Ethio eCommerce</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white/8 hover:text-white transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarBody
                pathname={pathname}
                categories={categories}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
