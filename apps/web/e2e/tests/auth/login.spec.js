import { test, expect } from "@playwright/test";

// Login tests run without auth (no storageState)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login Page", () => {
  test("renders login page with sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Competitor Stalker")).toBeVisible();
    await expect(page.getByText("Monitor competitor changes")).toBeVisible();
    await expect(
      page.getByText("Only Google accounts authorized by an admin can sign in.")
    ).toBeVisible();
  });

  test("shows access denied error", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");
    await expect(
      page.getByText("Your email is not authorized. Contact an admin to get access.")
    ).toBeVisible();
  });

  test("shows generic sign-in error", async ({ page }) => {
    await page.goto("/login?error=OAuthSignin");
    await expect(page.getByText("Sign-in failed. Please try again.")).toBeVisible();
  });
});
