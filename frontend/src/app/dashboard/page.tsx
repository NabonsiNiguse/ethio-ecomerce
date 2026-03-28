"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/axios";
import { clearTokens, isAuthenticated } from "@/lib/auth";
import { UserInfo, Profile, Order } from "@/types";
import ProfileTab from "./ProfileTab";
import OrdersTab from "./OrdersTab";
import DeliveryTab from "./DeliveryTab";
import { Suspense } from "react";

type Tab = "overview" | "orders" | "delivery" | "profile";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳", paid: "✅", shipped: "🚚", delivered: "📦", cancelled: "❌",
};

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#f97316" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") as Tab) ?? "overview";

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    Promise.all([
      api.get<{ user: UserInfo; profile: Profile }>("/api/users/me"),
      api.get<Order[]>("/api/orders/"),
    ])
      .then(([meRes, ordersRes]) => {
        setUser(meRes.data.user);
        setProfile(meRes.data.profile);
        setOrders(ordersRes.data);
      })
      .catch(() => { toast.error("Session expired."); router.push("/auth/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <DashboardSkeleton />;

  const totalSpent    = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total_price), 0);
  const paidOrders    = orders.filter(o => ["paid","delivered"].includes(o.status)).length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const NAV: { key: Tab; label: string; icon: string }[] = [
    { key: "overview",  label: "Overview",    icon: "🏠" },
    { key: "orders",    label: "My Orders",   icon: "📦" },
    { key: "delivery",  label: "Deliveries",  icon: "🚚" },
    { key: "profile",   label: "Profile",     icon: "👤" },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-118px)] max-w-6xl flex-col gap-0 px-4 py-8 lg:flex-row lg:gap-6">
      {/* ── Sidebar ── */}
      <aside className="mb-6 flex flex-col gap-3 lg:mb-0 lg:w-56 lg:flex-shrink-0">
        {/* Avatar card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="h-16 bg-gradient-to-r from-brand-600 to-teal-500" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-orange-400 to-rose-500 text-xl font-black text-white shadow-lg dark:border-gray-900">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {user?.role ?? "customer"}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
          {NAV.map(({ key, label, icon }) => (
            <motion.button key={key} whileTap={{ scale: 0.97 }} onClick={() => setTab(key)}
              className={`flex flex-1 min-w-[70px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:min-w-0 ${
                tab === key
                  ? "bg-gradient-to-r from-brand-600 to-teal-500 text-white shadow-md"
                  : "border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              }`}>
              <span>{icon}</span>
              <span className="hidden sm:block lg:block">{label}</span>
            </motion.button>
          ))}
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { clearTokens(); toast.success("Logged out."); router.push("/"); }}
            className="flex flex-1 min-w-[70px] items-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition dark:border-red-900/30 dark:bg-gray-900 lg:min-w-0">
            <span>🚪</span>
            <span className="hidden sm:block lg:block">Logout</span>
          </motion.button>
        </nav>

        {/* Quick stats sidebar */}
        <div className="hidden lg:flex flex-col gap-2">
          <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Spent</p>
            <p className="mt-1 text-lg font-black text-gray-900 dark:text-gray-100">{totalSpent.toLocaleString()} ETB</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Orders</p>
            <p className="mt-1 text-lg font-black text-gray-900 dark:text-gray-100">{orders.length}</p>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            {tab === "overview" && (
              <OverviewTab user={user} orders={orders} totalSpent={totalSpent} paidOrders={paidOrders} pendingOrders={pendingOrders} onViewOrders={() => setTab("orders")} />
            )}
            {tab === "orders"   && <OrdersTab orders={orders} />}
            {tab === "delivery" && <DeliveryTab orders={orders} />}
            {tab === "profile"  && <ProfileTab profile={profile} user={user} onUpdated={setProfile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ user, orders, totalSpent, paidOrders, pendingOrders, onViewOrders }: {
  user: UserInfo | null; orders: Order[]; totalSpent: number;
  paidOrders: number; pendingOrders: number; onViewOrders: () => void;
}) {
  const recentOrders = orders.slice(0, 4);

  // Tax estimate (15% VAT on paid orders)
  const TAX_RATE = 0.15;
  const taxPaid = orders
    .filter(o => ["paid","shipped","delivered"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_price) * TAX_RATE, 0);

  // Monthly spending for sparkline (last 6 months)
  const monthlySpend = (() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status === "cancelled") return;
      const m = new Date(o.created_at).toISOString().slice(0, 7);
      map[m] = (map[m] || 0) + Number(o.total_price);
    });
    const sorted = Object.keys(map).sort().slice(-6);
    return sorted.map(k => map[k]);
  })();

  // Category breakdown
  const categorySpend: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status === "cancelled") return;
    o.items?.forEach(item => {
      const cat = (item.product as any)?.category?.name || "Other";
      categorySpend[cat] = (categorySpend[cat] || 0) + Number(item.line_total);
    });
  });
  const topCategories = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const STATS = [
    {
      icon: "📦", label: "Total Orders", value: orders.length,
      sub: `${paidOrders} completed`, color: "from-blue-500 to-indigo-600",
      sparkData: monthlySpend,
    },
    {
      icon: "💰", label: "Total Spent", value: `${totalSpent.toLocaleString()} ETB`,
      sub: "All time", color: "from-orange-500 to-rose-500",
      sparkData: monthlySpend,
    },
    {
      icon: "🧾", label: "Est. Tax (VAT 15%)", value: `${taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB`,
      sub: "On paid orders", color: "from-violet-500 to-purple-600",
      sparkData: [],
    },
    {
      icon: "⏳", label: "Pending", value: pendingOrders,
      sub: "Awaiting payment", color: "from-amber-400 to-yellow-500",
      sparkData: [],
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-teal-500 p-6 text-white shadow-xl shadow-brand-600/20">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute right-8 bottom-0 h-20 w-20 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm font-semibold opacity-80">Welcome back 👋</p>
          <h2 className="mt-1 text-2xl font-black">{user?.username}</h2>
          <p className="mt-1 text-sm opacity-70">Here's your shopping summary</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/products" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition backdrop-blur-sm">
              🛍️ Shop Now
            </Link>
            <Link href="/cart" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition backdrop-blur-sm">
              🛒 My Cart
            </Link>
            <Link href="/ai-shopper" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition backdrop-blur-sm">
              🤖 AI Shopper
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} p-4 text-white shadow-lg`}>
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-xl">{s.icon}</p>
              <p className="mt-2 text-xl font-black leading-tight">{s.value}</p>
              <p className="text-[11px] font-semibold opacity-80">{s.label}</p>
              <p className="text-[10px] opacity-60">{s.sub}</p>
              {s.sparkData.length > 1 && (
                <div className="mt-2">
                  <Sparkline data={s.sparkData} color="rgba(255,255,255,0.8)" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Spending chart + category breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly spending */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Monthly Spending (ETB)</h3>
          {monthlySpend.length > 0 ? (
            <div className="flex items-end gap-1.5 h-28">
              {monthlySpend.map((v, i) => {
                const max = Math.max(...monthlySpend, 1);
                const pct = (v / max) * 100;
                return (
                  <div key={i} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full">
                      <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 hidden group-hover:block z-10">
                        <div className="rounded-lg bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                          {v.toLocaleString()} ETB
                        </div>
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 4)}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-teal-400"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">M{i + 1}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-1">📊</p>
                <p className="text-xs">No spending data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Spending by Category</h3>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map(([cat, amount], i) => {
                const maxAmt = topCategories[0][1];
                const pct = (amount / maxAmt) * 100;
                const colors = ["bg-brand-500", "bg-orange-500", "bg-violet-500", "bg-teal-500"];
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{cat}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{amount.toLocaleString()} ETB</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-1">🏷️</p>
                <p className="text-xs">No category data yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax summary card */}
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 dark:border-violet-900/30 dark:from-violet-900/10 dark:to-indigo-900/10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl dark:bg-violet-900/30">🧾</div>
          <div className="flex-1">
            <p className="font-bold text-violet-800 dark:text-violet-300">Tax Summary (VAT 15%)</p>
            <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">Estimated VAT included in your purchases</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: "Gross Spent", value: `${totalSpent.toLocaleString()} ETB` },
                { label: "Est. VAT (15%)", value: `${taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB` },
                { label: "Net (ex-VAT)", value: `${(totalSpent - taxPaid).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB` },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-white/70 p-3 text-center dark:bg-gray-800/50">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Recent Orders</h3>
          <button onClick={onViewOrders} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            View all →
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-semibold text-gray-500">No orders yet</p>
            <Link href="/products" className="mt-3 inline-block rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentOrders.map((order, i) => (
              <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
                    {STATUS_ICONS[order.status] || "📦"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Order #{order.id}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-bold text-orange-500">{Number(order.total_price).toLocaleString()} ETB</span>
                  {order.status !== "pending" && (
                    <Link href={`/track/${order.id}`} className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 transition dark:bg-gray-800 dark:text-gray-300">
                      Track
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: "🛍️", label: "Browse Products", href: "/products", color: "from-brand-500 to-teal-500" },
          { icon: "🤖", label: "AI Shopper",       href: "/ai-shopper", color: "from-violet-500 to-indigo-500" },
          { icon: "❤️", label: "Wishlist",          href: "/wishlist",  color: "from-rose-500 to-pink-500" },
          { icon: "🎁", label: "Gift Cards",        href: "/gift-cards", color: "from-amber-500 to-orange-500" },
        ].map(q => (
          <Link key={q.label} href={q.href}>
            <motion.div whileHover={{ y: -3, scale: 1.02 }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm hover:shadow-md transition dark:border-gray-800 dark:bg-gray-900">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${q.color} text-xl text-white shadow-sm`}>
                {q.icon}
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{q.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
