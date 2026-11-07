#!/usr/bin/env python3
"""Create an attributed, dated AFTERIMAGE subset of BC AI Compass open data.

Pinned public export only; no profiles/contacts/people, no inferred
relationships, no 'now hiring' claims, and no guessed addresses.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REVISION = "4d0de44c99e482100d9946c6f494093b393cec36"
SOURCE = "https://raw.githubusercontent.com/MartinMontero/BCAICompass/" + REVISION + "/public/ecosystem.json"
REGIONS = {"Metro Vancouver", "Province-wide"}
CROSSWALK = [
    {"observer_id": "org-bc-ai-ecosystem-association", "compass_id": "compass-bc-ai-ecosystem-association"},
    {"observer_id": "org-eth-s-lab", "compass_id": "compass-ethos-lab"},
    {"observer_id": "org-innovate-bc", "compass_id": "compass-innovate-bc"},
    {"observer_id": "org-ubc", "compass_id": "compass-ubc"},
]
BC_BOX = (-140, -113, 48, 60)


def build_view(dataset: dict) -> dict:
    if not isinstance(dataset, dict) or not isinstance(dataset.get("organizations"), list):
        raise ValueError("Expected BC AI Compass public ecosystem export")
    records = []
    seen = set()
    for org in dataset["organizations"]:
        if not isinstance(org, dict) or org.get("status") != "verified" or org.get("region") not in REGIONS:
            continue
        ident = org.get("id")
        source = org.get("sourceUrl")
        source_date = org.get("sourceDate")
        if (not isinstance(ident, str) or not ident
                or ident in seen or not isinstance(org.get("name"), str)
                or not isinstance(source, str) or not source.startswith("https://")
                or not isinstance(source_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", source_date)):
            raise ValueError(f"Invalid or duplicate verified organization: {ident!r}")
        seen.add(ident)
        lat, lng = org.get("lat"), org.get("lng")
        if lat is not None or lng is not None:
            if (not isinstance(lat, (int, float)) or isinstance(lat, bool)
                    or not isinstance(lng, (int, float)) or isinstance(lng, bool)
                    or not BC_BOX[0] <= lng <= BC_BOX[1]
                    or not BC_BOX[2] <= lat <= BC_BOX[3]
                    or not isinstance(org.get("geoSourceUrl"), str)
                    or not org["geoSourceUrl"].startswith("https://")):
                raise ValueError(f"Unsourced location for {ident}")
        website = org.get("url")
        if website is not None and (not isinstance(website, str) or not website.startswith("https://")):
            website = None
        records.append({
            "id": "compass-" + ident,
            "name": org["name"],
            "category": org["category"],
            "org_type": org.get("orgType"),
            "region": org["region"],
            "location": org.get("location"),
            "description": org.get("description"),
            "website": website,
            "source_url": source,
            "source_date": source_date,
            "verified_label": org.get("verified"),
            "quote_pending": "quote-pending" in (org.get("flags") or []),
            "lat": lat,
            "lng": lng,
            "geo_precision": org.get("geoPrecision"),
            "geo_source_url": org.get("geoSourceUrl"),
            "compass_id": ident,
        })
    if not records:
        raise ValueError("No verified BC AI Compass organizations in target regions")
    records.sort(key=lambda x: x["name"].casefold())
    return {
        "title": "AFTERIMAGE / COMPASS SIGNALS",
        "status": "licensed_historical_verification_snapshot_not_live_hiring",
        "notice": "BC AI Compass originally verified these organization sources on their stated source dates. This is a dated subset, not a current job feed or partnership assertion. Geographic markers are source-stated locations or municipal centroids; most are NOT office locations.",
        "source": {
            "name": "BC AI Compass by Martin Montero",
            "site": "https://bc-aicompass.ca",
            "repo": "https://github.com/MartinMontero/BCAICompass",
            "dataset_path": "public/ecosystem.json",
            "revision": REVISION,
            "generated": dataset["generated"],
            "licence": "CC BY 4.0",
            "licence_url": "https://creativecommons.org/licenses/by/4.0/",
            "attribution": "BC AI Compass (bc-aicompass.ca), dataset by Martin Montero, CC BY 4.0",
            "changes": "Filtered to Metro Vancouver and Province-wide verified organizations, removed people and contact fields; kept source URLs/dates/coordinates/precision; grouped identical points rather than inventing office locations. Added a four-record editorial ID/name crosswalk to matching Observatory archive entries (same-entity references, NOT partnership claims).",
            "affiliate_notice": "AFTERIMAGE is independently made; this import does not claim BC AI Compass or listed organizations endorse AFTERIMAGE.",
        },
        "crosswalk": [link for link in CROSSWALK if link["compass_id"] in {"compass-" + ident for ident in seen}],
        "count": len(records),
        "regions": ["Metro Vancouver", "Province-wide"],
        "categories": dataset["categories"],
        "organizations": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Use a local pinned ecosystem.json for an offline import")
    parser.add_argument("--output", type=Path, default=ROOT / "data/compass.json")
    args = parser.parse_args()
    if args.input:
        source = json.loads(args.input.read_text(encoding="utf-8"))
    else:
        req = Request(SOURCE, headers={"User-Agent": "Afterimage-Vancouver/0.4 (+https://github.com/suzyeaston/afterimage-vancouver)"})
        with urlopen(req, timeout=30) as response:
            source = json.load(response)
    result = build_view(source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(result['organizations'])} source-checked archived organizations ({result['source']['generated']}) to {args.output}")


if __name__ == "__main__":
    main()
