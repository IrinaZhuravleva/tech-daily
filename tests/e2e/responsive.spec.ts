import { test, expect } from "./fixtures";

// Runs in the "mobile" project (Pixel 7, 412px wide) -> single column.
test("cards are stacked in one column on a phone", async ({ feed }) => {
  const cols = await feed.locator("#list").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(1);
});

test("no horizontal scroll on a phone", async ({ feed }) => {
  const overflow = await feed.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
