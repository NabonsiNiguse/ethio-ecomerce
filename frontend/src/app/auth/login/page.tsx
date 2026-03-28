"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { setTokens, getUserFromToken } from "@/lib/auth";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!identifier.trim()) {
      e.identifier = mode === "phone" ? "Phone number is required." : "Email is required.";
    }
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "At least 6 characters.";
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});

    const payload =
      mode === "phone"
        ? { phone_number: identifier.trim(), password }
        : { email: identifier.trim(), password };

    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/login", payload);
      setTokens(data.access, data.refresh);
      toast.success(`Welcome back, ${data.user?.username || ""}!`);
      // Read role from both user object and JWT token for reliability
      const role = data.user?.role || getUserFromToken(data.access)?.role;
      if (role === "seller") router.push("/seller/dashboard");
      else if (role === "admin") router.push("/admin/dashboard");
      else router.push("/");
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { detail?: string; phone_number?: string; password?: string; email?: string } } })?.response;
      if (res?.status === 403) {
        toast.error("Please verify your phone first.");
        router.push(`/auth/verify-otp?phone=${encodeURIComponent(identifier)}`);
        return;
      }
      const msg =
        res?.data?.detail ||
        res?.data?.phone_number ||
        res?.data?.email ||
        res?.data?.password ||
        "Invalid credentials.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
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
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white shadow-lg shadow-brand-600/25">
              🇪🇹
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
          </div>

          {/* Mode toggle */}
          <div className="mb-5 flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
            {(["phone", "email"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setIdentifier(""); setErrors({}); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {m === "phone" ? "📱 Phone" : "✉️ Email"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Identifier field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === "phone" ? "Phone Number" : "Email Address"}
              </label>
              <input
                type={mode === "phone" ? "tel" : "email"}
                placeholder={mode === "phone" ? "0912345678" : "you@example.com"}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete={mode === "phone" ? "tel" : "email"}
                className={`rounded-xl border px-4 py-2.5 text-sm outline-none transition bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                  errors.identifier
                    ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.identifier && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.identifier}</p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                    errors.password
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Sign in
            </Button>
          </form>

          {/* Quick credentials hint */}
          <div className="mt-5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Test accounts</p>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Buyer:</span>{" "}
                <button type="button" onClick={() => { setMode("phone"); setIdentifier("0911000001"); setPassword("@pawli5372"); }}
                  className="text-brand-600 hover:underline dark:text-brand-400">0911000001</button>
                {" / "}@pawli5372
              </p>
              <p>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Seller:</span>{" "}
                <button type="button" onClick={() => { setMode("phone"); setIdentifier("0911000002"); setPassword("@bonsi5372"); }}
                  className="text-brand-600 hover:underline dark:text-brand-400">0911000002</button>
                {" / "}@bonsi5372
              </p>
              <p className="text-[10px] text-gray-400">Click phone number to auto-fill</p>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-500">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
