/** Geographic values are source data. Render exaggeration must not change these measurements. */
export type DataLayer = 'aircraft' | 'satellites' | 'earthquakes';
export type WorldDataRecord = Readonly<{
  id: string; label: string; latitude: number; longitude: number; altitudeKm: number | null;
  observedAt: number; positionAt: number; kind: 'observed' | 'propagated' | 'event';
  magnitude?: number | null; depthKm?: number | null; updatedAt?: number; url?: string | null;
  callsign?: string | null; address?: string; heading?: number | null; groundSpeedKnots?: number | null;
  altitudeReference?: 'WGS84' | 'barometric' | null; observationType?: string | null; catalogId?: number;
}>;
export type WorldDataSnapshot = Readonly<{
  version: 1; layer: DataLayer; status: 'fresh' | 'stale' | 'unavailable';
  source: { name: string; url: string; attribution: string; license: string; licenseUrl?: string };
  fetchedAt: number | null; generatedAt: number | null; expiresAt: number | null; coverage: string;
  centre?: { latitude: number; longitude: number }; radiusNM?: number; refreshAfterMs: number;
  records: readonly WorldDataRecord[]; error?: string;
}>;
