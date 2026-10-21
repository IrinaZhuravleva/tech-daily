# news-scraper

A personal news feed: collects articles from RSS sources (AI, security, testing, development), sorts them into categories, and shows them on a single page with search and filters.

About 150 fresh articles (from the last 14 days) from 15 sources. That is enough for daily reading, so no database is connected yet (see "Possible extensions").

## How it works

```
sources.yaml ──► scraper/export_sample.py ──► data.json ──► index.html
 (sources,        (downloads RSS, assigns     (articles)    (page with search
  categories)      categories, drops                         and filters)
                   paywalled articles)
```

## Quick start

```bash
pip install -r requirements.txt
python scraper/export_sample.py     # builds data.json (up to 30 latest articles per source)
python -m http.server 8765          # then open http://127.0.0.1:8765/index.html
```

A server is needed because browsers don't let a page read `data.json` over `file://`.
To refresh the feed locally, run `export_sample.py` again and reload the page.

## Auto-update and publishing (GitHub Actions + Pages)

The workflow `.github/workflows/publish.yml` runs every day at 06:00 UTC (and on pushes to `main` and on manual trigger), builds `data.json`, and publishes the site to GitHub Pages. No servers or secrets required.

One-time setup:
1. Push the project to a GitHub repository (`main` branch).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Actions → "Update news and publish site" → Run workflow. The site URL appears in the deploy step.

`data.json` is not committed to the repository: the workflow generates it each time.

## E2E tests

Playwright tests live in `tests/e2e`. The page tests mock `data.json` with a fixed dataset, so they don't depend on the network or on live RSS feeds.

```bash
npm install
npx playwright install chromium
npm test            # starts a local server automatically
npm run test:ui     # interactive mode
```

| File | What it checks |
|---|---|
| `feed.spec.ts` | rendering, category counters, search, source and period filters, combined filters, links, HTML-stripped summaries, image fallback, empty and error states |
| `responsive.spec.ts` | one column and no horizontal scroll on a phone (Pixel 7) |
| `data-contract.spec.ts` | the real `data.json` from the scraper: required fields, unique URLs, 14-day limit (skipped if the file is missing) |

In CI the tests run after `data.json` is built and before deploy, so a failing test blocks publishing.

## Sources

| Category | Sources |
|---|---|
| AI | MIT News (AI), MIT Technology Review, Google AI Blog, OpenAI Blog, Hugging Face Blog |
| Security | Krebs on Security, The Hacker News, Schneier on Security, BleepingComputer, Dark Reading |
| Testing | Google Testing Blog, Test Guild, Cypress Blog, Playwright Releases |
| Dev | Martin Fowler |

To add a source, append a block to `sources.yaml` with `name`, `category`, and `url` (the RSS/Atom feed address).

## Freshness

Only articles no older than 14 days (`max_age_days` in `sources.yaml`) are included, up to 30 per source. Articles without a date are kept.

## Categories

An article can have several categories. They are assigned in two ways:
1. **Source category**: the `category` field in `sources.yaml`.
2. **Title keywords**: regular expressions in the `keywords` block of `sources.yaml`. For example, an article about hacking an AI model lands in both AI and Security.

## Paywalled articles

For sources with `check_paywall: true` (currently MIT Technology Review), the script opens the article page and looks for paywall markers: any non-empty `paywallType` (`subscriber-only`, `metered` for a limited number of free articles) or `isAccessibleForFree: false`. Such articles are left out of the feed. If the page fails to load, the article stays in the feed.

## The page (`index.html`)

- Cards in 3 columns (2 on tablet, 1 on phone) with image, title, description, source, and date.
- Images come from the feed; if missing, from the article page's `og:image` (`og_image: true` in `sources.yaml`). If there is no image at all, a colored category placeholder is shown. Images are not downloaded, only links are stored.
- Search by title.
- Filters by category (with counters), by source, and by period (7 or 14 days). Counters are recalculated when the period changes.
- Article count above the list.
- Light and dark themes.

## Project structure

| File | Purpose |
|---|---|
| `sources.yaml` | Sources, categories, keywords |
| `scraper/main.py` | Feed download, categories, paywall check, writing to the DB |
| `scraper/export_sample.py` | Builds `data.json` without a database |
| `index.html`, `config.js`, `favicon.svg` | Article card page and its icon |
| `data.json` | Collected articles (generated) |
| `tests/e2e/`, `playwright.config.ts` | Playwright end-to-end tests |
| `schema.sql` | Table schema for Supabase (for the future) |
| `.github/workflows/publish.yml` | Daily collection and publishing to GitHub Pages |
| `requirements-db.txt` | Extra dependency for writing to Supabase (for the future) |

## Possible extensions

For now the feed lives in `data.json` and is rebuilt on each run. If you need more, the project is already prepared:

- **Database (Supabase, free 500 MB Postgres).** Keep article history, deduplicate by URL, search the whole archive. Schema in `schema.sql`, article writing in `scraper/main.py`.
  1. Create a project at supabase.com and run `schema.sql` in the SQL editor.
  2. `pip install -r requirements-db.txt`, then `SUPABASE_URL=... SUPABASE_KEY=... python scraper/main.py` (needs the **service_role** key; keep it secret).
  3. To make the page read from the database, put `SUPABASE_URL` and the public `anon` key into `config.js`. The read policy for `anon` is at the end of `schema.sql`.
- **Scheduled DB writes.** Add a `python scraper/main.py` step to `publish.yml` with `SUPABASE_URL` and `SUPABASE_KEY` secrets to build up an article archive.
- **More sources and categories.** Cloud/DevOps, Data, and others: just add blocks to `sources.yaml`.
- **Other storage.** Instead of Supabase, use Cloudflare R2 (10 GB free) for raw articles and JSON.
- **MCP server.** Serve the news to Claude via MCP on top of the database.
