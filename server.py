#!/usr/bin/env python3
"""Local read-only gateway for the Hong Kong Maritime Data Hub V3.

Python 3.10+ standard library only. No API keys or third-party proxy.
Run: python3 server.py   (then open http://127.0.0.1:8765)
The gateway deliberately cannot fetch arbitrary URLs or serve arbitrary files.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import math
from pathlib import Path
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener

ROOT = Path(__file__).resolve().parent
FEEDS = {r['id']: r for r in json.loads((ROOT / 'feeds.json').read_text(encoding='utf-8'))}
HOSTS = frozenset({'data.weather.gov.hk', 'www.mardep.gov.hk', 'marine-api.open-meteo.com'})
STATIONS = frozenset('CCH CLK CMW KCT KLW LOP MWC QUB SPW TAO TBT TMW TPK WAG'.split())
MAX_BYTES = 8 * 1024 * 1024
TIMEOUT = 12
CACHE: dict[str, tuple[float, dict]] = {}
ERROR_CACHE: dict[str, tuple[float, str]] = {}
LOCK = threading.Lock()
FETCH_SLOTS = threading.BoundedSemaphore(4)
FEED_LOCKS = {k: threading.Lock() for k in FEEDS}
ALLOWED_STATIC = {
    '/': ('HK_Maritime_Hub_V3.html', 'text/html; charset=utf-8'),
    '/index.html': ('HK_Maritime_Hub_V3.html', 'text/html; charset=utf-8'),
    '/HK_Maritime_Hub_V3.html': ('HK_Maritime_Hub_V3.html', 'text/html; charset=utf-8'),
    '/feeds.json': ('feeds.json', 'application/json; charset=utf-8'),
    '/catalog.json': ('catalog.json', 'application/json; charset=utf-8'),
    '/README.md': ('README.md', 'text/markdown; charset=utf-8'),
    '/HK_Maritime_Websites_and_Data_Integration.md': ('HK_Maritime_Websites_and_Data_Integration.md', 'text/markdown; charset=utf-8'),
    '/HK_Maritime_NonDirect_Sources.md': ('HK_Maritime_NonDirect_Sources.md', 'text/markdown; charset=utf-8'),
    '/source/smart_map.js': ('source/smart_map.js', 'text/javascript; charset=utf-8'),
    '/source/smart_map.css': ('source/smart_map.css', 'text/css; charset=utf-8'),
    '/source/stations_geo.json': ('source/stations_geo.json', 'application/json; charset=utf-8'),
    '/source/readers_v2.js': ('source/readers_v2.js', 'text/javascript; charset=utf-8'),
    '/source/readers_v2.css': ('source/readers_v2.css', 'text/css; charset=utf-8'),
    '/source/README.md': ('source/README.md', 'text/markdown; charset=utf-8'),
}


def safe_url(url: str) -> str:
    p = urlsplit(url)
    if p.scheme != 'https' or p.hostname not in HOSTS or p.username or p.password or (p.port not in (None, 443)):
        raise ValueError('Upstream URL is not on the HTTPS allowlist.')
    return url


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def endpoint(feed_id: str, query: dict[str, list[str]]) -> str:
    if feed_id not in FEEDS:
        raise ValueError('Unknown feed ID.')
    if any(len(v) != 1 for v in query.values()):
        raise ValueError('Repeated parameters are not allowed.')
    p = urlsplit(FEEDS[feed_id]['url'])
    args = {k: v[0] for k, v in parse_qs(p.query).items()}
    allowed = {'lat', 'lon'} if feed_id == 'marine' else {'station', 'date'} if feed_id == 'hhot' else set()
    if set(query) - allowed:
        raise ValueError('Unsupported query parameter. Arbitrary upstream URLs are not accepted.')
    if feed_id == 'marine':
        lat, lon = float(query.get('lat', ['22.10'])[0]), float(query.get('lon', ['114.20'])[0])
        if not (math.isfinite(lat) and math.isfinite(lon) and 20 <= lat <= 24 and 112 <= lon <= 116):
            raise ValueError('Coordinates must be near Hong Kong: lat 20–24, lon 112–116.')
        args.update(latitude=str(lat), longitude=str(lon), timezone='Asia/Hong_Kong', forecast_days='3',
            hourly='wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature,sea_level_height_msl')
    elif feed_id == 'hhot':
        today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
        raw = query.get('date', [today])[0]
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw):
            raise ValueError('Date must use YYYY-MM-DD.')
        day = dt.date.fromisoformat(raw)
        if not 2000 <= day.year <= 2100:
            raise ValueError('Date is out of the application range.')
        station = query.get('station', ['QUB'])[0]
        if station not in STATIONS:
            raise ValueError('Unknown tide station.')
        args.update(station=station, year=str(day.year), month=str(day.month), day=str(day.day), rformat='json')
    return safe_url(urlunsplit((p.scheme, p.netloc, p.path, urlencode(args), '')))


def retrieve(feed_id: str, query: dict[str, list[str]]) -> dict:
    url = endpoint(feed_id, query)
    # Platform request/check cadence, not a guarantee of source update cadence.
    ttl = max(60, min(int(FEEDS[feed_id]['refresh_seconds']), 86400))
    with FEED_LOCKS[feed_id]:
        with LOCK:
            cached = CACHE.get(url)
            if cached and time.monotonic() - cached[0] < ttl:
                return {**cached[1], 'cache_hit': True}
            failed = ERROR_CACHE.get(url)
            if failed and time.monotonic() - failed[0] < 45:
                raise RuntimeError(failed[1] + ' [45-second retry cooldown]')
        if not FETCH_SLOTS.acquire(timeout=2):
            raise RuntimeError('Gateway is busy. Please retry shortly.')
        try:
            request = Request(url, headers={
                'User-Agent': 'HK-Maritime-Research-Hub/2.0 (read-only educational dashboard)',
                'Accept': 'application/json,text/csv,application/xml,text/xml,text/plain,*/*;q=0.5',
                'Accept-Encoding': 'identity',
            })
            opener = build_opener(SafeRedirect())
            with opener.open(request, timeout=TIMEOUT) as response:
                safe_url(response.geturl())
                header_len = response.headers.get('Content-Length')
                if header_len and int(header_len) > MAX_BYTES:
                    raise ValueError('Upstream response is larger than 8 MB.')
                chunks, size = [], 0
                began = time.monotonic()
                while True:
                    piece = response.read(min(65536, MAX_BYTES + 1 - size))
                    if not piece:
                        break
                    chunks.append(piece)
                    size += len(piece)
                    if size > MAX_BYTES:
                        raise ValueError('Upstream response is larger than 8 MB.')
                    if time.monotonic() - began > TIMEOUT:
                        raise TimeoutError('Upstream read exceeded time budget.')
                raw = b''.join(chunks)
                encoding = response.headers.get_content_charset() or 'utf-8-sig'
                # XML may declare a legacy encoding; honor it when the HTTP header does not.
                if not response.headers.get_content_charset():
                    match = re.search(br'<\?xml[^>]*encoding=["\']([^"\']+)', raw[:250], re.I)
                    if match:
                        encoding = match.group(1).decode('ascii')
                text = raw.decode(encoding, errors='strict')
                payload = {
                    'ok': True, 'feed_id': feed_id, 'source_url': url,
                    'final_source_url': response.geturl(),
                    'fetched_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                    'content_type': response.headers.get('Content-Type', ''),
                    'cache_hit': False, 'text': text,
                }
            with LOCK:
                CACHE[url] = (time.monotonic(), payload)
                ERROR_CACHE.pop(url, None)
                # Parameterized requests are bounded to avoid unbounded in-memory retention.
                if len(CACHE) > 100:
                    oldest = min(CACHE, key=lambda k: CACHE[k][0])
                    del CACHE[oldest]
            return payload
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, UnicodeError, LookupError) as exc:
            reason = f'{type(exc).__name__}: {str(exc)[:400]}'
            with LOCK:
                ERROR_CACHE[url] = (time.monotonic(), reason)
                if len(ERROR_CACHE) > 100:
                    oldest = min(ERROR_CACHE, key=lambda k: ERROR_CACHE[k][0])
                    del ERROR_CACHE[oldest]
            raise RuntimeError(reason) from exc
        finally:
            FETCH_SLOTS.release()


class Handler(BaseHTTPRequestHandler):
    server_version = 'HKMaritimeHub/2.0'

    def send_bytes(self, status: int, raw: bytes, content_type: str):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        self.end_headers()
        if self.command != 'HEAD':
            try:
                self.wfile.write(raw)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def send_json(self, status: int, payload: dict):
        self.send_bytes(status, json.dumps(payload, ensure_ascii=False).encode('utf-8'), 'application/json; charset=utf-8')

    def do_GET(self):
        host = self.headers.get('Host', '').split(':')[0].lower()
        if host not in {'127.0.0.1', 'localhost'}:
            return self.send_json(403, {'ok': False, 'error': 'Only localhost hostnames are accepted.'})
        path = urlsplit(self.path)
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            return self.send_json(403, {'ok': False, 'error': 'Cross-site access to the local gateway is not allowed.'})
        origin = self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'}:
            return self.send_json(403, {'ok': False, 'error': 'Origin is not allowed.'})
        if path.path == '/api/health':
            return self.send_json(200, {'ok': True, 'service': 'hk-maritime-hub-v3', 'feeds': len(FEEDS),
                                       'upstream_network_tested': False, 'note': 'Health only checks the local server, not the upstream feeds.'})
        if path.path.startswith('/api/feed/'):
            feed_id = path.path.removeprefix('/api/feed/')
            if feed_id not in FEEDS:
                return self.send_json(404, {'ok': False, 'error': 'Unknown feed ID.'})
            try:
                return self.send_json(200, retrieve(feed_id, parse_qs(path.query, keep_blank_values=True)))
            except (ValueError, OverflowError) as exc:
                return self.send_json(400, {'ok': False, 'error': str(exc)})
            except RuntimeError as exc:
                return self.send_json(502, {'ok': False, 'error': str(exc), 'note': 'No fresh data was obtained. Existing browser results are not replaced.'})
        if path.path == '/favicon.ico':
            return self.send_bytes(204, b'', 'image/x-icon')
        target = ALLOWED_STATIC.get(path.path)
        if target:
            file_path = ROOT / target[0]
            if file_path.is_file():
                return self.send_bytes(200, file_path.read_bytes(), target[1])
        self.send_json(404, {'ok': False, 'error': 'Not found.'})

    def do_HEAD(self):
        if urlsplit(self.path).path.startswith('/api/feed/'):
            return self.send_json(405, {'ok': False, 'error': 'Use GET for data queries.'})
        self.do_GET()

    def do_POST(self):
        self.send_json(405, {'ok': False, 'error': 'Read-only service.'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Choose an unprivileged port between 1024 and 65535.')
    try:
        httpd = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError as exc:
        parser.exit(1, f'Cannot start local server: {exc}\nTry: python3 server.py --port 8766\n')
    print(f'香港海事数据枢纽 V2: http://127.0.0.1:{args.port}', flush=True)
    print('只读、本机服务；保持此窗口开启。按 Ctrl+C 结束。数据从官方/公开源获取，需要正常网络。', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
    finally:
        httpd.server_close()

if __name__ == '__main__':
    main()
