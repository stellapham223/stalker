# Team Playbook — Lessons Learned

This file captures lessons learned from real experience working on this project. Every agent MUST read this during pre-flight. When you make a mistake or discover a better way, add it here so the team never repeats it.

<!-- Last updated: 2026-03-08 by developer (CORS/deploy lessons) -->

---

## How This File Works

- **Lessons** are organized by category (not by date)
- Each lesson has a **source** (which incident/task taught us this)
- Agents add new lessons in the **Post-flight** step after completing work
- Periodically review and prune lessons that are no longer relevant
- Keep each lesson to 1-3 lines — actionable, not narrative

---

## API & Networking

### LESSON: Never use raw `fetch` for API calls — always use the shared wrappers
`fetchJSON`, `postJSON`, `deleteJSON` in `apps/web/lib/api/client.js` automatically attach auth headers (`x-user-email`, `x-auth-token`). Using raw `fetch` bypasses auth and silently fails. If you need a new HTTP method (e.g., PUT), either add a `putJSON` wrapper or manually call `getAuthHeaders()` and spread into headers.
**Source:** dev-decisions.md 2026-03-08, guide docs update URL bug

### LESSON: CORS `callback(new Error(...))` crashes Express — use `callback(null, false)` instead
In the Express `cors()` middleware, calling `callback(new Error("message"))` throws an unhandled error that returns an HTML 500 page. Use `callback(null, false)` to reject CORS without crashing. The browser will still block the response, but Express stays healthy.
**Source:** dev-decisions.md 2026-03-08, CORS 500 bug

### LESSON: Next.js rewrites forward browser `origin` header to the backend
When using Next.js `rewrites()` as a proxy, the browser's `origin` header is forwarded to the destination. This means the backend's CORS `ALLOWED_ORIGINS` must include the frontend domain, even though the request appears "same-origin" from the browser's perspective. GET requests are usually unaffected because browsers don't send `origin` on same-origin simple GETs.
**Source:** dev-decisions.md 2026-03-08, CORS 500 bug

### LESSON: When curl works but browser doesn't, check the `origin` header
Browser requests include `origin` and other headers that curl doesn't send by default. Reproduce browser behavior with `curl -H "origin: https://..." -H "referer: ..."` to catch CORS and header-dependent issues.
**Source:** dev-decisions.md 2026-03-08, CORS 500 debugging

---

## Deployment

### LESSON: Firebase Functions can't resolve monorepo workspace packages
Firebase deploy uploads only the function directory (`apps/functions/`), not the monorepo root. Any `workspace:*` or local package dependency will fail with E404 on Cloud Build. Solution: copy shared code into the functions directory and use relative imports. Keep copies in sync manually or via a build script.
**Source:** dev-decisions.md 2026-03-08, Firebase deploy fail

### LESSON: `workspace:*` protocol only works in Bun/pnpm — npm rejects it
Vercel uses `npm install` by default. If `package.json` contains `"dependency": "workspace:*"`, npm fails with `EUNSUPPORTEDPROTOCOL`. Either remove the dependency or configure Vercel to use Bun/pnpm.
**Source:** dev-decisions.md 2026-03-08, Vercel build fail

---

## Code Quality

### LESSON: Guard against non-deterministic scraper output
Puppeteer-based scrapers produce different content on each page load (dynamic counters, rotating carousels, load-timing variations). Before saving a diff, compare it against the previous snapshot's diff — if identical, treat it as no change. This prevents false-positive change notifications.
**Source:** qa-decisions.md 2026-03-07, duplicate changes bug

### LESSON: Scope CSS selectors tightly in scrapers
When scraping, always scope selectors to the specific container (e.g., `.gallery-component`) instead of broad page-wide selectors. Broad selectors cause cross-contamination — we had a bug where one app's icon changes appeared under other apps because `img[src*="cdn.shopify.com"]` matched related app cards too.
**Source:** qa-decisions.md 2026-03-07, screenshot cross-contamination bug

### LESSON: Count diffs consistently — don't double-count
When a diff object has both `added` (array) and `addedCount` (number), use one or the other, not both. We had badge counts doubled because code summed both fields.
**Source:** qa-decisions.md 2026-03-07, badge double-counting bug

### LESSON: Never duplicate business logic — use shared modules
If the same function/constant exists in 2+ places, extract to `packages/shared/`. We had `diffChangeCount` in both `changes.js` and `scheduler.js` — fixing one left the other broken, causing 3 rounds of badge bug fixes. Same for `WINDOW_MS` (6 copies) and ownerEmail filtering (6 copies). Single source of truth = change once, fix everywhere.
**Source:** dev-decisions.md 2026-03-08, retrospective consolidation

