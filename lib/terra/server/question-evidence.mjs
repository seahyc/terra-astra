// Reviewed source excerpts, not answer templates. General routing remains model-driven.
// Keep observations scoped to their source and date; do not treat this as live telemetry.
const REVIEWED_AT = '2026-09-13';
const SOURCES = {
  java: { url: 'https://nora.nerc.ac.uk/id/eprint/530930/', title: 'Bongiovanni et al.: multibeam bathymetry of the deepest place in each ocean' },
  relief: { url: 'https://www.ncei.noaa.gov/products/etopo-global-relief-model', title: 'NOAA NCEI ETOPO Global Relief Model' },
  port: { url: 'https://www.singaporepsa.com/our-business/port/', title: 'PSA Singapore: Port and container terminals' },
  automation: { url: 'https://www.mot.gov.sg/what-we-do/automated-autonomous-vehicles/', title: 'Singapore Ministry of Transport: maritime automation' },
  trucking: { url: 'https://www.singaporepsa.com/wp-content/uploads/2024/09/Sustainability-at-PSA-Singapore-2023.pdf', title: 'PSA Singapore Sustainability 2023: container trucking (page 43)' },
};

/** Return a small relevant source packet, or null; never routes or answers a question. */
export function questionEvidence(question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 4000) return null;
  const q = question.normalize('NFKC').toLowerCase();
  const relevant_evidence = {};
  const sourceIds = new Set();
  const add = id => { sourceIds.add(id); return SOURCES[id].url; };
  const java = /\bjava\b/.test(q);
  const trench = /\btrench(?:es)?\b/.test(q);
  const profile = java && /\b(transect|profile|landscape|mountains?|elevation|drop)\b/.test(q);
  const marineDepth = /\b(ocean|seafloor|seabed|bathymetry)\b/.test(q) && /\b(deep|deepest|depth|bathymetry)\b/.test(q);
  const javaDepth = (java && (trench || marineDepth)) || (/\bsunda\b/.test(q) && trench);
  if (javaDepth) {
    relevant_evidence.java_trench = {
      scope: 'A surveyed maximum within the Java Trench; distinct from a sampled meridian profile.',
      survey: { maximum_depth_m: 7187, uncertainty_m: 13, site: 'Unnamed deep within the Java Trench, Indian Ocean', expedition_years: '2018–2019', method: 'Full-ocean-depth multibeam echosounder, corrected using full-depth CTD measurements', source_url: add('java') },
      profile_distinction: 'The supplied 121-point Java profile reaches -5361m on one meridian. That sample minimum is not the maximum depth of the trench; use the survey for a trench maximum question.',
    };
  }
  if (profile) {
    relevant_evidence.java_profile = {
      scope: 'Existing repository transect measurements; no claim of a full trench survey or summit measurement.',
      point_count: 121, longitude: 112.922, latitude_bounds: [-12, -6],
      highest_elevation_m: 984, lowest_elevation_m: -5361, vertical_range_m: 6345,
      provenance: { source_url: add('relief'), dataset: 'NOAA NCEI ETOPO 2022', repository_source: 'SEA_DATASET_INVENTORY.java_profile', sampling: 'Bilinear samples every 0.05 degrees from a 0.25-degree grid; 121 samples do not increase the source resolution.' },
      limitation: 'Only this north–south section; the minimum is not the deepest point of the Java Trench. A request for landscape drop concerns the vertical range, not ocean depth alone.',
    };
  }
  const singapore = /\bsingapore\b/.test(q) || /\btuas\b/.test(q) || /\bpasir\s+panjang\b/.test(q);
  const shipping = /\b(ports?|terminals?|containers?|shipping|transship(?:ment|ping)|tranship(?:ment|ping)|quay|cargo|cranes?)\b/.test(q);
  if (singapore && shipping) {
    relevant_evidence.singapore_port = {
      scope: 'Container-terminal logistics, with Tuas-specific automation identified separately.',
      facilities: { names: ['Pasir Panjang Terminals', 'Tuas Port'], facts: ['PSA terminals operate as an integrated facility.', 'Quay cranes serve vessels; electric automated yard cranes handle storage-yard operations.', 'PSA works with shipping lines as a container transshipment hub.'], source_url: add('port') },
      tuas_automation: { facts: ['Electrified automated yard cranes and driverless vehicles automate yard and wharf operations.', 'Automated Guided Vehicles operate at Tuas Port Phase 1.'], source_url: add('automation') },
      landside: { facts: ['The container trucking industry uses hauliers; PSA describes scheduling and resource matching through OptETruck.'], source_url: add('trucking') },
      explanatory_flow: { kind: 'Synthesis of the sourced terminal roles, not a tracked container journey', stages: ['Ship ↔ quay crane', 'Terminal vehicle transfer ↔ yard stacks and yard cranes', 'Onward vessel for transshipment, or landside trucks for local cargo'] },
      evidence_limits: ['These sources support a terminal crane/vehicle/yard/transshipment/truck explanation, not a rail-freight leg at Singapore container terminals.', 'No current throughput, queue, container position, vessel count or live efficiency measurement is supplied.', 'Automation described at Tuas does not establish that every Singapore terminal uses identical equipment.'],
    };
  }
  if (!Object.keys(relevant_evidence).length) return null;
  return { relevant_evidence: { reviewed_at: REVIEWED_AT, live: false, ...relevant_evidence }, sources: [...sourceIds].map(id => ({ ...SOURCES[id] })) };
}
