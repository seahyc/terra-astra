import { createWorldDataService } from '@/lib/world/data/service.mjs';

// Public read-only feeds never call OpenAI or require a user's API credentials.
const workerCache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
const getData = createWorldDataService({ cache: workerCache });
export async function GET(request: Request) {
  const url = new URL(request.url), layer = url.pathname.split('/').pop();
  if (!['aircraft', 'satellites', 'earthquakes'].includes(layer ?? '')) return Response.json({ error: 'Unknown data layer.' }, { status: 404 });
  const lat = url.searchParams.get('lat'), lon = url.searchParams.get('lon');
  if ((lat === null) !== (lon === null) || lat === '' || lon === '') return Response.json({ error: 'Supply both lat and lon.' }, { status: 400 });
  const centre = lat === null ? undefined : { latitude: Number(lat), longitude: Number(lon) };
  if (centre && (!Number.isFinite(centre.latitude) || Math.abs(centre.latitude) > 90 || !Number.isFinite(centre.longitude) || Math.abs(centre.longitude) > 180)) return Response.json({ error: 'Invalid coordinates.' }, { status: 400 });
  const data = await getData(layer, centre);
  return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30', 'X-Content-Type-Options': 'nosniff' } });
}
