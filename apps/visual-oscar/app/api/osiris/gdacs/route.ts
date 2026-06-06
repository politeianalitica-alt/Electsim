import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — GDACS (Global Disaster Alert and Coordination System).
 * Alertas mundiales en vivo: terremotos, ciclones, inundaciones, volcanes,
 * sequías e incendios, con nivel de alerta (Green / Orange / Red).
 */
const TYPE_ES: Record<string, string> = {
  EQ: 'Terremoto', TC: 'Ciclón tropical', FL: 'Inundación', VO: 'Volcán',
  DR: 'Sequía', WF: 'Incendio forestal', TS: 'Tsunami',
};

export async function GET() {
  try {
    const res = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP', {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 PoliteiaOsint' },
    });
    if (!res.ok) return NextResponse.json({ events: [], total: 0 });
    const data = await res.json();
    const events = (data.features || []).map((f: any) => {
      const p = f.properties || {};
      const c = (f.geometry || {}).coordinates || [];
      if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
      const url = typeof p.url === 'string' ? p.url : (p.url?.report || '');
      return {
        lat: c[1], lng: c[0],
        type: p.eventtype,
        type_es: TYPE_ES[p.eventtype] || p.eventtype,
        alert: p.alertlevel || 'Green',
        name: p.eventname || p.name || '',
        description: String(p.htmldescription || p.description || '').replace(/<[^>]+>/g, '').trim().slice(0, 180),
        country: p.country || '',
        date: p.fromdate || '',
        url,
      };
    }).filter(Boolean);
    return NextResponse.json({ events, total: events.length }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
  } catch {
    return NextResponse.json({ events: [], total: 0 });
  }
}
