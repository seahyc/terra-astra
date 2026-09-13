import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const root = new URL('../', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(root) && specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(specifier + '.ts', context);
  return next(specifier, context);
} });

const { catalogueTargetIdInQuestion, planLiveNavigation, suggestedPerspective, executeLiveNavigation } = await import('../components/terra-voice/world-navigator.ts');

assert.equal(catalogueTargetIdInQuestion('Why did New York grow around its harbour?'), 'new-york');
assert.equal(catalogueTargetIdInQuestion('Explain Singapore’s geography.'), 'singapore');
assert.equal(catalogueTargetIdInQuestion('How was the Mariana Trench formed?'), 'challenger-deep');
assert.equal(catalogueTargetIdInQuestion('Tell me about New Yorkshire.'), null, 'Place matching uses word boundaries');
assert.equal(suggestedPerspective('How do tectonic plates move above the mantle?'), 'cutaway');
assert.equal(suggestedPerspective('Help me read the mountain relief.'), 'horizon');
assert.equal(suggestedPerspective('How do these shipping routes connect?'), 'aerial');
assert.equal(suggestedPerspective('Why do cities grow?'), null);
assert.deepEqual(planLiveNavigation('Show New York from the horizon.').commands, [
  { type: 'flyTo', targetId: 'new-york' },
  { type: 'setPerspective', perspective: 'horizon' },
]);
assert.deepEqual(planLiveNavigation('Show a cutaway.').commands, [
  { type: 'setPerspective', perspective: 'cutaway' },
]);
assert.deepEqual(planLiveNavigation('Show the aerial view.').commands, [
  { type: 'setPerspective', perspective: 'aerial' },
]);
assert.equal(planLiveNavigation('Compare that with Namibia, and show both coasts from above.'), null, 'Comparison plus a visual request needs a complete backend answer');
assert.equal(planLiveNavigation('Contrast the two climates from above.'), null, 'Explanatory requests do not collapse to camera commands');
assert.equal(planLiveNavigation('Show the coast from above and describe what caused the dunes.'), null, 'Causal compound requests need the backend');

const ny = planLiveNavigation('Show me the vibe in New York.');
assert.deepEqual(ny.commands, [
  { type: 'flyTo', targetId: 'new-york' },
  { type: 'focusLayer', layer: 'urban', enabled: true },
]);
assert.match(ny.context, /tidal harbour/);
assert.doesNotMatch(ny.context, /supported|deterministic/);

assert.deepEqual(planLiveNavigation('Take me to Singapore.').commands, [{ type: 'flyTo', targetId: 'singapore' }]);
assert.deepEqual(planLiveNavigation('Where is the deepest trench?').commands, [{ type: 'flyTo', targetId: 'challenger-deep' }]);
assert.deepEqual(planLiveNavigation('Show me the satellites.').commands, [
  { type: 'setScale', tier: 'planet' },
  { type: 'focusLayer', layer: 'satellites', enabled: true },
]);

const flights = planLiveNavigation('Show flights over Tokyo.');
assert.deepEqual(flights.commands, [
  { type: 'setScale', tier: 'planet' },
  { type: 'focusLayer', layer: 'aircraft', enabled: true },
]);
assert.match(flights.context, /global layer/);
assert.doesNotMatch(flights.context, /live tracking|real.time position|illustration|procedural/i);

assert.equal(planLiveNavigation('What happened in New York in 2001?'), null);
assert.equal(planLiveNavigation('Tell me about Singapore history.'), null);
assert.equal(planLiveNavigation('How many flights are over Singapore right now?'), null);
assert.equal(planLiveNavigation('Why is the deepest trench so deep?'), null);
assert.equal(planLiveNavigation('Show satellites and explain their history.'), null);
assert.equal(planLiveNavigation('Follow BA249 today.'), null, 'A particular flight is not the decorative aircraft layer');
assert.equal(planLiveNavigation('Show flight BA249.'), null, 'A named flight is not the decorative aircraft layer');
assert.equal(planLiveNavigation('Follow Sentinel-2A.'), null, 'A particular satellite needs backend tracking support');
assert.equal(planLiveNavigation('Show satellite Sentinel-2A.'), null, 'A named satellite is not the decorative satellite layer');
assert.equal(planLiveNavigation('Rephrase the description of Singapore.'), null);
assert.equal(planLiveNavigation('Showcase satellites.'), null, 'Navigation verbs use word boundaries');
assert.equal(planLiveNavigation('Findings about Singapore are unrelated.'), null, 'Substrings do not become navigation commands');
assert.equal(planLiveNavigation('Take me to Tokyo.'), null);
assert.equal(planLiveNavigation('Show Paris city.'), null);
assert.equal(planLiveNavigation('Show street level in Tokyo.'), null);
assert.deepEqual(planLiveNavigation('Zoom to city level.').commands, [{ type: 'setScale', tier: 'city' }]);
assert.deepEqual(planLiveNavigation('Hide satellites.').commands, [{ type: 'focusLayer', layer: 'satellites', enabled: false }]);
assert.deepEqual(planLiveNavigation('Take me to Singapore and hide urban activity.').commands, [
  { type: 'flyTo', targetId: 'singapore' },
  { type: 'focusLayer', layer: 'urban', enabled: false },
]);
assert.match(planLiveNavigation('Take me to Singapore.').context, /Strait of Malacca/);
assert.deepEqual(planLiveNavigation('back').commands, [{ type: 'resetView' }]);

const accepted = [], dispatched = [];
const success = await executeLiveNavigation(ny, {
  signal: new AbortController().signal,
  onDispatch: (command, index) => dispatched.push({ command, index, acceptedAtDispatch: accepted.length }),
  send: async command => { accepted.push(command); return { ok: true, command }; },
});
assert.deepEqual(success, { ok: true, commandsAccepted: 2 });
assert.deepEqual(accepted, ny.commands);
assert.equal(dispatched[0].acceptedAtDispatch, 0, 'First dispatch callback is immediate');
assert.equal(dispatched[1].acceptedAtDispatch, 1, 'Commands are serialized');

const rejectedCalls = [];
const rejected = await executeLiveNavigation(ny, {
  signal: new AbortController().signal,
  send: async command => {
    rejectedCalls.push(command);
    return rejectedCalls.length === 1 ? { ok: false, command, reason: 'Camera unavailable.' } : { ok: true, command };
  },
});
assert.deepEqual(rejected, { ok: false, reason: 'Camera unavailable.', commandsAccepted: 0 });
assert.equal(rejectedCalls.length, 1, 'A rejection stops the sequence');

const before = new AbortController(); before.abort();
let beforeCalls = 0;
assert.deepEqual(await executeLiveNavigation(ny, {
  signal: before.signal,
  send: async command => { beforeCalls += 1; return { ok: true, command }; },
}), { ok: false, reason: 'Navigation was cancelled.', commandsAccepted: 0 });
assert.equal(beforeCalls, 0, 'Abort before dispatch sends nothing');

const after = new AbortController();
let afterCalls = 0;
assert.deepEqual(await executeLiveNavigation(ny, {
  signal: after.signal,
  send: async command => { afterCalls += 1; after.abort(); return { ok: true, command }; },
}), { ok: false, reason: 'Navigation was cancelled.', commandsAccepted: 1 });
assert.equal(afterCalls, 1, 'Abort after acceptance prevents the next command');

console.log('PASS: bounded Live plans cover New York, Singapore, Challenger Deep, satellites, global illustrated flights, broad-query fallback, serialized acceptance, rejection, and abort boundaries. Fake sender only; renderer bridge is checked separately.');
