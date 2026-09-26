"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Download,
  Copy,
  Trash2,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import LeanMonacoEditor from "@/components/LeanMonacoEditor";
import LeanConsole from "@/components/LeanConsole";
import SmartAssistPanel from "@/components/SmartAssistPanel";

// ─── Types ────────────────────────────────────────────────────────────────
//
// FUTURE: move to shared types file when multi-file support is added
interface ConsoleMessage {
  data: string;
  severity: string;
  start_pos?: { line: number; column: number } | null;
  end_pos?: { line: number; column: number } | null;
}

interface ConsoleSorry {
  goal: string;
  proof_state?: number | null;
  start_pos?: { line: number; column: number } | null;
}

interface VerifyResult {
  success: boolean;
  messages: ConsoleMessage[];
  sorries: ConsoleSorry[];
}

// ─── Constants ────────────────────────────────────────────────────────────
//
// FUTURE: move to a config file or settings context
const STORAGE_KEY = "leaner-playground-code";
const VERIFY_DEBOUNCE_MS = 300;

// ─── Component ────────────────────────────────────────────────────────────
//
// LeanPlayground — standalone Lean 4 editor with verification and theorem search.
//
// FUTURE EXTENSIONS:
// - Multi-file support: promote `code` to `Map<string, string>`, wrap in workspace context
// - File tree: add a left sidebar with file explorer
// - Settings: add font size, theme, keybindings controls
// - Project state: add workspace save/load, git integration

// FUTURE props:
//   initialFiles?: Map<string, string>
//   workspaceId?: string
//   readOnly?: boolean

export default function LeanPlayground() {
  // ─── Editor state ─────────────────────────────────────────────────────
  // FUTURE: promote to workspace store (e.g. zustand or context)
  const [code, setCode] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Verification state ───────────────────────────────────────────────
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const verifyAbortRef = useRef<AbortController | null>(null);

  // ─── Editor ref (for cursor insertion) ────────────────────────────────
  // FUTURE: move to editor context when multiple editors are supported
  const monacoEditorRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // ─── File input ref (for import) ─────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Restore saved code on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCode(saved);
      }
    } catch {
      // localStorage unavailable
    }
    setIsLoaded(true);
  }, []);

  // ─── Auto-save to localStorage ───────────────────────────────────────
  // FUTURE: replace with workspace-level persistence (IndexedDB, file system API)
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // storage full
      }
    }, VERIFY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, isLoaded]);

  // ─── Monaco editor mount ─────────────────────────────────────────────
  const handleEditorMount = useCallback((editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    monacoEditorRef.current = editor;
  }, []);

  // ─── Insert text at cursor ───────────────────────────────────────────
  // FUTURE: support multi-cursor and selection replacement
  const handleInsertAtCursor = useCallback((text: string) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    const position = editor.getPosition();
    if (!position) return;

    editor.executeEdits("playground-insert", [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text,
        forceMoveMarkers: true,
      },
    ]);

    editor.focus();
  }, []);

  // ─── Verify ──────────────────────────────────────────────────────────
  // FUTURE: support partial verification (selected code), incremental checking
  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please write some Lean code first");
      return;
    }

    if (verifyAbortRef.current) {
      verifyAbortRef.current.abort();
    }
    verifyAbortRef.current = new AbortController();

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const resp = await fetch("/api/self-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
        signal: verifyAbortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setVerifyResult({
          success: false,
          messages: [{ data: err.error || "Verifier request failed", severity: "error" }],
          sorries: [],
        });
        return;
      }

      const data = await resp.json();
      setVerifyResult({
        success: data.success ?? false,
        messages: data.messages ?? [],
        sorries: data.sorries ?? [],
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setVerifyResult({
        success: false,
        messages: [{ data: `Network error: ${msg}`, severity: "error" }],
        sorries: [],
      });
    } finally {
      setIsVerifying(false);
    }
  }, [code]);

  // ─── Download as .lean file ──────────────────────────────────────────
  // FUTURE: support downloading multiple files as zip
  const handleDownload = useCallback(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Nothing to download");
      return;
    }

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playground.lean";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as playground.lean");
  }, [code]);

  // ─── Copy to clipboard ──────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [code]);

  // ─── Clear editor ───────────────────────────────────────────────────
  // FUTURE: show confirmation dialog; support undo
  const handleClear = useCallback(() => {
    setCode("");
    setVerifyResult(null);
    monacoEditorRef.current?.focus();
    toast.success("Editor cleared");
  }, []);

  // ─── Import .lean file ──────────────────────────────────────────────
  // FUTURE: support drag-and-drop, multiple file import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith(".lean")) {
      toast.error("Please select a .lean file");
      e.target.value = ""; // reset so same file can be picked again
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        setCode(content);
        setVerifyResult(null);
        toast.success(`Imported: ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported
    e.target.value = "";
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (verifyAbortRef.current) verifyAbortRef.current.abort();
    };
  }, []);

  // ─── Loading state ──────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────
  // Handled inline — Monaco editor shows its own placeholder when value is empty.

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={handleVerify}
          disabled={isVerifying || !code.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isVerifying ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Play className="h-4 w-4 mr-1.5" />
          )}
          Verify
        </Button>

        <div className="w-px h-5 bg-gray-200" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".lean"
          onChange={handleFileSelected}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          Import
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!code.trim()}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!code.trim()}
        >
          <Copy className="h-4 w-4 mr-1.5" />
          Copy
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!code.trim()}
          className="text-red-500 hover:text-red-600 hover:border-red-200"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
      </div>

      {/* Editor + Right Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Monaco Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 border-r border-gray-200">
            <LeanMonacoEditor
              value={code}
              onChange={(v) => setCode(v ?? "")}
              onEditorMount={handleEditorMount}
            />
          </div>
        </div>

        {/* Right Panel: Console + Smart Assist */}
        <div className="w-80 shrink-0 border-l border-gray-200 flex flex-col bg-gray-50">
          {/* Console */}
          <div className="flex-[2] min-h-0 border-b border-gray-200 flex flex-col">
            <LeanConsole
              verifying={isVerifying}
              result={verifyResult}
              className="flex-1"
            />
          </div>

          {/* Smart Assist Panel */}
          <div className="flex-[3] min-h-0 flex flex-col">
            <SmartAssistPanel
              onInsert={handleInsertAtCursor}
              sorries={verifyResult?.sorries ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
