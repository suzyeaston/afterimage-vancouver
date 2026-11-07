"""BC AI Compass dated dataset and no-leak contract."""
import json
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from import_compass import build_view


class CompassTests(unittest.TestCase):
    def test_small_sample_filters_people_and_keeps_evidence(self):
        src={
            "generated":"2026-08-20",
            "categories":["Companies & Applied AI"],
            "organizations":[
                {"id":"aa","name":"Example Lab","status":"verified","region":"Metro Vancouver",
                 "category":"Companies & Applied AI","orgType":"company","location":"Vancouver",
                 "description":"Supported description","sourceUrl":"https://example.org/verified",
                 "sourceDate":"2026-08-19","verified":"2026-08","url":"https://example.org",
                 "lat":49.25,"lng":-123.1,"geoSourceUrl":"https://www.openstreetmap.org",
                 "geoPrecision":"centroid","keyPeople":[{"name":"should-not-ship"}]},
                {"id":"bb","name":"Unverified","status":"draft","region":"Metro Vancouver"},
                {"id":"cc","name":"Outside BC target area","status":"verified","region":"Kootenay"},
            ],
        }
        result=build_view(src)
        self.assertEqual(len(result["organizations"]),1)
        item=result["organizations"][0]
        self.assertEqual(item["source_url"],"https://example.org/verified")
        self.assertEqual(item["source_date"],"2026-08-19")
        self.assertEqual(item["geo_precision"],"centroid")
        self.assertNotIn("keyPeople",json.dumps(result))
        self.assertNotIn("should-not-ship",json.dumps(result))
        self.assertNotIn("Unverified",json.dumps(result))
        self.assertEqual(result["source"]["licence"],"CC BY 4.0")

    def test_rejects_invalid_or_unsourced_coordinates(self):
        bad={"generated":"2026-08-20","categories":["Companies & Applied AI"],"organizations":[
            {"id":"bad","name":"Bad pin","status":"verified","region":"Metro Vancouver",
             "sourceUrl":"https://example.org","sourceDate":"2026-08-19",
             "category":"Companies & Applied AI","lat":49.3,"lng":-123.1}
        ]}
        with self.assertRaises(ValueError):build_view(bad)

    def test_committed_snapshot_is_dated_and_region_scoped(self):
        data=json.loads((ROOT/"data/compass.json").read_text(encoding="utf-8"))
        self.assertEqual(data["source"]["generated"],"2026-08-20")
        self.assertEqual(data["source"]["licence"],"CC BY 4.0")
        self.assertEqual(data["source"]["revision"],"4d0de44c99e482100d9946c6f494093b393cec36")
        self.assertEqual(len(data["organizations"]),99)
        self.assertEqual(len([o for o in data["organizations"] if o["region"]=="Metro Vancouver"]),90)
        self.assertEqual(len([o for o in data["organizations"] if o["region"]=="Province-wide"]),9)
        self.assertEqual(len({o["id"] for o in data["organizations"]}),99)
        self.assertEqual(len(data["crosswalk"]),4)
        valid_ids={o["id"] for o in data["organizations"]}
        self.assertTrue(all(x["compass_id"] in valid_ids for x in data["crosswalk"]))
        self.assertTrue(all(x["observer_id"].startswith("org-") for x in data["crosswalk"]))
        self.assertEqual(len({(o["lat"],o["lng"]) for o in data["organizations"] if o["lat"] is not None}),6)
        self.assertNotIn("keyPeople",json.dumps(data))
        self.assertNotIn("people",data)
        self.assertTrue(all(o["source_url"].startswith("https://") and o["source_date"] for o in data["organizations"]))
        self.assertTrue(all(not o["lat"] or o["geo_source_url"] for o in data["organizations"]))
        self.assertIn("not a current job feed",data["notice"])


if __name__=="__main__":
    unittest.main()
