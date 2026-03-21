"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { isAuthenticated, getUserFromToken, getToken, logout } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

interface Category { id: number; name: string; }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NAV_LINKS = [
  { label: "All Products",   href: "/products",                              icon: "🛍️" },
  { label: "Today's Deals",  href: "/products?sort=deals",                   icon: "🔥" },
  { label: "Gift Cards",     href: "/gift-cards",                            icon: "🎁" },
  { label: "Electronics",   href: "/products?category_name=Electronics",    icon: "💻" },
  { label: "Fashion",        href: "/products?category_name=Fashion",        icon: "👗" },
  { label: "Home & Kitchen", href: "/products?category_name=Home and Kitchen", icon: "🏠" },
  { label: "Books",          href: "/products?category_name=Books",          icon: "📚" },
  { label: "Sports",         href: "/products?category_name=Sports",         icon: "⚽" },
  { label: "Beauty",         href: "/products?category_name=Beauty",         icon: "💄" },
];

export default function ShopHeader() {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { cart } = useCart();
  const itemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const [authed,         setAuthed]         = useState(false);
  const [username,       setUsername]       = useState("");
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [search,         setSearch]         = useState("");
  const [selectedCat,    setSelectedCat]    = useState("All");
  const [categories,     setCategories]     = useState<Category[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    if (auth) setUsername(getUserFromToken(getToken())?.username ?? "");
  }, []);

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
        setCategories(cats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setShowMobileMenu(false); }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const cat = selectedCat !== "All" ? `&category_name=${encodeURIComponent(selectedCat)}` : "";
    router.push(`/products?search=${encodeURIComponent(search.trim())}${cat}`);
    setShowMobileMenu(false);
    setShowSearch(false);
  };

  const handleLogout = () => {
    logout(); setAuthed(false); setUsername("");
    setShowUserMenu(false); setShowMobileMenu(false);
    router.push("/");
  };

  const CAT_ICONS: Record<string, string> = {
    Electronics: "💻", Fashion: "👗", "Home and Kitchen": "🏠",
    Books: "📚", Sports: "⚽", Beauty: "💄",
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
        <div
          className="bg-[#0f1117] text-white"
          style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5)" }}
        >
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5">

            {/* Burger — mobile only */}
            <button
              onClick={() => setShowMobileMenu(true)}
              aria-label="Open menu"
              className="flex-shrink-0 rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white transition md:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 hover:border-orange-500/50 hover:bg-white/5 transition"
            >
              <span className="text-2xl leading-none">🇪🇹</span>
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-[15px] font-black tracking-tight text-orange-400">
                  Ethio eCommerce
                </span>
                <span className="text-[9px] font-medium text-gray-400 tracking-wide">
                  Powered by STEM Engineering
                </span>
              </div>
            </Link>

            {/* Deliver to — xl only */}
            <div className="hidden xl:flex flex-col flex-shrink-0 rounded-xl border border-transparent px-2 py-1.5 hover:border-white/10 hover:bg-white/5 transition cursor-pointer">
              <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">Deliver to</span>
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1 mt-0.5">
                <span className="text-orange-400">📍</span> Ethiopia
              </span>
            </div>

            {/* Search bar — desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 min-w-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10 focus-within:ring-orange-500/60 transition"
            >
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="bg-[#1e2130] text-gray-200 text-xs px-3 border-r border-white/10 focus:outline-none cursor-pointer flex-shrink-0 max-w-[130px] hover:bg-[#252840] transition"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, categories…"
                className="flex-1 min-w-0 bg-white px-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-400 transition px-5 flex-shrink-0 flex items-center justify-center"
              >
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Right actions — desktop */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">

              {/* Account */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex flex-col rounded-xl border border-transparent px-3 py-1.5 hover:border-white/10 hover:bg-white/5 transition text-left"
                >
                  <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">
                    {authed ? `Hello, ${username}` : "Hello, sign in"}
                  </span>
                  <span className="text-xs font-bold text-gray-100 flex items-center gap-1 mt-0.5">
                    Account & Lists
                    <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-white/10 bg-[#1a1d2e] shadow-2xl z-50 overflow-hidden"
                    >
                      {!authed ? (
                        <div className="p-4 border-b border-white/10">
                          <Link
                            href="/auth/login"
                            onClick={() => setShowUserMenu(false)}
                            className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-sm font-bold text-white hover:bg-orange-400 transition"
                          >
                            Sign In
                          </Link>
                          <p className="mt-2.5 text-center text-xs text-gray-500">
                            New customer?{" "}
                            <Link href="/auth/register" onClick={() => setShowUserMenu(false)} className="text-orange-400 hover:text-orange-300 font-semibold">
                              Start here
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 border-b border-white/10">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white font-black text-base flex-shrink-0">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{username}</p>
                            <p className="text-xs text-gray-400">Signed in</p>
                          </div>
                        </div>
                      )}
                      <div className="py-1.5">
                        {[
                          { icon: "📦", label: "My Orders",  href: "/dashboard" },
                          { icon: "👤", label: "My Profile", href: "/dashboard" },
                          { icon: "🛒", label: "My Cart",    href: "/cart" },
                          { icon: "🎁", label: "Gift Cards", href: "/gift-cards" },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                          >
                            <span className="text-base w-5 text-center">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                        {authed && (
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition"
                          >
                            <span className="text-base w-5 text-center">🚪</span>
                            Sign Out
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Returns & Orders */}
              <Link
                href="/dashboard"
                className="flex flex-col rounded-xl border border-transparent px-3 py-1.5 hover:border-white/10 hover:bg-white/5 transition"
              >
                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Returns</span>
                <span className="text-xs font-bold text-gray-100 mt-0.5">& Orders</span>
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 hover:border-white/10 hover:bg-white/5 transition"
              >
                <div className="relative">
                  <svg className="h-8 w-8 text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 left-4 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white ring-2 ring-[#0f1117]">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-100 pb-0.5">Cart</span>
              </Link>

              {/* Theme */}
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="rounded-xl border border-transparent p-2 text-gray-400 hover:border-white/10 hover:bg-white/5 hover:text-white transition text-lg"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            {/* Mobile right: search + cart */}
            <div className="flex items-center gap-2.5 md:hidden ml-auto">
              <button
                onClick={() => setShowSearch(!showSearch)}
                aria-label="Search"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link href="/cart" aria-label="Cart" className="relative rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          <AnimatePresence>
            {showSearch && (
              <motion.form
                key="msearch"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSearch}
                className="flex md:hidden border-t border-white/5 px-4 py-2.5 gap-2 overflow-hidden"
              >
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 rounded-xl bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 transition">
                  Go
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* ══ SECONDARY NAV ════════════════════════════════════════════════ */}
        <nav
          className="hidden md:block overflow-x-auto scrollbar-hide"
          style={{ background: "#161929", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto flex max-w-[1440px] items-center gap-0.5 px-4 py-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href.split("?")[0]));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-orange-500/20 text-orange-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                  }`}
                >
                  <span className="text-sm">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ══ MOBILE DRAWER ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
            />
            <motion.div
              key="dr"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 z-[70] h-full w-80 bg-[#0f1117] text-white shadow-2xl flex flex-col md:hidden overflow-y-auto"
            >
              {/* Drawer top */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Link href="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2.5">
                  <span className="text-2xl">🇪🇹</span>
                  <div>
                    <p className="text-[15px] font-black text-orange-400">Ethio eCommerce</p>
                    <p className="text-[9px] text-gray-500">Powered by STEM Engineering</p>
                  </div>
                </Link>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Auth */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {authed ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-white text-lg flex-shrink-0">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white">{username}</p>
                      <p className="text-xs text-gray-500">Signed in</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/auth/login" onClick={() => setShowMobileMenu(false)}
                      className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-sm font-bold text-white hover:bg-orange-400 transition">
                      Sign In
                    </Link>
                    <Link href="/auth/register" onClick={() => setShowMobileMenu(false)}
                      className="block w-full rounded-xl border border-white/10 py-2.5 text-center text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
                      Create Account
                    </Link>
                  </div>
                )}
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-0.5 px-3 py-3">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Navigation</p>
                {[
                  { icon: "🏠", label: "Home",          href: "/" },
                  { icon: "🛍️", label: "All Products",  href: "/products" },
                  { icon: "🔥", label: "Today's Deals", href: "/products?sort=deals" },
                  { icon: "🎁", label: "Gift Cards",    href: "/gift-cards" },
                  { icon: "🛒", label: "My Cart",       href: "/cart",      badge: itemCount },
                  { icon: "📦", label: "My Orders",     href: "/dashboard" },
                  { icon: "👤", label: "My Profile",    href: "/dashboard" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      pathname === item.href
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg w-6 text-center">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && (item.badge ?? 0) > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              {/* Categories */}
              <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Categories</p>
                {(categories.length > 0 ? categories : [
                  { id: 1, name: "Electronics" }, { id: 2, name: "Fashion" },
                  { id: 3, name: "Home and Kitchen" }, { id: 4, name: "Books" },
                  { id: 5, name: "Sports" }, { id: 6, name: "Beauty" },
                ]).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition"
                  >
                    <span className="text-base w-6 text-center">{CAT_ICONS[cat.name] ?? "🏷️"}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>

              {/* Bottom */}
              <div className="mt-auto px-3 py-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={toggle}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition"
                >
                  <span className="text-lg w-6 text-center">{theme === "dark" ? "☀️" : "🌙"}</span>
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                {authed && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 hover:bg-white/5 transition"
                  >
                    <span className="text-lg w-6 text-center">🚪</span>
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
