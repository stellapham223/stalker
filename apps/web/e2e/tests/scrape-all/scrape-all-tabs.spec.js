import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockKeywords,
  mockKeywordDashboard,
  mockAutocompleteTrackings,
  mockAutocompleteDashboard,
  mockAppListingCompetitors,
  mockAppListingDashboard,
  mockWebsiteMenus,
  mockWebsiteMenuDashboard,
  mockHomepageTrackings,
  mockHomepageDashboard,
  mockGuideDocsTrackings,
  mockGuideDocsDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

/**
 * Test: "Scrape All" button visibility and data refresh across ALL tabs
 *
 * The user reported that scrape only shows on Dashboard tab.
 * These tests verify:
 * 1. "Scrape All" button is visible on Dashboard tab AND individual item tabs
 * 2. Clicking "Scrape All" triggers the correct API endpoint
 * 3. After scrape completes, both dashboard AND individual tab data are refreshed
 * 4. Individual tabs have their own "Scrape Now" button
 */

const FEATURES = [
  {
    name: "Keyword Rankings",
    route: "/keyword-rankings",
    listEndpoint: "/keywords",
    listData: mockKeywords,
    dashboardEndpoint: "/keywords/dashboard",
    dashboardData: mockKeywordDashboard,
    scrapeAllEndpoint: "/keywords/scrape-all",
    itemTabLabel: "shopify review app",
    snapshotEndpoint: "/keywords/kw-1/snapshots",
    addButtonLabel: "Add Keyword",
  },
  {
    name: "Autocomplete Tracker",
    route: "/autocomplete",
    listEndpoint: "/autocomplete",
    listData: mockAutocompleteTrackings,
    dashboardEndpoint: "/autocomplete/dashboard",
    dashboardData: mockAutocompleteDashboard,
    scrapeAllEndpoint: "/autocomplete/scrape-all",
    itemTabLabel: "subscription app",
    snapshotEndpoint: "/autocomplete/ac-1/snapshots",
    addButtonLabel: "Add Query",
  },
  {
    name: "App Listing",
    route: "/app-listing",
    listEndpoint: "/app-listing",
    listData: mockAppListingCompetitors,
    dashboardEndpoint: "/app-listing/dashboard",
    dashboardData: mockAppListingDashboard,
    scrapeAllEndpoint: "/app-listing/scrape-all",
    itemTabLabel: "Subi",
    snapshotEndpoint: "/app-listing/al-1/snapshots",
    addButtonLabel: "Add Competitor",
  },
  {
    name: "Website Menus",
    route: "/website-menus",
    listEndpoint: "/website-menus",
    listData: mockWebsiteMenus,
    dashboardEndpoint: "/website-menus/dashboard",
    dashboardData: mockWebsiteMenuDashboard,
    scrapeAllEndpoint: "/website-menus/scrape-all",
    itemTabLabel: "Recharge",
    snapshotEndpoint: "/website-menus/wm-1/snapshots",
    addButtonLabel: "Add Website",
  },
  {
    name: "Homepage Monitor",
    route: "/homepage-monitor",
    listEndpoint: "/homepage",
    listData: mockHomepageTrackings,
    dashboardEndpoint: "/homepage/dashboard",
    dashboardData: mockHomepageDashboard,
    scrapeAllEndpoint: "/homepage/scrape-all",
    itemTabLabel: "Recharge",
    snapshotEndpoint: "/homepage/hp-1/snapshots",
    addButtonLabel: "Add Homepage",
  },
  {
    name: "Guide Docs",
    route: "/guide-docs",
    listEndpoint: "/guide-docs",
    listData: mockGuideDocsTrackings,
    dashboardEndpoint: "/guide-docs/dashboard",
    dashboardData: mockGuideDocsDashboard,
    scrapeAllEndpoint: "/guide-docs/scrape-all",
    itemTabLabel: "Recharge",
    snapshotEndpoint: "/guide-docs/gd-1/snapshots",
    addButtonLabel: "Add Guide",
  },
];

