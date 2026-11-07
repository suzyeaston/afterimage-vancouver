"""CITY FUTURES: traceable civic issues and conservative RSS parsing."""
import datetime as dt
import json
import pathlib
import sys
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from update_civic_news import issue_tags,parse_rss

class CityFuturesTests(unittest.TestCase):
    def test_civic_contract_has_sources_and_no_guessed_policy_footprints(self):
        d=json.loads((ROOT/"data/civic.json").read_text(encoding="utf-8"))
        issues={i["id"]:i for i in d["issues"]}
        contacts={c["id"]:c for c in d["contacts"]}
        self.assertEqual(len(issues),5)
        self.assertEqual(len(contacts),5)
        self.assertGreaterEqual(len(d["milestones"]),6)
        self.assertTrue(all(i["source_url"].startswith("https://") for i in issues.values()))
        self.assertTrue(all(i["scenario"].startswith("IF ") for i in issues.values()))
        self.assertTrue(all(m["status"] for m in d["milestones"]))
        self.assertTrue(all(m["source_url"].startswith("https://") for m in d["milestones"]))
        for point in d["map_points"]:
            self.assertEqual(point["precision"],"approximate civic landmark")
            self.assertIn("NOT",point["role"])
            self.assertTrue(point["source_url"].startswith("https://"))
            self.assertTrue(all(i in issues for i in point["issue_ids"]))
        self.assertTrue(all(c["url"].startswith("https://") for c in contacts.values()))
        self.assertNotIn("probability",json.dumps(d).lower())
        self.assertNotIn("endorsement",json.dumps(issues).lower())

    def test_rss_headline_labels_do_not_infer_political_or_geographic_outcomes(self):
        xml=b'''<rss><channel>
         <item><title>Vancouver council debates housing plan</title>
           <link>https://news.example.org/a</link>
           <pubDate>Fri, 06 Nov 2026 12:00:00 +0000</pubDate></item>
         <item><title>Kelowna highway work</title>
           <link>https://news.example.org/b</link>
           <pubDate>Fri, 06 Nov 2026 12:00:00 +0000</pubDate></item>
         <item><title>Vancouver transit opens</title>
           <link>javascript:alert(1)</link>
           <pubDate>Fri, 06 Nov 2026 12:00:00 +0000</pubDate></item>
        </channel></rss>'''
        found=parse_rss(xml,"Test local newsroom","independent-newsroom",dt.date(2026,11,6))
        self.assertEqual(len(found),1)
        self.assertEqual(found[0]["issue_ids"],["council","housing"])
        self.assertEqual(found[0]["title"],"Vancouver council debates housing plan")
        self.assertEqual(found[0]["origin"],"rss-headline")
        self.assertEqual(found[0]["location_scope"],"citywide news subject; NOT a mapped geographic effect")
        self.assertNotIn("sentiment",json.dumps(found).lower())

    def test_news_initial_items_are_publisher_linkbacks_not_articles(self):
        d=json.loads((ROOT/"data/city-news.json").read_text(encoding="utf-8"))
        self.assertTrue(all(n["url"].startswith("https://") for n in d["items"]))
        self.assertTrue(all(n["publisher_kind"] for n in d["items"]))
        self.assertTrue(all("body" not in n and "content" not in n for n in d["items"]))
        self.assertTrue(issue_tags("New housing projects for Vancouver"))
if __name__=="__main__":
    unittest.main()
