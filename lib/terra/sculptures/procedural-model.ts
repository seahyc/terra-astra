/**
 * Safe, data-only recipes for illustrative starlight models.
 * Coordinates are local and normalized; geographic anchoring belongs to the
 * validated world-command boundary. These shapes are conceptual, not surveys.
 */

export const PROCEDURAL_MODEL_VERSION = 1 as const;
export const PROCEDURAL_PARTICLE_STRIDE = 6;
export const PROCEDURAL_MAX_OBJECTS = 24;
export const PROCEDURAL_MAX_POINTS = 20_000;
export const PROCEDURAL_MAX_POINTS_PER_OBJECT = 3_000;

type Vec3 = readonly [number, number, number];
export type ProceduralTransform = Readonly<{
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
}>;
type PrimitiveBase = Readonly<{
  id: string;
  transform: ProceduralTransform;
  sampleCount: number;
  brightness: number;
  pointSize: number;
}>;
export type ProceduralPrimitive =
  | (PrimitiveBase & Readonly<{ type: 'box'; dimensions: Vec3 }>)
  | (PrimitiveBase & Readonly<{ type: 'cylinder' | 'cone'; radius: number; height: number }>)
  | (PrimitiveBase & Readonly<{ type: 'sphere'; radius: number }>)
  | (PrimitiveBase & Readonly<{ type: 'ring'; innerRadius: number; outerRadius: number }>)
  | (PrimitiveBase & Readonly<{ type: 'line'; points: readonly Vec3[] }>);
export type ProceduralModelRecipe = Readonly<{
  version: 1;
  id: string;
  title: string;
  description: string;
  semanticMode: 'conceptual';
  seed: number;
  gentleRotationDegPerSec: number;
  primitives: readonly ProceduralPrimitive[];
}>;
export type ProceduralObjectRange = Readonly<{ id: string; type: ProceduralPrimitive['type']; start: number; count: number }>;
export type CompiledProceduralModel = Readonly<{
  recipe: ProceduralModelRecipe;
  particles: Float32Array;
  stride: 6;
  pointCount: number;
  objectRanges: readonly ProceduralObjectRange[];
}>;

const RECIPE_KEYS = ['version', 'id', 'title', 'description', 'semanticMode', 'seed', 'gentleRotationDegPerSec', 'primitives'] as const;
const BASE_KEYS = ['id', 'type', 'transform', 'sampleCount', 'brightness', 'pointSize'] as const;
const TRANSFORM_KEYS = ['position', 'rotationDegrees', 'scale'] as const;
const TYPE_KEYS = {
  box: ['dimensions'], cylinder: ['radius', 'height'], cone: ['radius', 'height'],
  sphere: ['radius'], ring: ['innerRadius', 'outerRadius'], line: ['points'],
} as const;

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object.`);
  return value as Record<string, unknown>;
}
function strictKeys(value: Record<string, unknown>, allowed: readonly string[], name: string) {
  const extra = Object.keys(value).filter(key => !allowed.includes(key));
  if (extra.length) throw new TypeError(`${name} has unsupported field: ${extra[0]}.`);
}
function text(value: unknown, name: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new TypeError(`${name} must be 1-${max} characters.`);
  return value.trim();
}
function numberIn(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new TypeError(`${name} must be a finite number from ${min} to ${max}.`);
  return value;
}
function integerIn(value: unknown, name: string, min: number, max: number) {
  const parsed = numberIn(value, name, min, max);
  if (!Number.isInteger(parsed)) throw new TypeError(`${name} must be an integer.`);
  return parsed;
}
function vec3(value: unknown, name: string, min: number, max: number): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${name} must contain exactly three numbers.`);
  return value.map((item, index) => numberIn(item, `${name}[${index}]`, min, max)) as [number, number, number];
}
function parseTransform(input: unknown, name: string): ProceduralTransform {
  const value = record(input, name); strictKeys(value, TRANSFORM_KEYS, name);
  return Object.freeze({
    position: Object.freeze(vec3(value.position, `${name}.position`, -1, 1)),
    rotationDegrees: Object.freeze(vec3(value.rotationDegrees, `${name}.rotationDegrees`, -180, 180)),
    scale: Object.freeze(vec3(value.scale, `${name}.scale`, .01, 2)),
  });
}
function parsePrimitive(input: unknown, index: number): ProceduralPrimitive {
  const name = `primitives[${index}]`, value = record(input, name);
  if (!['box', 'cylinder', 'cone', 'sphere', 'ring', 'line'].includes(String(value.type))) throw new TypeError(`${name}.type is unsupported.`);
  const type = value.type as keyof typeof TYPE_KEYS;
  strictKeys(value, [...BASE_KEYS, ...TYPE_KEYS[type]], name);
  const base = {
    id: text(value.id, `${name}.id`, 48), type,
    transform: parseTransform(value.transform, `${name}.transform`),
    sampleCount: integerIn(value.sampleCount, `${name}.sampleCount`, 8, PROCEDURAL_MAX_POINTS_PER_OBJECT),
    brightness: numberIn(value.brightness, `${name}.brightness`, .1, 2),
    pointSize: numberIn(value.pointSize, `${name}.pointSize`, .1, 4),
  };
  if (type === 'box') return Object.freeze({ ...base, type, dimensions: Object.freeze(vec3(value.dimensions, `${name}.dimensions`, .01, 2)) });
  if (type === 'cylinder' || type === 'cone') return Object.freeze({ ...base, type, radius: numberIn(value.radius, `${name}.radius`, .005, 1), height: numberIn(value.height, `${name}.height`, .01, 2) });
  if (type === 'sphere') return Object.freeze({ ...base, type, radius: numberIn(value.radius, `${name}.radius`, .005, 1) });
  if (type === 'ring') {
    const innerRadius = numberIn(value.innerRadius, `${name}.innerRadius`, .005, 1);
    const outerRadius = numberIn(value.outerRadius, `${name}.outerRadius`, .01, 1);
    if (innerRadius >= outerRadius) throw new TypeError(`${name}.innerRadius must be smaller than outerRadius.`);
    return Object.freeze({ ...base, type, innerRadius, outerRadius });
  }
  if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 16) throw new TypeError(`${name}.points must contain 2-16 points.`);
  return Object.freeze({ ...base, type: 'line', points: Object.freeze(value.points.map((point, pointIndex) => Object.freeze(vec3(point, `${name}.points[${pointIndex}]`, -1, 1)))) });
}

