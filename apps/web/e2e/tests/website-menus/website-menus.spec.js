import { test, expect } from "../../fixtures/test-fixtures.js";
import {
  mockWebsiteMenus,
  mockWebsiteMenuDashboard,
  mockLatestChanges,
} from "../../helpers/api-mocks.js";

test.describe("Website Menus Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays page heading and tabs", async ({ page, mockApi }) => {
    await mockApi.mock("/website-menus", mockWebsiteMenus);
    await mockApi.mock("/website-menus/dashboard", mockWebsiteMenuDashboard);

    await page.goto("/website-menus");
    await expect(page.locator("h1")).toContainText("Website Menus");
    await expect(page.getByRole("button", { name: "Scrape All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Website" })).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Recharge")).toBeVisible();
  });

  test("shows empty dashboard state", async ({ page, mockApi }) => {
    await mockApi.mock("/website-menus", []);
    await mockApi.mock("/website-menus/dashboard", []);

    await page.goto("/website-menus");
    await expect(page.locator("h1")).toContainText("Website Menus");
    await expect(page.getByText(/No scrape data yet/)).toBeVisible();
  });

  test("shows Add Website form and submits", async ({ page, mockApi }) => {
    await mockApi.mock("/website-menus", []);
    await mockApi.mock("/website-menus/dashboard", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/website-menus",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-wm", ...createRequest }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/website-menus");
    await expect(page.locator("h1")).toContainText("Website Menus");

    await page.getByRole("button", { name: "Add Website" }).click();
    await expect(page.getByPlaceholder("Website name")).toBeVisible();
    await expect(page.getByPlaceholder("https://example.com")).toBeVisible();

    await page.getByPlaceholder("Website name").fill("Test Site");
    await page.getByPlaceholder("https://example.com").fill("https://test-site.com");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toMatchObject({
      name: "Test Site",
      url: "https://test-site.com",
    });
  });
});
