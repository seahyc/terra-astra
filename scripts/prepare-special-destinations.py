#!/usr/bin/env python3
"""Prepare bounded OSM geometry; no runtime map service and no invented streets.

Usage: python3 scripts/prepare-special-destinations.py palm-jumeirah path/to/overpass.json
The manifest records the exact source hash and OSM snapshot time. See the spike handback
for the query. Lines are XYZ endpoint pairs; stars are XYZ, brightness, size, phase.
"""
import hashlib
import json
import math
import pathlib
import random
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
destination, source = sys.argv[1:]
raw = pathlib.Path(source).read_bytes()
osm = json.loads(raw)
if osm.get('remark'):
    raise ValueError(osm['remark'])
rng = random.Random(260913)
bounds = (55.085, 25.035, 55.235, 25.165) if destination == 'palm-jumeirah' else (39.802, 21.402, 39.85, 21.445)
layers = {name: [] for name in ['stars', 'streets', 'coast', 'outline']}
counts = {'coast': 0, 'road': 0, 'building': 0, 'mosque': 0}

def xyz(lon, lat, radius=1.00002):
    a, b = math.radians(lon), math.radians(lat)
    return [radius * math.cos(b) * math.sin(a), radius * math.sin(b), radius * math.cos(b) * math.cos(a)]

for feature in osm['elements']:
    tags, points = feature.get('tags', {}), feature.get('geometry', [])
    kind = 'mosque' if tags.get('special:focal') == 'mosque' else 'coast' if tags.get('natural') == 'coastline' else 'road' if 'highway' in tags else 'building'
    if len(points) < 2:
        continue
    counts[kind] += 1
    for a, b in zip(points, points[1:]):
        if not all('lon' in p and 'lat' in p for p in [a,b]):
            continue
        west, south, east, north = bounds
        if not all(west <= p['lon'] <= east and south <= p['lat'] <= north for p in [a,b]):
            continue
        if destination == 'palm-jumeirah' and kind == 'road' and tags.get('highway') == 'service' and not (55.10 < a['lon'] < 55.168 and 25.087 < a['lat'] < 25.146):
            continue
        if destination == 'makkah' and kind == 'road':
            # Remove any road chord crossing the quiet central courtyard (85m).
            ax, ay = (a['lon']-39.82619418)*103516, (a['lat']-21.42251716)*111195
            bx, by = (b['lon']-39.82619418)*103516, (b['lat']-21.42251716)*111195
            dx, dy = bx-ax, by-ay
            t = max(0, min(1, -(ax*dx+ay*dy)/max(.001,dx*dx+dy*dy)))
            if math.hypot(ax+t*dx, ay+t*dy) < 85:
                continue
        metres = math.hypot((a['lon']-b['lon'])*math.cos(math.radians(a['lat'])), a['lat']-b['lat'])*111195
        if metres > 4000 or metres < .3:
            continue
        n = max(1, math.ceil(metres / (3 if kind == 'mosque' else 12 if kind == 'coast' else 22 if kind == 'road' else 10)))
        coords = [xyz(a['lon']+(b['lon']-a['lon'])*i/n, a['lat']+(b['lat']-a['lat'])*i/n) for i in range(n+1)]
        line = 'streets' if kind == 'road' else 'outline'
        if kind != 'building':
            line_n = max(1, math.ceil(metres/200))
            line_coords = [xyz(a['lon']+(b['lon']-a['lon'])*i/line_n, a['lat']+(b['lat']-a['lat'])*i/line_n) for i in range(line_n+1)]
            for start, end in zip(line_coords, line_coords[1:]):
                layers[line].extend(start+end)
        for position in coords[:-1]:
            brightness = (.75 if kind in ['coast','mosque'] else .48 if kind == 'road' else .23) + rng.random()*.3
            layers['coast' if kind in ['coast','mosque'] else 'stars'].append(position+[brightness, .46+rng.random()*.28, rng.random()*math.tau])

for name in ['stars', 'coast']:
    rng.shuffle(layers[name])
    layers[name] = [v for p in layers[name][:65000 if name == 'stars' else 25000] for v in p]
out = ROOT / 'public/data/special'
out.mkdir(parents=True, exist_ok=True)
files = {}
for name, values in layers.items():
    data = struct.pack('<'+'f'*len(values), *values)
    filename = f'{destination}-{name}.bin'
    (out/filename).write_bytes(data)
    files[name] = {'file': filename, 'bytes': len(data), 'records': len(values)//6, 'sha256': hashlib.sha256(data).hexdigest()}
manifest = {'destination':destination, 'source':'OpenStreetMap contributors / Overpass API', 'license':'ODbL 1.0', 'attribution':'https://www.openstreetmap.org/copyright', 'snapshot':osm['osm3s']['timestamp_osm_base'], 'sourceSha256':hashlib.sha256(raw).hexdigest(), 'preparation':'scripts/prepare-special-destinations.py; seed 260913; no elevations or building volumes inferred', 'activity':'Procedural only. No live vehicle, boat or human observations.', 'features':counts, 'files':files}
(out/f'{destination}-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