export function validateProceduralModelRecipe(input: unknown): ProceduralModelRecipe {
  const value = record(input, 'recipe'); strictKeys(value, RECIPE_KEYS, 'recipe');
  if (value.version !== PROCEDURAL_MODEL_VERSION) throw new TypeError('recipe.version must be 1.');
  if (value.semanticMode !== 'conceptual') throw new TypeError('recipe.semanticMode must be conceptual.');
  if (!Array.isArray(value.primitives) || value.primitives.length < 1 || value.primitives.length > PROCEDURAL_MAX_OBJECTS) throw new TypeError(`recipe.primitives must contain 1-${PROCEDURAL_MAX_OBJECTS} objects.`);
  const primitives = value.primitives.map(parsePrimitive);
  const ids = primitives.map(primitive => primitive.id);
  if (new Set(ids).size !== ids.length) throw new TypeError('Primitive IDs must be unique.');
  const pointCount = primitives.reduce((sum, primitive) => sum + primitive.sampleCount, 0);
  if (pointCount > PROCEDURAL_MAX_POINTS) throw new TypeError(`Recipe exceeds the ${PROCEDURAL_MAX_POINTS}-point limit.`);
  return Object.freeze({
    version: 1, id: text(value.id, 'recipe.id', 64), title: text(value.title, 'recipe.title', 100),
    description: text(value.description, 'recipe.description', 500), semanticMode: 'conceptual',
    seed: integerIn(value.seed, 'recipe.seed', 0, 0xffffffff),
    gentleRotationDegPerSec: numberIn(value.gentleRotationDegPerSec, 'recipe.gentleRotationDegPerSec', -2, 2),
    primitives: Object.freeze(primitives),
  });
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function hashId(seed: number, id: string) {
  let hash = seed >>> 0;
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619) >>> 0;
  return hash;
}
function rotateAndTransform(point: Vec3, transform: ProceduralTransform): [number, number, number] {
  let [x, y, z] = point; x *= transform.scale[0]; y *= transform.scale[1]; z *= transform.scale[2];
  const [rx, ry, rz] = transform.rotationDegrees.map(value => value * Math.PI / 180);
  let a = y * Math.cos(rx) - z * Math.sin(rx), b = y * Math.sin(rx) + z * Math.cos(rx); y = a; z = b;
  a = x * Math.cos(ry) + z * Math.sin(ry); b = -x * Math.sin(ry) + z * Math.cos(ry); x = a; z = b;
  a = x * Math.cos(rz) - y * Math.sin(rz); b = x * Math.sin(rz) + y * Math.cos(rz); x = a; y = b;
  return [x + transform.position[0], y + transform.position[1], z + transform.position[2]];
}
function sampleLine(points: readonly Vec3[], t: number): Vec3 {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1], point[2] - points[index][2]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) throw new TypeError('Line points must not all be identical.');
  let distance = t * total;
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index] || index === lengths.length - 1) {
      const local = lengths[index] ? distance / lengths[index] : 0, from = points[index], to = points[index + 1];
      return [from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local, from[2] + (to[2] - from[2]) * local];
    }
    distance -= lengths[index];
  }
  return points[points.length - 1];
}
function sample(primitive: ProceduralPrimitive, index: number, random: () => number): Vec3 {
  const u = random(), v = random(), angle = u * Math.PI * 2;
  if (primitive.type === 'sphere') {
    const y = 1 - 2 * ((index + .5) / primitive.sampleCount), radial = Math.sqrt(Math.max(0, 1 - y * y));
    return [Math.cos(angle) * radial * primitive.radius, y * primitive.radius, Math.sin(angle) * radial * primitive.radius];
  }
  if (primitive.type === 'ring') {
    const radius = Math.sqrt(primitive.innerRadius ** 2 + v * (primitive.outerRadius ** 2 - primitive.innerRadius ** 2));
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  }
  if (primitive.type === 'cylinder') {
    if (index % 3) return [Math.cos(angle) * primitive.radius, (v - .5) * primitive.height, Math.sin(angle) * primitive.radius];
    const radius = Math.sqrt(v) * primitive.radius, y = index % 2 ? primitive.height / 2 : -primitive.height / 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  }
  if (primitive.type === 'cone') {
    if (index % 4) { const h = Math.sqrt(v); return [Math.cos(angle) * primitive.radius * h, primitive.height * (.5 - h), Math.sin(angle) * primitive.radius * h]; }
    const radius = Math.sqrt(v) * primitive.radius;
    return [Math.cos(angle) * radius, -primitive.height / 2, Math.sin(angle) * radius];
  }
  if (primitive.type === 'box') {
    const [width, height, depth] = primitive.dimensions, face = index % 6, a = u - .5, b = v - .5;
    if (face < 2) return [(face ? 1 : -1) * width / 2, a * height, b * depth];
    if (face < 4) return [a * width, (face === 3 ? 1 : -1) * height / 2, b * depth];
    return [a * width, b * height, (face === 5 ? 1 : -1) * depth / 2];
  }
  if (primitive.type === 'line') return sampleLine(primitive.points, primitive.sampleCount === 1 ? 0 : index / (primitive.sampleCount - 1));
  throw new TypeError('Unsupported procedural primitive.');
}

