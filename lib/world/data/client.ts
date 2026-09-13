'use client';
import type { DataLayer, WorldDataRecord, WorldDataSnapshot } from './types';

type Centre = { latitude: number; longitude: number };
/** Reject out-of-order and expired snapshots before any renderer receives them. */
export function currentRecords(snapshot: WorldDataSnapshot, now: number): readonly WorldDataRecord[] {
  if (snapshot.status === 'unavailable' || snapshot.expiresAt === null || snapshot.expiresAt <= now) return [];
  return snapshot.records.filter(record => Number.isFinite(record.latitude) && Math.abs(record.latitude) <= 90 && Number.isFinite(record.longitude) && Math.abs(record.longitude) <= 180 && Number.isFinite(record.observedAt)
    && (record.kind !== 'observed' || now - record.observedAt <= 120000)
    && (record.kind !== 'propagated' || now - record.observedAt <= 259200000)
    && (record.kind !== 'event' || now - record.observedAt <= 86400000));
}

export function createWorldDataPoller(onSnapshot: (layer: DataLayer, snapshot: WorldDataSnapshot | null) => void, {
  fetchImpl = fetch,
  now = Date.now,
  visibilityDocument = typeof document === 'undefined' ? null : document,
}: { fetchImpl?: typeof fetch; now?: () => number; visibilityDocument?: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> | null } = {}) {
  type Slot = { enabled: boolean; centre: Centre; generation: number; timer?: ReturnType<typeof setTimeout>; timeout?: ReturnType<typeof setTimeout>; expiry?: ReturnType<typeof setTimeout>; controller?: AbortController; snapshot: WorldDataSnapshot | null };
  const slots = new Map<DataLayer, Slot>();
  let disposed = false;
  function clear(slot: Slot) { clearTimeout(slot.timer); clearTimeout(slot.timeout); clearTimeout(slot.expiry); slot.controller?.abort(); slot.generation++; }
  function publish(layer: DataLayer, slot: Slot) {
    const snapshot = slot.snapshot;
    onSnapshot(layer, snapshot ? { ...snapshot, records: currentRecords(snapshot, now()) } : null);
    clearTimeout(slot.expiry);
    if (snapshot && snapshot.status !== 'unavailable') {
      const times = [snapshot.expiresAt ?? now(), ...snapshot.records.filter(r => r.kind === 'observed').map(r => r.observedAt + 120000)];
      const next = Math.min(...times.filter(t => t > now()));
      if (Number.isFinite(next)) slot.expiry = setTimeout(() => { if (!disposed && slot.enabled) publish(layer, slot); }, Math.max(10, next - now() + 1));
    }
  }
  async function refresh(layer: DataLayer, slot: Slot) {
    if (disposed || !slot.enabled || visibilityDocument?.hidden) return;
    const generation = ++slot.generation;
    const controller = new AbortController(); slot.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 15000); slot.timeout = timeout;
    const params = layer === 'aircraft' ? `?lat=${slot.centre.latitude}&lon=${slot.centre.longitude}` : '';
    try {
      const response = await fetchImpl(`/api/world-data/${layer}${params}`, { signal: controller.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable data');
      const snapshot = await response.json() as WorldDataSnapshot;
      if (snapshot.version !== 1 || snapshot.layer !== layer || !Array.isArray(snapshot.records) || snapshot.records.length > 1000 || !['fresh','stale','unavailable'].includes(snapshot.status)) throw new Error('Invalid data');
      if (!snapshot.source || typeof snapshot.source.name !== 'string' || (snapshot.expiresAt !== null && !Number.isFinite(snapshot.expiresAt)) || snapshot.records.some(r => !r || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude) || !Number.isFinite(r.observedAt) || !['observed','event','propagated'].includes(r.kind))) throw new Error('Invalid data records');
      if (disposed || !slot.enabled || generation !== slot.generation) return;
      slot.snapshot = snapshot; publish(layer, slot);
    } catch {
      if (disposed || !slot.enabled || generation !== slot.generation) return;
      // Previously received observations may remain only inside their own expiry window.
      if (slot.snapshot) slot.snapshot = { ...slot.snapshot, status: slot.snapshot.expiresAt !== null && slot.snapshot.expiresAt > now() ? 'stale' : 'unavailable' };
      publish(layer, slot);
    } finally {
      clearTimeout(timeout);
      if (!disposed && slot.enabled && generation === slot.generation) slot.timer = setTimeout(() => void refresh(layer, slot), layer === 'satellites' ? 30000 : 60000);
    }
  }
  function visibility() {
    for (const [layer, slot] of slots) {
      clear(slot);
      if (slot.enabled) { publish(layer, slot); if (!visibilityDocument?.hidden) void refresh(layer, slot); }
    }
  }
  visibilityDocument?.addEventListener('visibilitychange', visibility);
  return {
    setLayer(layer: DataLayer, enabled: boolean, centre: Centre = { latitude: 1.3, longitude: 103.85 }) {
      if (disposed) return;
      if (!Number.isFinite(centre.latitude) || Math.abs(centre.latitude) > 90 || !Number.isFinite(centre.longitude) || Math.abs(centre.longitude) > 180) return;
      const previous = slots.get(layer);
      const changed = !previous || previous.enabled !== enabled || (layer === 'aircraft' && (Math.round(previous.centre.latitude) !== Math.round(centre.latitude) || Math.round(previous.centre.longitude) !== Math.round(centre.longitude)));
      if (!changed) return;
      const slot = previous ?? { enabled: false, centre, generation: 0, snapshot: null };
      clear(slot); slot.enabled = enabled; slot.centre = centre; slot.snapshot = null; slots.set(layer, slot);
      onSnapshot(layer, null);
      if (enabled) void refresh(layer, slot);
    },
    dispose() { disposed = true; visibilityDocument?.removeEventListener('visibilitychange', visibility); for (const slot of slots.values()) clear(slot); slots.clear(); },
  };
}
