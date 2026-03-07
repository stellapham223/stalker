export const mockCompetitors = [
  {
    id: "comp-1",
    name: "Rival App",
    url: "https://apps.shopify.com/rival-app",
    type: "shopify_app",
    active: true,
    trackedFields: ["title", "description", "rating"],
    ownerEmail: "test@example.com",
  },
  {
    id: "comp-2",
    name: "Another Tool",
    url: "https://another-tool.com",
    type: "website",
    active: false,
    trackedFields: ["homepage"],
    ownerEmail: "test@example.com",
  },
];

export const mockChanges = [
  {
    id: "change-1",
    competitorId: "comp-1",
    competitor: { name: "Rival App" },
    fieldName: "title",
    diffSummary: "Title changed from 'Old' to 'New'",
    createdAt: new Date().toISOString(),
  },
  {
    id: "change-2",
    competitorId: "comp-1",
    competitor: { name: "Rival App" },
    fieldName: "rating",
    diffSummary: "Rating changed from 4.5 to 4.7",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const mockKeywords = [
  {
    id: "kw-1",
    keyword: "shopify review app",
    ownerEmail: "test@example.com",
  },
];

// Dashboard endpoints return arrays (timelines of scrape sessions)
export const mockKeywordDashboard = [];
export const mockAutocompleteDashboard = [];
export const mockAppListingDashboard = [];
export const mockWebsiteMenuDashboard = [];
export const mockHomepageDashboard = [];
export const mockGuideDocsDashboard = [];

export const mockLatestChanges = [];

export const mockAutocompleteTrackings = [
  {
    id: "ac-1",
    query: "subscription app",
    ownerEmail: "test@example.com",
  },
];

export const mockAppListingCompetitors = [
  {
    id: "al-1",
    name: "Subi",
    url: "https://apps.shopify.com/subi-subscriptions",
    ownerEmail: "test@example.com",
  },
];

export const mockWebsiteMenus = [
  {
    id: "wm-1",
    name: "Recharge",
    url: "https://rechargepayments.com",
    interactionType: "hover",
    ownerEmail: "test@example.com",
  },
];

export const mockHomepageTrackings = [
  {
    id: "hp-1",
    name: "Recharge",
    url: "https://rechargepayments.com",
    ownerEmail: "test@example.com",
  },
];

export const mockGuideDocsTrackings = [
  {
    id: "gd-1",
    name: "Recharge",
    url: "https://docs.rechargepayments.com",
    ownerEmail: "test@example.com",
  },
];

export const mockAdminUsers = [
  {
    id: "user-1",
    email: "test@example.com",
    isAdmin: true,
    permissions: {
      appListing: true,
      keywordRankings: true,
      autocomplete: true,
      websiteMenus: true,
      homepageMonitor: true,
      guideDocs: true,
    },
  },
];

export async function setupAllMocks(mockApi) {
  await mockApi.mock("/competitors", mockCompetitors);
  await mockApi.mock("/snapshots/changes/recent", mockChanges);
  await mockApi.mock("/changes/latest", mockLatestChanges);
  // Feature list endpoints (pages fetch these first)
  await mockApi.mock("/keywords", mockKeywords);
  await mockApi.mock("/autocomplete", mockAutocompleteTrackings);
  await mockApi.mock("/app-listing", mockAppListingCompetitors);
  await mockApi.mock("/website-menus", mockWebsiteMenus);
  await mockApi.mock("/homepage", mockHomepageTrackings);
  await mockApi.mock("/guide-docs", mockGuideDocsTrackings);
  // Dashboard endpoints (loaded inside Dashboard tab)
  await mockApi.mock("/keywords/dashboard", mockKeywordDashboard);
  await mockApi.mock("/autocomplete/dashboard", mockAutocompleteDashboard);
  await mockApi.mock("/app-listing/dashboard", mockAppListingDashboard);
  await mockApi.mock("/website-menus/dashboard", mockWebsiteMenuDashboard);
  await mockApi.mock("/homepage/dashboard", mockHomepageDashboard);
  await mockApi.mock("/guide-docs/dashboard", mockGuideDocsDashboard);
}
