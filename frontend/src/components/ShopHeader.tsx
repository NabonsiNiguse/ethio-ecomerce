"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useCategories } from "@/context/CategoriesContext";
import { isAuthenticated, getUserFromToken, getToken, logout } from "@/lib/auth";
import { useWishlist } from "@/context/WishlistContext";
import { useTheme } from "@/hooks/useTheme";

/* ─── nav items ─────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: "Today's Deals",  icon: "🔥", href: "/products?sort=deals",                    hot: true  },
  { label: "Electronics",    icon: "💻", href: "/products?category_name=Electronics",     hot: false },
  { label: "Fashion",        icon: "👗", href: "/products?category_name=Fashion",         hot: false },
  { label: "Home & Kitchen", icon: "🏠", href: "/products?category_name=Home and Kitchen",hot: false },
  { label: "Books",          icon: "📚", href: "/products?category_name=Books",           hot: false },
  { label: "Sports",         icon: "⚽", href: "/products?category_name=Sports",          hot: false },
  { label: "Beauty",         icon: "💄", href: "/products?category_name=Beauty",          hot: false },
  { label: "Gift Cards",     icon: "🎁", href: "/gift-cards",                             hot: false },
];

/* ─── tiny icon helpers ──────────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const HeartIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const CartIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const SunIcon = () => (
  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);
const ChevronDown = () => (
  <svg className="h-3.5 w-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);
const MenuIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ─── Badge ──────────────────────────────────────────────────────────────── */
function Badge({ count, color = "bg-brand-600" }: { count: number; color?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full ${color} px-1 text-[10px] font-black text-white leading-none`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

/* ─── Icon button ────────────────────────────────────────────────────────── */
function IconBtn({ href, label, badge, badgeColor, children, onClick }: {
  href?: string; label: string; badge?: number; badgeColor?: string;
  children: React.ReactNode; onClick?: () => void;
}) {
  const cls = "relative flex h-11 min-w-[44px] items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200";
  if (href) return (
    <Link href={href} aria-label={label} className={cls}>
      {children}
      {badge !== undefined && <Badge count={badge} color={badgeColor} />}
    </Link>
  );
  return (
    <button onClick={onClick} aria-label={label} className={cls}>
      {children}
      {badge !== undefined && <Badge count={badge} color={badgeColor} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function ShopHeader() {
  const router   = useRouter();
  const pathname = usePathname();
  const { cart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const itemCount  = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const categories = useCategories();
  const { theme, toggle: toggleTheme } = useTheme();

  const [mounted,      setMounted]      = useState(false);
  const [authed,       setAuthed]       = useState(false);
  const [username,     setUsername]     = useState("");
  const [showMenu,     setShowMenu]     = useState(false);
  const [showDrawer,   setShowDrawer]   = useState(false);
  const [search,       setSearch]       = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = mounted && theme === "dark";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    if (auth) setUsername(getUserFromToken(getToken())?.username ?? "");
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setShowDrawer(false); }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = () => {
    logout(); setAuthed(false); setUsername(""); setShowMenu(false); router.push("/");
  };

  /* shared class fragments */
  const headerBg  = "bg-white dark:bg-[#16181f]";
  const borderB   = "border-b border-gray-200 dark:border-white/[0.08]";
  const dropBg    = "bg-white dark:bg-[#1e2130]";
  const dropBorder= "border border-gray-200 dark:border-white/[0.10]";

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 w-full ${headerBg} shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]`}>

        {/* ── TOP ROW (70px) ── */}
        <div className={`${borderB}`}>
          <div className="mx-auto flex h-[70px] max-w-[1280px] items-center gap-4 px-6">

            {/* Logo */}
            <Link href="/" className="flex flex-shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/8 transition">
              <span className="text-[22px] leading-none">🇪🇹</span>
              <div className="leading-none">
                <span className="block text-[17px] font-black tracking-tight text-brand-600 whitespace-nowrap">
                  Ethio eCommerce
                </span>
                <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                  STEM Engineering
                </span>
              </div>
            </Link>

            {/* ── SEARCH BAR ── */}
            <form onSubmit={handleSearch}
              className="hidden md:flex flex-1 min-w-0 h-[46px] rounded-xl border-2 border-brand-600 overflow-hidden shadow-sm focus-within:shadow-[0_0_0_3px_rgba(15,118,110,0.18)] transition-shadow">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, brands, and categories..."
                className="flex-1 min-w-0 bg-white dark:bg-[#252836] px-5 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              <button type="submit" aria-label="Search"
                className="flex-shrink-0 flex items-center justify-center w-[52px] bg-brand-600 hover:bg-brand-700 active:scale-95 transition text-white">
                <SearchIcon />
              </button>
            </form>

            {/* ── RIGHT ACTIONS ── */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">

              {/* Wishlist */}
              <IconBtn href="/wishlist" label="Wishlist" badge={wishlistCount} badgeColor="bg-rose-500">
                <HeartIcon />
              </IconBtn>

              {/* Cart */}
              <IconBtn href="/cart" label="Cart" badge={itemCount}>
                <CartIcon />
              </IconBtn>

              {/* Theme toggle */}
              <IconBtn label={isDark ? "Light mode" : "Dark mode"} onClick={toggleTheme}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </IconBtn>

              {/* Divider */}
              <div className="mx-1 h-7 w-px bg-gray-200 dark:bg-white/10" />

              {/* Account dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex h-11 items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white text-[12px] font-black flex-shrink-0">
                    {authed ? username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="hidden lg:flex flex-col items-start leading-none">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {authed ? `Hello, ${username}` : "Hello, Guest"}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mt-0.5">Account</span>
                  </div>
                  <ChevronDown />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 top-full mt-2 w-60 rounded-2xl ${dropBg} ${dropBorder} shadow-2xl z-50 overflow-hidden`}
                    >
                      {/* User header */}
                      {!authed ? (
                        <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border-b border-gray-100 dark:border-white/8">
                          <Link href="/auth/login" onClick={() => setShowMenu(false)}
                            className="block w-full rounded-xl bg-brand-600 py-2.5 text-center text-[13px] font-bold text-white hover:bg-brand-700 transition">
                            Sign In
                          </Link>
                          <p className="mt-2 text-center text-[12px] text-gray-500 dark:text-gray-400">
                            New?{" "}
                            <Link href="/auth/register" onClick={() => setShowMenu(false)}
                              className="font-semibold text-brand-600 hover:underline">
                              Create account
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 border-b border-gray-100 dark:border-white/8">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-black text-sm flex-shrink-0">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100">{username}</p>
                            <p className="text-[11px] text-brand-600 font-medium">Signed in ✓</p>
                          </div>
                        </div>
                      )}

                      {/* Menu items */}
                      <div className="py-1.5">
                        {[
                          { icon: "📦", label: "My Orders",  href: "/dashboard" },
                          { icon: "👤", label: "My Profile", href: "/dashboard" },
                          { icon: "🛒", label: "My Cart",    href: "/cart" },
                          { icon: "❤️", label: "Wishlist",   href: "/wishlist", badge: wishlistCount },
                          { icon: "🎁", label: "Gift Cards", href: "/gift-cards" },
                          { icon: "🏪", label: "Seller Dashboard", href: "/seller/dashboard" },
                          { icon: "🔧", label: "Admin Panel", href: "/admin/dashboard" },
                        ].map(item => (
                          <Link key={item.label} href={item.href} onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-brand-700 dark:hover:text-brand-400 transition">
                            <span className="w-5 text-center text-sm">{item.icon}</span>
                            <span className="flex-1 font-medium">{item.label}</span>
                            {"badge" in item && (item.badge ?? 0) > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>

                      {/* Theme row */}
                      <div className="border-t border-gray-100 dark:border-white/8 py-1.5">
                        <button onClick={toggleTheme}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          <span className="w-5 text-center">{isDark ? "☀️" : "🌙"}</span>
                          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                        </button>
                      </div>

                      {authed && (
                        <div className="border-t border-gray-100 dark:border-white/8 py-1.5">
                          <button onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            <span className="w-5 text-center text-sm">🚪</span>
                            Sign Out
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile right */}
            <div className="flex items-center gap-1 md:hidden ml-auto">
              <IconBtn href="/cart" label="Cart" badge={itemCount}>
                <CartIcon />
              </IconBtn>
              <IconBtn label={isDark ? "Light mode" : "Dark mode"} onClick={toggleTheme}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </IconBtn>
              <button onClick={() => setShowDrawer(true)} aria-label="Open menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <MenuIcon />
              </button>
            </div>
          </div>
        </div>

        {/* ── SECONDARY NAV (48px) ── */}
        <nav className={`hidden md:block ${headerBg}`}>
          <div className="mx-auto flex max-w-[1280px] items-center px-6 h-[48px] gap-0.5 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(item => {
              const isActive = pathname.startsWith(item.href.split("?")[0]) && item.href !== "/";
              return (
                <Link key={item.label} href={item.href}
                  className={`
                    flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition
                    ${isActive
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-semibold"
                      : item.hot
                        ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-gray-100"
                    }
                  `}
                >
                  <span className="text-[14px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {/* Become a Seller — opens in new tab */}
            <a
              href="/auth/seller-register"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-1.5 text-[13px] font-bold text-white whitespace-nowrap hover:from-orange-400 hover:to-rose-400 transition shadow-md shadow-orange-500/20"
            >
              🏪 Become a Seller
            </a>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden" />

            <motion.div key="dr"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className={`fixed left-0 top-0 z-[70] h-full w-[300px] flex flex-col overflow-y-auto ${dropBg} shadow-2xl md:hidden border-r border-gray-200 dark:border-white/8`}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
                <Link href="/" onClick={() => setShowDrawer(false)} className="flex items-center gap-2">
                  <span className="text-xl">🇪🇹</span>
                  <span className="text-[15px] font-black text-brand-600">Ethio eCommerce</span>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={toggleTheme} aria-label="Toggle theme"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition">
                    {isDark ? <SunIcon /> : <MoonIcon />}
                  </button>
                  <button onClick={() => setShowDrawer(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition">
                    <CloseIcon />
                  </button>
                </div>
              </div>

              {/* Mobile search */}
              <form onSubmit={handleSearch} className="flex gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/8">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 text-[14px] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-brand-500" />
                <button type="submit"
                  className="h-10 rounded-xl bg-brand-600 px-4 text-[13px] font-bold text-white hover:bg-brand-700 transition">
                  Go
                </button>
              </form>

              {/* Auth */}
              <div className="px-4 py-4 border-b border-gray-100 dark:border-white/8">
                {authed ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-black text-white flex-shrink-0">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">{username}</p>
                      <p className="text-[11px] text-brand-600 font-medium">Signed in ✓</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/auth/login" onClick={() => setShowDrawer(false)}
                      className="block w-full rounded-xl bg-brand-600 py-2.5 text-center text-[13px] font-bold text-white hover:bg-brand-700 transition">
                      Sign In
                    </Link>
                    <Link href="/auth/register" onClick={() => setShowDrawer(false)}
                      className="block w-full rounded-xl border border-gray-200 dark:border-white/10 py-2.5 text-center text-[13px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      Create Account
                    </Link>
                    <a href="/auth/seller-register" target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowDrawer(false)}
                      className="block w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-2.5 text-center text-[13px] font-bold text-white hover:from-orange-400 hover:to-rose-400 transition">
                      🏪 Become a Seller
                    </a>
                  </div>
                )}
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-0.5 px-3 py-3">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Navigation</p>
                {[
                  { label: "Home",          href: "/",                    icon: "🏠" },
                  { label: "All Products",  href: "/products",            icon: "🛍️" },
                  { label: "Today's Deals", href: "/products?sort=deals", icon: "🔥" },
                  { label: "Gift Cards",    href: "/gift-cards",          icon: "🎁" },
                  { label: "My Cart",       href: "/cart",                icon: "🛒", badge: itemCount },
                  { label: "My Orders",     href: "/dashboard",           icon: "📦" },
                  { label: "Wishlist",      href: "/wishlist",            icon: "❤️", badge: wishlistCount },
                ].map(item => (
                  <Link key={item.label} href={item.href} onClick={() => setShowDrawer(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium transition ${
                      pathname === item.href
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}>
                    <span className="w-5 text-center">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && (item.badge ?? 0) > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-black text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              {/* Categories */}
              <div className="px-3 pb-4 border-t border-gray-100 dark:border-white/8 pt-3">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Categories</p>
                {(categories.length > 0 ? categories : [
                  { id: 1, name: "Electronics" }, { id: 2, name: "Fashion" },
                  { id: 3, name: "Home and Kitchen" }, { id: 4, name: "Books" },
                  { id: 5, name: "Sports" }, { id: 6, name: "Beauty" },
                ]).map(cat => (
                  <Link key={cat.id} href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                    onClick={() => setShowDrawer(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition">
                    <span className="w-5 text-center">
                      {NAV_ITEMS.find(n => n.href.includes(encodeURIComponent(cat.name)))?.icon ?? "🏷️"}
                    </span>
                    {cat.name}
                  </Link>
                ))}
              </div>

              {authed && (
                <div className="mt-auto px-3 py-3 border-t border-gray-100 dark:border-white/8">
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    <span className="w-5 text-center">🚪</span>
                    Sign Out
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
