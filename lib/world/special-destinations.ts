/** Additive, static destination configuration. No change to YC command payloads. */
export const SPECIAL_TARGETS = [
  { id: 'palm-jumeirah', label: 'Palm Jumeirah', lat: 25.1124, lon: 55.139,
    tier: 'city' as const, detail: 'Dubai: palm, crescent and coast. Procedural activity.' },
  { id: 'makkah', label: 'Makkah', lat: 21.4225172, lon: 39.8261942, tier: 'city' as const, detail: 'Masjid al-Haram. An interpretive collective flow.' },
];
export const SPECIAL_CITIES: Record<string, { bounds: [number, number, number, number]; feather: number; cityAltitude: number; streetAltitude: number; minAltitude?: number; desktopOffset: number }> = {
  'makkah': { bounds: [39.802, 21.402, 39.85, 21.445], feather: .005, cityAltitude: .0004, streetAltitude: .00013, minAltitude: .00006, desktopOffset: .04 },
  'palm-jumeirah': { bounds: [55.085, 25.035, 55.235, 25.165], feather: .015, cityAltitude: .0018, streetAltitude: .00075, desktopOffset: .04 },
};
export function specialFeather(id: string, lon: number, lat: number) {
  const config = SPECIAL_CITIES[id];
  if (!config) return 0;
  const [west, south, east, north] = config.bounds;
  const t = Math.max(0, Math.min(1, Math.min(lon-west, east-lon, lat-south, north-lat) / config.feather));
  return t*t*(3-2*t);
}
