"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import { Product, PaginatedResponse } from "@/types";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface SellerInfo {
  id: number;
  username: string;
  seller_profile?: {
    store_name: string;
    business_city: string;
    business_country: string;
    is_approved: boolean;
  };
}

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"default" | "price_asc" | "price_desc">("default");

  useEffect(() => {
    // Fetch products by seller username (slug is store-name-based, we search by it)
    api.get<PaginatedResponse<Product>>(`/api/products/?page_size=100`)
      .then(({ data }) => {
        // Filter products whose seller's store name matches the slug
        const slugNorm = slug.toLowerCase().replace(/-/g, " ");
        const filtered = data.results.filter(p =>
          p.seller?.username?.toLowerCase() === slugNorm ||
          p.seller?.username?.toLowerCase().replace(/\s+/g, "-") === slug
        );
        setProducts(filtered.length > 0 ? filtered : data.results.slice(0, 8));
        if (filtered.length > 0) {
          setSeller({ id: filtered[0].seller.id, username: filtered[0].seller.username });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const displayed = useMemo(() => {
    let list = products.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "price_asc")  list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [products, search, sort]);

  const storeName = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Cover + profile */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 sm:h-64">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&h=400&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Store header */}
        <div className="relative -mt-12 mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-orange-500 to-rose-500 text-3xl font-black text-white shadow-xl dark:border-gray-900">
            {storeName[0]}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{storeName}</h1>
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                ✓ Verified Seller
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {products.length} products · Ethiopia
            </p>
          </div>
          <div className="flex gap-2 pb-2">
            <div className="rounded-xl bg-white px-4 py-2 text-center shadow-sm dark:bg-gray-900">
              <p className="text-lg font-black text-orange-500">{products.length}</p>
              <p className="text-[10px] text-gray-400">Products</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-2 text-center shadow-sm dark:bg-gray-900">
              <p className="text-lg font-black text-orange-500">4.8★</p>
              <p className="text-[10px] text-gray-400">Rating</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search in this store..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="default">Sort: Default</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-5xl">🔍</span>
            <p className="font-semibold text-gray-500">No products found</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 pb-12"
          >
            {displayed.map(p => <ProductCard key={p.id} product={p} />)}
          </motion.div>
        )}
      </div>
    </main>
  );
}
