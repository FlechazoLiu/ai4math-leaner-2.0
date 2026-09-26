"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Loader2,
  AlertCircle,
  Copy,
  Sparkles,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ConsoleSorry {
  goal: string;
  proof_state?: number | null;
  start_pos?: { line: number; column: number } | null;
}

interface PremiseResult {
  name: string;
  formal_type?: string;
  module?: string;
  score?: number;
}

interface InStateSearchProps {
  onInsert: (theoremName: string) => void;
  goals: ConsoleSorry[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InStateSearch({ onInsert, goals }: InStateSearchProps) {
  const [results, setResults] = useState<PremiseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const currentGoal = goals[0]?.goal ?? null;

  const performSearch = useCallback(
    async (goalText: string) => {
      if (!goalText.trim()) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const resp = await fetch("/api/instate-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: goalText }),
          signal: abortRef.current.signal,
        });

        const data = await resp.json();

        if (!resp.ok) {
          setError(data.error || "Search failed");
          setResults([]);
          return;
        }

        setResults(data.results ?? []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Network error: ${msg}`);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Auto-search when goal changes
  useEffect(() => {
    if (currentGoal) {
      performSearch(currentGoal);
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [currentGoal, performSearch]);

  const handleInsert = (name: string) => {
    onInsert(name);
    toast.success(`Inserted: ${name}`);
  };

  // No goals (not run self-test yet)
  if (!currentGoal) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
        <Target className="h-8 w-8 mb-2" />
        <p className="text-sm">No proof state available</p>
        <p className="text-xs mt-1">
          Run a self-test first to see premise recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Current goal preview */}
      <div className="p-3 border-b bg-blue-50/30">
        <div className="flex items-center gap-2 mb-1.5">
          <Target className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Current Goal
          </span>
          {goals.length > 1 && (
            <span className="text-xs text-blue-400">
              +{goals.length - 1} more
            </span>
          )}
        </div>
        <pre className="text-xs text-blue-900 bg-white rounded border border-blue-200 p-2 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {currentGoal}
        </pre>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">
            Finding relevant theorems from mathlib...
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-blue-600"
            onClick={() => performSearch(currentGoal)}
            disabled={loading}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Results area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 text-blue-600">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span className="text-sm">Searching for relevant theorems...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Search Error</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Empty results */}
          {!loading && !error && searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Target className="h-8 w-8 mb-2" />
              <p className="text-sm">No relevant theorems found</p>
              <p className="text-xs mt-1">
                Try completing part of the proof first, then re-run self-test
              </p>
            </div>
          )}

          {/* Header: result count */}
          {!loading && results.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Found {results.length} relevant theorem{results.length > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Results list */}
          {results.map((result, i) => (
            <div
              key={i}
              className="rounded-lg border border-blue-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              {/* Theorem name + insert */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Terminal className="h-4 w-4 text-blue-500 shrink-0" />
                  <code className="text-sm font-semibold text-blue-700">
                    {result.name}
                  </code>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {result.score != null && (
                    <span className="text-xs text-gray-400">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Insert at cursor"
                    onClick={() => handleInsert(result.name)}
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" />
                  </Button>
                </div>
              </div>

              {/* Type signature */}
              {result.formal_type && (
                <div className="mb-1.5">
                  <code className="text-xs text-gray-600 bg-gray-50 rounded px-1.5 py-0.5 block leading-relaxed">
                    {result.formal_type}
                  </code>
                </div>
              )}

              {/* Module source */}
              {result.module && (
                <p className="text-xs text-gray-400 mb-1.5">
                  from <span className="font-mono">{result.module}</span>
                </p>
              )}

              {/* Insert button */}
              <Button
                variant="default"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleInsert(result.name)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Insert
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
