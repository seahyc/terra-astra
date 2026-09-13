import test from 'node:test';
import assert from 'node:assert/strict';
import {prefersGeographicOverview,overviewLocation,modelLocation} from './model-view.mjs';
test('map requests do not select explanatory facility geometry',()=>{
 assert.equal(prefersGeographicOverview('Now show me the data centers in the US'),true);
 assert.equal(prefersGeographicOverview('Where are the data centers?'),true);
 assert.equal(prefersGeographicOverview('Show me the ports of Singapore and how it moves so many shipping containers'),false);
 assert.equal(prefersGeographicOverview("And what's the geometry of the streets in New York?"),false);
 assert.equal(prefersGeographicOverview('Show me Angkor Wat'),false);
});
test('four US clusters fit a US view',()=>{
 const view=overviewLocation([{latitude:39,longitude:-77.5},{latitude:32.8,longitude:-96.8},{latitude:33.4,longitude:-112.1},{latitude:41.9,longitude:-87.6}]);
 assert.ok(view.longitude < -90 && view.longitude > -100);assert.ok(view.span>=34.6);assert.ok(view.span<=60);
});
test('date-line anchors use the short longitude arc',()=>{
 const view=overviewLocation([{latitude:0,longitude:178},{latitude:2,longitude:-178}]);assert.equal(view.longitude,-180);assert.equal(view.span,8);
});
test('anchorless model uses this answer, never the preceding location',()=>{
 assert.equal(modelLocation({anchor:null},undefined,undefined),null);
 assert.equal(modelLocation({anchor:null},{name:'Virginia',latitude:39,longitude:-77},undefined).longitude,-77);
 assert.equal(modelLocation({anchor:{name:'Angkor',latitude:13,longitude:104}},{name:'Virginia',latitude:39,longitude:-77},undefined).longitude,104);
});

test('street geometry is selected regardless of place-word order',async()=>{
 const {matchLibrary}=await import('../../lib/terra/model-library/library.mjs');
 assert.equal(matchLibrary("And what's the geometry of the streets in New York?").id,'manhattan');
 assert.equal(matchLibrary('Why are New York streets a grid?').id,'manhattan');
});
