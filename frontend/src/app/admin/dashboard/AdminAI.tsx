"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";

interface Alert {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  user_email: string | null;
  count: number;
  created_at: string;
}

interface Report {
  period_days: number;
  revenue: number;
  revenue_growth: number;
  total_orders: number;
  order_growth: number;
  new_users: number;
  user_growth: number;
  top_categories: { product__category__name: string; revenue: string; units: number }[];
  insights: string[];
  generated_at: string;
}

const SEVERITY_STYLES = {
  high:   "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400",
  low:    "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
};

const SEVERITY_ICONS = { high: "🚨", medium: "⚠️", low: "ℹ️" };

function GrowthBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
      positive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
               : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    }`}>
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function AdminAI() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.get("/api/ai/fraud-alerts")
      .then(r => setAlerts(r.data.alerts || []))
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));
  }, []);

  useEffect(() => {
    setLoadingReport(true);
    api.get(`/api/ai/report?days=${days}`)
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoadingReport(false));
  }, [days]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">🤖</div>
          <div>
            <h2 className="text-xl font-black">AI Intelligence Center</h2>
            <p className="text-sm text-white/70">Fraud detection, analytics & AI-generated insights</p>
          </div>
        </div>
      </div>

      {/* AI Report */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">AI Analytics Report</h3>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loadingReport ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-5">
              {[
                { label: "Revenue (ETB)", value: report.revenue.toLocaleString(), growth: report.revenue_growth, icon: "💰" },
                { label: "Total Orders",  value: report.total_orders,             growth: report.order_growth,   icon: "📦" },
                { label: "New Users",     value: report.new_users,                growth: report.user_growth,    icon: "👥" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{s.value}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <GrowthBadge value={s.growth} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Top categories */}
            {report.top_categories.length > 0 && (
              <div className="mb-5">
                <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Categories by Revenue</p>
                <div className="space-y-2">
                  {report.top_categories.map((cat, i) => {
                    const maxRev = Number(report.top_categories[0]?.revenue || 1);
                    const pct = (Number(cat.revenue) / maxRev) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-28 truncate text-xs text-gray-600 dark:text-gray-400">{cat.product__category__name || "Unknown"}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">
                          {Number(cat.revenue).toLocaleString()} ETB
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {report.insights.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">🤖 AI Insights</p>
                <div className="space-y-2">
                  {report.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 dark:bg-violet-900/20">
                      <span className="text-violet-500 mt-0.5">✦</span>
                      <p className="text-sm text-violet-800 dark:text-violet-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Failed to load report.</p>
        )}
      </div>

      {/* Fraud Alerts */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Fraud & Suspicious Activity</h3>
          {!loadingAlerts && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              alerts.length > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            }`}>
              {alerts.length > 0 ? `${alerts.length} alerts` : "All clear"}
            </span>
          )}
        </div>

        {loadingAlerts ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No suspicious activity detected</p>
            <p className="text-xs text-gray-400 mt-1">Platform is operating normally</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 rounded-xl border p-4 ${SEVERITY_STYLES[alert.severity]}`}>
                <span className="text-lg flex-shrink-0">{SEVERITY_ICONS[alert.severity]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{alert.message}</p>
                  {alert.user_email && (
                    <p className="text-xs mt-0.5 opacity-70">User: {alert.user_email}</p>
                  )}
                  <p className="text-xs mt-0.5 opacity-60">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  alert.severity === "high" ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                  : alert.severity === "medium" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                  : "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                }`}>
                  {alert.severity}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
