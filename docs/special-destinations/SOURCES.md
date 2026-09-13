# Special destinations: source preparation

These are local feasibility assets, prepared on 13 September 2026. The runtime makes no map-service requests. The binary snapshots are derived from OpenStreetMap under ODbL 1.0; the existing on-screen OpenStreetMap attribution remains. Exact source timestamps, input SHA-256 values, output counts and output SHA-256 values are in the manifests beside the binaries.

- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright).
- [Palm Jumeirah: Nakheel](https://www.nakheel.com/en/developments/nakheel-collections/palmjumeirah) describes the trunk, fronds and crescent used as the visual recognition test. Geometry comes from OSM, not a traced brochure.
- [Kaaba, OSM way 103914569](https://www.openstreetmap.org/way/103914569): exact mapped footprint and the OSM `height=15` tag. This is a source-derived geometric anchor, not an architectural survey.
- [Masjid al-Haram, OSM relation 1472531](https://www.openstreetmap.org/relation/1472531): outer/inner outline members retained independently as linework; building parts provide additional stellar points.
- [Balady Atlas: Mapping Hajj](https://atlas.balady.gov.sa/en/mapping-hajj/) confirms the counter-clockwise circulation direction. No person counts, live observations, crowd densities or route guidance are derived from these streams.

Query endpoint: `https://overpass-api.de/api/interpreter`. Fetch as URL-encoded `data`, accept compression, fail on incomplete JSON or Overpass `remark`. Raw responses were retained locally under ignored `data-source/special/`. Refetching later will change the snapshots; use the manifest hashes to distinguish versions.

Palm query:

```overpass
[out:json][timeout:45];
(
  way["natural"="coastline"](25.035,55.085,25.165,55.235);
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|motorway_link|trunk_link|primary_link|secondary_link)$"](25.035,55.085,25.165,55.235);
  way["building"](25.08,55.095,25.15,55.175);
);
out geom;
```

Makkah city query:

```overpass
[out:json][timeout:40];
(
  way["highway"](21.402,39.802,21.445,39.85);
  way["building"](21.413,39.815,21.432,39.836);
);
out geom;
```

Makkah focal query:

```overpass
[out:json][timeout:30];
(
  way["building:part"](21.419,39.821,21.427,39.832);
  relation["building"](21.419,39.821,21.427,39.832);
);
out geom;
```

Preparation:

```sh
python3 scripts/prepare-special-destinations.py palm-jumeirah data-source/special/palm-osm.json
python3 scripts/prepare-palm-activity.py data-source/special/palm-osm.json
python3 scripts/prepare-makkah.py data-source/special/makkah-osm.json data-source/special/makkah-mosque-osm.json
```

The generator keeps real coordinate pairs, discards segments beyond the bounded area, densifies for light samples and deterministically shuffles/caps the star sample. Geometry fades inside those bounds. Distant service-road detail is reduced around Dubai; surrounding major roads and mainland coastline continue beyond the focal Palm. The Makkah generator removes road chords crossing the inner 85-metre courtyard, preserving the mosque outline and Kaaba anchor.

The four binary slots use the existing engine's two formats: star clouds have XYZ/brightness/size/phase records, line clouds have endpoint-pair XYZ records. For adapter reuse, `makkah-coast.bin` contains the focal mosque points, not a claimed coastline. `makkah-outline.bin` contains the mosque outline. No buildings are made photorealistic. Only the Kaaba uses its source-tagged height; other architecture stays in the shared surface plane.

Palm's turquoise water light is interpretive activity beyond the crescent, not surveyed shipping lanes or AIS. Warm traffic uses the existing road-segment sampler. Makkah omits that vehicle sampler and uses only bounded collective streams: no people icons, identities, counts, scoring or live tracking.

## Curated Palm activity follow-up

The additional activity binary uses the same raw snapshot and attribution. It retains source segments from named trunk, frond, Shoreline, crescent and adjoining King Salman coastal roads, excluding tagged tunnels. It invents no connecting roads. The Palm manifest lists all retained source way IDs, input/output hashes and route lengths: approximately 48.4 km Palm and 10.0 km coastal context. The runtime uses these 1,824 segments for its existing activity sampler and a restrained warm filament overlay. These route lengths describe the rendered source segments, including separate carriageways; they are not a surveyed unique road-distance statistic.
