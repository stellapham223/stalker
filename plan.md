# Plan: Redesign App Listing Feature

## Summary
Replace the Letsmetrix comparison-based approach with direct Shopify app listing scraping. Each competitor is tracked individually by their `apps.shopify.com` URL. The UI shows tabs per competitor with a 3-column layout (Info label | Current value | Changes vs previous).

## Changes

### 1. Database Schema (`apps/api/prisma/schema.prisma`)
Add 2 new models (keep old Letsmetrix models untouched to avoid data loss):

```
model AppListingCompetitor {
  id        String   @id @default(uuid())
  name      String                  // e.g. "Appstle"
  appUrl    String   @unique        // e.g. "https://apps.shopify.com/subscriptions-by-appstle"
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  snapshots AppListingSnapshot[]
}

model AppListingSnapshot {
  id           String   @id @default(uuid())
  competitorId String
  competitor   AppListingCompetitor @relation(...)
  data         Json     // { title, screenshots, appDetails, languages, worksWith, categories, pricing }
  diff         Json?    // field-by-field diff vs previous
  createdAt    DateTime @default(now())
  @@index([competitorId, createdAt])
}
```

### 2. New Scraper (`apps/api/services/app-listing-scraper.js`)
- Uses Puppeteer to load `https://apps.shopify.com/{slug}`
- Extracts 7 data fields:
  - **title**: `h1` text
  - **screenshots**: For each carousel item — images get alt text / visible overlay text; videos get the URL
  - **appDetails**: Full text content of the app description section
  - **languages**: Text list of supported languages
  - **worksWith**: Text list of integrations
  - **categories**: Text of categories and features
  - **pricing**: All plan names, prices, features per plan
- Also exports `computeAppListingDiff(prev, curr)` for field-by-field comparison

### 3. New API Routes (`apps/api/routes/app-listing.js`)
- `GET /api/app-listing` — list all competitors
- `POST /api/app-listing` — add competitor `{ name, appUrl }`
- `DELETE /api/app-listing/:id` — remove competitor
- `GET /api/app-listing/:id/snapshots?limit=2` — get recent snapshots
- `POST /api/app-listing/:id/scrape` — trigger manual scrape
- `POST /api/app-listing/scrape-all` — scrape all competitors

### 4. Scheduler Updates (`apps/api/services/scheduler.js`)
- Add new queue + worker: `scrape-app-listing`
- Add to `SCRAPE_ALL` dispatcher to include AppListingCompetitor entries

### 5. Constants (`packages/shared/constants.js`)
- Add `JOB_NAMES.SCRAPE_APP_LISTING = "scrape-app-listing"`

### 6. API index (`apps/api/index.js`)
- Register new route: `app.use("/api/app-listing", appListingRoutes)`

### 7. Frontend API client (`apps/web/lib/api.js`)
- Add: `fetchAppListingCompetitors`, `createAppListingCompetitor`, `deleteAppListingCompetitor`, `fetchAppListingSnapshots`, `triggerAppListingScrape`, `triggerAppListingScrapeAll`

### 8. Frontend Page (`apps/web/app/app-listing/page.js`)
Complete rewrite:
- **Tabs**: One tab per competitor (e.g. "Appstle", "Seal", ...). Hover shows `x` to delete. Plus an "Add Competitor" button.
- **Tab Content**: 3-column table:
  | App Info | Detail | Changes |
  |----------|--------|---------|
  | Title | Appstle℠ Subscriptions App | No changes |
  | Screenshots | [text/urls list] | Red highlight if different |
  | App Details | [full text] | Red highlight if different |
  | Languages | English | No changes |
  | Works With | Checkout, Klaviyo, ... | Red highlight if different |
  | Categories | Subscriptions, ... | Red highlight if different |
  | Pricing | Free / $10 / $30 / $100 | Red highlight if different |

### 9. Seed Data
After migration, seed the 6 initial competitors:
- Appstle: `https://apps.shopify.com/subscriptions-by-appstle`
- Seal: `https://apps.shopify.com/seal-subscriptions`
- Subi: `https://apps.shopify.com/subi-subscriptions-memberships`
- Loop: `https://apps.shopify.com/loop-subscriptions`
- Kaching: `https://apps.shopify.com/kaching-subscriptions`
- Recharge: `https://apps.shopify.com/subscription-payments`

## Execution Order
1. Schema + db push + generate
2. Scraper (hardest part — need to debug DOM selectors)
3. Routes + scheduler
4. Constants + index.js registration
5. Frontend API + page rewrite
6. Seed competitors + trigger first scrape
