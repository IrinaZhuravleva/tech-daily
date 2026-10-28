import { Page } from "@playwright/test";
import { Article, ARTICLES } from "./articles";

// 1x1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

/** Mock data.json (articles, or an HTTP status number to simulate a failure) and the test images. */
export async function mockData(page: Page, articles: Article[] | number = ARTICLES) {
  await page.route("**/data.json", route =>
    typeof articles === "number"
      ? route.fulfill({ status: articles, body: "nope" })
      : route.fulfill({ json: articles }));
  await page.route("https://img.example.com/ok.png", r => r.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route("https://img.example.com/broken.png", r => r.abort());
}
