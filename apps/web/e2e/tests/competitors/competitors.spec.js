import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockCompetitors,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Competitors Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    // Mock sidebar badge endpoint to prevent hanging requests
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays competitor list", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", mockCompetitors);

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Rival App")).toBeVisible();
    await expect(page.getByText("Another Tool")).toBeVisible();
    await expect(page.getByText("https://apps.shopify.com/rival-app")).toBeVisible();
  });

  test("shows Add Competitor form when button clicked", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", []);

    await page.goto("/competitors");
    await expect(page.locator("h1")).toBeVisible();

    // Click Add Competitor (in empty state or header)
    await page.getByRole("button", { name: "Add Competitor" }).first().click();

    // Form should now be visible
    await expect(page.getByPlaceholder("Competitor name")).toBeVisible();
    await expect(page.getByPlaceholder("URL to track")).toBeVisible();

    // Cancel hides the form
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByPlaceholder("Competitor name")).not.toBeVisible();
  });

  test("submits create competitor form", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/competitors",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-comp", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/competitors");
    await expect(page.locator("h1")).toBeVisible();

    await page.getByRole("button", { name: "Add Competitor" }).first().click();
    await page.getByPlaceholder("Competitor name").fill("New Competitor");
    await page.getByPlaceholder("URL to track").fill("https://new-competitor.com");
    await page.getByRole("button", { name: "Create" }).click();

    await page.waitForTimeout(500);
    expect(createRequest).toEqual({
      name: "New Competitor",
      url: "https://new-competitor.com",
      type: "website",
    });
  });

  test("shows scrape button for each competitor", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", mockCompetitors);

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");

    const scrapeButtons = page.getByRole("button", { name: "Scrape Now" });
    await expect(scrapeButtons).toHaveCount(2);
  });

  test("displays competitor type and tracked fields count", async ({
    page,
    mockApi,
  }) => {
    await mockApi.mock("/competitors", mockCompetitors);

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Type: shopify_app | Fields: 3")).toBeVisible();
    await expect(page.getByText("Type: website | Fields: 1")).toBeVisible();
  });

  test("shows empty state when no competitors", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", []);

    await page.goto("/competitors");
    await expect(page.getByText("No competitors yet")).toBeVisible();
  });
});
