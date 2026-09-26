"use client";

import { ReactElement, useState } from "react";
import { ShikiHighlighter } from "react-shiki";

interface CodeBlockProps {
  code: string;
  language?: string;
  theme?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = "lean4",
  theme = "github-dark",
  className = "",
}: CodeBlockProps): ReactElement {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const copyToClipboard = async () => {
    try {
      // Method 1: Try modern Clipboard API (only works in secure contexts - HTTPS/localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        setCopyStatus("success");
        return;
      }

      // Method 2: Legacy execCommand fallback (works in most browsers, even HTTP)
      const success = await legacyClipboardCopy(code);
      if (success) {
        setCopyStatus("success");
        return;
      }

      // Method 3: Manual copy modal as last resort
      showManualCopyModal(code);
      setCopyStatus("success"); // Consider it successful since user can manually copy
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Try legacy method if modern method failed
      try {
        const success = await legacyClipboardCopy(code);
        if (success) {
          setCopyStatus("success");
        } else {
          showManualCopyModal(code);
          setCopyStatus("success");
        }
      } catch (legacyErr) {
        console.error("Legacy copy also failed: ", legacyErr);
        showManualCopyModal(code);
        setCopyStatus("success");
      }
    }

    // Reset status after 2 seconds
    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const legacyClipboardCopy = (text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Create a temporary textarea element
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Position it off-screen but ensure it's not completely hidden
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");
      textArea.setAttribute("aria-hidden", "true");

      document.body.appendChild(textArea);

      try {
        // Focus and select the text
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);

        // Execute the copy command
        const successful = document.execCommand("copy");

        // Clean up
        document.body.removeChild(textArea);

        resolve(successful);
      } catch (err) {
        // Clean up on error
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea);
        }
        console.error("Legacy copy failed:", err);
        resolve(false);
      }
    });
  };

  const showManualCopyModal = (text: string) => {
    // Create a modal for manual copying
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 90vw;
      max-height: 80vh;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    `;

    modalContent.innerHTML = `
      <div style="margin-bottom: 16px; font-weight: bold; font-size: 18px;">
        Copy Code
      </div>
      <div style="margin-bottom: 12px; color: #666; font-size: 14px;">
        Automatic copying isn't available. Please select all text below and copy manually:
      </div>
      <textarea
        readonly
        style="
          width: 100%;
          min-width: 400px;
          height: 200px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          resize: vertical;
          background: #f8f9fa;
          margin-bottom: 16px;
        "
      >${text}</textarea>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button
          id="selectAllBtn"
          style="
            padding: 8px 16px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          Select All
        </button>
        <button
          id="closeBtn"
          style="
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          Close
        </button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Get elements
    const textarea = modalContent.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    const selectAllBtn = modalContent.querySelector(
      "#selectAllBtn",
    ) as HTMLButtonElement;
    const closeBtn = modalContent.querySelector(
      "#closeBtn",
    ) as HTMLButtonElement;

    // Auto-select text initially
    textarea.focus();
    textarea.select();

    // Select all button handler
    selectAllBtn.addEventListener("click", () => {
      textarea.focus();
      textarea.select();
    });

    // Close button handler
    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    closeBtn.addEventListener("click", closeModal);

    // Close on background click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Auto-close after 60 seconds
    setTimeout(() => {
      closeModal();
      document.removeEventListener("keydown", handleEscape);
    }, 60000);
  };

  const getButtonContent = () => {
    switch (copyStatus) {
      case "success":
        return (
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-4 h-4 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  const getButtonTitle = () => {
    switch (copyStatus) {
      case "success":
        return "Copied!";
      case "error":
        return "Copy failed";
      default:
        return "Copy code";
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-gray-200 ${className}`}
    >
      <div className="relative w-full rounded-lg overflow-hidden">
        <ShikiHighlighter language={language} theme={theme}>
          {code}
        </ShikiHighlighter>
        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className={`absolute top-2 right-2 p-2 rounded-md transition-all duration-200 ${
            copyStatus === "success"
              ? "bg-green-100 hover:bg-green-200"
              : copyStatus === "error"
                ? "bg-red-100 hover:bg-red-200"
                : "bg-gray-700/10 hover:bg-gray-700/20"
          }`}
          title={getButtonTitle()}
          disabled={copyStatus !== "idle"}
        >
          {getButtonContent()}
        </button>
      </div>
    </div>
  );
}

// Lean4-specific preset component
export function Lean4CodeBlock({
  code,
  className,
}: Omit<CodeBlockProps, "language">) {
  return <CodeBlock code={code} language="lean4" className={className} />;
}