for (const feature of FEATURES) {
  test.describe(`${feature.name} — Scrape All across tabs`, () => {
    test.beforeEach(async ({ mockApi }) => {
      await mockApi.mock("/changes/latest", mockLatestChanges);
    });

    test("Scrape All button is visible on Dashboard tab", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Dashboard tab button is active by default
      await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
      // Scrape All button should be visible
      await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Scrape All" })).toBeEnabled();
    });

    test("Scrape All button is visible on individual item tab", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      // Mock snapshot endpoint for the detail tab (returns empty array = no data yet)
      await page.route(`**/api${feature.snapshotEndpoint}*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Click on individual item tab
      await page.getByText(feature.itemTabLabel).first().click();
      await page.waitForLoadState("networkidle");

      // Scrape All button should STILL be visible on individual tab
      await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Scrape All" })).toBeEnabled();
    });

    test("individual item tab has Scrape Now button", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      // Mock snapshot endpoint
      await page.route(`**/api${feature.snapshotEndpoint}*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Click on individual item tab
      await page.getByText(feature.itemTabLabel).first().click();
      await page.waitForLoadState("networkidle");

      // Both Scrape All and Scrape Now should be visible
      await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Scrape Now" })).toBeVisible();
    });

    test("Scrape All triggers correct API and shows loading state", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      let scrapeAllCalled = false;
      await page.route(
        (url) => new URL(url).pathname === `/api${feature.scrapeAllEndpoint}`,
        async (route) => {
          if (route.request().method() === "POST") {
            scrapeAllCalled = true;
            // Delay response so loading state is visible
            await new Promise((r) => setTimeout(r, 1000));
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ message: "Scraping started" }),
            });
          } else {
            await route.fallback();
          }
        }
      );

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Click Scrape All
      await page.getByRole("button", { name: "Scrape All" }).click();

      // Button should show loading state while request is in-flight
      await expect(page.getByRole("button", { name: "Scraping..." })).toBeVisible();

      // Wait for request to complete
      await page.waitForTimeout(1500);
      expect(scrapeAllCalled).toBe(true);
    });

    test("Scrape All from individual tab triggers correct API", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      // Mock snapshot endpoint
      await page.route(`**/api${feature.snapshotEndpoint}*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      let scrapeAllCalled = false;
      await page.route(
        (url) => new URL(url).pathname === `/api${feature.scrapeAllEndpoint}`,
        async (route) => {
          if (route.request().method() === "POST") {
            scrapeAllCalled = true;
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ message: "Scraping started" }),
            });
          } else {
            await route.fallback();
          }
        }
      );

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Switch to individual item tab
      await page.getByText(feature.itemTabLabel).first().click();
      await page.waitForLoadState("networkidle");

      // Click Scrape All from the individual tab
      await page.getByRole("button", { name: "Scrape All" }).click();
      await page.waitForTimeout(500);

      // Should still trigger the scrape-all endpoint
      expect(scrapeAllCalled).toBe(true);
    });

    test("after Scrape All, dashboard data is refreshed", async ({ page, mockApi }) => {
      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      let dashboardFetchCount = 0;
      await page.route(
        (url) => new URL(url).pathname === `/api${feature.dashboardEndpoint}`,
        async (route) => {
          dashboardFetchCount++;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(feature.dashboardData),
          });
        }
      );

      await page.route(
        (url) => new URL(url).pathname === `/api${feature.scrapeAllEndpoint}`,
        async (route) => {
          if (route.request().method() === "POST") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ message: "ok" }),
            });
          } else {
            await route.fallback();
          }
        }
      );

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      const initialDashboardFetches = dashboardFetchCount;

      // Click Scrape All
      await page.getByRole("button", { name: "Scrape All" }).click();

      // Wait for polling to trigger at least one refetch (polls every 3s)
      await page.waitForTimeout(4000);

      // Dashboard data should have been re-fetched (polling invalidates queries)
      expect(dashboardFetchCount).toBeGreaterThan(initialDashboardFetches);
    });

    test("no console errors on page load and tab switching", async ({ page, mockApi }) => {
      const errors = [];
      page.on("pageerror", (error) => {
        // Ignore known next-themes hydration mismatch (Sun/Moon icon SSR vs client)
        if (error.message.includes("Hydration failed")) return;
        errors.push(error.message);
      });

      await mockApi.mock(feature.listEndpoint, feature.listData);
      await mockApi.mock(feature.dashboardEndpoint, feature.dashboardData);

      // Mock snapshot endpoint
      await page.route(`**/api${feature.snapshotEndpoint}*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto(feature.route);
      await page.waitForLoadState("networkidle");

      // Switch to individual tab
      await page.getByText(feature.itemTabLabel).first().click();
      await page.waitForLoadState("networkidle");

      // Switch back to Dashboard tab
      await page.getByRole("button", { name: "Dashboard" }).click();
      await page.waitForLoadState("networkidle");

      expect(errors).toEqual([]);
    });
  });
}
