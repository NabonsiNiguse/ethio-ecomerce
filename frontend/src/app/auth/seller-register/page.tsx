"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/axios";
import { setTokens } from "@/lib/auth";
import { useUser } from "@/context/UserContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface S1 { fullName: string; phone: string; email: string; password: string; confirm: string; }
interface S2 { storeName: string; licenseNumber: string; city: string; region: string; country: string; }
interface S3 { documentType: "license" | "gov_id" | ""; filePreview: string; fileData: string; fileName: string; fileType: string; }
interface S4 { bankName: string; accountHolder: string; accountNumber: string; mobileMoney: string; }

const STEPS = [
  { num: 1, label: "Personal Info",   icon: "👤", sub: "Identity & phone verification" },
  { num: 2, label: "Business Info",   icon: "🏪", sub: "Store & address details" },
  { num: 3, label: "Documents",       icon: "📄", sub: "Upload ID or license" },
  { num: 4, label: "Bank & Payment",  icon: "💳", sub: "Payout information" },
];

const BANKS = [
  "Commercial Bank of Ethiopia", "Awash Bank", "Dashen Bank",
  "Abyssinia Bank", "Nib Bank", "United Bank", "Wegagen Bank", "Other",
];

// ── Persist to sessionStorage ─────────────────────────────────────────────────
function usePersisted<T>(key: string, init: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return init;
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = useCallback((v: T) => {
    setVal(v);
    try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [val, set];
}

// ── OTP countdown ─────────────────────────────────────────────────────────────
function useCountdown(init = 0) {
  const [secs, setSecs] = useState(init);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  return { secs, start: (n: number) => setSecs(n), canResend: secs <= 0 };
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 backdrop-blur-sm focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition";
const lbl = "mb-1.5 block text-xs font-semibold text-white/70";

// ── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase",     ok: /[A-Z]/.test(password) },
    { label: "Number",        ok: /\d/.test(password) },
    { label: "Symbol",        ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-white/20"}`} />
        ))}
        <span className="ml-2 text-[10px] font-semibold text-white/60">{labels[score]}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label} className={`text-[10px] font-medium ${c.ok ? "text-green-400" : "text-white/40"}`}>
            {c.ok ? "✓" : "○"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Step header ───────────────────────────────────────────────────────────────
function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-0.5 text-sm text-white/50">{sub}</p>
    </div>
  );
}

