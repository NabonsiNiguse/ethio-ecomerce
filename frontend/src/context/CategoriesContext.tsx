"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface Category { id: number; name: string; }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CategoriesContext = createContext<Category[]>([]);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch(`${BASE}/api/products/?page_size=100`)
      .then(r => r.json())
      .then(data => {
        const seen = new Set<string>();
        const cats: Category[] = [];
        (data.results ?? []).forEach((p: any) => {
          if (p.category && !seen.has(p.category.name)) {
            seen.add(p.category.name);
            cats.push(p.category);
          }
        });
        if (cats.length > 0) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  return (
    <CategoriesContext.Provider value={categories}>
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);
