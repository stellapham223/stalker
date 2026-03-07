# PRD: Competitor Stalker - 3 Features Đầu Tiên

## 1. Tổng quan

**Mục tiêu:** Xây dựng hệ thống theo dõi tự động các thay đổi của đối thủ cạnh tranh trên Shopify App Store, bao gồm: thông tin app listing, ranking keywords, và autocomplete suggestions.

**Tech Stack hiện tại:** Firebase Functions Gen 2 (Express + Puppeteer/Cheerio) + Firestore (backend), Next.js 15 + shadcn/ui + TanStack Query v5 (frontend). Monorepo: Bun workspaces (`apps/web`, `apps/functions`).

> **Migration note:** Đã chuyển từ Prisma + PostgreSQL + pg-boss sang Firebase Functions + Firestore + Cloud Scheduler.

---

## 2. Feature 1: Stalk App Listing Changes (Direct Shopify Scraping)

### 2.1 Mô tả

Tự động scrape và theo dõi thay đổi trực tiếp trên trang app listing của Shopify App Store. Mỗi competitor là một app URL trên Shopify (e.g. `https://apps.shopify.com/seal-subscriptions`).

> **Lưu ý:** Ban đầu PRD thiết kế dùng Letsmetrix comparison pages. Đã chuyển sang scrape trực tiếp Shopify vì: (1) Không phụ thuộc third-party, (2) Lấy được dữ liệu real-time từ nguồn gốc, (3) Shopify app pages là SSR nên dùng fetch + cheerio (không cần Puppeteer).

### 2.2 Dữ liệu cần scrape

| Field | Mô tả |
|---|---|
| title | Tên app (h1) |
| subtitle | Tagline (trích từ page title) |
| screenshots | Gallery images (từ `.gallery-component`, lọc bỏ icon) |
| videos | YouTube/Vimeo embeds (iframe) |
| appDetails | Mô tả chi tiết app (section đầu tiên có heading > 10 chars) |
| languages | Ngôn ngữ hỗ trợ (từ grid section "Languages") |
| worksWith | Tích hợp (từ grid section "Works with") |
| categories | Danh mục app (từ grid section "Categories") |
| pricing | Pricing plans (từ `.pricing-plan-card` — heading + full text) |

### 2.3 Data Model (Firestore)

```
Collection: appListingCompetitors
─────────────────────────────────
id              String    (auto-generated UUID)
name            String    // Tên app (e.g. "Seal Subscriptions")
appUrl          String    // URL trang app trên Shopify App Store
active          Boolean   (default: true)
ownerEmail      String    // Email user sở hữu
createdAt       DateTime
updatedAt       DateTime
→ snapshots     Subcollection

Subcollection: snapshots
─────────────────────────────────
id              String    (auto-generated UUID)
competitorId    String    // ID của parent document
data            Json      // {title, subtitle, screenshots, videos, appDetails, languages, worksWith, categories, pricing}
diff            Json?     // {fieldName: {old, new}} — null nếu không có thay đổi
createdAt       DateTime
```

### 2.4 Scraping Strategy

- **Fetch + Cheerio** (server-side rendered HTML parsing, không cần Puppeteer)
- Parse trực tiếp HTML response từ Shopify app page
- Screenshots: scope vào `.gallery-component` container, lọc bỏ `/icon/` URLs và app title matches
- Videos: tìm iframe có src chứa "youtube" hoặc "vimeo"
- App details: tìm h2 đầu tiên có heading > 10 chars, loại bỏ sections không liên quan (Pricing, Reviews, Support, etc.)
- Languages/Works with/Categories: tìm trong grid sections (`[class*="tw-grid"]`)
- Pricing: parse từ `.pricing-plan-card` elements
- So sánh field-by-field với snapshot trước (normalize screenshots trước khi compare)

### 2.5 Cron Schedule

- Chạy mỗi ngày **1 lần lúc 6:00 AM GMT+7** (23:00 UTC) → Cron: `0 23 * * *`
- Chạy chung trong `runScrapeAll()` (step 4/7)

### 2.6 API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/app-listing` | Danh sách apps đang theo dõi (by owner) |
| POST | `/api/app-listing` | Thêm app mới (name + appUrl) |
| DELETE | `/api/app-listing/:id` | Xóa app (with ownership check) |
| GET | `/api/app-listing/:id/snapshots` | Lịch sử snapshots (default limit: 2) |
| POST | `/api/app-listing/:id/scrape` | Trigger scrape thủ công |
| GET | `/api/app-listing/dashboard` | Timeline view — grouped sessions với diff per competitor |
| POST | `/api/app-listing/scrape-all` | Scrape tất cả apps active |

### 2.7 UI

- **Trang "App Listing"** trong sidebar
- Dashboard timeline: hiển thị sessions grouped by time, mỗi session có diff per competitor
- Highlight thay đổi theo field (đỏ = bị xóa, xanh = thêm mới)
- Nút "Scrape Now" để trigger scrape thủ công

---

## 3. Feature 2: Keyword Ranking Tracker

### 3.1 Mô tả

