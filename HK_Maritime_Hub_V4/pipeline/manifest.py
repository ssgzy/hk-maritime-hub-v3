"""Shared helpers for CSDI / traffic pipeline."""

from __future__ import annotations

import gzip
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
GEO_DIR = DATA_DIR / "geo"
TRAFFIC_DIR = DATA_DIR / "traffic"
AIS_DIR = DATA_DIR / "ais"
MANIFEST_PATH = DATA_DIR / "manifest.json"

# Hong Kong waters bounding box (WGS84)
HK_BBOX = {
    "west": 113.80,
    "south": 22.15,
    "east": 114.50,
    "north": 22.58,
}

WFS_TEMPLATE = (
    "https://portal.csdi.gov.hk/server/services/common/{service_id}/MapServer/WFSServer"
    "?service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=csdi:{layer}&outputFormat=GeoJSON&srsName=EPSG:4326&count=10000"
)

# Official Marine Department / AFCD layers used by V4
CSDI_LAYERS: list[dict[str, Any]] = [
    {
        "id": "fairways",
        "service_id": "mardep_rcd_1730971895632_84763",
        "layer": "FairywayTSS",
        "title_zh": "航道与分道通航制",
        "title_en": "Traffic Separation Schemes and Principal Fairways",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": True,
        "simplify_tol": None,
    },
    {
        "id": "srz",
        "service_id": "mardep_rcd_1730972516934_759",
        "layer": "SRZ",
        "title_zh": "限速区",
        "title_en": "Speed Restricted Zones",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": True,
        "simplify_tol": None,
    },
    {
        "id": "harbour_limit",
        "service_id": "mardep_rcd_1730972646896_40009",
        "layer": "HarbourLimit",
        "title_zh": "港口界限",
        "title_en": "Harbour Limit",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": True,
        "simplify_tol": None,
    },
    {
        "id": "calling_in",
        "service_id": "mardep_rcd_1730971600539_26240",
        "layer": "CallingInPoint",
        "title_zh": "报告点",
        "title_en": "Calling-in Points",
        "provider": "海事处 Marine Department",
        "category": "navaids",
        "default_on": True,
        "simplify_tol": None,
    },
    {
        "id": "pilot_boarding",
        "service_id": "mardep_rcd_1730971727146_16190",
        "layer": "PilotBoardingStn",
        "title_zh": "引航员登船站",
        "title_en": "Pilot Boarding Stations",
        "provider": "海事处 Marine Department",
        "category": "navaids",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "typhoon_shelter",
        "service_id": "mardep_rcd_1730971403590_9667",
        "layer": "TyphoonShelter",
        "title_zh": "避风塘",
        "title_en": "Typhoon Shelters",
        "provider": "海事处 Marine Department",
        "category": "facilities",
        "default_on": True,
        "simplify_tol": None,
    },
    {
        "id": "hkia_approach",
        "service_id": "mardep_rcd_1730966846483_6820",
        "layer": "HKIAApproachArea",
        "title_zh": "机场进近限制区",
        "title_en": "HKIA Approach Areas",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "bridge_areas",
        "service_id": "mardep_rcd_1671158138988_60545",
        "layer": "BridgeAreas",
        "title_zh": "桥区高度限制",
        "title_en": "Height Restriction (Bridge) Areas",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "private_mooring",
        "service_id": "mardep_rcd_1671157613279_73180",
        "layer": "Private_Mooring_Areas",
        "title_zh": "私人系泊区",
        "title_en": "Private Mooring Areas",
        "provider": "海事处 Marine Department",
        "category": "facilities",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "pcwa_berth",
        "service_id": "mardep_rcd_1638859086572_29125",
        "layer": "PCWA_BerthVacancy",
        "title_zh": "公众货物装卸区泊位",
        "title_en": "PCWA Berth Vacancy",
        "provider": "海事处 Marine Department",
        "category": "facilities",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "bright_light_fishing",
        "service_id": "mardep_rcd_1730952503222_38811",
        "layer": "BrightLightFishing",
        "title_zh": "光诱捕鱼许可区",
        "title_en": "Bright Light Fishing Areas",
        "provider": "海事处 Marine Department",
        "category": "rules",
        "default_on": False,
        "simplify_tol": 0.00015,
    },
    {
        "id": "tide_stations",
        "service_id": "mardep_rcd_1638860616268_1438",
        "layer": "geodatastore",
        "title_zh": "海事处潮汐站",
        "title_en": "MD Tide Stations",
        "provider": "海事处 Marine Department",
        "category": "environment",
        "default_on": False,
        "simplify_tol": None,
    },
    {
        "id": "marine_park",
        "service_id": "afcd_rcd_1635130855075_76661",
        "layer": "MAR_PARK",
        "title_zh": "海岸公园与保护区",
        "title_en": "Marine Parks and Marine Reserve",
        "provider": "渔农自然护理署 AFCD",
        "category": "rules",
        "default_on": False,
        "simplify_tol": None,
    },
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_dirs() -> None:
    for p in (DATA_DIR, GEO_DIR, TRAFFIC_DIR, AIS_DIR):
        p.mkdir(parents=True, exist_ok=True)


def round_coord(value: float, digits: int = 7) -> float:
    return round(float(value), digits)


def quantize_coords(obj: Any, digits: int = 7) -> Any:
    """Recursively round GeoJSON coordinates."""
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round_coord(float(v), digits) for v in obj]
        return [quantize_coords(v, digits) for v in obj]
    return obj


def write_json(path: Path, payload: Any, gzip_also: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    if gzip_also:
        gz_path = path.with_suffix(path.suffix + ".gz")
        with gzip.open(gz_path, "wb") as f:
            f.write(text.encode("utf-8"))


def load_manifest() -> dict[str, Any]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {
        "version": "4.0.0",
        "updated_at": None,
        "layers": {},
        "traffic": {},
        "attribution": [
            "地政总署 Lands Department",
            "海事处 Marine Department",
            "渔农自然护理署 AFCD",
            "CSDI Portal",
            "aisstream.io",
        ],
        "disclaimer": "研究展示用途，不能作为航行或安全决策依据。",
    }


def save_manifest(manifest: dict[str, Any]) -> None:
    manifest["updated_at"] = utc_now_iso()
    write_json(MANIFEST_PATH, manifest, gzip_also=True)


def point_in_bbox(lon: float, lat: float) -> bool:
    return (
        HK_BBOX["west"] <= lon <= HK_BBOX["east"]
        and HK_BBOX["south"] <= lat <= HK_BBOX["north"]
    )


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
