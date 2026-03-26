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

type Role = "customer" | "seller";

interface FormErrors {
  username?: string; phone_number?: string; email?: string;
  password?: string; confirmPassword?: string;
}

function validate(username: string, phone: string, email: string, password: string, confirm: string): FormErrors {
  const e: FormErrors = {};
  if (!username) e.username = "Username is required.";
  if (!phone) e.phone_number = "Phone number is required.";
  if (!email) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email.";
  if (!password) e.password = "Password is required.";
  else if (password.length < 8) e.password = "At least 8 characters.";
  if (password !== confirm) e.confirmPassword = "Passwords do not match.";
  return e;
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState({ username: "", phone_number: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(form.username, form.phone_number, form.email, form.password, form.confirmPassword);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/register", {
        username: form.username, phone_number: form.phone_number,
        email: form.email, password: form.password, role,
      });
      setTokens(data.access, data.refresh);
      toast.success(`Welcome to Ethio eCommerce 🇪🇹`);
      router.push(role === "seller" ? "/seller/dashboard" : "/");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      toast.error(data ? Object.values(data).flat().join(" ") : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create account</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Join Ethiopia's marketplace</p>
          </div>

          {/* Role selector */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {(["customer", "seller"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                  role === r
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                }`}
              >
                <span className="text-xl">{r === "customer" ? "🛍️" : "🏪"}</span>
                {r === "customer" ? "Buyer" : "Seller"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input label="Username" placeholder="johndoe" value={form.username} onChange={set("username")} error={errors.username} />
            <Input label="Phone Number" type="tel" placeholder="0912345678" value={form.phone_number} onChange={set("phone_number")} error={errors.phone_number} />
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} error={errors.email} />
            <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} error={errors.password} />
            <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} />
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Create {role === "seller" ? "Seller" : ""} Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-500">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
