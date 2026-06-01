import type { CctvCamera } from './types';

/**
 * Windy Webcams (global) — ~70.000 webcams geolocalizadas con imagen.
 *
 * Requiere una API key gratuita (https://api.windy.com/keys). Se lee de la
 * variable de entorno WINDY_API_KEY; SIN key esta fuente devuelve [] y no
 * afecta a nada. La imagen en vivo (images.current.preview) es JPG por HTTPS
 * y embebible.
 *
 * La API v3 limita a 50 webcams por petición; aquí traemos un subconjunto
 * global (hasta ~600) para no agotar la cuota ni saturar el mapa. El parseo
 * es defensivo (varias rutas de acceso) por si la estructura varía.
 *
 * Doc: https://api.windy.com/webcams/docs  ·  Header: x-windy-api-key
 */
const WINDY_API = 'https://api.windy.com/webcams/api/v3/webcams';
const MAX_PAGES = 12; // 12 × 50 = 600 webcams

export async function fetchWindyCameras(): Promise<CctvCamera[]> {
  const key = process.env.WINDY_API_KEY;
  if (!key) return [];
  const out: CctvCamera[] = [];
  const seen = new Set<string>();
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * 50;
      const url = `${WINDY_API}?limit=50&offset=${offset}&include=images,location`;
      const res = await fetch(url, {
        headers: { 'x-windy-api-key': key, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const data = await res.json();
      const cams: any[] = data.webcams || (data.result && data.result.webcams) || [];
      if (!Array.isArray(cams) || cams.length === 0) break;
      for (const w of cams) {
        const loc = w.location || {};
        const lat = Number(loc.latitude ?? loc.lat ?? w.latitude);
        const lng = Number(loc.longitude ?? loc.lng ?? w.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const imgs = w.images || {};
        const cur = imgs.current || {};
        let img: unknown = cur.preview || cur.thumbnail || cur.icon || imgs.preview;
        if (typeof img !== 'string' || !img.startsWith('http')) continue;
        if (img.startsWith('http://')) img = 'https://' + img.slice(7);
        const id = String(w.webcamId ?? w.id ?? `${lat},${lng}`);
        if (seen.has(id)) continue;
        seen.add(id);
        const title = String(w.title || loc.city || 'Webcam').trim().slice(0, 80);
        out.push({
          id: `windy-${id}`,
          lat,
          lng,
          name: title,
          city: loc.city || loc.region || 'Webcam',
          country: loc.country || '',
          feed_url: img as string,
          external_url: (w.urls && (w.urls.detail || w.urls.provider)) || undefined,
          source: 'Windy',
        });
      }
      const total = Number(data.total ?? 0);
      if (total && offset + 50 >= total) break;
    }
  } catch {
    /* silent */
  }
  return out;
}
