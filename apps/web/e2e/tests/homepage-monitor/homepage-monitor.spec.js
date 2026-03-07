import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockHomepageTrackings,
  mockHomepageDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Homepage Monitor Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/homepage", mockHomepageTrackings);
    await mockApi.mock("/homepage/dashboard", mockHomepageDashboard);

    await page.goto("/homepage-monitor");
    await expect(page.locator("h1")).toContainText("Homepage Monitor");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Website" })).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Recharge")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/homepage", []);
    await mockApi.mock("/homepage/dashboard", []);

    await page.goto("/homepage-monitor");
    await expect(page.locator("h1")).toContainText("Homepage Monitor");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Website form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/homepage", []);
    await mockApi.mock("/homepage/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/homepage",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-hp", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/homepage-monitor");
    await expect(page.locator("h1")).toContainText("Homepage Monitor");

    await page.getByRole("button", { name: "Add Website" }).click();
    await expect(page.getByPlaceholder("Website name")).toBeVisible();

    await page.getByPlaceholder("Website name").fill("Test Site");
    await page.getByPlaceholder("https://example.com").fill("https://test-site.com");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({
      name: "Test Site",
      url: "https://test-site.com",
    });
  });
});
