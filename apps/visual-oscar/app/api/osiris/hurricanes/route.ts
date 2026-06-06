import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Ciclones tropicales activos (NOAA National Hurricane Center).
 * Tormentas activas del Atlántico y Pacífico oriental con intensidad, presión
 * y movimiento.
 */
const CLASS_ES: Record<string, string> = {
  TD: 'Depresión tropical', TS: 'Tormenta tropical', HU: 'Huracán',
  STS: 'Tormenta tropical fuerte', TY: 'Tifón', STY: 'Supertifón', PTC: 'Ciclón potencial',
};

export async function GET() {
  try {
    const res = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 PoliteiaOsint' },
    });
    if (!res.ok) return NextResponse.json({ storms: [], total: 0 });
    const data = await res.json();
    const storms = (data.activeStorms || []).map((s: any) => {
      const lat = Number(s.latitudeNumeric), lng = Number(s.longitudeNumeric);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat, lng,
        name: s.name || '',
        classification: s.classification || '',
        class_es: CLASS_ES[s.classification] || s.classification || '',
        wind_kt: s.intensity ? Number(s.intensity) : null,
        pressure_mb: s.pressure ? Number(s.pressure) : null,
        movement: `${s.movementDir || ''} ${s.movementSpeed ? s.movementSpeed + ' kt' : ''}`.trim(),
        updated: s.lastUpdate || '',
      };
    }).filter(Boolean);
    return NextResponse.json({ storms, total: storms.length }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
  } catch {
    return NextResponse.json({ storms: [], total: 0 });
  }
}
