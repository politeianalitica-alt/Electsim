import { NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

// Se sirve bajo demanda (datos en tiempo real); el CDN la cachea con
// Cache-Control s-maxage. Sin esto, Next la prerenderiza en build y
// congelaría las incidencias del momento del despliegue.
export const dynamic = 'force-dynamic';

/**
 * Incidencias de tráfico en tiempo real (accidentes, obras, retenciones,
 * obstrucciones, cierres…) agregadas de varios países que publican su
 * feed DATEX II de forma abierta (sin API key), vía sus National Access
 * Points. Hoy: España (DGT). El array FEEDS está listo para sumar más
 * países conforme se verifican sus feeds.
 *
 * Se parsea por bloques <situationRecord> con expresiones regulares
 * tolerantes al prefijo de namespace (sit:/loc: en DATEX v3, o sin prefijo
 * en v2), evitando dependencias de XML.
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

interface DatexFeed {
  country: string; // ISO-2
  source: string;
  url: string;
  portal?: string;
}

// Feeds DATEX II abiertos verificados (sin key).
const FEEDS: DatexFeed[] = [
  {
    country: 'ES',
    source: 'DGT',
    url: 'https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml',
    portal: 'https://infocar.dgt.es/etraffic/',
  },
  {
    country: 'NL',
    source: 'NDW',
    url: 'https://opendata.ndw.nu/actueel_beeld.xml.gz',
    portal: 'https://www.ndw.nu/',
  },
];

function classify(xtype: string, cause: string, detail: string): string {
  const c = `${cause} ${detail}`.toLowerCase();
  if (c.includes('accident')) return 'Accidente';
  if (c.includes('roadworks') || c.includes('roadmaintenance') || c.includes('construction')) return 'Obras';
  if (xtype === 'AbnormalTraffic' || c.includes('congestion') || c.includes('queue')) return 'Retención';
  if (xtype === 'GeneralObstruction' || xtype === 'VehicleObstruction' || c.includes('obstruction')) return 'Obstrucción';
  if (xtype === 'SpeedManagement') return 'Limitación de velocidad';
  if (xtype === 'PoorEnvironmentConditions' || xtype === 'NonWeatherRelatedRoadConditions' || c.includes('weather'))
    return 'Estado de la vía';
  if (xtype === 'RoadOrCarriagewayOrLaneManagement') return 'Obras / corte';
  return 'Incidencia';
}

// Parser DATEX II tolerante a prefijos (sit:/loc: o sin prefijo).
function parseDatex(xml: string, feed: DatexFeed) {
  const out: Array<{
    id: string; lat: number; lng: number; kind: string; road: string; type: string; country: string; source: string;
  }> = [];
  const seen = new Set<string>();
  const blocks = xml.split(/<(?:\w+:)?situationRecord\b/);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const xtype = (b.match(/xsi:type="(?:\w+:)?(\w+)"/) || [])[1] || '';
    const id = (b.match(/\bid="([\w.\-]+)"/) || [])[1] || `${i}`;
    if (seen.has(id)) continue;
    const cause = (b.match(/<(?:\w+:)?causeType>([^<]+)/) || [])[1] || '';
    const detail = (b.match(/<(?:\w+:)?(?:roadMaintenanceType|\w*[Cc]auseType)>([^<]+)/) || [])[1] || '';
    const road = (
      (b.match(/<(?:\w+:)?roadName>([^<]+)/) || [])[1] ||
      (b.match(/<(?:\w+:)?roadNumber>([^<]+)/) || [])[1] ||
      ''
    ).trim();
    const lat = parseFloat((b.match(/<(?:\w+:)?latitude>([^<]+)/) || [])[1]);
    const lng = parseFloat((b.match(/<(?:\w+:)?longitude>([^<]+)/) || [])[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    seen.add(id);
    out.push({
      id: `${feed.country.toLowerCase()}-inc-${id}`,
      lat,
      lng,
      kind: classify(xtype, cause, detail),
      road,
      type: xtype,
      country: feed.country,
      source: feed.source,
    });
  }
  return out;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];
        // Algunos feeds (p.ej. NDW de Países Bajos) son archivos .xml.gz:
        // detectamos el magic byte de gzip y descomprimimos si procede.
        const buf = Buffer.from(await res.arrayBuffer());
        const xml =
          buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b
            ? gunzipSync(buf).toString('utf8')
            : buf.toString('utf8');
        return parseDatex(xml, feed);
      }),
    );
    const incidents: any[] = [];
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
      {
        incidents,
        total: incidents.length,
        sources,
        countries: FEEDS.map((f) => f.country),
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ incidents: [], total: 0 });
  }
}
