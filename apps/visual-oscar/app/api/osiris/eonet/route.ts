import { NextResponse } from 'next/server';

// NASA EONET — Earth Observatory Natural Event Tracker. Eventos naturales
// abiertos en todo el mundo (incendios, tormentas severas, volcanes, hielo
// marino, icebergs, inundaciones, deslizamientos, sequía, polvo/bruma…).
// Global, sin clave. Complementa fires/volcanoes/gdacs con categorías que no
// cubrimos (icebergs, deslizamientos, polvo, sequía, hielo).
export const dynamic = 'force-dynamic';

const CAT_COLOR: Record<string, string> = {
  'Wildfires': '#FF6B00',
  'Severe Storms': '#E040FB',
  'Volcanoes': '#FF7043',
  'Sea and Lake Ice': '#4FC3F7',
  'Icebergs': '#80D8FF',
  'Floods': '#2979FF',
  'Landslides': '#8D6E63',
  'Drought': '#FBC02D',
  'Dust and Haze': '#BCAAA4',
  'Earthquakes': '#FF9500',
  'Snow': '#90CAF9',
  'Temperature Extremes': '#EF5350',
  'Water Color': '#26C6DA',
  'Manmade': '#EF5350',
};

export async function GET() {
  try {
    const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'PoliteiaOSINT/1.0' },
    });
    if (!r.ok) return NextResponse.json({ events: [], total: 0 }, { status: 200 });
    const j = await r.json();
    const events = (j.events || [])
      .map((e: any) => {
        const g = e.geometry?.[e.geometry.length - 1];
        if (!g || !g.coordinates) return null;
        let lng: number, lat: number;
        if (g.type === 'Point') {
          [lng, lat] = g.coordinates;
        } else {
          // Polígono: centroide aproximado del primer anillo
          const ring = g.coordinates?.[0];
          if (!Array.isArray(ring) || !ring.length) return null;
          lng = ring.reduce((s: number, p: any) => s + p[0], 0) / ring.length;
          lat = ring.reduce((s: number, p: any) => s + p[1], 0) / ring.length;
        }
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const cat = e.categories?.[0]?.title || 'Evento natural';
        return {
          title: e.title,
          category: cat,
          color: CAT_COLOR[cat] || '#FFD54F',
          date: g.date || null,
          magnitude: g.magnitudeValue ? `${g.magnitudeValue} ${g.magnitudeUnit || ''}`.trim() : null,
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          url: e.sources?.[0]?.url || e.link || null,
        };
      })
      .filter(Boolean);
    return NextResponse.json(
      { events, total: events.length },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json({ events: [], total: 0 }, { status: 200 });
  }
}
