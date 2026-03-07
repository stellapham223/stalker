import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockAppListingCompetitors,
  mockKeywords,
  mockAutocompleteTrackings,
  mockWebsiteMenus,
  mockHomepageTrackings,
  mockGuideDocsTrackings,
} from "../../helpers/api-mocks.js";

// Mock data: /api/changes/latest response WITH unseen changes
const mockLatestWithChanges = {
  sessionAt: new Date().toISOString(),
  totalChanges: 8,
  features: {
    keywords: [
      {
        id: "kw-1",
        name: "shopify review app",
        hasChanges: true,
        changeCount: 3,
        summary: "+2 app mới, -1 app rời",
        snapshotAt: new Date().toISOString(),
      },
    ],
    autocomplete: [
      {
        id: "ac-1",
        name: "subscription app",
        hasChanges: true,
        changeCount: 2,
        summary: "+1 thêm, -1 xóa",
        snapshotAt: new Date().toISOString(),
      },
    ],
    appListing: [
      {
        id: "al-1",
        name: "Subi",
        hasChanges: true,
        changeCount: 1,
        summary: "title thay đổi",
        snapshotAt: new Date().toISOString(),
      },
    ],
    websiteMenus: [
      {
        id: "wm-1",
        name: "Recharge",
        hasChanges: false,
        changeCount: 0,
        summary: null,
        snapshotAt: null,
      },
    ],
    homepage: [
      {
        id: "hp-1",
        name: "Recharge",
        hasChanges: true,
        changeCount: 2,
        summary: "+2 dòng",
        snapshotAt: new Date().toISOString(),
      },
    ],
    guideDocs: [],
  },
};

// Mock data: no changes at all
const mockLatestNoChanges = {
  sessionAt: null,
  totalChanges: 0,
  features: {
    keywords: [
      { id: "kw-1", name: "shopify review app", hasChanges: false, changeCount: 0, summary: null, snapshotAt: null },
    ],
    autocomplete: [
      { id: "ac-1", name: "subscription app", hasChanges: false, changeCount: 0, summary: null, snapshotAt: null },
    ],
    appListing: [
      { id: "al-1", name: "Subi", hasChanges: false, changeCount: 0, summary: null, snapshotAt: null },
    ],
    websiteMenus: [],
    homepage: [],
    guideDocs: [],
  },
};

