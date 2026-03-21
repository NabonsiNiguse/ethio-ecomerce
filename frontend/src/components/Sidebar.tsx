"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Category { id: number; name: string; }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

// ── Shared sidebar body ───────────────────────────────────────────────────────
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

  const displayCats =
    categories.length > 0
      ? categories
      : FALLBACK_CATS.map((name, id) => ({ id, name }));

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]));

  const isCatActive = (name: string) =>
    pathname.includes(`category_name=${encodeURIComponent(name)}`);

  return (
    <div className="flex flex-col h-full">
      {/* ── Main nav ── */}
      <nav className="flex flex-col gap-0.5 px-3 pt-4 pb-2">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">
          Main Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-orange-500/15 text-orange-400 shadow-sm"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
            }`}
          >
            {/* Active indicator bar */}
            <span
              className={`absolute left-0 h-6 w-0.5 rounded-r-full bg-orange-500 transition-all ${
                isActive(item.href) ? "opacity-100" : "opacity-0"
              }`}
            />
            <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isActive(item.href) && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
            )}
          </Link>
        ))}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 my-1 h-px bg-white/5" />

      {/* ── Categories ── */}
      <div className="px-3 py-2 flex-1">
        <button
          onClick={() => setCatOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Categories
          </span>
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
              <div className="flex flex-col gap-0.5 pt-1">
                {displayCats.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isCatActive(cat.name)
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                    }`}
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">
                      {CAT_ICONS[cat.name] ?? "🏷️"}
                    </span>
                    <span className="flex-1">{cat.name}</span>
                    {isCatActive(cat.name) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Promo card ── */}
      <div className="mx-3 mb-4 mt-2 overflow-hidden rounded-2xl">
        <div
          className="relative p-4"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
            boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
          }}
        >
          {/* Decorative circle */}
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -right-1 bottom-2 h-10 w-10 rounded-full bg-white/10" />

          <p className="relative text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
            🎉 Special Offer
          </p>
          <p className="relative text-sm font-black text-white leading-snug">
            Free shipping on orders over 500 ETB
          </p>
          <Link
            href="/products"
            onClick={onClose}
            className="relative mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30 transition"
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

// ── Main export ───────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/products/?page_size=100`)
      .then((r) => r.json())
      .then((data) => {
        const seen = new Set<string>();
        const cats: Category[] = [];
        (data.results ?? []).forEach((p: any) => {
          if (p.category && !seen.has(p.category.name)) {
            seen.add(p.category.name);
            cats.push(p.category);
          }
        });
        if (cats.length > 0) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed left-0 top-[88px] z-30 hidden h-[calc(100vh-88px)] w-64 overflow-y-auto lg:block relative"
        style={{
          background: "#0f1117",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SidebarBody pathname={pathname} categories={categories} />
      </aside>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-xl lg:hidden transition hover:scale-105"
        style={{ background: "linear-gradient(135deg, #f97316, #e11d48)" }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
      </button>

      {/* ── Mobile drawer ── */}
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
              className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto shadow-2xl lg:hidden"
              style={{ background: "#0f1117" }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-4 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <span className="text-xl">🇪🇹</span>
                  <span className="text-sm font-black text-orange-400">Ethio eCommerce</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
