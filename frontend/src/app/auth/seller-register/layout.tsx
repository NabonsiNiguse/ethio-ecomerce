import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Seller — Ethio eCommerce",
  description: "Register as a seller on Ethiopia's fastest-growing marketplace",
};

/**
 * Isolated full-screen layout for seller registration.
 * Overrides the root layout's header/sidebar spacing so the page
 * fills the entire viewport with no offsets.
 */
export default function SellerRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={
        {
          "--header-h": "0px",
          "--sidebar-w": "0px",
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          overflow: "auto",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