// ── Nav buttons ───────────────────────────────────────────────────────────────
function NavButtons({ onBack, onNext, nextLabel, loading, isLast, disabled }: {
  onBack?: () => void; onNext: () => void; nextLabel: string; loading?: boolean; isLast?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-4">
      {onBack && (
        <button onClick={onBack}
          className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm">
          ← Back
        </button>
      )}
      <button onClick={onNext} disabled={loading || disabled}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition shadow-lg ${
          disabled
            ? "bg-white/10 text-white/30 cursor-not-allowed shadow-none"
            : isLast
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-green-500/30 disabled:opacity-50"
              : "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 shadow-orange-500/30 disabled:opacity-50"
        }`}>
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {nextLabel}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SellerRegisterPage() {
  const router = useRouter();
  const { refresh: refreshUser } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [s1, setS1] = usePersisted<S1>("sr_s1", { fullName: "", phone: "", email: "", password: "", confirm: "" });
  const [s2, setS2] = usePersisted<S2>("sr_s2", { storeName: "", licenseNumber: "", city: "", region: "", country: "Ethiopia" });
  const [s3, setS3] = usePersisted<S3>("sr_s3", { documentType: "", filePreview: "", fileData: "", fileName: "", fileType: "" });
  const [s4, setS4] = usePersisted<S4>("sr_s4", { bankName: "", accountHolder: "", accountNumber: "", mobileMoney: "" });

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const { secs, start: startCountdown, canResend } = useCountdown(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Register + OTP ────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!s1.fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!s1.phone.trim())    { toast.error("Enter your phone number"); return; }
    if (!s1.email.trim())    { toast.error("Enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email)) { toast.error("Enter a valid email address"); return; }
    if (s1.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (s1.password !== s1.confirm) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    try {
      // username is now auto-derived server-side — no need to send it
      const res = await api.post("/api/auth/seller/register", {
        full_name: s1.fullName,
        phone_number: s1.phone,
        email: s1.email,
        password: s1.password,
      });

      setOtpSent(true);
      startCountdown(60);
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
      toast.success(`OTP sent to ${s1.email}!`);
      if (res.data.dev_otp) toast(`🔑 OTP: ${res.data.dev_otp}`, { duration: 30000, icon: "📧" });
      if (res.data.email_error) toast.error(`Email error: ${res.data.email_error}`, { duration: 10000 });

    } catch (err: any) {
      const detail: string = err?.response?.data?.detail ?? "";

      // Already verified → just go to login
      if (
        detail.includes("Please sign in") ||
        detail.includes("Already verified") ||
        detail.includes("already verified")
      ) {
        toast.error("This email is already registered. Redirecting to sign in...", { duration: 3000 });
        setTimeout(() => router.push("/auth/login"), 2000);
        return;
      }

      // Unverified account exists → resend OTP
      if (detail.includes("already registered") || detail.includes("already taken")) {
        toast(`Account exists — resending OTP to ${s1.email}`, { icon: "ℹ️" });
        try {
          const res2 = await api.post("/api/auth/seller/send-otp", {
            email: s1.email,
            phone_number: s1.phone,
          });
          setOtpSent(true);
          startCountdown(60);
          if (res2.data.dev_otp) setDevOtp(res2.data.dev_otp);
          if (res2.data.dev_otp) toast(`🔑 OTP: ${res2.data.dev_otp}`, { duration: 30000, icon: "📧" });
        } catch (e2: any) {
          const e2detail: string = e2?.response?.data?.detail ?? "";
          if (e2detail.includes("Already verified") || e2detail.includes("already verified")) {
            toast.error("This email is already verified. Redirecting to sign in...", { duration: 3000 });
            setTimeout(() => router.push("/auth/login"), 2000);
          } else {
            toast.error(e2detail || "Failed to resend OTP");
          }
        }
        return;
      }

      toast.error(detail || "Registration failed. Check all fields and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await api.post("/api/auth/seller/send-otp", {
        phone_number: s1.phone,
        email: s1.email,
      });
      startCountdown(60);
      toast.success(`OTP resent to ${s1.email}!`);
      if (res.data.dev_otp) toast(`🔑 Dev OTP: ${res.data.dev_otp}`, { duration: 20000 });
    } catch (err: any) {
      const wait = err?.response?.data?.wait_seconds;
      toast.error(wait ? `Wait ${wait}s before resending` : (err?.response?.data?.detail ?? "Failed"));
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    setVerifying(true);
    try {
      const { data } = await api.post("/api/auth/seller/verify-otp", {
        email: s1.email,
        phone_number: s1.phone,
        otp_code: otpCode,
      });
      setTokens(data.access, data.refresh);
      refreshUser();
      setOtpVerified(true);
      toast.success("Email verified! ✓");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Invalid OTP");
    } finally { setVerifying(false); }
  };

  // ── Step 2: Business ──────────────────────────────────────────────────────
  const handleStep2 = async () => {
    if (!s2.storeName.trim()) { toast.error("Store name is required"); return; }
    if (!s2.city.trim())      { toast.error("City is required"); return; }
    setLoading(true);
    try {
      await api.put("/api/auth/seller/onboarding", {
        step: 2, store_name: s2.storeName, business_license_number: s2.licenseNumber,
        business_city: s2.city, business_region: s2.region, business_country: s2.country,
      });
      setStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Save failed");
    } finally { setLoading(false); }
  };

  // ── Step 3: Document upload ───────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
    if (!ALLOWED.includes(file.type)) { toast.error("Only JPG, PNG, or PDF allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1] ?? result;
      setS3({ ...s3, fileData: base64, filePreview: result, fileName: file.name, fileType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleStep3 = async () => {
    if (!s3.documentType) { toast.error("Select document type"); return; }
    if (!s3.fileData)     { toast.error("Upload a document"); return; }
    setLoading(true);
    try {
      const { data: up } = await api.post("/api/auth/seller/upload-document", {
        file_data: s3.fileData, file_name: s3.fileName, file_type: s3.fileType,
      });
      await api.put("/api/auth/seller/onboarding", { step: 3, document_url: up.url, document_type: s3.documentType });
      setStep(4);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Upload failed");
    } finally { setLoading(false); }
  };

  // ── Step 4: Bank + submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!s4.bankName)             { toast.error("Select your bank"); return; }
    if (!s4.accountHolder.trim()) { toast.error("Account holder name required"); return; }
    if (!s4.accountNumber.trim()) { toast.error("Account number required"); return; }
    setLoading(true);
    try {
      await api.put("/api/auth/seller/onboarding", {
        step: 4, bank_name: s4.bankName, bank_account_holder: s4.accountHolder,
        bank_account_number: s4.accountNumber, mobile_money_number: s4.mobileMoney,
      });
      ["sr_s1","sr_s2","sr_s3","sr_s4"].forEach(k => sessionStorage.removeItem(k));
      toast.success("Application submitted! Redirecting...");
      setTimeout(() => router.push("/seller/dashboard"), 1400);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Submission failed");
    } finally { setLoading(false); }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1e]">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[400px] w-[400px] rounded-full bg-rose-600/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[80px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🇪🇹</span>
          <div>
            <p className="text-[15px] font-black text-white leading-none">Ethio eCommerce</p>
            <p className="text-[10px] text-white/40 mt-0.5">Seller Registration</p>
          </div>
        </Link>
        <Link href="/auth/login" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm">
          Sign in instead
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">

        {/* Hero */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 text-4xl shadow-2xl shadow-orange-500/40"
          >
            🏪
          </motion.div>
          <h1 className="text-4xl font-black text-white">Become a Seller</h1>
          <p className="mt-2 text-white/50">Join Ethiopia's fastest-growing marketplace and reach millions of buyers</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
            {["✓ Free to join", "✓ Fast payouts", "✓ Dedicated support", "✓ Secure platform"].map(f => (
              <span key={f} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">{f}</span>
            ))}
          </div>
        </div>

        {/* Step progress */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            {STEPS.map(({ num, label, icon }) => {
              const done   = step > num;
              const active = step === num;
              return (
                <div key={num} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    animate={{ scale: active ? 1.15 : 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold transition-all ${
                      done   ? "bg-green-500 text-white shadow-lg shadow-green-500/40"
                             : active ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20"
                             : "bg-white/10 text-white/40 border border-white/10"
                    }`}
                  >
                    {done ? "✓" : icon}
                    {active && (
                      <span className="absolute -inset-1 rounded-2xl animate-ping bg-orange-500/20" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <p className={`hidden text-[11px] font-bold sm:block ${active ? "text-orange-400" : done ? "text-green-400" : "text-white/30"}`}>
                      {label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="relative h-1.5 rounded-full bg-white/10">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 shadow-sm shadow-orange-500/50"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/30">
            <span>{STEPS[step - 1]?.sub}</span>
            <span>Step {step} of {STEPS.length}</span>
          </div>
        </div>

        {/* Form card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl"
          >

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <StepHeader title="Personal Information" sub="Your identity and email verification" />

                <div>
                  <label className={lbl}>Full Name *</label>
                  <input className={inp} placeholder="Abebe Kebede" value={s1.fullName}
                    onChange={e => setS1({ ...s1, fullName: e.target.value })} />
                </div>

                <div>
                  <label className={lbl}>Email Address *</label>
                  <input className={inp} placeholder="you@example.com" type="email"
                    value={s1.email} onChange={e => setS1({ ...s1, email: e.target.value })}
                    disabled={otpSent} />
                  {otpSent && !otpVerified && (
                    <p className="mt-1 text-xs text-orange-400">OTP sent to this email — <button onClick={() => { setOtpSent(false); setOtpCode(""); }} className="underline">change email</button></p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Password *</label>
                    <input className={inp} placeholder="Min 8 chars" type="password"
                      value={s1.password} onChange={e => setS1({ ...s1, password: e.target.value })} />
                    <PasswordStrength password={s1.password} />
                  </div>
                  <div>
                    <label className={lbl}>Confirm Password *</label>
                    <input className={inp} placeholder="Repeat" type="password"
                      value={s1.confirm} onChange={e => setS1({ ...s1, confirm: e.target.value })} />
                    {s1.confirm && s1.password !== s1.confirm && (
                      <p className="mt-1.5 text-xs font-semibold text-red-400">Passwords don't match</p>
                    )}
                    {s1.confirm && s1.password === s1.confirm && s1.confirm.length >= 8 && (
                      <p className="mt-1.5 text-xs font-semibold text-green-400">✓ Passwords match</p>
                    )}
                  </div>
                </div>

                {/* Phone + Send OTP */}
                <div>
                  <label className={lbl}>Phone Number *</label>
                  <div className="flex gap-2">
                    <input className={`${inp} flex-1`} placeholder="0912345678" type="tel"
                      value={s1.phone} onChange={e => setS1({ ...s1, phone: e.target.value })}
                      disabled={otpVerified} />
                    {!otpVerified && (
                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="flex-shrink-0 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-50 transition shadow-lg shadow-orange-500/30"
                      >
                        {loading ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                        ) : otpSent ? "Resend" : "Send OTP"}
                      </button>
                    )}
                    {otpVerified && (
                      <span className="flex items-center gap-1.5 rounded-xl bg-green-500/20 border border-green-500/30 px-4 text-sm font-bold text-green-400">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* OTP input box */}
                <AnimatePresence>
                  {otpSent && !otpVerified && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
                        <p className="mb-1 text-sm font-bold text-orange-300">📧 OTP sent to {s1.email}</p>
                        <p className="mb-4 text-xs text-white/40">Enter the 6-digit code. Expires in 3 minutes.</p>

                        {/* 6 individual digit boxes */}
                        <div className="flex gap-2 justify-center mb-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <input
                              key={i}
                              type="text"
                              maxLength={1}
                              value={otpCode[i] ?? ""}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, "");
                                const arr = otpCode.split("");
                                arr[i] = val;
                                const next = arr.join("").slice(0, 6);
                                setOtpCode(next);
                                if (val && i < 5) {
                                  const nextInput = document.getElementById(`otp-${i + 1}`);
                                  nextInput?.focus();
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                                  document.getElementById(`otp-${i - 1}`)?.focus();
                                }
                              }}
                              id={`otp-${i}`}
                              className="h-12 w-12 rounded-xl border border-white/20 bg-white/10 text-center text-xl font-black text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition"
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-white/40">
                            {secs > 0 ? (
                              <span>Resend in <span className="font-bold text-orange-400">{secs}s</span></span>
                            ) : (
                              <button onClick={handleResendOtp} disabled={loading}
                                className="font-bold text-orange-400 hover:text-orange-300 transition disabled:opacity-40">
                                Resend OTP
                              </button>
                            )}
                          </div>
                          <button onClick={handleVerifyOtp} disabled={verifying || otpCode.length !== 6}
                            className="rounded-xl bg-green-500 px-5 py-2 text-sm font-bold text-white hover:bg-green-400 disabled:opacity-50 transition shadow-lg shadow-green-500/30">
                            {verifying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" /> : "Verify →"}
                          </button>
                        </div>

                        {/* Dev mode: show OTP code directly in UI */}
                        {devOtp && (
                          <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center">
                            <p className="text-[10px] text-yellow-400/70 uppercase tracking-wider">Dev Mode — OTP Code</p>
                            <p className="mt-0.5 text-2xl font-black tracking-[0.4em] text-yellow-300">{devOtp}</p>
                            <button
                              onClick={() => setOtpCode(devOtp)}
                              className="mt-1 text-[10px] text-yellow-400 hover:text-yellow-300 underline"
                            >
                              Click to auto-fill
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <NavButtons
                  onNext={() => { if (!otpVerified) { toast.error("Verify your email OTP first"); return; } setStep(2); }}
                  nextLabel={otpVerified ? "Next: Business Info →" : "Verify email to continue"}
                  loading={loading}
                  disabled={!otpVerified}
                />
              </div>
            )}

            {/* ── STEP 2: Business ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <StepHeader title="Business Information" sub="Tell us about your store" />
                <div>
                  <label className={lbl}>Store Name *</label>
                  <input className={inp} placeholder="Abebe's Electronics" value={s2.storeName}
                    onChange={e => setS2({ ...s2, storeName: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Business License Number</label>
                  <input className={inp} placeholder="BL-2024-001234 (optional)" value={s2.licenseNumber}
                    onChange={e => setS2({ ...s2, licenseNumber: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>City *</label>
                    <input className={inp} placeholder="Addis Ababa" value={s2.city}
                      onChange={e => setS2({ ...s2, city: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Region</label>
                    <input className={inp} placeholder="Oromia" value={s2.region}
                      onChange={e => setS2({ ...s2, region: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Country *</label>
                  <input className={inp} value={s2.country}
                    onChange={e => setS2({ ...s2, country: e.target.value })} />
                </div>
                <NavButtons onBack={() => setStep(1)} onNext={handleStep2} nextLabel="Next: Documents →" loading={loading} />
              </div>
            )}

            {/* ── STEP 3: Documents ── */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <StepHeader title="Document Upload" sub="JPG, PNG, or PDF · Max 5MB" />

                {/* Document type selector */}
                <div>
                  <label className={lbl}>Document Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "license", label: "Business License", icon: "📋", desc: "Official business registration" },
                      { value: "gov_id",  label: "Government ID",    icon: "🪪", desc: "National ID or passport" },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setS3({ ...s3, documentType: opt.value as "license" | "gov_id" })}
                        className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition ${
                          s3.documentType === opt.value
                            ? "border-orange-500 bg-orange-500/15"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}>
                        <span className="text-2xl">{opt.icon}</span>
                        <p className="text-sm font-bold text-white">{opt.label}</p>
                        <p className="text-[10px] text-white/40">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop zone */}
                <div>
                  <label className={lbl}>Upload Document *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition ${
                      s3.filePreview
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-white/20 bg-white/5 hover:border-orange-500/50 hover:bg-orange-500/5"
                    }`}
                  >
                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />

                    {s3.filePreview ? (
                      <>
                        {s3.fileType.startsWith("image/") ? (
                          <img src={s3.filePreview} alt="preview" className="max-h-44 rounded-xl object-contain shadow-xl" />
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">📄</div>
                            <p className="text-sm font-semibold text-white">{s3.fileName}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 rounded-full bg-green-500/20 border border-green-500/30 px-4 py-1.5">
                          <span className="text-green-400 text-sm">✓</span>
                          <p className="text-xs font-semibold text-green-400">File ready · Click to change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">📁</div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">Click to upload or drag & drop</p>
                          <p className="mt-1 text-xs text-white/40">JPG, PNG, PDF · Max 5MB</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <NavButtons onBack={() => setStep(2)} onNext={handleStep3} nextLabel="Next: Bank Info →" loading={loading} />
              </div>
            )}

            {/* ── STEP 4: Bank + submit ── */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <StepHeader title="Bank & Payment" sub="Where we'll send your earnings" />
                <div>
                  <label className={lbl}>Bank Name *</label>
                  <select className={inp} value={s4.bankName} onChange={e => setS4({ ...s4, bankName: e.target.value })}>
                    <option value="" className="bg-gray-900">Select your bank</option>
                    {BANKS.map(b => <option key={b} value={b} className="bg-gray-900">{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Account Holder Name *</label>
                  <input className={inp} placeholder="Full name as on bank account" value={s4.accountHolder}
                    onChange={e => setS4({ ...s4, accountHolder: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Account Number *</label>
                  <input className={inp} placeholder="1000XXXXXXXXXX" value={s4.accountNumber}
                    onChange={e => setS4({ ...s4, accountNumber: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Mobile Money (optional)</label>
                  <input className={inp} placeholder="Telebirr / M-Pesa number" value={s4.mobileMoney}
                    onChange={e => setS4({ ...s4, mobileMoney: e.target.value })} />
                </div>

                {/* Summary card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-3 text-sm font-bold text-white">📋 Application Summary</p>
                  <div className="space-y-2 text-xs text-white/50">
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span> {s1.fullName} · {s1.phone} · Phone verified</div>
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span> {s2.storeName} · {s2.city}, {s2.country}</div>
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span> {s3.documentType === "license" ? "Business License" : "Government ID"} uploaded</div>
                  </div>
                </div>

                <NavButtons onBack={() => setStep(3)} onNext={handleSubmit} nextLabel="🚀 Submit Application" loading={loading} isLast />

                <p className="text-center text-xs text-white/30">
                  By submitting, you agree to our{" "}
                  <a href="#" className="text-orange-400 hover:underline">Seller Terms</a> and{" "}
                  <a href="#" className="text-orange-400 hover:underline">Privacy Policy</a>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-white/30">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-orange-400 hover:text-orange-300 transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
