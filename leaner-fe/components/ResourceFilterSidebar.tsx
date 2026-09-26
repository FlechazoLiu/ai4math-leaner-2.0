"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_DIFFICULTY_LABELS,
  type ResourceType,
  type ResourceDifficulty,
} from "@/lib/resource-types";

// All available filter values
const ALL_TYPES = Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[];
const ALL_DIFFICULTIES = Object.keys(
  RESOURCE_DIFFICULTY_LABELS,
) as ResourceDifficulty[];

export default function ResourceFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "";
  const currentDifficulty = searchParams.get("difficulty") ?? "";

  const activeFilterCount =
    [currentType, currentDifficulty].filter(Boolean).length;

  /** Build a new URL with updated filter params */
  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Toggle: if already selected, remove; otherwise set
    if (searchParams.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const newUrl = `/dashboard/resources${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  };

  /** Clear all filters */
  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("difficulty");
    const q = searchParams.get("q");
    const newUrl = `/dashboard/resources${params.toString() || q ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Filter</h3>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs text-muted-foreground hover:text-red-600"
            >
              <X className="h-3 w-3 mr-1" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-6 pr-3">
            {/* Type Filter */}
            <FilterGroup
              title="By Type"
              items={ALL_TYPES}
              labelMap={RESOURCE_TYPE_LABELS}
              currentValue={currentType}
              onChange={(v) => applyFilter("type", v)}
            />

            {/* Difficulty Filter */}
            <FilterGroup
              title="By Difficulty"
              items={ALL_DIFFICULTIES}
              labelMap={RESOURCE_DIFFICULTY_LABELS}
              currentValue={currentDifficulty}
              onChange={(v) => applyFilter("difficulty", v)}
            />
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

// --- Internal FilterGroup component ---

interface FilterGroupProps<T extends string> {
  title: string;
  items: T[];
  labelMap: Record<T, string>;
  currentValue: string;
  onChange: (value: T) => void;
}

function FilterGroup<T extends string>({
  title,
  items,
  labelMap,
  currentValue,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isActive = currentValue === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {labelMap[item]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
