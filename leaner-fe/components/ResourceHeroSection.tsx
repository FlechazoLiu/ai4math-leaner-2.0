"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ResourceHeroSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  // Sync the search input with the URL (e.g. when navigating back/forward)
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }

      const newUrl = `/dashboard/resources${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [],
  );

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-8 text-8xl select-none">λ</div>
        <div className="absolute bottom-4 left-8 text-6xl select-none">∀</div>
        <div className="absolute top-12 left-1/3 text-5xl select-none">∃</div>
      </div>

      <div className="relative px-8 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Icon + Title */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Lean LearningResources
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              A collection of high-quality learning resources, interactive practice platforms, theorem search tools, and active community channels for the Lean 4 theorem prover — from beginner to advanced, meeting all your learning needs in one place.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder='Search resource names or concepts, e.g. "Mathlib" or "Inductive"...'
              className="pl-12 pr-4 h-14 text-base bg-white/90 backdrop-blur border-gray-200 shadow-lg rounded-xl focus-visible:ring-blue-500"
            />
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
            <span>Popular searches:</span>
            {["Mathlib", "Tactics", "Installation", "Beginner", "Theorem Search"].map(
              (keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => setQuery(keyword)}
                  className="px-2.5 py-0.5 rounded-full bg-white/80 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  {keyword}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
