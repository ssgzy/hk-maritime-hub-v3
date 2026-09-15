#!/usr/bin/env python3
"""24/7 AIS collector for Hong Kong waters via aisstream.io WebSocket."""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from manifest import AIS_DIR, HK_BBOX, ensure_dirs, point_in_bbox, utc_now_iso

try:
    import websockets
except ImportError:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1)

WS_URL = "wss://stream.aisstream.io/v0/stream"
DB_PATH = AIS_DIR / "ais.sqlite"
RETENTION_DAYS = 14
BATCH_SIZE = 80
FLUSH_SECONDS = 2.0

# Southwest / Northeast corners for aisstream BoundingBoxes [[lat,lon],[lat,lon]]
HK_BOX = [
    [HK_BBOX["south"], HK_BBOX["west"]],
    [HK_BBOX["north"], HK_BBOX["east"]],
]

FILTER_TYPES = [
    "PositionReport",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
    "ShipStaticData",
]


def load_api_key() -> str:
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("AISSTREAM_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("AISSTREAM_API_KEY", "").strip()
    if not key:
        raise SystemExit("Missing AISSTREAM_API_KEY in pipeline/.env")
    return key


def connect_db() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mmsi INTEGER NOT NULL,
            ts REAL NOT NULL,
            lon REAL NOT NULL,
            lat REAL NOT NULL,
            sog REAL,
            cog REAL,
            heading REAL,
            nav_status INTEGER,
            msg_type TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_pos_ts ON positions(ts);
        CREATE INDEX IF NOT EXISTS idx_pos_mmsi_ts ON positions(mmsi, ts);

        CREATE TABLE IF NOT EXISTS vessels (
            mmsi INTEGER PRIMARY KEY,
            name TEXT,
            ship_type INTEGER,
            to_bow INTEGER,
            to_stern INTEGER,
            to_port INTEGER,
            to_starboard INTEGER,
            callsign TEXT,
            imo INTEGER,
            updated_at REAL
        );

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        """
    )
    return conn


def cleanup_old(conn: sqlite3.Connection) -> int:
    cutoff = time.time() - RETENTION_DAYS * 86400
    cur = conn.execute("DELETE FROM positions WHERE ts < ?", (cutoff,))
    conn.commit()
    return cur.rowcount


def set_meta(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    conn.commit()


def parse_message(msg: dict) -> tuple[str, dict] | None:
    mtype = msg.get("MessageType") or msg.get("MessageTypeName")
    meta = msg.get("MetaData") or {}
    payload = (msg.get("Message") or {}).get(mtype) or {}
    mmsi = meta.get("MMSI") or payload.get("UserID") or payload.get("UserId")
    if not mmsi:
        return None
    mmsi = int(mmsi)

    if mtype in (
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
    ):
        lon = payload.get("Longitude", meta.get("longitude", meta.get("Longitude")))
        lat = payload.get("Latitude", meta.get("latitude", meta.get("Latitude")))
        if lon is None or lat is None:
            return None
        lon, lat = float(lon), float(lat)
        if not point_in_bbox(lon, lat):
            return None
        sog = payload.get("Sog")
        if sog is None:
            sog = payload.get("SOG")
        cog = payload.get("Cog")
        if cog is None:
            cog = payload.get("COG")
        heading = payload.get("TrueHeading")
        if heading is None:
            heading = payload.get("Heading")
        return (
            "position",
            {
                "mmsi": mmsi,
                "ts": time.time(),
                "lon": lon,
                "lat": lat,
                "sog": float(sog) if sog is not None else None,
                "cog": float(cog) if cog is not None else None,
                "heading": float(heading) if heading is not None and float(heading) < 360 else None,
                "nav_status": payload.get("NavigationalStatus"),
                "msg_type": mtype,
            },
        )

    if mtype == "ShipStaticData":
        dim = payload.get("Dimension") or {}
        name = (payload.get("Name") or meta.get("ShipName") or "").strip()
        return (
            "static",
            {
                "mmsi": mmsi,
                "name": name or None,
                "ship_type": payload.get("Type") or payload.get("ShipType"),
                "to_bow": dim.get("A"),
                "to_stern": dim.get("B"),
                "to_port": dim.get("C"),
                "to_starboard": dim.get("D"),
                "callsign": (payload.get("CallSign") or "").strip() or None,
                "imo": payload.get("ImoNumber") or payload.get("IMO"),
                "updated_at": time.time(),
            },
        )
    return None


class Collector:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.conn = connect_db()
        self.pos_buf: list[tuple] = []
        self.static_buf: list[tuple] = []
        self.last_flush = time.time()
        self.received = 0
        self.stored = 0

    def enqueue(self, kind: str, data: dict) -> None:
        if kind == "position":
            self.pos_buf.append(
                (
                    data["mmsi"],
                    data["ts"],
                    data["lon"],
                    data["lat"],
                    data["sog"],
                    data["cog"],
                    data["heading"],
                    data["nav_status"],
                    data["msg_type"],
                )
            )
        else:
            self.static_buf.append(
                (
                    data["mmsi"],
                    data["name"],
                    data["ship_type"],
                    data["to_bow"],
                    data["to_stern"],
                    data["to_port"],
                    data["to_starboard"],
                    data["callsign"],
                    data["imo"],
                    data["updated_at"],
                )
            )
        now = time.time()
        if len(self.pos_buf) + len(self.static_buf) >= BATCH_SIZE or now - self.last_flush >= FLUSH_SECONDS:
            self.flush()

    def flush(self) -> None:
        if self.pos_buf:
            self.conn.executemany(
                "INSERT INTO positions(mmsi,ts,lon,lat,sog,cog,heading,nav_status,msg_type) VALUES(?,?,?,?,?,?,?,?,?)",
                self.pos_buf,
            )
            self.stored += len(self.pos_buf)
            self.pos_buf.clear()
        if self.static_buf:
            self.conn.executemany(
                """
                INSERT INTO vessels(mmsi,name,ship_type,to_bow,to_stern,to_port,to_starboard,callsign,imo,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(mmsi) DO UPDATE SET
                  name=COALESCE(excluded.name, vessels.name),
                  ship_type=COALESCE(excluded.ship_type, vessels.ship_type),
                  to_bow=COALESCE(excluded.to_bow, vessels.to_bow),
                  to_stern=COALESCE(excluded.to_stern, vessels.to_stern),
                  to_port=COALESCE(excluded.to_port, vessels.to_port),
                  to_starboard=COALESCE(excluded.to_starboard, vessels.to_starboard),
                  callsign=COALESCE(excluded.callsign, vessels.callsign),
                  imo=COALESCE(excluded.imo, vessels.imo),
                  updated_at=excluded.updated_at
                """,
                self.static_buf,
            )
            self.static_buf.clear()
        set_meta(self.conn, "last_message_at", utc_now_iso())
        self.conn.commit()
        self.last_flush = time.time()

    async def run_forever(self) -> None:
        deleted = cleanup_old(self.conn)
        if deleted:
            print(f"Cleaned {deleted} old position rows")
        set_meta(self.conn, "collector_started_at", utc_now_iso())
        backoff = 1.0
        while True:
            try:
                async with websockets.connect(
                    WS_URL,
                    ping_interval=20,
                    ping_timeout=60,
                    max_size=8 * 1024 * 1024,
                ) as ws:
                    sub = {
                        "APIKey": self.api_key,
                        "BoundingBoxes": [HK_BOX],
                        "FilterMessageTypes": FILTER_TYPES,
                    }
                    await ws.send(json.dumps(sub))
                    print(f"[{utc_now_iso()}] subscribed HK bbox, waiting for AIS…")
                    backoff = 1.0
                    async for raw in ws:
                        self.received += 1
                        try:
                            msg = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        parsed = parse_message(msg)
                        if not parsed:
                            continue
                        kind, data = parsed
                        self.enqueue(kind, data)
                        if self.received % 500 == 0:
                            print(
                                f"[{utc_now_iso()}] msgs={self.received} stored_pos≈{self.stored}"
                            )
            except Exception as exc:  # noqa: BLE001
                self.flush()
                print(f"[{utc_now_iso()}] disconnect: {exc}; retry in {backoff:.0f}s", file=sys.stderr)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)


def main() -> int:
    # Line-buffer logs when redirected to files
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
        sys.stderr.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass
    key = load_api_key()
    collector = Collector(key)
    try:
        asyncio.run(collector.run_forever())
    except KeyboardInterrupt:
        collector.flush()
        print("Stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
