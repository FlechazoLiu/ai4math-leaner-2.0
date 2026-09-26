"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Send,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { Lean4CodeBlock } from "@/components/CodeBlock";
import LeanMonacoEditor from "@/components/LeanMonacoEditor";
import LeanConsole from "@/components/LeanConsole";
import SmartAssistPanel from "@/components/SmartAssistPanel";

// ─── Types ────────────────────────────────────────────────────────────────

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

interface AnswerEditorProps {
  questionId: string;
  questionTitle: string;
  informalDescription: string;
  formalDescription?: string;
  existingInformal?: string;
  existingFormal?: string;
  isEditing?: boolean;
  onSubmit: (informal: string, formal: string, isDraft?: boolean) => Promise<void>;
  submitLabel?: string;
  backUrl: string;
  submitAsDraft?: boolean; // If true, shows draft/submit toggle
}

// ─── Constants ────────────────────────────────────────────────────────────

const DRAFT_KEY_PREFIX = "leaner-draft-";
const DEBOUNCE_MS = 500;

// ─── Component ────────────────────────────────────────────────────────────

export default function AnswerEditor({
  questionId,
  questionTitle,
  informalDescription,
  formalDescription,
  existingInformal = "",
  existingFormal = "",
  isEditing = false,
  onSubmit,
  submitLabel,
  backUrl,
  submitAsDraft = false,
}: AnswerEditorProps) {
  // ─── Form state ──────────────────────────────────────────────────────────
  const [informalAnswer, setInformalAnswer] = useState(existingInformal);
  const [formalAnswer, setFormalAnswer] = useState(
    existingFormal || formalDescription || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitAsDraftValue, setSubmitAsDraftValue] = useState(submitAsDraft);

  // ─── Self-test state ─────────────────────────────────────────────────────
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // ─── UI state ────────────────────────────────────────────────────────────
  const [problemCollapsed, setProblemCollapsed] = useState(false);
  const monacoEditorRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // ─── Draft restore state ─────────────────────────────────────────────────
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // ─── Refs ────────────────────────────────────────────────────────────────
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const verifyAbortRef = useRef<AbortController | null>(null);

  // ─── Draft key ───────────────────────────────────────────────────────────
  const draftKey = `${DRAFT_KEY_PREFIX}${questionId}`;

  // ─── Load draft on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        // Only prompt restore if there's content and it's newer than existing
        if (
          (draft.informalAnswer || draft.formalAnswer) &&
          !isEditing
        ) {
          setShowDraftDialog(true);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save to localStorage ───────────────────────────────────────────
  const saveDraft = useCallback(
    (informal: string, formal: string) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            informalAnswer: informal,
            formalAnswer: formal,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // localStorage full or unavailable
      }
    },
    [draftKey],
  );

  const handleInformalChange = (value: string) => {
    setInformalAnswer(value);
    scheduleAutoSave(value, formalAnswer);
  };

  const handleFormalChange = (value: string | undefined) => {
    const v = value ?? "";
    setFormalAnswer(v);
    scheduleAutoSave(informalAnswer, v);
  };

  const scheduleAutoSave = (informal: string, formal: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveDraft(informal, formal);
    }, DEBOUNCE_MS);
  };

  // ─── Monaco editor mount ─────────────────────────────────────────────────
  const handleEditorMount = useCallback((editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    monacoEditorRef.current = editor;
  }, []);

  // ─── Insert text at cursor position ──────────────────────────────────────
  const handleInsertAtCursor = useCallback((text: string) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    const position = editor.getPosition();
    if (!position) return;

    editor.executeEdits("smart-assist", [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: text,
        forceMoveMarkers: true,
      },
    ]);

    editor.focus();
  }, []);

  // ─── Restore draft ───────────────────────────────────────────────────────
  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.informalAnswer) setInformalAnswer(draft.informalAnswer);
        if (draft.formalAnswer) setFormalAnswer(draft.formalAnswer);
        toast.success("Draft restored");
      }
    } catch {
      // ignore
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setShowDraftDialog(false);
  };

  // ─── Self-test ───────────────────────────────────────────────────────────
  const handleSelfTest = async () => {
    if (!formalAnswer.trim()) {
      toast.error("Please write some Lean code first");
      return;
    }

    // Cancel any previous self-test
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
        body: JSON.stringify({ code: formalAnswer }),
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
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setVerifyResult({
        success: false,
        messages: [{ data: `Network error: ${errorMessage}`, severity: "error" }],
        sorries: [],
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!informalAnswer.trim()) {
      toast.error("Please provide a natural language answer");
      return;
    }

    if (!submitAsDraftValue && !formalAnswer.trim()) {
      toast.error("Please provide a Lean 4 formal answer or save as draft");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setIsSubmitting(true);

    try {
      await onSubmit(informalAnswer.trim(), formalAnswer.trim(), submitAsDraftValue);
      // Clear draft on successful submission
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (verifyAbortRef.current) verifyAbortRef.current.abort();
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ===== Header ===== */}
      <header className="flex items-center gap-3 px-6 py-3 border-b bg-white shrink-0">
        <Button variant="outline" size="sm" asChild>
          <a href={backUrl}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </a>
        </Button>
        <h1 className="text-lg font-semibold truncate flex-1">
          {questionTitle}
        </h1>
      </header>

      {/* ===== Main content ===== */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Problem + Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Problem Statement (collapsible) */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setProblemCollapsed(!problemCollapsed)}
              className="flex items-center gap-2 w-full px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {problemCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              <span>Problem</span>
              <span className="text-xs text-gray-400">
                {problemCollapsed ? "Show" : "Hide"}
              </span>
            </button>

            {!problemCollapsed && (
              <div className="px-6 pb-4 space-y-3">
                <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg border p-3">
                  <Markdown content={informalDescription} />
                </div>

                {formalDescription && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Template Code
                    </h3>
                    <Lean4CodeBlock code={formalDescription} className="text-sm rounded-lg" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
            {/* Informal answer */}
            <div className="shrink-0">
              <Textarea
                placeholder="Describe your solution in detail..."
                value={informalAnswer}
                onChange={(e) => handleInformalChange(e.target.value)}
                className="resize-none h-16 text-sm"
              />
            </div>

            {/* Formal answer - Monaco Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">
                  Lean 4 Code
                </span>
                <span className="text-xs text-gray-400">
                  {formalAnswer.split("\n").length} lines
                </span>
              </div>
              <div className="flex-1 border rounded-lg overflow-hidden">
                <LeanMonacoEditor
                  value={formalAnswer}
                  onChange={handleFormalChange}
                  onEditorMount={handleEditorMount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Console + Smart Assist */}
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

      {/* ===== Toolbar ===== */}
      <div className="flex items-center gap-2 px-4 py-2 border-t bg-white shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={handleSelfTest}
          disabled={isVerifying || !formalAnswer.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isVerifying ? (
            <>
              <span className="animate-pulse">Verifying...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1.5" />
              Verify
            </>
          )}
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => saveDraft(informalAnswer, formalAnswer)}
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Save
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleFormSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1.5" />
              {submitLabel || (isEditing ? "Update" : submitAsDraftValue ? "Save Draft" : "Submit")}
            </>
          )}
        </Button>
      </div>

      {/* ===== Confirm dialog ===== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {submitAsDraftValue ? "Save as Draft" : "Confirm Submission"}
            </DialogTitle>
            <DialogDescription>
              {submitAsDraftValue
                ? "Your answer will be saved as a draft and won't appear in review queues until formally submitted."
                : "Your answer will be submitted for grading and cannot be easily modified afterwards."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
            <div>
              <span className="font-medium">Natural Language Answer:</span>
              <p className="text-muted-foreground mt-1 text-xs line-clamp-3 whitespace-pre-wrap">
                {informalAnswer}
              </p>
            </div>
            {formalAnswer && (
              <div>
                <span className="font-medium">Formal Answer (Lean 4):</span>
                <pre className="text-xs mt-1 bg-gray-100 p-2 rounded max-h-24 overflow-auto font-mono">
                  {formalAnswer}
                </pre>
              </div>
            )}

            {/* Draft toggle inside dialog */}
            {submitAsDraft && (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pt-2 border-t">
                <input
                  type="checkbox"
                  checked={submitAsDraftValue}
                  onChange={(e) => setSubmitAsDraftValue(e.target.checked)}
                  className="rounded"
                />
                Save as draft (can submit formally later)
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : submitAsDraftValue
                  ? "Save Draft"
                  : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Draft restore dialog ===== */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Unsaved Draft Found
            </DialogTitle>
            <DialogDescription>
              You have an unsaved draft from a previous session. Would you like to restore it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDiscardDraft}>
              Discard
            </Button>
            <Button onClick={handleRestoreDraft}>
              Restore Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
