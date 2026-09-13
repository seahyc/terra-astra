import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrbitalElements, satellitePositions } from './satellites.mjs';

const now = Date.parse('2026-09-13T00:00:00Z');
const valid = (overrides = {}) => ({
  OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544,
  EPOCH: '2026-09-12T14:16:43.974624', MEAN_MOTION: 15.49,
  ECCENTRICITY: 0.0004, INCLINATION: 51.64, RA_OF_ASC_NODE: 10,
  ARG_OF_PERICENTER: 20, MEAN_ANOMALY: 30, BSTAR: 0.0001,
  MEAN_MOTION_DOT: 0.00001, MEAN_MOTION_DDOT: 0, ...overrides,
});

test('parses CelesTrak OMM, treats an unzoned epoch as UTC, and deduplicates to latest', () => {
  const rows = parseOrbitalElements(JSON.stringify([
    valid({ EPOCH: '2026-09-12T10:00:00Z' }),
    valid(),
  ]), now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].EPOCH, '2026-09-12T14:16:43.974Z');
  assert.equal(rows[0].epochMs, Date.parse('2026-09-12T14:16:43.974Z'));
});

test('rejects stale, too-future, decayed, malformed, null numeric, and oversized payloads', () => {
  const rows = parseOrbitalElements([
    valid({ NORAD_CAT_ID: 1, EPOCH: '2026-09-09T23:59:59Z' }),
    valid({ NORAD_CAT_ID: 2, EPOCH: '2026-09-14T00:00:01Z' }),
    valid({ NORAD_CAT_ID: 3, DECAY_DATE: '2026-09-12' }),
    valid({ NORAD_CAT_ID: 4, BSTAR: null }),
    valid({ NORAD_CAT_ID: 5, ECCENTRICITY: 1 }),
    valid({ NORAD_CAT_ID: 6, EPOCH: '2026-02-30T00:00:00Z' }),
  ], now);
  assert.deepEqual(rows, []);
  assert.throws(() => parseOrbitalElements(Array.from({ length: 1001 }, valid), now), /exceeds 1000/);
});

test('caps accepted output at 64 records', () => {
  const input = Array.from({ length: 70 }, (_, i) => valid({ NORAD_CAT_ID: i + 1 }));
  assert.equal(parseOrbitalElements(input, now).length, 64);
});

test('converts injected SGP4 geodetic radians to bounded public coordinates', () => {
  const elements = parseOrbitalElements([valid()], now);
  const calls = [];
  const sgp4 = {
    json2satrec: element => ({ element, error: 0 }),
    propagate: (satrec, date) => { calls.push(date.getTime()); return { position: { x: 1, y: 2, z: 3 } }; },
    gstime: date => { calls.push(date.getTime()); return 1.25; },
    eciToGeodetic: () => ({ latitude: Math.PI / 6, longitude: 3 * Math.PI / 2, height: 420.5 }),
  };
  assert.deepEqual(satellitePositions(elements, now, sgp4), [{
    id: 'catalog:25544', label: 'ISS (ZARYA)', latitude: 29.999999999999996,
    longitude: -90, altitudeKm: 420.5, observedAt: elements[0].epochMs,
    positionAt: now, kind: 'propagated', catalogId: 25544,
  }]);
  assert.deepEqual(calls, [now, now]);
});

test('omits propagation failures, satrec errors, and invalid coordinates without fallback', () => {
  const elements = parseOrbitalElements([valid()], now);
  const base = {
    json2satrec: () => ({ error: 0 }), propagate: () => null,
    gstime: () => 0, eciToGeodetic: () => ({ latitude: 0, longitude: 0, height: 1 }),
  };
  assert.deepEqual(satellitePositions(elements, now, base), []);
  assert.deepEqual(satellitePositions(elements, now, { ...base, propagate: () => ({ position: {} }), eciToGeodetic: () => ({ latitude: NaN, longitude: 0, height: 1 }) }), []);
  assert.deepEqual(satellitePositions(elements, now, { ...base, json2satrec: () => ({ error: 6 }), propagate: () => assert.fail('must not propagate errored satrec') }), []);
});
