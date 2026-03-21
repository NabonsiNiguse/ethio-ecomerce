"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useCategories } from "@/context/CategoriesContext";
import { isAuthenticated, getUserFromToken, getToken, logout } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

interface Category { id: number; name: string; }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NAV_LINKS = [
  { label: "All Products",    href: "/products",                               icon: "🛍️" },
  { label: "Today's Deals",   href: "/products?sort=deals",                    icon: "🔥" },
  { label: "Gift Cards",      href: "/gift-cards",                             icon: "🎁" },
  { label: "Electronics",     href: "/products?category_name=Electronics",     icon: "💻" },
  { label: "Fashion",         href: "/products?category_name=Fashion",         icon: "👗" },
  { label: "Home & Kitchen",  href: "/products?category_name=Home and Kitchen",icon: "🏠" },
  { label: "Books",           href: "/products?category_name=Books",           icon: "📚" },
  { label: "Sports",          href: "/products?category_name=Sports",          icon: "⚽" },
  { label: "Beauty",          href: "/products?category_name=Beauty",          icon: "💄" },
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
  const categories = useCategories();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    if (auth) setUsername(getUserFromToken(getToken())?.username ?? "");
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
    setShowSearch(false);
    setShowMobileMenu(false);
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
      {/* Fixed header — top:0, full width, no gap */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full" style={{ background: "#131921" }}>

        {/* ── TOP BAR 70px ── */}
        <div>
          <div className="flex h-[70px] w-full items-center justify-between gap-4 px-6">

            {/* Burger — mobile */}
            <button
              onClick={() => setShowMobileMenu(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/8 hover:text-white transition md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5 transition"
            >
              <span className="text-2xl leading-none">🇪🇹</span>
              <div className="flex flex-col leading-none">
                <span className="text-[18px] font-black tracking-tight text-orange-400">
                  Ethio eCommerce
                </span>
                <span className="text-[11px] font-medium text-gray-500 mt-0.5">
                  Powered by STEM Engineering
                </span>
              </div>
            </Link>

            {/* Search — desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 min-w-0 h-11 overflow-hidden rounded-xl border border-white/10 focus-within:border-orange-500/60 transition"
              style={{ background: "#fff" }}
            >
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="flex-shrink-0 w-[140px] bg-gray-100 text-gray-700 text-[13px] px-3 border-r border-gray-200 focus:outline-none cursor-pointer hover:bg-gray-200 transition rounded-l-xl"
              >
                <option value="All">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, brands, categories…"
                className="flex-1 min-w-0 bg-white px-4 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)" }}
              />
              <button
                type="submit"
                className="flex-shrink-0 w-12 flex items-center justify-center bg-orange-500 hover:bg-orange-400 transition rounded-r-xl"
              >
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Right actions — desktop */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">

              {/* Account dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/5 transition"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-sm font-black flex-shrink-0">
                    {authed ? username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] text-gray-500 leading-none">
                      {authed ? `Hello, ${username}` : "Hello, sign in"}
                    </span>
                    <span className="text-[13px] font-semibold text-white leading-none mt-0.5 flex items-center gap-1">
                      Account
                      <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                      style={{ background: "#0f1623" }}
                    >
                      {!authed ? (
                        <div className="p-4 border-b border-white/8">
                          <Link
                            href="/auth/login"
                            onClick={() => setShowUserMenu(false)}
                            className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[13px] font-bold text-white hover:bg-orange-400 transition"
                          >
                            Sign In
                          </Link>
                          <p className="mt-2 text-center text-[12px] text-gray-500">
                            New?{" "}
                            <Link href="/auth/register" onClick={() => setShowUserMenu(false)} className="text-orange-400 hover:text-orange-300 font-semibold">
                              Create account
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 border-b border-white/8">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white font-black text-sm flex-shrink-0">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-white">{username}</p>
                            <p className="text-[11px] text-gray-500">Signed in</p>
                          </div>
                        </div>
                      )}
                      <div className="py-1">
                        {[
                          { icon: "📦", label: "My Orders",  href: "/dashboard" },
                          { icon: "👤", label: "My Profile", href: "/dashboard" },
                          { icon: "🛒", label: "My Cart",    href: "/cart" },
                          { icon: "🎁", label: "Gift Cards", href: "/gift-cards" },
                        ].map(item => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-400 hover:bg-white/5 hover:text-white transition"
                          >
                            <span className="w-5 text-center text-sm">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                        {authed && (
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-white/5 hover:text-red-300 transition"
                          >
                            <span className="w-5 text-center text-sm">🚪</span>
                            Sign Out
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Orders */}
              <Link
                href="/dashboard"
                className="flex flex-col rounded-xl px-3 py-2 hover:bg-white/5 transition"
              >
                <span className="text-[11px] text-gray-400 leading-none">Returns</span>
                <span className="text-[13px] font-semibold text-white leading-none mt-0.5">& Orders</span>
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/5 transition"
              >
                <div className="relative">
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 left-4 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white ring-2 ring-[#0B1220]">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-white">Cart</span>
              </Link>

              {/* Theme toggle */}
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition text-base"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            {/* Mobile right: search + cart */}
            <div className="flex items-center gap-2 md:hidden ml-auto">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-white/8 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link href="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-white/8 hover:text-white transition">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.form
                key="msearch"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSearch}
                className="flex md:hidden border-t border-white/8 px-4 py-3 gap-2 overflow-hidden"
              >
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-[14px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                />
                <button type="submit" className="h-10 rounded-xl bg-orange-500 px-5 text-[13px] font-bold text-white hover:bg-orange-400 transition">
                  Go
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECONDARY NAV ── */}
        <nav
          className="hidden md:block overflow-x-auto scrollbar-hide"
          style={{
            background: "#131921",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex w-full items-center gap-0.5 px-6 py-1.5">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href.split("?")[0]));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-gray-400 hover:bg-white/10 hover:text-white"
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

      {/* ── MOBILE DRAWER ──────────────────────────────────────────────────── */}
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
              className="fixed left-0 top-0 z-[70] h-full w-[280px] flex flex-col overflow-y-auto md:hidden"
              style={{ background: "#131921", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <Link href="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2.5">
                  <span className="text-xl">🇪🇹</span>
                  <div>
                    <p className="text-[15px] font-black text-orange-400">Ethio eCommerce</p>
                    <p className="text-[10px] text-gray-600">Powered by STEM Engineering</p>
                  </div>
                </Link>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white/8 hover:text-white transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Auth */}
              <div className="px-4 py-4 border-b border-white/8">
                {authed ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-white flex-shrink-0">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">{username}</p>
                      <p className="text-[11px] text-gray-500">Signed in</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/auth/login" onClick={() => setShowMobileMenu(false)}
                      className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[13px] font-bold text-white hover:bg-orange-400 transition">
                      Sign In
                    </Link>
                    <Link href="/auth/register" onClick={() => setShowMobileMenu(false)}
                      className="block w-full rounded-xl border border-white/10 py-2.5 text-center text-[13px] font-semibold text-gray-400 hover:bg-white/5 transition">
                      Create Account
                    </Link>
                  </div>
                )}
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-0.5 px-4 py-4">
                <p className="px-2 pb-3 text-[11px] font-bold uppercase tracking-widest text-gray-600">Navigation</p>
                {[
                  { icon: "🏠", label: "Home",          href: "/" },
                  { icon: "🛍️", label: "All Products",  href: "/products" },
                  { icon: "🔥", label: "Today's Deals", href: "/products?sort=deals" },
                  { icon: "🎁", label: "Gift Cards",    href: "/gift-cards" },
                  { icon: "🛒", label: "My Cart",       href: "/cart",      badge: itemCount },
                  { icon: "📦", label: "My Orders",     href: "/dashboard" },
                  { icon: "👤", label: "My Profile",    href: "/dashboard" },
                ].map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${
                      pathname === item.href
                        ? "bg-orange-500/15 text-orange-400 border-l-4 border-orange-500"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
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
              <div className="px-4 pb-4 border-t border-white/8 pt-4">
                <p className="px-2 pb-3 text-[11px] font-bold uppercase tracking-widest text-gray-600">Categories</p>
                {(categories.length > 0 ? categories : [
                  { id: 1, name: "Electronics" }, { id: 2, name: "Fashion" },
                  { id: 3, name: "Home and Kitchen" }, { id: 4, name: "Books" },
                  { id: 5, name: "Sports" }, { id: 6, name: "Beauty" },
                ]).map(cat => (
                  <Link
                    key={cat.id}
                    href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-gray-400 hover:bg-white/5 hover:text-white transition"
                  >
                    <span className="w-5 text-center">{CAT_ICONS[cat.name] ?? "🏷️"}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>

              {/* Bottom */}
              <div className="mt-auto px-4 py-4 border-t border-white/8 flex flex-col gap-0.5">
                <button
                  onClick={toggle}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-gray-400 hover:bg-white/5 hover:text-white transition"
                >
                  <span className="w-5 text-center">{theme === "dark" ? "☀️" : "🌙"}</span>
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                {authed && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-red-400 hover:bg-white/5 transition"
                  >
                    <span className="w-5 text-center">🚪</span>
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