test.describe("Badge notifications", () => {
  // Clear localStorage before each test to reset "seen" state
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("stalker_seen_"))
        .forEach((k) => localStorage.removeItem(k));
    });
  });

  test.describe("Sidebar badges", () => {
    test("shows red badge counts on sidebar nav items with unseen changes", async ({ page, mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Keyword Rankings should show badge "3"
      const keywordLink = page.locator("nav a", { hasText: "Keyword Rankings" });
      await expect(keywordLink.locator("span.rounded-full")).toBeVisible();
      await expect(keywordLink.locator("span.rounded-full")).toHaveText("3");

      // Autocomplete should show badge "2"
      const autoLink = page.locator("nav a", { hasText: "Autocomplete" });
      await expect(autoLink.locator("span.rounded-full")).toBeVisible();
      await expect(autoLink.locator("span.rounded-full")).toHaveText("2");

      // App Listing should show badge "1"
      const appLink = page.locator("nav a", { hasText: "App Listing" });
      await expect(appLink.locator("span.rounded-full")).toBeVisible();
      await expect(appLink.locator("span.rounded-full")).toHaveText("1");

      // Homepage Monitor should show badge "2"
      const homeLink = page.locator("nav a", { hasText: "Homepage Monitor" });
      await expect(homeLink.locator("span.rounded-full")).toBeVisible();
      await expect(homeLink.locator("span.rounded-full")).toHaveText("2");

      // Website Menus should NOT show a badge (hasChanges: false)
      const menuLink = page.locator("nav a", { hasText: "Website Menus" });
      await expect(menuLink.locator("span.rounded-full")).toHaveCount(0);

      // Guide Docs should NOT show a badge (empty array)
      const guideLink = page.locator("nav a", { hasText: "Guide Docs" });
      await expect(guideLink.locator("span.rounded-full")).toHaveCount(0);

      // Dashboard should NOT show a badge (featureKey is null)
      const dashLink = page.locator("nav a", { hasText: "Dashboard" });
      await expect(dashLink.locator("span.rounded-full")).toHaveCount(0);
    });

    test("does not show badges when there are no changes", async ({ page, mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestNoChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // No sidebar nav should have a badge
      const badges = page.locator("nav a span.rounded-full");
      await expect(badges).toHaveCount(0);
    });

    test("shows 99+ when badge count exceeds 99", async ({ page, mockApi }) => {
      const bigChanges = {
        ...mockLatestWithChanges,
        features: {
          ...mockLatestWithChanges.features,
          keywords: [
            {
              id: "kw-1",
              name: "shopify review app",
              hasChanges: true,
              changeCount: 150,
              summary: "many changes",
              snapshotAt: new Date().toISOString(),
            },
          ],
        },
      };

      await mockApi.mock("/changes/latest", bigChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const keywordLink = page.locator("nav a", { hasText: "Keyword Rankings" });
      await expect(keywordLink.locator("span.rounded-full")).toHaveText("99+");
    });
  });

  test.describe("Tab button badges", () => {
    test("shows badge on competitor tab when there are unseen changes", async ({ page, mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/app-listing", mockAppListingCompetitors);
      await mockApi.mock("/app-listing/dashboard", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/app-listing");
      await page.waitForLoadState("networkidle");

      // "Subi" tab should show badge "1"
      const subiTab = page.locator("button", { hasText: "Subi" });
      await expect(subiTab).toBeVisible();
      await expect(subiTab.locator("span.rounded-full")).toBeVisible();
      await expect(subiTab.locator("span.rounded-full")).toHaveText("1");
    });

    test("hides tab badge after clicking (marking as seen)", async ({ page, mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/app-listing", mockAppListingCompetitors);
      await mockApi.mock("/app-listing/dashboard", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      // Mock the detail endpoint for when user clicks the tab
      await page.route("**/api/app-listing/*/snapshots*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/app-listing");
      await page.waitForLoadState("networkidle");

      // Badge should be visible initially
      const subiTab = page.locator("button", { hasText: "Subi" });
      await expect(subiTab.locator("span.rounded-full")).toBeVisible();

      // Click the tab to mark as seen
      await subiTab.click();
      await page.waitForTimeout(500);

      // Badge should disappear after clicking (markSeen stores timestamp in localStorage)
      await expect(subiTab.locator("span.rounded-full")).toHaveCount(0);
    });

    test("does not show tab badge when there are no changes", async ({ page, mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestNoChanges);
      await mockApi.mock("/app-listing", mockAppListingCompetitors);
      await mockApi.mock("/app-listing/dashboard", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/app-listing");
      await page.waitForLoadState("networkidle");

      const subiTab = page.locator("button", { hasText: "Subi" });
      await expect(subiTab).toBeVisible();
      await expect(subiTab.locator("span.rounded-full")).toHaveCount(0);
    });
  });

  test.describe("Badge seen state (localStorage)", () => {
    test("hides sidebar badge when item was already seen", async ({ page, mockApi }) => {
      // Pre-set localStorage to mark the keyword as seen (with a future timestamp)
      await page.addInitScript(() => {
        localStorage.setItem("stalker_seen_keywords_kw-1", new Date(Date.now() + 86400000).toISOString());
      });

      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Keyword Rankings should NOT show badge because it was marked as seen
      const keywordLink = page.locator("nav a", { hasText: "Keyword Rankings" });
      await expect(keywordLink.locator("span.rounded-full")).toHaveCount(0);

      // But Autocomplete should still show badge (not marked as seen)
      const autoLink = page.locator("nav a", { hasText: "Autocomplete" });
      await expect(autoLink.locator("span.rounded-full")).toBeVisible();
      await expect(autoLink.locator("span.rounded-full")).toHaveText("2");
    });

    test("shows badge again when new changes arrive after seen timestamp", async ({ page, mockApi }) => {
      // Mark as seen in the past
      await page.addInitScript(() => {
        localStorage.setItem("stalker_seen_appListing_al-1", "2020-01-01T00:00:00.000Z");
      });

      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // App Listing should show badge because snapshotAt > seenAt
      const appLink = page.locator("nav a", { hasText: "App Listing" });
      await expect(appLink.locator("span.rounded-full")).toBeVisible();
      await expect(appLink.locator("span.rounded-full")).toHaveText("1");
    });
  });

  test.describe("No console errors", () => {
    test("badge rendering does not cause JS errors", async ({ page, mockApi }) => {
      const errors = [];
      page.on("pageerror", (err) => {
        // Ignore Next.js hydration mismatch from next-themes (Sun/Moon icon SSR)
        if (err.message.includes("Hydration failed")) return;
        errors.push(err.message);
      });

      await mockApi.mock("/changes/latest", mockLatestWithChanges);
      await mockApi.mock("/competitors", []);
      await mockApi.mock("/snapshots/changes/recent", []);
      await mockApi.mock("/me/permissions", { isAdmin: false, permissions: {} });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Also navigate to a feature page
      await mockApi.mock("/app-listing", mockAppListingCompetitors);
      await mockApi.mock("/app-listing/dashboard", []);
      await page.goto("/app-listing");
      await page.waitForLoadState("networkidle");

      expect(errors).toEqual([]);
    });
  });
});
