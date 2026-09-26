"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  FileText,
  BookOpen,
  AlertCircle,
  Terminal,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SearchResult {
  name: string[];
  type: string;
  docstring?: string;
  doc_url?: string;
  kind?: string;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

interface TheoremSearchProps {
  onInsert: (theoremName: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TheoremSearch({ onInsert }: TheoremSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const resp = await fetch("/api/theorem-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, numResults: 10 }),
        signal: abortRef.current.signal,
      });

      const data: SearchResponse = await resp.json();

      if (!resp.ok) {
        setError(data.error || "Search failed");
        setResults([]);
        return;
      }

      if (data.error) {
        setError(data.error);
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
  }, []);

  // Debounced auto-search
  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => performSearch(value), 300);
    }
  };

  // Manual search on Enter or button click
  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleInsert = (name: string) => {
    onInsert(name);
    toast.success(`Inserted: ${name}`);
  };

  const getKindBadge = (kind?: string) => {
    if (!kind || kind === "theorem") return null;
    return (
      <Badge variant="outline" className="text-xs">
        {kind}
      </Badge>
    );
  };

  const getDocUrl = (name: string[]) => {
    // e.g. "Nat.add_comm" → mathlib4 docs URL
    const full = name.join(".");
    return `https://leanprover-community.github.io/mathlib4_docs/find/${full}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder='Search theorems... e.g. "addition is commutative"'
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Powered by{" "}
          <a
            href="https://leansearch.net"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            LeanSearch
          </a>{" "}
          (PKU AI4Math) &mdash; natural language semantic search
        </p>
      </div>

      {/* Results area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Initial state */}
          {!loading && !error && !searched && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Search className="h-8 w-8 mb-2" />
              <p className="text-sm">
                Search for Lean mathlib theorems using natural language
              </p>
              <p className="text-xs mt-1">
                Try &quot;addition is commutative&quot; or &quot;triangle inequality&quot;
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 text-blue-600">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span className="text-sm">Searching...</span>
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
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">
                Try a different query or use more natural language
              </p>
            </div>
          )}

          {/* Results list */}
          {results.map((result, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              {/* Header: name + kind */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Terminal className="h-4 w-4 text-blue-500 shrink-0" />
                  <code className="text-sm font-semibold text-blue-700 truncate">
                    {result.name.join(".")}
                  </code>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {getKindBadge(result.kind)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Insert at cursor"
                    onClick={() => handleInsert(result.name.join("."))}
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" />
                  </Button>
                </div>
              </div>

              {/* Type signature */}
              {result.type && (
                <div className="mb-1.5">
                  <code className="text-xs text-gray-600 bg-gray-50 rounded px-1.5 py-0.5 block leading-relaxed">
                    {result.type}
                  </code>
                </div>
              )}

              {/* Docstring */}
              {result.docstring && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">
                  {result.docstring}
                </p>
              )}

              {/* Footer: actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleInsert(result.name.join("."))}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Insert
                </Button>
                <a
                  href={getDocUrl(result.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  Docs
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
