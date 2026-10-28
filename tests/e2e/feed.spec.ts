import { test, expect, mockData } from "../support/fixtures";

const chip = (page: import("@playwright/test").Page, name: string) =>
  page.locator(`.chip[data-cat="${name}"]`);

test.describe("feed", () => {
  test("renders all articles with a total count", async ({ feed }) => {
    await expect(feed.locator("#list article")).toHaveCount(8);
    await expect(feed.locator("#count")).toHaveText("8 articles");
    await expect(feed).toHaveTitle("Tech Daily");
  });

  test("shows category chips with counters; multi-category articles count in each", async ({ feed }) => {
    await expect(chip(feed, "")).toContainText("8");
    await expect(chip(feed, "AI")).toContainText("4");
    await expect(chip(feed, "Security")).toContainText("2");
    await expect(chip(feed, "Testing")).toContainText("2");
    await expect(chip(feed, "Dev")).toContainText("1");
  });

  test("category filter narrows the list and marks the chip pressed", async ({ feed }) => {
    await chip(feed, "Security").click();
    await expect(chip(feed, "Security")).toHaveAttribute("aria-pressed", "true");
    await expect(chip(feed, "")).toHaveAttribute("aria-pressed", "false");
    await expect(feed.locator("#list article")).toHaveCount(2);
    await expect(feed.locator("#count")).toHaveText("2 of 8 articles");

    await chip(feed, "").click();
    await expect(feed.locator("#list article")).toHaveCount(8);
  });

  test("search filters by title, case-insensitively", async ({ feed }) => {
    await feed.locator("#q").fill("BOTNET");
    await expect(feed.locator("#list article")).toHaveCount(1);
    await expect(feed.locator("#list article a")).toHaveText("Botnet takedown explained");
  });

  test("search with no matches shows the empty state", async ({ feed }) => {
    await feed.locator("#q").fill("zzzzzz");
    await expect(feed.locator(".empty")).toHaveText("Nothing found");
    await expect(feed.locator("#count")).toHaveText("0 of 8 articles");
  });

  test("source filter lists sources alphabetically and filters", async ({ feed }) => {
    const options = await feed.locator("#src option").allTextContents();
    expect(options[0]).toBe("All sources");
    expect(options.slice(1)).toEqual([...options.slice(1)].sort());

    await feed.locator("#src").selectOption("Test Guild");
    await expect(feed.locator("#list article")).toHaveCount(2);
  });

  test("filters combine (category + search + source)", async ({ feed }) => {
    await chip(feed, "AI").click();
    await feed.locator("#src").selectOption("Hugging Face Blog");
    await feed.locator("#q").fill("broken");
    await expect(feed.locator("#list article")).toHaveCount(1);
    await expect(feed.locator("#list article a")).toHaveText("Article with broken image");
  });

  test("7-day period drops older articles and recalculates counters", async ({ feed }) => {
    await feed.locator("#period").selectOption("7");
    await expect(feed.locator("#days")).toHaveText("7");
    // the two 10/12-day-old articles are gone; the undated one is kept
    await expect(feed.locator("#list article")).toHaveCount(6);
    await expect(chip(feed, "Dev")).toContainText("0");
    await expect(chip(feed, "Testing")).toContainText("1");
    await expect(chip(feed, "")).toContainText("6");
  });

  test("article links open in a new tab safely", async ({ feed }) => {
    const link = feed.locator("#list article a", { hasText: "Botnet takedown explained" });
    await expect(link).toHaveAttribute("href", "https://example.com/sec-1");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("summary has HTML stripped", async ({ feed }) => {
    const card = feed.locator("#list article", { hasText: "New language model released" });
    await expect(card.locator(".sum")).toHaveText("A bigger model.");
  });

  test("meta shows source, and a tag per category", async ({ feed }) => {
    const meta = feed.locator("#list article", { hasText: "Hacking an AI model" }).locator(".meta");
    await expect(meta).toContainText("MIT News");
    await expect(meta.locator(".tag")).toHaveText(["AI", "Security"]);
  });
});

test.describe("images", () => {
  test("uses placeholder with the category name when there is no image", async ({ feed }) => {
    const ph = feed.locator("#list article", { hasText: "Botnet takedown" }).locator(".ph");
    await expect(ph).toHaveText("Security");
    await expect(ph).toHaveClass(/ph-Security/);
  });

  test("renders <img> when image exists and falls back to placeholder if it fails to load", async ({ feed }) => {
    await expect(feed.locator("#list article", { hasText: "Article with image" }).locator("img.thumb")).toHaveCount(1);
    const broken = feed.locator("#list article", { hasText: "Article with broken image" });
    await expect(broken.locator("img")).toHaveCount(0);
    await expect(broken.locator(".ph")).toHaveText("AI");
  });
});

test.describe("error handling", () => {
  test("shows an error badge when data.json cannot be loaded", async ({ page }) => {
    await mockData(page, 404);
    await page.goto("/index.html");
    await expect(page.locator("#status")).toBeVisible();
    await expect(page.locator("#status")).toHaveText("Error: data.json not found");
    await expect(page.locator("#list article")).toHaveCount(0);
  });

  test("handles an empty feed", async ({ page }) => {
    await mockData(page, []);
    await page.goto("/index.html");
    await expect(page.locator("#list .empty")).toHaveText("Nothing found");
    await expect(page.locator("#status")).toBeHidden();
  });
});
