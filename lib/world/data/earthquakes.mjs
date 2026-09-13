const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FEATURES = 10_000;
const MAX_RECORDS = 1_000;

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeText(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

function safeEventUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "earthquake.usgs.gov"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function parseEarthquakes(payload, nowMs) {
  if (!payload || payload.type !== "FeatureCollection") {
    throw new TypeError("Expected a GeoJSON FeatureCollection");
  }
  if (!Number.isFinite(nowMs) || nowMs <= 0) {
    throw new TypeError("nowMs must be a positive finite epoch timestamp");
  }

  const generatedAt = payload.metadata?.generated;
  if (!Number.isFinite(generatedAt) || generatedAt <= 0) {
    throw new TypeError("metadata.generated must be a positive finite epoch timestamp");
  }
  if (generatedAt > nowMs + FIVE_MINUTES_MS) {
    throw new RangeError("metadata.generated is more than five minutes in the future");
  }
  if (!Array.isArray(payload.features)) {
    throw new TypeError("features must be an array");
  }
  if (payload.features.length > MAX_FEATURES) {
    throw new RangeError(`features exceeds the ${MAX_FEATURES} item input limit`);
  }

  const byId = new Map();
  const oldestAllowed = nowMs - DAY_MS;
  const newestAllowed = nowMs + FIVE_MINUTES_MS;

  for (const feature of payload.features) {
    const properties = feature?.properties;
    const coordinates = feature?.geometry?.coordinates;
    if (properties?.type !== "earthquake" || feature?.geometry?.type !== "Point") continue;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;

    const longitude = finiteNumber(coordinates[0]);
    const latitude = finiteNumber(coordinates[1]);
    const observedAt = finiteNumber(properties.time);
    const id = safeText(feature.id, 128);
    if (
      longitude === null || longitude < -180 || longitude > 180 ||
      latitude === null || latitude < -90 || latitude > 90 ||
      observedAt === null || observedAt <= 0 ||
      observedAt < oldestAllowed || observedAt > newestAllowed ||
      id === null
    ) continue;

    const updatedAt = finiteNumber(properties.updated) ?? observedAt;
    const record = {
      id,
      label: safeText(properties.place, 160) ?? "Earthquake",
      latitude,
      longitude,
      altitudeKm: null,
      observedAt,
      positionAt: observedAt,
      kind: "event",
      magnitude: finiteNumber(properties.mag),
      depthKm: finiteNumber(coordinates[2]),
      updatedAt,
      url: safeEventUrl(properties.url),
    };

    const existing = byId.get(id);
    if (!existing || record.updatedAt > existing.updatedAt) byId.set(id, record);
  }

  const records = [...byId.values()]
    .sort((a, b) => b.observedAt - a.observedAt || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .slice(0, MAX_RECORDS);

  return { generatedAt, records };
}
