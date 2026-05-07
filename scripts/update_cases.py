"""
ANDES Virus Tracker — Conservative auto-update script.

This script DELIBERATELY does not change the case numbers in data/cases.json
unless a human verifies them. Auto-scraping numbers from news headlines is
unreliable and risks publishing wrong figures.

What it does on every run (every 30 min):
  1. Fetches the WHO Disease Outbreak News RSS feed.
  2. Scans for any hantavirus / Andes virus DON not already referenced.
  3. If a NEW item appears, it:
       - writes data/pending_review.json (so the site can show a 'pending review' note)
       - opens a GitHub issue tagging the maintainer, with a verification checklist
         (so the maintainer is notified instantly and can update the figures).
  4. Always refreshes the auto_checked timestamp on cases.json so the site
     can show 'checked X minutes ago'.

Numbers in cases.json change ONLY through human verification — never silently.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "cases.json"
PENDING_FILE = ROOT / "data" / "pending_review.json"

WHO_DON_RSS = "https://www.who.int/feeds/entity/csr/don/en/rss.xml"
KEYWORDS = ("hantavirus", "andes virus")


def load_cases():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_cases(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_who_hantavirus_dons():
    """Return WHO DON items mentioning hantavirus / Andes virus."""
    items = []
    try:
        feed = feedparser.parse(WHO_DON_RSS)
        for entry in feed.entries:
            blob = " ".join([
                entry.get("title", ""),
                entry.get("summary", ""),
            ]).lower()
            if any(kw in blob for kw in KEYWORDS):
                items.append({
                    "title": entry.get("title", "").strip(),
                    "link": entry.get("link", "").strip(),
                    "published": entry.get("published", "").strip(),
                })
    except Exception as e:
        print(f"[warn] WHO RSS parse failed: {e}", file=sys.stderr)
    return items


def github_issue_exists(title):
    """Check if an open issue with this exact title already exists."""
    try:
        result = subprocess.run(
            ["gh", "issue", "list", "--state", "open", "--search", title, "--json", "title"],
            capture_output=True, text=True, check=False, timeout=20,
        )
        if result.returncode != 0:
            return False
        existing = json.loads(result.stdout or "[]")
        return any(i.get("title") == f"[Verify] {title}" for i in existing)
    except Exception as e:
        print(f"[warn] gh issue list failed: {e}", file=sys.stderr)
        return False


def create_github_issue(don):
    """Open a GitHub issue prompting human verification of a new WHO DON."""
    if not os.environ.get("GITHUB_ACTIONS"):
        print("[skip] not in GitHub Actions; not opening issue.")
        return

    issue_title = f"[Verify] {don['title']}"
    if github_issue_exists(don["title"]):
        print(f"[ok] issue already open for: {don['title']}")
        return

    body = f"""A new WHO Disease Outbreak News item mentioning hantavirus / Andes virus was detected.

**Source:** {don['link']}
**Published:** {don.get('published', 'unknown')}
**Detected at:** {datetime.now(timezone.utc).isoformat()}

---

### Verification checklist

- [ ] Open the WHO DON link above and read the full report
- [ ] Note the official figures: confirmed cases, suspected cases, deaths, countries involved
- [ ] Update `data/cases.json` with the new figures
- [ ] Set `verification_date` to today's date (UTC)
- [ ] Add this DON URL to the `sources` array
- [ ] Bump `last_updated` to the current ISO timestamp
- [ ] Commit with message `data: verify against WHO DON …`
- [ ] Close this issue

### Why this is manual

Numbers in `cases.json` are never auto-updated from scraped text — extracting figures
from news prose is unreliable and risks publishing wrong data. A human must verify the
official figures before they go live on the tracker.
"""

    try:
        result = subprocess.run(
            ["gh", "issue", "create",
             "--title", issue_title,
             "--body", body,
             "--label", "verification-needed"],
            capture_output=True, text=True, check=False, timeout=30,
        )
        if result.returncode == 0:
            print(f"[ok] opened issue: {result.stdout.strip()}")
        else:
            # Try without the label (label may not exist)
            result2 = subprocess.run(
                ["gh", "issue", "create", "--title", issue_title, "--body", body],
                capture_output=True, text=True, check=False, timeout=30,
            )
            if result2.returncode == 0:
                print(f"[ok] opened issue (no label): {result2.stdout.strip()}")
            else:
                print(f"[warn] gh issue create failed: {result.stderr}\n{result2.stderr}", file=sys.stderr)
    except Exception as e:
        print(f"[warn] gh issue create exception: {e}", file=sys.stderr)


def main():
    cases = load_cases()
    if cases is None:
        print("[error] cases.json missing — refusing to create from scratch.", file=sys.stderr)
        sys.exit(1)

    print(f"Current data: {cases['confirmed']} confirmed, "
          f"{cases['suspected']} suspected, {cases['deaths']} deaths")

    dons = find_who_hantavirus_dons()
    print(f"Found {len(dons)} WHO DON items mentioning hantavirus / Andes virus")

    # Match against the existing sources list — flag for human review if new
    existing_sources_text = " ".join(cases.get("sources", [])).lower()
    new_dons = []
    for don in dons:
        title_l = don["title"].lower()
        # Heuristic: if first 5 words of title aren't already referenced, treat as new
        if not any(w in existing_sources_text for w in title_l.split()[:5] if len(w) > 3):
            new_dons.append(don)

    if new_dons:
        pending = {
            "flagged_at": datetime.now(timezone.utc).isoformat(),
            "new_who_dons": new_dons,
            "note": "Human review required. A GitHub issue has been opened for each new DON.",
        }
        with open(PENDING_FILE, "w", encoding="utf-8") as f:
            json.dump(pending, f, indent=2, ensure_ascii=False)
        print(f"[flag] {len(new_dons)} new WHO DON(s) flagged for human review.")

        for don in new_dons:
            create_github_issue(don)
    else:
        if PENDING_FILE.exists():
            PENDING_FILE.unlink()
        print("[ok] No new WHO DONs since last verified update.")

    cases["auto_checked"] = datetime.now(timezone.utc).isoformat()
    save_cases(cases)
    print("Done.")


if __name__ == "__main__":
    main()
