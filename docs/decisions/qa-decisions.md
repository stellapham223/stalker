# QA Engineering Decisions

This file logs important QA and testing decisions made by the QA Engineer agent. Other agents should reference this file when their work involves quality, testing, or reliability concerns.

---

## [2026-03-06] Full Project Test Plan — Initial Strategy
**Agent:** QA Engineer
**Decision:** Created comprehensive test plan covering all 7 features + auth + admin + scheduler + notifications. Test plan lives at `docs/test-plan.md`.
**Rationale:** Project has grown to 7 scraper-based features with shared patterns (CRUD + scrape + diff + snapshot). A unified test plan ensures consistent coverage across all features and identifies cross-cutting risks.
**Key findings:**
1. **CRITICAL — GET endpoints bypass auth middleware** (index.js line 39-40): All GET requests skip `requireAuth`. Routes must implement their own auth check or read operations are unprotected. Flagged as TC-404.
2. **CRITICAL — No input validation** on POST/PUT bodies across all API routes. No express-validator or manual checks. Flagged in security tests.
3. **HIGH RISK — No rate limiting** on manual scrape endpoints. Rapid-fire scrape requests could exhaust Puppeteer/memory resources.
4. **Architecture note:** Project uses Firestore (not Prisma/PostgreSQL as PRD states). Tests should use Firebase Emulator Suite.
5. **Recommended test stack:** Vitest + Supertest + Playwright (all ESM-compatible with Bun).
**Test plan structure:**
- ~55 P0 tests (core CRUD, auth, security, diffs)
- ~25 P1 tests (edge cases, error handling)
- ~5 P2 tests (minor utilities)
- 6 implementation phases: Unit diffs → Auth/security → API integration → E2E → Scraper reliability → Manual
**Affected files:** `docs/test-plan.md`

---

## [2026-03-07] Bug Fix — App Listing Screenshot Cross-Contamination
**Agent:** QA Engineer
**Decision:** Fixed screenshot scraper selector to scope to `.gallery-component` container and filter out `/icon/` URLs.
**Root cause:** `appListingScraper.js` used `$('img[src*="cdn.shopify.com/app-store/listing_images"]')` which captured ALL listing images on the page, including app icons from "More apps like this" sections. When Seal changed their app icon, the new icon URL appeared on Subi's and Joy's pages (in related app cards with `data-controller="app-card"`), causing false diffs attributed to those apps.
**Two symptoms:**
1. Dashboard showed Seal's screenshot changes under Subi and Joy (wrong attribution)
2. Individual app tabs showed "No changes" (correctly, since the false diff was only in historical snapshots)
**Fix:** Scoped image selector to `.gallery-component` (Shopify's gallery container) with body fallback, and added `/icon/` URL filter as secondary guard.
**Verified:** Tested against live Shopify pages — Subi went from 15 to 12 screenshots (Seal contamination removed), Joy from 11 to 8, Seal's own 7 screenshots preserved.
**Affected files:** `apps/functions/src/scrapers/appListingScraper.js`

---

## [2026-03-07] QA Review — Scheduled Scraping System (Post First Run)
**Agent:** QA Engineer
**Decision:** Full QA review of scheduler, scrapers, and supporting code after first scheduled run.
**Screenshot false positive confirmed:** Dashboard shows screenshot changes for all apps after first run post-fix. This is expected one-time behavior — old baseline snapshots contain contaminated screenshots, new snapshots are clean, diff shows the delta. Will auto-resolve after next scheduled run.
**Key findings (11 issues):**
1. **CRITICAL — Auth bypass:** `x-user-email` header trusted without JWT verification + CORS fully permissive (`origin: true`). Any site can impersonate users. (middleware.js:5, index.js:31)
2. **CRITICAL — `/scrape-all` public:** Middleware skips auth (index.js:41). Anyone can trigger expensive 2GiB scrape cycles.
3. **WARNING — Browser cleanup in scrapers:** Puppeteer browser launched before try/finally block in competitorScraper, menuScraper, homepageScraper, guideDocsScraper. If page setup fails, browser process leaks.
4. **WARNING — 540s timeout may be insufficient:** 7 sequential scrapers with multiple tracked items. If 5+ items per collection, total time could exceed 9 min Cloud Function limit.
5. **WARNING — Notification `since` window is fragile:** Hardcoded 2h lookback (scheduler.js:206). Should use scrape start time instead.
6. **WARNING — Firestore batch limit 500:** `deleteDocWithSnapshots` (helpers.js:126) will fail for docs with 500+ snapshots.
7. **WARNING — `getRecentSnapshotsWithDiff` is misleading:** Returns latest snapshot regardless of diff existence (helpers.js:240). Works by accident for keywords (fields stored at top level) but inconsistent with other types.
8. **SUGGESTION — Telegram 4096 char limit:** Large change reports could exceed max message length.
9. **SUGGESTION — `totalJobs` counter misleading:** Counts parent docs, not actual snapshots written.
10. **SUGGESTION — Competitor snapshot query inconsistency:** Uses manual query instead of getLatestSnapshot helper (scheduler.js:32-37).
11. **SUGGESTION — differ.js counts chunks not lines:** diffSummary reports section count instead of line count.
**PRD update:** Feature 1 updated from Letsmetrix comparison to direct Shopify app listing scraping.
**Overall risk:** High — auth issues are top priority.
**Affected files:** `apps/functions/src/index.js`, `apps/functions/src/scheduler.js`, `apps/functions/src/api/middleware.js`, `apps/functions/src/db/helpers.js`, all scraper files, `PRD.md`