export function compileProceduralModel(input: unknown): CompiledProceduralModel {
  const recipe = validateProceduralModelRecipe(input);
  const pointCount = recipe.primitives.reduce((sum, primitive) => sum + primitive.sampleCount, 0);
  const particles = new Float32Array(pointCount * PROCEDURAL_PARTICLE_STRIDE), ranges: ProceduralObjectRange[] = [];
  let cursor = 0, start = 0;
  for (const primitive of recipe.primitives) {
    const random = mulberry32(hashId(recipe.seed, primitive.id));
    ranges.push(Object.freeze({ id: primitive.id, type: primitive.type, start, count: primitive.sampleCount }));
    for (let index = 0; index < primitive.sampleCount; index++) {
      const point = rotateAndTransform(sample(primitive, index, random), primitive.transform);
      particles[cursor++] = point[0]; particles[cursor++] = point[1]; particles[cursor++] = point[2];
      particles[cursor++] = primitive.brightness * (.92 + random() * .16);
      particles[cursor++] = primitive.pointSize * (.9 + random() * .2);
      particles[cursor++] = random() * Math.PI * 2;
    }
    start += primitive.sampleCount;
  }
  return Object.freeze({ recipe, particles, stride: 6, pointCount, objectRanges: Object.freeze(ranges) });
}
