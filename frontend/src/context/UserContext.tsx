"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getToken, getUserFromToken, isAuthenticated, clearTokens } from "@/lib/auth";

export interface UserState {
  id: number | null;
  username: string;
  email: string;
  role: "customer" | "seller" | "admin" | "";
  isVerified: boolean;
  isAuthenticated: boolean;
  sellerApproved: boolean;
  onboardingStep: number;
  storeName: string;
}

interface UserContextValue {
  user: UserState;
  refresh: () => void;
  logout: () => void;
  isSeller: boolean;
  isAdmin: boolean;
  isBuyer: boolean;
  isPendingSeller: boolean;
}

const EMPTY: UserState = {
  id: null, username: "", email: "", role: "",
  isVerified: false, isAuthenticated: false,
  sellerApproved: false, onboardingStep: 1, storeName: "",
};

const UserContext = createContext<UserContextValue>({
  user: EMPTY, refresh: () => {}, logout: () => {},
  isSeller: false, isAdmin: false, isBuyer: false, isPendingSeller: false,
});

function parseUser(): UserState {
  if (typeof window === "undefined") return EMPTY;
  if (!isAuthenticated()) return EMPTY;
  const payload = getUserFromToken(getToken());
  if (!payload) return EMPTY;
  return {
    id:             payload.user_id ?? null,
    username:       payload.username ?? "",
    email:          payload.email ?? "",
    role:           payload.role ?? "customer",
    isVerified:     payload.is_verified ?? false,
    isAuthenticated: true,
    sellerApproved: payload.seller_approved ?? false,
    onboardingStep: payload.onboarding_step ?? 1,
    storeName:      payload.store_name ?? "",
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(EMPTY);

  const refresh = useCallback(() => setUser(parseUser()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(EMPTY);
  }, []);

  const isSeller        = user.role === "seller";
  const isAdmin         = user.role === "admin";
  const isBuyer         = user.role === "customer";
  const isPendingSeller = isSeller && !user.sellerApproved;

  return (
    <UserContext.Provider value={{ user, refresh, logout, isSeller, isAdmin, isBuyer, isPendingSeller }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
