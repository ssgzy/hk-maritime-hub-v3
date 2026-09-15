#!/usr/bin/env python3
"""Build 24h track replay JSON, 7d density PNGs, and traffic stats from AIS SQLite."""

from __future__ import annotations

import json
import math
import sqlite3
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from manifest import (
    AIS_DIR,
    GEO_DIR,
    HK_BBOX,
    TRAFFIC_DIR,
    ensure_dirs,
    load_manifest,
    save_manifest,
    utc_now_iso,
    write_json,
)

try:
    import numpy as np
    from PIL import Image
except ImportError:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1)

try:
    from shapely.geometry import Point, shape
    from shapely.strtree import STRtree

    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

DB_PATH = AIS_DIR / "ais.sqlite"
RESAMPLE_SEC = 60
MIN_MOVE_M = 80
MIN_POINTS = 3
DENSITY_COLS = 400
DENSITY_ROWS = 280


def ship_category(ship_type: int | None) -> str:
    if ship_type is None:
        return "other"
    t = int(ship_type)
    if 70 <= t <= 79 or 80 <= t <= 89:
        return "cargo_tanker"
    if 60 <= t <= 69:
        return "passenger"
    if 40 <= t <= 49:
        return "hsc"
    return "other"


def ship_length(v: dict[str, Any] | None) -> float | None:
    if not v:
        return None
    a, b = v.get("to_bow"), v.get("to_stern")
    if a is None or b is None:
        return None
    return float(a) + float(b)


