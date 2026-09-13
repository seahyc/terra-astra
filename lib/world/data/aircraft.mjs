const finite = v => typeof v === 'number' && Number.isFinite(v);
const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
export function parseAircraft(payload, nowMs) {
  if (!payload || !Array.isArray(payload.ac) || payload.ac.length > 10000 || !finite(payload.now) || payload.now <= 0 || payload.now > nowMs + 30000) throw new TypeError('Invalid aircraft snapshot');
  const generatedAt = payload.now; // ADSB.lol v2 uses milliseconds (readsb files use seconds).
  const found = new Map();
  for (const a of payload.ac) {
    if (!a || !finite(a.lat) || !finite(a.lon) || Math.abs(a.lat) > 90 || Math.abs(a.lon) > 180 || !finite(a.seen_pos) || a.seen_pos < 0) continue;
    const observedAt = generatedAt - a.seen_pos * 1000;
    if (nowMs - observedAt > 120000 || observedAt > nowMs + 30000) continue;
    const address = text(a.hex, 8).toLowerCase();
    if (!/^~?[a-f0-9]{6}$/.test(address)) continue;
    if (a.alt_baro === 'ground' || /^(?:C|D)/.test(a.category ?? '')) continue;
    const geometric = finite(a.alt_geom) && a.alt_geom >= -2000 && a.alt_geom <= 200000;
    const barometric = finite(a.alt_baro) && a.alt_baro >= -2000 && a.alt_baro <= 200000;
    const callsign = text(a.flight, 16) || null;
    const record = { id: `aircraft:${address}`, label: callsign || address.toUpperCase(), latitude: a.lat, longitude: a.lon,
      altitudeKm: geometric ? a.alt_geom * 0.0003048 : barometric ? a.alt_baro * 0.0003048 : null,
      altitudeReference: geometric ? 'WGS84' : barometric ? 'barometric' : null,
      observedAt, positionAt: observedAt, kind: 'observed', callsign, address,
      observationType: text(a.type, 32) || null,
      heading: finite(a.track) && a.track >= 0 && a.track < 360 ? a.track : null,
      groundSpeedKnots: finite(a.gs) && a.gs >= 0 && a.gs < 3000 ? a.gs : null };
    if (!found.has(record.id) || found.get(record.id).observedAt < observedAt) found.set(record.id, record);
  }
  return { generatedAt, records: [...found.values()].sort((a,b) => b.observedAt-a.observedAt).slice(0, 500) };
}
