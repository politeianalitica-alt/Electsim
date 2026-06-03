import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Frente de Ucrania (DeepState Map, deepstatemap.live).
 * Procesa el GeoJSON oficial para colorear cada zona según su estado real
 * (ocupado / liberado / dirección de ataque / desconocido) usando el color
 * que DeepState codifica en styleUrl, y traduce el estado al español.
 */
const STATUS_ES: Record<string, string> = {
  occupied: 'Territorio ocupado',
  liberated: 'Territorio liberado',
  dismissed: 'Retirada / liberado',
  dismissed_at: 'Retirada / liberado',
  attack_direction: 'Dirección de ataque',
  unknown: 'Estado desconocido',
  crimea: 'Crimea (ocupada)',
};

export async function GET() {
  try {
    const res = await fetch('https://deepstatemap.live/api/history/last', {
      headers: { 'User-Agent': 'Mozilla/5.0 (PoliteiaOsint)', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ frontlines: null, error: 'DeepState unavailable' });
    const data = await res.json();
    const dt: string = data?.datetime || '';
    const feats = (data?.map?.features || []).map((f: any) => {
      const sm = (f.properties?.styleUrl || '').match(/poly-([0-9A-Fa-f]{6})/);
      const color = sm ? '#' + sm[1] : '#FF1744';
      const last = String(f.properties?.name || '').split('///').pop()?.trim() || '';
      const skey = last.replace('geoJSON.status.', '').replace('geoJSON.', '').split(/[.\s{]/)[0];
      const status = STATUS_ES[skey] || (last.includes('units') ? 'Unidad militar' : last.includes('territories') ? 'Territorio' : 'Zona de conflicto');
      return { ...f, properties: { ...f.properties, color, status, dt } };
    });
    return NextResponse.json(
      { frontlines: { map: { type: 'FeatureCollection', features: feats } }, datetime: dt, count: feats.length },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch (error) {
    console.error('Frontlines fetch error:', error);
    return NextResponse.json({ frontlines: null, error: 'Failed to fetch frontline data' }, { status: 500 });
  }
}
