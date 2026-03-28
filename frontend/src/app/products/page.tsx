"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Product, PaginatedResponse } from "@/types";

const SKELETON_COUNT = 8;

type SortKey = "default" | "price_asc" | "price_desc" | "name_asc";
type ViewMode = "grid" | "list";

interface Filters {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: SortKey;
  inStock: boolean;
}

async function fetchProducts(filters: Filters): Promise<{ products: Product[]; corrected?: string | null }> {
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  // Use AI search when there's a text query
  if (filters.search && filters.search.trim().length > 1) {
    const params = new URLSearchParams({ q: filters.search, limit: "50" });
    if (filters.minPrice) params.set("price_min", filters.minPrice);
    if (filters.maxPrice) params.set("price_max", filters.maxPrice);
    if (filters.category) params.set("category", filters.category);
    if (filters.inStock)  params.set("in_stock", "true");
    const res = await fetch(`${BASE}/api/ai/search?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { products: data.results ?? [], corrected: data.corrected_query };
  }
  // Standard listing
  const params = new URLSearchParams({ page_size: "100" });
  if (filters.category) params.set("category_name", filters.category);
  if (filters.maxPrice) params.set("price_max", filters.maxPrice);
  if (filters.minPrice) params.set("price_min", filters.minPrice);
  const res = await fetch(`${BASE}/api/products/?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: PaginatedResponse<Product> = await res.json();
  return { products: data.results ?? [], corrected: null };
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  if (sort === "price_asc")  return arr.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === "price_desc") return arr.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === "name_asc")   return arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

// Sample beauty products shown when backend has no data
const SAMPLE_PRODUCTS = [
  { id: 9001, name: "MAC Ruby Woo Lipstick",              category: { id: 6, name: "Beauty" }, price: "850",  stock: 12, images: [{ image_url: "https://images.unsplash.com/photo-1586495777744-4e6232bf2f9b?w=400&h=400&fit=crop" }], description: "Iconic matte red lipstick" },
  { id: 9002, name: "Bioderma Micellar Water",             category: { id: 6, name: "Beauty" }, price: "620",  stock: 8,  images: [{ image_url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop" }], description: "Gentle cleansing water" },
  { id: 9003, name: "Neutrogena Hydro Boost Gel",          category: { id: 6, name: "Beauty" }, price: "980",  stock: 5,  images: [{ image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop" }], description: "Hyaluronic acid moisturizer" },
  { id: 9004, name: "Cetaphil Gentle Skin Cleanser",       category: { id: 6, name: "Beauty" }, price: "540",  stock: 20, images: [{ image_url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop" }], description: "Dermatologist recommended" },
  { id: 9005, name: "Urban Decay Naked Palette",           category: { id: 6, name: "Beauty" }, price: "2400", stock: 3,  images: [{ image_url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop" }], description: "12 neutral eyeshadows" },
  { id: 9006, name: "Tatcha The Water Cream",              category: { id: 6, name: "Beauty" }, price: "3200", stock: 7,  images: [{ image_url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop" }], description: "Oil-free pore minimizing moisturizer" },
  { id: 9007, name: "Olaplex No.3 Hair Perfector",         category: { id: 6, name: "Beauty" }, price: "1800", stock: 15, images: [{ image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop" }], description: "Bond strengthening treatment" },
  { id: 9008, name: "Fenty Beauty Pro Filt'r Foundation",  category: { id: 6, name: "Beauty" }, price: "2100", stock: 9,  images: [{ image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop" }], description: "Soft matte longwear foundation" },
] as unknown as Product[];

function ProductsContent() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<ViewMode>("grid");

  const [filters, setFilters] = useState<Filters>({
    search:   searchParams.get("search") ?? "",
    category: searchParams.get("category_name") ?? "",
    minPrice: "",
    maxPrice: "",
    sort:     "default",
    inStock:  false,
  });

  useEffect(() => {
    setFilters(f => ({
      ...f,
      search:   searchParams.get("search") ?? "",
      category: searchParams.get("category_name") ?? "",
    }));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts(filters)
      .then(r => { if (!cancelled) setProducts(r.products.length ? r.products : SAMPLE_PRODUCTS); })
      .catch(() => { if (!cancelled) setProducts(SAMPLE_PRODUCTS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.search, filters.category, filters.minPrice, filters.maxPrice]);

  const displayed = useMemo(() => {
    let list = sortProducts(products, filters.sort);
    if (filters.inStock) list = list.filter(p => p.stock > 0);
    return list;
  }, [products, filters.sort, filters.inStock]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters(f => ({ ...f, [k]: v }));

  const clearAll = () =>
    setFilters({ search: "", category: "", minPrice: "", maxPrice: "", sort: "default", inStock: false });

  const activeChips = [
    filters.category && { key: "category", label: filters.category,                    clear: () => set("category", "") },
    filters.inStock  && { key: "inStock",  label: "In Stock Only",                     clear: () => set("inStock", false) },
    filters.sort !== "default" && { key: "sort", label: `Sort: ${filters.sort.replace("_", " ")}`, clear: () => set("sort", "default") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-7">

      {/* ── Promo banner ── */}
      <div className="mb-7 flex items-center justify-between gap-4 overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-white">
          <span className="text-2xl flex-shrink-0">🚚</span>
          <div>
            <p className="text-[15px] font-bold leading-tight">Special Offer: Free shipping on orders over 500 ETB</p>
            <p className="text-[12px] text-white/75 mt-0.5">No promo code needed — just add to cart and enjoy free delivery.</p>
          </div>
        </div>
        <a href="#products-grid">
          <button className="flex-shrink-0 rounded-lg bg-white px-5 py-2 text-[13px] font-bold text-brand-700 hover:bg-gray-50 active:scale-95 transition shadow-sm">
            Shop Now
          </button>
        </a>
      </div>

      {/* ── Page title ── */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100">
          {filters.category || "All Products"}
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading products…"
            : <><span className="font-semibold text-gray-800 dark:text-gray-200">{displayed.length}</span> results found</>
          }
        </p>
      </div>

      {/* ── Filter / sort bar ── */}
      <div
        id="products-grid"
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1e2130] px-5 py-3 shadow-sm"
      >
        {/* Active chips */}
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.length > 0 ? (
            <>
              <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500">Filters:</span>
              {activeChips.map(chip => (
                <button key={chip.key} onClick={chip.clear}
                  className="flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[12px] font-semibold text-brand-700 hover:bg-brand-100 transition">
                  {chip.label}
                  <svg className="h-3 w-3 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              <button onClick={clearAll} className="text-[12px] font-semibold text-red-500 hover:underline">
                Clear all
              </button>
            </>
          ) : (
            <span className="text-[13px] text-gray-400 dark:text-gray-500">No active filters</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* In stock toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition">
            <div onClick={() => set("inStock", !filters.inStock)}
              className={`relative h-4 w-8 rounded-full transition-colors ${filters.inStock ? "bg-brand-600" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${filters.inStock ? "left-4" : "left-0.5"}`} />
            </div>
            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">In Stock</span>
          </label>

          {/* Sort */}
          <select value={filters.sort} onChange={e => set("sort", e.target.value as SortKey)}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2130] px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 focus:border-brand-500 focus:outline-none transition">
            <option value="default">Sort: Default</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name_asc">Name: A → Z</option>
          </select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            {(["grid", "list"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex h-9 w-9 items-center justify-center transition ${
                  view === v ? "bg-brand-600 text-white" : "bg-white dark:bg-[#1e2130] text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
                aria-label={`${v} view`}>
                {v === "grid" ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product grid ── */}
      {loading ? (
        <div className={view === "grid"
          ? "grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col gap-4"}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div layout
          className={view === "grid"
            ? "grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4"
            : "flex flex-col gap-4"}>
          <AnimatePresence>
            {displayed.map(product => (
              <ProductCard key={product.id} product={product} view={view} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && displayed.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl">🔍</p>
          <p className="text-[18px] font-semibold text-gray-700 dark:text-gray-300">No products found</p>
          <p className="text-[14px] text-gray-400 dark:text-gray-500">Try adjusting your filters or search term</p>
          <button onClick={clearAll}
            className="mt-2 rounded-lg bg-brand-600 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 transition">
            Clear Filters
          </button>
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-[1200px] px-5 py-7">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
