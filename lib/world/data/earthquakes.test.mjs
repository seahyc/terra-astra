import assert from "node:assert/strict";
import test from "node:test";
import { parseEarthquakes } from "./earthquakes.mjs";

const NOW = 1_800_000_000_000;

function feature(overrides = {}) {
  return {
    type: "Feature",
    id: "us123",
    properties: {
      type: "earthquake",
      place: "Somewhere",
      time: NOW - 1_000,
      updated: NOW - 500,
      mag: 2.5,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us123",
      ...overrides.properties,
    },
    geometry: {
      type: "Point",
      coordinates: [103.8, 1.3, 12.4],
      ...overrides.geometry,
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !["properties", "geometry"].includes(key))),
  };
}

function feed(features, metadata = { generated: NOW }) {
  return { type: "FeatureCollection", metadata, features };
}

test("preserves null magnitude and depth without inventing altitude", () => {
  const input = feature({ properties: { mag: null }, geometry: { coordinates: [103.8, 1.3, null] } });
  const { records } = parseEarthquakes(feed([input]), NOW);
  assert.deepEqual(records[0], {
    id: "us123", label: "Somewhere", latitude: 1.3, longitude: 103.8,
    altitudeKm: null, observedAt: NOW - 1_000, positionAt: NOW - 1_000,
    kind: "event", magnitude: null, depthKm: null, updatedAt: NOW - 500,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us123",
  });
});

test("filters invalid coordinates", () => {
  const result = parseEarthquakes(feed([feature({ geometry: { coordinates: [181, 1, 2] } })]), NOW);
  assert.equal(result.records.length, 0);
});

test("filters non-earthquake event types", () => {
  const result = parseEarthquakes(feed([feature({ properties: { type: "quarry blast" } })]), NOW);
  assert.equal(result.records.length, 0);
});

test("deduplicates by id using the latest update and sorts newest observations first", () => {
  const olderRevision = feature({ properties: { updated: NOW - 900, mag: 1 } });
  const newerRevision = feature({ properties: { updated: NOW - 100, mag: 3 } });
  const newestEvent = feature({ id: "us999", properties: { time: NOW - 100, updated: NOW - 50 } });
  const { records } = parseEarthquakes(feed([olderRevision, newerRevision, newestEvent]), NOW);
  assert.deepEqual(records.map(({ id }) => id), ["us999", "us123"]);
  assert.equal(records[1].magnitude, 3);
});

test("filters events older than the rolling 24-hour window", () => {
  const stale = feature({ properties: { time: NOW - 24 * 60 * 60 * 1000 - 1, updated: NOW } });
  assert.equal(parseEarthquakes(feed([stale]), NOW).records.length, 0);
});

test("rejects malformed or excessively future-dated feed metadata", () => {
  assert.throws(() => parseEarthquakes(feed([], { generated: "now" }), NOW), TypeError);
  assert.throws(() => parseEarthquakes(feed([], { generated: NOW + 5 * 60 * 1000 + 1 }), NOW), RangeError);
});

test("sanitizes display text and rejects non-USGS or non-HTTPS event URLs", () => {
  const dirty = feature({ properties: { place: "A\u0000B<script>ignored as markup</script>", url: "https://example.com/x" } });
  const [record] = parseEarthquakes(feed([dirty]), NOW).records;
  assert.equal(record.label, "A B<script>ignored as markup</script>");
  assert.equal(record.url, null);
  assert.ok(record.label.length <= 160);
});
