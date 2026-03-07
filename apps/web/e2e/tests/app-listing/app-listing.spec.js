import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockAppListingCompetitors,
  mockAppListingDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("App Listing Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/app-listing", mockAppListingCompetitors);
    await mockApi.mock("/app-listing/dashboard", mockAppListingDashboard);

    await page.goto("/app-listing");
    await expect(page.locator("h1")).toContainText("App Listing");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Competitor" })).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Subi")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/app-listing", []);
    await mockApi.mock("/app-listing/dashboard", []);

    await page.goto("/app-listing");
    await expect(page.locator("h1")).toContainText("App Listing");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Competitor form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/app-listing", []);
    await mockApi.mock("/app-listing/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/app-listing",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-al", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/app-listing");
    await expect(page.locator("h1")).toContainText("App Listing");

    await page.getByRole("button", { name: "Add Competitor" }).click();
    await expect(page.getByPlaceholder("App name (e.g. Appstle)")).toBeVisible();
    await expect(page.getByPlaceholder("https://apps.shopify.com/...")).toBeVisible();

    await page.getByPlaceholder("App name (e.g. Appstle)").fill("Test App");
    await page.getByPlaceholder("https://apps.shopify.com/...").fill("https://apps.shopify.com/test");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({
      name: "Test App",
      url: "https://apps.shopify.com/test",
    });
  });
});