Theo dõi thay đổi top 12 kết quả (không tính ads/sponsored) khi search trên Shopify App Store với 2 keywords:
- `subscription` → https://apps.shopify.com/search?q=subscription
- `subscriptions` → https://apps.shopify.com/search?q=subscriptions

Phát hiện khi có app mới xuất hiện trên trang 1.

### 3.2 Dữ liệu cần scrape cho mỗi app trong top 12

| Field | Mô tả |
|---|---|
| position | Vị trí trong kết quả (1-12, không tính ads) |
| appName | Tên app |
| appSlug | Slug trên Shopify (e.g. "seal-subscriptions") |
| appUrl | URL đầy đủ trên Shopify App Store |
| developer | Tên nhà phát triển |
| rating | Điểm đánh giá |
| reviewCount | Số lượng reviews |
| pricingLabel | Label pricing hiển thị (e.g. "Free plan available") |
| isAd | Boolean - có phải ads không (để lọc ra) |

### 3.3 Data Model

```
Model: KeywordTracking
─────────────────────────────────
id              String    @id @default(uuid())
keyword         String    @unique   // "subscription" | "subscriptions"
searchUrl       String    // URL search trên Shopify
active          Boolean   @default(true)
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
→ snapshots     KeywordRankingSnapshot[]

Model: KeywordRankingSnapshot
─────────────────────────────────
id              String    @id @default(uuid())
keywordId       String    → KeywordTracking
rankings        Json      // Array of {position, appName, appSlug, developer, rating, reviewCount, pricingLabel}
newEntries      Json?     // Array of app names mới xuất hiện so với snapshot trước
droppedEntries  Json?     // Array of app names đã rớt khỏi top 12
positionChanges Json?     // Array of {appName, oldPosition, newPosition}
createdAt       DateTime  @default(now())

@@index([keywordId, createdAt])
```

### 3.4 Scraping Strategy

- **Puppeteer** truy cập URL search Shopify App Store
- Đợi kết quả load xong (waitForSelector trên app card elements)
- Phân biệt ads vs organic:
  - Ads thường có label "Ad" hoặc "Sponsored" trên card
  - Lọc bỏ ads, chỉ lấy top 12 organic results
- Parse từng app card: tên, developer, rating, review count, pricing
- So sánh với snapshot trước:
  - **New entries**: App có trong snapshot mới nhưng không có trong snapshot cũ
  - **Dropped entries**: App có trong snapshot cũ nhưng không có trong snapshot mới
  - **Position changes**: App thay đổi vị trí

### 3.5 Cron Schedule

- Chạy mỗi ngày **1 lần lúc 6:00 AM GMT+7** (23:00 UTC) → Cron: `0 23 * * *`
- Job name: `scrape-keyword-rankings`

### 3.6 API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/keywords` | Danh sách keywords đang theo dõi |
| POST | `/api/keywords` | Thêm keyword mới |
| DELETE | `/api/keywords/:id` | Xóa keyword |
| GET | `/api/keywords/:id/snapshots` | Lịch sử ranking snapshots |
| GET | `/api/keywords/:id/snapshots/latest` | Snapshot mới nhất |
| GET | `/api/keywords/:id/changes` | Chỉ lấy snapshots có thay đổi |
| POST | `/api/keywords/:id/scrape` | Trigger scrape thủ công |
| POST | `/api/keywords/scrape-all` | Scrape tất cả keywords |

### 3.7 UI

- **Trang "Keyword Rankings"** trong sidebar
- **Bảng ranking hiện tại**: Hiển thị top 12 cho mỗi keyword
  - Cột: Position, App Name, Developer, Rating, Reviews, Pricing
  - Icon mũi tên lên/xuống cho position change
  - Badge "NEW" cho app mới xuất hiện
  - Badge "DROPPED" cho app đã rớt
- **Comparison view**: So sánh 2 keywords cạnh nhau
- **History timeline**: Biểu đồ vị trí theo thời gian cho từng app
- Nút "Scrape Now"

---

## 4. Feature 3: Autocomplete Tracker

### 4.1 Mô tả

Theo dõi thay đổi trong danh sách gợi ý autocomplete khi gõ `subs` vào ô tìm kiếm trên Shopify App Store.

### 4.2 Cách hoạt động của Shopify Autocomplete

Khi user gõ vào ô search trên Shopify App Store, Shopify gọi API trả về autocomplete suggestions. Có 2 cách tiếp cận:

**Cách 1: Intercept API call (Ưu tiên)**
- Dùng Puppeteer intercept network request
- Shopify search autocomplete thường gọi đến endpoint dạng: `https://apps.shopify.com/search/autocomplete?q=subs`
- Capture response JSON trực tiếp

**Cách 2: Simulate typing + capture dropdown**
- Dùng Puppeteer navigate đến `https://apps.shopify.com`
- Focus vào ô search, gõ "subs" từng ký tự
- Đợi dropdown autocomplete hiện ra
- Scrape nội dung dropdown

### 4.3 Dữ liệu cần capture

| Field | Mô tả |
|---|---|
| suggestions | Danh sách các keyword gợi ý (ordered) |
| appSuggestions | Danh sách app được gợi ý (nếu có) |
| categorySuggestions | Danh sách category gợi ý (nếu có) |

