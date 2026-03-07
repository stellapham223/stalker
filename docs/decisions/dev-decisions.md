# Developer Decisions Log

Decisions made by the Developer agent that affect the codebase.

## [2026-03-07] Fix scrape-all endpoints — add ownerEmail filter
**Agent:** developer (via qa-engineer review)
**Decision:** Added `ownerEmail` filter to all 6 feature scrape-all endpoints so each user only scrapes their own items.
**Rationale:** All scrape-all endpoints only filtered by `active == true`, meaning any user's "Scrape All" click would scrape ALL users' data — wasting server resources (Puppeteer) and crossing data boundaries. Same pattern as the `/api/changes/latest` bug fixed earlier.
**Affected files:** `apps/functions/src/api/keywords.js`, `appListing.js`, `autocomplete.js`, `websiteMenus.js`, `homepage.js`, `guideDocs.js`
**Cross-refs:** See playbook.md — "Always filter by ownerEmail" lesson

## [2026-03-07] Fix badge counts — filter /api/changes/latest by ownerEmail
**Agent:** developer (via ux-designer + qa-engineer investigation)
**Decision:** Added `requireAuth` middleware and `ownerEmail` filter to `/api/changes/latest` endpoint.
**Rationale:** Badge counts were inflated ~3x because the endpoint queried ALL users' data instead of filtering by the authenticated user. Every other feature endpoint already filtered by `ownerEmail` — this one was missed. Root cause: admin migration script cloned data for 3 users, and without the filter, all clones were counted together.
**Affected files:** `apps/functions/src/api/changes.js`
**Cross-refs:** See playbook.md for prior badge bug lessons (double-counting, global seen state)

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

## [2026-03-07] Fix duplicate changes from non-deterministic scraping (TASK-005)
**Agent:** developer (via qa-engineer analysis)
**Decision:** Added `isDuplicateDiff` guard that compares a newly computed diff against the previous snapshot's diff. If JSON-identical, the snapshot is saved with `diff: null` to suppress false-positive change detection.
**Rationale:** Puppeteer-based scrapers produce non-deterministic content (dynamic counters, rotating carousels, load-timing). This caused every scrape to record identical changes. The guard is applied at the save layer (not the scraper layer) so it works universally across all 7 scraper types without modifying individual scraper logic.
**Implementation:** `isDuplicateDiff(previousDiff, newDiff)` exported from `helpers.js`. Applied to: `scheduler.js` (7 sections), `jobs.js` (2 endpoints), and 6 feature API `runXxxScrape` functions (`keywords.js`, `autocomplete.js`, `appListing.js`, `websiteMenus.js`, `homepage.js`, `guideDocs.js`).
**Affected files:** `apps/functions/src/db/helpers.js`, `apps/functions/src/scheduler.js`, `apps/functions/src/api/jobs.js`, `apps/functions/src/api/keywords.js`, `apps/functions/src/api/autocomplete.js`, `apps/functions/src/api/appListing.js`, `apps/functions/src/api/websiteMenus.js`, `apps/functions/src/api/homepage.js`, `apps/functions/src/api/guideDocs.js`
**Cross-refs:** qa-decisions.md#2026-03-07 "Duplicate Changes" analysis, TASK-005 in tasks.md

## [2026-03-07] Parallelize scheduler scrapers to fix timeout (TASK-006)
**Agent:** developer (via product-owner + qa-engineer analysis)
**Decision:** Refactored `runScrapeAll()` from sequential to parallel execution using `Promise.allSettled`. Each of the 7 scraper types now runs concurrently. Items within each type still run sequentially to avoid overwhelming target sites.
**Rationale:** The 540s Firebase Function timeout was insufficient for 7 sequential scrapers (estimated ~1155s with moderate data). This morning's cron was killed mid-execution — only Competitors, Keywords, Autocomplete, and App Listing completed. Website Menus, Homepage, and Guide Docs never ran.
**Implementation:**
- Extracted 7 `scrapeAllXxx()` functions from the monolithic `runScrapeAll()`
- All 7 run concurrently via `Promise.allSettled` — one failure doesn't block others
- Each function returns a job count; results aggregated after all settle
- Clear per-type success/failure logging (`✓ name: N jobs` / `✗ name: FAILED`)
- Bumped `scheduledScrape` memory from `2GiB` → `4GiB` for parallel Puppeteer instances
**Affected files:** `apps/functions/src/scheduler.js`, `apps/functions/src/index.js`
**Cross-refs:** TASK-006 in tasks.md, qa-decisions.md#2026-03-07 timeout warning
