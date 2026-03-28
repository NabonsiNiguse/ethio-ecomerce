"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface SellerOrderItem { id: number; product_name: string; quantity: number; unit_price: string; line_total: string; }
interface SellerOrder {
  id: number; status: string; total_price: string; buyer: string; buyer_phone: string;
  shipping_city: string; shipping_address: string; items: SellerOrderItem[]; created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
  pending:   { label: "Pending",   pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid:      { label: "Paid",      pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  shipped:   { label: "Shipped",   pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  delivered: { label: "Delivered", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", pill: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

const NEXT_STATUS: Record<string, string> = { paid: "shipped", shipped: "delivered" };
const FILTERS = ["all", "paid", "shipped", "delivered", "cancelled"];

export default function SellerOrders() {
  const [orders, setOrders]     = useState<SellerOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Incoming Orders</h2>
          <p className="text-xs text-gray-400">{orders.length} order{orders.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${filter === f ? "text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
              style={filter === f ? { background: "linear-gradient(135deg, #0a2540, #2b5f8a)" } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-sm dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: "linear-gradient(135deg, #0a2540, #2b5f8a)" }}>🛒</div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300">No orders yet</p>
            <p className="mt-1 text-sm text-gray-400">Orders appear here once customers purchase your products</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
          <div className="hidden border-b border-gray-50 px-5 py-3 dark:border-gray-800 sm:grid"
            style={{ gridTemplateColumns: "1fr auto auto auto auto", gap: "1rem" }}>
            {["Order", "Buyer", "Status", "Total", "Action"].map(h => (
              <span key={h} className={`text-xs font-semibold uppercase tracking-wider text-gray-400 ${h === "Total" || h === "Action" ? "text-right" : ""}`}>{h}</span>
            ))}
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {orders.map((order, i) => {
              const isExpanded = expanded === order.id;
              const nextStatus = NEXT_STATUS[order.status];
              const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, pill: "bg-gray-100 text-gray-600" };

              return (
                <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className={i % 2 === 1 ? "bg-gray-50/40 dark:bg-gray-800/20" : ""}>
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:grid sm:items-center"
                    style={{ gridTemplateColumns: "1fr auto auto auto auto", gap: "1rem" }}>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">#{order.id}</p>
                      <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{order.buyer}</p>
                      <p className="text-[10px] text-gray-400">{order.shipping_city}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.pill}`}>{cfg.label}</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 sm:text-right">
                      {Number(order.total_price).toLocaleString()} ETB
                    </span>
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      {nextStatus && (
                        <button disabled={updating === order.id} onClick={() => updateStatus(order.id, nextStatus)}
                          className="rounded-full px-3 py-1 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
                          {updating === order.id ? "…" : `→ ${nextStatus}`}
                        </button>
                      )}
                      <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition dark:bg-gray-800">
                        <svg className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-gray-50 dark:border-gray-800">
                        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Items</p>
                            <div className="space-y-1.5">
                              {order.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                                  <span className="text-gray-700 dark:text-gray-300">{item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">{Number(item.line_total).toLocaleString()} ETB</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Buyer Info</p>
                            <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm dark:bg-gray-800">
                              <p className="font-semibold text-gray-800 dark:text-gray-100">{order.buyer}</p>
                              {order.buyer_phone && <p className="text-gray-500">{order.buyer_phone}</p>}
                              {order.shipping_address && <p className="mt-1 text-gray-500">{order.shipping_address}, {order.shipping_city}</p>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
