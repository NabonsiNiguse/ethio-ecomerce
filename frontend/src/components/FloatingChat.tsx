"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isAuthenticated, getUserFromToken, getToken } from "@/lib/auth";
import { getOrCreateSupportConversation } from "@/lib/chat";
import PremiumChatLayout from "@/components/ChatWindow";

export default function FloatingChat() {
  const [open,   setOpen]   = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [user,   setUser]   = useState<{ id: number; username: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const payload = getUserFromToken(getToken());
    if (payload) setUser({ id: payload.user_id, username: payload.username ?? "You" });
  }, []);

  // Resolve conversation id lazily when first opened
  useEffect(() => {
    if (!open || !user || convId !== null) return;
    getOrCreateSupportConversation(user.id)
      .then(setConvId)
      .catch(() => {});
  }, [open, user, convId]);

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && convId !== null && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            className="w-[360px] sm:w-[400px] overflow-hidden rounded-2xl shadow-2xl"
            style={{ height: "520px" }}
          >
            <PremiumChatLayout
              conversationId={convId}
              currentUserId={user.id}
              currentUsername={user.username}
              onClose={() => setOpen(false)}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close chat" : "Open support chat"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-2xl hover:bg-brand-700 transition"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
              className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
              className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          )}
        </AnimatePresence>
        {!open && <span className="absolute inset-0 rounded-full bg-brand-600 animate-ping opacity-20" />}
      </motion.button>
    </div>
  );
}
