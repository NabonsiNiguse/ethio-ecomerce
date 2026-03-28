"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import api from "@/lib/axios";

interface Product {
  id: number;
  name: string;
  price: string;
  category: { name: string };
  images: { image_url: string }[];
  stock: number;
}

interface ShopperResult {
  response: string;
  products: Product[];
  reasoning: { product_id: number; reason: string }[];
  query_analysis: {
    budget_max: number | null;
    recipient: string | null;
    occasion: string | null;
    category: string | null;
  };
}

interface Message {
  role: "user" | "assistant";
  text: string;
  result?: ShopperResult;
}

const EXAMPLES = [
  "Best phone under 5000 ETB",
  "Gift for a 5-year-old who likes space",
  "Cheap blue shoes for running",
  "Birthday gift for my wife under 2000 ETB",
  "Electronics for home office",
  "Beauty products under 1000 ETB",
];

export default function AIShopperPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async (query: string) => {
    if (!query.trim() || loading) return;
    const userMsg: Message = { role: "user", text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post<ShopperResult>("/api/ai/personal-shopper", { query, limit: 6 });
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.response,
        result: data,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, I couldn't process your request. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-3xl shadow-lg shadow-violet-500/25">
          🛍️
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">AI Personal Shopper</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Tell me what you're looking for and I'll find the perfect products from our catalog
        </p>
      </div>

      {/* Chat area */}
      <div className="mb-4 min-h-[300px] space-y-4">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-violet-100 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-900/20">
            <p className="mb-4 text-sm font-semibold text-violet-800 dark:text-violet-300">
              🤖 Hi! I'm your AI personal shopper. Try asking me:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => sendQuery(ex)}
                  className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {ex}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "w-auto" : "w-full"}`}>
                {msg.role === "user" ? (
                  <div className="rounded-2xl rounded-br-sm bg-violet-600 px-4 py-3 text-sm text-white">
                    {msg.text}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm dark:bg-violet-900/30">
                        🤖
                      </div>
                      <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                        {msg.text}
                      </div>
                    </div>

                    {/* Query analysis */}
                    {msg.result?.query_analysis && (
                      <div className="ml-9 flex flex-wrap gap-1.5">
                        {msg.result.query_analysis.budget_max && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Budget: under {msg.result.query_analysis.budget_max} ETB
                          </span>
                        )}
                        {msg.result.query_analysis.recipient && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            For: {msg.result.query_analysis.recipient}
                          </span>
                        )}
                        {msg.result.query_analysis.occasion && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Occasion: {msg.result.query_analysis.occasion}
                          </span>
                        )}
                        {msg.result.query_analysis.category && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Category: {msg.result.query_analysis.category}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Product results */}
                    {msg.result?.products && msg.result.products.length > 0 && (
                      <div className="ml-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {msg.result.products.map(p => {
                          const reasoning = msg.result?.reasoning?.find(r => r.product_id === p.id);
                          const img = p.images?.[0]?.image_url;
                          return (
                            <Link key={p.id} href={`/products/${p.id}`}
                              className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all dark:border-gray-700 dark:bg-gray-800">
                              {img && (
                                <div className="relative h-32 w-full overflow-hidden bg-gray-50 dark:bg-gray-700">
                                  <img src={img} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                </div>
                              )}
                              <div className="p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{p.category?.name}</p>
                                <p className="mt-0.5 text-xs font-semibold text-gray-800 line-clamp-2 dark:text-gray-100">{p.name}</p>
                                <p className="mt-1 text-sm font-bold text-violet-600">{Number(p.price).toLocaleString()} ETB</p>
                                {reasoning && (
                                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">✓ {reasoning.reason}</p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs text-gray-500">Searching products…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-4">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendQuery(input); }}
            placeholder="e.g. Best laptop under 30000 ETB, Gift for mom..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-100"
            disabled={loading}
          />
          <button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Ask AI
          </button>
        </div>
      </div>
    </main>
  );
}
