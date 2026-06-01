import { NextResponse } from 'next/server';

// Se sirve bajo demanda (datos en tiempo real); el CDN la cachea con
// Cache-Control s-maxage. Sin esto, Next la prerenderiza en build y
// congelaría las incidencias del momento del despliegue.
export const dynamic = 'force-dynamic';

/**
 * Incidencias de tráfico de la DGT (España) en tiempo real.
 *
 * Fuente oficial: Punto de Acceso Nacional de Tráfico y Movilidad (NAP),
 * publicación DATEX II v3.6 «SituationPublication», sin autenticación.
 * Incluye accidentes, obras, retenciones, obstrucciones, limitaciones y
 * estado de la vía en las carreteras estatales (no incluye País Vasco ni
 * Cataluña, que publican sus propios feeds).
 *
 * El XML (~5 MB) se parsea por bloques <sit:situationRecord> con expresiones
 * regulares: el perfil DGT es estable y así evitamos dependencias de XML.
 */
const DATEX_URL =
  'https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml';
const DGT_PORTAL = 'https://infocar.dgt.es/etraffic/';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function classify(xtype: string, cause: string, detail: string): string {
  const c = `${cause} ${detail}`.toLowerCase();
  if (c.includes('accident')) return 'Accidente';
  if (c.includes('roadworks') || c.includes('roadmaintenance')) return 'Obras';
  if (xtype === 'AbnormalTraffic') return 'Retención';
  if (xtype === 'GeneralObstruction' || xtype === 'VehicleObstruction') return 'Obstrucción';
  if (xtype === 'SpeedManagement') return 'Limitación de velocidad';
  if (xtype === 'PoorEnvironmentConditions' || xtype === 'NonWeatherRelatedRoadConditions')
    return 'Estado de la vía';
  if (xtype === 'RoadOrCarriagewayOrLaneManagement') return 'Obras / corte';
  return 'Incidencia';
}

export async function GET() {
  try {
    const res = await fetch(DATEX_URL, {
      headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return NextResponse.json({ incidents: [], total: 0 });
    const xml = await res.text();
    const blocks = xml.split('<sit:situationRecord');
    const incidents: Array<{
      id: string;
      lat: number;
      lng: number;
      kind: string;
      road: string;
      type: string;
    }> = [];
    const seen = new Set<string>();
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const xtype = (b.match(/xsi:type="sit:(\w+)"/) || [])[1] || '';
      const id = (b.match(/\bid="(\d+)"/) || [])[1] || `${i}`;
      if (seen.has(id)) continue;
      const cause = (b.match(/<sit:causeType>([^<]+)/) || [])[1] || '';
      const detail = (b.match(/<sit:(?:roadMaintenanceType|\w*[Cc]auseType)>([^<]+)/) || [])[1] || '';
      const road = ((b.match(/<loc:roadName>([^<]+)/) || [])[1] || '').trim();
      const lat = parseFloat((b.match(/<loc:latitude>([^<]+)/) || [])[1]);
      const lng = parseFloat((b.match(/<loc:longitude>([^<]+)/) || [])[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      seen.add(id);
      incidents.push({
        id: `dgt-inc-${id}`,
        lat,
        lng,
        kind: classify(xtype, cause, detail),
        road,
        type: xtype,
      });
    }
    return NextResponse.json(
      {
        incidents,
        total: incidents.length,
        portal: DGT_PORTAL,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ incidents: [], total: 0 });
  }
}
