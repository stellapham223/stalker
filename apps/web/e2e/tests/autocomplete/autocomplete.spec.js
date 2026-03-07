import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockAutocompleteTrackings,
  mockAutocompleteDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Autocomplete Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/autocomplete", mockAutocompleteTrackings);
    await mockApi.mock("/autocomplete/dashboard", mockAutocompleteDashboard);

    await page.goto("/autocomplete");
    await expect(page.locator("h1")).toContainText("Autocomplete Tracker");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Query" })).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("subscription app")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/autocomplete", []);
    await mockApi.mock("/autocomplete/dashboard", []);

    await page.goto("/autocomplete");
    await expect(page.locator("h1")).toContainText("Autocomplete Tracker");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Query form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/autocomplete", []);
    await mockApi.mock("/autocomplete/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/autocomplete",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-ac", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/autocomplete");
    await expect(page.locator("h1")).toContainText("Autocomplete Tracker");

    await page.getByRole("button", { name: "Add Query" }).click();
    await expect(page.getByPlaceholder("Search query (e.g. subs)")).toBeVisible();

    await page.getByPlaceholder("Search query (e.g. subs)").fill("test query");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({ query: "test query" });
  });
});
