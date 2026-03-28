"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface PriceSuggestion {
  recommended: number;
  min_market: number;
  max_market: number;
  reasoning?: string;
}

interface Suggestions {
  title_suggestions?: string[];
  description?: string;
  category_suggestion?: string;
  tags?: string[];
  price_suggestion?: PriceSuggestion;
  description_tips?: string[];
  ai_powered?: boolean;
}

interface ImageAnalysis {
  product_type?: string;
  color?: string;
  material?: string;
  style?: string;
  quality_score?: number;
  quality_warning?: string | null;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  confidence?: number;
  ai_powered?: boolean;
  error?: string;
}

interface Props {
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  onApply?: (field: string, value: string) => void;
}

export default function AISellerSuggestions({ name, description, category, price, onApply }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/ai/seller/suggestions", { name, description, category, price });
      setSuggestions(data);
      setOpen(true);
      setActiveTab("text");
    } catch (err: any) {
      // If 403 (not a seller) or 401 (not logged in), show a helpful message
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("Please log in as a seller to use AI suggestions");
      }
      // Still show rule-based fallback
      setSuggestions({ ai_powered: false, description_tips: [
        "Include key features and specifications",
        "Mention material, size, or dimensions",
        "Highlight what makes your product unique",
        "Add warranty or return policy info",
      ]});
      setOpen(true);
      setActiveTab("text");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 4MB for base64)
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4MB");
      return;
    }

    setImageLoading(true);
    setActiveTab("image");
    setOpen(true);

    try {
      const base64 = await fileToBase64(file);
      const { data } = await api.post<ImageAnalysis>("/api/ai/seller/analyze-image", {
        image_base64: base64,
        mime_type: file.type,
      });
      setImageAnalysis(data);

      // Auto-apply detected fields
      if (data.title && onApply) onApply("name", data.title);
      if (data.description && onApply) onApply("description", data.description);
      if (data.category && onApply) onApply("category", data.category);
    } catch {
      setImageAnalysis({ error: "Failed to analyze image. Please try again." });
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm text-white">🤖</div>
          <div>
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">AI Product Assistant</p>
            <p className="text-[10px] text-violet-500 dark:text-violet-400">
              {suggestions?.ai_powered ? "Powered by GPT-4o-mini" : "Smart suggestions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Image upload */}
          <label
            title="Analyze product image"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          >
            {imageLoading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            ) : "📷"}
            {imageLoading ? "Analyzing…" : "Image AI"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          {/* Text suggestions */}
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition"
          >
            {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "✨"}
            {loading ? "Thinking…" : "Get Suggestions"}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              {/* Tabs */}
              {suggestions && imageAnalysis && (
                <div className="mb-3 flex gap-2">
                  {(["text", "image"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        activeTab === tab
                          ? "bg-violet-600 text-white"
                          : "bg-white text-violet-600 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300"
                      }`}>
                      {tab === "text" ? "✨ Text AI" : "📷 Image AI"}
                    </button>
                  ))}
                </div>
              )}

              {/* Text suggestions */}
              {activeTab === "text" && suggestions && (
                <div className="space-y-3">
                  {/* Title suggestions */}
                  {suggestions.title_suggestions && suggestions.title_suggestions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">Suggested titles:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.title_suggestions.filter(Boolean).map((t, i) => (
                          <button key={i} onClick={() => onApply?.("name", t)}
                            className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 transition dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI-generated description */}
                  {suggestions.description && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-violet-700 dark:text-violet-300">Suggested description:</p>
                      <div className="flex items-start gap-2 rounded-lg bg-white p-3 dark:bg-gray-800">
                        <p className="flex-1 text-xs text-gray-700 dark:text-gray-300">{suggestions.description}</p>
                        <button onClick={() => onApply?.("description", suggestions.description!)}
                          className="flex-shrink-0 rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-violet-700 transition">
                          Use
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {suggestions.tags && suggestions.tags.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">Suggested tags:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.tags.map((tag, i) => (
                          <span key={i} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price suggestion */}
                  {suggestions.price_suggestion && (
                    <div className="rounded-lg bg-white p-3 dark:bg-gray-800">
                      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">💰 Market Price Analysis</p>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-lg font-black text-violet-600">{suggestions.price_suggestion.recommended.toLocaleString()} ETB</p>
                          <p className="text-[10px] text-gray-400">Recommended</p>
                        </div>
                        <div className="flex-1 text-xs text-gray-500 dark:text-gray-400">
                          Range: {suggestions.price_suggestion.min_market.toLocaleString()} – {suggestions.price_suggestion.max_market.toLocaleString()} ETB
                          {suggestions.price_suggestion.reasoning && (
                            <p className="mt-0.5 text-[10px] italic">{suggestions.price_suggestion.reasoning}</p>
                          )}
                        </div>
                        <button onClick={() => onApply?.("price", String(suggestions.price_suggestion!.recommended))}
                          className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 transition">
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Category suggestion */}
                  {suggestions.category_suggestion && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-violet-700 dark:text-violet-300">Suggested category:</p>
                      <button onClick={() => onApply?.("category", suggestions.category_suggestion!)}
                        className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 transition dark:bg-violet-900/30 dark:text-violet-300">
                        {suggestions.category_suggestion}
                      </button>
                    </div>
                  )}

                  {/* Description tips */}
                  {suggestions.description_tips && suggestions.description_tips.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">📝 Tips:</p>
                      <ul className="space-y-1">
                        {suggestions.description_tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                            <span className="mt-0.5 text-violet-400">•</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Image analysis */}
              {activeTab === "image" && imageAnalysis && (
                <div className="space-y-3">
                  {imageAnalysis.error ? (
                    <p className="text-xs text-red-500">{imageAnalysis.error}</p>
                  ) : (
                    <>
                      {/* Quality warning */}
                      {imageAnalysis.quality_warning && (
                        <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                          <span className="text-orange-500">⚠️</span>
                          <p className="text-xs text-orange-700 dark:text-orange-300">{imageAnalysis.quality_warning}</p>
                        </div>
                      )}

                      {/* Detected attributes */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Type", value: imageAnalysis.product_type },
                          { label: "Color", value: imageAnalysis.color },
                          { label: "Material", value: imageAnalysis.material },
                          { label: "Style", value: imageAnalysis.style },
                        ].filter(a => a.value).map(attr => (
                          <div key={attr.label} className="rounded-lg bg-white p-2 dark:bg-gray-800">
                            <p className="text-[10px] text-gray-400">{attr.label}</p>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{attr.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Quality score */}
                      {imageAnalysis.quality_score && (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">Image quality:</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5,6,7,8,9,10].map(i => (
                              <div key={i} className={`h-2 w-2 rounded-full ${i <= imageAnalysis.quality_score! ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-violet-600">{imageAnalysis.quality_score}/10</span>
                        </div>
                      )}

                      {/* Auto-generated title */}
                      {imageAnalysis.title && (
                        <div className="flex items-center gap-2 rounded-lg bg-white p-3 dark:bg-gray-800">
                          <p className="flex-1 text-xs font-semibold text-gray-800 dark:text-gray-100">{imageAnalysis.title}</p>
                          <button onClick={() => onApply?.("name", imageAnalysis.title!)}
                            className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-violet-700 transition">
                            Use Title
                          </button>
                        </div>
                      )}

                      {/* Tags */}
                      {imageAnalysis.tags && imageAnalysis.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {imageAnalysis.tags.map((tag, i) => (
                            <span key={i} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400">
                        ✓ Fields auto-applied to form · Confidence: {((imageAnalysis.confidence || 0) * 100).toFixed(0)}%
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
