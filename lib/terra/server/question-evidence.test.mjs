import test from 'node:test';
import assert from 'node:assert/strict';
import { questionEvidence } from './question-evidence.mjs';

test('trench depth selects surveyed maximum, never substitutes transect minimum', () => {
  const packet = questionEvidence('How deep is the Java trench?');
  assert.equal(packet.relevant_evidence.java_trench.survey.maximum_depth_m, 7187);
  assert.equal(packet.relevant_evidence.java_trench.survey.uncertainty_m, 13);
  assert.match(packet.relevant_evidence.java_trench.profile_distinction, /not the maximum/);
  assert.equal(packet.relevant_evidence.java_profile, undefined);
  assert.equal(packet.sources.length, 1);
  assert.match(packet.sources[0].url, /nora.nerc.ac.uk/);
});

test('landscape question retains measured section scope rather than replacing it with trench maximum', () => {
  const packet = questionEvidence('How far does Java’s landscape drop into the ocean?');
  assert.equal(packet.relevant_evidence.java_profile.vertical_range_m, 6345);
  assert.equal(packet.relevant_evidence.java_profile.lowest_elevation_m, -5361);
  assert.equal(packet.relevant_evidence.java_trench, undefined);
  assert.equal(packet.sources.length, 1);
  assert.match(packet.sources[0].url, /ncei.noaa.gov/);
});

test('comparison can receive both scopes and source sets', () => {
  const packet = questionEvidence('Compare the Java profile to the deepest Java trench measurement.');
  assert.ok(packet.relevant_evidence.java_profile);
  assert.ok(packet.relevant_evidence.java_trench);
  assert.equal(packet.sources.length, 2);
});

test('Singapore shipping gets port-specific flow with supported modes, no live throughput', () => {
  const packet = questionEvidence('Show me the ports of Singapore and how it moves so many shipping containers');
  const evidence = packet.relevant_evidence.singapore_port;
  assert.ok(evidence);
  assert.equal(packet.relevant_evidence.java_trench, undefined);
  assert.equal(packet.relevant_evidence.live, false);
  assert.match(evidence.explanatory_flow.stages.join(' '), /Onward vessel.*trucks/);
  assert.match(evidence.evidence_limits.join(' '), /not a rail-freight leg/);
  assert.match(evidence.evidence_limits.join(' '), /No current throughput/);
  assert.equal(packet.sources.length, 3);
});

test('recognized geographic aliases retrieve matching source packets', () => {
  assert.ok(questionEvidence('How deep is the Sunda Trench?').relevant_evidence.java_trench);
  assert.ok(questionEvidence('How do Tuas container cranes work?').relevant_evidence.singapore_port);
  assert.ok(questionEvidence('Explain shipping at Pasir Panjang').relevant_evidence.singapore_port);
});

test('unrelated demo and ordinary questions do not acquire unrelated citations', () => {
  for (const question of ['Show me Angkor Wat', 'Now show me data centers in the US', 'What is the geometry of streets in New York?', 'How do I port Java code?', 'Why are Singapore houses expensive?', 'Explain Rotterdam container cranes', 'How does Java handle a deep copy?']) {
    assert.equal(questionEvidence(question), null, question);
  }
});

test('packets are bounded and callers cannot mutate future source metadata', () => {
  assert.equal(questionEvidence(null), null);
  assert.equal(questionEvidence(' '), null);
  assert.equal(questionEvidence('Java trench '.repeat(1000)), null);
  const question = 'Java trench depth and Singapore port containers';
  const packet = questionEvidence(question);
  assert.ok(JSON.stringify(packet).length < 6000);
  assert.equal(new Set(packet.sources.map(s => s.url)).size, packet.sources.length);
  packet.sources[0].url = 'https://invalid.example';
  assert.notEqual(questionEvidence(question).sources[0].url, 'https://invalid.example');
});
