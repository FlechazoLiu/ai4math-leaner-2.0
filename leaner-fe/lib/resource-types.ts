/**
 * Resource Center type definitions for the Lean learning resource hub.
 * Separates curated (built-in) resources from user-created database resources.
 */

// --- Filter Enums ---

/** Resource type categories for filtering */
export type ResourceType =
  | "book" // Textbooks & Docs
  | "interactive" // Interactive Exercises
  | "theorem" // Theorem Search
  | "community" // Community & Tools
  | "api"; // API Docs

/** Difficulty levels for filtering */
export type ResourceDifficulty = "beginner" | "intermediate" | "advanced";

// --- Display Labels (for UI rendering) ---

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  book: "Textbooks & Docs",
  interactive: "Interactive Exercises",
  theorem: "Theorem Search",
  community: "Community & Tools",
  api: "API Docs",
};

export const RESOURCE_DIFFICULTY_LABELS: Record<ResourceDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// --- Badge color mapping (Tailwind classes) ---

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  book: "bg-blue-100 text-blue-800 border-blue-200",
  interactive: "bg-teal-100 text-teal-800 border-teal-200",
  theorem: "bg-pink-100 text-pink-800 border-pink-200",
  community: "bg-orange-100 text-orange-800 border-orange-200",
  api: "bg-purple-100 text-purple-800 border-purple-200",
};

// --- Data Shapes ---

/** A curated (built-in) learning resource with full metadata */
export interface CuratedResource {
  id: string; // Stable slug
  title: string;
  description: string;
  url: string;
  type: ResourceType;
  difficulty: ResourceDifficulty;
  tags?: string[];
}

/** A single getting-started guide card */
export interface GettingStartedItem {
  id: string;
  title: string;
  description: string;
  iconName: string; // lucide-react icon name (PascalCase)
  links: { label: string; url: string }[];
}

/** Community section structured data */
export interface CommunitySectionData {
  zulip: {
    title: string;
    description: string;
    url: string;
  };
  links: {
    title: string;
    description: string;
    url: string;
  }[];
}

import type { Resource as GrpcResource } from "@/lib/gen/leaner/v1/leaner_pb";

/** Unified resource displayed in the card grid (curated + database merged) */
export interface DisplayResource {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "curated" | "database";
  // Curated resource metadata (undefined for database resources)
  type?: ResourceType;
  difficulty?: ResourceDifficulty;
  tags?: string[];
  // Database resource metadata (undefined for curated resources)
  createdBy?: string;
  creatorName?: string;
  createdAt?: string;
  // Reference to original DB resource for CRUD operations
  dbResource?: GrpcResource;
}
