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

## [2026-03-08] Fix Puppeteer browser leak + Telegram notification type mismatch
**Agent:** developer (via qa-engineer cron review)
**Decision:** Two fixes for the 6 AM scheduled scrape:
1. Moved `puppeteer.launch()` / `launchBrowser()` inside try blocks in all 5 Puppeteer scrapers, with `if (browser) await browser.close()` in finally. Previously browser was launched outside try/finally — if launch or page setup failed, the browser process leaked. When 5 scrapers ran in parallel (TASK-006), leaked browsers cascaded into memory exhaustion, causing 5/7 scrapers to fail.
2. Changed `scheduler.js` `scrapeStartTime` from `new Date()` to `new Date().toISOString()` so the Telegram notification query (`getRecentSnapshotsWithDiff`) compares ISO string vs ISO string instead of Timestamp vs string. The type mismatch caused the query to return 0 results, silently skipping notifications.
**Rationale:** First scheduled run after parallelization (TASK-006) showed only App Listing + Autocomplete succeeding (both use fetch, not Puppeteer). The 5 Puppeteer-based scrapers all failed due to resource exhaustion from leaked browser processes.
**Affected files:** `competitorScraper.js`, `keywordScraper.js`, `menuScraper.js`, `homepageScraper.js`, `guideDocsScraper.js`, `scheduler.js`
**Cross-refs:** qa-decisions.md#2026-03-07 item 3 (browser cleanup warning), playbook.md "Always close Puppeteer browsers in finally blocks"

## [2026-03-08] Consolidate duplicated business logic to break bug cycle
**Agent:** developer (retrospective analysis)
**Decision:** Extracted duplicated business logic into shared modules to prevent recurring bugs:
1. `diffChangeCount()` + `keywordChangeCount()` → `packages/shared/diff-utils.js` (was duplicated in `changes.js` + `scheduler.js`)
2. `WINDOW_MS` + session grouping logic → `packages/shared/constants.js` (was copy-pasted across 6 API files)
3. Replaced raw `db.collection().where("ownerEmail")` queries with `getActiveItemsByOwner()` helper (with runtime guard)
4. Added runtime assertions in `addSnapshot()` and `createDoc()` (prevent Date objects, require ownerEmail)
5. Added JSDoc diff format spec in `diff-utils.js` with 7 typedef definitions
6. Added 20 unit tests covering all 7 diff formats
**Rationale:** Retrospective found that bugs were recurring because the same logic existed in 2-6 places. Fixing one copy left others broken, creating bug chains (badge bug fixed 3 times, admin page fixed 4 times, ownerEmail leak fixed twice). Consolidating to single source of truth means future changes only need to happen in one place.
**Affected files:** `packages/shared/diff-utils.js` (new), `packages/shared/diff-utils.test.js` (new), `packages/shared/constants.js`, `packages/shared/package.json`, `apps/functions/src/api/changes.js`, `apps/functions/src/scheduler.js`, `apps/functions/src/db/helpers.js`, + all 6 feature API files (keywords, appListing, autocomplete, websiteMenus, homepage, guideDocs)
**Cross-refs:** playbook.md — new lessons on code duplication

## [2026-03-08] Fix guide docs update URL + CORS + Firebase deploy (4 bugs)
**Agent:** developer
**Decision:** Fixed 4 interconnected bugs preventing guide docs URL editing and Firebase Functions deployment on production.

**Bug 1 — Missing auth headers on PUT request:**
`updateGuideDocsTracking()` in `apps/web/lib/api/guide-docs.js` was the only API function using raw `fetch` without `getAuthHeaders()`. All other functions use `fetchJSON/postJSON/deleteJSON` wrappers which include auth automatically. Without `x-user-email` and `x-auth-token` headers, the backend rejected the request.
**Fix:** Added `getAuthHeaders()` call, spread into headers, added error handling matching the other wrappers.

**Bug 2 — CORS 500 on production (root cause of all mutation failures):**
Browser sends `origin: https://stalker-api.vercel.app` header on PUT/DELETE/POST requests. Next.js rewrites forward this header to the Firebase Function. The CORS middleware called `callback(new Error("Not allowed by CORS"))` when origin wasn't in `ALLOWED_ORIGINS` — this throws an unhandled Express error, returning an HTML 500 page instead of a JSON response. GET requests worked because browsers don't send `origin` on same-origin simple GET requests.
**Fix:** (1) Added `https://stalker-api.vercel.app` to default `ALLOWED_ORIGINS`. (2) Changed CORS reject from `callback(new Error(...))` to `callback(null, false)` — rejects the CORS request without crashing Express.

**Bug 3 — Vercel build fail (`workspace:*` protocol):**
`apps/functions/package.json` used `"@competitor-stalker/shared": "workspace:*"` which only Bun/pnpm understand. Vercel uses `npm install` which doesn't support this protocol.
**Fix:** Removed the dependency entirely (see Bug 4).

**Bug 4 — Firebase Functions deploy fail (workspace package not found):**
Firebase deploy only uploads `apps/functions/` directory, not the monorepo root or `packages/shared/`. npm on Cloud Build tried to install `@competitor-stalker/shared` from the npm registry and failed with E404.
**Fix:** Copied shared files (`constants.js`, `diff-utils.js`) into `apps/functions/src/shared/` and updated all imports from `@competitor-stalker/shared/...` to `../shared/...`. Removed workspace dependency from `package.json`.

**Key debugging insight:** The CORS bug was the hardest to diagnose because: (1) `curl` without `origin` header worked fine, (2) browser GET requests worked (no `origin` header for same-origin GETs), (3) the 500 returned `text/html` so the JSON error parser returned `{}`, falling back to a generic error message.

**Affected files:** `apps/web/lib/api/guide-docs.js`, `apps/web/app/guide-docs/_components/guide-docs-detail.js`, `apps/functions/src/index.js`, `apps/functions/package.json`, `apps/functions/src/shared/constants.js` (new), `apps/functions/src/shared/diff-utils.js` (new), all 8 API files + scheduler that imported from `@competitor-stalker/shared`
**Cross-refs:** playbook.md — 4 new lessons added
