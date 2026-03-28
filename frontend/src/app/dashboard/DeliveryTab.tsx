"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "@/lib/axios";
import { Order, Delivery } from "@/types";
import Card from "@/components/ui/Card";
import type { TrackingData } from "@/components/LiveTrackingMap";

const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  ),
});

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  assigned:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  picked:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳", assigned: "🚴", picked: "📦", delivered: "✅",
};

const STEPS = ["pending", "assigned", "picked", "delivered"];

export default function DeliveryTab({ orders }: { orders: Order[] }) {
  const [deliveries, setDeliveries] = useState<Record<number, Delivery>>({});
  const [trackingData, setTrackingData] = useState<Record<number, TrackingData>>({});
  const [expandedMap, setExpandedMap] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paid = orders.filter(o => o.status !== "pending" && o.status !== "cancelled");
    if (!paid.length) { setLoading(false); return; }
    Promise.all(
      paid.map(o =>
        api.get<Delivery>(`/api/delivery/order/${o.id}`)
          .then(r => ({ id: o.id, data: r.data }))
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<number, Delivery> = {};
      results.forEach(r => { if (r) map[r.id] = r.data; });
      setDeliveries(map);
    }).finally(() => setLoading(false));
  }, [orders]);

  const fetchTracking = async (orderId: number) => {
    try {
      const { data } = await api.get<TrackingData>(`/api/delivery/order/${orderId}/tracking`);
      setTrackingData(prev => ({ ...prev, [orderId]: data }));
    } catch { /* silent */ }
  };

  const toggleMap = (orderId: number) => {
    if (expandedMap === orderId) { setExpandedMap(null); return; }
    setExpandedMap(orderId);
    fetchTracking(orderId);
  };

  const activeOrders = orders.filter(o => o.status !== "pending" && o.status !== "cancelled");

  if (!activeOrders.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-16 text-center">
        <span className="text-5xl">🚚</span>
        <p className="font-semibold text-gray-600 dark:text-gray-400">No active deliveries</p>
        <p className="text-sm text-gray-400">Deliveries appear here once your order is paid.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Deliveries</h2>
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          {activeOrders.length} active
        </span>
      </div>

      {activeOrders.map((order, i) => {
        const delivery = deliveries[order.id];
        const stepIdx = delivery ? STEPS.indexOf(delivery.status) : -1;
        const isOpen = expandedMap === order.id;
        const td = trackingData[order.id];

        // Build map data — use real coords if available, else Addis Ababa demo
        const mapData: TrackingData | null = delivery ? {
          rider_lat:       td?.rider_lat       ?? (delivery.status !== "pending" ? 9.0200 : null),
          rider_lon:       td?.rider_lon       ?? (delivery.status !== "pending" ? 38.7500 : null),
          rider_name:      td?.rider_name      ?? null,
          dest_lat:        (delivery as any).buyer_lat  ?? td?.dest_lat  ?? 9.0054,
          dest_lon:        (delivery as any).buyer_lon  ?? td?.dest_lon  ?? 38.7636,
          dest_address:    delivery.shipping_address || td?.dest_address || null,
          origin_lat:      (delivery as any).seller_lat ?? td?.origin_lat ?? 9.0350,
          origin_lon:      (delivery as any).seller_lon ?? td?.origin_lon ?? 38.7800,
          distance_km:     delivery.distance_km,
          eta_minutes:     td?.eta_minutes ?? null,
          status:          delivery.status,
          rider_updated_at: td?.rider_updated_at ?? null,
        } : null;

        return (
          <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="overflow-hidden p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                {delivery ? (
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[delivery.status] ?? ""}`}>
                    {STATUS_ICONS[delivery.status]} {delivery.status}
                  </span>
                ) : loading ? (
                  <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800">No delivery info</span>
                )}
              </div>

              {delivery && (
                <div className="px-5 py-4 space-y-4">
                  {/* Progress */}
                  <div className="flex items-center">
                    {STEPS.map((s, idx) => {
                      const done = idx <= stepIdx;
                      const active = idx === stepIdx;
                      return (
                        <div key={s} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <motion.div
                              animate={active ? { scale: [1, 1.12, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${done ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}
                            >
                              {done ? STATUS_ICONS[s] : idx + 1}
                            </motion.div>
                            <span className={`text-[9px] font-semibold capitalize ${active ? "text-orange-500" : done ? "text-green-500" : "text-gray-400"}`}>
                              {s}
                            </span>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div className={`mb-4 h-0.5 flex-1 mx-1 rounded-full ${idx < stepIdx ? "bg-orange-400" : "bg-gray-100 dark:bg-gray-800"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap gap-2">
                    {delivery.distance_km != null && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        📏 {delivery.distance_km.toFixed(1)} km
                      </span>
                    )}
                    {delivery.delivery_fee > 0 && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        💰 {delivery.delivery_fee} ETB
                      </span>
                    )}
                    {td?.eta_minutes != null && delivery.status !== "delivered" && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        ⏱ ~{td.eta_minutes} min
                      </span>
                    )}
                  </div>

                  {/* Map + Track buttons */}
                  {delivery.status !== "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleMap(order.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                          isOpen
                            ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        🗺️ {isOpen ? "Hide Map" : "Show Map"}
                      </button>
                      <Link
                        href={`/track/${order.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition dark:border-orange-800 dark:bg-orange-900/10 dark:text-orange-400"
                      >
                        📡 Live Track
                      </Link>
                    </div>
                  )}

                  {/* Inline map */}
                  <AnimatePresence>
                    {isOpen && mapData && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Live Tracking</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                              <span>🟠 Rider</span>
                              <span>🟢 Destination</span>
                              <span>🟣 Pickup</span>
                            </div>
                          </div>
                          <LiveTrackingMap data={mapData} height="280px" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* OTP notice */}
                  {(delivery.status === "assigned" || delivery.status === "picked") && !delivery.otp_verified && (
                    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-4 dark:bg-orange-900/10 dark:border-orange-800">
                      <p className="mb-1 text-sm font-bold text-orange-700 dark:text-orange-400">🔐 Delivery OTP</p>
                      <p className="text-xs text-gray-500">Share this code with the rider when they arrive to confirm delivery.</p>
                    </div>
                  )}

                  {delivery.otp_verified && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/10">
                      <span className="text-xl">✅</span>
                      <div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">Delivery Confirmed</p>
                        <p className="text-xs text-gray-500">OTP verified — your order has been delivered.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
