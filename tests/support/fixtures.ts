import { test as base, expect, Page } from "@playwright/test";
import { mockData } from "./mocks";

export { ARTICLES } from "./articles";
export { mockData };

/** `feed`: the page with mocked data, already opened and rendered. */
export const test = base.extend<{ feed: Page }>({
  feed: async ({ page }, use) => {
    await mockData(page);
    await page.goto("/index.html");
    await expect(page.locator("#list article").first()).toBeVisible();
    await use(page);
  },
});

export { expect };
