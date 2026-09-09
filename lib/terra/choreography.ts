/** Shared, deterministic camera and light choreography. Altitude is in Earth radii. */
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };
export const fade = (n: number, start: number, end: number) => smooth((n - start) / (end - start));

export function flightProgress(t: number, fromAlt: number, toAlt: number, ascending: boolean) {
  const zoom = smooth(ascending ? t : (t - .1) / .9);
  const altitude = Math.exp(Math.log(fromAlt) + (Math.log(toAlt) - Math.log(fromAlt)) * zoom);
  // Keep the city beneath the camera until the regional map fits in view.
  const turn = ascending ? fade(altitude, .065, .85) : smooth(t / .42);
  return { altitude, turn: t >= 1 ? 1 : turn };
}

export function lightLevels(altitude: number) {
  const detail = 1 - fade(altitude, .004, .014);
  const footprint = Math.min(1, .0018 / altitude);
  return {
    global: fade(altitude, .004, .18),
    regional: 1 - fade(altitude, .18, .65),
    coast: (1 - fade(altitude, .009, .055)) * .35,
    city: detail * Math.pow(footprint, .65),
    cityFraction: Math.min(.88, .46 * Math.pow(.0018 / altitude, 1.45)),
    citySize: .58 * Math.pow(footprint, .3),
    people: 1 - fade(altitude, .0025, .009),
  };
}

/** Feather inside the OSM coverage bounds, with all authored places in the clear center. */
export function cityFeather(lon: number, lat: number) {
  const distance = Math.hypot((lon - 103.8525) / .055, (lat - 1.305) / .039);
  return 1 - fade(distance, .65, 1);
}

export function revealProgress(seconds: number, motion: boolean) {
  if (!motion) return { stars: 1, links: 1 };
  return { stars: fade(seconds, .15, .9), links: fade(seconds, .55, 2.65) };
}