### 4.4 Data Model

```
Model: AutocompleteTracking
─────────────────────────────────
id              String    @id @default(uuid())
query           String    @unique   // "subs"
targetUrl       String    // "https://apps.shopify.com"
active          Boolean   @default(true)
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
→ snapshots     AutocompleteSnapshot[]

Model: AutocompleteSnapshot
─────────────────────────────────
id              String    @id @default(uuid())
trackingId      String    → AutocompleteTracking
suggestions     Json      // Array of suggestion strings
appSuggestions  Json?     // Array of {appName, appSlug} nếu có
rawResponse     Json?     // Raw API response (để debug)
diff            Json?     // {added: [...], removed: [...], reordered: [...]}
createdAt       DateTime  @default(now())

@@index([trackingId, createdAt])
```

### 4.5 Scraping Strategy

```
1. Launch Puppeteer
2. Bật request interception
3. Navigate đến https://apps.shopify.com
4. Listen cho network requests matching autocomplete pattern
5. Focus search input, type "subs"
6. Capture autocomplete API response
7. Nếu không intercept được API → fallback sang scrape dropdown DOM
8. Parse suggestions
9. So sánh với snapshot trước:
   - added: suggestions mới xuất hiện
   - removed: suggestions đã biến mất
   - reordered: suggestions thay đổi thứ tự
```

### 4.6 Cron Schedule

- Chạy mỗi ngày **1 lần lúc 6:00 AM GMT+7** (23:00 UTC) → Cron: `0 23 * * *`
- Job name: `scrape-autocomplete`

### 4.7 API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/autocomplete` | Danh sách queries đang theo dõi |
| POST | `/api/autocomplete` | Thêm query mới |
| DELETE | `/api/autocomplete/:id` | Xóa query |
| GET | `/api/autocomplete/:id/snapshots` | Lịch sử snapshots |
| GET | `/api/autocomplete/:id/snapshots/latest` | Snapshot mới nhất |
| GET | `/api/autocomplete/:id/changes` | Chỉ lấy snapshots có thay đổi |
| POST | `/api/autocomplete/:id/scrape` | Trigger scrape thủ công |

### 4.8 UI

- **Trang "Autocomplete"** trong sidebar
- Hiển thị danh sách suggestions hiện tại (có đánh số thứ tự)
- Highlight thay đổi:
  - 🟢 Xanh: suggestion mới xuất hiện
  - 🔴 Đỏ: suggestion đã biến mất
  - 🟡 Vàng: suggestion thay đổi vị trí (kèm mũi tên lên/xuống)
- History timeline
- Nút "Scrape Now"

---

## 5. Feature 4: Website Menu Changes Tracker

### 5.1 Mô tả

Tự động theo dõi thay đổi trong **navigation menu** (main menu + sub-menu) của 5 website đối thủ cạnh tranh. Phát hiện khi đối thủ thêm/xóa/đổi tên menu item — dấu hiệu cho thấy thay đổi chiến lược sản phẩm hoặc marketing.

### 5.2 Danh sách websites cần theo dõi

| # | Website | URL | Cách mở sub-menu |
|---|---------|-----|-------------------|
| 1 | Appstle | `https://appstle.com/products/ecommerce-subscriptions/` | Hover vào main menu |
| 2 | Recharge | `https://getrecharge.com/` | Click vào menu có dropdown |
| 3 | Seal Subscriptions | `https://www.sealsubscriptions.com/` | Hover vào main menu |
| 4 | Subi | `https://www.subi.co/` | Hover vào main menu |
| 5 | Loop | `https://www.loopwork.co/` | Hover vào main menu |

### 5.3 Dữ liệu cần scrape

Với mỗi website, scrape toàn bộ cấu trúc menu navigation:

| Field | Mô tả |
|---|---|
| menuItems | Array cấu trúc cây menu (main item → sub-items) |
| menuItem.label | Text hiển thị của menu item |
| menuItem.url | Link URL của menu item (nếu có) |
| menuItem.children | Array các sub-menu items (nested) |

