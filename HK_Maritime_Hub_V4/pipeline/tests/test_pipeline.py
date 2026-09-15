"""Unit tests for pipeline helpers."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from manifest import (  # noqa: E402
    CSDI_LAYERS,
    HK_BBOX,
    point_in_bbox,
    quantize_coords,
    round_coord,
)
from build_traffic import ship_category, resample_track, heat_palette  # noqa: E402
from ais_collector import parse_message  # noqa: E402


class ManifestTests(unittest.TestCase):
    def test_layer_count(self):
        self.assertGreaterEqual(len(CSDI_LAYERS), 13)
        ids = {x["id"] for x in CSDI_LAYERS}
        self.assertIn("fairways", ids)
        self.assertIn("srz", ids)

    def test_bbox(self):
        self.assertTrue(point_in_bbox(114.17, 22.3))
        self.assertFalse(point_in_bbox(100.0, 22.3))

    def test_quantize(self):
        self.assertEqual(round_coord(114.123456789, 7), 114.1234568)
        coords = quantize_coords([[114.123456789, 22.123456789]])
        self.assertEqual(coords[0][0], 114.1234568)


class TrafficTests(unittest.TestCase):
    def test_ship_category(self):
        self.assertEqual(ship_category(70), "cargo_tanker")
        self.assertEqual(ship_category(80), "cargo_tanker")
        self.assertEqual(ship_category(60), "passenger")
        self.assertEqual(ship_category(30), "other")
        self.assertEqual(ship_category(None), "other")

    def test_resample(self):
        pts = [
            (1_700_000_000.0, 114.1, 22.3, 5.0, 90.0),
            (1_700_000_030.0, 114.11, 22.31, 5.2, 91.0),
            (1_700_000_090.0, 114.12, 22.32, 5.5, 92.0),
        ]
        out = resample_track(pts)
        self.assertGreaterEqual(len(out), 1)
        self.assertIn("lon", out[0])

    def test_heat_palette(self):
        c0 = heat_palette(0)
        c1 = heat_palette(1)
        self.assertEqual(len(c0), 4)
        self.assertEqual(c0[3], 0)
        self.assertGreater(c1[3], 0)


class AisParseTests(unittest.TestCase):
    def test_position_report(self):
        msg = {
            "MessageType": "PositionReport",
            "MetaData": {"MMSI": 477123456, "latitude": 22.3, "longitude": 114.17},
            "Message": {
                "PositionReport": {
                    "UserID": 477123456,
                    "Longitude": 114.17,
                    "Latitude": 22.3,
                    "Sog": 8.5,
                    "Cog": 120.0,
                    "TrueHeading": 118,
                    "NavigationalStatus": 0,
                }
            },
        }
        parsed = parse_message(msg)
        self.assertIsNotNone(parsed)
        kind, data = parsed
        self.assertEqual(kind, "position")
        self.assertEqual(data["mmsi"], 477123456)
        self.assertAlmostEqual(data["lon"], 114.17)

    def test_outside_bbox_dropped(self):
        msg = {
            "MessageType": "PositionReport",
            "MetaData": {},
            "Message": {
                "PositionReport": {
                    "UserID": 1,
                    "Longitude": 100.0,
                    "Latitude": 22.3,
                    "Sog": 1,
                    "Cog": 1,
                }
            },
        }
        self.assertIsNone(parse_message(msg))

    def test_static(self):
        msg = {
            "MessageType": "ShipStaticData",
            "MetaData": {"MMSI": 477123456, "ShipName": "TEST VESSEL"},
            "Message": {
                "ShipStaticData": {
                    "UserID": 477123456,
                    "Name": "TEST VESSEL",
                    "Type": 70,
                    "Dimension": {"A": 100, "B": 20, "C": 5, "D": 5},
                    "CallSign": "ABCD",
                    "ImoNumber": 123,
                }
            },
        }
        parsed = parse_message(msg)
        self.assertIsNotNone(parsed)
        kind, data = parsed
        self.assertEqual(kind, "static")
        self.assertEqual(data["name"], "TEST VESSEL")


class GeoJsonSmoke(unittest.TestCase):
    def test_fairways_file_if_present(self):
        path = ROOT.parent / "data" / "geo" / "fairways.geojson"
        if not path.exists():
            self.skipTest("fairways not fetched yet")
        fc = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertGreaterEqual(len(fc["features"]), 10)


if __name__ == "__main__":
    unittest.main()
