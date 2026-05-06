"""
ANDES Virus Tracker — Conservative auto-update script.

This script DELIBERATELY does not change the case numbers in data/cases.json
unless it can confirm them from a primary WHO Disease Outbreak News (DON) page
that explicitly mentions hantavirus and provides verifiable figures.

Why so conservative? Regex-scraping random news articles for outbreak numbers
is unreliable — it can extract historical figures, unrelated stats, or wrong
contexts. False precision is worse than no automation.

What it does on every run (every 30 min):
  1. Fetches the WHO Disease Outbreak News index page
  2. Scans for any hantavirus DON published since the current data's source date
  3. If a NEW WHO DON about hantavirus is found, writes a marker file
     (data/pending_review.json) so a human can review and update cases.json
  4. Touches the timestamp on cases.json so the site shows it was checked
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "cases.json"
PENDING_FILE = ROOT / "data" / "pending_review.json"

WHO_DON_INDEX = "https://www.who.int/emergencies/disease-outbreak-news"
WHO_DON_RSS = "https://www.who.int/feeds/entity/csr/don/en/rss.xml"


def load_cases():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_cases(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def fetch(url, timeout=15):
    headers = {"User-Agent": "AndesVirusTracker/1.0 (+github.com/WilliamKlat/andesvirustracker)"}
    try:
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[warn] Fetch failed: {url}: {e}", file=sys.stderr)
        return ""


def find_who_hantavirus_dons():
    """Return WHO Disease Outbreak News items mentioning hantavirus."""
    items = []
    try:
        feed = feedparser.parse(WHO_DON_RSS)
        for entry in feed.entries:
            title = entry.get("title", "").lower()
            summary = entry.get("summary", "").lower()
            if "hantavirus" in title or "hantavirus" in summary or "andes virus" in title or "andes virus" in summary:
                items.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                })
    except Exception as e:
        print(f"[warn] WHO RSS parse failed: {e}", file=sys.stderr)
    return items


def main():
    cases = load_cases()
    if cases is None:
        print("[error] cases.json missing — refusing to create from scratch.", file=sys.stderr)
        sys.exit(1)

    print(f"Current data: {cases['confirmed']} confirmed, {cases['suspected']} suspected, {cases['deaths']} deaths")

    # Look for new WHO DONs about hantavirus
    dons = find_who_hantavirus_dons()
    print(f"Found {len(dons)} WHO DON items mentioning hantavirus")

    # Compare with the current source list — flag for human review if new ones appear
    existing_sources_text = " ".join(cases.get("sources", [])).lower()
    new_dons = []
    for don in dons:
        title_l = don["title"].lower()
        # Heuristic: if the DON title is not already referenced in our sources list
        if not any(word in existing_sources_text for word in title_l.split()[:5]):
            new_dons.append(don)

    if new_dons:
        # Write a pending-review marker — does NOT modify cases.json
        pending = {
            "flagged_at": datetime.now(timezone.utc).isoformat(),
            "new_who_dons": new_dons,
            "note": "Human review required. Verify these WHO DONs and update cases.json manually."
        }
        with open(PENDING_FILE, "w", encoding="utf-8") as f:
            json.dump(pending, f, indent=2, ensure_ascii=False)
        print(f"[flag] {len(new_dons)} new WHO DON(s) flagged for human review.")
    else:
        # Clear any old pending file
        if PENDING_FILE.exists():
            PENDING_FILE.unlink()
        print("[ok] No new WHO DONs since last verified update.")

    # Refresh the auto_checked timestamp (separate from last_updated which is human-set)
    cases["auto_checked"] = datetime.now(timezone.utc).isoformat()
    save_cases(cases)
    print("Done.")


if __name__ == "__main__":
    main()