**Ví dụ cấu trúc dữ liệu scrape được (Recharge):**
```json
[
  {
    "label": "Platform",
    "url": null,
    "children": [
      {
        "label": "Subscriptions",
        "url": "/subscriptions",
        "children": [
          { "label": "Customer portal", "url": "/customer-portal" },
          { "label": "Churn prevention", "url": "/churn-prevention" },
          { "label": "Upsell & Cross-sell", "url": "/upsell-cross-sell" },
          { "label": "Bundles", "url": "/bundles" },
          { "label": "Analytics", "url": "/analytics" }
        ]
      },
      {
        "label": "Loyalty",
        "url": "/loyalty",
        "children": [
          { "label": "Rewards", "url": "/rewards" },
          { "label": "Referrals", "url": "/referrals" }
        ]
      },
      { "label": "Integrations", "url": "/integrations", "children": [] }
    ]
  },
  {
    "label": "Solutions",
    "url": null,
    "children": [
      { "label": "Shopify Subscriptions", "url": "/shopify" },
      {
        "label": "Top industries",
        "url": null,
        "children": [
          { "label": "Health & Wellness", "url": "/health-wellness" },
          { "label": "Beauty & Personal Care", "url": "/beauty" },
          { "label": "Food & Beverage", "url": "/food-beverage" },
          { "label": "Pets", "url": "/pets" },
          { "label": "Home Goods", "url": "/home-goods" },
          { "label": "Meal Kits", "url": "/meal-kits" },
          { "label": "Digital Subscriptions", "url": "/digital" },
          { "label": "Direct Selling", "url": "/direct-selling" }
        ]
      }
    ]
  },
  { "label": "Pricing", "url": "/pricing", "children": [] },
  {
    "label": "Resources",
    "url": null,
    "children": [
      { "label": "Case studies", "url": "/case-studies" },
      { "label": "Blog", "url": "/blog" },
      { "label": "Events", "url": "/events" },
      { "label": "Help Center", "url": "/help" },
      { "label": "API", "url": "/api" },
      { "label": "Developer Hub", "url": "/developer" }
    ]
  },
  { "label": "Enterprise", "url": "/enterprise", "children": [] }
]
```

### 5.4 Menu hiện tại của từng website (Baseline)

#### Appstle (`appstle.com`)
- Products (sub-menu với các sản phẩm Appstle)
- Pricing
- Resources (Blog, Case Studies, ...)
- Partners

#### Recharge (`getrecharge.com`)
- **Platform**: Subscriptions (Customer portal, Churn prevention, Upsell & Cross-sell, Bundles, Analytics), Loyalty (Rewards, Referrals), Support (Concierge SMS), Integrations
- **Solutions**: Shopify Subscriptions, Top industries (Health & Wellness, Beauty & Personal Care, Food & Beverage, Pets, Home Goods, Meal Kits, Digital Subscriptions, Direct Selling, All verticals)
- **Pricing**
- **Resources**: Case studies, Blog, Events, Partnerships, Changelog, Help Center, API, Developer Hub, Full documentation
- **Enterprise**: Enterprise solutions, Developer Hub, Security & compliance, Shopify Hydrogen

#### Seal Subscriptions (`sealsubscriptions.com`)
- **Features**
- **FAQ**
- **Tutorials**: Video Tutorials, Use Cases (Food subscriptions, Coffee shop subscriptions, Downloadable software membership, Membership subscriptions), Guides (Subscription editing, Widget design, Subscription boxes, More guides)
- **Partners**
- **Testimonials**
- **Pricing**

#### Subi (`subi.co`)
- **Features**
- **Resources**: Blog, Migrate to Subi, Subi vs. Others, Case Studies, Webinars, Help Doc, Roadmap
- **Pricing**
- **Demo Store**
- **Book a Demo** (CTA)

#### Loop (`loopwork.co`)
- **Platform**: Acquire, Retain, Manage
- **Features**: Loop Flows, Bundles, Cancellation Flows, Customer Portal, Dunning Management, Upsell
- **Success Stories**: Case Studies, Wall of Love, Template Gallery
- **Resources**: Blogs, Help Centre, Developer Hub, Integrations Directory, Changelog
- **Comparing Subscriptions Apps**: Loop vs. Recharge, Loop vs. Skio, Loop vs. Ordergroove, Loop vs. Smartrr, Loop vs. Stay.ai, Loop vs. Bold
- **Migration**
- **Pricing**

### 5.5 Data Model

```
Model: WebsiteMenuTracking
─────────────────────────────────
id              String    @id @default(uuid())
name            String    // Tên website (e.g. "Recharge")
url             String    @unique // URL trang cần scrape menu
interactionType String    // "hover" | "click" — cách mở sub-menu
active          Boolean   @default(true)
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
→ snapshots     WebsiteMenuSnapshot[]

Model: WebsiteMenuSnapshot
─────────────────────────────────
id              String    @id @default(uuid())
trackingId      String    → WebsiteMenuTracking
menuData        Json      // Cấu trúc cây menu (nested array)
diff            Json?     // {added: [...], removed: [...], renamed: [...], moved: [...]}
createdAt       DateTime  @default(now())

@@index([trackingId, createdAt])
```

### 5.6 Scraping Strategy

```
1. Launch Puppeteer, navigate đến URL website
2. Đợi trang load xong (waitForNetworkIdle)
3. Tìm navigation menu container (thường là <nav> hoặc <header> element)
4. Với mỗi main menu item:
   a. Nếu interactionType = "hover" → hover vào menu item
   b. Nếu interactionType = "click" → click vào menu item
   c. Đợi sub-menu/dropdown xuất hiện (waitForSelector hoặc timeout 2s)
   d. Scrape tất cả text + link trong sub-menu
   e. Nếu có nested sub-menu, lặp lại bước hover/click
5. Build cấu trúc cây menu (nested JSON)
6. So sánh với snapshot trước:
   - added: menu items mới xuất hiện
   - removed: menu items đã biến mất
   - renamed: menu items đổi tên (same URL, different label)
   - moved: menu items thay đổi vị trí trong cây
```

