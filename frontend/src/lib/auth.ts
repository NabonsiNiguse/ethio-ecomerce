import Cookies from "js-cookie";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// Check if we're in a secure environment
const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

// Cookie options for consistency
const cookieOptions = {
  sameSite: "lax" as const, // Changed from "strict" for better localhost compatibility
  secure: isSecure,         // Will be false on http://localhost, true on https
  path: "/",
};

export const setTokens = (access: string, refresh: string) => {
  if (!access || !refresh) {
    console.error("Invalid tokens provided");
    return;
  }
  
  Cookies.set(ACCESS_KEY, access, cookieOptions);
  Cookies.set(REFRESH_KEY, refresh, cookieOptions);
};

export const getToken = (): string | undefined => {
  // Ensure we're on client-side
  if (typeof window === "undefined") return undefined;
  return Cookies.get(ACCESS_KEY);
};

export const getRefreshToken = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return Cookies.get(REFRESH_KEY);
};

export const clearTokens = () => {
  Cookies.remove(ACCESS_KEY, { path: "/" });
  Cookies.remove(REFRESH_KEY, { path: "/" });
};

// Alias so components can import `logout` directly
export const logout = clearTokens;

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(getToken());
};

// Token expiration check
export const isTokenExpired = (token?: string): boolean => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    return true; // If token is malformed, consider it expired
  }
};

// Get user info from token
export const getUserFromToken = (token?: string): any => {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (error) {
    return null;
  }
};