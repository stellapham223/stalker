import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockCompetitors,
  mockChanges,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays stat cards with correct counts", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", mockCompetitors);
    await mockApi.mock("/snapshots/changes/recent", mockChanges);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Stat card labels visible
    await expect(page.getByText("Tracked Competitors")).toBeVisible();
    await expect(page.getByText("Active Monitors")).toBeVisible();
    await expect(page.getByText("Recent Changes").first()).toBeVisible();

    // Stat values: 2 competitors, 1 active, 2 changes
    const statValues = page.locator(".text-2xl.font-bold");
    await expect(statValues.nth(0)).toHaveText("2");
    await expect(statValues.nth(1)).toHaveText("1");
    await expect(statValues.nth(2)).toHaveText("2");
  });

  test("displays change items with competitor name and field", async ({
    page,
    mockApi,
  }) => {
    await mockApi.mock("/competitors", mockCompetitors);
    await mockApi.mock("/snapshots/changes/recent", mockChanges);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Rival App").first()).toBeVisible();
    await expect(page.getByText("title").first()).toBeVisible();
    await expect(page.getByText("rating")).toBeVisible();
  });

  test("shows empty state when no changes", async ({ page, mockApi }) => {
    await mockApi.mock("/competitors", []);
    await mockApi.mock("/snapshots/changes/recent", []);

    await page.goto("/dashboard");
    // Wait for h1 to appear (hydration may need extra time)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No changes detected yet.")).toBeVisible();
  });
});
