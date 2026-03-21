"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { setTokens } from "@/lib/auth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function VerifyOTPPage() {
  const router = useRouter();
  const params = useSearchParams();
  // phone is passed as query param from register page
  const phoneFromQuery = params.get("phone") ?? "";

  const [phone, setPhone] = useState(phoneFromQuery);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || otp.length !== 6) {
      toast.error("Enter your phone number and the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/verify-otp", {
        phone_number: phone,
        otp_code: otp,
      });
      // Backend returns tokens on successful OTP verification
      if (data.access) {
        setTokens(data.access, data.refresh);
        toast.success("Phone verified! Welcome.");
        router.push("/products");
      } else {
        toast.success("Verified! Please sign in.");
        router.push("/auth/login");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })
        ?.response?.data;
      const msg = data
        ? Object.values(data).flat().join(" ")
        : "Invalid or expired OTP.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Verify your phone
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-digit code sent to your phone
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="OTP Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Verify
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Already verified?{" "}
            <Link href="/auth/login"
              className="font-semibold text-brand-600 hover:underline dark:text-brand-500">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
