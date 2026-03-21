import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import ToastProvider from "@/context/ToastProvider";
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
          <ToastProvider />
          <ShopHeader />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 lg:ml-60">{children}</main>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
