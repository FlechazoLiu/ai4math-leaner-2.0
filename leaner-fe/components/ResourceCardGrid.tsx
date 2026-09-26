import { SearchX } from "lucide-react";
import type { DisplayResource } from "@/lib/resource-types";
import ResourceCard from "./ResourceCard";

interface ResourceCardGridProps {
  resources: DisplayResource[];
  loading: boolean;
  canEdit: (resource: DisplayResource) => boolean;
  onEdit: (resource: DisplayResource) => void;
  onDelete: (resource: DisplayResource) => void;
}

export default function ResourceCardGrid({
  resources,
  loading,
  canEdit,
  onEdit,
  onDelete,
}: ResourceCardGridProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card shadow-sm animate-pulse"
            >
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-gray-200" />
                  <div className="h-5 w-12 rounded-full bg-gray-200" />
                </div>
                <div className="h-5 w-2/3 rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-4/5 rounded bg-gray-100" />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="h-3 w-20 rounded bg-gray-200" />
                  <div className="h-8 w-24 rounded-lg bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <SearchX className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          No matching resources found
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your filter criteria or search keywords, or clear all filters to see all available resources.
        </p>
      </div>
    );
  }

  // Resource grid
  return (
    <div className="flex-1 space-y-4">
      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-gray-900">{resources.length}</span> resources
        {resources.filter((r) => r.source === "curated").length > 0 && (
          <span className="text-amber-600">
            {" "}
            ·{" "}
            {
              resources.filter((r) => r.source === "curated").length
            }{" "}
            curated
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <ResourceCard
            key={`${resource.source}-${resource.id}`}
            resource={resource}
            canEdit={canEdit(resource)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
