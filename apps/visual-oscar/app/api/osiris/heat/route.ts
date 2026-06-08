import { NextResponse } from 'next/server';
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords';

// Temperatura máxima de hoy por país (Open-Meteo, global, sin clave) — capa de
// calor extremo. Distinta de 'weather' (tormentas severas, sesgada a EE.UU.):
// aquí la señal es el CALOR (olas de calor), el riesgo climático de mayor coste
// sanitario/político en el sur de Europa. Una sola llamada multi-coordenada
// cubre los ~95 centroides de country-coords.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = Object.entries(COUNTRY_COORDS) as [string, any][];
    const lats = entries.map(([, c]) => c.lat).join(',');
    const lons = entries.map(([, c]) => c.lon).join(',');
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'PoliteiaOSINT/1.0' } },
    );
    if (!r.ok) return NextResponse.json({ heat: [], total: 0 }, { status: 200 });
    const j = await r.json();
    const arr = Array.isArray(j) ? j : [j];
    const heat = entries
      .map(([iso, c], i) => {
        const tmax = arr[i]?.daily?.temperature_2m_max?.[0];
        if (typeof tmax !== 'number') return null;
        return { iso, country: c.name_es, lat: c.lat, lng: c.lon, tmax: Math.round(tmax * 10) / 10 };
      })
      .filter(Boolean);
    return NextResponse.json(
      { heat, total: heat.length },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  } catch {
    return NextResponse.json({ heat: [], total: 0 }, { status: 200 });
  }
}
