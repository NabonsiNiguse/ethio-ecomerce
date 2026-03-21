"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Image from "next/image";

interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const STEP_LABELS = ["Cart", "Shipping", "Payment"];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  const [addr, setAddr] = useState<ShippingAddress>({
    full_name: "", phone: "", address_line1: "", address_line2: "",
    city: "", state: "", postal_code: "", country: "Ethiopia",
  });

  const items = cart?.items ?? [];
  const total = Number(cart?.total_price ?? 0);
  const totalETB = (total * 55).toFixed(2); // rough USD→ETB for display

  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addr.full_name || !addr.phone || !addr.address_line1 || !addr.city) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep("payment");
  };

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);

      // 1. Create order
      const { data: orderData } = await api.post("/api/orders/checkout", {
        shipping_address: addr,
      });
      const orderId = orderData.order.id;

      // 2. Initiate Chapa payment — get checkout_url
      const { data: paymentData } = await api.post("/api/payments/initiate", {
        order_id: orderId,
      });

      await refresh();

      const checkoutUrl: string = paymentData.checkout_url;

      if (checkoutUrl && checkoutUrl.startsWith("http")) {
        toast.success("Redirecting to Chapa payment...");
        // Redirect to Chapa hosted checkout
        window.location.href = checkoutUrl;
      } else {
        // Simulation mode — auto-verify
        toast.success("Processing payment (simulation)...");
        await api.post("/api/payments/verify", {
          transaction_id: paymentData.transaction_id,
        });
        await refresh();
        toast.success("Payment successful! Order placed.");
        router.push(`/dashboard`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? "Checkout failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl">🛒</span>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Your cart is empty</p>
          <Button onClick={() => router.push("/products")}>Browse Products</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-black text-gray-900 dark:text-gray-100">Checkout</h1>
      <p className="mb-8 text-sm text-gray-500">Secure checkout powered by Chapa 🇪🇹</p>

      {/* Progress steps */}
      <div className="mb-10 flex items-center justify-center gap-0">
        {STEP_LABELS.map((label, i) => {
          const done = (i === 0) || (i === 1 && step === "payment");
          const active = (i === 1 && step === "shipping") || (i === 2 && step === "payment");
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                  done ? "bg-green-500 text-white" : active ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? "text-orange-500" : done ? "text-green-500" : "text-gray-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`mx-2 mb-5 h-0.5 w-16 sm:w-24 ${done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Main form ── */}
        <div className="flex-1 min-w-0">
          {step === "shipping" && (
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="p-6">
                <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">📍 Shipping Address</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Full Name *" value={addr.full_name} onChange={set("full_name")} placeholder="Abebe Kebede" required />
                    <Input label="Phone Number *" type="tel" value={addr.phone} onChange={set("phone")} placeholder="0912345678" required />
                  </div>
                  <Input label="Address Line 1 *" value={addr.address_line1} onChange={set("address_line1")} placeholder="Bole Road, House No. 123" required />
                  <Input label="Address Line 2" value={addr.address_line2} onChange={set("address_line2")} placeholder="Apartment, floor, etc." />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input label="City *" value={addr.city} onChange={set("city")} placeholder="Addis Ababa" required />
                    <Input label="Region" value={addr.state} onChange={set("state")} placeholder="Oromia" />
                    <Input label="Postal Code" value={addr.postal_code} onChange={set("postal_code")} placeholder="1000" />
                  </div>
                  <Input label="Country *" value={addr.country} onChange={set("country")} required />
                  <Button type="submit" size="lg" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    Continue to Payment →
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="p-6">
                <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">💳 Payment Method</h2>

                {/* Shipping summary */}
                <div className="mb-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Shipping to</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{addr.full_name}</p>
                      <p className="text-sm text-gray-500">{addr.phone}</p>
                      <p className="text-sm text-gray-500">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                      <p className="text-sm text-gray-500">{addr.city}{addr.state ? `, ${addr.state}` : ""} — {addr.country}</p>
                    </div>
                    <button onClick={() => setStep("shipping")} className="text-xs font-semibold text-orange-500 hover:underline">
                      Edit
                    </button>
                  </div>
                </div>

                {/* Chapa payment option */}
                <div className="mb-6 rounded-xl border-2 border-orange-400 bg-orange-50 p-5 dark:bg-orange-900/10">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-3xl shadow">
                      💳
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-gray-100">Pay with Chapa</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Telebirr, CBE Birr, bank transfer & more
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {["Telebirr", "CBE Birr", "Awash Bank", "Dashen Bank", "Visa/MC"].map((m) => (
                          <span key={m} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 rounded-full border-2 border-orange-500 bg-orange-500 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount display */}
                <div className="mb-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount to pay</p>
                  <p className="text-3xl font-black text-orange-500">{totalETB} ETB</p>
                  <p className="text-xs text-gray-400 mt-1">(≈ ${total.toFixed(2)} USD)</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep("shipping")} className="flex-1">
                    ← Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    loading={loading}
                    size="lg"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    {loading ? "Processing..." : "Place Order & Pay with Chapa"}
                  </Button>
                </div>

                <p className="mt-4 text-center text-xs text-gray-400">
                  🔒 Secured by Chapa · Your payment info is encrypted
                </p>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ── Order summary sidebar ── */}
        <div className="lg:sticky lg:top-24 w-full lg:w-80 flex-shrink-0">
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold text-gray-800 dark:text-gray-100">Order Summary</h2>
            <div className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-lg">
                    🛍️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.product.name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
                    ${Number(item.line_total).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal ({items.length} items)</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Shipping</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
                <div className="text-right">
                  <p className="font-black text-orange-500 text-lg">{totalETB} ETB</p>
                  <p className="text-xs text-gray-400">${total.toFixed(2)} USD</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Security badges */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>🔒 SSL Secured</span>
            <span>🇪🇹 Chapa</span>
            <span>✅ Safe Checkout</span>
          </div>
        </div>
      </div>
    </main>
  );
}
