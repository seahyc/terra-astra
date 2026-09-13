#!/usr/bin/env python3
"""Preserve OSM mosque relation geometry and the exact Kaaba footprint."""
import hashlib
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[1]
city_path, mosque_path = map(pathlib.Path, sys.argv[1:])
city, mosque = [json.loads(p.read_bytes()) for p in [city_path, mosque_path]]
if city.get('remark') or mosque.get('remark'):
    raise ValueError('Incomplete Overpass response')
kaaba = next(e for e in city['elements'] if e['id'] == 103914569)
haram = next(e for e in mosque['elements'] if e['id'] == 1472531)
elements = city['elements'][:]
for e in mosque['elements']:
    if e['type'] == 'way':
        elements.append(e)
for member in haram['members']:
    if member.get('geometry'):
        elements.append({'id': member['ref'], 'tags': {'building':'mosque', 'special:focal':'mosque'}, 'geometry': member['geometry']})
merged = dict(city, elements=elements)
merged_path = city_path.with_name('makkah-merged.json')
merged_path.write_text(json.dumps(merged))
subprocess.run([sys.executable, str(root/'scripts/prepare-special-destinations.py'), 'makkah', str(merged_path)], check=True)
out = root/'public/data/special'
footprint = [[p['lon'], p['lat']] for p in kaaba['geometry']]
# Closing node repeats the first; mean unique perimeter vertices locates the flow.
center = [sum(p[i] for p in footprint[:-1])/len(footprint[:-1]) for i in range(2)]
anchor = {'source':'OpenStreetMap way 103914569', 'sourceUrl':'https://www.openstreetmap.org/way/103914569', 'footprint':footprint, 'center':center, 'heightMetres':float(kaaba['tags']['height']), 'heightSource':'OSM height tag; no architectural survey claim', 'mosqueRelation':'https://www.openstreetmap.org/relation/1472531'}
(root/'lib/world/makkah-anchor.ts').write_text('// Generated from OSM way 103914569 by scripts/prepare-makkah.py.\nexport default '+json.dumps(anchor, indent=2)+' as const;\n')
manifest_path = out/'makkah-manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['sourceSnapshots'] = [{'file':p.name, 'sha256':hashlib.sha256(p.read_bytes()).hexdigest(), 'timestamp':data['osm3s']['timestamp_osm_base']} for p,data in [(city_path,city),(mosque_path,mosque)]]
manifest['focalGeometry'] = anchor
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
