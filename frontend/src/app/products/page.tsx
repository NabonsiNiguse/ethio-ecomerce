"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import ProductCard, { Product } from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ProductFilters, { Filters } from "@/components/ProductFilters";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SKELETON_COUNT = 8;

async function fetchProducts(filters: Filters): Promise<Product[]> {
  const params = new URLSearchParams({ page_size: "100" });
  if (filters.search)   params.set("search", filters.search);
  if (filters.category) params.set("category_name", filters.category);
  if (filters.maxPrice) params.set("price_max", filters.maxPrice);

  const res = await fetch(`${BASE}/api/products/?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const urlSearch   = searchParams.get("search") ?? "";
  const urlCategory = searchParams.get("category_name") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filters,  setFilters]  = useState<Filters>({
    search: urlSearch, category: urlCategory, maxPrice: "",
  });

  // Sync URL params → filters
  useEffect(() => {
    setFilters((f) => ({ ...f, search: urlSearch, category: urlCategory }));
  }, [urlSearch, urlCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchProducts(filters)
      .then((results) => { if (!cancelled) setProducts(results); })
      .catch((err)    => { if (!cancelled) setError(`Failed to load products. (${err.message})`); })
      .finally(()     => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.search, filters.category, filters.maxPrice]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category?.name).filter(Boolean) as string[])],
    [products]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {filters.category || "All Products"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {loading ? "Loading…" : `${products.length} result${products.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ProductFilters filters={filters} categories={categories} onChange={setFilters} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
            <p className="text-xs text-red-500 mt-0.5">
              Make sure the Django server is running on{" "}
              <code className="font-mono">{BASE}</code>
            </p>
          </div>
          <button
            onClick={() => setFilters((f) => ({ ...f }))}
            className="ml-auto rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 transition dark:bg-red-900/40 dark:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl">🔍</p>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No products found</p>
          <p className="text-sm text-gray-400">Try a different search or category</p>
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
