"use client";

/**
 * PremiumChatLayout — 3-column e-commerce chat system
 * Wired to the real backend: /api/chat/conversations + ws/chat/<id>/
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";
import { ChatMessage, Conversation } from "@/types";
import {
  listConversations, listMessages,
  listQuickReplies, type QuickReply, getConversationContext,
  type ProductCard, getOrCreateSupportConversation,
} from "@/lib/chat";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

type ConnState = "connecting" | "connected" | "disconnected";
type Tab = "all" | "unread" | "support" | "orders" | "sellers";

interface Props {
  /** Numeric conversation id — or 0 to auto-create a support conversation */
  conversationId: number;
  currentUserId: number;
  currentUsername: string;
  onClose?: () => void;
  compact?: boolean;
}

const AI_SUGGESTIONS = [
  "Your order was shipped and is expected to arrive tomorrow.",
  "Returns are accepted within 30 days of delivery. Would you like to start a return?",
  "I can check the stock status for you. Which product are you asking about?",
];

/* ── Icon helpers ── */
const SendIcon    = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>;
const SearchIcon  = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const AttachIcon  = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const EmojiIcon   = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PhoneIcon   = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const VideoIcon   = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const MoreIcon    = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>;
const CheckIcon   = () => <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
const CloseIcon   = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const SparkleIcon = () => <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function Avatar({ seed, size = "md" }: { seed?: string; size?: "sm" | "md" | "lg" }) {
  const s = seed || "?";
  const sz = size === "sm" ? "h-8 w-8 text-sm" : size === "lg" ? "h-12 w-12 text-xl" : "h-10 w-10 text-base";
  const colors = ["bg-violet-500","bg-blue-500","bg-teal-500","bg-orange-500","bg-rose-500","bg-amber-500"];
  const color  = colors[(s.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`${sz} ${color} flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white`}>
      {s.charAt(0).toUpperCase()}
    </div>
  );
}

function convTypeIcon(type: string) {
  if (type === "support")      return "🎧";
  if (type === "order_linked") return "📦";
  return "🏪";
}

/* ══════════════════════════════════════════════════════════════════════════
   LEFT SIDEBAR — real conversation list from API
══════════════════════════════════════════════════════════════════════════ */

/** Human-readable display name for a conversation */
function convDisplayName(c: Conversation, currentUserId: number): string {
  // buyer_seller: show product name from title
  if (c.conversation_type === "buyer_seller" && c.title?.startsWith("product:")) {
    return c.title.split(":").slice(2).join(":");
  }
  // order_linked: show order number
  if (c.conversation_type === "order_linked") {
    return c.order ? `Order #${c.order}` : "Order Chat";
  }
  // support: show the other participant's name, or "Support"
  if (c.conversation_type === "support") {
    const other = c.participants.find(p => p.user !== currentUserId);
    return other ? `Support — ${other.username}` : "Support";
  }
  return c.title || c.conversation_type.replace("_", " ");
}

/** Clean last message preview — strip system message prefixes */
function cleanPreview(content: string): string {
  if (content.startsWith("[Product]")) return "📎 Product shared";
  if (content.startsWith("🛒 Order")) return content;
  if (content.startsWith("🚴") || content.startsWith("📦") || content.startsWith("✅")) return content;
  return content;
}

