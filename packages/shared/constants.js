// Cron: every day at 6:00 AM GMT+7 (23:00 UTC)
export const SCRAPE_INTERVAL_CRON = "0 23 * * *";

// Competitor types
export const COMPETITOR_TYPES = {
  WEBSITE: "website",
  SHOPIFY_APP: "shopify_app",
};

// API paths
export const API_PATHS = {
  COMPETITORS: "/api/competitors",
  SNAPSHOTS: "/api/snapshots",
  JOBS: "/api/jobs",
  HEALTH: "/api/health",
  LETSMETRIX: "/api/letsmetrix",
  KEYWORDS: "/api/keywords",
  AUTOCOMPLETE: "/api/autocomplete",
  WEBSITE_MENUS: "/api/website-menus",
  HOMEPAGE: "/api/homepage",
};

// Letsmetrix tabs
export const LETSMETRIX_TABS = {
  APP_INFO: "app_info",
  RANKING: "ranking",
  PRICING: "pricing",
  REVIEW: "review",
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
export const RANKING_TOP_N = 12;

// Default competitor websites to track (Feature 4 & 5)
export const DEFAULT_COMPETITOR_WEBSITES = [
  { name: "Appstle", url: "https://appstle.com/products/ecommerce-subscriptions/", interactionType: "hover" },
  { name: "Recharge", url: "https://getrecharge.com/", interactionType: "click" },
  { name: "Seal Subscriptions", url: "https://www.sealsubscriptions.com/", interactionType: "hover" },
  { name: "Subi", url: "https://www.subi.co/", interactionType: "hover" },
  { name: "Loop", url: "https://www.loopwork.co/", interactionType: "hover" },
];

// Job names
export const JOB_NAMES = {
  SCRAPE_COMPETITOR: "scrape-competitor",
  SCRAPE_ALL: "scrape-all",
  SCRAPE_KEYWORDS: "scrape-keywords",
  SCRAPE_AUTOCOMPLETE: "scrape-autocomplete",
  SCRAPE_APP_LISTING: "scrape-app-listing",
  SCRAPE_WEBSITE_MENUS: "scrape-website-menus",
  SCRAPE_HOMEPAGE_CONTENT: "scrape-homepage-content",
  SCRAPE_GUIDE_DOCS: "scrape-guide-docs",
  NOTIFY_CHANGES: "notify-changes",
};
