import { test, expect } from "../../fixtures/test-fixtures.js";
import { mockAdminUsers, mockLatestChanges } from "../../helpers/api-mocks.js";

test.describe("Admin Page", () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mock("/changes/latest", mockLatestChanges);
  });

  test("displays user management heading and table", async ({ page, mockApi }) => {
    await mockApi.mock("/admin/users", mockAdminUsers);

    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("User Management");
    await expect(page.getByText("1 Users")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
  });

  test("shows Add User form", async ({ page, mockApi }) => {
    await mockApi.mock("/admin/users", []);

    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("User Management");
    await expect(page.getByText("Add User")).toBeVisible();
    await expect(page.getByPlaceholder("user@example.com")).toBeVisible();
  });

  test("submits add user form", async ({ page, mockApi }) => {
    await mockApi.mock("/admin/users", []);

    let createRequest = null;
    await page.route(
      (url) => new URL(url).pathname === "/api/admin/users",
      async (route) => {
        if (route.request().method() === "POST") {
          createRequest = JSON.parse(route.request().postData());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "new-user", email: createRequest.email }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("User Management");

    await page.getByPlaceholder("user@example.com").fill("new@example.com");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(500);
    expect(createRequest).toEqual({ email: "new@example.com" });
  });

  test("shows empty state when no users", async ({ page, mockApi }) => {
    await mockApi.mock("/admin/users", []);

    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("User Management");
    await expect(page.getByText("No users yet")).toBeVisible();
  });

  test("shows bulk import toggle", async ({ page, mockApi }) => {
    await mockApi.mock("/admin/users", []);

    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("User Management");

    await page.getByRole("button", { name: "Bulk import (CSV)" }).click();
    await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
  });
});
