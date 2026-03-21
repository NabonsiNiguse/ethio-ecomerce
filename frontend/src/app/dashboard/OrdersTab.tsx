"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { Order } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳", paid: "✅", shipped: "🚚", delivered: "📦", cancelled: "❌",
};

export default function OrdersTab({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [paying, setPaying] = useState<number | null>(null);

  const handlePayNow = async (orderId: number) => {
    setPaying(orderId);
    try {
      const { data } = await api.post("/api/payments/initiate", { order_id: orderId });
      if (data.checkout_url && data.checkout_url.startsWith("http")) {
        window.location.href = data.checkout_url;
      } else {
        // Simulation
        await api.post("/api/payments/verify", { transaction_id: data.transaction_id });
        toast.success("Payment verified!");
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Payment failed");
    } finally {
      setPaying(null);
    }
  };

  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-16 text-center">
        <span className="text-5xl">📦</span>
        <p className="font-semibold text-gray-600 dark:text-gray-400">No orders yet</p>
        <Link href="/products" className="text-sm font-semibold text-orange-500 hover:underline">
          Start shopping →
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Order History</h2>
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {orders.map((order, i) => {
        const isExpanded = expanded === order.id;
        const hasShipping = order.shipping_full_name || order.shipping_address_line1;
        const isPending = order.status === "pending";

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="overflow-hidden p-0">
              {/* Order header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 px-5 py-4 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_ICONS[order.status]} {order.status}
                  </span>
                  <span className="text-sm font-black text-orange-500">
                    ${Number(order.total_price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50 px-5 dark:divide-gray-800">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-base dark:bg-gray-800">
                        🛍️
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{item.product.name}</p>
                        <p className="text-xs text-gray-400">${Number(item.unit_price).toFixed(2)} × {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      ${Number(item.line_total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-50 px-5 py-3 dark:border-gray-800">
                <div className="flex gap-2">
                  {hasShipping && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className="text-xs font-semibold text-orange-500 hover:underline"
                    >
                      {isExpanded ? "Hide" : "Show"} shipping info
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isPending && (
                    <Button
                      size="sm"
                      loading={paying === order.id}
                      onClick={() => handlePayNow(order.id)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                    >
                      💳 Pay Now with Chapa
                    </Button>
                  )}
                  <p className="text-sm font-black text-orange-500">
                    Total: ${Number(order.total_price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Shipping details */}
              <AnimatePresence>
                {isExpanded && hasShipping && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-50 dark:border-gray-800"
                  >
                    <div className="bg-gray-50 px-5 py-4 dark:bg-gray-800/50">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">📍 Shipping Address</p>
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                        <p className="font-semibold">{order.shipping_full_name}</p>
                        {order.shipping_phone && <p>{order.shipping_phone}</p>}
                        <p>{order.shipping_address_line1}</p>
                        {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                        <p>
                          {order.shipping_city}
                          {order.shipping_state && `, ${order.shipping_state}`}
                          {order.shipping_postal_code && ` ${order.shipping_postal_code}`}
                        </p>
                        <p>{order.shipping_country}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
