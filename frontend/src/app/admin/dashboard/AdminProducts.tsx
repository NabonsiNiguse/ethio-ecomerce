"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface AdminProduct {
  id: number; name: string; price: string; stock: number;
  seller: string; category: string; image: string | null; created_at: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    api.get<AdminProduct[]>(`/api/admin/products${params}`)
      .then(r => setProducts(r.data))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this product from the platform?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/admin/products/${id}`);
      toast.success("Product removed");
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Product Moderation</h2>
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          {products.length} products
        </span>
      </div>

      <input type="text" placeholder="Search by name or seller..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-orange-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["Product", "Seller", "Category", "Price", "Stock", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {products.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <span>🛍️</span>}
                        </div>
                        <p className="max-w-[160px] truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.seller}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 font-semibold text-brand-600">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${p.stock <= 5 ? "text-red-500" : "text-green-600"}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50 dark:bg-red-900/20">
                        {deleting === p.id ? "..." : "Remove"}
                      </button>
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