**Lưu ý đặc biệt:**
- Mỗi website có DOM structure khác nhau → cần custom selector cho mỗi site
- Lưu trữ selectors trong config, dễ update khi website thay đổi layout
- Timeout cho hover/click interaction: 2 giây, nếu không có dropdown thì skip

### 5.7 Cron Schedule

- Chạy mỗi ngày **1 lần lúc 6:00 AM GMT+7** (23:00 UTC) → Cron: `0 23 * * *`
- Job name: `scrape-website-menus`

### 5.8 API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/website-menus` | Danh sách websites đang theo dõi menu |
| POST | `/api/website-menus` | Thêm website mới |
| PUT | `/api/website-menus/:id` | Cập nhật config (selectors, interaction type) |
| DELETE | `/api/website-menus/:id` | Xóa website |
| GET | `/api/website-menus/:id/snapshots` | Lịch sử menu snapshots |
| GET | `/api/website-menus/:id/snapshots/latest` | Snapshot mới nhất |
| GET | `/api/website-menus/:id/changes` | Chỉ lấy snapshots có diff |
| POST | `/api/website-menus/:id/scrape` | Trigger scrape thủ công |
| POST | `/api/website-menus/scrape-all` | Scrape tất cả websites |

### 5.9 UI

- **Trang "Website Menus"** trong sidebar
- **Danh sách websites**: Card cho mỗi website, hiển thị tên + trạng thái (last scraped, có thay đổi hay không)
- **Chi tiết menu**: Hiển thị cấu trúc cây menu dạng tree view (expandable/collapsible)
- **Diff view**: Highlight thay đổi
  - 🟢 Xanh: menu item mới thêm
  - 🔴 Đỏ: menu item bị xóa
  - 🟡 Vàng: menu item đổi tên
  - 🔵 Xanh dương: menu item thay đổi vị trí
- **So sánh side-by-side**: Chọn 2 snapshot để so sánh
- **History timeline**: Lịch sử thay đổi theo thời gian
- Nút "Scrape Now"

---

## 6. Feature 5: Homepage Content Changes Tracker

### 6.1 Mô tả

Tự động theo dõi thay đổi **nội dung text trên trang chủ** (homepage) của 5 website đối thủ cạnh tranh. **Chỉ lấy phần body content** — không bao gồm header (navigation) và footer. Phát hiện khi đối thủ thay đổi messaging, value proposition, social proof, hoặc CTA.

### 6.2 Danh sách websites cần theo dõi

| # | Website | URL |
|---|---------|-----|
| 1 | Appstle | `https://appstle.com/products/ecommerce-subscriptions/` |
| 2 | Recharge | `https://getrecharge.com/` |
| 3 | Seal Subscriptions | `https://www.sealsubscriptions.com/` |
| 4 | Subi | `https://www.subi.co/` |
| 5 | Loop | `https://www.loopwork.co/` |

### 6.3 Dữ liệu cần scrape

Chỉ lấy **text content** trong phần body (giữa header và footer), bao gồm:

| Field | Mô tả |
|---|---|
| sections | Array các section trên homepage |
| section.heading | Heading text (h1, h2, h3) |
| section.content | Nội dung text (paragraph, list items) |
| section.ctaText | Text của CTA buttons (nếu có) |
| section.order | Thứ tự section trên trang |
| stats | Các con số/metrics hiển thị (e.g. "30,000+ merchants", "4.9 stars") |
| testimonials | Text testimonials/quotes (nếu có trên homepage) |

**Không scrape:** Header, Footer, Navigation, Images, Videos, CSS/JS

### 6.4 Nội dung homepage hiện tại (Baseline)

#### Appstle
- Hero: "Set up a powerful E-Commerce Subscription model on your Shopify store"
- Hỗ trợ: Build-a-box, Replenishment, Curation
- Positioning: "Compelling apps at compelling prices"

#### Recharge
- Hero: "The world's leading subscription platform" — "71% of subscriptions sold on Shopify stores"
- 3 trụ cột: Hands-on partnership, Relentless product innovation (104 major updates/year), Proven performance (100M+ subscribers)
- Metrics: $1B+ processed monthly, 95%+ customer satisfaction
- Features: Subscriptions management, Loyalty programs, Customer support tools
- Performance: 11% higher subscriber conversion, 3x customer lifetime value
- Brands: Quip, Harry's, Dr. Squatch, Billie

#### Seal Subscriptions
- Hero: "Predictable recurring revenue" + business growth qua subscriptions
- Features: Automatic charging, discount modification, product swaps, loyalty discounts, cancellation flow, subscription box
- Social proof: 30,000+ merchants, 1,800+ reviews, 4.9 stars, $100B renewals processed
- Shopify recognition: Top app for customer retention
- Team: European dev team, 7+ years Shopify experience

#### Subi
- Hero: "User-friendly environment with customizable widgets, tools and insights"
- Subscription types: Subscribe & Save, Subscription Box, Membership
- Features: Customizable widgets (zero-coding), customer portal
- Metrics: 9,000+ active stores, $100M+ processed, 80K+ subscriptions, 4.9/5 rating
- Migration services: Transfer từ competing platforms
- CTA: Book demos, Install Shopify app

