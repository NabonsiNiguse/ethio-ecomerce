"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCategories, Category } from "@/context/CategoriesContext";
import { useUser } from "@/context/UserContext";

const CAT_ICONS: Record<string, string> = {
  Electronics:        "💻",
  Fashion:            "👗",
  "Home and Kitchen": "🏠",
  Books:              "📚",
  Sports:             "⚽",
  Beauty:             "💄",
};

const FALLBACK_CATS = [
  "Electronics", "Fashion", "Home and Kitchen", "Books", "Sports", "Beauty",
];

function IconHome()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function IconGrid()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>; }
function IconGift()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>; }
function IconHeart() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function IconCart()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function IconBox()   { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>; }
function IconUser()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
function IconChevron({ open }: { open: boolean }) {
  return (
    <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
      className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </motion.svg>
  );
}

const NAV_ITEMS = [
  { Icon: IconHome,  label: "Home",         href: "/" },
  { Icon: IconGrid,  label: "All Products", href: "/products" },
  { Icon: IconGift,  label: "Gift Cards",   href: "/gift-cards" },
  { Icon: IconHeart, label: "Wishlist",     href: "/wishlist" },
  { Icon: IconCart,  label: "Cart",         href: "/cart" },
  { Icon: IconBox,   label: "My Orders",    href: "/dashboard" },
  { Icon: IconUser,  label: "Profile",      href: "/dashboard" },
];

// ── Seller nav items ──────────────────────────────────────────────────────────
const SELLER_NAV = [
  { Icon: IconHome,  label: "Overview",         href: "/seller/dashboard" },
  { Icon: IconBox,   label: "My Products",       href: "/seller/dashboard?tab=products" },
  { Icon: IconCart,  label: "Order Management",  href: "/seller/dashboard?tab=orders" },
  { Icon: IconUser,  label: "Shop Settings",     href: "/seller/dashboard?tab=settings" },
  { Icon: IconGrid,  label: "Payouts",           href: "/seller/dashboard?tab=payouts" },
];

