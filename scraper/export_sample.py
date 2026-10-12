"""Write data.json from the live feeds (no database) for previewing index.html."""
import json
from pathlib import Path

import yaml

from main import SOURCES_FILE, add_og_images, fetch_source, is_paywalled

rows = []
config = yaml.safe_load(SOURCES_FILE.read_text())
for source in config["sources"]:
    try:
        found = sorted(fetch_source(source, config.get("keywords", {}), config.get("max_age_days")), key=lambda r: r["published_at"] or "", reverse=True)[:30]
        if source.get("check_paywall"):
            found = [r for r in found if not is_paywalled(r["url"])]
        if source.get("og_image"):
            add_og_images(found)
        rows += found
    except Exception as exc:
        print(f"FAIL {source['name']}: {exc}")
rows.sort(key=lambda r: r["published_at"] or "", reverse=True)
out = Path(__file__).resolve().parent.parent / "data.json"
out.write_text(json.dumps(rows, ensure_ascii=False))
print(f"{len(rows)} articles -> {out}")
