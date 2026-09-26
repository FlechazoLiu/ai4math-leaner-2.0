"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Target,
  AlertTriangle,
  Info,
  Play,
} from "lucide-react";

interface ConsoleMessage {
  data: string;
  severity: string; // "error" | "warning" | "info"
  start_pos?: { line: number; column: number } | null;
  end_pos?: { line: number; column: number } | null;
}

interface ConsoleSorry {
  goal: string;
  proof_state?: number | null;
  start_pos?: { line: number; column: number } | null;
}

interface LeanConsoleProps {
  verifying: boolean;
  result: {
    success: boolean;
    messages: ConsoleMessage[];
    sorries: ConsoleSorry[];
  } | null;
  className?: string;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "error":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
    default:
      return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "error":
      return "border-red-200 bg-red-50";
    case "warning":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-blue-200 bg-blue-50";
  }
}

export default function LeanConsole({
  verifying,
  result,
  className = "",
}: LeanConsoleProps) {
  const errorCount =
    result?.messages?.filter((m) => m.severity === "error").length ?? 0;
  const warningCount =
    result?.messages?.filter((m) => m.severity === "warning").length ?? 0;
  const goalCount = result?.sorries?.length ?? 0;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Console
        </span>

        {verifying && (
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verifying...
          </span>
        )}

        {!verifying && result && (
          <>
            {result.success ? (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Failed
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-xs text-red-500">{errorCount} error{errorCount > 1 ? "s" : ""}</span>
            )}
            {warningCount > 0 && (
              <span className="text-xs text-amber-500">{warningCount}</span>
            )}
            {goalCount > 0 && (
              <span className="text-xs text-blue-500">{goalCount} goal{goalCount > 1 ? "s" : ""}</span>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2 font-mono text-xs">
          {/* Verifying state */}
          {verifying && (
            <div className="flex items-center gap-2 text-blue-600 py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Running self-test...</span>
            </div>
          )}

          {/* No results yet */}
          {!verifying && !result && (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-center">
              <Play className="h-6 w-6 mb-1.5" />
              <p className="text-xs">Run Verify to check your code</p>
            </div>
          )}

          {/* Results */}
          {!verifying && result && (
            <>
              {/* Summary line */}
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  result.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>
                  {result.success
                    ? "Code verified successfully!"
                    : `Verification failed`}
                  {` — ${errorCount} error${errorCount !== 1 ? "s" : ""}${warningCount > 0 ? `, ${warningCount} warning${warningCount !== 1 ? "s" : ""}` : ""}${goalCount > 0 ? `, ${goalCount} goal${goalCount !== 1 ? "s" : ""}` : ""}`}
                </span>
              </div>

              {/* Messages */}
              {result.messages.length > 0 && (
                <div className="space-y-1.5">
                  {result.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-1.5 rounded border p-1.5 ${getSeverityColor(
                        msg.severity,
                      )}`}
                    >
                      {getSeverityIcon(msg.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium uppercase text-gray-500">
                          {msg.severity}
                          {msg.start_pos?.line != null &&
                            ` (line ${msg.start_pos.line})`}
                        </div>
                        <div className="text-gray-800 whitespace-pre-wrap break-words text-xs">
                          {msg.data}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Proof state goals */}
              {result.sorries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                    <Target className="h-3.5 w-3.5" />
                    <span>
                      Proof State
                      {result.sorries.length > 1 &&
                        ` (${result.sorries.length} goals)`}
                    </span>
                  </div>
                  {result.sorries.map((s, i) => (
                    <div
                      key={i}
                      className="border border-blue-200 bg-blue-50/50 rounded p-2"
                    >
                      <pre className="text-xs text-blue-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {s.goal}
                      </pre>
                      {s.start_pos?.line != null && (
                        <div className="text-[10px] text-blue-500 mt-0.5">
                          At line {s.start_pos.line}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No errors, no goals — all good */}
              {result.success &&
                result.messages.filter((m) => m.severity === "error")
                  .length === 0 &&
                result.sorries.length === 0 && (
                  <div className="text-green-600 text-xs py-2">
                    No errors and no remaining goals. Your proof is complete!
                  </div>
                )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
