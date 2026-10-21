import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Checks the real data.json produced by the scraper (generated in CI before tests).
const file = join(__dirname, "../../data.json");

test.describe("data.json contract", () => {
  test.skip(!existsSync(file), "data.json not generated (run scraper/export_sample.py)");

  const rows: any[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];

  test("is a non-empty list", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  test("every article has the fields the page needs", () => {
    for (const a of rows) {
      expect(a.url, "url").toMatch(/^https?:\/\//);
      expect(typeof a.title, "title").toBe("string");
      expect(a.title.length, "title").toBeGreaterThan(0);
      expect(typeof a.source, "source").toBe("string");
      expect(Array.isArray(a.categories), "categories").toBe(true);
      if (a.published_at) expect(Number.isNaN(Date.parse(a.published_at)), "published_at").toBe(false);
    }
  });

  test("urls are unique", () => {
    const urls = rows.map(a => a.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("only articles within the last 14 days (undated allowed)", () => {
    const limit = Date.now() - 15 * 864e5;
    for (const a of rows) if (a.published_at) expect(Date.parse(a.published_at)).toBeGreaterThan(limit);
  });
});
