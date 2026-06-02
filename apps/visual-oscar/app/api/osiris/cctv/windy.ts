import type { CctvCamera } from './types';

/**
 * Windy Webcams (global) — webcams geolocalizadas con imagen.
 *
 * Requiere una API key gratuita (https://api.windy.com/keys) en la variable
 * de entorno WINDY_API_KEY; SIN key devuelve [] y no afecta a nada. La imagen
 * en vivo (images.current.preview) es JPG por HTTPS y embebible.
 *
 * La API v3 limita 'limit' a 50 y el 'offset' a ~1.000 por consulta, así que
 * paginamos POR CONTINENTE (continents=EU/NA/SA/AS/AF/OC) en lotes paralelos
 * para repartir la cobertura por todo el mundo (~3.000 webcams).
 */
const WINDY_API = 'https://api.windy.com/webcams/api/v3/webcams';
const CONTINENTS = ['EU', 'NA', 'SA', 'AS', 'AF', 'OC'];
const PAGES_PER_CONT = 10; // 10 × 50 = 500 por continente
const BATCH = 12; // peticiones en paralelo por lote

async function fetchPage(continent: string, offset: number, key: string): Promise<any[]> {
  try {
    const url = `${WINDY_API}?limit=50&offset=${offset}&continents=${continent}&include=images,location`;
    const res = await fetch(url, {
      headers: { 'x-windy-api-key': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.webcams || (data.result && data.result.webcams) || [];
  } catch {
    return [];
  }
}

export async function fetchWindyCameras(): Promise<CctvCamera[]> {
  const key = process.env.WINDY_API_KEY;
  if (!key) return [];
  const out: CctvCamera[] = [];
  const seen = new Set<string>();
  const push = (w: any) => {
    const loc = w.location || {};
    const lat = Number(loc.latitude ?? loc.lat ?? w.latitude);
    const lng = Number(loc.longitude ?? loc.lng ?? w.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const cur = (w.images || {}).current || {};
    let img: unknown = cur.preview || cur.thumbnail || cur.icon;
    if (typeof img !== 'string' || !img.startsWith('http')) return;
    if ((img as string).startsWith('http://')) img = 'https://' + (img as string).slice(7);
    const id = String(w.webcamId ?? w.id ?? `${lat},${lng}`);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id: `windy-${id}`,
      lat,
      lng,
      name: String(w.title || loc.city || 'Webcam').trim().slice(0, 80),
      city: loc.city || loc.region || 'Webcam',
      country: loc.country || '',
      feed_url: img as string,
      source: 'Windy',
    });
  };
  try {
    const jobs: Array<() => Promise<any[]>> = [];
    for (const cont of CONTINENTS) {
      for (let pg = 0; pg < PAGES_PER_CONT; pg++) {
        const offset = pg * 50;
        jobs.push(() => fetchPage(cont, offset, key));
      }
    }
    for (let i = 0; i < jobs.length; i += BATCH) {
      const results = await Promise.allSettled(jobs.slice(i, i + BATCH).map((j) => j()));
      for (const r of results) {
        if (r.status === 'fulfilled') for (const w of r.value) push(w);
      }
    }
  } catch {
    /* silent */
  }
  return out;
}
