"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { isAuthenticated } from "@/lib/auth";

export default function CartPage() {
  const router = useRouter();
  const { cart, loading, removeItem, refresh } = useCart();
  const [removing, setRemoving] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [authed, setAuthed] = useState(true); // optimistic: assume authed to avoid flash

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  const handleRemove = async (productId: number) => {
    setRemoving(productId);
    try {
      await removeItem(productId);
      toast.success("Item removed.");
    } catch {
      toast.error("Failed to remove item.");
    } finally {
      setRemoving(null);
    }
  };

  const handleUpdateQty = async (productId: number, delta: number, currentQty: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) { handleRemove(productId); return; }
    setUpdating(productId);
    try {
      if (delta > 0) {
        await api.post("/api/cart/add", { product_id: productId, quantity: 1 });
      } else {
        // Remove and re-add with new qty
        await api.delete("/api/cart/remove", { data: { product_id: productId } });
        if (newQty > 0) {
          await api.post("/api/cart/add", { product_id: productId, quantity: newQty });
        }
      }
      await refresh();
    } catch {
      toast.error("Failed to update quantity.");
    } finally {
      setUpdating(null);
    }
  };

  const items = cart?.items ?? [];
  const total = Number(cart?.total_price ?? 0);
  const totalETB = (total * 55).toFixed(2);

  if (loading) return <CartSkeleton />;

  if (!authed) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl">🔒</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sign in to view your cart</h2>
          <p className="text-gray-500">Your cart items are saved when you're logged in.</p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/auth/login")}>Sign In</Button>
            <Button variant="secondary" onClick={() => router.push("/products")}>Browse Products</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
          🛒 My Cart
          {items.length > 0 && (
            <span className="ml-2 rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              {items.length}
            </span>
          )}
        </h1>
        <Link href="/products" className="text-sm font-semibold text-orange-500 hover:underline">
          ← Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-24 text-center"
        >
          <span className="text-6xl">🛒</span>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Your cart is empty</h2>
          <p className="text-gray-400">Add some products to get started!</p>
          <Link href="/products">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">Browse Products</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Items list ── */}
          <div className="flex-1 min-w-0 space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="flex items-center gap-4 p-4">
                    {/* Product image placeholder */}
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl dark:bg-gray-800 overflow-hidden">
                      🛍️
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.product.id}`}>
                        <p className="truncate font-bold text-gray-900 dark:text-gray-100 hover:text-orange-500 transition">
                          {item.product.name}
                        </p>
                      </Link>
                      <p className="text-sm text-gray-400 mt-0.5">
                        ${Number(item.product.price).toFixed(2)} each
                      </p>

                      {/* Qty controls */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, -1, item.quantity)}
                          disabled={updating === item.product.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                          {updating === item.product.id ? "..." : item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, 1, item.quantity)}
                          disabled={updating === item.product.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Price + remove */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-lg font-black text-orange-500">
                        ${Number(item.line_total).toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleRemove(item.product.id)}
                        disabled={removing === item.product.id}
                        className="text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-50 transition"
                      >
                        {removing === item.product.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Order summary ── */}
          <div className="lg:sticky lg:top-24 w-full lg:w-80 flex-shrink-0">
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-gray-900 dark:text-gray-100">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-black text-orange-500">{totalETB} ETB</p>
                    <p className="text-xs text-gray-400">${total.toFixed(2)} USD</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push("/checkout")}
                size="lg"
                className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
              >
                Proceed to Checkout →
              </Button>

              <p className="mt-3 text-center text-xs text-gray-400">
                🔒 Secure checkout via Chapa
              </p>
            </Card>

            {/* Accepted payments */}
            <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-2 text-xs font-semibold text-gray-400 text-center">Accepted Payments</p>
              <div className="flex flex-wrap justify-center gap-1">
                {["Telebirr", "CBE Birr", "Awash Bank", "Visa", "Mastercard"].map((m) => (
                  <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CartSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-80 rounded-2xl" />
      </div>
    </main>
  );
}
