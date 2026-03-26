"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";

const DASHBOARD_PATHS = ["/seller/dashboard", "/admin/dashboard", "/rider"];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = DASHBOARD_PATHS.some(p => pathname.startsWith(p));
  const noSidebar = isDashboard;

  return (
    <div className={`flex flex-1 flex-col min-w-0 ${noSidebar ? "" : "lg:ml-[var(--sidebar-w)]"}`}>
      <main className="flex-1">{children}</main>
      {!isDashboard && <Footer />}
      <FloatingChat />
    </div>
  );
}
