#!/usr/bin/env python3
"""Import public organization links from a pinned, CC BY 4.0 Observatory snapshot.

Archive data, not a live claims feed. No people, personal profiles, inferred
relationships, unverified location pins, or hiring statuses are exported.

Use a pinned upstream source by default, or two local JSON inputs for offline
testing. This is intentionally NOT an unattended auto-refresh.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REVISION = "732ca559c91105709ebab1ae2ea1fd6c79ff647c"
UPSTREAM = "https://raw.githubusercontent.com/WalksWithASwagger/official-observer/" + REVISION + "/data/"
BROWSER_BASE = "https://github.com/WalksWithASwagger/official-observer/blob/" + REVISION + "/data/"
ALLOWED_KINDS = {"org", "event", "project", "initiative"}


def build_view(entities: list[dict], relationships: list[dict]) -> dict:
    if not isinstance(entities, list) or not isinstance(relationships, list):
        raise ValueError("Expected entity and relationship arrays")

    by_id = {
        entry.get("id"): entry
        for entry in entities
        if isinstance(entry, dict)
        and entry.get("type") in ALLOWED_KINDS
        and isinstance(entry.get("id"), str)
        and isinstance(entry.get("name"), str)
        and entry["name"].strip()
    }
    organizations = [entry for entry in by_id.values() if entry["type"] == "org"]
    if not organizations:
        raise ValueError("No public organization records in snapshot")

    relationships = [
        entry for entry in relationships
        if isinstance(entry, dict)
        and isinstance(entry.get("source"), str)
        and isinstance(entry.get("target"), str)
        and isinstance(entry.get("type"), str)
        and entry["source"] in by_id
        and entry["target"] in by_id
        and (by_id[entry["source"]]["type"] == "org"
             or by_id[entry["target"]]["type"] == "org")
    ]
    org_ids = {org["id"] for org in organizations}
    out = []
    for org in organizations:
        neighbors = []
        for edge in relationships:
            if edge["source"] != org["id"] and edge["target"] != org["id"]:
                continue
            other_id = edge["target"] if edge["source"] == org["id"] else edge["source"]
            other = by_id[other_id]
            neighbors.append({
                "id": other_id,
                "name": other["name"],
                "kind": other["type"],
                "relation": edge["type"],
                "direction": "outgoing" if edge["source"] == org["id"] else "incoming",
            })
        neighbors.sort(key=lambda x: (x["kind"], x["name"].casefold()))
        links = [
            link for link in org.get("links", [])
            if isinstance(link, dict)
            and isinstance(link.get("url"), str)
            and link["url"].startswith("https://")
        ]
        out.append({
            "id": org["id"],
            "name": org["name"],
            "description": str(org.get("blurb") or ""),
            "region": org.get("region") or "unknown",
            "tags": [tag for tag in org.get("tags", []) if isinstance(tag, str)],
            "initiatives": [tag for tag in org.get("initiatives", []) if isinstance(tag, str)],
            "website": links[0]["url"] if links else None,
            "source_url": BROWSER_BASE + "entities.json",
            "connections": neighbors,
        })
    out.sort(key=lambda x: x["name"].casefold())

    org_links = [
        {
            "source": edge["source"],
            "target": edge["target"],
            "relation": edge["type"],
        }
        for edge in relationships
        if edge["source"] in org_ids and edge["target"] in org_ids
    ]
    org_links.sort(key=lambda x: (x["source"], x["target"], x["relation"]))

    return {
        "title": "AFTERIMAGE / ORG CONSTELLATION",
        "status": "archival_organization_network_not_current_partnership_verification",
        "notice": "Historical public organization links from The Observatory. A connection is not evidence of a current partnership, affiliation, endorsement, job vacancy or event. Organization network positions are conceptual, NOT geographic.",
        "source": {
            "name": "The Observatory — BC + AI ecosystem map",
            "repo": "https://github.com/WalksWithASwagger/official-observer",
            "revision": REVISION,
            "licence": "CC BY 4.0",
            "licence_url": "https://creativecommons.org/licenses/by/4.0/",
            "entities_url": BROWSER_BASE + "entities.json",
            "relationships_url": BROWSER_BASE + "relationships.json",
            "changes": "Selected public organization entities and organization-related relationships; omitted people; rebuilt related names and org-org lines; rendered positions as a non-geographic constellation.",
            "caution": "Original archive is frozen and may not reflect contemporary relationships. No affiliation or endorsement implied.",
        },
        "organizations": out,
        "links": org_links,
    }


def load_json(uri: str) -> list[dict]:
    req = Request(uri, headers={"User-Agent": "Afterimage-Vancouver/0.3 (+https://github.com/suzyeaston/afterimage-vancouver)"})
    with urlopen(req, timeout=20) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entities", type=Path, help="Local pinned entities.json file")
    parser.add_argument("--relationships", type=Path, help="Local pinned relationships.json file")
    parser.add_argument("--output", type=Path, default=ROOT / "data/organizations.json")
    args = parser.parse_args()
    if bool(args.entities) != bool(args.relationships):
        parser.error("Provide both --entities and --relationships, or neither")

    entities = json.loads(args.entities.read_text(encoding="utf-8")) if args.entities else load_json(UPSTREAM + "entities.json")
    edges = json.loads(args.relationships.read_text(encoding="utf-8")) if args.relationships else load_json(UPSTREAM + "relationships.json")
    data = build_view(entities, edges)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['organizations'])} public organizations and {len(data['links'])} org links to {args.output}")
if __name__ == "__main__":
    main()
