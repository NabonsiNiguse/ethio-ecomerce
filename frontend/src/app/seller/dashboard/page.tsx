"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isAuthenticated, getUserFromToken, getToken } from "@/lib/auth";
import { useUser } from "@/context/UserContext";
import api from "@/lib/axios";

// Dynamic imports using absolute paths to avoid TS language-server cache issues
const SellerOverview = dynamic<{ isPending?: boolean }>(
  () => import("@/app/seller/dashboard/SellerOverview"),
  { ssr: false }
);
const SellerProducts = dynamic<{ isPending?: boolean }>(
  () => import("@/app/seller/dashboard/SellerProducts"),
  { ssr: false }
);
const SellerOrders = dynamic<Record<string, never>>(
  () => import("@/app/seller/dashboard/SellerOrders"),
  { ssr: false }
);

type Tab = "overview" | "products" | "orders" | "settings" | "payouts";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IC = {
  Chart:  () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/></svg>,
  Box:    () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Bag:    () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Gear:   () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Dollar: () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Out:    () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Store:  () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Clock:  () => <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

const NAV: { key: Tab; Icon: () => JSX.Element; label: string }[] = [
  { key: "overview",  Icon: IC.Chart,  label: "Overview" },
  { key: "products",  Icon: IC.Box,    label: "My Products" },
  { key: "orders",    Icon: IC.Bag,    label: "Orders" },
  { key: "settings",  Icon: IC.Gear,   label: "Shop Settings" },
  { key: "payouts",   Icon: IC.Dollar, label: "Payouts" },
];

export default function SellerDashboard() {
  const router = useRouter();
  const { user, logout } = useUser();
  const [tab, setTab] = useState<Tab>("overview");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    const payload = getUserFromToken(getToken());
    if (payload?.role !== "seller") { router.push("/"); return; }
    setReady(true);
    api.get("/api/auth/seller/onboarding")
      .then(r => setProfile(r.data))
      .catch(() => {});
  }, [router]);

  if (!ready) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  );

  const isPending = profile && !profile.is_approved;
  const storeName = profile?.store_name || user.username || "My Store";
  const initial   = (storeName[0] ?? "S").toUpperCase();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-118px)] max-w-7xl flex-col gap-0 px-3 py-6 sm:px-6 lg:flex-row lg:gap-6">

      {/* ── Sidebar ── */}
      <aside className="mb-4 w-full lg:mb-0 lg:w-56 lg:flex-shrink-0">
        {/* Store card */}
        <div className="mb-3 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-xl font-black text-white shadow-lg shadow-orange-500/25">
              {initial}
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-full">{storeName}</p>
            <p className="mt-0.5 text-xs text-gray-400 truncate max-w-full">{user.username}</p>
            <div className="mt-2">
              {isPending ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <IC.Clock /> Under Review
                </span>
              ) : profile ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  ✓ Approved
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
          {NAV.map(({ key, Icon, label }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(key)}
              className={`flex flex-1 min-w-[80px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:min-w-0 ${
                tab === key
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20"
                  : "border border-gray-100 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
              }`}
            >
              <Icon />
              <span className="hidden sm:block lg:block">{label}</span>
            </motion.button>
          ))}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { logout(); router.push("/"); }}
            className="flex flex-1 min-w-[80px] items-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition dark:border-red-900/30 dark:bg-gray-900 dark:hover:bg-red-900/20 lg:min-w-0"
          >
            <IC.Out />
            <span className="hidden sm:block lg:block">Logout</span>
          </motion.button>
        </nav>

        {/* View store link */}
        {profile?.store_name && (
          <Link
            href={`/store/${profile.store_name.toLowerCase().replace(/\s+/g, "-")}`}
            className="mt-3 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition dark:border-orange-800/50 dark:bg-orange-900/10 dark:text-orange-400"
          >
            <IC.Store /> View My Store
          </Link>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0">
        {/* Pending banner */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-5 dark:border-yellow-800/50 dark:from-yellow-900/20 dark:to-amber-900/20"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-xl dark:bg-yellow-900/30">⏳</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-yellow-800 dark:text-yellow-300">Application Under Review</p>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                    Our team is reviewing your application. Usually takes 1–2 business days.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {["✓ Account created", "✓ Phone verified", "✓ Info submitted", "⏳ Admin review"].map(s => (
                      <span key={s} className={`rounded-full px-3 py-1 font-semibold ${
                        s.startsWith("✓")
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "overview" && <SellerOverview isPending={isPending} />}
            {tab === "products" && <SellerProducts isPending={isPending} />}
            {tab === "orders"   && <SellerOrders />}
            {tab === "settings" && <ShopSettings profile={profile} />}
            {tab === "payouts"  && <Payouts profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Shop Settings ─────────────────────────────────────────────────────────────
function ShopSettings({ profile }: { profile: any }) {
  const rows = [
    { label: "Store Name",      value: profile?.store_name },
    { label: "City",            value: profile?.business_city },
    { label: "Region",          value: profile?.business_region },
    { label: "Country",         value: profile?.business_country },
    { label: "License No.",     value: profile?.business_license_number || "—" },
    { label: "Document Type",   value: profile?.document_type || "—" },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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

// ── Payouts ───────────────────────────────────────────────────────────────────
function Payouts({ profile }: { profile: any }) {
  const rows = [
    { label: "Bank Name",       value: profile?.bank_name },
    { label: "Account Holder",  value: profile?.bank_account_holder },
    { label: "Account Number",  value: profile?.bank_account_number ? `****${String(profile.bank_account_number).slice(-4)}` : "—" },
    { label: "Mobile Money",    value: profile?.mobile_money_number || "—" },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-gray-100">Payout Information</h2>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{value || "—"}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-orange-50 p-4 text-sm text-orange-700 dark:bg-orange-900/10 dark:text-orange-400">
        💡 Payouts processed every Monday. Minimum payout: 500 ETB.
      </div>
    </div>
  );
}
