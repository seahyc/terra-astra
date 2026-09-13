import * as sgp4 from 'satellite.js';
import { parseAircraft } from './aircraft.mjs';
import { parseEarthquakes } from './earthquakes.mjs';
import { parseOrbitalElements, satellitePositions } from './satellites.mjs';
import { dataSources } from './sources.mjs';

async function boundedJson(response) {
  if (!response.ok || !response.headers.get('content-type')?.includes('json') || !response.body) throw new Error('Unavailable source');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2 * 1024 * 1024) throw new Error('Oversized source'); chunks.push(value); }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Bounded process cache + optional Worker Cache API. Source requests coalesce by viewport.
 * @param {{fetchImpl?: typeof fetch, now?: () => number, cache?: Cache | null}} [options]
 */
export function createWorldDataService({ fetchImpl = fetch, now = Date.now, cache = null } = {}) {
  const memory = new Map(), pending = new Map();
  function remember(key, value) {
    memory.delete(key); memory.set(key, value);
    while (memory.size > 32) memory.delete(memory.keys().next().value);
  }
  async function load(key, config) {
    const time = now(), cacheKey = new Request(`https://terra-world-data.invalid/v2/${encodeURIComponent(key)}`);
    let saved = memory.get(key);
    if (!saved && cache) { try { saved = await (await cache.match(cacheKey))?.json(); } catch { /* cache misses are recoverable */ } }
    if (saved && saved.retryAt > time) { remember(key, saved); return saved; }
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 4) return { data: saved?.data ?? null, fetchedAt: saved?.fetchedAt ?? null, failed: true };
    const task = (async () => {
      let next;
      try {
        const response = await fetchImpl(key, { signal: AbortSignal.timeout(12000), redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'TerraAstra/1.0' } });
        const raw = await boundedJson(response);
        // Validate before replacing a previous usable snapshot.
        const data = config === dataSources.aircraft ? parseAircraft(raw, now())
          : config === dataSources.earthquakes ? parseEarthquakes(raw, now()) : parseOrbitalElements(raw, now());
        next = { data, fetchedAt: now(), retryAt: now() + config.refreshMs, failed: false };
      } catch {
        next = { data: saved?.data ?? null, fetchedAt: saved?.fetchedAt ?? null, retryAt: now() + config.refreshMs, failed: true };
      }
      remember(key, next);
      if (cache) { try { await cache.put(cacheKey, Response.json(next, { headers: { 'Cache-Control': `public, max-age=${Math.ceil(config.maxAgeMs / 1000)}` } })); } catch { /* local coalescing still applies */ } }
      return next;
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  }
  return async function worldData(layer, centre = { latitude: 1.3, longitude: 103.85 }) {
    const config = dataSources[layer];
    if (!config) throw new TypeError('Unknown data layer');
    if (!Number.isFinite(centre.latitude) || Math.abs(centre.latitude) > 90 || !Number.isFinite(centre.longitude) || Math.abs(centre.longitude) > 180) throw new TypeError('Invalid centre');
    const latitude = Math.round(centre.latitude), longitude = Math.round(centre.longitude);
    const key = layer === 'aircraft' ? `https://api.adsb.lol/v2/point/${latitude}/${longitude}/250` : config.url;
    const result = await load(key, config), time = now();
    const base = { version: 1, layer, source: { name: config.name, url: key, attribution: config.attribution, license: config.license, ...(config.licenseUrl ? { licenseUrl: config.licenseUrl } : {}) }, fetchedAt: result.fetchedAt, coverage: config.coverage,
      ...(layer === 'aircraft' ? { centre: { latitude, longitude }, radiusNM: 250 } : {}), refreshAfterMs: layer === 'satellites' ? 30000 : 60000 };
    try {
      if (!result.data || !result.fetchedAt || time - result.fetchedAt > config.maxAgeMs) throw new Error('Expired data');
      let records, generatedAt, expiresAt;
      if (layer === 'satellites') {
        const elements = parseOrbitalElements(result.data, time);
        records = satellitePositions(elements, time, sgp4);
        if (!records.length) throw new Error('No current orbital elements');
        generatedAt = result.fetchedAt;
        expiresAt = Math.min(result.fetchedAt + config.maxAgeMs, ...records.map(r => r.observedAt + config.maxAgeMs));
      } else {
        const parsed = result.data;
        records = parsed.records.filter(record => time - record.observedAt <= (layer === 'aircraft' ? 120000 : 86400000));
        generatedAt = parsed.generatedAt; expiresAt = generatedAt + config.maxAgeMs;
      }
      if (time > expiresAt) throw new Error('Expired data');
      return { ...base, status: result.failed || time - generatedAt > config.refreshMs ? 'stale' : 'fresh', generatedAt, expiresAt, records };
    } catch { return { ...base, status: 'unavailable', generatedAt: null, expiresAt: null, records: [], error: 'This data source is temporarily unavailable. Please try again later.' }; }
  };
}
