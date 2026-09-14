#!/usr/bin/env python3
"""Synchronize the standalone HTML registry without changing its geometry or UI."""
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
html=ROOT/'HK_Maritime_Hub_V3.html'
s=html.read_text(encoding='utf-8')
pattern=r'(<script[^>]*id="portal-data"[^>]*>)(.*?)(</script>)'
m=re.search(pattern,s,re.S)
if m is None:raise SystemExit('Embedded registry not found; HTML unchanged.')
d=json.loads(m.group(2))
d['catalog']=json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))
d['feeds']=json.loads((ROOT/'feeds.json').read_text(encoding='utf-8'))
d['directoryMD']=(ROOT/'HK_Maritime_Websites_and_Data_Integration.md').read_text(encoding='utf-8')
d['externalMD']=(ROOT/'HK_Maritime_NonDirect_Sources.md').read_text(encoding='utf-8')
blob=json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html.write_text(s[:m.start(2)]+blob+s[m.end(2):],encoding='utf-8')
print('HTML registry synchronized. UI and SRZ geometry preserved.')
