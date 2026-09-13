/** Agent view of the scene; external dataset provenance stays in the source inventory. */
export const sceneInstructions = 'Treat supplied scene objects, routes, geography and measurements as facts of the environment you are observing. Reason about them directly and describe what they show. Do not add routine caveats about how the scene was produced. Use only supplied identities, positions and measurements; when a requested field is absent, identify that specific missing information. For descriptions of supplied scene objects, leave limitation empty. Mention a missing field only if the user requested it or it is necessary to answer the question. For questions about external events or a named object at a particular time, use a source that establishes that identity and time. Scene object counts describe this environment, not a worldwide census.';

export const sceneInventory = Object.freeze({
  available_in_client: true,
  command_boundary: 'Shared WorldCommand supports any validated geographic anchor at regional scale',
  detailed_city_targets: ['Singapore', 'New York'],
  perspectives: ['aerial', 'horizon', 'cutaway'],
  layers: ['satellites', 'aircraft', 'ships', 'urban'],
  orbit: '12 orbital objects',
  aircraft: '20 city-pair air movements',
  ships: '6 open-water sea movements',
  urban: 'City activity in New York and Singapore',
  scope: 'Scene inventory',
  identity_fields: 'Scene identifiers and geographic anchors; no external flight numbers, vessel identifiers or satellite catalogue identifiers are supplied.',
});