### LESSON: Use `getActiveItemsByOwner()` instead of raw Firestore queries for user data
Never write `db.collection(X).where("ownerEmail", "==", email)` directly — use the helper which has a built-in guard that throws if `ownerEmail` is empty. This prevents the ownerEmail leak bug that occurred twice.
**Source:** dev-decisions.md 2026-03-08, retrospective consolidation

### LESSON: Per-item state, not global state, for "seen" tracking
When tracking whether a user has seen changes, compare each item's timestamp against its own `seenAt` — not a global session timestamp. Global timestamps cause marking one item as seen to hide badges for other unseen items.
**Source:** qa-decisions.md 2026-03-07, badge disappearing bug

---

## Design & UX

### LESSON: Never use hardcoded Tailwind colors — always use design tokens
Every color must come from CSS variables (`bg-primary`, `text-muted-foreground`, `bg-destructive`). We had to do a full codebase sweep to replace `bg-red-500`, `text-green-600`, etc. Check your own code before submitting.
**Source:** ux-decisions.md 2026-03-06, hardcoded colors cleanup

### LESSON: Replace browser confirm() with proper dialog components
Native `confirm()` breaks the design language and is not accessible. Always use the project's `ConfirmDialog` component for destructive actions.
**Source:** ux-decisions.md 2026-03-07, TASK-002

### LESSON: Use skeleton loaders, not "Loading..." text
Plain text loading states look unfinished. Use `PageSkeleton` or `Skeleton` components. We had to retrofit this across 12+ files.
**Source:** ux-decisions.md 2026-03-07, TASK-001

### LESSON: Standardize language across the entire UI
Pick one language (English) and use it everywhere. We had a jarring mix of Vietnamese login page and English feature pages.
**Source:** ux-decisions.md 2026-03-06, mixed language issue

---

## Architecture & Security

### LESSON: Parallelize independent scrapers — never run Puppeteer tasks sequentially in Cloud Functions
Sequential Puppeteer scrapers easily exceed Cloud Function timeouts (540s). Use `Promise.allSettled` so each scraper type runs concurrently and one failure doesn't block others. Bump memory when running parallel browser instances.
**Source:** TASK-006, scheduler timeout causing partial scrapes (2026-03-07)

### LESSON: Always filter by ownerEmail in user-facing endpoints
Every endpoint that queries user data MUST include `.where("ownerEmail", "==", req.userEmail)`. We've had this bug twice now — first in `/api/changes/latest`, then in ALL 6 scrape-all endpoints. When adding a new endpoint, check if it filters by owner before shipping.
**Source:** dev-decisions.md 2026-03-07, scrape-all ownerEmail fix

### LESSON: Never trust x-user-email header without JWT verification
The current auth setup trusts the `x-user-email` header directly. This is a known critical vulnerability — any site can impersonate users. When working on auth, always verify tokens server-side.
**Source:** qa-decisions.md 2026-03-07, auth bypass finding

### LESSON: Protect expensive endpoints with auth AND rate limiting
Scrape endpoints are resource-intensive (Puppeteer + memory). They must have both authentication and rate limiting. `/scrape-all` was found publicly accessible.
**Source:** qa-decisions.md 2026-03-07, scrape-all public access

### LESSON: Never store `new Date()` in Firestore — always use `.toISOString()`
Firestore converts JavaScript `Date` objects to Firestore Timestamps. If existing data uses ISO strings, mixing types breaks `orderBy` queries — Timestamps and strings sort in separate groups, making new documents invisible. Always use `new Date().toISOString()` for consistency. This caused 3 days of "scrape works but data disappears" debugging.
**Source:** Firestore type mismatch bug, 2026-03-08, addSnapshot/createDoc/updateDoc fix in helpers.js

### LESSON: Always close Puppeteer browsers in finally blocks
Launch browser inside try block, close in finally. If browser is launched before try/finally, a failure in page setup leaks the browser process.
**Source:** qa-decisions.md 2026-03-07, browser cleanup warning

---

## Cross-Agent Coordination

### LESSON: UX decisions that require code changes need developer tasks
When UX Designer makes a design decision, create specific tasks in `docs/tasks.md` with file paths and expected behavior — don't assume the developer will figure it out.
**Source:** ux-decisions.md 2026-03-07, TASK-001 through TASK-004 pattern

### LESSON: Check the full blast radius before making changes
When changing a shared component or API response shape, trace every consumer. The developer agent's methodology (Step 1: identify blast radius) prevents regressions.
**Source:** developer SKILL.md methodology

---

## Process

### LESSON: One-time false positives after fixing data bugs are expected
When you fix a data collection bug (e.g., tighter selectors), the first run will show diffs between old contaminated data and new clean data. This is expected and self-resolves on the next run. Don't panic or try to "fix" the diffs.
**Source:** qa-decisions.md 2026-03-07, screenshot false positive after fix

---

## User & Team Preferences

_See [docs/team-preferences.md](team-preferences.md) for detailed working style preferences._
