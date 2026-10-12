"""Fetch RSS feeds from sources.yaml and upsert new articles into Supabase."""
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import feedparser
import requests
import yaml

SOURCES_FILE = Path(__file__).resolve().parent.parent / "sources.yaml"
BATCH_SIZE = 200
# paywallType is "" on free pages, "metered" (limited free reads) or "subscriber-only" otherwise.
PAYWALL_RE = re.compile(
    r'"paywallType"\s*:\s*"[^"]+"|"isAccessibleForFree"\s*:\s*"?false', re.I
)


def is_paywalled(url):
    """True if the article page declares itself subscriber-only. Fails open (False)."""
    try:
        resp = requests.get(url, headers={"User-Agent": "news-scraper/1.0"}, timeout=30)
        return bool(PAYWALL_RE.search(resp.text))
    except requests.RequestException:
        return False


IMG_TAG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)', re.I)
OG_RE = [
    re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]*content=["\']([^"\']+)', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', re.I),
]


def entry_image(entry):
    """Best image URL found in the feed entry itself, or None."""
    for key in ("media_thumbnail", "media_content"):
        for m in entry.get(key) or []:
            if m.get("url"):
                return m["url"]
    for link in entry.get("links", []):
        if link.get("rel") == "enclosure" and "image" in (link.get("type") or ""):
            return link["href"]
    html = [entry.get("summary", "")] + [c.get("value", "") for c in entry.get("content") or []]
    for chunk in html:
        m = IMG_TAG_RE.search(chunk)
        if m:
            return m.group(1)
    return None


def clean_image(url):
    if not url or not url.startswith("http"):
        return None
    # Blogger thumbnails are 72px by default; ask for a bigger one.
    return re.sub(r"=s72-c$", "=s600", url)


def og_image(url):
    try:
        resp = requests.get(url, headers={"User-Agent": "news-scraper/1.0"}, timeout=15)
        for rx in OG_RE:
            m = rx.search(resp.text)
            if m:
                return urljoin(url, m.group(1).replace("&amp;", "&"))
    except requests.RequestException:
        pass
    return None


def add_og_images(rows):
    """Fill missing images from each article page's og:image (parallel)."""
    missing = [r for r in rows if not r["image"]]
    with ThreadPoolExecutor(8) as pool:
        for row, img in zip(missing, pool.map(lambda r: og_image(r["url"]), missing)):
            row["image"] = clean_image(img)


def existing_urls(client, urls):
    found = set()
    for i in range(0, len(urls), BATCH_SIZE):
        res = client.table("articles").select("url").in_("url", urls[i : i + BATCH_SIZE]).execute()
        found.update(r["url"] for r in res.data)
    return found


def parse_date(entry):
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    return datetime.fromtimestamp(time.mktime(parsed), tz=timezone.utc).isoformat()


def categorize(source, title, keywords):
    cats = {source["category"]} if source.get("category") else set()
    for cat, patterns in keywords.items():
        if any(re.search(p, title, re.I) for p in patterns):
            cats.add(cat)
    return sorted(cats)


def fetch_source(source, keywords=None):
    resp = requests.get(source["url"], headers={"User-Agent": "news-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    feed = feedparser.parse(resp.content)
    if feed.bozo and not feed.entries:
        raise RuntimeError(f"feed error: {feed.bozo_exception}")
    rows = []
    for e in feed.entries:
        url = e.get("link")
        if not url:
            continue
        title = (e.get("title") or "").strip()
        rows.append(
            {
                "url": url,
                "categories": categorize(source, title, keywords or {}),
                "source": source["name"],
                "title": title,
                "image": None if source.get("skip_image") else clean_image(entry_image(e)),
                "summary": (e.get("summary") or "").strip(),
                "published_at": parse_date(e),
            }
        )
    return rows


def main():
    from supabase import create_client

    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    config = yaml.safe_load(SOURCES_FILE.read_text())
    sources, keywords = config["sources"], config.get("keywords", {})

    failed = 0
    for source in sources:
        try:
            rows = fetch_source(source, keywords)
            if source.get("check_paywall"):
                known = existing_urls(client, [r["url"] for r in rows])
                before = len(rows)
                rows = [r for r in rows if r["url"] in known or not is_paywalled(r["url"])]
                print(f"     {source['name']}: skipped {before - len(rows)} paywalled")
            for i in range(0, len(rows), BATCH_SIZE):
                client.table("articles").upsert(
                    rows[i : i + BATCH_SIZE],
                    on_conflict="url",
                    ignore_duplicates=True,
                ).execute()
            print(f"OK   {source['name']}: {len(rows)} entries")
        except Exception as exc:  # one broken feed must not stop the rest
            failed += 1
            print(f"FAIL {source['name']}: {exc}", file=sys.stderr)

    # Only fail the run if every source failed.
    if failed == len(sources):
        sys.exit(1)


if __name__ == "__main__":
    main()
