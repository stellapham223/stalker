import { test, expect } from "../../fixtures/test-fixtures.js";
import { mockChanges, mockLatestChanges } from "../../helpers/api-mocks.js";

test.describe("Changes Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays change history with items", async ({ page, mockApi }) => {
    await mockApi.mock("/snapshots/changes/recent", mockChanges);

    await page.goto("/changes");
    await expect(page.locator("h1")).toContainText("Change History");
    await expect(page.getByText("Rival App").first()).toBeVisible();
    await expect(page.getByText("title").first()).toBeVisible();
    await expect(page.getByText("Title changed from")).toBeVisible();
  });

  test("shows empty state when no changes", async ({ page, mockApi }) => {
    await mockApi.mock("/snapshots/changes/recent", []);

    await page.goto("/changes");
    await expect(page.locator("h1")).toContainText("Change History");
    await expect(page.getByText("No changes detected yet.")).toBeVisible();
  });
});
