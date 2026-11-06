import datetime as dt
import importlib.util
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog', ROOT / 'scripts/build_catalog.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CatalogTests(unittest.TestCase):
    def test_build_and_schema(self):
        result = module.build()
        self.assertGreater(len(result['employers']), 5)
        self.assertGreater(len(result['jobs']), 5)
        conn = sqlite3.connect(ROOT / 'build/afterimage.db')
        self.assertEqual(conn.execute('SELECT count(*) FROM employers').fetchone()[0], len(result['employers']))
        self.assertEqual(conn.execute('PRAGMA foreign_key_check').fetchall(), [])
        conn.close()

    def test_observation_expiry(self):
        today = module.TODAY
        stale = {'observed_at': (today - dt.timedelta(days=15)).isoformat(), 'type': 'full-time'}
        self.assertEqual(module.status_for(stale), 'needs-review')
        fresh = {'observed_at': today.isoformat(), 'type': 'expression-of-interest'}
        self.assertEqual(module.status_for(fresh), 'interest-only')

    def test_bad_locations_rejected(self):
        with self.assertRaises(ValueError):
            module.validate_targets([{'id':'bad','lat':0,'lng':0}])


if __name__ == '__main__':
    unittest.main()
