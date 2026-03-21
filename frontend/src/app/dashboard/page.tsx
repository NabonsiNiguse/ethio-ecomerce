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
import { Suspense } from "react";

type Tab = "overview" | "orders" | "profile";

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

  const handleLogout = () => {
    clearTokens();
    toast.success("Logged out.");
    router.push("/");
  };

  if (loading) return <DashboardSkeleton />;

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_price), 0);
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const NAV: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "🏠" },
    { key: "orders", label: "My Orders", icon: "📦" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col gap-0 px-4 py-8 lg:flex-row lg:gap-8">
      {/* ── Sidebar ── */}
      <aside className="mb-6 flex flex-col gap-3 lg:mb-0 lg:w-60 lg:flex-shrink-0">
        {/* Avatar card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-2xl font-black text-orange-600 dark:bg-orange-900/30">
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
          <p className="font-bold text-gray-900 dark:text-gray-100">{user?.username ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
          <span className="mt-2 inline-block rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold capitalize text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            {user?.role ?? "customer"}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-row gap-2 lg:flex-col">
          {NAV.map(({ key, label, icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                tab === key
                  ? "bg-orange-500 text-white shadow"
                  : "border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <span>{icon}</span> {label}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="flex flex-1 items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition dark:border-red-900/30 dark:bg-gray-900 dark:hover:bg-red-900/20"
          >
            <span>🚪</span> Logout
          </motion.button>
        </nav>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "overview" && (
              <OverviewTab
                user={user}
                orders={orders}
                totalSpent={totalSpent}
                paidOrders={paidOrders}
                pendingOrders={pendingOrders}
                onViewOrders={() => setTab("orders")}
              />
            )}
            {tab === "orders" && <OrdersTab orders={orders} />}
            {tab === "profile" && <ProfileTab profile={profile} user={user} onUpdated={setProfile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  user, orders, totalSpent, paidOrders, pendingOrders, onViewOrders,
}: {
  user: UserInfo | null;
  orders: Order[];
  totalSpent: number;
  paidOrders: number;
  pendingOrders: number;
  onViewOrders: () => void;
}) {
  const recentOrders = orders.slice(0, 3);

  const STATS = [
    { icon: "📦", label: "Total Orders", value: orders.length, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { icon: "✅", label: "Completed", value: paidOrders, color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
    { icon: "⏳", label: "Pending", value: pendingOrders, color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400" },
    { icon: "💰", label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white shadow">
        <p className="text-sm font-semibold opacity-80">Welcome back 👋</p>
        <h2 className="mt-1 text-2xl font-black">{user?.username}</h2>
        <p className="mt-1 text-sm opacity-70">Here's what's happening with your account</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/products" className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition">
            🛍️ Shop Now
          </Link>
          <Link href="/cart" className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition">
            🛒 View Cart
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-2 text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Recent Orders</h3>
          <button onClick={onViewOrders} className="text-sm font-semibold text-orange-500 hover:underline">
            View all →
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-400">No orders yet</p>
            <Link href="/products" className="mt-2 inline-block text-sm font-semibold text-orange-500 hover:underline">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-bold text-orange-500">${Number(order.total_price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: "🛍️", label: "Browse Products", href: "/products" },
          { icon: "🎁", label: "Gift Cards", href: "/gift-cards" },
          { icon: "🛒", label: "My Cart", href: "/cart" },
          { icon: "💳", label: "Payment History", href: "#" },
        ].map((q) => (
          <Link key={q.label} href={q.href}>
            <motion.div
              whileHover={{ y: -2 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm hover:shadow-md transition dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="text-2xl">{q.icon}</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{q.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex gap-8">
        <div className="w-60 flex-shrink-0 space-y-3">
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
          </div>
        </div>
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