def load_vessels(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for row in conn.execute(
        "SELECT mmsi,name,ship_type,to_bow,to_stern,to_port,to_starboard,callsign,imo FROM vessels"
    ):
        out[int(row[0])] = {
            "mmsi": int(row[0]),
            "name": row[1],
            "ship_type": row[2],
            "to_bow": row[3],
            "to_stern": row[4],
            "to_port": row[5],
            "to_starboard": row[6],
            "callsign": row[7],
            "imo": row[8],
        }
    return out


def load_positions(conn: sqlite3.Connection, since_ts: float) -> list[tuple]:
    return list(
        conn.execute(
            "SELECT mmsi,ts,lon,lat,sog,cog FROM positions WHERE ts >= ? ORDER BY mmsi, ts",
            (since_ts,),
        )
    )


def resample_track(points: list[tuple]) -> list[dict[str, Any]]:
    """points: (ts, lon, lat, sog, cog)"""
    if not points:
        return []
    out: list[dict[str, Any]] = []
    bucket: dict[int, tuple] = {}
    for ts, lon, lat, sog, cog in points:
        b = int(ts // RESAMPLE_SEC)
        bucket[b] = (ts, lon, lat, sog, cog)
    for b in sorted(bucket):
        ts, lon, lat, sog, cog = bucket[b]
        out.append(
            {
                "t": int(ts),
                "lon": round(float(lon), 5),
                "lat": round(float(lat), 5),
                "sog": None if sog is None else round(float(sog), 1),
                "cog": None if cog is None else round(float(cog), 1),
            }
        )
    return out


def track_length_m(samples: list[dict[str, Any]]) -> float:
    total = 0.0
    for i in range(1, len(samples)):
        a, b = samples[i - 1], samples[i]
        # approximate metres at HK latitude
        dlat = (b["lat"] - a["lat"]) * 111_320
        dlon = (b["lon"] - a["lon"]) * 111_320 * math.cos(math.radians(a["lat"]))
        total += math.hypot(dlat, dlon)
    return total


def heat_palette(t: float) -> tuple[int, int, int, int]:
    """t in 0..1 → RGBA heat colour."""
    t = max(0.0, min(1.0, t))
    # blue → cyan → yellow → red
    stops = [
        (0.0, (12, 40, 90, 0)),
        (0.15, (20, 90, 200, 90)),
        (0.4, (0, 200, 180, 140)),
        (0.65, (255, 220, 40, 180)),
        (0.85, (255, 120, 20, 210)),
        (1.0, (220, 20, 40, 230)),
    ]
    for i in range(1, len(stops)):
        t0, c0 = stops[i - 1]
        t1, c1 = stops[i]
        if t <= t1:
            u = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(int(c0[j] + (c1[j] - c0[j]) * u) for j in range(4))  # type: ignore[return-value]
    return stops[-1][1]


def build_density(
    points: list[tuple[float, float]],
    path: Path,
) -> dict[str, Any]:
    west, south = HK_BBOX["west"], HK_BBOX["south"]
    east, north = HK_BBOX["east"], HK_BBOX["north"]
    grid = np.zeros((DENSITY_ROWS, DENSITY_COLS), dtype=np.float32)
    if not points:
        Image.fromarray(np.zeros((DENSITY_ROWS, DENSITY_COLS, 4), dtype=np.uint8), "RGBA").save(path)
        return {"path": str(path.relative_to(path.parents[1])), "max": 0, "count": 0}

    for lon, lat in points:
        if not (west <= lon <= east and south <= lat <= north):
            continue
        x = int((lon - west) / (east - west) * (DENSITY_COLS - 1))
        y = int((north - lat) / (north - south) * (DENSITY_ROWS - 1))
        if 0 <= x < DENSITY_COLS and 0 <= y < DENSITY_ROWS:
            grid[y, x] += 1.0

    mx = float(grid.max()) if grid.max() > 0 else 1.0
    logg = np.log1p(grid)
    log_max = float(logg.max()) or 1.0
    rgba = np.zeros((DENSITY_ROWS, DENSITY_COLS, 4), dtype=np.uint8)
    for y in range(DENSITY_ROWS):
        for x in range(DENSITY_COLS):
            v = float(logg[y, x])
            if v <= 0:
                continue
            rgba[y, x] = heat_palette(v / log_max)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
    return {
        "path": f"traffic/{path.name}",
        "max": mx,
        "count": int(grid.sum()),
        "bbox": [west, south, east, north],
        "size": [DENSITY_COLS, DENSITY_ROWS],
    }


def load_fairway_index() -> list[tuple[Any, str]]:
    path = GEO_DIR / "fairways.geojson"
    if not HAS_SHAPELY or not path.exists():
        return []
    fc = json.loads(path.read_text(encoding="utf-8"))
    items = []
    for f in fc.get("features") or []:
        name = (f.get("properties") or {}).get("OBJNAM") or "unknown"
        try:
            geom = shape(f["geometry"])
            if not geom.is_empty:
                items.append((geom, name))
        except Exception:  # noqa: BLE001
            continue
    return items


def load_srz_polys() -> list[tuple[Any, str, float | None]]:
    path = GEO_DIR / "srz.geojson"
    if not HAS_SHAPELY or not path.exists():
        return []
    fc = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for f in fc.get("features") or []:
        props = f.get("properties") or {}
        name = props.get("OBJNAM") or ""
        inform = (props.get("INFORM") or "").lower()
        limit = None
        if "5 knots" in inform or "5 节" in inform:
            limit = 5.0
        elif "15 knots" in inform:
            limit = 15.0
        try:
            geom = shape(f["geometry"])
            out.append((geom, name, limit))
        except Exception:  # noqa: BLE001
            continue
    return out


def main() -> int:
    ensure_dirs()
    if not DB_PATH.exists():
        print(f"No AIS database at {DB_PATH}. Start ais_collector.py first.", file=sys.stderr)
        # Still write empty placeholders so the UI can load
        empty_tracks = {
            "generated_at": utc_now_iso(),
            "window_start": None,
            "window_end": None,
            "vessel_count": 0,
            "tracks": [],
            "moored": [],
            "note": "尚无 AIS 采集数据",
        }
        write_json(TRAFFIC_DIR / "tracks_24h.json", empty_tracks)
        for name in ("density_7d_all", "density_7d_cargo_tanker", "density_7d_passenger", "density_7d_other"):
            build_density([], TRAFFIC_DIR / f"{name}.png")
        write_json(
            TRAFFIC_DIR / "stats.json",
            {
                "generated_at": utc_now_iso(),
                "unique_24h": 0,
                "unique_7d": 0,
                "by_type_24h": {},
                "fairway_top": [],
                "hourly_24h": [0] * 24,
                "srz_speeding_ratio": None,
                "note": "尚无 AIS 采集数据",
            },
        )
        return 0

    conn = sqlite3.connect(DB_PATH)
    now = time.time()
    since_24h = now - 86400
    since_7d = now - 7 * 86400
    vessels = load_vessels(conn)
    rows_24 = load_positions(conn, since_24h)
    rows_7 = load_positions(conn, since_7d)

    by_mmsi: dict[int, list[tuple]] = defaultdict(list)
    for mmsi, ts, lon, lat, sog, cog in rows_24:
        by_mmsi[int(mmsi)].append((float(ts), float(lon), float(lat), sog, cog))

    tracks = []
    moored = []
    type_counts: dict[str, int] = defaultdict(int)
    hourly = [0] * 24
    unique_24 = set()
    density_pts: dict[str, list[tuple[float, float]]] = {
        "all": [],
        "cargo_tanker": [],
        "passenger": [],
        "other": [],
    }

    fairways = load_fairway_index()
    fairway_hits: dict[str, set[int]] = defaultdict(set)
    srz_list = load_srz_polys()
    srz_samples = 0
    srz_speed = 0

    for mmsi, pts in by_mmsi.items():
        unique_24.add(mmsi)
        vinfo = vessels.get(mmsi)
        cat = ship_category(vinfo.get("ship_type") if vinfo else None)
        type_counts[cat] += 1
        samples = resample_track(pts)
        if not samples:
            continue
        for s in samples:
            hour = datetime.fromtimestamp(s["t"], tz=timezone.utc).hour
            hourly[hour] += 1
        length_m = track_length_m(samples)
        meta = {
            "mmsi": mmsi,
            "name": (vinfo or {}).get("name"),
            "ship_type": (vinfo or {}).get("ship_type"),
            "category": cat,
            "length_m": ship_length(vinfo),
            "points": samples,
        }
        if length_m < MIN_MOVE_M or len(samples) < MIN_POINTS:
            last = samples[-1]
            moored.append(
                {
                    "mmsi": mmsi,
                    "name": meta["name"],
                    "category": cat,
                    "lon": last["lon"],
                    "lat": last["lat"],
                }
            )
        else:
            tracks.append(meta)

        # fairway membership on last moving point
        if HAS_SHAPELY and fairways and samples:
            p = Point(samples[-1]["lon"], samples[-1]["lat"])
            for geom, name in fairways:
                if geom.contains(p):
                    fairway_hits[name].add(mmsi)
                    break

        # SRZ speeding observation (AIS SOG vs published limit where known)
        if HAS_SHAPELY and srz_list:
            for s in samples:
                if s["sog"] is None:
                    continue
                p = Point(s["lon"], s["lat"])
                for geom, _name, limit in srz_list:
                    if limit is None:
                        continue
                    if geom.contains(p):
                        srz_samples += 1
                        if s["sog"] > limit + 0.5:
                            srz_speed += 1
                        break

    # 7d density points
    unique_7: set[int] = set()
    for mmsi, ts, lon, lat, sog, cog in rows_7:
        unique_7.add(int(mmsi))
        vinfo = vessels.get(int(mmsi))
        cat = ship_category(vinfo.get("ship_type") if vinfo else None)
        density_pts["all"].append((float(lon), float(lat)))
        if cat == "cargo_tanker":
            density_pts["cargo_tanker"].append((float(lon), float(lat)))
        elif cat == "passenger":
            density_pts["passenger"].append((float(lon), float(lat)))
        else:
            density_pts["other"].append((float(lon), float(lat)))

    # Cap track count for browser performance (keep longest movers)
    tracks.sort(key=lambda t: len(t["points"]), reverse=True)
    tracks = tracks[:400]

    window_start = datetime.fromtimestamp(since_24h, tz=timezone.utc).replace(microsecond=0).isoformat()
    window_end = datetime.fromtimestamp(now, tz=timezone.utc).replace(microsecond=0).isoformat()

    tracks_payload = {
        "generated_at": utc_now_iso(),
        "window_start": window_start,
        "window_end": window_end,
        "vessel_count": len(tracks),
        "moored_count": len(moored),
        "tracks": tracks,
        "moored": moored[:800],
    }
    write_json(TRAFFIC_DIR / "tracks_24h.json", tracks_payload)

    density_meta = {}
    for key, pts in density_pts.items():
        # downsample points for speed if huge
        if len(pts) > 400_000:
            step = len(pts) // 400_000
            pts = pts[::step]
        meta = build_density(pts, TRAFFIC_DIR / f"density_7d_{key}.png")
        density_meta[key] = meta

    fairway_top = sorted(
        [{"name": n, "vessels": len(s)} for n, s in fairway_hits.items()],
        key=lambda x: x["vessels"],
        reverse=True,
    )[:12]

    stats = {
        "generated_at": utc_now_iso(),
        "window_start": window_start,
        "window_end": window_end,
        "unique_24h": len(unique_24),
        "unique_7d": len(unique_7),
        "by_type_24h": dict(type_counts),
        "fairway_top": fairway_top,
        "hourly_24h": hourly,
        "moving_tracks": len(tracks),
        "moored": len(moored),
        "srz_speeding_ratio": (round(srz_speed / srz_samples, 4) if srz_samples else None),
        "srz_samples": srz_samples,
        "srz_note": "AIS 观测值，非执法数据",
        "density": density_meta,
    }
    write_json(TRAFFIC_DIR / "stats.json", stats)

    # gzip density pngs lightly optional — skip PNG gzip (binary already compressed)
    manifest = load_manifest()
    manifest["traffic"] = {
        "tracks_path": "traffic/tracks_24h.json",
        "stats_path": "traffic/stats.json",
        "density": density_meta,
        "generated_at": utc_now_iso(),
        "window_start": window_start,
        "window_end": window_end,
        "unique_24h": len(unique_24),
        "unique_7d": len(unique_7),
        "db_path": "ais/ais.sqlite",
    }
    save_manifest(manifest)

    print(
        f"tracks={len(tracks)} moored={len(moored)} unique24={len(unique_24)} unique7={len(unique_7)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
