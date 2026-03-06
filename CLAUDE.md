# Competitor Stalker — Project Guide

## Project Overview
SaaS application for monitoring competitor changes on Shopify App Store. Tracks app listings, keyword rankings, autocomplete suggestions, website menus, homepage content, and guide docs.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), JavaScript (no TypeScript)
- **UI:** shadcn/ui (New York style), Tailwind CSS v4, Lucide React icons
- **State:** TanStack React Query v5
- **Auth:** NextAuth v5 (Google OAuth)
- **Backend:** Express + Puppeteer + Prisma + PostgreSQL + pg-boss
- **Monorepo:** Bun workspaces (`apps/web`, `apps/functions`, `packages/shared`)

## File Conventions
- Pages: `apps/web/app/<route>/page.js`
- UI components: `apps/web/components/ui/` (shadcn/ui pattern)
- Feature components: `apps/web/components/`
- Hooks: `apps/web/hooks/`
- API client: `apps/web/lib/api.js`
- Design tokens: `apps/web/app/globals.css` (HSL CSS variables)
- Path alias: `@/*` maps to `apps/web/*`

## Component Conventions
- Pattern: `React.forwardRef` + CVA (class-variance-authority) + `cn()` utility
- Reference: `components/ui/button.js` for canonical pattern
- Class merging: always use `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- Icons: Lucide React, size `h-4 w-4` standard

## Styling Rules
- ALWAYS use design token CSS variables (e.g., `bg-primary`, `text-muted-foreground`)
- NEVER hardcode colors (no `bg-red-500`, `text-green-600` — use semantic tokens)
- Border radius: use `rounded-md` (maps to `--radius: 0.5rem`)
- Typography: `text-3xl font-bold` for page titles, `text-sm` for body, `text-xs` for small text

## Data Fetching
- Use TanStack React Query (`useQuery`, `useMutation`)
- API functions from `@/lib/api.js`
- Auth header: `x-user-email` sent automatically
- `"use client"` directive required for interactive pages

---

## Multi-Agent Team Structure

This project uses AI agent "team members" via Claude Code slash commands. Each agent has a specific expertise area and autonomy within that domain.

### How Agents Work
- Each agent = a skill in `.claude/skills/<name>/SKILL.md`
- Agents record important decisions in `docs/decisions/` so other agents can reference them
- Agents can read each other's decision logs for cross-domain context

### Decision Log Format
When an agent makes an important decision, append to the relevant file in `docs/decisions/`:
```
## [YYYY-MM-DD] Title
**Agent:** <agent name>
**Decision:** What was decided
**Rationale:** Why this decision was made
**Affected files:** List of files impacted
```

### Current Team Members
- `/ux-designer` — Senior UX/UI Designer (decisions: `docs/decisions/ux-decisions.md`)
- More agents will be added as the team grows

### Agent Autonomy Rules
- Agents CAN make decisions within their expertise without asking the user
- Agents MUST ask the user before: adding new dependencies, making breaking changes, or changing core architecture
- Agents MUST log significant decisions to their decision file
- Agents SHOULD read other agents' decision logs when their work overlaps
