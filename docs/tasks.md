# Agent Task Board
<!-- Agents create tasks here for other agents. Check this board during pre-flight before starting work. -->

## Open Tasks

_No open tasks._

---

## Completed Tasks

### ~TASK-006: Parallelize scheduler scrapers to fix timeout~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Refactored `runScrapeAll()` from sequential to parallel using `Promise.allSettled`. All 7 scraper types now run concurrently. Bumped scheduled function memory from 2GiB to 4GiB. Clear per-type success/failure logging added.

### ~TASK-005: Fix duplicate changes from non-deterministic scraping~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Added `isDuplicateDiff` guard to `helpers.js` and applied it to all 7 scraper types in `scheduler.js`, all 6 feature `runXxxScrape` functions, and both `jobs.js` competitor endpoints. Guard compares new diff against previous snapshot's diff via JSON.stringify — if identical, saves with `diff: null` to suppress false-positive changes.

### ~TASK-001: Replace all Loading... text with skeleton components~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Created `skeleton.js` and `page-skeleton.js` components; replaced all `<p>Loading...</p>` with Skeleton placeholders across all 6 feature pages, detail components, dashboard-tabs, admin, changes, and competitors pages.

### ~TASK-002: Replace browser confirm() with AlertDialog component~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Created `confirm-dialog.js` component using native `<dialog>` element; replaced all `confirm()` calls with `ConfirmDialog` + `deleteTarget` state pattern across all 6 feature pages and admin page.

### ~TASK-003: Fix tab-button accessibility~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Changed delete `<span onClick>` to `<button aria-label="Remove tab">` and replaced `text-white` with `text-destructive-foreground` in badge across all 6 feature tab-button components.

### ~TASK-004: Improve empty states across all pages~
- **Completed:** 2026-03-07 by developer
- **Resolution:** Added icon + heading + description empty state pattern using Lucide icons (`BarChart3`, `FileSearch`, `Users`, `Inbox`, `ShieldX`) across all 6 dashboard-tabs, 6 detail components, unauthorized page (emoji → `ShieldX` + `Button`), competitors page (added missing empty state), and dashboard page (added `Inbox` icon to empty changes).
