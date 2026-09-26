"use client";

import { ExternalLink, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DisplayResource, ResourceType } from "@/lib/resource-types";
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_COLORS,
} from "@/lib/resource-types";

interface ResourceCardProps {
  resource: DisplayResource;
  canEdit: boolean;
  onEdit: (resource: DisplayResource) => void;
  onDelete: (resource: DisplayResource) => void;
}

/**
 * Badge color logic for resource type.
 */
function getTypeBadgeClasses(type?: ResourceType): string {
  if (!type) return "bg-gray-100 text-gray-800 border-gray-200";
  return (
    RESOURCE_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800 border-gray-200"
  );
}

function getTypeLabel(type?: ResourceType): string {
  if (!type) return "External";
  return RESOURCE_TYPE_LABELS[type] ?? "External";
}

export default function ResourceCard({
  resource,
  canEdit,
  onEdit,
  onDelete,
}: ResourceCardProps) {
  const isDatabase = resource.source === "database";

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Type badge + curated indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${getTypeBadgeClasses(resource.type)}`}
            >
              {getTypeLabel(resource.type)}
            </Badge>
            {!isDatabase && (
              <Badge
                variant="secondary"
                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
              >
                Curated
              </Badge>
            )}
          </div>

          {/* Edit/Delete controls (only for DB resources) */}
          {isDatabase && canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit(resource);
                }}
                className="h-8 w-8 p-0"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(resource);
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Title */}
        <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
          {resource.title}
        </CardTitle>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {resource.description}
        </p>

        {/* Footer: creator info + action */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {isDatabase && resource.creatorName ? (
            <span className="text-xs text-muted-foreground">
              by {resource.creatorName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Lean Community</span>
          )}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Visit Resource
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
