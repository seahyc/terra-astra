# Real globe data

`GET /api/world-data/earthquakes`, `/satellites`, and `/aircraft?lat=1.3&lon=103.85` return the contract in `types.ts`. All timestamps are UTC epoch milliseconds; all coordinates are degrees. These endpoints are public, read-only and do not call OpenAI.

- Earthquakes: USGS rolling past day, filtered to earthquake events. Position is an epicentre; depth is a separate estimated measurement in km. Refresh 60s; a feed older than 5 minutes is unavailable. Null magnitude/depth stays null. Data can be revised.
- Satellites: CelesTrak STATIONS group includes space stations and associated objects, including debris. Source elements cached for 2h, accepted up to 72h old. `observedAt` is the orbital-element epoch; `positionAt` is when SGP4 computes the position, not a live sensor timestamp. Position refresh 30s; no raw orbital-element dataset is exposed by the endpoint.
- Aircraft: ADSB.lol positions within 250 nautical miles of the requested centre (rounded to 1 degree for shared caching). It is a reception-limited regional sample, not global traffic. Refresh 60s; discard positions over 120s old. `observedAt` subtracts `seen_pos` from the provider timestamp. Geometric altitude is WGS84; barometric fallback is labelled. Ground objects are excluded. No invented movement between observations.

Render only records in successful snapshots. Show `source.attribution`, source link, freshness/observation time and coverage. A source error yields `status: unavailable` and empty records; never refill it with procedural objects. Keep a received marker only until its expiry and its individual observation age limit. Do not extrapolate an aircraft without marking the extrapolated value separately. Satellite positions are already propagated estimates. Earthquake markers belong on the surface, with depth disclosed separately.

Caches: bounded process map (32 normalized snapshots), maximum 4 concurrent source requests, request coalescing, and Worker Cache API when available. Worker cache is local to a Cloudflare location, not a globally coordinated fetch scheduler. A future large deployment should centralize refresh to enforce a single global provider cadence. Requests have a 12s timeout, a 2MiB body bound and no redirects. Failures back off for the normal source refresh interval. Source outages/HTTP errors never become invented live data.

Sources and field documentation:
- https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- https://earthquake.usgs.gov/data/comcat/index.php
- https://www.usgs.gov/information-policies-and-instructions/acknowledging-or-crediting-usgs
- https://celestrak.org/NORAD/documentation/gp-data-formats.php
- https://celestrak.org/usage-policy.php
- https://github.com/shashwatak/satellite-js
- https://www.adsb.lol/docs/open-data/api/ (ODbL 1.0; preserve attribution and applicable share-alike terms)
- https://api.adsb.lol/docs
- https://github.com/wiedehopf/readsb/blob/dev/README-json.md

Run `node --test lib/world/data/*.test.mjs`. Unit tests use fixtures; live-source and rendered-globe verification must be reported separately.
