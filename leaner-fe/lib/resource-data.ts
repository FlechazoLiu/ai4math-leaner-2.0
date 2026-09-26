/**
 * Static curated resource data for the Lean learning resource center.
 *
 * Resources are stored as structured data so content editors can update
 * links and descriptions without frontend re-deployment.
 */

import type {
  CuratedResource,
  GettingStartedItem,
  CommunitySectionData,
} from "./resource-types";

// ============================================================================
// Section 1: Getting Started — Beginner's Guide
// ============================================================================

export const gettingStartedItems: GettingStartedItem[] = [
  {
    id: "install-elan",
    title: "Environment Setup",
    description:
      "Install the Lean 4 development environment: Elan version manager, VS Code plugin, and Lake build tool.",
    iconName: "MonitorCog",
    links: [
      {
        label: "PKU Installation Guide",
        url: "http://faculty.bicmr.pku.edu.cn/~wenzw/formal/docs/#/install",
      },
      {
        label: "Lean Chinese Site",
        url: "https://www.leanprover.cn",
      },
      {
        label: "Official Installation Guide",
        url: "https://lean-lang.org/lean4/doc/quickstart.html",
      },
    ],
  },
  {
    id: "online-playground",
    title: "Try Online",
    description:
      "No installation needed — write and run Lean 4 code directly in the browser with interactive proof development support.",
    iconName: "Cloud",
    links: [
      {
        label: "Official Online Compiler",
        url: "https://live.lean-lang.org/",
      },
      {
        label: "ReasLab IDE",
        url: "https://prove.reaslab.io",
      },
    ],
  },
  {
    id: "natural-number-game",
    title: "Natural Number Game",
    description:
      "Learn Lean 4 proof tactics through an interactive game — beginner-friendly and highly recommended.",
    iconName: "Gamepad2",
    links: [
      {
        label: "Natural Number Game",
        url: "https://adam.math.hhu.de/#/g/leanprover-community/nng4",
      },
    ],
  },
];

// ============================================================================
// Section 2: Curated Resources — Core Learning Resources
// ============================================================================

