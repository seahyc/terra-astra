// Reproducible demo evidence from the same coarse relief grid used by the globe.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sampleElevation } from '../lib/terra/spatial.ts';

const data = name => new URL('../public/data/' + name, import.meta.url);
const manifest = JSON.parse(readFileSync(data('relief-manifest.json'), 'utf8'));
const raw = readFileSync(data('relief-grid.bin'));
const { width, height } = manifest.grid;
if (raw.length !== width * height * 2) throw new Error('Unexpected relief grid size');
const grid = new Int16Array(width * height);
for (let i = 0; i < grid.length; i++) grid[i] = raw.readInt16LE(i * 2);
const longitude = 112.922;
const points = Array.from({ length: 121 }, (_, i) => {
  const latitude = Math.round((-6 - i * 0.05) * 100) / 100;
  return {
    latitude,
    longitude,
    distanceKm: Math.round(i * 0.05 * Math.PI / 180 * 6371 * 10) / 10,
    elevationM: Math.round(sampleElevation(grid, width, height, longitude, latitude)),
  };
});
const highest = points.reduce((a, b) => b.elevationM > a.elevationM ? b : a);
const lowest = points.reduce((a, b) => b.elevationM < a.elevationM ? b : a);
const profile = {
  id: 'java-north-south',
  question: 'Show me Java’s mountains and the ocean floor to its south. How far does the landscape drop?',
  source: manifest.source,
  sourceUrl: manifest.sourceUrl,
  sourceDOI: manifest.sourceDOI,
  sourceGridSha256: createHash('sha256').update(raw).digest('hex'),
  resolutionDegrees: 360 / width,
  sampling: 'Bilinear samples every 0.05 degrees from a 0.25-degree grid; spacing does not increase source resolution.',
  units: { distance: 'kilometres', elevation: 'metres relative to sea level' },
  bounds: { longitude, north: -6, south: -12 },
  highest,
  lowest,
  verticalRangeM: highest.elevationM - lowest.elevationM,
  limitations: [
    'These are smoothed grid samples, not measured summit heights or the maximum depth of the entire trench.',
    'The section follows one meridian across Java; it does not follow a Singapore-to-Java travel route.',
    'The globe exaggerates relief; its glowing interior is artistic and is not a geological measurement.',
    'These data describe surface shape. They do not establish tectonic causes or historical change.',
  ],
  points,
};
writeFileSync(data('sea-java-profile.json'), JSON.stringify(profile, null, 2) + '\n');
console.log(JSON.stringify({ points: points.length, highest, lowest, verticalRangeM: profile.verticalRangeM, sourceGridSha256: profile.sourceGridSha256 }, null, 2));
