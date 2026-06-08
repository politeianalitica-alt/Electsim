import { NextResponse } from 'next/server';
import { CIUDADES } from '../data/route';

// Clima por ciudad de España (Open-Meteo, sin clave): calidad del aire (AQI
// europeo + PM2.5) y temperatura máxima de hoy. Dos llamadas multi-coordenada.
export const dynamic = 'force-dynamic';

export async function GET() {
  const lats = CIUDADES.map((c) => c.lat).join(',');
  const lons = CIUDADES.map((c) => c.lng).join(',');
  try {
    const [aqR, tR] = await Promise.all([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=european_aqi,pm2_5`, {
        signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'PoliteiaOSINT/1.0' },
      }),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max&timezone=auto&forecast_days=1`, {
        signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'PoliteiaOSINT/1.0' },
      }),
    ]);
    const aqJ = aqR.ok ? await aqR.json() : null;
    const tJ = tR.ok ? await tR.json() : null;
    const aqArr = Array.isArray(aqJ) ? aqJ : aqJ ? [aqJ] : [];
    const tArr = Array.isArray(tJ) ? tJ : tJ ? [tJ] : [];
    const clima = CIUDADES.map((c, i) => ({
      n: c.n,
      lat: c.lat,
      lng: c.lng,
      aqi: aqArr[i]?.current?.european_aqi ?? null,
      pm25: aqArr[i]?.current?.pm2_5 ?? null,
      tmax: tArr[i]?.daily?.temperature_2m_max?.[0] ?? null,
    }));
    return NextResponse.json({ clima }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ clima: [] }, { status: 200 });
  }
}
