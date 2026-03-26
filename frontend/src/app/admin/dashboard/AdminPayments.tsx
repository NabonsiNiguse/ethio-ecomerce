"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface AdminPayment {
  id: number; user: string; order_id: number; amount: string;
  status: string; transaction_id: string; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid:    "bg-green-100 text-green-700",
  failed:  "bg-red-100 text-red-600",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminPayment[]>("/api/admin/payments")
      .then(r => setPayments(r.data))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const total = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Payment Transactions</h2>
        <div className="rounded-xl bg-green-50 px-4 py-2 dark:bg-green-900/20">
          <p className="text-xs text-gray-400">Total Collected</p>
          <p className="text-lg font-black text-green-600">${total.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["#", "User", "Order", "Amount", "Status", "Tx ID", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {payments.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 text-gray-400">{p.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.user}</td>
                    <td className="px-4 py-3 text-gray-500">#{p.order_id}</td>
                    <td className="px-4 py-3 font-bold text-green-600">${Number(p.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate">{p.transaction_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
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
