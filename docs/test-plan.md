# Test Plan: Competitor Stalker — Full Project

## Overview
- **Project:** SaaS application for monitoring competitor changes on Shopify App Store
- **Scope:** All 7 features (Competitors, App Listing, Keyword Rankings, Autocomplete, Website Menus, Homepage Monitor, Guide Docs) + Auth + Dashboard + Admin + Scheduler + Notifications
- **Test environment:** Local dev (Firebase emulator) / Staging (Firebase project)
- **Tech stack:** Express + Puppeteer + Firestore (backend on Firebase Functions), Next.js 15 + TanStack Query (frontend)
- **Dependencies:** Firestore emulator, Puppeteer, Telegram Bot API, Google OAuth, external websites (Shopify, Letsmetrix, competitor sites)

---

## Test Coverage Matrix

| Area | Unit | Integration | E2E | Manual |
|------|:----:|:-----------:|:---:|:------:|
| Diff algorithms (differ.js, each scraper's computeXxxDiff) | X | | | |
| DB helpers (helpers.js) | | X | | |
| Auth middleware | X | X | | |
| API routes (7 feature modules + admin + changes) | | X | | |
| Scrapers (7 scrapers) | X | X | | X |
| Scheduler (runScrapeAll) | | X | | |
| Telegram notifications | | X | | |
| Frontend API client (fetchJSON, postJSON, deleteJSON) | X | | | |
| Frontend pages (7 features + dashboard + admin) | | | X | X |
| Auth flow (Google OAuth login/logout) | | | X | X |
| Sidebar navigation | | | | X |
| Design system (theme, responsive) | | | | X |

---

## 1. Unit Tests

### 1.1 Diff Algorithms

**File:** `apps/functions/src/scrapers/differ.js`

#### TC-001: computeDiff — No changes between identical strings
- **Preconditions:** None
- **Steps:** Call `computeDiff("hello world", "hello world")`
- **Expected result:** `{ hasChanges: false, diff: null, diffSummary: null }`
- **Priority:** P0

#### TC-002: computeDiff — Detect text additions
- **Preconditions:** None
- **Steps:** Call `computeDiff("line1", "line1\nline2")`
- **Expected result:** `hasChanges: true`, diff contains added lines
- **Priority:** P0

#### TC-003: computeDiff — Detect text removals
- **Preconditions:** None
- **Steps:** Call `computeDiff("line1\nline2", "line1")`
- **Expected result:** `hasChanges: true`, diff contains removed lines
- **Priority:** P0

#### TC-004: computeDiff — First snapshot (null previous)
- **Preconditions:** None
- **Steps:** Call `computeDiff(null, "new content")`
- **Expected result:** `hasChanges: false` (first snapshot = no diff)
- **Priority:** P0

#### TC-005: computeDiff — Both null
- **Preconditions:** None
- **Steps:** Call `computeDiff(null, null)`
- **Expected result:** `hasChanges: false`
- **Priority:** P1

#### TC-006: computeDiff — Empty string vs content
- **Preconditions:** None
- **Steps:** Call `computeDiff("", "new content")`
- **Expected result:** `hasChanges: true`
- **Priority:** P1

#### TC-007: computeDiff — Special characters (HTML, Unicode)
- **Preconditions:** None
- **Steps:** Call `computeDiff("<b>old</b>", "<b>new</b> 日本語")`
- **Expected result:** `hasChanges: true`, diff correctly represents changes
- **Priority:** P1

**File:** `apps/functions/src/scrapers/keywordScraper.js`

#### TC-010: computeRankingDiff — Detect new entries in top 12
- **Preconditions:** None
- **Steps:** Call with previous rankings [A,B,C] and new rankings [A,B,D]
- **Expected result:** `newEntries: ["D"]`, `droppedEntries: ["C"]`, `hasChanges: true`
- **Priority:** P0

#### TC-011: computeRankingDiff — Detect position changes
- **Preconditions:** None
- **Steps:** Call with previous [A@1, B@2] and new [B@1, A@2]
- **Expected result:** `positionChanges` contains both A and B with old/new positions
- **Priority:** P0

#### TC-012: computeRankingDiff — No changes
- **Preconditions:** None
- **Steps:** Call with identical rankings
- **Expected result:** `hasChanges: false`
- **Priority:** P0

#### TC-013: computeRankingDiff — First snapshot (null previous)
- **Preconditions:** None
- **Steps:** Call with null previous, valid new rankings
- **Expected result:** `hasChanges: false` (no diff for first snapshot)
- **Priority:** P0

**File:** `apps/functions/src/scrapers/autocompleteScraper.js`

#### TC-020: computeAutocompleteDiff — Detect added suggestions
- **Preconditions:** None
- **Steps:** Call with previous ["sub1", "sub2"] and new ["sub1", "sub2", "sub3"]
- **Expected result:** `diff.added: ["sub3"]`, `hasChanges: true`
- **Priority:** P0

#### TC-021: computeAutocompleteDiff — Detect removed suggestions
- **Preconditions:** None
- **Steps:** Call with previous ["sub1", "sub2"] and new ["sub1"]
- **Expected result:** `diff.removed: ["sub2"]`, `hasChanges: true`
- **Priority:** P0

#### TC-022: computeAutocompleteDiff — Detect reordered suggestions
- **Preconditions:** None
- **Steps:** Call with previous ["sub1", "sub2"] and new ["sub2", "sub1"]
- **Expected result:** `diff.reordered` contains entries, `hasChanges: true`
- **Priority:** P1

**File:** `apps/functions/src/scrapers/menuScraper.js`

#### TC-030: computeMenuDiff — Detect added menu items
- **Preconditions:** None
- **Steps:** Call with previous tree and new tree with extra node
- **Expected result:** `diff.added` contains the new menu item
- **Priority:** P0

#### TC-031: computeMenuDiff — Detect removed menu items
- **Preconditions:** None
- **Steps:** Call with previous tree having more items than new tree
- **Expected result:** `diff.removed` contains the removed item
- **Priority:** P0

#### TC-032: computeMenuDiff — Detect renamed menu items (same URL, different label)
- **Preconditions:** None
- **Steps:** Call with item {label: "Old", url: "/page"} → {label: "New", url: "/page"}
- **Expected result:** `diff.renamed` contains the rename
- **Priority:** P1

#### TC-033: computeMenuDiff — Nested children changes
- **Preconditions:** None
- **Steps:** Call with change in 2nd-level nested children
- **Expected result:** `diff.childrenChanged` or similar field captures nested diff
- **Priority:** P1

**File:** `apps/functions/src/scrapers/homepageScraper.js`

#### TC-040: computeHomepageDiff — Detect content changes
- **Preconditions:** None
- **Steps:** Call with different fullText strings
- **Expected result:** `hasChanges: true`, diff contains addedCount/removedCount
- **Priority:** P0

#### TC-041: computeHomepageDiff — First snapshot
- **Preconditions:** None
- **Steps:** Call with null previous
- **Expected result:** `hasChanges: false`
- **Priority:** P0

**File:** `apps/functions/src/scrapers/appListingScraper.js`

#### TC-050: computeAppListingDiff — Detect field changes
- **Preconditions:** None
- **Steps:** Call with previous {rating: 4.5} and new {rating: 4.6}
- **Expected result:** `hasChanges: true`, diff identifies rating change
- **Priority:** P0

#### TC-051: computeAppListingDiff — No changes
- **Preconditions:** None
- **Steps:** Call with identical data
- **Expected result:** `hasChanges: false`
- **Priority:** P0

**File:** `apps/functions/src/scrapers/guideDocsScraper.js`

#### TC-060: computeGuideDocsDiff — Detect nav structure changes
- **Preconditions:** None
- **Steps:** Call with different navigation data
- **Expected result:** Appropriate diff fields populated
- **Priority:** P0

### 1.2 Auth Middleware

**File:** `apps/functions/src/api/middleware.js`

#### TC-070: requireAuth — Missing x-user-email header
- **Preconditions:** None
- **Steps:** Call middleware with request lacking `x-user-email` header
- **Expected result:** Returns 401 `{ error: "Not authenticated" }`
- **Priority:** P0

#### TC-071: requireAuth — Email not in allowed users
- **Preconditions:** Mock `getUserByEmail` to return null
- **Steps:** Call middleware with `x-user-email: unknown@test.com`
- **Expected result:** Returns 401 `{ error: "Not authenticated" }`
- **Priority:** P0

#### TC-072: requireAuth — Valid user passes through
- **Preconditions:** Mock `getUserByEmail` to return user object
- **Steps:** Call middleware with valid email
- **Expected result:** `next()` is called, `req.userEmail` is set
- **Priority:** P0

#### TC-073: requireAuth — Email trimming and lowercase
- **Preconditions:** Mock `getUserByEmail`
- **Steps:** Call with `x-user-email: "  User@Test.COM  "`
- **Expected result:** `getUserByEmail` called with `"user@test.com"`
- **Priority:** P1

#### TC-074: checkOwnership — Document not found
- **Preconditions:** Mock `getById` to return null
- **Steps:** Call `checkOwnership("col", "fake-id", "user@test.com")`
- **Expected result:** `{ doc: null, allowed: false, notFound: true }`
- **Priority:** P0

#### TC-075: checkOwnership — Different owner
- **Preconditions:** Mock `getById` to return doc with `ownerEmail: "other@test.com"`
- **Steps:** Call `checkOwnership("col", "id", "user@test.com")`
- **Expected result:** `{ doc, allowed: false, notFound: false }`
- **Priority:** P0

#### TC-076: checkOwnership — Correct owner
- **Preconditions:** Mock `getById` to return doc with matching ownerEmail
- **Steps:** Call `checkOwnership("col", "id", "user@test.com")`
- **Expected result:** `{ doc, allowed: true, notFound: false }`
- **Priority:** P0

### 1.3 DB Helpers

**File:** `apps/functions/src/db/helpers.js`

#### TC-080: uuid — Generates valid UUID v4
- **Preconditions:** None
- **Steps:** Call `uuid()` multiple times
- **Expected result:** Each returns unique, valid UUID format string
- **Priority:** P1

#### TC-081: serializeDoc — Converts Firestore Timestamps to ISO strings
- **Preconditions:** None
- **Steps:** Call with doc having Firestore Timestamp objects for createdAt/updatedAt
- **Expected result:** Both fields converted to ISO strings
- **Priority:** P1

#### TC-082: serializeDoc — Handles null input
- **Preconditions:** None
- **Steps:** Call `serializeDoc(null)`
- **Expected result:** Returns null
- **Priority:** P1

#### TC-083: serializeDocs — Serializes array of documents
- **Preconditions:** None
- **Steps:** Call with array of docs
- **Expected result:** All docs serialized correctly
- **Priority:** P2

### 1.4 Frontend API Client

**File:** `apps/web/lib/api/client.js`

#### TC-090: fetchJSON — Includes auth headers
- **Preconditions:** Mock `getSession` to return session with email
- **Steps:** Call `fetchJSON("/test")`
- **Expected result:** Fetch called with `x-user-email` header
- **Priority:** P0

#### TC-091: fetchJSON — Throws on non-ok response
- **Preconditions:** Mock fetch to return 500
- **Steps:** Call `fetchJSON("/test")`
- **Expected result:** Throws `Error("API error: 500")`
- **Priority:** P0

#### TC-092: postJSON — Sends JSON body
- **Preconditions:** Mock fetch
- **Steps:** Call `postJSON("/test", { name: "test" })`
- **Expected result:** Fetch called with method POST, Content-Type: application/json, body: `{"name":"test"}`
- **Priority:** P0

#### TC-093: deleteJSON — Returns null on 204
- **Preconditions:** Mock fetch to return 204
- **Steps:** Call `deleteJSON("/test/123")`
- **Expected result:** Returns null (not attempting to parse body)
- **Priority:** P1

---

## 2. Integration Tests

### 2.1 API Routes — Keyword Rankings

**File:** `apps/functions/src/api/keywords.js`

#### TC-100: GET /keywords — Returns user's keyword trackings
- **Preconditions:** Auth header set, user has 2 keyword trackings in Firestore
- **Steps:** GET `/keywords`
- **Expected result:** 200, array of 2 keyword objects with id, keyword, searchUrl, active, createdAt
- **Priority:** P0

#### TC-101: POST /keywords — Create new keyword tracking
- **Preconditions:** Auth header set
- **Steps:** POST `/keywords` with `{ keyword: "subscription", searchUrl: "https://apps.shopify.com/search?q=subscription" }`
- **Expected result:** 201, created keyword object with generated id
- **Priority:** P0

#### TC-102: DELETE /keywords/:id — Delete keyword tracking
- **Preconditions:** Auth header set, keyword exists owned by user
- **Steps:** DELETE `/keywords/valid-id`
- **Expected result:** 200 or 204, keyword and all snapshots deleted
- **Priority:** P0

#### TC-103: GET /keywords/:id/snapshots — Returns snapshot history
- **Preconditions:** Keyword exists with 5 snapshots
- **Steps:** GET `/keywords/valid-id/snapshots`
- **Expected result:** 200, array of snapshots ordered by createdAt desc
- **Priority:** P0

#### TC-104: GET /keywords/:id/snapshots/latest — Returns most recent snapshot
- **Preconditions:** Keyword exists with snapshots
- **Steps:** GET `/keywords/valid-id/snapshots/latest`
- **Expected result:** 200, single snapshot object (most recent)
- **Priority:** P0

#### TC-105: GET /keywords/:id/changes — Returns only snapshots with diffs
- **Preconditions:** Keyword exists with 5 snapshots, 2 have diffs
- **Steps:** GET `/keywords/valid-id/changes`
- **Expected result:** 200, array of 2 snapshots that have non-null diff fields
- **Priority:** P1

#### TC-106: POST /keywords/:id/scrape — Trigger manual scrape
- **Preconditions:** Auth header set, keyword exists
- **Steps:** POST `/keywords/valid-id/scrape`
- **Expected result:** 200, new snapshot created and returned
- **Priority:** P0

#### TC-107: DELETE /keywords/:id — IDOR attempt (other user's resource)
- **Preconditions:** Auth as user A, keyword owned by user B
- **Steps:** DELETE `/keywords/other-user-id`
- **Expected result:** 403 Forbidden
- **Priority:** P0

#### TC-108: GET /keywords — No auth header
- **Preconditions:** No x-user-email header (GET requests pass auth middleware per index.js)
- **Steps:** GET `/keywords` without auth
- **Expected result:** 200 (GET is unprotected per middleware) or route-level auth check returns 401
- **Test data:** Check whether route has its own auth check
- **Priority:** P0

### 2.2 API Routes — Autocomplete

**File:** `apps/functions/src/api/autocomplete.js`

#### TC-110: GET /autocomplete — Returns user's autocomplete trackings
- **Preconditions:** Auth header, user has trackings
- **Steps:** GET `/autocomplete`
- **Expected result:** 200, array of tracking objects
- **Priority:** P0

#### TC-111: POST /autocomplete — Create new tracking
- **Preconditions:** Auth header
- **Steps:** POST `/autocomplete` with `{ query: "subs", targetUrl: "https://apps.shopify.com" }`
- **Expected result:** 201, created tracking
- **Priority:** P0

#### TC-112: POST /autocomplete/:id/scrape — Trigger manual scrape
- **Preconditions:** Auth, tracking exists
- **Steps:** POST `/autocomplete/valid-id/scrape`
- **Expected result:** 200, new snapshot with suggestions array
- **Priority:** P0

### 2.3 API Routes — App Listing

**File:** `apps/functions/src/api/appListing.js`

#### TC-120: GET /app-listing — Returns app listing competitors
- **Preconditions:** Auth, user has app listing entries
- **Steps:** GET `/app-listing`
- **Expected result:** 200, array of app listing competitor objects
- **Priority:** P0

#### TC-121: POST /app-listing — Add new app to track
- **Preconditions:** Auth
- **Steps:** POST `/app-listing` with `{ name: "Seal", appUrl: "https://apps.shopify.com/seal-subscriptions" }`
- **Expected result:** 201, created object
- **Priority:** P0

#### TC-122: POST /app-listing/:id/scrape — Trigger manual scrape
- **Preconditions:** Auth, app listing exists
- **Steps:** POST `/app-listing/valid-id/scrape`
- **Expected result:** 200, new snapshot with scraped app data
- **Priority:** P0

### 2.4 API Routes — Website Menus

**File:** `apps/functions/src/api/websiteMenus.js`

#### TC-130: GET /website-menus — Returns tracked websites
- **Preconditions:** Auth, user has website menu trackings
- **Steps:** GET `/website-menus`
- **Expected result:** 200, array of tracking objects with name, url, interactionType
- **Priority:** P0

#### TC-131: POST /website-menus — Add website to track
- **Preconditions:** Auth
- **Steps:** POST `/website-menus` with `{ name: "Recharge", url: "https://getrecharge.com/", interactionType: "click" }`
- **Expected result:** 201, created tracking
- **Priority:** P0

#### TC-132: PUT /website-menus/:id — Update config
- **Preconditions:** Auth, tracking exists owned by user
- **Steps:** PUT `/website-menus/valid-id` with `{ interactionType: "hover" }`
- **Expected result:** 200, updated tracking
- **Priority:** P1

#### TC-133: POST /website-menus/scrape-all — Scrape all websites
- **Preconditions:** Auth, multiple trackings exist
- **Steps:** POST `/website-menus/scrape-all`
- **Expected result:** 200, all websites scraped
- **Priority:** P1

### 2.5 API Routes — Homepage Monitor

**File:** `apps/functions/src/api/homepage.js`

#### TC-140: GET /homepage — Returns tracked homepages
- **Preconditions:** Auth, user has homepage trackings
- **Steps:** GET `/homepage`
- **Expected result:** 200, array of tracking objects
- **Priority:** P0

#### TC-141: POST /homepage — Add homepage to track
- **Preconditions:** Auth
- **Steps:** POST `/homepage` with `{ name: "Loop", url: "https://www.loopwork.co/" }`
- **Expected result:** 201, created tracking
- **Priority:** P0

#### TC-142: POST /homepage/:id/scrape — Trigger manual scrape
- **Preconditions:** Auth, tracking exists
- **Steps:** POST `/homepage/valid-id/scrape`
- **Expected result:** 200, snapshot with sections, stats, testimonials, fullText
- **Priority:** P0

#### TC-143: POST /homepage/scrape-all — Scrape all homepages
- **Preconditions:** Auth, multiple trackings
- **Steps:** POST `/homepage/scrape-all`
- **Expected result:** 200, all homepages scraped
- **Priority:** P1

### 2.6 API Routes — Guide Docs

**File:** `apps/functions/src/api/guideDocs.js`

#### TC-150: GET /guide-docs — Returns tracked guide docs
- **Preconditions:** Auth, user has guide docs trackings
- **Steps:** GET `/guide-docs`
- **Expected result:** 200, array of tracking objects
- **Priority:** P0

#### TC-151: POST /guide-docs — Add guide doc to track
- **Preconditions:** Auth
- **Steps:** POST `/guide-docs` with `{ name: "Recharge Docs", url: "https://docs.getrecharge.com/" }`
- **Expected result:** 201, created tracking
- **Priority:** P0

### 2.7 API Routes — Competitors (Legacy)

**File:** `apps/functions/src/api/competitors.js`

#### TC-160: GET /competitors — Returns user's competitors
- **Preconditions:** Auth, user has competitor entries
- **Steps:** GET `/competitors`
- **Expected result:** 200, array of competitor objects with tracked fields
- **Priority:** P0

#### TC-161: POST /competitors — Create competitor
- **Preconditions:** Auth
- **Steps:** POST `/competitors` with valid body
- **Expected result:** 201, created competitor
- **Priority:** P0

#### TC-162: DELETE /competitors/:id — Delete with cascade
- **Preconditions:** Auth, competitor with snapshots exists
- **Steps:** DELETE `/competitors/valid-id`
- **Expected result:** 200/204, competitor + all snapshots + tracked fields deleted
- **Priority:** P0

### 2.8 API Routes — Changes (Aggregated)

**File:** `apps/functions/src/api/changes.js`

#### TC-170: GET /changes — Returns aggregated changes across all features
- **Preconditions:** Auth, various features have snapshots with diffs
- **Steps:** GET `/changes`
- **Expected result:** 200, aggregated list of recent changes sorted by date
- **Priority:** P0

#### TC-171: GET /changes — Empty state (no changes)
- **Preconditions:** Auth, no snapshots have diffs
- **Steps:** GET `/changes`
- **Expected result:** 200, empty array
- **Priority:** P1

### 2.9 API Routes — Admin

**File:** `apps/functions/src/api/admin.js`

#### TC-180: Admin endpoints — Manage allowed users
- **Preconditions:** Auth as admin user
- **Steps:** Test CRUD operations for allowed users
- **Expected result:** Only admin can manage user access
- **Priority:** P0

### 2.10 Scheduler Integration

**File:** `apps/functions/src/scheduler.js`

#### TC-190: runScrapeAll — Runs all 7 scraper types sequentially
- **Preconditions:** Each collection has at least 1 active tracking
- **Steps:** Call `runScrapeAll()`
- **Expected result:** All 7 scraper types execute, snapshots created for each, Telegram notification sent if changes detected
- **Priority:** P0

#### TC-191: runScrapeAll — Handles individual scraper failure gracefully
- **Preconditions:** One scraper throws error, others work fine
- **Steps:** Mock one scraper to throw, call `runScrapeAll()`
- **Expected result:** Error logged for failing scraper, remaining scrapers continue executing
- **Priority:** P0

#### TC-192: runScrapeAll — Skips inactive trackings
- **Preconditions:** Mix of active and inactive trackings
- **Steps:** Call `runScrapeAll()`
- **Expected result:** Only active trackings (active: true) are scraped
- **Priority:** P1

### 2.11 Telegram Notifications

**File:** `apps/functions/src/scrapers/telegram.js`

#### TC-195: sendNotification — Sends message when changes detected
- **Preconditions:** Recent snapshots have diffs
- **Steps:** Call `sendNotification()` (internal to scheduler)
- **Expected result:** Telegram API called with formatted HTML message containing change summary
- **Priority:** P1

#### TC-196: sendNotification — Skips when no changes
- **Preconditions:** No recent diffs
- **Steps:** Call `sendNotification()`
- **Expected result:** No Telegram API call made, logs "No changes detected"
- **Priority:** P1

### 2.12 DB Helpers Integration (with Firestore Emulator)

#### TC-200: createDoc + getById — Round-trip consistency
- **Preconditions:** Firestore emulator running
- **Steps:** `createDoc("test", { name: "test" })`, then `getById("test", id)`
- **Expected result:** Returned doc matches created data, has createdAt/updatedAt
- **Priority:** P0

#### TC-201: addSnapshot + getSnapshots — Snapshot ordering
- **Preconditions:** Parent doc exists
- **Steps:** Add 3 snapshots with different data, then `getSnapshots()`
- **Expected result:** Snapshots returned in createdAt desc order
- **Priority:** P0

#### TC-202: deleteDocWithSnapshots — Cascade delete
- **Preconditions:** Parent doc with 3 snapshots
- **Steps:** Call `deleteDocWithSnapshots("collection", id)`
- **Expected result:** Parent doc and all subcollection snapshots deleted
- **Priority:** P0

#### TC-203: getLatestSnapshot — Returns most recent
- **Preconditions:** Parent doc with 5 snapshots
- **Steps:** Call `getLatestSnapshot("collection", parentId)`
- **Expected result:** Returns the snapshot with the newest createdAt
- **Priority:** P0

#### TC-204: getSnapshotsWithChanges — Filters by non-null diff
- **Preconditions:** 5 snapshots, 2 with diff != null
- **Steps:** Call `getSnapshotsWithChanges("collection", parentId)`
- **Expected result:** Returns only 2 snapshots that have diffs
- **Priority:** P1

#### TC-205: getActiveItemsByOwner — Filters by owner and active
- **Preconditions:** 3 docs: 2 active owned by user, 1 inactive owned by user, 1 active owned by other
- **Steps:** Call `getActiveItemsByOwner("collection", "user@test.com")`
- **Expected result:** Returns only 2 active docs owned by user
- **Priority:** P0

---

## 3. E2E Tests

### 3.1 Authentication Flow

#### TC-300: Login with Google OAuth
- **Preconditions:** User has Google account, email is in allowed users
- **Steps:**
  1. Navigate to `/login`
  2. Click "Sign in with Google"
  3. Complete Google OAuth flow
  4. Observe redirect
- **Expected result:** Redirected to `/dashboard`, sidebar visible, user session active
- **Priority:** P0

#### TC-301: Unauthorized user login
- **Preconditions:** Google account NOT in allowed users list
- **Steps:**
  1. Navigate to `/login`
  2. Sign in with unauthorized Google account
- **Expected result:** Redirected to `/unauthorized` page with appropriate message
- **Priority:** P0

#### TC-302: Session persistence on refresh
- **Preconditions:** User logged in
- **Steps:** Refresh browser page
- **Expected result:** User remains logged in, redirected to dashboard (not login)
- **Priority:** P0

### 3.2 Keyword Rankings Flow

#### TC-310: Add keyword and view rankings
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "Keyword Rankings" from sidebar
  2. Click "Add Keyword" button
  3. Fill in keyword: "subscription", search URL
  4. Submit form
  5. Verify keyword appears in list
- **Expected result:** New keyword tracking created, appears in list
- **Priority:** P0

#### TC-311: Trigger manual scrape for keyword
- **Preconditions:** Keyword tracking exists
- **Steps:**
  1. Navigate to keyword detail
  2. Click "Scrape Now" button
  3. Wait for scrape to complete
- **Expected result:** Loading state shown, then new snapshot appears with top 12 rankings
- **Priority:** P0

#### TC-312: View keyword ranking changes over time
- **Preconditions:** Keyword has multiple snapshots with diffs
- **Steps:**
  1. Navigate to keyword detail
  2. View changes tab/section
- **Expected result:** Shows NEW badges for new apps, DROPPED badges for removed apps, position change arrows
- **Priority:** P0

#### TC-313: Delete keyword tracking
- **Preconditions:** Keyword tracking exists
- **Steps:**
  1. Click delete button on keyword
  2. Confirm deletion
- **Expected result:** Keyword removed from list, all snapshots deleted
- **Priority:** P0

### 3.3 Autocomplete Flow

#### TC-320: Add autocomplete query and view suggestions
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "Autocomplete"
  2. Add new query: "subs"
  3. Trigger scrape
- **Expected result:** Autocomplete suggestions displayed as ordered list
- **Priority:** P0

#### TC-321: View autocomplete changes
- **Preconditions:** Multiple snapshots with diffs
- **Steps:** Navigate to autocomplete detail, view changes
- **Expected result:** Added suggestions highlighted green, removed highlighted red, reordered highlighted yellow
- **Priority:** P0

### 3.4 App Listing Flow

#### TC-330: Add app and view listing data
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "App Listing"
  2. Add app URL (Letsmetrix comparison URL)
  3. Trigger scrape
- **Expected result:** App listing data displayed with tabs (App Info, Ranking, Pricing, Review)
- **Priority:** P0

#### TC-331: View app listing diff highlights
- **Preconditions:** Multiple snapshots with field changes
- **Steps:** Navigate to app listing with changes
- **Expected result:** Changed fields highlighted with diff colors
- **Priority:** P0

### 3.5 Website Menus Flow

#### TC-340: Add website and view menu structure
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "Website Menus"
  2. Add website (name, URL, interaction type)
  3. Trigger scrape
- **Expected result:** Tree view of menu structure displayed (expandable/collapsible)
- **Priority:** P0

#### TC-341: View menu diff
- **Preconditions:** Multiple snapshots with menu changes
- **Steps:** View changes for a website
- **Expected result:** Added items green, removed items red, renamed items yellow
- **Priority:** P0

### 3.6 Homepage Monitor Flow

#### TC-350: Add homepage and view content
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "Homepage Monitor"
  2. Add website URL
  3. Trigger scrape
- **Expected result:** Homepage text content displayed organized by sections
- **Priority:** P0

#### TC-351: View homepage diff
- **Preconditions:** Multiple snapshots with content changes
- **Steps:** View diff between two snapshots
- **Expected result:** Inline text diff displayed (GitHub-style), added text green, removed text red
- **Priority:** P0

### 3.7 Guide Docs Flow

#### TC-360: Add guide doc and view nav structure
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to "Guide Docs"
  2. Add guide doc URL
  3. Trigger scrape
- **Expected result:** Guide doc navigation structure displayed
- **Priority:** P0

### 3.8 Dashboard Flow

#### TC-370: Dashboard shows aggregated overview
- **Preconditions:** User logged in, has data across multiple features
- **Steps:** Navigate to Dashboard
- **Expected result:** Shows summary cards/stats for all feature areas
- **Priority:** P0

#### TC-371: Dashboard empty state
- **Preconditions:** New user, no data
- **Steps:** Navigate to Dashboard
- **Expected result:** Helpful empty state guiding user to add their first tracking
- **Priority:** P1

### 3.9 Changes (Aggregated) Flow

#### TC-380: View all changes across features
- **Preconditions:** Various features have recent changes
- **Steps:** Navigate to "Changes" page
- **Expected result:** Aggregated timeline of changes from all features, sorted by date
- **Priority:** P0

### 3.10 Admin Flow

#### TC-390: Admin manages allowed users
- **Preconditions:** Admin user logged in
- **Steps:**
  1. Navigate to Admin page
  2. Add new allowed user email
  3. Verify user can now log in
- **Expected result:** New user added to allowed list, can authenticate
- **Priority:** P0

---

## 4. Security Tests

### 4.1 Authentication & Authorization

#### TC-400: Access API without auth header
- **Preconditions:** None
- **Steps:** POST to any mutation endpoint without `x-user-email`
- **Expected result:** 401 Unauthorized
- **Priority:** P0

#### TC-401: Access API with non-allowed email
- **Preconditions:** None
- **Steps:** POST with `x-user-email: hacker@evil.com`
- **Expected result:** 401 Unauthorized
- **Priority:** P0

#### TC-402: IDOR — Access other user's keyword tracking
- **Preconditions:** User A owns keyword "abc", User B authenticated
- **Steps:** User B calls DELETE `/keywords/abc`
- **Expected result:** 403 Forbidden (ownership check)
- **Priority:** P0

#### TC-403: IDOR — Access other user's snapshots
- **Preconditions:** User A owns tracking, User B authenticated
- **Steps:** User B calls GET `/keywords/user-a-id/snapshots`
- **Expected result:** 403 or empty result (ownership check)
- **Priority:** P0

#### TC-404: GET endpoints auth bypass
- **Preconditions:** Middleware skips auth for GET requests
- **Steps:** GET `/keywords` without auth header
- **Expected result:** Verify behavior — if returns data, flag as security risk (GET should still filter by user)
- **Test data:** This tests the middleware pattern in index.js where GET bypasses requireAuth
- **Priority:** P0 (CRITICAL — potential auth bypass for read operations)

### 4.2 Input Validation

#### TC-410: XSS in keyword name
- **Preconditions:** Auth
- **Steps:** POST `/keywords` with `{ keyword: "<script>alert('xss')</script>" }`
- **Expected result:** Input sanitized or rejected; if stored, frontend escapes on render
- **Priority:** P0

#### TC-411: XSS in website name
- **Preconditions:** Auth
- **Steps:** POST `/website-menus` with `{ name: "<img onerror=alert(1) src=x>" }`
- **Expected result:** Input sanitized or safely rendered
- **Priority:** P0

#### TC-412: SQL/NoSQL injection in query params
- **Preconditions:** Auth
- **Steps:** GET `/keywords?keyword[$ne]=` or similar NoSQL injection
- **Expected result:** No unintended data returned, query treated as literal
- **Priority:** P1

#### TC-413: Very long input strings
- **Preconditions:** Auth
- **Steps:** POST `/keywords` with keyword of 10,000+ characters
- **Expected result:** Rejected with 400 or safely handled
- **Priority:** P1

#### TC-414: Empty/missing required fields
- **Preconditions:** Auth
- **Steps:** POST `/keywords` with `{}`
- **Expected result:** 400 Bad Request with field validation errors
- **Priority:** P0

### 4.3 Rate Limiting

#### TC-420: Rapid-fire scrape requests
- **Preconditions:** Auth, tracking exists
- **Steps:** Send 20 POST `/keywords/id/scrape` requests in 5 seconds
- **Expected result:** Should have rate limiting; if not, flag as risk (Puppeteer resource exhaustion)
- **Priority:** P1

---

## 5. Scraper-Specific Tests

### 5.1 Keyword Scraper

#### TC-500: Scrapes top 12 organic results (excludes ads)
- **Preconditions:** Puppeteer available, internet access
- **Steps:** Call `scrapeKeywordRanking("https://apps.shopify.com/search?q=subscription")`
- **Expected result:** Returns array of 12 items, each with position, appName, appSlug, developer, rating, reviewCount, pricingLabel; no items with isAd=true
- **Priority:** P0

#### TC-501: Handles Shopify page load failure
- **Preconditions:** Mock or disconnect network
- **Steps:** Call scraper with unreachable URL
- **Expected result:** Throws meaningful error, browser properly closed
- **Priority:** P0

#### TC-502: Browser cleanup on error
- **Preconditions:** Mock page to throw mid-scrape
- **Steps:** Call scraper, verify browser.close() called in finally
- **Expected result:** No lingering Chromium processes
- **Priority:** P0

### 5.2 Autocomplete Scraper

#### TC-510: Captures autocomplete suggestions for "subs"
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeAutocomplete("subs")`
- **Expected result:** Returns `{ suggestions: [...], appSuggestions: [...], rawResponse: {...} }`
- **Priority:** P0

#### TC-511: Fallback to DOM scraping if API intercept fails
- **Preconditions:** API intercept blocked
- **Steps:** Call scraper when API intercept fails
- **Expected result:** Falls back to dropdown DOM scraping
- **Priority:** P1

### 5.3 Menu Scraper

#### TC-520: Scrapes hover-based menus (Appstle, Seal, Subi, Loop)
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeWebsiteMenu("https://appstle.com/products/ecommerce-subscriptions/", "hover")`
- **Expected result:** Returns nested menu structure with labels, URLs, and children
- **Priority:** P0

#### TC-521: Scrapes click-based menus (Recharge)
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeWebsiteMenu("https://getrecharge.com/", "click")`
- **Expected result:** Returns nested menu structure after clicking dropdown triggers
- **Priority:** P0

#### TC-522: Handles timeout for non-existent sub-menus
- **Preconditions:** Menu item has no dropdown
- **Steps:** Hover/click on item without children
- **Expected result:** Times out gracefully (2s), continues to next item
- **Priority:** P1

### 5.4 Homepage Scraper

#### TC-530: Scrapes homepage body content (excludes header/footer)
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeHomepageContent("https://www.loopwork.co/")`
- **Expected result:** Returns sections, stats, testimonials, fullText; no nav/footer content in results
- **Priority:** P0

#### TC-531: Handles lazy-loaded content
- **Preconditions:** Target page has lazy-loaded sections
- **Steps:** Call scraper
- **Expected result:** Auto-scrolls page, waits for content, captures all sections
- **Priority:** P1

### 5.5 App Listing Scraper

#### TC-540: Scrapes Letsmetrix comparison page
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeAppListing(letsmetrixUrl)`
- **Expected result:** Returns structured data with app info, ranking, pricing, review tabs
- **Priority:** P0

### 5.6 Guide Docs Scraper

#### TC-550: Scrapes guide docs navigation
- **Preconditions:** Puppeteer, internet
- **Steps:** Call `scrapeGuideDocs(guideDocsUrl)`
- **Expected result:** Returns navigation structure of guide/docs site
- **Priority:** P0

---

## 6. Manual Test Checklist

### Visual & UX
- [ ] Deep Ocean theme renders correctly in dark mode
- [ ] Light mode toggle works and theme persists on refresh
- [ ] Sidebar navigation highlights active page correctly
- [ ] Sidebar glass-morphism effect renders on all browsers
- [ ] All pages use design token colors (no hardcoded colors)
- [ ] Page titles are consistent size (text-3xl font-bold)
- [ ] Loading states show appropriate feedback (not just "Loading...")
- [ ] Empty states provide helpful guidance for new users
- [ ] Diff highlights use correct semantic colors (green=added, red=removed, yellow=changed)
- [ ] Tree view (website menus) expands/collapses properly
- [ ] Inline text diff (homepage) is readable and clear

### Responsive & Accessibility
- [ ] Sidebar collapses or becomes drawer on mobile
- [ ] Tables are scrollable horizontally on small screens
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical on each page
- [ ] Color contrast meets WCAG AA (especially on dark theme)
- [ ] Screen reader can navigate page structure

### Cross-Browser
- [ ] Chrome (latest) — all features work
- [ ] Firefox (latest) — all features work
- [ ] Safari (latest) — all features work (especially Puppeteer-generated content display)
- [ ] Edge (latest) — all features work

### Scraper Reliability (Manual Verification)
- [ ] Run full scrape cycle and verify data quality for each scraper
- [ ] Verify Telegram notification message format is correct
- [ ] Check that scraper handles Cloudflare-protected sites gracefully
- [ ] Verify scrape results match what's visible on target websites
- [ ] Check browser cleanup — no orphaned Chromium processes after scrape

### Data Quality
- [ ] Snapshot timestamps are in correct timezone display
- [ ] Diffs accurately represent actual changes between snapshots
- [ ] First snapshot for new tracking shows no diff (expected)
- [ ] Keyword ranking positions are correct (verified against manual search)
- [ ] Autocomplete suggestions match what Shopify actually returns

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shopify blocks scraping (CAPTCHA, rate limit) | High | High | Random delays, User-Agent rotation, exponential backoff, alert on failure |
| Competitor website DOM changes break selectors | High | Medium | Custom selectors in config, alert on scrape failure, quick selector update process |
| GET endpoints bypass auth (index.js middleware) | High | High | Add route-level auth checks or move auth to all methods |
| Firestore costs spike with many snapshots | Medium | Medium | Implement retention policy (delete >90 day snapshots), monitor usage |
| Puppeteer memory leak / orphaned processes | Medium | High | Ensure browser.close() in finally blocks, process monitoring |
| No input validation on API routes | Medium | Medium | Add express-validator or manual validation for all POST/PUT bodies |
| No rate limiting on scrape triggers | Medium | Medium | Add per-user rate limit for manual scrape endpoints |
| Telegram bot token exposure | Low | High | Tokens in Firebase secrets (already done), never log tokens |
| Concurrent scrapes overwhelm server | Medium | Medium | Sequential execution in scheduler (already done), queue for manual triggers |
| External service downtime (Letsmetrix, Shopify) | Medium | Low | Retry logic, graceful error handling, skip and continue pattern |
| IDOR vulnerability across features | Medium | High | Verify ownership check exists on ALL mutation and read endpoints |
| No CSRF protection | Low | Medium | NextAuth handles CSRF for auth; API uses custom header (x-user-email) which provides some protection |

---

## 8. Test Data Requirements

### Seed Data
- At least 2 allowed user accounts (1 admin, 1 regular)
- 2 keyword trackings ("subscription", "subscriptions") with 5+ snapshots each
- 1 autocomplete tracking ("subs") with 3+ snapshots
- 1 app listing comparison with 3+ snapshots across 4 tabs
- 5 website menu trackings (one per competitor) with 2+ snapshots each
- 5 homepage trackings (one per competitor) with 2+ snapshots each
- 1 guide docs tracking with 2+ snapshots
- Snapshots should include mix of: no changes, with changes, various diff types

### Test Accounts
- Admin user: `admin@test.com` (in allowed users with admin role)
- Regular user: `user@test.com` (in allowed users)
- Unauthorized user: `hacker@test.com` (NOT in allowed users)

### External Service Mocks
- **Firestore:** Use Firebase Emulator Suite for integration tests
- **Puppeteer:** For unit tests, mock page responses; for integration, use real browser
- **Telegram:** Mock API endpoint for tests, verify message format
- **Google OAuth:** Use NextAuth test helpers or mock provider for E2E

### Test Framework Recommendations
- **Test runner:** Vitest (compatible with Bun, ESM support)
- **API testing:** Supertest (Express endpoint testing)
- **Frontend E2E:** Playwright (cross-browser, good for SPA testing)
- **Mocking:** Vitest built-in mocks for Firestore, fetch, Puppeteer

---

## 9. Test Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | ~55 | Must-have tests — core functionality, auth, security, CRUD operations |
| P1 | ~25 | Should-have tests — edge cases, error handling, secondary flows |
| P2 | ~5 | Nice-to-have tests — serialization details, minor utilities |

### Recommended Implementation Order
1. **Phase 1:** Unit tests for diff algorithms (TC-001 to TC-060) — highest ROI, pure functions, easy to test
2. **Phase 2:** Auth & security tests (TC-070 to TC-076, TC-400 to TC-420) — critical for production safety
3. **Phase 3:** API integration tests with Firestore emulator (TC-100 to TC-205)
4. **Phase 4:** E2E flows for core features (TC-300 to TC-390)
5. **Phase 5:** Scraper reliability tests (TC-500 to TC-550) — depend on external services
6. **Phase 6:** Manual testing checklist
