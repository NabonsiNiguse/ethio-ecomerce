"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated, getToken, getUserFromToken } from "@/lib/auth";
import PremiumChatLayout from "@/components/ChatWindow";

export default function ChatRoomPage() {
  const params   = useParams();
  const router   = useRouter();
  // The [room] segment is now a numeric conversation id
  const convId   = Number(params.room);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    const payload = getUserFromToken(getToken());
    if (payload) setUser({ id: payload.user_id, username: payload.username ?? "You" });
  }, [router]);

  if (!user || !convId) return (
    <div className="flex h-[calc(100vh-118px)] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );

  return (
    <div style={{ height: "calc(100vh - var(--header-h))" }} className="overflow-hidden">
      <PremiumChatLayout
        conversationId={convId}
        currentUserId={user.id}
        currentUsername={user.username}
      />
    </div>
  );
}
