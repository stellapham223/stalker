import { test, expect } from "../../fixtures/test-fixtures.js";

test.describe("User Guide Page", () => {
  test("displays page heading and content", async ({ page }) => {
    await page.goto("/user-guide");
    await expect(page.locator("h1")).toContainText("User Guide");
  });

  test("has navigation sidebar", async ({ page }) => {
    await page.goto("/user-guide");
    await expect(page.locator("h1")).toContainText("User Guide");
    // Should have navigation buttons in the sidebar
    const navButtons = page.locator("button").filter({ hasText: /\w+/ });
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});
