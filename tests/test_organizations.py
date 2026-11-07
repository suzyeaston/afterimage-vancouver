"""Regression tests: public-only archived organization graph is not a hiring signal."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from import_organizations import build_view


class OrganizationNetworkTests(unittest.TestCase):
    def test_import_filters_people_and_keeps_typed_connections(self):
        entities = [
            {"id": "org-a", "type": "org", "name": "Local A", "region": "vancouver",
             "tags": ["arts"], "links": [{"url": "https://example.org"}]},
            {"id": "org-b", "type": "org", "name": "Local B", "region": "provincial"},
            {"id": "event-c", "type": "event", "name": "Historic Gathering"},
            {"id": "person-d", "type": "person", "name": "Private Person", "email": "secret@example.org"},
        ]
        links = [
            {"source": "org-a", "target": "org-b", "type": "partners"},
            {"source": "org-a", "target": "event-c", "type": "hosts"},
            {"source": "org-a", "target": "person-d", "type": "knows"},
        ]
        view = build_view(entities, links)
        self.assertEqual(len(view["organizations"]), 2)
        self.assertEqual(len(view["links"]), 1)
        self.assertEqual(view["organizations"][0]["website"], "https://example.org")
        self.assertEqual(view["organizations"][0]["connections"][0]["kind"], "event")
        self.assertNotIn("Private Person", json.dumps(view))
        self.assertNotIn("secret@example.org", json.dumps(view))
        self.assertIn("not evidence of a current partnership", view["notice"].lower())

    def test_bad_inputs_do_not_produce_empty_network(self):
        with self.assertRaises(ValueError):
            build_view([], [])
        with self.assertRaises(ValueError):
            build_view({}, [])

    def test_snapshot_is_archived_attributed_and_non_geographical(self):
        obj = json.loads((ROOT / "data/organizations.json").read_text(encoding="utf-8"))
        self.assertEqual(obj["status"], "archival_organization_network_not_current_partnership_verification")
        self.assertEqual(len(obj["organizations"]), 20)
        self.assertEqual(len(obj["links"]), 16)
        self.assertEqual(obj["source"]["licence"], "CC BY 4.0")
        ids = {o["id"] for o in obj["organizations"]}
        self.assertEqual(len(ids), 20)
        self.assertTrue(all(o["id"].startswith("org-") for o in obj["organizations"]))
        self.assertTrue(all(l["source"] in ids and l["target"] in ids for l in obj["links"]))
        self.assertTrue(all(o.get("lat") is None and o.get("lng") is None for o in obj["organizations"]))
        self.assertIn("job vacancy", obj["notice"].lower())
        self.assertNotIn('"type": "person"', json.dumps(obj))

    def test_archive_has_a_real_hub(self):
        obj = json.loads((ROOT / "data/organizations.json").read_text(encoding="utf-8"))
        orgs = {o["id"]: o for o in obj["organizations"]}
        hub = orgs["org-bc-ai-ecosystem-association"]
        self.assertGreaterEqual(len(hub["connections"]), 10)
        self.assertIn("vancouver", {o["region"] for o in obj["organizations"]})


if __name__ == "__main__":
    unittest.main()
