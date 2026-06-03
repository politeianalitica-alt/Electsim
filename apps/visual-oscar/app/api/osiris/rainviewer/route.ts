import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Radar de precipitación mundial (RainViewer, gratis, sin clave).
 * Devuelve el host y el path del frame de radar más reciente; el cliente
 * construye la URL de tiles {host}{path}/256/{z}/{x}/{y}/{color}/1_1.png.
 */
export async function GET() {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return NextResponse.json({ host: null, path: null });
    const data = await res.json();
    const past = data?.radar?.past || [];
    const last = past[past.length - 1];
    return NextResponse.json(
      { host: data?.host || 'https://tilecache.rainviewer.com', path: last?.path || null, time: last?.time || null },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ host: null, path: null });
  }
}
