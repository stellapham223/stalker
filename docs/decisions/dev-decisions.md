# Developer Decisions Log

Decisions made by the Developer agent that affect the codebase.

## [2026-03-07] UX Brand Guideline Implementation (TASK-001 through TASK-004)
**Agent:** developer
**Decision:** Implemented 4 UX review tasks: skeleton loading states, confirm dialogs, tab-button accessibility, and empty state patterns across the entire app.
**Rationale:** UX review found brand guideline violations — plain "Loading..." text, browser confirm() dialogs, inaccessible span-as-button patterns, and bare text empty states. All fixed using existing project conventions (shadcn/ui patterns, Lucide icons, design tokens).
**Key implementation choices:**
- `ConfirmDialog` uses native `<dialog>` element — no new dependencies needed
- `Skeleton`, `PageSkeleton`, `DashboardSkeleton`, `DetailSkeleton` components created for reuse
- Empty states follow icon + heading + description + optional CTA pattern
- Tab-button delete uses `<button>` with `aria-label="Remove tab"` for accessibility
**Affected files:** 30+ files across `apps/web/` — all 6 feature pages, 6 dashboard-tabs, 6 detail components, 6 tab-buttons, admin, changes, competitors, dashboard, unauthorized pages, plus new components in `components/ui/`
**Cross-refs:** See ux-decisions.md#2026-03-07 for the original review findings, brand-guideline.md for the brand reference
