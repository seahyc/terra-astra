# Personal constellation — integration evidence

Implemented in `hackathon/personal-constellation` on 2026-09-13. This track adds the personal-place input only; the integration owner supplies globe positioning, submitted-state lifetime, scene transformation and closing payoff.

## API and integration

- `PersonalConstellationForm` is the named export from `app/personal-constellation-form.tsx` and implements the unchanged shared `PersonalConstellationFormProps`.
- `initialValue` seeds the draft on mount, after validation. To replace an already mounted draft externally, remount the form with a different React key. No place is preselected on a fresh form.
- `onSubmit` receives an immutable canonical `PersonalPlaces` tuple. The three meanings are the exact role labels from the user; this version does not add optional free-text meaning fields.
- `onReset` is a draft-reset notification. The integrator must retain its last submitted constellation when this fires. No engine reference, `personal(null)` or storage exists in this form.
- `disabled` blocks input changes, choices, reset and submit; it also disables currently open options. The disabled status text says the stars are settling.
- The wrapper controls outer position, width and maximum height/scrolling. The component fills its wrapper; intended desktop width is around 340 px. Mobile CSS reduces spacing and makes search text 16 px to avoid automatic input zoom. The menu uses the existing Base UI combobox and its portal/collision handling.
- Search is local and accent-insensitive. Keyboard choice is inherited from the existing accessible combobox primitive. Typing clears the selected ID, so uncommitted search text cannot create a star. Already chosen entries remain visible but disabled in the other selectors.
- A submitted constellation is separate from the draft and from fictional life stories. No place or meaning leaves the browser through this component.

## Validation boundary

`validatePersonalPlaces(input: unknown)` returns `{ok:true,places:PersonalPlaces}` or `{ok:false,error:string}`. It accepts exactly three entries with distinct known catalogue IDs and string meanings that trim to 1–80 UTF-16 code units. IDs plus meanings are sufficient. If either coordinate is supplied, both must exactly equal the catalogue point; wrong, partial, non-finite or string coordinates are rejected. Labels always resolve from the catalogue. The validator does not mutate input; the result tuple and each place are frozen.

## Source provenance

All 48 catalogue coordinates are copied exactly from source records. They are representative points, not street addresses or administrative centroids. Geographic precision is inherited from each dataset, not a claim of survey accuracy. No open-ended geocoding, inferred points or runtime network request is used.

### 41 world cities — Natural Earth

