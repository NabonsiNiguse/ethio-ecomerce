import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { UserProvider } from "@/context/UserContext";
import ToastProvider from "@/context/ToastProvider";
import { CategoriesProvider } from "@/context/CategoriesContext";
import ShopHeader from "@/components/ShopHeader";
import Sidebar from "@/components/Sidebar";
import ConditionalLayout from "@/components/ConditionalLayout";

export const metadata: Metadata = {
  title: "Ethio eCommerce — Powered by STEM Engineering",
  description: "Ethiopia's modern marketplace with secure Chapa payments, powered by STEM Engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        bg-[#f4f5f7] = light page background
        dark:bg-[#0f1117] = dark page background
        These are on <body> so Tailwind's darkMode:"class" picks them up
        when the "dark" class is toggled on <html>
      */}
      <body className="min-h-screen antialiased bg-[#f4f5f7] text-gray-900 dark:bg-[#0f1117] dark:text-gray-100">
        <CartProvider>
          <WishlistProvider>
            <UserProvider>
            <CategoriesProvider>
              <ToastProvider />
              <ShopHeader />
              <div style={{ height: "var(--header-h)" }} />
              <div className="flex min-h-[calc(100vh-var(--header-h))]">
                <Sidebar />
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </div>
            </CategoriesProvider>
            </UserProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
