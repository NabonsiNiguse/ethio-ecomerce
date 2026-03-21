"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { setTokens } from "@/lib/auth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface FormErrors { phone_number?: string; password?: string }

function validate(phone: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!phone) errors.phone_number = "Phone number is required.";
  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "At least 6 characters.";
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(phone, password);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});

    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/login", {
        phone_number: phone,
        password,
      });
      setTokens(data.access, data.refresh);
      toast.success("Welcome back!");
      router.push("/products");
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      const msg = response?.data?.detail ?? "Invalid credentials.";
      // Backend returns 403 when OTP not yet verified
      if (response?.status === 403) {
        toast.error("Please verify your phone first.");
        router.push(`/auth/verify-otp?phone=${encodeURIComponent(phone)}`);
        return;
      }
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
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone_number}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-brand-600 hover:underline dark:text-brand-500"
            >
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
