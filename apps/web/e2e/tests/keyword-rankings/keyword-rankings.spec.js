import { test, expect } from "../../fixtures/test-fixtures.js";
import { mockKeywords, mockKeywordDashboard, mockLatestChanges } from "../../helpers/api-mocks.js";

test.describe("Keyword Rankings Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/keywords", mockKeywords);
    await mockApi.mock("/keywords/dashboard", mockKeywordDashboard);

    await page.goto("/keyword-rankings");
    await expect(page.locator("h1")).toContainText("Keyword Rankings");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Keyword" })).toBeVisible();
    // Dashboard tab active by default
    await expect(page.getByText("Dashboard")).toBeVisible();
    // Keyword tab visible
    await expect(page.getByText("shopify review app")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/keywords", []);
    await mockApi.mock("/keywords/dashboard", []);

    await page.goto("/keyword-rankings");
    await expect(page.locator("h1")).toContainText("Keyword Rankings");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Keyword form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/keywords", []);
    await mockApi.mock("/keywords/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/keywords",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-kw", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/keyword-rankings");
    await expect(page.locator("h1")).toContainText("Keyword Rankings");

    // Open form
    await page.getByRole("button", { name: "Add Keyword" }).click();
    await expect(page.getByPlaceholder("Keyword (e.g. subscription)")).toBeVisible();

    // Fill and submit
    await page.getByPlaceholder("Keyword (e.g. subscription)").fill("test keyword");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({ keyword: "test keyword" });
  });

  test("cancel hides the form", async ({ page, mockApi }) => {
    await mockApi.mock("/keywords", []);
    await mockApi.mock("/keywords/dashboard", []);

    await page.goto("/keyword-rankings");
    await expect(page.locator("h1")).toContainText("Keyword Rankings");

    await page.getByRole("button", { name: "Add Keyword" }).click();
    await expect(page.getByPlaceholder("Keyword (e.g. subscription)")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByPlaceholder("Keyword (e.g. subscription)")).not.toBeVisible();
  });
});
