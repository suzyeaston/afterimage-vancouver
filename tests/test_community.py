"""Regressions for the historical, opt-in community layer."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from import_observatory import build_view


class CommunityImportTests(unittest.TestCase):
    def test_exports_only_selected_public_nonperson_vancouver_events(self):
        source = [
            {"id": "event-vancouver-ai-meetup", "type": "event", "region": "vancouver", "name": "Vancouver AI Meetup", "blurb": "Historical record", "initiatives": ["bc-ai"], "nextDate": "2026-07-29"},
            {"id": "person-x", "type": "person", "region": "vancouver", "name": "Private Person", "blurb": "Private details"},
            {"id": "event-fraser-valley-ai", "type": "event", "region": "fraser-valley", "name": "Other Region", "blurb": "Not Vancouver"},
        ]
        view = build_view(source)
        self.assertEqual([e["name"] for e in view["events"]], ["Vancouver AI Meetup"])
        self.assertEqual(view["status"], "archived_source_not_live_calendar")
        self.assertEqual(view["source"]["licence"], "CC BY 4.0")
        self.assertNotIn("Private", json.dumps(view))
        self.assertEqual(view["venue"]["lat"], 49.276354)

    def test_raises_on_unrelated_or_invalid_source(self):
        with self.assertRaises(ValueError):
            build_view([{"id": "person-x", "type": "person", "region": "vancouver"}])

    def test_committed_snapshot_is_archived_and_cited(self):
        snap = json.loads((ROOT / "data/community.json").read_text(encoding="utf-8"))
        self.assertEqual(snap["status"], "archived_source_not_live_calendar")
        self.assertEqual(len(snap["events"]), 7)
        self.assertEqual(len(set(x["id"] for x in snap["events"])), 7)
        self.assertIn("CC BY", snap["source"]["licence"])
        self.assertIn("not", snap["notice"].lower())


if __name__ == "__main__":
    unittest.main()