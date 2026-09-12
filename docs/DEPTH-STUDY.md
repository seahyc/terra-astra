# v0.4 — A world with depth

The owner asked for an Earth with the spatial character of a galaxy: coherent terrain, material within the globe, and oceans with structure. This release is the first interactive depth study.

## One Earth, three perspectives

- **Globe:** relief and a restrained stellar body preserve the geographic silhouette.
- **Horizon:** a shallow, north-facing view reveals terrain height, ocean basins and perspective between near and far stars. Drag and zoom remain available.
- **Cutaway:** two world-fixed planes remove a quarter of the near body. Orbit around the opening to see interior light and cavities. This is an artistic sectional view, not a geological model.
- **Sculpted Earth / Surface reference:** switches displacement and added matter without changing the camera. The reference approximates the prior thin surface; it is not a separately running v0.3 build.
- Region presets select **Indonesia / Java Trench** or **Andes / Pacific**. The same geography remains in all three views. Enter Singapore resets the study view and fades spatial relief before street scale.

## Sources and material

`public/data/relief-manifest.json` records the NOAA NCEI ETOPO 2022 source, exact extraction parameters, source checksum, grid layout, particle counts and deterministic seed. `scripts/prepare-relief.py` reproduces the prepared layers from an ignored cached source TIFF. It requires Python, numpy, scipy and Pillow; it is an offline preparation tool.

The official 60 arc-second ice-surface dataset is sampled at 2880 × 1440 for terrain particles. A 1440 × 720, little-endian int16 elevation grid raises existing global land, coast and night-light particles. This globe-scale sample smooths small peaks and does not provide street-scale terrain.

Land and seafloor radii follow real elevation through an exaggerated nonlinear curve. Slope and elevation bands emphasize shelves, ridges and trenches. The stellar body continues below the surface in a continuous 3D field with irregular cavities. Sparse interior particles, broad soft kernels and a faint outer halo give it texture. Those three-dimensional light structures are imagined, not measured geological layers, water currents, people or population.

Prepared spatial particles: 60,833 land; 149,167 ocean; 57,750 body; 16,457 interior; 7,164 haze; 4,800 halo. Total: **296,171**, with smaller visible draw budgets on phones. These counts describe rendering samples, not stars or humans in reality.

## Rendering

- GPU point shaders interpolate between the reference radius and actual prepared radius, change apparent size with distance and attenuate light by camera-ray depth through the body. Cut planes stay in world coordinates while the viewer orbits.
- A smaller opaque core hides the far interior in Globe/Horizon; Cutaway reveals the interior. This is layered 3D point rendering with soft kernels, not a ray-marched gas simulation.
- The Canvas fallback projects the same world positions and shares the cut, attenuation and perspective logic at reduced detail. Nearby terrain receives a larger sample budget. Fallback exposure is separately calibrated; pixel parity with WebGL is not claimed.
- Paused views stop redrawing once camera and interface changes settle. Interactions invalidate the still frame. Ambient motion and shimmer remain governed by the existing pause and reduced-motion preference.
- Spatial displacement fades out between altitude 0.24 and 0.025 (unit Earth radius), before Singapore street detail appears. Existing fictional lives and remembered-light returns remain part of the experience.

## Review

Acceptance is based first on motion-paused Globe, Horizon and Cutaway views, including the Surface reference comparison. Automated data and real-engine lifecycle checks cover source registration, radial thickness, longitude wrapping, comparison camera stability, safe close zoom and reset into Singapore. The existing journey tests still cover all three lives and desktop / phone camera framing.

The preview browser provides Canvas2D only. Visual review covered desktop Canvas Globe, Horizon and Cutaway, both region presets, the fixed-camera Surface reference, keyboard orbit around the section, a Singapore visit and remembered return. A 390 × 844 iframe covered the three phone views, the raised cutaway framing, paused descent and an expanded Amina story with its three place labels visible above the panel. Native WebGL appearance and physical phone performance require a device review. Compare those renderers with the same region, camera and light settings before adjusting the next release.

## Preserved baseline

v0.3 remains at annotated tag `v0.3`, source `a4823cf3dbbb8a94749cdc0452b5d2c6f06472b8`, and saved Sites version 4 (`appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_cd54921e18e48191a7b192014ffb6801`). v0.4 adds a new immutable milestone; it does not overwrite that baseline.
