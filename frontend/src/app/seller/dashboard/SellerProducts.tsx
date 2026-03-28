"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { Product } from "@/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AISellerSuggestions from "@/components/AISellerSuggestions";

interface Category { id: number; name: string; }
interface ProductForm {
  name: string; description: string; price: string;
  stock: string; category_id: string; image_urls: string;
}
const EMPTY: ProductForm = { name: "", description: "", price: "", stock: "", category_id: "", image_urls: "" };

export default function SellerProducts({ isPending }: { isPending?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<Product[]>("/api/seller/products"),
      api.get<Category[]>("/api/seller/categories"),
    ]).then(([p, c]) => { setProducts(p.data); setCategories(c.data); })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, price: String(p.price),
      stock: String(p.stock), category_id: String(p.category?.id ?? ""),
      image_urls: p.images?.map(i => i.image_url).join("\n") ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock || !form.category_id) {
      toast.error("Fill in all required fields"); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name, description: form.description,
        price: form.price, stock: parseInt(form.stock),
        category_id: parseInt(form.category_id),
        image_urls: form.image_urls.split("\n").map(s => s.trim()).filter(Boolean),
      };
      if (editing) {
        await api.put(`/api/seller/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/api/seller/products", payload);
        toast.success("Product created");
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/seller/products/${id}`);
      toast.success("Product deleted");
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  };

  const set = (k: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Products</h2>
          <p className="text-xs text-gray-400">{products.length} total · {lowStockCount} low stock · {outOfStockCount} out of stock</p>
        </div>
        {isPending ? (
          <div className="flex items-center gap-2 rounded-xl bg-yellow-100 px-4 py-2 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            ⏳ Pending approval — products locked
          </div>
        ) : (
          <button onClick={openCreate}
            className="rounded-full px-5 py-2 text-sm font-bold text-white shadow-md transition hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
            + Add Product
          </button>
        )}
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              ⚠️ {lowStockCount} product{lowStockCount > 1 ? "s" : ""} running low on stock
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
              🚫 {outOfStockCount} product{outOfStockCount > 1 ? "s" : ""} out of stock
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-sm dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: "linear-gradient(135deg, #0a2540, #2b5f8a)" }}>
            {search ? "🔍" : "📦"}
          </div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300">
              {search ? "No products match your search" : "No products yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {search ? "Try a different keyword" : "Add your first product to start selling"}
            </p>
          </div>
          {!search && (
            <button onClick={openCreate}
              className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
              + Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {p.images?.[0]?.image_url
                    ? <img src={p.images[0].image_url} alt={p.name} className="h-full w-full object-cover" />
                    : <span className="text-2xl">🛍️</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category?.name}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-600">{Number(p.price).toLocaleString()} ETB</span>
                    <span className={`text-xs font-semibold ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-orange-500" : "text-emerald-600"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(p)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition dark:bg-gray-800 dark:text-gray-300">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50 dark:bg-red-900/20">
                    {deleting === p.id ? "…" : "Delete"}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Product" : "New Product"}>
        <div className="flex flex-col gap-3 max-h-[75vh] overflow-y-auto pr-1">
          {/* AI Suggestions */}
          <AISellerSuggestions
            name={form.name}
            description={form.description}
            category={categories.find(c => String(c.id) === form.category_id)?.name}
            onApply={(field, value) => {
              if (field === "name") setForm(f => ({ ...f, name: value }));
              if (field === "price") setForm(f => ({ ...f, price: value }));
              if (field === "category") {
                const cat = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
                if (cat) setForm(f => ({ ...f, category_id: String(cat.id) }));
              }
            }}
          />

          <Input label="Product Name *" value={form.name} onChange={set("name")} placeholder="e.g. Wireless Headphones" />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Description</label>
            <textarea rows={3} value={form.description} onChange={set("description")}
              placeholder="Describe your product..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (ETB) *" type="number" step="0.01" value={form.price} onChange={set("price")} placeholder="0.00" />
            <Input label="Stock *" type="number" value={form.stock} onChange={set("stock")} placeholder="0" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Category *</label>
            <select value={form.category_id} onChange={set("category_id")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Image URLs (one per line)</label>
            <textarea rows={3} value={form.image_urls} onChange={set("image_urls")}
              placeholder="https://example.com/image1.jpg"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <button onClick={handleSave} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0f4c5f, #1b7b5e)" }}>
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
              {editing ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
