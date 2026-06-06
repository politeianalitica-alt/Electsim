import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Posición en directo de la Estación Espacial Internacional (ISS).
 */
export async function GET() {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const d = await res.json();
      if (Number.isFinite(d.latitude) && Number.isFinite(d.longitude)) {
        return NextResponse.json(
          { iss: { lat: d.latitude, lng: d.longitude, altitude_km: Math.round(d.altitude), velocity_kmh: Math.round(d.velocity) } },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    // Fallback: open-notify
    const r2 = await fetch('http://api.open-notify.org/iss-now.json', { signal: AbortSignal.timeout(8000) });
    if (r2.ok) {
      const d2 = await r2.json();
      const p = d2.iss_position || {};
      return NextResponse.json({ iss: { lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) } }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ iss: null });
  } catch {
    return NextResponse.json({ iss: null });
  }
}
