"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useCart();
  const txRef = searchParams.get("tx_ref") || searchParams.get("trx_ref");
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!txRef) { setStatus("failed"); return; }

    api.post("/api/payments/verify", { transaction_id: txRef })
      .then(({ data }) => {
        setStatus("success");
        setOrderId(data.payment?.order_id ?? null);
        refresh();
        toast.success("Payment confirmed!");
      })
      .catch(() => {
        setStatus("failed");
        toast.error("Could not verify payment.");
      });
  }, [txRef]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Verifying your payment...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <span className="text-6xl">❌</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Failed</h1>
        <p className="text-gray-500">Something went wrong. Please try again or contact support.</p>
        <Button onClick={() => router.push("/cart")}>Back to Cart</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl dark:bg-green-900/30"
      >
        ✅
      </motion.div>
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">Payment Successful!</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Your order has been placed and payment confirmed via Chapa.
        </p>
        {txRef && (
          <p className="mt-1 text-xs text-gray-400">Transaction: {txRef}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dashboard">
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
            View My Orders
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="secondary" size="lg">Continue Shopping</Button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
