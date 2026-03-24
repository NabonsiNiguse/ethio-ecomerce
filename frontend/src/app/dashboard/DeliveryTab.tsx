"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { Order, Delivery } from "@/types";
import Card from "@/components/ui/Card";

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  assigned:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  picked:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const DELIVERY_STATUS_ICONS: Record<string, string> = {
  pending: "⏳", assigned: "🚴", picked: "📦", delivered: "✅",
};

const STEPS = ["pending", "assigned", "picked", "delivered"];

interface OrderWithDelivery extends Order {
  delivery?: Delivery;
}

export default function DeliveryTab({ orders }: { orders: Order[] }) {
  const [deliveries, setDeliveries] = useState<Record<number, Delivery>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paidOrders = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
    if (paidOrders.length === 0) { setLoading(false); return; }

    Promise.all(
      paidOrders.map((o) =>
        api.get<Delivery>(`/api/delivery/order/${o.id}`).then((r) => ({ id: o.id, data: r.data })).catch(() => null)
      )
    ).then((results) => {
      const map: Record<number, Delivery> = {};
      results.forEach((r) => { if (r) map[r.id] = r.data; });
      setDeliveries(map);
    }).finally(() => setLoading(false));
  }, [orders]);

  const activeOrders = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");

  if (activeOrders.length === 0) {
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
        const stepIndex = delivery ? STEPS.indexOf(delivery.status) : -1;

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="overflow-hidden p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                {delivery ? (
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${DELIVERY_STATUS_STYLES[delivery.status] ?? ""}`}>
                    {DELIVERY_STATUS_ICONS[delivery.status]} {delivery.status}
                  </span>
                ) : loading ? (
                  <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800">No delivery info</span>
                )}
              </div>

              {delivery && (
                <div className="px-5 py-4 space-y-4">
                  {/* Progress bar */}
                  <div className="flex items-center gap-0">
                    {STEPS.map((s, idx) => {
                      const done = idx <= stepIndex;
                      const active = idx === stepIndex;
                      return (
                        <div key={s} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                              done ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                            }`}>
                              {done ? DELIVERY_STATUS_ICONS[s] : idx + 1}
                            </div>
                            <span className={`text-[10px] font-semibold capitalize ${active ? "text-orange-500" : done ? "text-green-500" : "text-gray-400"}`}>
                              {s}
                            </span>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div className={`mb-4 h-0.5 flex-1 mx-1 ${idx < stepIndex ? "bg-orange-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery details */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                    {delivery.distance_km != null && (
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <p className="text-xs text-gray-400">Distance</p>
                        <p className="font-bold text-gray-800 dark:text-gray-100">{delivery.distance_km.toFixed(1)} km</p>
                      </div>
                    )}
                    {delivery.delivery_fee > 0 && (
                      <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/10">
                        <p className="text-xs text-gray-400">Delivery Fee</p>
                        <p className="font-bold text-orange-500">{delivery.delivery_fee} ETB</p>
                      </div>
                    )}
                    {delivery.assigned_at && (
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <p className="text-xs text-gray-400">Assigned</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {new Date(delivery.assigned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                    {delivery.delivered_at && (
                      <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/10">
                        <p className="text-xs text-gray-400">Delivered</p>
                        <p className="text-xs font-semibold text-green-600">
                          {new Date(delivery.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OTP section — show when assigned/picked and not yet verified */}
                  {(delivery.status === "assigned" || delivery.status === "picked") && !delivery.otp_verified && (
                    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-4 dark:bg-orange-900/10 dark:border-orange-800">
                      <p className="mb-1 text-sm font-bold text-orange-700 dark:text-orange-400">🔐 Delivery OTP</p>
                      <p className="text-xs text-gray-500 mb-3">
                        Share this code with the rider when they arrive to confirm delivery.
                      </p>
                      <p className="text-xs text-gray-400">Your OTP code was sent to your phone. Check your SMS or contact support.</p>
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
