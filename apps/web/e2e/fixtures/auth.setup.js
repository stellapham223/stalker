import { test as setup } from "@playwright/test";

const authFile = "e2e/.auth/session.json";

setup("authenticate", async ({ page }) => {
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("/test-login") && res.ok()
  );
  await page.goto("/api/auth/test-login?email=test@example.com");
  await responsePromise;
  await page.context().storageState({ path: authFile });
});
