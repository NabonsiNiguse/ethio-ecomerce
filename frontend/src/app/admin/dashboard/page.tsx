"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { isAuthenticated, getUserFromToken, getToken, clearTokens } from "@/lib/auth";
import AdminOverview from "./AdminOverview";
import AdminUsers from "./AdminUsers";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminPayments from "./AdminPayments";

type Tab = "overview" | "users" | "products" | "orders" | "payments";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    const payload = getUserFromToken(getToken());
    if (payload?.role !== "admin") { router.push("/"); return; }
    setUsername(payload.username ?? "Admin");
    setLoading(false);
  }, [router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" /></div>;

  const NAV: { key: Tab; icon: string; label: string }[] = [
    { key: "overview",  icon: "📊", label: "Overview" },
    { key: "users",     icon: "👥", label: "Users" },
    { key: "products",  icon: "📦", label: "Products" },
    { key: "orders",    icon: "🛒", label: "Orders" },
    { key: "payments",  icon: "💳", label: "Payments" },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-110px)] max-w-7xl flex-col gap-0 px-4 py-8 lg:flex-row lg:gap-8">
      <aside className="mb-6 flex flex-col gap-3 lg:mb-0 lg:w-56 lg:flex-shrink-0">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-2xl font-black text-orange-600 dark:bg-orange-900/30">
            {username[0]?.toUpperCase()}
          </div>
          <p className="font-bold text-gray-900 dark:text-gray-100">{username}</p>
          <span className="mt-1 inline-block rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">Admin</span>
        </div>
        <nav className="flex flex-row gap-2 lg:flex-col">
          {NAV.map(({ key, icon, label }) => (
            <motion.button key={key} whileTap={{ scale: 0.97 }} onClick={() => setTab(key)}
              className={`flex flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                tab === key ? "bg-orange-500 text-white shadow" : "border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              }`}>
              <span>{icon}</span>{label}
            </motion.button>
          ))}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { clearTokens(); router.push("/"); }}
            className="flex flex-1 items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition dark:border-red-900/30 dark:bg-gray-900">
            <span>🚪</span>Logout
          </motion.button>
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {tab === "overview"  && <AdminOverview />}
            {tab === "users"     && <AdminUsers />}
            {tab === "products"  && <AdminProducts />}
            {tab === "orders"    && <AdminOrders />}
            {tab === "payments"  && <AdminPayments />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
