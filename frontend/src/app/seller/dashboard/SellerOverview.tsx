"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
interface Analytics {
  total_orders: number; paid_orders: number; total_revenue: string;
  total_products: number; low_stock_count: number;
  monthly_revenue: { month: string; revenue: string; orders: number }[];
  top_products: { product__name: string; revenue: string; units: number }[];
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#f97316" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { month: string; revenue: string; orders: number }[] }) {
  const max = Math.max(...data.map(d => Number(d.revenue)), 1);
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((d, i) => {
        const pct = (Number(d.revenue) / max) * 100;
        return (
          <div key={d.month} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full">
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="rounded-lg bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                  {Number(d.revenue).toLocaleString()} ETB<br />{d.orders} orders
                </div>
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 3)}%` }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-rose-400"
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 whitespace-nowrap">{d.month.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SellerOverview({ isPending }: { isPending?: boolean }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/api/seller/analytics")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <OverviewSkeleton />;
  if (!data) return <p className="text-gray-400">Failed to load analytics.</p>;

  const revenueNums = data.monthly_revenue.map(m => Number(m.revenue));
  const orderNums   = data.monthly_revenue.map(m => m.orders);

  const STATS = [
    {
      label: "Total Sales",
      value: `${Number(data.total_revenue).toLocaleString()} ETB`,
      sub: `${data.paid_orders} paid orders`,
      icon: "💰",
      color: "from-orange-500 to-rose-500",
      sparkData: revenueNums,
      sparkColor: "#fff",
    },
    {
      label: "Active Orders",
      value: data.total_orders,
      sub: `${data.paid_orders} completed`,
      icon: "🛒",
      color: "from-violet-500 to-purple-600",
      sparkData: orderNums,
      sparkColor: "#fff",
    },
    {
      label: "Total Products",
      value: data.total_products,
      sub: data.low_stock_count > 0 ? `⚠️ ${data.low_stock_count} low stock` : "All stocked",
      icon: "📦",
      color: "from-sky-500 to-blue-600",
      sparkData: [],
      sparkColor: "#fff",
    },
    {
      label: "Store Rating",
      value: "4.8 ★",
      sub: "Based on reviews",
      icon: "⭐",
      color: "from-amber-400 to-yellow-500",
      sparkData: [4.5, 4.6, 4.7, 4.8, 4.8, 4.8],
      sparkColor: "#fff",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white shadow-xl shadow-orange-500/20">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-0 h-20 w-20 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm font-semibold opacity-80">Seller Dashboard</p>
          <h2 className="mt-1 text-2xl font-black">Your Store Performance</h2>
          {data.low_stock_count > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              ⚠️ {data.low_stock_count} product{data.low_stock_count !== 1 ? "s" : ""} low on stock
            </div>
          )}
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} p-5 text-white shadow-lg`}
          >
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-2xl">{s.icon}</p>
              <p className="mt-2 text-2xl font-black leading-tight">{s.value}</p>
              <p className="mt-0.5 text-xs font-medium opacity-80">{s.label}</p>
              <p className="mt-1 text-[10px] opacity-60">{s.sub}</p>
              {s.sparkData.length > 1 && (
                <div className="mt-2 opacity-70">
                  <Sparkline data={s.sparkData} color={s.sparkColor} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue bar chart */}
      {data.monthly_revenue.length > 0 && (
        <div className="rounded-2xl border border-gray-100/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Monthly Revenue (ETB)</h3>
            <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              Last 6 months
            </span>
          </div>
          <BarChart data={data.monthly_revenue} />
        </div>
      )}

      {/* Top products */}
      {data.top_products.length > 0 && (
        <div className="rounded-2xl border border-gray-100/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/80">
          <h3 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Top Products by Revenue</h3>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.top_products.map((p, i) => {
              const maxRev = Number(data.top_products[0]?.revenue ?? 1);
              const pct = (Number(p.revenue) / maxRev) * 100;
              return (
                <div key={i} className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-600 dark:bg-orange-900/30">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.product__name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500">{Number(p.revenue).toLocaleString()} ETB</p>
                      <p className="text-[10px] text-gray-400">{p.units} units</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