export const curatedResources: CuratedResource[] = [
  // ---- Textbooks & Docs ----
  {
    id: "lean-chinese",
    title: "Lean Chinese Resource Hub",
    description:
      "Comprehensive Chinese introduction to Lean 4 with tutorials, installation guides, functional programming, theorem proving, and metaprogramming.",
    url: "https://www.leanprover.cn",
    type: "book",
    difficulty: "beginner",
    tags: ["Chinese", "Beginner", "Comprehensive"],
  },
  {
    id: "tutorial",
    title: "Lean 4 Official Tutorial",
    description:
      "Lean 4 official reference manual covering language basics, type system, metaprogramming, and system programming.",
    url: "https://lean-lang.org/lean4/doc/",
    type: "book",
    difficulty: "beginner",
    tags: ["Official", "Manual", "Beginner"],
  },
  {
    id: "functional-programming",
    title: "Functional Programming in Lean",
    description:
      "A Lean 4 functional programming textbook for computer science readers, covering type classes, Monads, and program verification.",
    url: "https://lean-lang.org/functional_programming_in_lean/",
    type: "book",
    difficulty: "intermediate",
    tags: ["Functional Programming", "Type Classes", "Monad"],
  },
  {
    id: "theorem-proving",
    title: "Theorem Proving in Lean 4",
    description:
      "A classic Lean 4 theorem proving introduction, progressing from logic fundamentals to dependent type theory and proof techniques.",
    url: "https://leanprover.github.io/theorem_proving_in_lean4/",
    type: "book",
    difficulty: "beginner",
    tags: ["Theorem Proving", "Beginner", "Logic"],
  },
  {
    id: "metaprogramming",
    title: "Metaprogramming in Lean 4",
    description:
      "Lean 4 metaprogramming official textbook covering macros, syntax extensions, and custom tactics.",
    url: "https://leanprover-community.github.io/lean4-metaprogramming-book/",
    type: "book",
    difficulty: "advanced",
    tags: ["Metaprogramming", "Macros", "Advanced"],
  },
  {
    id: "mathematics-in-lean",
    title: "Mathematics in Lean",
    description:
      "A core textbook for mathematics learners, covering set theory, topology, analysis and more to learn how to formalize mathematics with Lean and Mathlib. Highly recommended — the main course reference.",
    url: "https://leanprover-community.github.io/mathematics_in_lean/",
    type: "book",
    difficulty: "intermediate",
    tags: ["Math", "Mathlib", "Analysis", "Topology", "Textbook"],
  },
  {
    id: "nus-minicourse",
    title: "NUS Lean Lecture Notes",
    description:
      "National University of Singapore mini-course on mathematical formalization, with rich Lean proof examples and exercises.",
    url: "https://github.com/NUS-Math-Formalization/minicourse/tree/main",
    type: "book",
    difficulty: "intermediate",
    tags: ["Math", "Lecture Notes", "Course", "Exercises"],
  },
  {
    id: "tao-cheatsheet",
    title: "Terence Tao's Lean Cheatsheet",
    description:
      "Terence Tao's Lean 4 cheatsheet covering common tactics, commands, and proof patterns — essential for daily development.",
    url: "https://docs.google.com/spreadsheets/d/1Gsn5al4hlpNc_xKoXdU6XGmMyLiX4q-LFesFVsMlANo/edit?gid=1045418473#gid=1045418473",
    type: "book",
    difficulty: "beginner",
    tags: ["Cheatsheet", "Tactics", "Reference"],
  },
  {
    id: "tencent-doc",
    title: "Lean 4 Self-Study Resources (Tencent Docs)",
    description:
      "Community-curated Lean 4 self-study resources collection, gathering various Chinese tutorials, videos, and reference materials.",
    url: "https://docs.qq.com/doc/DWVBhVXZWWEFXY1dU",
    type: "book",
    difficulty: "beginner",
    tags: ["Chinese", "Self-Study", "Collection"],
  },

  // ---- Interactive Exercises ----
  {
    id: "reaslab",
    title: "ReasLab — Lean Online Collaborative IDE",
    description:
      "A collaborative Lean online development environment where you can write and verify Lean proofs in the browser in real time, suitable for classroom teaching and team collaboration.",
    url: "https://prove.reaslab.io",
    type: "interactive",
    difficulty: "beginner",
    tags: ["Online IDE", "Collaboration", "Browser"],
  },
  {
    id: "reaslab-model",
    title: "ReasLab Model",
    description:
      "ReasLab's model exploration platform offering visual interactive experiences for formal modeling.",
    url: "https://model.reaslab.io/",
    type: "interactive",
    difficulty: "intermediate",
    tags: ["Modeling", "Visualization", "Online"],
  },
  {
    id: "lean-web-editor",
    title: "Lean 4 Official Online Compiler",
    description:
      "Official browser-based Lean 4 playground with syntax highlighting, error feedback, and interactive proof development — no local installation needed.",
    url: "https://live.lean-lang.org/",
    type: "interactive",
    difficulty: "beginner",
    tags: ["Online Editor", "Playground", "Official"],
  },
  {
    id: "nng",
    title: "Natural Number Game",
    description:
      "The famous gamified Lean learning project — learn tactics by proving properties of natural numbers. Essential for beginners.",
    url: "https://adam.math.hhu.de/#/g/leanprover-community/nng4",
    type: "interactive",
    difficulty: "beginner",
    tags: ["Game", "Tactics", "Beginner"],
  },

  // ---- Theorem Search ----
  {
    id: "mathlib4-docs",
    title: "Mathlib4 Documentation & Theorem Search",
    description:
      "Lean 4's mathematical library Mathlib4 API documentation, covering algebra, analysis, topology, category theory, and more, with theorem search.",
    url: "https://leanprover-community.github.io/mathlib4_docs/",
    type: "api",
    difficulty: "advanced",
    tags: ["Mathlib4", "API", "Math Library"],
  },
  {
    id: "leansearch",
    title: "LeanSearch",
    description:
      "A Lean theorem search engine supporting fuzzy matching and semantic search — find definitions and theorems by partial type signatures.",
    url: "https://leansearch.net/",
    type: "theorem",
    difficulty: "intermediate",
    tags: ["Search", "Semantic", "Theorem"],
  },
  {
    id: "moogle",
    title: "Moogle",
    description:
      "A Mathlib4 theorem search engine by AI4Math, supporting natural language queries and flexible result sorting.",
    url: "https://www.moogle.ai/",
    type: "theorem",
    difficulty: "intermediate",
    tags: ["Search", "AI", "Mathlib4"],
  },

  // ---- Community & Tools ----
  {
    id: "zulip-chat",
    title: "Lean Zulip Chat",
    description:
      "The main communication platform for Lean core developers and users. If you encounter any problem, this is usually the fastest place to get answers — extremely active.",
    url: "https://leanprover.zulipchat.com/",
    type: "community",
    difficulty: "beginner",
    tags: ["Community", "Zulip", "Q&A"],
  },
  {
    id: "lean-community",
    title: "Lean Community Website",
    description:
      "Lean official community portal featuring lectures, Lean Together workshop archives, blog posts, and conference information.",
    url: "https://leanprover-community.github.io/",
    type: "community",
    difficulty: "beginner",
    tags: ["Community", "Lectures", "Conference"],
  },
  {
    id: "lean-github",
    title: "Lean 4 GitHub Repository",
    description:
      "Source code repository for the Lean 4 theorem prover, including the language core implementation, compiler, and standard library.",
    url: "https://github.com/leanprover/lean4",
    type: "community",
    difficulty: "advanced",
    tags: ["Source Code", "Compiler", "GitHub"],
  },
];

// ============================================================================
// Section 3: Community Section — Community & Support
// ============================================================================

export const communitySection: CommunitySectionData = {
  zulip: {
    title: "Lean Zulip Chat",
    description:
      "The daily communication platform for Lean core developers and global users. Whether you have technical questions, want to discuss proof ideas, or follow the latest developments, Zulip has channels for everything. Register and join — experts abound and responses are fast!",
    url: "https://leanprover.zulipchat.com/",
  },
  links: [
    {
      title: "Lean Official GitHub Organization",
      description: "All open source repositories for the Lean theorem prover and related tools.",
      url: "https://github.com/leanprover",
    },
    {
      title: "Mathlib4 Contribution Guide",
      description: "Want to contribute to the Lean mathematical library? Learn about the PR process and coding standards here.",
      url: "https://leanprover-community.github.io/contribute/",
    },
    {
      title: "Mathlib4 API Documentation",
      description: "Browse all formalized mathematical definitions and theorems in the Lean mathematical library.",
      url: "https://leanprover-community.github.io/mathlib4_docs/",
    },
    {
      title: "Lean 4 Self-Study Resources (Tencent Docs)",
      description: "Community-curated Lean 4 self-study resource collection.",
      url: "https://docs.qq.com/doc/DWVBhVXZWWEFXY1dU",
    },
  ],
};