function ConversationSidebar({
  activeId, onSelect, currentUsername, currentUserId,
}: {
  activeId: number;
  onSelect: (id: number) => void;
  currentUsername: string;
  currentUserId: number;
}) {
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<Tab>("all");
  const [convos, setConvos]         = useState<Conversation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    listConversations()
      .then(setConvos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenSupport = async () => {
    setSupportLoading(true);
    try {
      const id = await getOrCreateSupportConversation(currentUserId);
      onSelect(id);
    } catch {}
    finally { setSupportLoading(false); }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all",     label: "All"     },
    { key: "unread",  label: "Unread"  },
    { key: "support", label: "Support" },
    { key: "orders",  label: "Orders"  },
    { key: "sellers", label: "Sellers" },
  ];

  const filtered = convos.filter(c => {
    const name = convDisplayName(c, currentUserId);
    const last = c.last_message?.content ?? "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                        last.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === "all"     ? true :
      tab === "unread"  ? c.unread_count > 0 :
      tab === "support" ? c.conversation_type === "support" :
      tab === "orders"  ? c.conversation_type === "order_linked" :
      tab === "sellers" ? c.conversation_type === "buyer_seller" : true;
    return matchSearch && matchTab;
  });

  const fmt = (ts: string) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60)    return "now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16181f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h2 className="text-[16px] font-bold text-gray-900 dark:text-gray-100">Messages</h2>
        {/* Support chat button — opens/creates support conversation */}
        <button
          onClick={handleOpenSupport}
          disabled={supportLoading}
          title="Contact Support"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition">
          {supportLoading
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
          }
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2">
          <SearchIcon />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-[13px] text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="text-3xl">💬</span>
            <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">No conversations yet</p>
            <a href="/products"
              className="rounded-xl bg-brand-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-700 transition">
              Browse Products
            </a>
          </div>
        )}
        {filtered.map(c => {
          const displayName = convDisplayName(c, currentUserId);
          const lastContent = c.last_message ? cleanPreview(c.last_message.content) : "No messages yet";
          const otherParticipant = c.participants.find(p => p.user !== currentUserId);
          const subtitle = c.conversation_type === "buyer_seller"
            ? otherParticipant ? `with ${otherParticipant.username}` : ""
            : c.conversation_type === "order_linked"
            ? `Order #${c.order}`
            : "";
          const isActive = activeId === c.id;

          // Per-type accent colors
          const accent =
            c.conversation_type === "support"      ? { bg: "from-violet-500 to-purple-600",  ring: "ring-violet-400",  dot: "bg-violet-400",  badge: "bg-violet-500" } :
            c.conversation_type === "order_linked" ? { bg: "from-blue-500 to-cyan-500",       ring: "ring-blue-400",    dot: "bg-blue-400",    badge: "bg-blue-500"   } :
                                                     { bg: "from-teal-500 to-emerald-500",    ring: "ring-teal-400",    dot: "bg-teal-400",    badge: "bg-teal-500"   };

          return (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={`group relative w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 overflow-hidden ${
                isActive ? "bg-gradient-to-r from-brand-600 to-brand-500" : "hover:bg-transparent"
              }`}
            >
              {/* Hover background — vivid per-type gradient, only when not active */}
              {!isActive && (
                <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r ${
                  c.conversation_type === "support"      ? "from-violet-100 via-purple-50 to-violet-100 dark:from-violet-900/40 dark:via-purple-900/30 dark:to-violet-900/40" :
                  c.conversation_type === "order_linked" ? "from-blue-100 via-cyan-50 to-blue-100 dark:from-blue-900/40 dark:via-cyan-900/30 dark:to-blue-900/40" :
                                                           "from-teal-100 via-emerald-50 to-teal-100 dark:from-teal-900/40 dark:via-emerald-900/30 dark:to-teal-900/40"
                }`} />
              )}

              {/* Left accent bar */}
              <span className={`absolute left-0 top-0 h-full w-[3px] rounded-r-full transition-all duration-200 bg-gradient-to-b ${accent.bg} ${
                isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50 group-hover:opacity-100 group-hover:scale-y-100"
              }`} />

              {/* Avatar with ring on hover/active */}
              <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl transition-all duration-200 z-10 ${
                isActive
                  ? "bg-white/20 ring-2 ring-white/40"
                  : `bg-gray-100 dark:bg-white/10 group-hover:ring-2 group-hover:${accent.ring} group-hover:scale-105`
              }`}>
                {convTypeIcon(c.conversation_type)}
                {/* Online dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${
                  isActive ? "border-brand-500 bg-green-300" : "border-white dark:border-[#16181f] bg-green-400"
                } ${c.unread_count > 0 ? "block" : "hidden"}`} />
              </div>

              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[13px] font-bold truncate transition-colors duration-200 ${
                    isActive
                      ? "text-white"
                      : c.conversation_type === "support"
                        ? "text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300"
                        : c.conversation_type === "order_linked"
                        ? "text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300"
                        : "text-gray-900 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-300"
                  }`}>
                    {displayName}
                  </span>
                  <span className={`text-[11px] flex-shrink-0 transition-colors duration-200 ${
                    isActive ? "text-white/70"
                      : c.conversation_type === "support"   ? "text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                      : c.conversation_type === "order_linked" ? "text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      : "text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                  }`}>
                    {c.last_message ? fmt(c.last_message.created_at) : ""}
                  </span>
                </div>

                {subtitle && (
                  <p className={`text-[11px] font-semibold truncate transition-colors duration-200 ${
                    isActive ? "text-white/80"
                      : c.conversation_type === "support"      ? "text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300"
                      : c.conversation_type === "order_linked" ? "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300"
                      : "text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300"
                  }`}>{subtitle}</p>
                )}

                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-[12px] truncate transition-colors duration-200 ${
                    isActive ? "text-white/70"
                      : c.conversation_type === "support"      ? "text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                      : c.conversation_type === "order_linked" ? "text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                  }`}>{lastContent}</span>

                  {c.unread_count > 0 && (
                    <span className={`ml-1 flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-sm transition-all duration-200 ${
                      isActive
                        ? "bg-white text-brand-600"
                        : `${accent.badge} text-white group-hover:scale-110`
                    }`}>
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RIGHT PANEL — order info, quick actions
══════════════════════════════════════════════════════════════════════════ */
function RightPanel({ conversation, onClose }: { conversation: Conversation | null; onClose?: () => void }) {
  const type = conversation?.conversation_type ?? "support";

  return (
    <div className="flex h-full flex-col border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16181f] overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">Details</h3>
        {onClose && (
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition">
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="mx-4 mb-4 rounded-xl border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-2xl">
            {convTypeIcon(type)}
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
              {conversation?.title || type.replace("_", " ")}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {conversation?.participants.length ?? 0} participants
            </p>
          </div>
        </div>
        {type === "order_linked" && conversation?.order && (
          <div className="space-y-2">
            {[
              { label: "Order ID", value: `#${conversation.order}` },
              { label: "Type",     value: "Order-Linked Chat"      },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 dark:text-gray-400">{r.label}</span>
                <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {type === "order_linked" && (
        <div className="mx-4 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Delivery Progress</p>
          <div className="space-y-3">
            {["Order Placed","Processing","Shipped","Out for Delivery","Delivered"].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i < 3 ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-400"
                }`}>
                  {i < 3 ? <CheckIcon /> : i + 1}
                </div>
                <span className={`text-[12px] font-medium ${i < 3 ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "View Order",     icon: "📋", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/30"   },
            { label: "Track Delivery", icon: "🚚", color: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-800/30"   },
            { label: "Request Refund", icon: "↩️", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800/30" },
            { label: "Mark Resolved",  icon: "✅", color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800/30"  },
          ].map(a => (
            <button key={a.label}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition hover:opacity-80 ${a.color}`}>
              <span className="text-lg">{a.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">AI Summary</p>
        <div className="rounded-xl border border-violet-100 dark:border-violet-800/30 bg-violet-50 dark:bg-violet-900/10 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <SparkleIcon />
            <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400">AI Insight</span>
          </div>
          <p className="text-[12px] text-violet-800 dark:text-violet-300 leading-relaxed">
            {type === "order_linked"
              ? "Customer is asking about order delivery. No issues detected."
              : type === "support"
              ? "Support conversation. Respond promptly to maintain satisfaction."
              : "Buyer-seller conversation. Be clear about product details and pricing."}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Parse product info from conversation title like "product:42:Samsung Galaxy A54" */
function parsePinnedProduct(conv: Conversation | null): { id: number; name: string } | null {
  if (!conv?.title?.startsWith('product:')) return null;
  const parts = conv.title.split(':');
  if (parts.length < 3) return null;
  return { id: Number(parts[1]), name: parts.slice(2).join(':') };
}

/* ══════════════════════════════════════════════════════════════════════════
   CENTER — chat pane (WebSocket connected to real backend)
══════════════════════════════════════════════════════════════════════════ */
function ChatPane({
  conversationId, currentUserId, currentUsername, conversation, compact = false,
}: {
  conversationId: number;
  currentUserId: number;
  currentUsername: string;
  conversation: Conversation | null;
  compact?: boolean;
}) {
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [input,        setInput]        = useState("");
  const [connState,    setConnState]    = useState<ConnState>("connecting");
  const [typingUsers,  setTypingUsers]  = useState<string[]>([]);
  const [showAI,       setShowAI]       = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const wsRef       = useRef<WebSocket | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  // Load quick replies
  useEffect(() => {
    listQuickReplies().then(setQuickReplies).catch(() => {});
  }, []);

  // Load history via REST on mount, then open WS
  useEffect(() => {
    if (!conversationId) return;
    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    // Fetch REST history first
    listMessages(conversationId, { limit: 50 })
      .then(msgs => setMessages(msgs.map(m => ({
        id: m.id, sender_id: m.sender, sender_username: m.sender_username,
        content: m.content, message: m.content,
        timestamp: m.created_at, created_at: m.created_at,
        is_read: false, msg_type: m.msg_type,
      }))))
      .catch(() => {});

    const connect = () => {
      const token = getToken();
      ws = new WebSocket(`${WS_BASE}/ws/chat/${conversationId}/?token=${token}`);
      wsRef.current = ws;
      setConnState("connecting");
      ws.onopen    = () => setConnState("connected");
      ws.onmessage = e => { try { handleIncoming(JSON.parse(e.data)); } catch {} };
      ws.onclose   = () => { setConnState("disconnected"); retryTimer = setTimeout(connect, 3000); };
      ws.onerror   = () => ws.close();
    };

    connect();
    return () => { clearTimeout(retryTimer); ws?.close(); };
  }, [conversationId]);

  const handleIncoming = useCallback((data: any) => {
    if (data.type === "history") {
      setMessages(data.messages.map((m: any) => ({
        ...m, message: m.content, timestamp: m.created_at,
      })));
    } else if (data.type === "chat_message") {
      const msg: ChatMessage = {
        id: data.id, sender_id: data.sender_id, sender_username: data.sender_username,
        content: data.content, message: data.content,
        timestamp: data.created_at, created_at: data.created_at,
        is_read: false, msg_type: data.msg_type,
      };
      setMessages(p => {
        // Avoid duplicates (REST history + WS broadcast)
        if (p.some(m => m.id === msg.id)) return p;
        return [...p, msg];
      });
      if (data.sender_id !== currentUserId && conversation?.conversation_type === "support") {
        const idx = Math.floor(Math.random() * AI_SUGGESTIONS.length);
        setAiSuggestion(AI_SUGGESTIONS[idx]);
        setShowAI(true);
      }
    } else if (data.type === "typing") {
      if (data.sender_id === currentUserId) return;
      setTypingUsers(p => data.is_typing
        ? p.includes(data.sender_username) ? p : [...p, data.sender_username]
        : p.filter((u: string) => u !== data.sender_username));
    } else if (data.type === "read_receipt") {
      setMessages(p => p.map(m => m.id === data.message_id ? { ...m, is_read: true } : m));
    } else if (data.type === "message_edited") {
      setMessages(p => p.map(m => m.id === data.message_id
        ? { ...m, content: data.content, message: data.content, edited_at: data.edited_at }
        : m));
    }
  }, [currentUserId, conversation]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat_message", content: msg }));
    setInput("");
    setShowAI(false);
    stopTyping();
    inputRef.current?.focus();
  };

  const sendTyping = (t: boolean) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "typing", is_typing: t }));
  };

  const handleTyping = () => {
    if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(true); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    if (isTypingRef.current) { isTypingRef.current = false; sendTyping(false); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const fmt = (ts?: string) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const connDot: Record<ConnState, string> = {
    connecting: "bg-yellow-400 animate-pulse",
    connected:  "bg-green-400",
    disconnected: "bg-red-400",
  };

  const grouped = messages.map((m, i) => ({
    ...m,
    isFirst: i === 0 || messages[i - 1].sender_id !== m.sender_id,
    isLast:  i === messages.length - 1 || messages[i + 1]?.sender_id !== m.sender_id,
  }));

  const displayName = parsePinnedProduct(conversation)
    ? parsePinnedProduct(conversation)!.name
    : conversation?.conversation_type === "order_linked"
    ? `Order #${conversation.order}`
    : conversation?.conversation_type === "support"
    ? "Support"
    : conversation?.title?.startsWith("product:")
    ? conversation.title.split(":").slice(2).join(":")
    : conversation?.title || "Chat";

  const pinnedProduct = parsePinnedProduct(conversation);

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-[#0f1117]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16181f] px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xl">
              {convTypeIcon(conversation?.conversation_type ?? "support")}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-[#16181f]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">{displayName}</p>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${connDot[connState]}`} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">{connState}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[{ icon: <PhoneIcon />, label: "Call" }, { icon: <VideoIcon />, label: "Video" },
            { icon: <SearchIcon />, label: "Search" }, { icon: <MoreIcon />, label: "More" }].map(btn => (
            <button key={btn.label} aria-label={btn.label}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-300 transition">
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned product card — animated water-blue gradient with glowing border */}
      {pinnedProduct && (
        <div className="relative px-3 py-2 overflow-hidden product-banner-bg">
          {/* Animated shimmer overlay */}
          <div className="absolute inset-0 product-banner-shimmer" />
          {/* Animated glowing border */}
          <div className="absolute inset-0 product-banner-border" />
          <div className="relative flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/30 shadow-lg">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 text-lg shadow-inner">
              🛍️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200">Discussing Product</p>
              <p className="text-[13px] font-bold text-white truncate drop-shadow">{pinnedProduct.name}</p>
            </div>
            <a href={`/products/${pinnedProduct.id}`}
              className="flex-shrink-0 rounded-lg bg-sky-400 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-300 active:scale-95 transition shadow-md shadow-sky-900/40">
              View →
            </a>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
        {messages.length === 0 && connState === "connected" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">💬</div>
            <p className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">Start the conversation</p>
            <p className="text-[13px] text-gray-400 dark:text-gray-500">Send a message to get started</p>
          </div>
        )}
        {grouped.map((msg, i) => {
          const isMine = msg.sender_id === currentUserId;
          const text   = msg.content ?? msg.message ?? "";
          return (
            <motion.div key={msg.id ?? `${msg.timestamp}-${i}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"} ${msg.isFirst ? "mt-4" : "mt-0.5"}`}>
              {!isMine && (
                <div className="mr-2 flex-shrink-0 self-end">
                  {msg.isLast
                    ? <Avatar seed={msg.sender_username} size="sm" />
                    : <div className="h-8 w-8" />}
                </div>
              )}
              <div className={`flex max-w-[68%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                {!isMine && msg.isFirst && (
                  <span className="mb-1 px-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    {msg.sender_username}
                  </span>
                )}
                <div className={`relative px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                  isMine
                    ? `bg-brand-600 text-white ${msg.isFirst ? "rounded-t-2xl" : "rounded-2xl"} ${msg.isLast ? "rounded-br-sm" : ""} rounded-bl-2xl`
                    : `bg-white dark:bg-[#1e2130] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/[0.08] ${msg.isFirst ? "rounded-t-2xl" : "rounded-2xl"} ${msg.isLast ? "rounded-bl-sm" : ""} rounded-br-2xl`
                }`}>
                  {text}
                  {msg.edited_at && <span className="ml-2 text-[10px] opacity-60">(edited)</span>}
                </div>
                {msg.isLast && (
                  <div className={`mt-1 flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{fmt(msg.timestamp ?? msg.created_at)}</span>
                    {isMine && (
                      <span className={`text-[10px] font-semibold ${msg.is_read ? "text-brand-500" : "text-gray-400"}`}>
                        {msg.is_read ? "✓✓ Seen" : "✓ Sent"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-end gap-2 mt-4">
              <Avatar seed={typingUsers[0]} size="sm" />
              <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-white/[0.08] px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-500 dark:text-gray-400">{typingUsers[0]} is typing</span>
                  <TypingDots />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* AI suggestion */}
      <AnimatePresence>
        {showAI && aiSuggestion && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mb-2 rounded-xl border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-900/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0"><SparkleIcon /></span>
                <div>
                  <p className="text-[11px] font-bold text-violet-700 dark:text-violet-400 mb-1">AI Suggested Reply</p>
                  <p className="text-[12px] text-violet-800 dark:text-violet-300">{aiSuggestion}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setInput(aiSuggestion); setShowAI(false); inputRef.current?.focus(); }}
                  className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-700 transition">
                  Use
                </button>
                <button onClick={() => setShowAI(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition">
                  <CloseIcon />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick replies */}
      {!compact && messages.length === 0 && quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {quickReplies.map(r => (
            <button key={r.id} onClick={() => sendMessage(r.body)}
              className="flex-shrink-0 rounded-full border border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 text-[12px] font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition">
              {r.title}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16181f] px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition">
          <div className="flex items-center gap-1 pb-0.5">
            <button aria-label="Attach file"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <AttachIcon />
            </button>
            <button aria-label="Emoji"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <EmojiIcon />
            </button>
          </div>
          <textarea ref={inputRef} rows={1} value={input}
            onChange={e => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown} onBlur={stopTyping}
            placeholder="Type a message…"
            disabled={connState !== "connected"}
            className="flex-1 resize-none bg-transparent py-1 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:opacity-50 max-h-32"
            style={{ lineHeight: "1.5" }} />
          <button onClick={() => sendMessage()}
            disabled={!input.trim() || connState !== "connected"}
            aria-label="Send"
            className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:scale-95 disabled:opacity-40 transition">
            <SendIcon />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-500">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT EXPORT
══════════════════════════════════════════════════════════════════════════ */
export default function PremiumChatLayout({
  conversationId: initialId,
  currentUserId,
  currentUsername,
  onClose,
  compact = false,
}: Props) {
  const [activeId,    setActiveId]    = useState(initialId);
  const [convos,      setConvos]      = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPanel,   setShowPanel]   = useState(false);

  // Keep conversation objects in sync with sidebar
  useEffect(() => {
    listConversations().then(setConvos).catch(() => {});
  }, []);

  const activeConv = convos.find(c => c.id === activeId) ?? null;

  if (compact) {
    return (
      <div className="flex h-full flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.08] shadow-2xl">
        <ChatPane
          conversationId={activeId}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          conversation={activeConv}
          compact
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-[#0f1117]">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSidebar(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" />
        )}
      </AnimatePresence>

      <div className={`
        lg:relative lg:flex lg:w-[280px] lg:flex-shrink-0
        fixed left-0 top-0 z-50 h-full w-[280px]
        ${showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-transform duration-300
      `}>
        <div className="h-full w-full">
          <ConversationSidebar
            activeId={activeId}
            onSelect={id => { setActiveId(id); setShowSidebar(false); }}
            currentUsername={currentUsername}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16181f] px-3 py-2 lg:hidden">
          <button onClick={() => setShowSidebar(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="flex-1 text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {activeConv?.title || activeConv?.conversation_type || "Chat"}
          </span>
          <button onClick={() => setShowPanel(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPane
            conversationId={activeId}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            conversation={activeConv}
          />
        </div>
      </div>

      {/* Right panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div key="rpov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPanel(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" />
        )}
      </AnimatePresence>

      <div className={`
        lg:relative lg:flex lg:w-[260px] lg:flex-shrink-0
        fixed right-0 top-0 z-50 h-full w-[260px]
        ${showPanel ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        transition-transform duration-300
      `}>
        <div className="h-full w-full overflow-y-auto">
          <RightPanel conversation={activeConv} onClose={() => setShowPanel(false)} />
        </div>
      </div>
    </div>
  );
}
