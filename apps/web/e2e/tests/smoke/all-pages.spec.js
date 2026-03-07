import { test, expect } from "../../fixtures/test-fixtures.js";
import { setupAllMocks } from "../../helpers/api-mocks.js";

// next-themes causes harmless hydration mismatch (Sun vs Moon icon)
const IGNORED_ERRORS = ["Hydration failed", "There was an error while hydrating"];

function isRealError(msg) {
  return !IGNORED_ERRORS.some((ignored) => msg.includes(ignored));
}

test.describe("Smoke Tests - All Pages", () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupAllMocks(mockApi);
  });

  const pages = [
    { path: "/dashboard", heading: "Dashboard" },
    { path: "/competitors", heading: "Competitors" },
    { path: "/keyword-rankings", heading: "Keyword Rankings" },
    { path: "/autocomplete", heading: "Autocomplete Tracker" },
    { path: "/app-listing", heading: "App Listing" },
    { path: "/website-menus", heading: "Website Menus" },
    { path: "/homepage-monitor", heading: "Homepage Monitor" },
    { path: "/guide-docs", heading: "Guide Docs" },
    { path: "/changes", heading: "Change History" },
    { path: "/user-guide", heading: "User Guide" },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => {
        if (isRealError(err.message)) errors.push(err.message);
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Page should have a heading
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
      await expect(h1).toContainText(heading);

      // No JS errors (excluding known hydration warnings)
      expect(errors).toEqual([]);
    });
  }

  test("/admin loads for admin user", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => {
      if (isRealError(err.message)) errors.push(err.message);
    });

    await page.route("**/api/admin/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