function SellerSidebarBody({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const { user } = useUser();
  const isActive = (href: string) => pathname.startsWith(href.split("?")[0]);
  const navItem = (active: boolean) => `
    relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all
    ${active
      ? "bg-[#FFEDD5] dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold"
      : "text-gray-700 dark:text-gray-300 hover:bg-[#FFF7ED] dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400"
    }
  `;
  const accentBar = "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange-500";

  return (
    <div className="flex flex-col h-full overflow-y-auto py-5">
      {/* Seller badge */}
      <div className="mx-3 mb-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 p-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Seller Panel</p>
        <p className="text-sm font-bold mt-0.5">{user.username}</p>
      </div>

      <div className="px-3">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Seller Menu</p>
        <nav className="space-y-0.5">
          {SELLER_NAV.map(({ Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link key={label} href={href} onClick={onClose} className={navItem(active)}>
                {active && <span className={accentBar} />}
                <span className={`flex-shrink-0 ${active ? "text-orange-500" : "text-gray-400"}`}><Icon /></span>
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-3 my-4 h-px bg-gray-200 dark:bg-white/[0.08]" />

      <div className="px-3">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Marketplace</p>
        <nav className="space-y-0.5">
          {[
            { Icon: IconHome,  label: "Home",         href: "/" },
            { Icon: IconGrid,  label: "All Products", href: "/products" },
            { Icon: IconCart,  label: "My Cart",      href: "/cart" },
          ].map(({ Icon, label, href }) => {
            const active = pathname === href;
            return (
              <Link key={label} href={href} onClick={onClose} className={navItem(active)}>
                {active && <span className={accentBar} />}
                <span className={`flex-shrink-0 ${active ? "text-orange-500" : "text-gray-400"}`}><Icon /></span>
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarBody({ pathname, categories, onClose }: {
  pathname: string;
  categories: Category[];
  onClose?: () => void;
}) {
  const [catOpen,    setCatOpen]    = useState(true);
  const [priceOpen,  setPriceOpen]  = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  const displayCats = categories.length > 0
    ? categories
    : FALLBACK_CATS.map((name, id) => ({ id, name }));

  const isActive    = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]));
  const isCatActive = (name: string) => pathname.includes(`category_name=${encodeURIComponent(name)}`);

  /* shared class strings */
  const navItem = (active: boolean) => `
    relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all
    ${active
      ? "bg-[#FFEDD5] dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold"
      : "text-gray-700 dark:text-gray-300 hover:bg-[#FFF7ED] dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400"
    }
  `;
  const accentBar = "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange-500";
  const sectionTitle = "text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition";
  const divider = "mx-3 my-4 h-px bg-gray-200 dark:bg-white/[0.08]";

  return (
    <div className="flex flex-col h-full overflow-y-auto py-5">

      {/* MAIN MENU */}
      <div className="px-3 mb-1">
        <p className={`px-2 pb-2 ${sectionTitle}`}>Main Menu</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(({ Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link key={label} href={href} onClick={onClose} className={navItem(active)}>
                {active && <span className={accentBar} />}
                <span className={`flex-shrink-0 ${active ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}>
                  <Icon />
                </span>
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={divider} />

      {/* CATEGORIES */}
      <div className="px-3">
        <button onClick={() => setCatOpen(v => !v)}
          className="flex w-full items-center justify-between px-2 pb-2 group">
          <p className={sectionTitle}>Category</p>
          <IconChevron open={catOpen} />
        </button>
        <AnimatePresence initial={false}>
          {catOpen && (
            <motion.div key="cats"
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="space-y-0.5 pb-1">
                {displayCats.map(cat => {
                  const active = isCatActive(cat.name);
                  return (
                    <Link key={cat.id}
                      href={`/products?category_name=${encodeURIComponent(cat.name)}`}
                      onClick={onClose}
                      className={navItem(active)}>
                      {active && <span className={accentBar} />}
                      <span className="text-[15px] flex-shrink-0">{CAT_ICONS[cat.name] ?? "🏷️"}</span>
                      <span className="flex-1">{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={divider} />

      {/* PRICE RANGE */}
      <div className="px-3">
        <button onClick={() => setPriceOpen(v => !v)}
          className="flex w-full items-center justify-between px-2 pb-2 group">
          <p className={sectionTitle}>Price (ETB)</p>
          <IconChevron open={priceOpen} />
        </button>
        <AnimatePresence initial={false}>
          {priceOpen && (
            <motion.div key="price"
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden pb-1">
              <div className="flex items-center gap-2 px-1">
                <input type="number" min={0} placeholder="Min"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[12px] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-brand-500 focus:outline-none transition" />
                <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                <input type="number" min={0} placeholder="Max"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[12px] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-brand-500 focus:outline-none transition" />
              </div>
              <button className="mt-2 w-full rounded-lg bg-brand-600 py-2 text-[12px] font-semibold text-white hover:bg-brand-700 transition">
                Apply
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={divider} />

      {/* RATING */}
      <div className="px-3">
        <button onClick={() => setRatingOpen(v => !v)}
          className="flex w-full items-center justify-between px-2 pb-2 group">
          <p className={sectionTitle}>Rating</p>
          <IconChevron open={ratingOpen} />
        </button>
        <AnimatePresence initial={false}>
          {ratingOpen && (
            <motion.div key="rating"
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden pb-1">
              {[4, 3, 2, 1].map(r => (
                <button key={r}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FFF7ED] dark:hover:bg-orange-900/20 transition">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className={`h-3.5 w-3.5 ${i <= r ? "text-amber-400" : "text-gray-200 dark:text-gray-600"}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[12px] text-gray-600 dark:text-gray-400 font-medium">& up</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PROMO CARD */}
      <div className="mx-3 mt-6">
        <div className="rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">🚚 Special Offer</p>
          <p className="text-[13px] font-bold text-white leading-snug">
            Free shipping on orders over 500 ETB
          </p>
          <Link href="/products" onClick={onClose}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/30 transition">
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
  const pathname   = usePathname();
  const categories = useCategories();
  const { isSeller } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't render the global sidebar on dashboard pages that have their own sidebar
  const isDashboardPage = pathname.startsWith("/seller/dashboard") ||
                          pathname.startsWith("/admin/dashboard") ||
                          pathname.startsWith("/rider");
  if (isDashboardPage) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 z-30 hidden w-[var(--sidebar-w)] overflow-hidden lg:flex flex-col bg-white dark:bg-[#16181f] border-r border-gray-200 dark:border-white/[0.08] shadow-[2px_0_8px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]"
        style={{ top: "var(--header-h)", height: "calc(100vh - var(--header-h))" }}>
        {isSeller
          ? <SellerSidebarBody pathname={pathname} />
          : <SidebarBody pathname={pathname} categories={categories} />
        }
      </aside>

      {/* Mobile FAB */}
      <button onClick={() => setMobileOpen(true)}
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-[13px] font-bold text-white shadow-xl lg:hidden hover:bg-brand-700 active:scale-95 transition">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="ov"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" />

            <motion.aside key="dr"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed left-0 top-0 z-50 h-full w-[280px] overflow-hidden bg-white dark:bg-[#16181f] border-r border-gray-200 dark:border-white/[0.08] shadow-2xl lg:hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <span className="text-xl">🇪🇹</span>
                  <span className="text-[15px] font-black text-brand-600">Ethio eCommerce</span>
                </Link>
                <button onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-60px)] overflow-y-auto">
                {isSeller
                  ? <SellerSidebarBody pathname={pathname} onClose={() => setMobileOpen(false)} />
                  : <SidebarBody pathname={pathname} categories={categories} onClose={() => setMobileOpen(false)} />
                }
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
