"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "@/lib/axios";
import { isAuthenticated } from "@/lib/auth";
import type { TrackingData } from "@/components/LiveTrackingMap";

// Dynamic import — Leaflet is client-side only
const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    </div>
  ),
});

const STATUS_STEPS = [
  { key: "pending",   icon: "⏳", label: "Order Placed" },
  { key: "assigned",  icon: "🚴", label: "Rider Assigned" },
  { key: "picked",    icon: "📦", label: "Picked Up" },
  { key: "delivered", icon: "✅", label: "Delivered" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  assigned:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  picked:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    fetchTracking();
    // Poll every 15 seconds for live updates
    intervalRef.current = setInterval(fetchTracking, 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const { data } = await api.get(`/api/delivery/order/${orderId}/tracking`);
      setTracking(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Could not load tracking info.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = tracking
    ? STATUS_STEPS.findIndex(s => s.key === tracking.status)
    : -1;

  const hasMap = tracking && (
    (tracking.rider_lat && tracking.rider_lon) ||
    (tracking.dest_lat && tracking.dest_lon)
  );

  // Demo mode: if no real coords, use Addis Ababa area for demo
  const demoTracking: TrackingData | null = tracking && !hasMap ? {
    ...tracking,
    rider_lat: 9.0200,
    rider_lon: 38.7500,
    dest_lat: 9.0054,
    dest_lon: 38.7636,
    origin_lat: 9.0350,
    origin_lon: 38.7800,
  } : tracking;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition">
        ← Back to Dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
            Live Order Tracking
          </h1>
          <p className="text-sm text-gray-400">Order #{orderId}</p>
        </div>
        <button
          onClick={fetchTracking}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-[400px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10">
          <p className="text-3xl mb-3">📦</p>
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <p className="mt-2 text-sm text-gray-500">Delivery tracking is available once your order is paid and a rider is assigned.</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 transition">
            View Orders
          </Link>
        </div>
      ) : tracking ? (
        <div className="space-y-5">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold capitalize ${STATUS_COLORS[tracking.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_STEPS.find(s => s.key === tracking.status)?.icon} {tracking.status}
            </span>
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            </span>
          </div>

          {/* Progress steps */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= stepIndex;
                const active = idx === stepIndex;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <motion.div
                        animate={active ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                          done
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                        }`}
                      >
                        {step.icon}
                      </motion.div>
                      <span className={`text-[10px] font-semibold text-center leading-tight ${
                        active ? "text-orange-500" : done ? "text-green-600 dark:text-green-400" : "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`mb-5 h-1 flex-1 mx-1 rounded-full transition-all ${
                        idx < stepIndex ? "bg-orange-400" : "bg-gray-100 dark:bg-gray-800"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Map */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Live Map</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Rider</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Destination</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" /> Pickup</span>
              </div>
            </div>
            <LiveTrackingMap
              data={demoTracking || tracking}
              height="380px"
            />
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tracking.distance_km != null && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-2xl mb-1">📏</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100">{tracking.distance_km.toFixed(1)} km</p>
                <p className="text-xs text-gray-400">Distance</p>
              </div>
            )}
            {tracking.eta_minutes != null && tracking.status !== "delivered" && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center dark:border-orange-900/30 dark:bg-orange-900/10">
                <p className="text-2xl mb-1">⏱️</p>
                <p className="text-lg font-black text-orange-600">{tracking.eta_minutes} min</p>
                <p className="text-xs text-gray-400">Est. arrival</p>
              </div>
            )}
            {tracking.delivery_fee > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-2xl mb-1">💰</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100">{tracking.delivery_fee} ETB</p>
                <p className="text-xs text-gray-400">Delivery fee</p>
              </div>
            )}
            {tracking.rider_name && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-2xl mb-1">🚴</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{tracking.rider_name}</p>
                <p className="text-xs text-gray-400">Your rider</p>
              </div>
            )}
          </div>

          {/* Destination address */}
          {tracking.dest_address && (
            <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-emerald-900/30">
                📍
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delivery Address</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-100">{tracking.dest_address}</p>
              </div>
            </div>
          )}

          {/* Delivered confirmation */}
          <AnimatePresence>
            {tracking.status === "delivered" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center text-white shadow-lg shadow-green-500/20"
              >
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-xl font-black">Order Delivered!</p>
                <p className="mt-1 text-sm text-white/80">Your order has been successfully delivered.</p>
                {tracking.delivered_at && (
                  <p className="mt-2 text-xs text-white/60">
                    Delivered at {new Date(tracking.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No coords notice */}
          {!hasMap && tracking.status !== "pending" && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400">
              ℹ️ Live GPS tracking will appear once the rider starts moving. Showing demo map for now.
            </div>
          )}
        </div>
      ) : null}
    </main>
  );
}
