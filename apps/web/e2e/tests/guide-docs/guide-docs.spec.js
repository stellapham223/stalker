import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockGuideDocsTrackings,
  mockGuideDocsDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Guide Docs Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/guide-docs", mockGuideDocsTrackings);
    await mockApi.mock("/guide-docs/dashboard", mockGuideDocsDashboard);

    await page.goto("/guide-docs");
    await expect(page.locator("h1")).toContainText("Guide Docs");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Guide" })).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Recharge")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/guide-docs", []);
    await mockApi.mock("/guide-docs/dashboard", []);

    await page.goto("/guide-docs");
    await expect(page.locator("h1")).toContainText("Guide Docs");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Guide form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/guide-docs", []);
    await mockApi.mock("/guide-docs/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/guide-docs",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-gd", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/guide-docs");
    await expect(page.locator("h1")).toContainText("Guide Docs");

    await page.getByRole("button", { name: "Add Guide" }).click();
    await expect(page.getByPlaceholder("Name (e.g. Recharge)")).toBeVisible();

    await page.getByPlaceholder("Name (e.g. Recharge)").fill("Test Guide");
    await page.getByPlaceholder("https://docs.example.com/...").fill("https://docs.test.com/nav");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({
      name: "Test Guide",
      url: "https://docs.test.com/nav",
    });
  });
});
