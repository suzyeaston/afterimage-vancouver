#!/usr/bin/env python3
"""Import a small, attributed *historical* BC + AI community lens.

The upstream Observatory is archived. Pinned revision avoids silently changing
our editorial selections. This dataset is NOT a jobs feed or upcoming calendar.
Only public, non-person event entities are retained. Do not ingest people or
private connections. Upstream records and our modifications are CC BY 4.0.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM_SHA = "732ca559c91105709ebab1ae2ea1fd6c79ff647c"
UPSTREAM_REPO = "https://github.com/WalksWithASwagger/official-observer"
UPSTREAM_JSON = (
    "https://raw.githubusercontent.com/WalksWithASwagger/official-observer/"
    f"{UPSTREAM_SHA}/data/entities.json"
)
# Editorial selection of public, Vancouver-area program and event names.
SELECTED_IDS = (
    "event-futureproof-festival-2026",
    "event-vancouver-ai-meetup",
    "event-bc-ai-film-club",
    "event-ai-happy-hour",
    "event-mac-mind-ai-consciousness",
    "event-ai-in-education-meetup",
    "event-life-sciences-ai-sig",
)


def build_view(entities: list[dict]) -> dict:
    records = {item.get("id"): item for item in entities if isinstance(item, dict) and item.get("type") == "event"}
    entries = []
    for entity_id in SELECTED_IDS:
        item = records.get(entity_id)
        if not item or item.get("region") != "vancouver":
            continue
        entries.append({
            "id": entity_id,
            "name": str(item.get("name", ""))[:140],
            "description": str(item.get("blurb", ""))[:450],
            "initiatives": [i for i in item.get("initiatives", []) if i in ("bc-ai", "ed-ai", "futureproof")],
            "last_upstream_scheduled_date": item.get("nextDate") or None,
            "source_url": f"{UPSTREAM_REPO}/blob/{UPSTREAM_SHA}/data/entities.json",
        })
    if not entries:
        raise ValueError("No permitted Vancouver public event entities found")
    return {
        "title": "BC + AI / COMMUNITY ECHOES",
        "status": "archived_source_not_live_calendar",
        "notice": "Historical community map records only; archived schedule dates may no longer be valid. These are not job openings or confirmed upcoming events.",
        "source": {
            "name": "The Observatory — BC + AI ecosystem map",
            "repo": UPSTREAM_REPO,
            "revision": UPSTREAM_SHA,
            "licence": "CC BY 4.0",
            "licence_url": "https://creativecommons.org/licenses/by/4.0/",
            "changes": "Filtered public Vancouver event entities; excluded all people, private connections and non-Vancouver records; added one independently verified venue marker.",
            "extra_archive": "https://github.com/bc-ai-ecosystem/vancouver-ai",
        },
        "venue": {
            "name": "H.R. MacMillan Space Centre",
            "address": "1100 Chestnut Street, Vancouver",
            "lat": 49.276354,
            "lng": -123.144405,
            "source_url": "https://events.nfb.ca/locations/h-r-macmillan-space-centre/",
            "event_ids": ["event-futureproof-festival-2026", "event-vancouver-ai-meetup"],
        },
        "events": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Use a local JSON entities file (offline tests)")
    parser.add_argument("--output", type=Path, default=ROOT / "data/community.json")
    args = parser.parse_args()
    if args.input:
        entities = json.loads(args.input.read_text(encoding="utf-8"))
    else:
        req = Request(UPSTREAM_JSON, headers={"User-Agent": "Afterimage-Vancouver/0.2 (+https://github.com/suzyeaston/afterimage-vancouver)"})
        with urlopen(req, timeout=20) as response:
            entities = json.load(response)
    if not isinstance(entities, list):
        raise ValueError("Expected upstream entities array")
    result = build_view(entities)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(result['events'])} licensed community echoes to {args.output}")


if __name__ == "__main__":
    main()