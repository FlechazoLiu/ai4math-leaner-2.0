"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { listResources, deleteResource } from "@/lib/grpc";
import type {
  DeleteResourceRequest,
  ListResourcesRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  gettingStartedItems,
  curatedResources,
  communitySection,
} from "@/lib/resource-data";
import type {
  DisplayResource,
  ResourceType,
  ResourceDifficulty,
} from "@/lib/resource-types";

import { Button } from "@/components/ui/button";
import ResourceHeroSection from "@/components/ResourceHeroSection";
import ResourceGettingStarted from "@/components/ResourceGettingStarted";
import ResourceFilterSidebar from "@/components/ResourceFilterSidebar";
import ResourceCardGrid from "@/components/ResourceCardGrid";
import ResourceCommunitySection from "@/components/ResourceCommunitySection";
import ResourceCreateDialog from "@/components/ResourceCreateDialog";

export default function ResourcesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const isTeacherOrAdmin =
    session?.user?.role === 1 || session?.user?.role === 2; // 1=ADMIN, 2=TEACHER

  // --- DB resource state ---
  const [dbResources, setDbResources] = useState<DisplayResource[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // --- Dialog state ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<DisplayResource | null>(
    null,
  );

  // --- Load DB resources ---
  const loadDbResources = useCallback(async () => {
    if (!session?.user?.token) return;
    try {
      setDbLoading(true);
      const response = await listResources({
        pageSize: 200,
        pageToken: "",
        userToken: session.user.token,
      } as ListResourcesRequest);

      const displayResources: DisplayResource[] = response.resources.map(
        (r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          url: r.url,
          source: "database" as const,
          createdBy: r.createdBy,
          creatorName: r.creatorName,
          createdAt: r.createdAt,
          dbResource: r,
        }),
      );
      setDbResources(displayResources);
    } catch (error) {
      console.error("Error loading DB resources:", error);
      // Don't show toast on initial load to avoid noise
    } finally {
      setDbLoading(false);
    }
  }, [session?.user?.token]);

  useEffect(() => {
    if (session?.user?.token) {
      loadDbResources();
    }
  }, [session?.user?.token, loadDbResources]);

  // --- Convert curated resources to DisplayResource ---
  const curatedDisplayResources: DisplayResource[] = useMemo(
    () =>
      curatedResources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        url: r.url,
        source: "curated" as const,
        type: r.type,
        difficulty: r.difficulty,
        tags: r.tags,
      })),
    [],
  );

  // --- Merge all resources ---
  const allResources: DisplayResource[] = useMemo(
    () => [...curatedDisplayResources, ...dbResources],
    [curatedDisplayResources, dbResources],
  );

  // --- Read filters from URL ---
  const queryFilter = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") ?? "") as ResourceType | "";
  const difficultyFilter = (searchParams.get("difficulty") ??
    "") as ResourceDifficulty | "";

  // --- Apply filters ---
  const filteredResources = useMemo(() => {
    return allResources.filter((r) => {
      // Text search (fuzzy, case-insensitive)
      if (queryFilter) {
        const q = queryFilter.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesTags = r.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      // Type filter — only applies to curated resources with explicit types
      if (typeFilter) {
        if (r.source !== "curated" || r.type !== typeFilter) return false;
      }

      // Difficulty filter
      if (difficultyFilter) {
        if (r.source !== "curated" || r.difficulty !== difficultyFilter)
          return false;
      }

      return true;
    });
  }, [allResources, queryFilter, typeFilter, difficultyFilter]);

  // --- Permission check for DB resources ---
  const canEdit = useCallback(
    (resource: DisplayResource) => {
      if (resource.source !== "database") return false;
      return (
        isTeacherOrAdmin ||
        resource.createdBy === session?.user?.id
      );
    },
    [isTeacherOrAdmin, session?.user?.id],
  );

  // --- CRUD handlers ---
  const handleEdit = useCallback((resource: DisplayResource) => {
    setEditingResource(resource);
    setCreateDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (resource: DisplayResource) => {
      if (!session?.user?.token || resource.source !== "database") return;

      if (!confirm(`Are you sure you want to delete resource "${resource.title}"? This action cannot be undone.`)) {
        return;
      }

      try {
        await deleteResource({
          resourceId: resource.id,
          userToken: session.user.token,
        } as DeleteResourceRequest);
        toast.success(`Deleted "${resource.title}"`);
        await loadDbResources();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Deletion failed, please retry";
        toast.error(message);
      }
    },
    [session?.user?.token, loadDbResources],
  );

  const handleDialogSuccess = useCallback(() => {
    setEditingResource(null);
    loadDbResources();
  }, [loadDbResources]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditingResource(null);
    }
    setCreateDialogOpen(open);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-16 pb-16">
      {/* Section 1: Hero + Search */}
      <ResourceHeroSection />

      {/* Section 2: Getting Started */}
      <ResourceGettingStarted items={gettingStartedItems} />

      {/* Section 3: Core Resource Matrix */}
      <section className="space-y-6">
        {/* Section header with create button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 rounded-full bg-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Resource Browser</h2>
            <span className="text-sm text-muted-foreground">
              {allResources.length} resources
            </span>
          </div>
          {isTeacherOrAdmin && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Resource
            </Button>
          )}
        </div>

        {/* Filter sidebar + card grid */}
        <div className="flex gap-8">
          <ResourceFilterSidebar />
          <ResourceCardGrid
            resources={filteredResources}
            loading={dbLoading}
            canEdit={canEdit}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      {/* Section 4: Community */}
      <ResourceCommunitySection data={communitySection} />

      {/* Create/Edit Dialog */}
      <ResourceCreateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSuccess={handleDialogSuccess}
        editingResource={editingResource}
        userToken={session?.user?.token ?? ""}
      />
    </div>
  );
}
