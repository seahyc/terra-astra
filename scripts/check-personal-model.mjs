// Run with Node >=22.13. Exercises the real catalogue boundary; no browser or network.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const personalRoot = new URL('../lib/personal/', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(personalRoot) && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
    return next(specifier + '.ts', context);
  }
  return next(specifier, context);
} });
const { placeCatalogue, catalogueLabel } = await import('../lib/personal/catalogue.ts');
const { personalPlaceRoles, validatePersonalPlaces } = await import('../lib/personal/model.ts');

assert.equal(placeCatalogue.length, 48);
assert.equal(new Set(placeCatalogue.map(place => place.id)).size, placeCatalogue.length);
for (const place of placeCatalogue) {
  assert.ok(Number.isFinite(place.lat) && Math.abs(place.lat) <= 90, place.id);
  assert.ok(Number.isFinite(place.lon) && Math.abs(place.lon) <= 180, place.id);
  assert.ok(place.sourceId && place.label && place.region, place.id);
  assert.ok(place.source === 'natural-earth' || place.source === 'geonames');
  assert.ok(Object.isFrozen(place));
}
const singapore = placeCatalogue.find(place => place.label === 'Singapore');
const london = placeCatalogue.find(place => place.label === 'London');
const tokyo = placeCatalogue.find(place => place.label === 'Tokyo');
assert.ok(singapore && london && tokyo);
assert.equal(london.region, 'United Kingdom', 'Do not silently select the London in Canada or the US.');
assert.deepEqual([singapore.lat, singapore.lon], [1.294979, 103.853875]);
assert.deepEqual([tokyo.lat, tokyo.lon], [35.686963, 139.749462]);
const valid = [singapore, london, tokyo].map((place, index) => ({ id: place.id, meaning: `  ${personalPlaceRoles[index]}  ` }));
const original = structuredClone(valid);
const result = validatePersonalPlaces(valid);
assert.ok(result.ok);
assert.deepEqual(valid, original, 'Validation must not mutate the draft.');
assert.deepEqual(result.places.map(place => place.meaning), [...personalPlaceRoles]);
assert.deepEqual(result.places.map(place => place.label), [singapore, london, tokyo].map(catalogueLabel));
assert.ok(Object.isFrozen(result.places) && result.places.every(Object.isFrozen));

const renamed = validatePersonalPlaces(valid.map(place => ({ ...place, label: 'Injected place' })));
assert.deepEqual(renamed, result, 'Only catalogue labels may reach the renderer.');
assert.deepEqual(validatePersonalPlaces(result.places), result, 'Canonical submitted values can initialize the draft again.');
const rejects = [
  undefined, null, {}, [], valid.slice(0, 2), [...valid, valid[0]],
  [null, valid[1], valid[2]],
  [{ meaning: 'Missing ID' }, valid[1], valid[2]],
  [{ id: 12, meaning: 'Wrong ID type' }, valid[1], valid[2]],
  [{ id: '__proto__', meaning: 'Unknown place' }, valid[1], valid[2]],
  [{ id: 'toString', meaning: 'Unknown place' }, valid[1], valid[2]],
  [{ id: 'not-a-place', meaning: 'Unknown place' }, valid[1], valid[2]],
  [valid[0], valid[0], valid[2]],
  [{ id: singapore.id }, valid[1], valid[2]],
  [{ ...valid[0], meaning: 100 }, valid[1], valid[2]],
  [{ ...valid[0], meaning: '  \n\t  ' }, valid[1], valid[2]],
  [{ ...valid[0], meaning: 'x'.repeat(81) }, valid[1], valid[2]],
  [{ ...valid[0], lat: Infinity, lon: NaN }, valid[1], valid[2]],
  [{ ...valid[0], lat: singapore.lat + 0.001, lon: singapore.lon }, valid[1], valid[2]],
  [{ ...valid[0], lat: singapore.lat }, valid[1], valid[2]],
  [{ ...valid[0], lat: String(singapore.lat), lon: singapore.lon }, valid[1], valid[2]],
];
for (const input of rejects) {
  const rejected = validatePersonalPlaces(input);
  assert.equal(rejected.ok, false, JSON.stringify(input));
  assert.ok(rejected.error.length > 15, 'Errors should explain recovery.');
}
assert.ok(validatePersonalPlaces([{ ...valid[0], meaning: 'x'.repeat(80) }, valid[1], valid[2]]).ok);
assert.ok(validatePersonalPlaces([{ ...valid[0], meaning: ' 家。 ' }, valid[1], valid[2]]).ok);

// Every catalogue point can form a valid constellation, including nearby localities
// and locations across longitude zero / hemispheres; geometry belongs to the engine.
for (let index = 0; index < placeCatalogue.length; index++) {
  const triplet = [0, 1, 2].map(offset => ({
    id: placeCatalogue[(index + offset) % placeCatalogue.length].id,
    meaning: personalPlaceRoles[offset],
  }));
  assert.ok(validatePersonalPlaces(triplet).ok);
}
console.log(`PASS: ${placeCatalogue.length} sourced places, canonical immutable output, ${rejects.length} invalid inputs, meaning boundaries, every catalogue place usable.`);
