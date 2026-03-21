"use client";

import { cn } from "@/lib/utils";

export interface Filters {
  search: string;
  category: string;
  maxPrice: string;
}

interface Props {
  filters: Filters;
  categories: string[];
  onChange: (filters: Filters) => void;
}

const inputCls = cn(
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition",
  "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
  "focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
);

export default function ProductFilters({ filters, categories, onChange }: Props) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
      <input
        type="text"
        placeholder="Search products..."
        value={filters.search}
        onChange={(e) => set("search", e.target.value)}
        className={cn(inputCls, "flex-1")}
      />
      <select
        value={filters.category}
        onChange={(e) => set("category", e.target.value)}
        className={inputCls}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Max $</span>
        <input
          type="number"
          min={0}
          placeholder="Any"
          value={filters.maxPrice}
          onChange={(e) => set("maxPrice", e.target.value)}
          className={cn(inputCls, "w-24")}
        />
      </div>
    </div>
  );
}
