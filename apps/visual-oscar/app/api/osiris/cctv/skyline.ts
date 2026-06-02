import type { CctvCamera } from './types';
import data from './skyline-data.json';

/**
 * Webcams en directo de SkylineWebcams.com (Europa).
 *
 * SkylineWebcams no publica coordenadas ni permite embeber sus streams en
 * terceros, así que cada webcam se añade como marcador + ENLACE DIRECTO a su
 * página (external_url, sin feed_url → el visor muestra «ABRIR»). Las
 * coordenadas se obtienen geocodificando la ciudad de cada URL (precisión a
 * nivel ciudad, con una ligera dispersión para no apilar los marcadores).
 *
 * El dataset (skyline-data.json) se genera offline crawleando el catálogo
 * por país y geocodificando con Nominatim.
 */
interface SkyEntry {
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  url: string;
}

export async function fetchSkylineCameras(): Promise<CctvCamera[]> {
  try {
    const arr = (data as unknown as SkyEntry[]) || [];
    const out: CctvCamera[] = [];
    const seen = new Set<string>();
    for (const w of arr) {
      if (!Number.isFinite(w.lat) || !Number.isFinite(w.lng) || !w.url) continue;
      const slug = (w.url.split('/').pop() || '').replace('.html', '') || `${w.lat},${w.lng}`;
      const id = `sky-${(w.country || '').toLowerCase().slice(0, 3)}-${slug}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        lat: w.lat,
        lng: w.lng,
        name: w.name || w.city || 'Webcam en directo',
        city: w.city || '',
        country: w.country || '',
        external_url: w.url,
        source: 'SkylineWebcams',
      });
    }
    return out;
  } catch {
    return [];
  }
}
