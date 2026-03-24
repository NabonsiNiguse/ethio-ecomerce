import Link from "next/link";

const LINKS = {
  Shop: [
    { label: "All Products",  href: "/products" },
    { label: "Today's Deals", href: "/products?sort=deals" },
    { label: "Gift Cards",    href: "/gift-cards" },
    { label: "Wishlist",      href: "/wishlist" },
  ],
  Account: [
    { label: "My Dashboard",  href: "/dashboard" },
    { label: "My Orders",     href: "/dashboard?tab=orders" },
    { label: "My Cart",       href: "/cart" },
    { label: "Deliveries",    href: "/dashboard?tab=delivery" },
  ],
  Support: [
    { label: "Help Center",   href: "#" },
    { label: "Track Order",   href: "/dashboard?tab=delivery" },
    { label: "Returns",       href: "#" },
    { label: "Contact Us",    href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#16181f]">
      <div className="mx-auto max-w-[1400px] px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">🇪🇹</span>
              <div>
                <p className="text-[15px] font-black text-brand-600">Ethio eCommerce</p>
                <p className="text-[11px] text-gray-400">Powered by STEM Engineering</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Ethiopia's modern marketplace. Shop thousands of products with secure Chapa payments and fast delivery.
            </p>
            <div className="mt-5 flex gap-2">
              {["📘", "🐦", "📸", "▶️"].map((icon, i) => (
                <a key={i} href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-base hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 transition">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</p>
              <ul className="space-y-2.5">
                {links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-brand-600 transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.08] pt-6 sm:flex-row">
          <p className="text-[12px] text-gray-400 dark:text-gray-500">© 2026 Ethio eCommerce · STEM Engineering. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-5 text-[12px] text-gray-400 dark:text-gray-500">
            {["Privacy Policy", "Terms of Service", "Help Center", "About", "Contact"].map(l => (
              <a key={l} href="#" className="hover:text-brand-600 transition">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">Payments:</span>
            {["Telebirr", "CBE Birr", "Chapa"].map(p => (
              <span key={p} className="rounded-md bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
