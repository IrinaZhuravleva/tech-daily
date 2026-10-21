# E2E tests

End-to-end tests for the Tech Daily page, written with [Playwright](https://playwright.dev) and TypeScript.

## What is tested

The site is a static page (`index.html`) that loads `data.json` and renders article cards with search and filters. The tests open the page in a real browser and check what a user sees.

| File | What it checks |
|---|---|
| `e2e/feed.spec.ts` | Rendering and article count; category chips and counters (an article with several categories counts in each); filters by category, search, source and period (7 / 14 days); combined filters; article links (`target=_blank`, `rel=noopener`); HTML stripped from summaries; category placeholder when there is no image; fallback to the placeholder when an image fails to load; empty result, empty feed, and the error badge when `data.json` cannot be loaded |
| `e2e/responsive.spec.ts` | One column and no horizontal scroll on a phone (Pixel 7). Runs only in the `mobile` project |
| `e2e/data-contract.spec.ts` | The real `data.json` built by the scraper: non-empty, required fields, valid URLs and dates, unique URLs, nothing older than 14 days. Skipped if `data.json` does not exist |
| `e2e/fixtures.ts` | Shared test data and the `feed` fixture (see below) |

## How it works

- **No network.** The page tests replace `data.json` with a fixed dataset using `page.route()`. Images are mocked the same way (a 1×1 PNG for a good image, an aborted request for a broken one). The tests do not depend on live RSS feeds, so they are stable.
- **Dates are relative to now.** Fixture articles are created as "N days ago", so the 7 / 14-day filter keeps working as time passes.
- **Server.** `playwright.config.ts` starts `python3 -m http.server` on port 8765 automatically. A server is required because browsers do not let a page read `data.json` over `file://`.
- **Isolation.** Every test gets a fresh page. The `feed` fixture mocks the data, opens `/index.html`, and waits for the first card, so tests start from a ready page and do not share state.
- **Projects.** `chromium` runs the page tests on a desktop browser; `mobile` runs `responsive.spec.ts` on a Pixel 7 viewport.

## Running

```bash
npm install
npx playwright install chromium    # once, downloads the browser

npm test                           # run everything, headless
npm run test:ui                    # interactive UI mode
npx playwright test feed           # one file
npx playwright test -g "search"    # tests whose name matches
npx playwright test --headed       # watch the browser
npm run report                     # open the HTML report after a run
```

To run `data-contract.spec.ts` against fresh data, build `data.json` first:

```bash
pip install -r requirements.txt
python scraper/export_sample.py
```

Without it, those tests are skipped. A stale `data.json` will fail the "last 14 days" check.

## CI

In `.github/workflows/publish.yml` the tests run after `data.json` is built and before the site is assembled and deployed. If a test fails, the site is not published and the Playwright HTML report is uploaded as the `playwright-report` artifact.

## Writing new tests

- Import `test` and `expect` from `./fixtures`, not from `@playwright/test`, to get the `feed` fixture.
- Take `feed` in the test arguments to get the page already loaded with the fixture data. Use plain `page` plus `mockData(page, ...)` when you need other data (empty, error status).
- To change the dataset, edit `ARTICLES` in `fixtures.ts`. Counts in `feed.spec.ts` (8 articles, 4 AI, and so on) depend on it.
- Category chips are found by `data-cat`: `.chip[data-cat="AI"]`. The chip text also contains a counter, so matching by text is fragile.
