"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface AdminOrder {
  id: number; buyer: string; status: string; total_price: string;
  items_count: number; shipping_city: string; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", paid: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    api.get<AdminOrder[]>(`/api/admin/orders${params}`)
      .then(r => setOrders(r.data))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await api.patch(`/api/admin/orders/${id}`, { status });
      toast.success("Order updated");
      load();
    } catch { toast.error("Update failed"); }
    finally { setUpdating(null); }
  };

  const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">All Orders</h2>
        <div className="flex flex-wrap gap-2">
          {["all", ...STATUSES].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["Order", "Buyer", "Items", "Total", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {orders.map((o, i) => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">#{o.id}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.buyer}</td>
                    <td className="px-4 py-3 text-gray-500">{o.items_count}</td>
                    <td className="px-4 py-3 font-bold text-orange-500">${Number(o.total_price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[o.status] ?? ""}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                        disabled={updating === o.id}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
