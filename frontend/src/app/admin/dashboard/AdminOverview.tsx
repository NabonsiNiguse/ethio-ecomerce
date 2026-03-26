"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";

interface Analytics {
  total_users: number; total_buyers: number; total_sellers: number;
  total_products: number; total_orders: number; total_revenue: string;
  orders_by_status: Record<string, number>;
  monthly: { month: string; orders: number; revenue: string }[];
  recent_orders: { id: number; buyer: string; status: string; total: string; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", paid: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function AdminOverview() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/api/admin/analytics")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}</div>;
  if (!data) return <p className="text-gray-400">Failed to load analytics.</p>;

  const stats = [
    { icon: "👥", label: "Total Users",    value: data.total_users,    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { icon: "🛍️", label: "Buyers",         value: data.total_buyers,   color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" },
    { icon: "🏪", label: "Sellers",        value: data.total_sellers,  color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
    { icon: "📦", label: "Products",       value: data.total_products, color: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
    { icon: "🛒", label: "Total Orders",   value: data.total_orders,   color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" },
    { icon: "💰", label: "Revenue (ETB)",  value: `${Number(data.total_revenue).toLocaleString()}`, color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white shadow">
        <p className="text-sm font-semibold opacity-80">Platform Control Panel</p>
        <h2 className="mt-1 text-2xl font-black">Admin Overview</h2>
        <p className="mt-1 text-sm opacity-70">Real-time platform metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-2 text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold opacity-70">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Orders by status */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Orders by Status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.orders_by_status).map(([s, count]) => (
            <div key={s} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}>
              <span className="capitalize">{s}</span>
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-black">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly chart */}
      {data.monthly.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Monthly Revenue (ETB)</h3>
          <div className="flex items-end gap-2 h-32">
            {data.monthly.map(m => {
              const max = Math.max(...data.monthly.map(x => Number(x.revenue)));
              const pct = max > 0 ? (Number(m.revenue) / max) * 100 : 0;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">{Number(m.revenue).toLocaleString()}</span>
                  <div className="w-full rounded-t-lg bg-orange-400 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Recent Orders</h3>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {data.recent_orders.map(o => (
            <div key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Order #{o.id} · {o.buyer}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</span>
                <span className="text-sm font-bold text-orange-500">${Number(o.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