#### Loop
- Hero: "Everything you need to scale your Subscriptions" — "dedicated success managers on Slack, at 40% lower cost than competitors"
- Key capabilities: Churn reduction (~40%), Revenue recovery (~90%), AOV improvement (5% lift), Subscription acquisition
- Social proof: 440+ five-star reviews, 1,065+ migrated brands
- Customer success: 3X revenue growth, 50% churn reduction
- Differentiation: Transparent pricing, personalized retention, intelligent payment recovery, dedicated success management

### 6.5 Data Model

```
Model: HomepageTracking
─────────────────────────────────
id              String    @id @default(uuid())
name            String    // Tên website (e.g. "Recharge")
url             String    @unique // URL homepage
active          Boolean   @default(true)
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
→ snapshots     HomepageSnapshot[]

Model: HomepageSnapshot
─────────────────────────────────
id              String    @id @default(uuid())
trackingId      String    → HomepageTracking
sections        Json      // Array of {heading, content, ctaText, order}
stats           Json?     // Các metrics/numbers trên trang
testimonials    Json?     // Testimonials text
fullText        String    // Toàn bộ text content (để full-text diff)
diff            Json?     // {added: [...], removed: [...], changed: [...]}
createdAt       DateTime  @default(now())

@@index([trackingId, createdAt])
```

### 6.6 Scraping Strategy

```
1. Launch Puppeteer, navigate đến URL homepage
2. Đợi trang load xong (waitForNetworkIdle)
3. Xóa header và footer khỏi DOM:
   a. document.querySelector('header')?.remove()
   b. document.querySelector('footer')?.remove()
   c. Fallback: remove bằng common selectors (#header, #footer, .header, .footer, [role="banner"], [role="contentinfo"])
4. Scroll xuống cuối trang (để trigger lazy-load content)
5. Scrape content từ body:
   a. Lấy tất cả headings (h1-h6) với text content
   b. Lấy tất cả paragraphs, list items, spans chứa text
   c. Lấy text từ CTA buttons
   d. Lấy các con số/metrics (regex pattern: số + đơn vị)
   e. Lấy testimonial quotes (thường trong blockquote hoặc specific class)
6. Nhóm content theo sections (dựa vào <section> tags hoặc heading hierarchy)
7. Build fullText = tất cả text nối lại (để dùng cho text diff)
8. So sánh với snapshot trước:
   - added: sections/text mới xuất hiện
   - removed: sections/text đã biến mất
   - changed: sections có text thay đổi (dùng text diff algorithm)
```

**Lưu ý:**
- Một số website dùng lazy loading → cần scroll toàn bộ trang trước khi scrape
- Một số website render content bằng JS → Puppeteer đã handle (full browser rendering)
- Ignore dynamic content: Cookie banners, chat widgets, popup modals
- Ignore số liệu animated counters → scrape sau khi animation complete

### 6.7 Cron Schedule

- Chạy mỗi ngày **1 lần lúc 6:00 AM GMT+7** (23:00 UTC) → Cron: `0 23 * * *`
- Job name: `scrape-homepage-content`

### 6.8 API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/homepage` | Danh sách websites đang theo dõi homepage |
| POST | `/api/homepage` | Thêm website mới |
| DELETE | `/api/homepage/:id` | Xóa website |
| GET | `/api/homepage/:id/snapshots` | Lịch sử homepage snapshots |
| GET | `/api/homepage/:id/snapshots/latest` | Snapshot mới nhất |
| GET | `/api/homepage/:id/changes` | Chỉ lấy snapshots có diff |
| POST | `/api/homepage/:id/scrape` | Trigger scrape thủ công |
| POST | `/api/homepage/scrape-all` | Scrape tất cả websites |

### 6.9 UI

- **Trang "Homepage Monitor"** trong sidebar
- **Danh sách websites**: Card cho mỗi website, hiển thị tên + last change detected
- **Content view**: Hiển thị nội dung homepage hiện tại, chia theo sections
- **Diff view**: So sánh 2 snapshots
  - Dùng inline text diff (giống GitHub diff view)
  - 🟢 Xanh: text mới thêm
  - 🔴 Đỏ: text bị xóa
  - 🟡 Vàng: text bị thay đổi
- **Section-level changes**: Highlight section nào thay đổi (collapse sections không đổi)
- **History timeline**: Lịch sử thay đổi theo thời gian
- **Quick compare**: So sánh homepage của 2 đối thủ cạnh nhau
- Nút "Scrape Now"

---

## 7. Schema Prisma Tổng hợp (Thêm vào schema hiện tại)

