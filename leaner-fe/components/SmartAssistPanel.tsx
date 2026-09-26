"use client";

import { useState } from "react";
import { Search, Lightbulb } from "lucide-react";
import TheoremSearch from "@/components/TheoremSearch";
import InStateSearch from "@/components/InStateSearch";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ConsoleSorry {
  goal: string;
  proof_state?: number | null;
  start_pos?: { line: number; column: number } | null;
}

type AssistTab = "search" | "instate";

interface SmartAssistPanelProps {
  onInsert: (theoremName: string) => void;
  sorries?: ConsoleSorry[];
}

// ─── Tab config ────────────────────────────────────────────────────────────

interface TabConfig {
  id: AssistTab;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}

const TABS: TabConfig[] = [
  {
    id: "search",
    label: "Theorem Search",
    icon: <Search className="h-4 w-4" />,
    tooltip: "Search mathlib theorems using natural language",
  },
  {
    id: "instate",
    label: "In-State",
    icon: <Lightbulb className="h-4 w-4" />,
    tooltip: "Get theorem recommendations based on current proof state",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SmartAssistPanel({
  onInsert,
  sorries = [],
}: SmartAssistPanelProps) {
  const [activeTab, setActiveTab] = useState<AssistTab>("search");

  const handleInsert = (name: string) => {
    onInsert(name);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 shrink-0">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Smart Assist
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.tooltip}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "search" && <TheoremSearch onInsert={handleInsert} />}
        {activeTab === "instate" && (
          <InStateSearch onInsert={handleInsert} goals={sorries} />
        )}
      </div>
    </div>
  );
}
