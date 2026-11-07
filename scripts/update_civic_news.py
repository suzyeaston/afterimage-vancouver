#!/usr/bin/env python3
"""Refresh Vancouver civic coverage headlines from published RSS feeds.

No article-body scraping, personal data, sentiment scores, policy conclusions,
or inferred coordinates. Headline mentions are not evidence of outcomes.
"""
import datetime as dt
import email.utils
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "data/city-news.json"
FEEDS = (
    ("City of Vancouver", "government-news-release",
     "https://vancouver.ca/news-calendar/vancouver-news.rss"),
    ("Global BC", "independent-newsroom", "https://globalnews.ca/bc/feed/"),
)
ISSUE_TERMS = {
    "council": r"\b(council|city hall|mayor|municipal election|civic election)\b",
    "housing": r"\b(housing|rentals?|tenants?|affordable|rezoning|homes|housing targets?)\b",
    "transit": r"\b(transit|translink|skytrain|broadway subway|rapid transit)\b",
    "culture": r"\b(arts?|artists?|cultur(?:e|al)|festival|theatre|music|grant)\b",
    "development": r"\b(rezoning|development plan|development applications?|building permits?|land use)\b",
}
VANCOUVER_CONTEXT = re.compile(r"\b(vancouver|burnaby|richmond|new westminster|broadway|kitsilano|east van|city hall)\b", re.I)
MAX_DAYS = 45
MAX_RECORDS = 40


def issue_tags(headline):
    return [issue for issue, regex in ISSUE_TERMS.items()
            if re.search(regex, headline, re.I)]


def parse_date(raw):
    if not raw:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.date().isoformat()
    except (ValueError, TypeError, IndexError):
        return None


def parse_rss(xml_bytes, publisher, kind, today=None):
    """RSS 2.0 and Atom; only date, title, publisher, URL, issue tag."""
    today = today or dt.datetime.now(dt.timezone.utc).date()
    root = ET.fromstring(xml_bytes)
    entries = root.findall(".//item")
    if not entries:
        entries = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    result = []
    for node in entries[:120]:
        def field(name):
            found = node.find(name)
            if found is None:
                found = node.find("{http://www.w3.org/2005/Atom}" + name)
            return (found.text or "").strip() if found is not None else ""
        title = re.sub(r"\s+", " ", field("title"))[:150]
        if not title:
            continue
        tags = issue_tags(title)
        if not tags:
            continue
        if kind == "independent-newsroom" and not VANCOUVER_CONTEXT.search(title):
            continue
        link = field("link")
        if not link:
            atom_link = node.find("{http://www.w3.org/2005/Atom}link")
            if atom_link is not None:
                link = atom_link.get("href", "")
        parsed = urlparse(link)
        if parsed.scheme != "https" or not parsed.netloc:
            continue
        published = parse_date(field("pubDate") or field("published") or field("updated"))
        if not published:
            continue
        age = (today - dt.date.fromisoformat(published)).days
        if age < 0 or age > MAX_DAYS:
            continue
        result.append({
            "id": "feed-" + str(abs(hash(link))),  # replace with stable hash below
            "title": title,
            "publisher": publisher,
            "publisher_kind": kind,
            "published_on": published,
            "url": link,
            "issue_ids": tags,
            "location_scope": "citywide news subject; NOT a mapped geographic effect",
            "origin": "rss-headline",
        })
    # Built-in hash is randomized per process. Stable ID is mandatory.
    import hashlib
    for record in result:
        record["id"] = "rss-" + hashlib.sha256(record["url"].encode()).hexdigest()[:18]
    return result


def get_rss(url):
    req = urllib.request.Request(url, headers={"User-Agent":
        "AFTERIMAGE-Vancouver/0.5 (+https://github.com/suzyeaston/afterimage-vancouver)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"})
    with urllib.request.urlopen(req, timeout=16) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Feed too large")
        return raw


def refresh():
    today = dt.datetime.now(dt.timezone.utc).date()
    old = json.loads(DEST.read_text(encoding="utf-8")) if DEST.exists() else {"items": []}
    collected, success, errors = [], [], []
    for publisher, kind, url in FEEDS:
        try:
            rows = parse_rss(get_rss(url), publisher, kind, today)
            collected.extend(rows)
            success.append(publisher)
            print(f"Fetched {publisher}: {len(rows)} relevant Vancouver headlines")
        except (ValueError, ET.ParseError, OSError) as exc:
            errors.append(f"{publisher}: {type(exc).__name__}")
            print("WARN: " + errors[-1], file=sys.stderr)
    if not success:
        print("No available sources; retained last published snapshot.", file=sys.stderr)
        return
    # Keep previously checked records for unavailable feeds, and older
    # curated public records while they remain within the rolling window.
    fresh_urls = {x["url"] for x in collected}
    for item in old.get("items", []):
        if not isinstance(item, dict) or item.get("url") in fresh_urls:
            continue
        try:
            day = dt.date.fromisoformat(item["published_on"])
        except (KeyError, ValueError, TypeError):
            continue
        if 0 <= (today-day).days <= MAX_DAYS:
            collected.append(item)
    unique = {x["url"]:x for x in collected if x.get("url","").startswith("https://")}
    items = sorted(unique.values(), key=lambda x:(x["published_on"],x["url"]), reverse=True)[:MAX_RECORDS]
    output = {
        "title": "AFTERIMAGE / LOCAL COVERAGE",
        "observed_at": today.isoformat(),
        "method": "Publisher RSS headlines only; deterministic literal issue tags; no article scraping, inferred geographic impact, political sentiment, causal claims or electoral forecasts.",
        "checked_sources": success,
        "source_errors": errors,
        "items": items,
    }
    DEST.write_text(json.dumps(output, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print(f"Published {len(items)} headline links, sourced from {len(success)} checked feeds.")


if __name__ == "__main__":
    refresh()
