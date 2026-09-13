#!/usr/bin/env python3
"""Curate mapped Palm roads for the existing activity sampler and warm filaments.

Run after prepare-special-destinations.py, using the same Overpass snapshot.
No synthetic road connections, duplicate weighting, or runtime map requests.
"""
import hashlib
import json
import math
import pathlib
import struct
import sys

root = pathlib.Path(__file__).resolve().parents[1]
raw = pathlib.Path(sys.argv[1]).read_bytes()
osm = json.loads(raw)
if osm.get('remark'):
    raise ValueError(osm['remark'])
routes = []
way_ids = []
lengths = {'palm': 0, 'coast': 0}

def xyz(p):
    lon, lat = math.radians(p['lon']), math.radians(p['lat'])
    return [math.cos(lat)*math.sin(lon)*1.00002, math.sin(lat)*1.00002, math.cos(lat)*math.cos(lon)*1.00002]

for feature in osm['elements']:
    tags, points = feature.get('tags', {}), feature.get('geometry', [])
    name = tags.get('name', '')
    # Named fronds, the trunk, Shoreline and the crescent; exclude service drives.
    palm = any(part in name for part in ['السعفة', 'Frond', 'Palm Jumeirah Road', 'Shoreline Street', 'Crescent Road', 'شارع الهلال'])
    coast = tags.get('highway') == 'primary' and 'سلمان' in name
    if not (palm or coast) or tags.get('tunnel') == 'yes':
        continue
    selected = False
    for a, b in zip(points, points[1:]):
        if not all(55.103 < p.get('lon', 0) < 55.175 and 25.085 < p.get('lat', 0) < 25.148 for p in [a, b]):
            continue
        metres = math.hypot((b['lon']-a['lon'])*math.cos(math.radians(a['lat'])), b['lat']-a['lat'])*111195
        if not 2 <= metres <= 1200:
            continue
        routes.extend(xyz(a)+xyz(b))
        lengths['palm' if palm else 'coast'] += metres
        selected = True
    if selected:
        way_ids.append(feature['id'])

assert routes and lengths['palm'] > lengths['coast']*2
data = struct.pack('<'+'f'*len(routes), *routes)
out = root/'public/data/special'
filename = 'palm-jumeirah-activity.bin'
(out/filename).write_bytes(data)
manifest_path = out/'palm-jumeirah-manifest.json'
manifest = json.loads(manifest_path.read_text())
assert manifest['sourceSha256'] == hashlib.sha256(raw).hexdigest()
manifest['files']['activity'] = {'file': filename, 'bytes': len(data), 'records': len(routes)//6, 'sha256': hashlib.sha256(data).hexdigest()}
manifest['curatedActivity'] = {'preparation': 'scripts/prepare-palm-activity.py', 'sourceWayIds': way_ids, 'routeMetres': lengths, 'purpose': 'Named trunk, frond, crescent and coastal roads. Procedural activity; no observed traffic.'}
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'bytes': len(data), 'segments': len(routes)//6, 'routeMetres': lengths}))