```prisma
// ============ Feature 1: App Listing (Direct Shopify Scraping) ============
// NOTE: Migrated from Prisma to Firestore. Schema below is for reference only.
// Firestore collection: appListingCompetitors → subcollection: snapshots

// appListingCompetitors/{id}
//   name            String
//   appUrl          String    // Shopify App Store URL
//   active          Boolean
//   ownerEmail      String
//   createdAt       DateTime
//   updatedAt       DateTime
//
// appListingCompetitors/{id}/snapshots/{snapshotId}
//   competitorId    String
//   data            Json      // {title, subtitle, screenshots, videos, appDetails, languages, worksWith, categories, pricing}
//   diff            Json?     // {fieldName: {old, new}}
//   createdAt       DateTime

// ============ Feature 2: Keyword Ranking ============

model KeywordTracking {
  id        String                   @id @default(uuid())
  keyword   String                   @unique
  searchUrl String
  active    Boolean                  @default(true)
  createdAt DateTime                 @default(now())
  updatedAt DateTime                 @updatedAt
  snapshots KeywordRankingSnapshot[]
}

model KeywordRankingSnapshot {
  id              String          @id @default(uuid())
  keywordId       String
  keyword         KeywordTracking @relation(fields: [keywordId], references: [id], onDelete: Cascade)
  rankings        Json            // [{position, appName, appSlug, developer, rating, reviewCount, pricingLabel}]
  newEntries      Json?           // [appName, ...]
  droppedEntries  Json?           // [appName, ...]
  positionChanges Json?           // [{appName, oldPosition, newPosition}]
  createdAt       DateTime        @default(now())

  @@index([keywordId, createdAt])
}

// ============ Feature 3: Autocomplete ============

model AutocompleteTracking {
  id        String                 @id @default(uuid())
  query     String                 @unique
  targetUrl String
  active    Boolean                @default(true)
  createdAt DateTime               @default(now())
  updatedAt DateTime               @updatedAt
  snapshots AutocompleteSnapshot[]
}

model AutocompleteSnapshot {
  id             String               @id @default(uuid())
  trackingId     String
  tracking       AutocompleteTracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)
  suggestions    Json                 // ["suggestion1", "suggestion2", ...]
  appSuggestions Json?                // [{appName, appSlug}]
  rawResponse    Json?
  diff           Json?                // {added: [], removed: [], reordered: []}
  createdAt      DateTime             @default(now())

  @@index([trackingId, createdAt])
}

// ============ Feature 4: Website Menu ============

model WebsiteMenuTracking {
  id              String               @id @default(uuid())
  name            String               // Tên website (e.g. "Recharge")
  url             String               @unique
  interactionType String               // "hover" | "click"
  active          Boolean              @default(true)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  snapshots       WebsiteMenuSnapshot[]
}

model WebsiteMenuSnapshot {
  id         String              @id @default(uuid())
  trackingId String
  tracking   WebsiteMenuTracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)
  menuData   Json                // Nested array of {label, url, children}
  diff       Json?               // {added: [], removed: [], renamed: [], moved: []}
  createdAt  DateTime            @default(now())

  @@index([trackingId, createdAt])
}

// ============ Feature 5: Homepage Content ============

model HomepageTracking {
  id        String             @id @default(uuid())
  name      String             // Tên website (e.g. "Recharge")
  url       String             @unique
  active    Boolean            @default(true)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  snapshots HomepageSnapshot[]
}

model HomepageSnapshot {
  id           String           @id @default(uuid())
  trackingId   String
  tracking     HomepageTracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)
  sections     Json             // [{heading, content, ctaText, order}]
  stats        Json?            // Metrics/numbers
  testimonials Json?            // Testimonials text
  fullText     String           // Full text content for diff
  diff         Json?            // {added: [], removed: [], changed: []}
  createdAt    DateTime         @default(now())

  @@index([trackingId, createdAt])
}
```

---

## 8. Cấu trúc File Mới

```
apps/api/
├── routes/
│   ├── competitors.js          (existing)
│   ├── snapshots.js            (existing)
│   ├── jobs.js                 (existing)
│   ├── appListing.js           (Feature 1 - direct Shopify scraping)
│   ├── keywords.js             (NEW - Feature 2)
│   └── autocomplete.js         (NEW - Feature 3)
├── services/
│   ├── scraper.js              (existing)
│   ├── scheduler.js            (existing - thêm 3 jobs mới)
│   ├── differ.js               (existing)
│   ├── appListingScraper.js    (Scraper cho Shopify app listing - fetch + cheerio)
│   ├── keyword-scraper.js      (NEW - Scraper cho Shopify search)
│   ├── autocomplete-scraper.js (NEW - Scraper cho autocomplete)
│   ├── menu-scraper.js         (NEW - Scraper cho website menus - Feature 4)
│   └── homepage-scraper.js     (NEW - Scraper cho homepage content - Feature 5)

apps/web/app/
├── app-listing/
│   └── page.js                 (NEW - Feature 1 UI)
├── keyword-rankings/
│   └── page.js                 (NEW - Feature 2 UI)
├── autocomplete/
│   └── page.js                 (NEW - Feature 3 UI)
├── website-menus/
│   └── page.js                 (NEW - Feature 4 UI)
├── homepage-monitor/
│   └── page.js                 (NEW - Feature 5 UI)

apps/web/lib/
├── api.js                      (existing - thêm API functions mới)

packages/shared/
├── constants.js                (existing - thêm constants mới)
```

---

## 9. Sidebar Navigation (Cập nhật)

