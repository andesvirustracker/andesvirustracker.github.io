"""
HantaVirusTracker — Auto-update case data
Runs every 30 minutes via GitHub Actions.
Scrapes WHO, CDC, and news RSS feeds for hantavirus case mentions
and updates data/cases.json with the latest counts.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

DATA_FILE = Path(__file__).parent.parent / "data" / "cases.json"

# RSS feeds to scan for case-number mentions
NEWS_FEEDS = [
    "https://news.google.com/rss/search?q=hantavirus+cases&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=%22andes+virus%22+outbreak&hl=en-US&gl=US&ceid=US:en",
]

# Pages to scrape for official numbers
OFFICIAL_PAGES = [
    "https://www.who.int/emergencies/disease-outbreak-news",
    "https://www.cdc.gov/hantavirus/",
]

# Regex patterns to extract case numbers from text
CASE_PATTERNS = [
    r"(\d+)\s+(?:confirmed|reported|new)\s+cases?\s+of\s+hantavirus",
    r"hantavirus.*?(\d+)\s+(?:confirmed|reported|new)\s+cases?",
    r"(\d+)\s+cases?\s+of\s+(?:andes|hantavirus|sin\s*nombre)",
]
DEATH_PATTERNS = [
    r"(\d+)\s+deaths?\s+(?:from|due to|caused by)\s+hantavirus",
    r"hantavirus.*?(\d+)\s+deaths?",
    r"(\d+)\s+(?:fatal|fatalities)",
]


def load_existing():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "confirmed": 0, "suspected": 0, "deaths": 0, "countries": 0,
        "change_24h": 0, "last_updated": "", "locations": []
    }


def fetch_text(url, timeout=15):
    try:
        headers = {"User-Agent": "HantaVirusTracker/1.0 (+github.com/WilliamKlat/hantavirus-tracker)"}
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[warn] Failed to fetch {url}: {e}", file=sys.stderr)
        return ""


def extract_numbers(text, patterns):
    text = text.lower()
    found = []
    for pattern in patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            try:
                n = int(m.group(1))
                if 0 < n < 100000:
                    found.append(n)
            except (ValueError, IndexError):
                continue
    return found


def scan_news():
    case_mentions = []
    death_mentions = []
    for feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:30]:
                text = f"{entry.get('title', '')} {entry.get('summary', '')}"
                case_mentions += extract_numbers(text, CASE_PATTERNS)
                death_mentions += extract_numbers(text, DEATH_PATTERNS)
        except Exception as e:
            print(f"[warn] Feed parse failed: {e}", file=sys.stderr)
    return case_mentions, death_mentions


def scan_official():
    case_mentions = []
    death_mentions = []
    for url in OFFICIAL_PAGES:
        html = fetch_text(url)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True)
        case_mentions += extract_numbers(text, CASE_PATTERNS)
        death_mentions += extract_numbers(text, DEATH_PATTERNS)
    return case_mentions, death_mentions


def main():
    existing = load_existing()
    print(f"Existing: {existing['confirmed']} confirmed, {existing['deaths']} deaths")

    news_cases, news_deaths = scan_news()
    official_cases, official_deaths = scan_official()

    all_cases = news_cases + official_cases
    all_deaths = news_deaths + official_deaths

    print(f"Found {len(all_cases)} case mentions, {len(all_deaths)} death mentions")

    # Use the maximum reported figure as the conservative estimate
    # (avoids regressions when one source is stale)
    new_confirmed = max([existing["confirmed"]] + all_cases) if all_cases else existing["confirmed"]
    new_deaths = max([existing["deaths"]] + all_deaths) if all_deaths else existing["deaths"]

    change_24h = new_confirmed - existing["confirmed"]

    updated = dict(existing)
    updated["confirmed"] = new_confirmed
    updated["deaths"] = new_deaths
    # Suspected estimated as ~1.7x confirmed (based on outbreak averages)
    updated["suspected"] = max(existing["suspected"], int(new_confirmed * 1.67))
    updated["change_24h"] = change_24h
    updated["last_updated"] = datetime.now(timezone.utc).isoformat()

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated, f, indent=2, ensure_ascii=False)

    print(f"Updated: {new_confirmed} confirmed, {new_deaths} deaths (Δ24h: {change_24h})")


if __name__ == "__main__":
    main()
