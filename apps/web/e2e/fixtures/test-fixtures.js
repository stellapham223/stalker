import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  mockApi: async ({ page }, use) => {
    const mocks = {};

    const mock = async (path, data, options = {}) => {
      const { status = 200, method } = options;
      const apiPath = `/api${path}`;
      await page.route(`**${apiPath}`, async (route) => {
        // Exact pathname match (prevent /api/keywords matching /api/keywords/dashboard)
        const url = new URL(route.request().url());
        if (url.pathname !== apiPath) {
          return route.fallback();
        }
        if (method && route.request().method() !== method.toUpperCase()) {
          return route.fallback();
        }
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      mocks[path] = data;
    };

    await use({ mock, mocks });
  },
});

export { expect };
