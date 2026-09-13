const MAX_INPUT_ROWS = 1000;
const MAX_OUTPUT_ROWS = 64;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
const RAD_TO_DEG = 180 / Math.PI;

const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);

function utcEpoch(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return null;
  const text = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i.exec(text);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day ||
      calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) return null;
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text) ? text : `${text}Z`;
  const milliseconds = Date.parse(zoned);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function hasDecayMarker(row) {
  if (typeof row.DECAY_DATE === 'string' && row.DECAY_DATE.trim()) return true;
  if (row.DECAYED === true || row.DECAYED === 1) return true;
  if (typeof row.DECAYED === 'string' && /^(?:true|yes|1)$/i.test(row.DECAYED.trim())) return true;
  return false;
}

function validAngle(value, inclusiveMaximum = true) {
  return finiteNumber(value) && value >= 0 && (inclusiveMaximum ? value <= 360 : value < 360);
}

function validateRow(row, nowMs) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || hasDecayMarker(row)) return null;
  const name = typeof row.OBJECT_NAME === 'string' ? row.OBJECT_NAME.trim() : '';
  const epochMs = utcEpoch(row.EPOCH);
  if (!Number.isInteger(row.NORAD_CAT_ID) || row.NORAD_CAT_ID < 1 || row.NORAD_CAT_ID > 999999999) return null;
  if (!name || name.length > 128 || epochMs === null) return null;
  if (nowMs - epochMs > MAX_AGE_MS || epochMs - nowMs > MAX_FUTURE_MS) return null;
  if (!finiteNumber(row.MEAN_MOTION) || row.MEAN_MOTION <= 0 || row.MEAN_MOTION >= 20) return null;
  if (!finiteNumber(row.ECCENTRICITY) || row.ECCENTRICITY < 0 || row.ECCENTRICITY >= 1) return null;
  if (!finiteNumber(row.INCLINATION) || row.INCLINATION < 0 || row.INCLINATION > 180) return null;
  if (!validAngle(row.RA_OF_ASC_NODE) || !validAngle(row.ARG_OF_PERICENTER) || !validAngle(row.MEAN_ANOMALY)) return null;
  if (!finiteNumber(row.BSTAR) || !finiteNumber(row.MEAN_MOTION_DOT) || !finiteNumber(row.MEAN_MOTION_DDOT)) return null;
  const fields = ['NORAD_CAT_ID', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION', 'RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT'];
  return Object.freeze({ ...Object.fromEntries(fields.map(key => [key, row[key]])), OBJECT_NAME: name, EPOCH: new Date(epochMs).toISOString(), epochMs });
}

export function parseOrbitalElements(payload, nowMs = Date.now()) {
  if (!finiteNumber(nowMs)) throw new TypeError('nowMs must be finite');
  let rows = payload;
  if (typeof payload === 'string') {
    try { rows = JSON.parse(payload); } catch { throw new TypeError('CelesTrak payload must be valid JSON'); }
  }
  if (!Array.isArray(rows)) throw new TypeError('CelesTrak payload must be a JSON array');
  if (rows.length > MAX_INPUT_ROWS) throw new RangeError(`CelesTrak payload exceeds ${MAX_INPUT_ROWS} rows`);

  const latestByCatalog = new Map();
  for (const candidate of rows) {
    const row = validateRow(candidate, nowMs);
    if (!row) continue;
    const previous = latestByCatalog.get(row.NORAD_CAT_ID);
    if (!previous || row.epochMs > previous.epochMs) latestByCatalog.set(row.NORAD_CAT_ID, row);
  }
  return Object.freeze([...latestByCatalog.values()]
    .sort((a, b) => b.epochMs - a.epochMs || a.NORAD_CAT_ID - b.NORAD_CAT_ID)
    .slice(0, MAX_OUTPUT_ROWS));
}

export function satellitePositions(elements, nowMs, sgp4) {
  if (!Array.isArray(elements)) throw new TypeError('elements must be an array');
  if (!finiteNumber(nowMs)) throw new TypeError('nowMs must be finite');
  for (const method of ['json2satrec', 'propagate', 'gstime', 'eciToGeodetic']) {
    if (typeof sgp4?.[method] !== 'function') throw new TypeError(`sgp4.${method} must be a function`);
  }

  const positions = [];
  for (const element of elements) {
    try {
      const satrec = sgp4.json2satrec(element);
      if (!satrec || satrec.error) continue;
      const state = sgp4.propagate(satrec, new Date(nowMs));
      if (!state || satrec.error || !state.position) continue;
      const gmst = sgp4.gstime(new Date(nowMs));
      if (!finiteNumber(gmst)) continue;
      const geodetic = sgp4.eciToGeodetic(state.position, gmst);
      if (!geodetic || !finiteNumber(geodetic.latitude) || !finiteNumber(geodetic.longitude) || !finiteNumber(geodetic.height)) continue;
      const latitude = geodetic.latitude * RAD_TO_DEG;
      const longitude = ((geodetic.longitude * RAD_TO_DEG + 540) % 360) - 180;
      if (latitude < -90 || latitude > 90 || geodetic.height <= 0 || geodetic.height >= 100000) continue;
      positions.push(Object.freeze({
        id: `catalog:${element.NORAD_CAT_ID}`,
        label: element.OBJECT_NAME,
        latitude,
        longitude,
        altitudeKm: geodetic.height,
        observedAt: element.epochMs ?? utcEpoch(element.EPOCH),
        positionAt: nowMs,
        kind: 'propagated',
        catalogId: element.NORAD_CAT_ID,
      }));
    } catch {
      // A bad element or one failed propagation must not hide the remaining catalog.
    }
  }
  return Object.freeze(positions);
}
