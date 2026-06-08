import { NextResponse } from 'next/server';
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords';

// Refugiados y desplazados (ACNUR/UNHCR) por país de ORIGEN: suma de refugiados +
// solicitantes de asilo (cruzan frontera) + desplazados internos (IDP). Global,
// sin clave. Burbuja por país en su centroide poblacional. Distinta de
// 'refugee_camps' (ubicaciones físicas de campos): esto es el VOLUMEN de
// desplazamiento por país, indicador adelantado de presión migratoria.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await fetch(
      'https://api.unhcr.org/population/v1/population/?yearFrom=2024&yearTo=2024&coo_all=true&limit=400',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'PoliteiaOSINT/1.0', 'Accept': 'application/json' } },
    );
    if (!r.ok) return NextResponse.json({ displacement: [], total: 0 }, { status: 200 });
    const j = await r.json();
    const agg: Record<string, { ref: number; idp: number }> = {};
    for (const it of (j.items || [])) {
      const iso = it.coo_iso;
      if (!iso || iso === '-' || iso === 'UNK') continue;
      const ref = (+it.refugees || 0) + (+it.asylum_seekers || 0);
      const idp = +it.idps || 0;
      if (!agg[iso]) agg[iso] = { ref: 0, idp: 0 };
      agg[iso].ref += ref;
      agg[iso].idp += idp;
    }
    const displacement = Object.entries(agg)
      .map(([iso, v]) => {
        const c = (COUNTRY_COORDS as any)[iso];
        if (!c) return null;
        const total = v.ref + v.idp;
        if (total < 1000) return null; // filtra ruido
        return { iso, country: c.name_es, lat: c.lat, lng: c.lon, refugees: v.ref, idps: v.idp, total };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.total - a.total);
    return NextResponse.json(
      { displacement, total: displacement.length, year: 2024 },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch {
    return NextResponse.json({ displacement: [], total: 0 }, { status: 200 });
  }
}