```
Dashboard           (existing)
Competitors         (existing)
Changes             (existing)
─────────────────
App Listing         (NEW - Feature 1)
Keyword Rankings    (NEW - Feature 2)
Autocomplete        (NEW - Feature 3)
─────────────────
Website Menus       (NEW - Feature 4)
Homepage Monitor    (NEW - Feature 5)
```

---

## 10. Shared Constants (Thêm vào)

```javascript
// Feature types
export const FEATURE_TYPES = {
  APP_LISTING: "app_listing",
  KEYWORD_RANKING: "keyword_ranking",
  AUTOCOMPLETE: "autocomplete",
  WEBSITE_MENU: "website_menu",
  HOMEPAGE_CONTENT: "homepage_content",
  GUIDE_DOCS: "guide_docs",
};

// Default keywords to track
export const DEFAULT_KEYWORDS = [
  { keyword: "subscription", searchUrl: "https://apps.shopify.com/search?q=subscription" },
  { keyword: "subscriptions", searchUrl: "https://apps.shopify.com/search?q=subscriptions" },
];

// Default autocomplete queries
export const DEFAULT_AUTOCOMPLETE_QUERIES = [
  { query: "subs", targetUrl: "https://apps.shopify.com" },
];

// Ranking config
export const RANKING_TOP_N = 12; // Chỉ track top 12 (không tính ads)

// Default websites to track (Feature 4 & 5)
export const DEFAULT_COMPETITOR_WEBSITES = [
  { name: "Appstle", url: "https://appstle.com/products/ecommerce-subscriptions/", interactionType: "hover" },
  { name: "Recharge", url: "https://getrecharge.com/", interactionType: "click" },
  { name: "Seal Subscriptions", url: "https://www.sealsubscriptions.com/", interactionType: "hover" },
  { name: "Subi", url: "https://www.subi.co/", interactionType: "hover" },
  { name: "Loop", url: "https://www.loopwork.co/", interactionType: "hover" },
];

// Job names
export const JOB_NAMES = {
  SCRAPE_COMPETITORS: "scrape-competitors",
  SCRAPE_APP_LISTING: "scrape-app-listing",
  SCRAPE_KEYWORDS: "scrape-keyword-rankings",
  SCRAPE_AUTOCOMPLETE: "scrape-autocomplete",
  SCRAPE_WEBSITE_MENUS: "scrape-website-menus",
  SCRAPE_HOMEPAGE_CONTENT: "scrape-homepage-content",
};
```

---

## 11. Rủi Ro & Mitigation

| Rủi ro | Mức độ | Mitigation |
|---|---|---|
| Shopify chặn scraping (rate limit, CAPTCHA) | Cao | Random delay giữa requests (2-5s), rotate User-Agent, retry với exponential backoff |
| Letsmetrix thay đổi DOM structure | Trung bình | Selector linh hoạt, alert khi scrape fail, test selector định kỳ |
| Shopify thay đổi search UI / autocomplete API | Trung bình | Fallback strategies, monitoring scrape success rate |
| Competitor website thay đổi DOM/layout | Cao | Custom selectors per site, lưu trong config dễ update, alert khi scrape fail |
| Website dùng anti-bot / Cloudflare protection | Trung bình | Stealth plugin cho Puppeteer, random delays, realistic User-Agent |
| Lazy-loaded content trên homepage | Trung bình | Auto-scroll toàn bộ trang trước khi scrape, đợi animation complete |
| Dữ liệu lớn theo thời gian | Thấp | Chỉ giữ diff, retention policy (xóa snapshots cũ hơn 90 ngày) |
| Puppeteer memory leak | Trung bình | Đảm bảo browser.close() trong finally, restart worker định kỳ |

---

## 12. Thứ Tự Triển Khai

### Phase 1: Backend Foundation (Feature 1-3)
1. Cập nhật Prisma schema (thêm 6 models mới cho Feature 1-3)
2. Implement 3 scrapers mới (letsmetrix, keyword, autocomplete)
3. Implement 3 route files mới
4. Đăng ký 3 jobs mới trong scheduler

### Phase 2: Frontend (Feature 1-3)
5. Trang App Listing (Feature 1)
6. Trang Keyword Rankings (Feature 2)
7. Trang Autocomplete (Feature 3)
8. Cập nhật sidebar navigation

### Phase 3: Backend (Feature 4-5)
9. Cập nhật Prisma schema (thêm 4 models mới cho Feature 4-5)
10. Implement menu-scraper.js (Feature 4 - website menu scraper)
11. Implement homepage-scraper.js (Feature 5 - homepage content scraper)
12. Implement 2 route files mới (website-menus, homepage)
13. Đăng ký 2 jobs mới trong scheduler

### Phase 4: Frontend (Feature 4-5)
14. Trang Website Menus (Feature 4) - tree view, diff highlight
15. Trang Homepage Monitor (Feature 5) - text diff view
16. Cập nhật sidebar navigation

### Phase 5: Polish
17. Error handling & retry logic
18. Loading states & empty states
19. Manual scrape triggers
20. Data seeding (default keywords, autocomplete queries, competitor websites)
