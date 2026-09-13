/**
 * Illustrative Angkor Wat particle study, based on the conceptual form described
 * by NASA Earth Observatory and UNESCO. It is not a surveyed reconstruction.
 *
 * Sources:
 * https://www.earthobservatory.nasa.gov/images/5112/angkor-wat
 * https://whc.unesco.org/en/list/668
 */

export const ANGKOR_PARTICLE_STRIDE = 6;
export const ANGKOR_GEOMETRY_COUNTS = {
  moat: 1400,
  causeway: 820,
  galleries: 3240,
  terraces: 2400,
  towers: 5500,
} as const;

type ParticleWriter = (east: number, height: number, north: number, brightness: number, size: number) => void;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function rectanglePerimeter(write: ParticleWriter, count: number, halfEast: number, halfNorth: number, height: number, brightness: number, size: number) {
  const perimeter = 4 * (halfEast + halfNorth);
  for (let i = 0; i < count; i++) {
    const distance = i / count * perimeter;
    let east: number, north: number;
    if (distance < 2 * halfEast) { east = -halfEast + distance; north = -halfNorth; }
    else if (distance < 2 * halfEast + 2 * halfNorth) { east = halfEast; north = -halfNorth + distance - 2 * halfEast; }
    else if (distance < 4 * halfEast + 2 * halfNorth) { east = halfEast - (distance - 2 * halfEast - 2 * halfNorth); north = halfNorth; }
    else { east = -halfEast; north = halfNorth - (distance - 4 * halfEast - 2 * halfNorth); }
    write(east, height, north, brightness, size);
  }
}

function gallery(write: ParticleWriter, count: number, halfEast: number, halfNorth: number, base: number, wallHeight: number) {
  const edgeCount = Math.floor(count * 0.58);
  rectanglePerimeter(write, edgeCount, halfEast, halfNorth, base + wallHeight, 1.05, 1.25);
  const perimeter = 4 * (halfEast + halfNorth);
  for (let i = edgeCount; i < count; i++) {
    const d = (i - edgeCount) / (count - edgeCount) * perimeter;
    const h = base + ((i * 0.61803398875) % 1) * wallHeight;
    if (d < 2 * halfEast) write(-halfEast + d, h, -halfNorth, .7, .82);
    else if (d < 2 * halfEast + 2 * halfNorth) write(halfEast, h, -halfNorth + d - 2 * halfEast, .7, .82);
    else if (d < 4 * halfEast + 2 * halfNorth) write(halfEast - (d - 2 * halfEast - 2 * halfNorth), h, halfNorth, .7, .82);
    else write(-halfEast, h, halfNorth - (d - 4 * halfEast - 2 * halfNorth), .7, .82);
  }
}

function terrace(write: ParticleWriter, count: number, halfEast: number, halfNorth: number, height: number) {
  const rings = 5;
  for (let ring = 0; ring < rings; ring++) {
    rectanglePerimeter(write, Math.floor(count / rings), halfEast - ring * .008, halfNorth - ring * .008, height + ring * .004, .76 + ring * .045, .86);
  }
}

function lotusTower(write: ParticleWriter, count: number, east0: number, north0: number, base: number, totalHeight: number, radius: number) {
  const tiers = [
    { y: 0, r: 1 }, { y: .08, r: .93 }, { y: .15, r: .82 },
    { y: .23, r: .74 }, { y: .34, r: .60 }, { y: .48, r: .48 },
    { y: .62, r: .39 }, { y: .75, r: .30 }, { y: .87, r: .20 },
    { y: .95, r: .105 }, { y: 1, r: .025 },
  ];
  const ribs = 12;
  for (let i = 0; i < count; i++) {
    const t = (i % 131) / 130;
    const tierIndex = Math.min(tiers.length - 2, Math.floor(t * (tiers.length - 1)));
    const local = t * (tiers.length - 1) - tierIndex;
    const a = tiers[tierIndex], b = tiers[tierIndex + 1];
    const y = a.y + (b.y - a.y) * local;
    const stepped = i % 5 < 2 ? a.r : a.r + (b.r - a.r) * local;
    const angle = (i % ribs) / ribs * Math.PI * 2 + Math.floor(i / 131) * .017;
    const petal = 1 + .085 * Math.cos(angle * ribs);
    const r = radius * stepped * petal;
    write(east0 + Math.cos(angle) * r, base + y * totalHeight, north0 + Math.sin(angle) * r, .92 + .28 * y, 1 + .5 * y);
  }
}

/** Returns particles with stride 6: east, height, north, brightness, size, phase. */
export function makeAngkorParticles(): Float32Array {
  const total = Object.values(ANGKOR_GEOMETRY_COUNTS).reduce((sum, value) => sum + value, 0);
  const output = new Float32Array(total * ANGKOR_PARTICLE_STRIDE);
  const random = mulberry32(66805112);
  let cursor = 0;
  const write: ParticleWriter = (east, height, north, brightness, size) => {
    const jitter = .00135;
    output[cursor++] = east + (random() - .5) * jitter;
    output[cursor++] = height + (random() - .5) * jitter * .45;
    output[cursor++] = north + (random() - .5) * jitter;
    output[cursor++] = brightness * (.91 + random() * .18);
    output[cursor++] = size * (.88 + random() * .24);
    output[cursor++] = random() * Math.PI * 2;
  };

  // Broad rectangular moat and its slightly inset second bank make the plan legible from above.
  rectanglePerimeter(write, 760, 1, .78, .005, .47, .72);
  rectanglePerimeter(write, 640, .93, .71, .009, .40, .66);

  // West-facing ceremonial causeway: paired luminous curbs plus a quiet center spine.
  for (let i = 0; i < ANGKOR_GEOMETRY_COUNTS.causeway; i++) {
    const t = i / (ANGKOR_GEOMETRY_COUNTS.causeway - 1);
    const east = -1 + t * .52;
    const lane = i % 3;
    write(east, .026 + (lane === 2 ? .004 : 0), lane === 0 ? -.025 : lane === 1 ? .025 : 0, lane === 2 ? .66 : .92, lane === 2 ? .75 : 1.02);
  }

  gallery(write, 1320, .47, .36, .045, .075);
  gallery(write, 1080, .36, .275, .115, .072);
  gallery(write, 840, .265, .20, .19, .066);

  terrace(write, 900, .43, .32, .08);
  terrace(write, 800, .325, .245, .15);
  terrace(write, 700, .235, .175, .225);

  const towerCount = ANGKOR_GEOMETRY_COUNTS.towers / 5;
  lotusTower(write, towerCount, 0, 0, .225, .475, .105);
  lotusTower(write, towerCount, -.19, -.135, .225, .315, .078);
  lotusTower(write, towerCount, .19, -.135, .225, .315, .078);
  lotusTower(write, towerCount, -.19, .135, .225, .315, .078);
  lotusTower(write, towerCount, .19, .135, .225, .315, .078);

  if (cursor !== output.length) throw new Error(`Angkor particle count mismatch: ${cursor / 6} of ${total}`);
  return output;
}
