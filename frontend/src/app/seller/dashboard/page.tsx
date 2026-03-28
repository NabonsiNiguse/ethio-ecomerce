"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isAuthenticated, getUserFromToken, getToken } from "@/lib/auth";
import { useUser } from "@/context/UserContext";
import api from "@/lib/axios";

const SellerOverview = dynamic<{ isPending?: boolean; onAddProduct?: () => void }>(() => import("@/app/seller/dashboard/SellerOverview"), { ssr: false });
const SellerProducts = dynamic<{ isPending?: boolean }>(() => import("@/app/seller/dashboard/SellerProducts"), { ssr: false });
const SellerOrders   = dynamic<Record<string, never>>(() => import("@/app/seller/dashboard/SellerOrders"),   { ssr: false });

type Tab = "overview" | "products" | "orders" | "settings" | "payouts";

const NAV: { key: Tab; emoji: string; label: string }[] = [
  { key: "overview",  emoji: "📊", label: "Overview"      },
  { key: "products",  emoji: "📦", label: "Products"      },
  { key: "orders",    emoji: "🛒", label: "Orders"        },
  { key: "settings",  emoji: "⚙️", label: "Shop Settings" },
  { key: "payouts",   emoji: "💳", label: "Payouts"       },
];

export default function SellerDashboard() {
  const router = useRouter();
  const { user, logout } = useUser();
  const [tab, setTab]       = useState<Tab>("overview");
  const [ready, setReady]   = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    const payload = getUserFromToken(getToken());
    if (payload?.role !== "seller") { router.push("/"); return; }
    setReady(true);
    api.get("/api/auth/seller/onboarding").then(r => setProfile(r.data)).catch(() => {});
  }, [router]);

  if (!ready) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2b5f8a] border-t-transparent" />
    </div>
  );

  const isPending = profile && !profile.is_approved;
  const storeName = profile?.store_name || user.username || "My Store";
  const initial   = (storeName[0] ?? "S").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-[#0d1117]">
      {/* ── Brand header bar ── */}
      <div className="sticky top-[var(--header-h,118px)] z-30 w-full shadow-md"
        style={{ background: "linear-gradient(135deg, #0a2540 0%, #1a4a7a 60%, #2b5f8a 100%)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-base font-black text-white backdrop-blur-sm">
              {initial}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{storeName}</p>
              <p className="text-[10px] text-white/60">Seller Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300 backdrop-blur-sm">
                ⏳ Under Review
              </span>
            ) : profile ? (
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
                ✓ Approved
              </span>
            ) : null}
            {profile?.store_name && (
              <Link href={`/store/${profile.store_name.toLowerCase().replace(/\s+/g, "-")}`}
                className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition sm:block">
                🏪 View Store
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-0 px-3 py-5 sm:px-6 lg:flex-row lg:gap-5">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:flex lg:w-52 lg:flex-shrink-0 lg:flex-col lg:gap-2">
          {/* Store card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
            <div className="h-14" style={{ background: "linear-gradient(135deg, #0a2540, #2b5f8a)" }} />
            <div className="px-4 pb-4">
              <div className="-mt-6 mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-3 border-white bg-gradient-to-br from-[#0f4c5f] to-[#1b7b5e] text-base font-black text-white shadow-lg dark:border-gray-900">
                {initial}
              </div>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{storeName}</p>
              <p className="truncate text-xs text-gray-400">{user.username}</p>
              {/* Star rating */}
              <div className="mt-2 flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className={`h-3 w-3 ${i <= 4 ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">4.8</span>
                <span className="text-[10px] text-gray-400">(24)</span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 rounded-2xl bg-white p-2 shadow-sm dark:bg-gray-900">
            {NAV.map(({ key, emoji, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                  tab === key
                    ? "bg-gradient-to-r from-[#0a2540]/10 to-[#2b5f8a]/10 text-[#0a2540] dark:from-[#2b5f8a]/20 dark:to-[#2b5f8a]/10 dark:text-[#7ab8e8]"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}>
                {tab === key && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2b5f8a]" />
                )}
                <span className="text-base">{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
            <button onClick={() => { logout(); router.push("/"); }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition dark:hover:bg-red-900/20">
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">
          {/* Pending banner */}
          <AnimatePresence>
            {isPending && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-4 overflow-hidden rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4 dark:border-yellow-800/50 dark:from-yellow-900/20 dark:to-amber-900/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-lg dark:bg-yellow-900/30">⏳</div>
                  <div className="flex-1">
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">Application Under Review</p>
                    <p className="mt-0.5 text-sm text-yellow-700 dark:text-yellow-400">Our team is reviewing your application. Usually 1–2 business days.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {["✓ Account created", "✓ Phone verified", "✓ Info submitted", "⏳ Admin review"].map(s => (
                        <span key={s} className={`rounded-full px-2.5 py-0.5 font-semibold ${s.startsWith("✓") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.14 }}>
              {tab === "overview"  && <SellerOverview isPending={isPending} onAddProduct={() => setTab("products")} />}
              {tab === "products"  && <SellerProducts isPending={isPending} />}
              {tab === "orders"    && <SellerOrders />}
              {tab === "settings"  && <ShopSettings profile={profile} />}
              {tab === "payouts"   && <Payouts profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        {NAV.map(({ key, emoji, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
              tab === key ? "text-[#2b5f8a] dark:text-[#7ab8e8]" : "text-gray-400 hover:text-gray-600"
            }`}>
            <span className="text-lg leading-none">{emoji}</span>
            <span className="leading-tight">{label.split(" ")[0]}</span>
            {tab === key && <span className="mt-0.5 h-0.5 w-4 rounded-full bg-[#2b5f8a]" />}
          </button>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}

function ShopSettings({ profile }: { profile: any }) {
  const rows = [
    { label: "Store Name",    value: profile?.store_name },
    { label: "City",          value: profile?.business_city },
    { label: "Region",        value: profile?.business_region },
    { label: "Country",       value: profile?.business_country },
    { label: "License No.",   value: profile?.business_license_number || "—" },
    { label: "Document Type", value: profile?.document_type || "—" },
  ];
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
      <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-gray-100">Shop Settings</h2>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Payouts({ profile }: { profile: any }) {
  const rows = [
    { label: "Bank Name",      value: profile?.bank_name },
    { label: "Account Holder", value: profile?.bank_account_holder },
    { label: "Account Number", value: profile?.bank_account_number ? `****${String(profile.bank_account_number).slice(-4)}` : "—" },
    { label: "Mobile Money",   value: profile?.mobile_money_number || "—" },
  ];
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
      <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-gray-100">Payout Information</h2>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{value || "—"}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-[#0a2540]/5 p-4 text-sm text-[#0a2540] dark:bg-[#2b5f8a]/10 dark:text-[#7ab8e8]">
        💡 Payouts processed every Monday. Minimum payout: 500 ETB.
      </div>
    </div>
  );
}
