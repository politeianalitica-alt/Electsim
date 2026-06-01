import { NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

// Se sirve bajo demanda (datos en tiempo real); el CDN la cachea con
// Cache-Control s-maxage. Sin esto, Next la prerenderiza en build y
// congelaría las incidencias del momento del despliegue.
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Alemania (Autobahn) itera ~110 autopistas

/**
 * Incidencias de tráfico en tiempo real (accidentes, obras, retenciones,
 * obstrucciones, cierres…) agregadas de varios países que publican su feed
 * de forma abierta (sin API key), vía sus National Access Points.
 *
 * Soporta tres formatos: DATEX II (XML, v2/v3), GeoJSON y RSS. Cada feed
 * indica su formato; el parseo evita dependencias de XML.
 *   ES — DGT (DATEX II v3)        NL — NDW (DATEX II v3, .xml.gz)
 *   FI — Digitraffic (GeoJSON)    GB — National Highways (RSS)
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type FeedFormat = 'datex' | 'geojson' | 'rss' | 'autobahn';

interface IncidentFeed {
  country: string; // ISO-2
  source: string;
  url: string;
  format: FeedFormat;
  portal?: string;
  headers?: Record<string, string>;
}

const FEEDS: IncidentFeed[] = [
  { country: 'ES', source: 'DGT', format: 'datex', url: 'https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml', portal: 'https://infocar.dgt.es/etraffic/' },
  { country: 'NL', source: 'NDW', format: 'datex', url: 'https://opendata.ndw.nu/actueel_beeld.xml.gz', portal: 'https://www.ndw.nu/' },
  {
    country: 'FI', source: 'Digitraffic', format: 'geojson',
    url: 'https://tie.digitraffic.fi/api/traffic-message/v1/messages?inactiveHours=0&includeAreaGeometry=false&situationType=TRAFFIC_ANNOUNCEMENT&situationType=ROAD_WORK',
    headers: { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'PoliteiaOsintMap' },
    portal: 'https://liikennetilanne.fintraffic.fi/',
  },
  { country: 'GB', source: 'National Highways', format: 'rss', url: 'https://m.highwaysengland.co.uk/feeds/rss/UnplannedEvents.xml', portal: 'https://nationalhighways.co.uk/' },
  { country: 'DE', source: 'Autobahn', format: 'autobahn', url: 'https://verkehr.autobahn.de/o/autobahn', portal: 'https://autobahn.de/' },
];

type Incident = { id: string; lat: number; lng: number; kind: string; road: string; type: string; country: string; source: string };

function classify(xtype: string, cause: string, detail: string): string {
  const c = `${cause} ${detail}`.toLowerCase();
  if (c.includes('accident')) return 'Accidente';
  if (c.includes('roadworks') || c.includes('roadmaintenance') || c.includes('construction')) return 'Obras';
  if (xtype === 'AbnormalTraffic' || c.includes('congestion') || c.includes('queue')) return 'Retención';
  if (xtype === 'GeneralObstruction' || xtype === 'VehicleObstruction' || c.includes('obstruction')) return 'Obstrucción';
  if (xtype === 'SpeedManagement') return 'Limitación de velocidad';
  if (xtype === 'PoorEnvironmentConditions' || xtype === 'NonWeatherRelatedRoadConditions' || c.includes('weather')) return 'Estado de la vía';
  if (xtype === 'RoadOrCarriagewayOrLaneManagement') return 'Obras / corte';
  return 'Incidencia';
}

// DATEX II (XML v2/v3), tolerante a prefijos de namespace.
function parseDatex(xml: string, feed: IncidentFeed): Incident[] {
  const out: Incident[] = [];
  const seen = new Set<string>();
  const blocks = xml.split(/<(?:\w+:)?situationRecord\b/);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const xtype = (b.match(/xsi:type="(?:\w+:)?(\w+)"/) || [])[1] || '';
    const id = (b.match(/\bid="([\w.\-]+)"/) || [])[1] || `${i}`;
    if (seen.has(id)) continue;
    const cause = (b.match(/<(?:\w+:)?causeType>([^<]+)/) || [])[1] || '';
    const detail = (b.match(/<(?:\w+:)?(?:roadMaintenanceType|\w*[Cc]auseType)>([^<]+)/) || [])[1] || '';
    const road = ((b.match(/<(?:\w+:)?roadName>([^<]+)/) || [])[1] || (b.match(/<(?:\w+:)?roadNumber>([^<]+)/) || [])[1] || '').trim();
    const lat = parseFloat((b.match(/<(?:\w+:)?latitude>([^<]+)/) || [])[1]);
    const lng = parseFloat((b.match(/<(?:\w+:)?longitude>([^<]+)/) || [])[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    seen.add(id);
    out.push({ id: `${feed.country.toLowerCase()}-inc-${id}`, lat, lng, kind: classify(xtype, cause, detail), road, type: xtype, country: feed.country, source: feed.source });
  }
  return out;
}

// GeoJSON de Digitraffic (Finlandia).
function parseGeoJson(json: any, feed: IncidentFeed): Incident[] {
  const out: Incident[] = [];
  for (const f of json.features || []) {
    const g = f.geometry || {};
    let lat: number, lng: number;
    if (g.type === 'Point' && Array.isArray(g.coordinates)) { lng = g.coordinates[0]; lat = g.coordinates[1]; }
    else if (g.type === 'LineString' && Array.isArray(g.coordinates) && g.coordinates.length) { lng = g.coordinates[0][0]; lat = g.coordinates[0][1]; }
    else continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const p = f.properties || {};
    const st = String(p.situationType || '');
    const ann = (p.announcements || [])[0] || {};
    const loc = (ann.locationDetails || {}).roadAddressLocation || {};
    const pp = loc.primaryPoint || {};
    const road = pp.roadName || (pp.roadAddress || {}).road || '';
    const kind = st === 'ROAD_WORK' ? 'Obras' : st === 'WEIGHT_RESTRICTION' ? 'Restricción' : 'Aviso de tráfico';
    const id = String(p.situationId || f.id || `${lat},${lng}`);
    out.push({ id: `fi-inc-${id}`, lat, lng, kind, road: String(road), type: st, country: feed.country, source: feed.source });
  }
  return out;
}

// RSS de National Highways (Reino Unido).
function parseRss(xml: string, feed: IncidentFeed): Incident[] {
  const out: Incident[] = [];
  const items = xml.split(/<item>/);
  for (let i = 1; i < items.length; i++) {
    const b = items[i];
    const lat = parseFloat((b.match(/<latitude>([^<]+)/) || [])[1]);
    const lng = parseFloat((b.match(/<longitude>([^<]+)/) || [])[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const road = ((b.match(/<road>([^<]+)/) || [])[1] || '').trim();
    const cat = ((b.match(/<category>([^<]+)/) || [])[1] || '').toLowerCase();
    const kind = cat.includes('accident') || cat.includes('incident') ? 'Accidente'
      : cat.includes('congestion') || cat.includes('delay') ? 'Retención'
      : cat.includes('road works') || cat.includes('roadworks') || cat.includes('maintenance') ? 'Obras'
      : cat.includes('closure') ? 'Obstrucción' : 'Incidencia';
    const id = ((b.match(/<guid[^>]*>([^<]+)/) || [])[1] || `${lat},${lng}`).replace(/[^\w.\-]/g, '').slice(-24);
    out.push({ id: `gb-inc-${id}`, lat, lng, kind, road, type: cat, country: feed.country, source: feed.source });
  }
  return out;
}

// Alemania — API Autobahn (JSON propio): hay que iterar por autopista
// (obras + avisos), con concurrencia limitada para no saturar.
async function fetchAutobahn(feed: IncidentFeed): Promise<Incident[]> {
  const base = feed.url.replace(/\/$/, '');
  const out: Incident[] = [];
  const seen = new Set<string>();
  try {
    const rRes = await fetch(`${base}/`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (!rRes.ok) return [];
    const roads: string[] = ((await rRes.json()) || {}).roads || [];
    const tasks: Array<() => Promise<void>> = [];
    for (const road of roads) {
      for (const svc of ['roadworks', 'warning'] as const) {
        tasks.push(async () => {
          try {
            const res = await fetch(`${base}/${encodeURIComponent(road)}/services/${svc}`, {
              headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000),
            });
            if (!res.ok) return;
            const data = await res.json();
            const items: any[] = data[svc] || [];
            for (const it of items) {
              const lat = parseFloat(it.coordinate?.lat);
              const lng = parseFloat(it.coordinate?.long);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
              const id = String(it.identifier || `${road}-${lat},${lng}`);
              if (seen.has(id)) continue;
              seen.add(id);
              const blocked = it.isBlocked === true || it.isBlocked === 'true';
              const kind = svc === 'roadworks' ? 'Obras' : blocked ? 'Obstrucción' : 'Incidencia';
              out.push({ id: `de-inc-${id.slice(-32)}`, lat, lng, kind, road, type: String(it.display_type || svc), country: feed.country, source: feed.source });
            }
          } catch { /* una autopista que falle no tumba el resto */ }
        });
      }
    }
    const CONC = 40;
    for (let i = 0; i < tasks.length; i += CONC) {
      await Promise.allSettled(tasks.slice(i, i + CONC).map((t) => t()));
    }
  } catch { /* silent */ }
  return out;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (feed): Promise<Incident[]> => {
        if (feed.format === 'autobahn') return fetchAutobahn(feed);
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': UA, Accept: '*/*', ...(feed.headers || {}) },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];
        if (feed.format === 'geojson') {
          return parseGeoJson(await res.json(), feed);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const text = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
        return feed.format === 'rss' ? parseRss(text, feed) : parseDatex(text, feed);
      }),
    );
    const incidents: Incident[] = [];
    const sources: Record<string, number> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const inc of r.value) {
          incidents.push(inc);
          sources[inc.source] = (sources[inc.source] || 0) + 1;
        }
      }
    }
    return NextResponse.json(
      { incidents, total: incidents.length, sources, countries: FEEDS.map((f) => f.country), timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ incidents: [], total: 0 });
  }
}
