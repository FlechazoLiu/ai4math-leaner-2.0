import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: "inline" | "banner";
}

export function ErrorAlert({
  error,
  onDismiss,
  className = "",
  variant = "inline",
}: ErrorAlertProps) {
  if (!error) return null;

  const baseClasses =
    "flex items-start gap-3 p-4 border border-red-200 bg-red-50 text-red-800 rounded-lg";
  const variantClasses = variant === "banner" ? "w-full" : "";

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ErrorBoundaryAlertProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBoundaryAlert({
  error,
  onRetry,
  onDismiss,
  className = "",
}: ErrorBoundaryAlertProps) {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return (
    <div
      className={`border border-red-200 bg-red-50 text-red-800 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-4">{errorMessage}</p>
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-transparent text-red-600 text-sm font-medium rounded-md border border-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
