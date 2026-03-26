"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import Button from "@/components/ui/Button";

interface SellerOrderItem { id: number; product_name: string; quantity: number; unit_price: string; line_total: string; }
interface SellerOrder {
  id: number; status: string; total_price: string; buyer: string; buyer_phone: string;
  shipping_city: string; shipping_address: string; items: SellerOrderItem[]; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  paid:      "bg-blue-100 text-blue-700",
  shipped:   "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const NEXT_STATUS: Record<string, string[]> = {
  paid:      ["shipped"],
  shipped:   ["delivered"],
  delivered: [],
  cancelled: [],
  pending:   [],
};

export default function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    api.get<SellerOrder[]>(`/api/seller/orders${params}`)
      .then(r => setOrders(r.data))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.put(`/api/seller/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const FILTERS = ["all", "paid", "shipped", "delivered", "cancelled"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Incoming Orders</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === f ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl">🛒</span>
          <p className="font-semibold text-gray-500">No orders yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order, i) => {
            const isExpanded = expanded === order.id;
            const nextStatuses = NEXT_STATUS[order.status] ?? [];
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">Order #{order.id}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()} · {order.buyer} · {order.shipping_city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-black text-brand-600">${Number(order.total_price).toFixed(2)}</span>
                    <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-50 dark:border-gray-800">
                      <div className="px-5 py-4 space-y-3">
                        {/* Items */}
                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.product_name} × {item.quantity}</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">${Number(item.line_total).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {/* Buyer info */}
                        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800">
                          <p className="font-semibold text-gray-800 dark:text-gray-100">{order.buyer}</p>
                          {order.buyer_phone && <p className="text-gray-500">{order.buyer_phone}</p>}
                          {order.shipping_address && <p className="text-gray-500">{order.shipping_address}, {order.shipping_city}</p>}
                        </div>
                        {/* Status actions */}
                        {nextStatuses.length > 0 && (
                          <div className="flex gap-2">
                            {nextStatuses.map(ns => (
                              <Button key={ns} size="sm" loading={updating === order.id}
                                onClick={() => updateStatus(order.id, ns)}
                                className="bg-brand-600 text-white hover:bg-brand-700 capitalize">
                                Mark as {ns}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
