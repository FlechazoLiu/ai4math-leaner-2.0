"use client";

import LeanPlayground from "@/components/LeanPlayground";

//
// Playground page — wraps the standalone Lean editor in a minimal shell.
//
// NOTE: sidebar is always visible on this page (no /submit in path),
//       so the Dashboard back button is unnecessary.
//
// FUTURE:
// - Add workspace selector / recent files
// - Add share link functionality
// - Add keyboard shortcut help modal
// - Wrap LeanPlayground in a workspace context provider

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      {/* Minimal header — just the title, nav is in sidebar */}
      <header className="flex items-center px-6 py-3 border-b bg-white shrink-0">
        <h1 className="text-lg font-semibold">Lean Playground</h1>
      </header>

      {/* Editor */}
      <LeanPlayground />
    </div>
  );
}
