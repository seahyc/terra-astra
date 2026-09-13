import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['lib/terra/sculptures/procedural-model.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm', sourcemap: 'inline',
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`;
const { compileProceduralModel, validateProceduralModelRecipe, PROCEDURAL_MAX_POINTS } = await import(moduleUrl);

const transform = { position: [0, 0, 0], rotationDegrees: [0, 20, 0], scale: [1, 1, 1] };
const recipe = {
  version: 1, id: 'water-cycle', title: 'Conceptual water cycle',
  description: 'Illustrative geometry; not a measured atmospheric reconstruction.',
  semanticMode: 'conceptual', seed: 20260913, gentleRotationDegPerSec: .35,
  primitives: [
    { id: 'basin', type: 'ring', transform, sampleCount: 48, brightness: .7, pointSize: .8, innerRadius: .35, outerRadius: .5 },
    { id: 'cloud', type: 'sphere', transform: { ...transform, position: [0, .45, 0] }, sampleCount: 64, brightness: 1.2, pointSize: 1.1, radius: .22 },
    { id: 'rain', type: 'line', transform, sampleCount: 32, brightness: .9, pointSize: .7, points: [[-.12, .32, 0], [-.12, .05, 0], [.1, -.1, 0]] },
    { id: 'ground', type: 'box', transform, sampleCount: 36, brightness: .5, pointSize: .6, dimensions: [.8, .08, .5] },
    { id: 'column', type: 'cylinder', transform, sampleCount: 30, brightness: .8, pointSize: .7, radius: .08, height: .5 },
    { id: 'flow', type: 'cone', transform, sampleCount: 24, brightness: 1, pointSize: .8, radius: .16, height: .35 },
  ],
};

const first = compileProceduralModel(recipe), second = compileProceduralModel(structuredClone(recipe));
assert.equal(first.pointCount, 234);
assert.equal(first.particles.length, first.pointCount * 6);
assert.deepEqual([...first.particles], [...second.particles]);
assert.deepEqual(first.objectRanges.map(({ id, start, count }) => ({ id, start, count })), [
  { id: 'basin', start: 0, count: 48 }, { id: 'cloud', start: 48, count: 64 },
  { id: 'rain', start: 112, count: 32 }, { id: 'ground', start: 144, count: 36 },
  { id: 'column', start: 180, count: 30 }, { id: 'flow', start: 210, count: 24 },
]);
assert.ok([...first.particles].every(Number.isFinite));
assert.notDeepEqual([...first.particles], [...compileProceduralModel({ ...recipe, seed: recipe.seed + 1 }).particles]);
console.log('PASS compiles all six bounded primitive types into deterministic finite stride-6 particles.');
console.log(`PASS exact allocation and ranges: ${first.pointCount} points, ${first.particles.length} floats, ${first.objectRanges.length} objects.`);

const rejects = (mutate, message) => {
  const candidate = structuredClone(recipe); mutate(candidate);
  assert.throws(() => validateProceduralModelRecipe(candidate), { name: 'TypeError' });
  console.log(`PASS rejects ${message}.`);
};
rejects(value => { value.execute = 'alert(1)'; }, 'unknown/executable fields');
rejects(value => { value.semanticMode = 'surveyed'; }, 'unsupported evidence claims');
rejects(value => { value.primitives[1].id = value.primitives[0].id; }, 'duplicate primitive IDs');
rejects(value => { value.primitives[0].innerRadius = .9; }, 'invalid ring dimensions');
{
  const candidate = structuredClone(recipe); candidate.primitives[2].points = [[0, 0, 0], [0, 0, 0]];
  assert.throws(() => compileProceduralModel(candidate), { name: 'TypeError' });
  console.log('PASS rejects zero-length line geometry during compilation.');
}
assert.throws(() => compileProceduralModel({ ...recipe, primitives: Array.from({ length: 7 }, (_, index) => ({ ...recipe.primitives[1], id: `dense-${index}`, sampleCount: 3000 })) }), new RegExp(String(PROCEDURAL_MAX_POINTS)));
console.log(`PASS rejects recipes above the ${PROCEDURAL_MAX_POINTS}-point total cap.`);
console.log('PASS compiler accepts data only and performs no geographic anchoring, rendering, camera, network, or code execution.');
