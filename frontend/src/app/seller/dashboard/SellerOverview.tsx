"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/axios";

interface Analytics {
  total_orders: number; paid_orders: number; total_revenue: string;
  total_products: number; low_stock_count: number;
  monthly_revenue: { month: string; revenue: string; orders: number }[];
  top_products: { product__name: string; revenue: string; units: number }[];
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${up ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
      {up ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

function BarChart({ data }: { data: { month: string; revenue: string; orders: number }[] }) {
  const max = Math.max(...data.map(d => Number(d.revenue)), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const pct = (Number(d.revenue) / max) * 100;
        return (
          <div key={d.month} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full">
              <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                <div className="rounded-lg bg-[#0a2540] px-2.5 py-1.5 text-[10px] text-white whitespace-nowrap shadow-xl">
                  <p className="font-bold">{Number(d.revenue).toLocaleString()} ETB</p>
                  <p className="opacity-70">{d.orders} orders</p>
                </div>
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 4)}%` }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
                className="w-full rounded-t-lg"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: "linear-gradient(to top, #0f4c5f, #1b7b5e)",
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400 whitespace-nowrap">{d.month.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SellerOverview({ isPending, onAddProduct }: { isPending?: boolean; onAddProduct?: () => void }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/api/seller/analytics")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <OverviewSkeleton />;

  // Empty state
  if (!data || (data.total_orders === 0 && data.total_products === 0)) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white py-16 text-center shadow-sm dark:bg-gray-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
          style={{ background: "linear-gradient(135deg, #0a2540, #2b5f8a)" }}>
          🏪
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your store is ready!</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            You haven't made any sales yet. Add your first product and start selling to customers across Ethiopia.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onAddProduct}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
            + Add First Product
          </button>
          <Link href="/products" className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const revenue = Number(data.total_revenue);
  const revenueNums = data.monthly_revenue.map(m => Number(m.revenue));

  const STATS = [
    {
      label: "Total Revenue",
      value: `${revenue.toLocaleString()}`,
      unit: "ETB",
      sub: `${data.paid_orders} paid orders`,
      trend: 12,
      icon: "💰",
      gradient: "linear-gradient(135deg, #0f4c5f, #1b7b5e)",
      shadow: "shadow-emerald-500/20",
    },
    {
      label: "Total Orders",
      value: String(data.total_orders),
      unit: "",
      sub: `${data.paid_orders} completed`,
      trend: 8,
      icon: "🛒",
      gradient: "linear-gradient(135deg, #0a2540, #2b5f8a)",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Products",
      value: String(data.total_products),
      unit: "",
      sub: data.low_stock_count > 0 ? `⚠️ ${data.low_stock_count} low stock` : "All stocked ✓",
      trend: 0,
      icon: "📦",
      gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      shadow: "shadow-violet-500/20",
    },
    {
      label: "Store Rating",
      value: "4.8",
      unit: "★",
      sub: "24 reviews",
      trend: 2,
      icon: "⭐",
      gradient: "linear-gradient(135deg, #d97706, #f59e0b)",
      shadow: "shadow-amber-500/20",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`group relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${s.shadow} transition-transform hover:-translate-y-1`}
            style={{ background: s.gradient }}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-2xl">{s.icon}</span>
                <TrendBadge value={s.trend} />
              </div>
              <p className="mt-3 text-2xl font-black leading-none">
                {s.value}<span className="text-sm font-semibold opacity-80 ml-0.5">{s.unit}</span>
              </p>
              <p className="mt-1 text-xs font-semibold opacity-90">{s.label}</p>
              <p className="mt-0.5 text-[10px] opacity-60">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart + top products */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Bar chart — wider */}
        <div className="lg:col-span-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Monthly Revenue</h3>
              <p className="text-xs text-gray-400">Last 6 months · ETB</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
              {revenueNums.length} months
            </span>
          </div>
          {data.monthly_revenue.length > 0 ? (
            <BarChart data={data.monthly_revenue} />
          ) : (
            <div className="flex h-32 items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-1">📊</p>
                <p className="text-xs">No revenue data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Store rating card */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Store Rating</h3>
          <div className="flex flex-col items-center gap-3">
            <p className="text-5xl font-black text-gray-900 dark:text-gray-100">4.8</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className={`h-5 w-5 ${i <= 4 ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-gray-400">Based on 24 reviews</p>
            <div className="w-full space-y-1.5">
              {[5,4,3,2,1].map(star => {
                const counts: Record<number, number> = { 5: 14, 4: 7, 3: 2, 2: 1, 1: 0 };
                const pct = (counts[star] / 24) * 100;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-gray-500">{star}</span>
                    <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-4 text-gray-400">{counts[star]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top products table */}
      {data.top_products.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Top Products by Revenue</h3>
            <span className="text-xs text-gray-400">{data.top_products.length} products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Product</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Revenue</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Units</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((p, i) => {
                  const maxRev = Number(data.top_products[0]?.revenue ?? 1);
                  const pct = (Number(p.revenue) / maxRev) * 100;
                  return (
                    <tr key={i} className={`border-b border-gray-50 transition hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-50/30 dark:bg-gray-800/20"}`}>
                      <td className="px-5 py-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white"
                          style={{ background: "linear-gradient(135deg, #0a2540, #2b5f8a)" }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{p.product__name}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(p.revenue).toLocaleString()} ETB
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">{p.units}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.6 }}
                              className="h-full rounded-full" style={{ background: "linear-gradient(to right, #0f4c5f, #1b7b5e)" }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low stock alerts */}
      {data.low_stock_count > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/50 dark:bg-orange-900/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-800 dark:text-orange-300">
                {data.low_stock_count} product{data.low_stock_count > 1 ? "s" : ""} running low on stock
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Restock soon to avoid losing sales</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="lg:col-span-2 h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
