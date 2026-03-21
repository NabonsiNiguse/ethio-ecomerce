"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          padding: "12px 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        },
        success: {
          iconTheme: { primary: "#4f46e5", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
        },
      }}
    />
  );
}
