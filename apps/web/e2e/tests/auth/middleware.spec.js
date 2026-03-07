import { test, expect } from "@playwright/test";

test.describe("Auth Middleware", () => {
  test.describe("unauthenticated", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    const protectedRoutes = [
      "/dashboard",
      "/competitors",
      "/keyword-rankings",
      "/autocomplete",
      "/app-listing",
      "/website-menus",
      "/homepage-monitor",
      "/guide-docs",
      "/changes",
    ];

    for (const route of protectedRoutes) {
      test(`redirects ${route} to /login`, async ({ page }) => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      });
    }

    test("/unauthorized is accessible without auth", async ({ page }) => {
      await page.goto("/unauthorized");
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe("authenticated", () => {
    test("redirects /login to / when logged in", async ({ page }) => {
      await page.goto("/login");
      await expect(page).not.toHaveURL(/\/login/);
    });
  });
});
