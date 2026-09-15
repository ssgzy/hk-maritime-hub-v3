#!/usr/bin/env python3
"""Fetch official CSDI Marine Department / AFCD layers as GeoJSON."""

from __future__ import annotations

import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from manifest import (
    CSDI_LAYERS,
    GEO_DIR,
    WFS_TEMPLATE,
    ensure_dirs,
    load_manifest,
    quantize_coords,
    save_manifest,
    utc_now_iso,
    write_json,
)

try:
    from shapely.geometry import shape, mapping
    from shapely.validation import make_valid

    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

CTX = ssl.create_default_context()


def fetch_url(url: str, timeout: int = 90) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "HK-Maritime-Hub-V4/4.0 (research; contact local)",
            "Accept": "application/json,application/geo+json,*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
        return resp.read()


def simplify_feature(feature: dict[str, Any], tol: float | None) -> dict[str, Any]:
    if not tol or not HAS_SHAPELY or not feature.get("geometry"):
        return feature
    try:
        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        simplified = geom.simplify(tol, preserve_topology=True)
        feature = dict(feature)
        feature["geometry"] = mapping(simplified)
    except Exception as exc:  # noqa: BLE001
        print(f"  warn: simplify failed: {exc}", file=sys.stderr)
    return feature


def process_fc(fc: dict[str, Any], simplify_tol: float | None) -> dict[str, Any]:
    features = []
    for raw in fc.get("features") or []:
        feat = dict(raw)
        feat = simplify_feature(feat, simplify_tol)
        if feat.get("geometry"):
            feat["geometry"] = {
                "type": feat["geometry"]["type"],
                "coordinates": quantize_coords(feat["geometry"]["coordinates"], 7),
            }
        # Drop bulky Esri metadata fields
        props = dict(feat.get("properties") or {})
        for k in list(props.keys()):
            if k.upper().startswith("SHAPE") or k in ("OBJECTID_1",):
                props.pop(k, None)
        feat["properties"] = props
        features.append(feat)
    return {"type": "FeatureCollection", "features": features}


def fetch_layer(meta: dict[str, Any]) -> dict[str, Any]:
    url = WFS_TEMPLATE.format(service_id=meta["service_id"], layer=meta["layer"])
    print(f"→ {meta['id']}: {meta['title_zh']}")
    raw = fetch_url(url)
    fc = json.loads(raw.decode("utf-8"))
    if "features" not in fc:
        raise RuntimeError(f"Unexpected response for {meta['id']}: {str(fc)[:200]}")
    out = process_fc(fc, meta.get("simplify_tol"))
    out_path = GEO_DIR / f"{meta['id']}.geojson"
    write_json(out_path, out, gzip_also=True)
    entry = {
        "id": meta["id"],
        "title_zh": meta["title_zh"],
        "title_en": meta["title_en"],
        "provider": meta["provider"],
        "category": meta["category"],
        "default_on": meta["default_on"],
        "service_id": meta["service_id"],
        "layer": meta["layer"],
        "source_url": url,
        "portal_url": f"https://portal.csdi.gov.hk/geoportal/?datasetId={meta['service_id']}",
        "feature_count": len(out["features"]),
        "bytes": out_path.stat().st_size,
        "fetched_at": utc_now_iso(),
        "path": f"geo/{meta['id']}.geojson",
    }
    print(f"  ✓ {entry['feature_count']} features → {out_path.name} ({entry['bytes']} B)")
    return entry


def main() -> int:
    ensure_dirs()
    manifest = load_manifest()
    layers: dict[str, Any] = dict(manifest.get("layers") or {})
    errors: list[str] = []
    for meta in CSDI_LAYERS:
        try:
            layers[meta["id"]] = fetch_layer(meta)
        except (urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as exc:
            msg = f"{meta['id']}: {exc}"
            errors.append(msg)
            print(f"  ✗ {msg}", file=sys.stderr)
    manifest["layers"] = layers
    save_manifest(manifest)
    print(f"\nManifest → {GEO_DIR.parent / 'manifest.json'} ({len(layers)} layers)")
    if errors:
        print(f"Completed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
