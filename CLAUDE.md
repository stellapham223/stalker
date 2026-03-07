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
**Cross-refs:** [optional] Related decisions or tasks (e.g., "See qa-decisions.md#2026-03-06", "Created TASK-003")
**Needs-review:** [optional] Which agent domain should review this (e.g., "developer — auth middleware needs updating")
```

### Current Team Members

**Development:**
- `/developer` — Senior Full-Stack Developer (decisions: `docs/decisions/dev-decisions.md`)
- `/dev-implement` — Feature implementation end-to-end
- `/dev-debug` — Bug debugging & root cause analysis
- `/dev-review` — Code review (correctness, security, performance)
- `/dev-refactor` — Code refactoring & clean code

**Design:**
- `/ux-designer` — Senior UX/UI Designer (decisions: `docs/decisions/ux-decisions.md`)
- `/ux-review` — UX/UI review & audit
- `/ux-market-research` — Market research & competitive UX analysis
- `/design-component` — Reusable UI component design
- `/design-page` — Page layout & UX design
- `/design-system` — Design system audit

**Quality:**
- `/qa-engineer` — Senior QA Engineer (decisions: `docs/decisions/qa-decisions.md`)
- `/qa-review` — Code quality review
- `/qa-test-plan` — Test plan creation
- `/qa-api-test` — API endpoint testing
- `/qa-frontend` — Frontend E2E testing

**Product:**
- `/product-owner` — Senior Product Owner (decisions: `docs/decisions/product-decisions.md`)

All agents log decisions to `docs/decisions/` and coordinate through `docs/tasks.md`.

### Agent Task Board
Agents communicate cross-domain work requests through `docs/tasks.md`.
- Any agent can create a task for another agent's domain
- Agents check the task board during pre-flight before starting work
- Tasks use format: `TASK-NNN` with Created/For/Priority/Context/Ref/Files fields
- Completed tasks are moved to the "Completed" section with resolution notes
- Only create tasks for genuine cross-domain handoffs, not trivial items

### Agent Pre-flight Protocol
Every agent MUST perform these checks before starting any work:

1. **Read the task board** — Check `docs/tasks.md` for open tasks assigned to your domain. If any exist, mention them to the user before proceeding.
2. **Scan relevant decision logs** — Read the last 2 entries of decision logs that overlap with your work:
   - Dev agents → `ux-decisions.md` + `qa-decisions.md`
   - UX agents → `dev-decisions.md` + `product-decisions.md`
   - QA agents → `dev-decisions.md` + `ux-decisions.md`
   - Product agents → all 4 decision logs
3. **Check for conflicts** — If any recent decision contradicts your planned approach, flag it to the user before proceeding.
4. **Report pre-flight** — In your first response, briefly note: (a) any open tasks for your domain, (b) any relevant recent decisions, (c) any conflicts detected. If none, say "Pre-flight: clear."

### Conflict Resolution
When an agent detects a conflict between its planned approach and another agent's logged decision:

1. **Flag it** — Clearly state: "CONFLICT: [your approach] vs [other agent's decision in X-decisions.md#date]" with your recommendation
2. **Ask the user** — The user decides which approach wins. Agents do not overrule each other.
3. **Log the resolution** — The winning agent logs the resolution with `Cross-refs` pointing to the overridden decision
4. **Update the task board** — If the resolution creates work for another agent, create a task in `docs/tasks.md`

**Domain authority** (for the user's reference when resolving conflicts):
- Visual design, UX patterns, accessibility → UX Designer
- Technical implementation, performance, security → Developer
- Test coverage, bug severity, quality gates → QA Engineer
- Feature scope, priority, requirements → Product Owner

### Agent Autonomy Rules
- Agents CAN make decisions within their expertise without asking the user
- Agents MUST ask the user before: adding new dependencies, making breaking changes, or changing core architecture
- Agents MUST log significant decisions to their decision file
- Agents SHOULD read other agents' decision logs when their work overlaps

### Documentation Maintenance Rules

Agents MUST keep documentation in sync with code changes. This is a mandatory part of every task — not a separate step.

#### When to update docs
An agent MUST update relevant docs when any of the following happens:
- **New feature added** → Update `PRD.md` (add feature section or mark phase complete)
- **API endpoint added/changed/removed** → Update `PRD.md` API tables
- **Data model changed** → Update `PRD.md` schema section
- **Tech stack changed** (e.g., Prisma→Firestore, new dependency) → Update `CLAUDE.md` Tech Stack + `PRD.md`
- **UI page/route added or restructured** → Update `PRD.md` UI section + sidebar navigation section
- **Architecture decision made** → Log in `docs/decisions/` AND update `CLAUDE.md` if it affects conventions
- **File structure changed** → Update `PRD.md` file structure section + `CLAUDE.md` File Conventions

#### Which files to update

| Change type | Files to update |
|---|---|
| Tech stack / conventions | `CLAUDE.md` |
| Features / APIs / data models / UI | `PRD.md` |
| Design system / tokens | `docs/design-system.md` |
| Architecture / tech decisions | `docs/decisions/dev-decisions.md` |
| UX/UI decisions | `docs/decisions/ux-decisions.md` |
| Test strategy | `docs/test-plan.md` |

#### How to update
- Mark completed phases/features with `✅ DONE` in `PRD.md`
- Mark deprecated/removed items with `❌ REMOVED` or `⚠️ MIGRATED` and a note explaining what replaced them
- When updating `PRD.md`, add a comment at the top: `<!-- Last updated: YYYY-MM-DD by <agent-name> -->`
- Keep docs concise — update existing sections, don't duplicate information
- If a doc section is no longer accurate, fix it immediately rather than leaving stale content
