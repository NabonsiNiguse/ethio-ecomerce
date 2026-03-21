import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import ToastProvider from "@/context/ToastProvider";
import { CategoriesProvider } from "@/context/CategoriesContext";
import ShopHeader from "@/components/ShopHeader";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Ethio eCommerce — Powered by STEM Engineering",
  description: "Ethiopia's modern marketplace with secure Chapa payments, powered by STEM Engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <CartProvider>
          <CategoriesProvider>
            <ToastProvider />
            {/* Fixed header — pinned to top:0, no gap */}
            <ShopHeader />
            {/* Spacer pushes content below the fixed header */}
            <div style={{ height: "var(--header-h)" }} />
            {/* Body row */}
            <div className="flex min-h-[calc(100vh-var(--header-h))]">
              <Sidebar />
              <main className="flex-1 lg:ml-[260px] min-w-0">{children}</main>
            </div>
          </CategoriesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
