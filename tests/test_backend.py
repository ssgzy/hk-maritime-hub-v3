"""Standard-library tests. No successful external connection is assumed."""
from pathlib import Path
import importlib.util
import json
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hub_server', ROOT / 'server.py')
srv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)

class RegistryTests(unittest.TestCase):
    def test_counts(self):
        self.assertEqual(len(srv.FEEDS), 19)
        cat = json.loads((ROOT / 'catalog.json').read_text())
        orig = json.loads((ROOT / 'catalog_original.json').read_text())
        self.assertEqual(len(cat), 40)
        self.assertEqual({r['id']:r['urls'] for r in cat}, {r['id']:r['urls'] for r in orig})

    def test_public_whitelist(self):
        self.assertTrue(srv.endpoint('wind', {}).startswith('https://data.weather.gov.hk/'))
        self.assertIn('RP04005.XML', srv.endpoint('vtms_due', {}))
        self.assertIn('latitude=22.1', srv.endpoint('marine', {}))

    def test_no_arbitrary_proxy(self):
        for url in ['http://data.weather.gov.hk/', 'https://evil.example/', 'https://user:pass@data.weather.gov.hk/',
                    'https://127.0.0.1/', 'https://data.weather.gov.hk:444/']:
            with self.subTest(url=url), self.assertRaises(ValueError): srv.safe_url(url)
        with self.assertRaises(ValueError): srv.endpoint('wind', {'url':['https://evil.example']})
        with self.assertRaises(ValueError): srv.endpoint('unknown', {})

    def test_bad_marine_coordinates(self):
        for params in [{'lat':['nan']}, {'lat':['90']}, {'lon':['-1']}, {'lat':['22','23']}]:
            with self.subTest(params=params), self.assertRaises(ValueError): srv.endpoint('marine', params)

    def test_hhot_validation(self):
        with self.assertRaises(ValueError): srv.endpoint('hhot', {'date':['2026-02-31']})
        with self.assertRaises(ValueError): srv.endpoint('hhot', {'station':['INVALID']})
        self.assertIn('station=QUB', srv.endpoint('hhot', {'date':['2026-09-13']}))

    def test_docs_cover_every_original_url(self):
        text=(ROOT/'HK_Maritime_Websites_and_Data_Integration.md').read_text()
        for r in json.loads((ROOT/'catalog_original.json').read_text()):
            self.assertIn(r['id'],text)
            for u in r['urls']:self.assertIn(u,text)

if __name__=='__main__': unittest.main(verbosity=2)