- Primary description: [Natural Earth populated places](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/).
- [Pinned GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/789c9904087846cc3361302857aa2e76b0ae71ff/geojson/ne_10m_populated_places_simple.geojson), file commit `789c9904087846cc3361302857aa2e76b0ae71ff`, retrieved 2026-09-13. Pinned file hash was checked against the initially downloaded master snapshot.
- SHA-256: `fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f`.
- Licence: [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- Source ID is `properties.ne_id`; coordinates use `geometry.coordinates` in longitude/latitude order, converted only to named `lon`/`lat` properties. No rounding was applied.
- The selected London is in the United Kingdom, San Francisco in the United States, Vancouver in Canada, Lima in Peru, Sydney and Melbourne in Australia. Duplicate worldwide place names were resolved against the source country and population records.
- Display-only changes: “Bogota” becomes “Bogotá”; “United States of America” becomes “United States”; “Hong Kong S.A.R.” becomes “Hong Kong”. These do not alter coordinates.

### 7 Singapore localities — GeoNames

- Primary export: [GeoNames Singapore country extract](https://download.geonames.org/export/dump/SG.zip), retrieved 2026-09-13.
- Downloaded ZIP SHA-256: `0f81c966d5ee010b3ebc64f8b246fd2d4944ba09079b4fb7f45a2cc719d06eda`.
- Format and coordinates: [GeoNames export readme](https://download.geonames.org/export/dump/readme.txt). Columns 5 and 6 are WGS84 latitude/longitude; copied without modification.
- Licence: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Visible form attribution links to GeoNames and this licence.
- Selected `P/PPL` or `L/LCTY` locality records, excluding duplicate survey stations, hills and industrial areas. Punggol uses locality `1882075`, not the separate village `1880348`. These are locality points, not asserted planning-area centroids.
- Display-only change: “Kampong Glam” becomes “Kampong Gelam”, an alternate name contained in the source record; original name remains searchable.
- The official URA planning-area dataset was inspected, but its download API returned HTTP 403. No coordinates or centroids were inferred from the partial preview. The catalogue therefore uses the directly downloaded GeoNames records instead.

## Catalogue audit

| Place | Region | Latitude | Longitude | Source record |
| --- | --- | ---: | ---: | --- |
| Jurong East | Singapore | 1.32888 | 103.73995 | geonames [1881952](https://www.geonames.org/1881952/) |
| Kampong Gelam | Singapore | 1.30222 | 103.86444 | geonames [1882020](https://www.geonames.org/1882020/) |
| Punggol | Singapore | 1.39278 | 103.9 | geonames [1882075](https://www.geonames.org/1882075/) |
| Queenstown | Singapore | 1.29944 | 103.80583 | geonames [1882077](https://www.geonames.org/1882077/) |
| Singapore | Singapore | 1.294979 | 103.853875 | natural-earth 1159151627 |
| Tampines | Singapore | 1.37472 | 103.94528 | geonames [1882114](https://www.geonames.org/1882114/) |
| Toa Payoh | Singapore | 1.33611 | 103.85028 | geonames [1882147](https://www.geonames.org/1882147/) |
| Woodlands | Singapore | 1.43801 | 103.78877 | geonames [1882316](https://www.geonames.org/1882316/) |
| Auckland | New Zealand | -36.848055 | 174.763027 | natural-earth 1159151703 |
| Bangkok | Thailand | 13.751945 | 100.514699 | natural-earth 1159151509 |
| Beijing | China | 39.90172 | 116.394201 | natural-earth 1159151595 |
| Berlin | Germany | 52.523764 | 13.399603 | natural-earth 1159151529 |
| Bogotá | Colombia | 4.598369 | -74.08529 | natural-earth 1159151601 |
| Buenos Aires | Argentina | -34.610715 | -58.432513 | natural-earth 1159151559 |
| Cairo | Egypt | 30.051906 | 31.248022 | natural-earth 1159151603 |
| Cape Town | South Africa | -33.918065 | 18.433042 | natural-earth 1159151583 |
| Colombo | Sri Lanka | 6.931966 | 79.857751 | natural-earth 1159150719 |
| Dhaka | Bangladesh | 23.725006 | 90.406634 | natural-earth 1159151467 |
| Dubai | United Arab Emirates | 25.214912 | 55.286946 | natural-earth 1159151497 |
| Hanoi | Vietnam | 21.035273 | 105.848068 | natural-earth 1159151251 |
| Hong Kong | Hong Kong | 22.306927 | 114.183064 | natural-earth 1159151629 |
| Istanbul | Turkey | 41.017602 | 28.974277 | natural-earth 1159151579 |
| Jakarta | Indonesia | -6.172472 | 106.827492 | natural-earth 1159151599 |
| Kathmandu | Nepal | 27.718638 | 85.314696 | natural-earth 1159150655 |
| Kuala Lumpur | Malaysia | 3.139797 | 101.688699 | natural-earth 1159151317 |
| Lagos | Nigeria | 6.445208 | 3.389585 | natural-earth 1159151591 |
| Lima | Peru | -12.046067 | -77.052008 | natural-earth 1159151511 |
| Lisbon | Portugal | 38.724669 | -9.146812 | natural-earth 1159151273 |
| London | United Kingdom | 51.501941 | -0.118668 | natural-earth 1159151577 |
| Manila | Philippines | 14.606105 | 120.980271 | natural-earth 1159151525 |
| Melbourne | Australia | -37.818086 | 144.97307 | natural-earth 1159151565 |
| Mexico City | Mexico | 19.444388 | -99.132934 | natural-earth 1159151587 |
| Mumbai | India | 19.068408 | 72.875839 | natural-earth 1159151611 |
| Nairobi | Kenya | -1.281401 | 36.814711 | natural-earth 1159151597 |
| New Delhi | India | 28.600023 | 77.19998 | natural-earth 1159151541 |
| New York | United States | 40.721562 | -73.995718 | natural-earth 1159151575 |
| Paris | France | 48.858092 | 2.352992 | natural-earth 1159151613 |
| Rome | Italy | 41.897902 | 12.481313 | natural-earth 1159151593 |
| San Francisco | United States | 37.784263 | -122.3996 | natural-earth 1159151479 |
| São Paulo | Brazil | -23.556734 | -46.626966 | natural-earth 1159151621 |
| Seoul | South Korea | 37.568295 | 126.997785 | natural-earth 1159151523 |
| Shanghai | China | 31.218398 | 121.434559 | natural-earth 1159151605 |
| Stockholm | Sweden | 59.324127 | 18.0663 | natural-earth 1159151507 |
| Sydney | Australia | -33.871373 | 151.212548 | natural-earth 1159151623 |
| Taipei | Taiwan | 25.035833 | 121.568333 | natural-earth 1159151567 |
| Tokyo | Japan | 35.686963 | 139.749462 | natural-earth 1159151609 |
| Toronto | Canada | 43.664645 | -79.389459 | natural-earth 1159151557 |
| Vancouver | Canada | 49.275362 | -123.12359 | natural-earth 1159151555 |

## Checks completed

- `node scripts/check-personal-model.mjs` — PASS. 48 unique sourced finite points; every catalogue point usable in a valid triplet; canonical immutable output; roundtrip submitted values; caller labels replaced; 21 invalid inputs rejected including duplicate IDs, forged coordinates, missing coordinates, prototype-name IDs, blank/oversized meanings and wrong types; 80-character and Unicode meanings accepted.
- `./node_modules/.bin/tsc --noEmit --incremental false` — PASS.
- Targeted ESLint on the form/catalogue/model — PASS.
- Impeccable mechanical detector on TSX/CSS — no findings.
- `git diff --check` — PASS.

## Verification limits / integration acceptance

The integration owner requested combined native-browser verification rather than a separate personal-track browser session. This worker makes no rendered-pixel, screen-reader, physical-phone or FPS claim. Confirm in the combined app: blank submit recovery; search + explicit selection; duplicate exclusion; keyboard arrows/Enter/Escape; arbitrary typed text cannot submit; three-place submit; disabled controls including an already open popup; reset draft without removing remembered stars; menu placement and scrolling at phone width. Ensure the form wrapper does not cover the engine’s full visual canvas at mobile height.

Impeccable’s incumbent design and mechanical check were used; a separate finish-reviewer agent was not spawned because this isolated worker’s assignment explicitly prohibits further agents. Combined visual review belongs to integration QA.
