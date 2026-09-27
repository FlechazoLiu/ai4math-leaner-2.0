# leaner-fe

The web frontend of [Leaner](../README.md) — a server-rendered Next.js application providing the student and teacher interfaces: courses, assignments, the Monaco-based answer editor, the Playground, Smart Assist panels, and grading views.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [lucide-react](https://lucide.dev/) icons
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for Lean 4 editing, [Shiki](https://shiki.style/) for syntax highlighting
- [KaTeX](https://katex.org/) + `remark-math` for math rendering
- [Connect-RPC](https://connectrpc.com/) (`@connectrpc/connect`) with generated clients from `../protos` (`leaner.v1`)
- [next-auth](https://authjs.dev/) (credentials provider) for sessions, [SWR](https://swr.vercel.app/) for data fetching

## Development

From the repository root (`nix develop` provides Node and pnpm):

```bash
pnpm i            # install dependencies
make proto        # regenerate Connect-RPC clients from ../protos (root Makefile)
pnpm dev          # dev server on http://localhost:3000
```

The dev server expects a running `leaner-be` (see [../docs/setup.md](../docs/setup.md)). Environment (`.env.local`): `AUTH_SECRET` (generate with `npx auth secret`) and `AUTH_TRUST_HOST=true`.

Production runs as a container built from this directory's `Dockerfile` (target `runner`); see the root [`compose.build.yaml`](../compose.build.yaml).

## Layout

- `app/` — routes (App Router): `auth/`, `dashboard/` (courses, assignments, playground, review, admin)
- `components/` — UI components (`LeanPlayground`, `AnswerEditor`, `TheoremSearch`, …)
- `lib/` — auth config, Connect-RPC client setup, helpers
