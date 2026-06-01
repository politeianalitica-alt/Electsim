import type { CctvCamera } from './types';

/**
 * Cámaras de autopista de Taiwán — Highway Bureau (THB, MOTC).
 *
 * Lista pública (sin key): ~1.777 cámaras con coordenadas. La imagen es un
 * stream MJPG (multipart/x-mixed-replace) que el navegador renderiza en un
 * <img>; verificado embebible por HTTPS cross-origin.
 *   Lista:  https://thbapp.thb.gov.tw/services/cctv/freeway
 *   Imagen: https://cctvn.freeway.gov.tw/abs2mjpg/bmjpg?camera={ID}  (en `html`)
 *
 * El servidor de la lista es algo inestable (a veces 500/timeout); el fetch
 * es resiliente y devuelve [] ante cualquier fallo.
 */
const TW_LIST = 'https://thbapp.thb.gov.tw/services/cctv/freeway';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export async function fetchTaiwanCameras(): Promise<CctvCamera[]> {
  try {
    const res = await fetch(TW_LIST, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(13000) });
    if (!res.ok) return [];
    const data = await res.json();
    const arr: any[] = Array.isArray(data) ? data : data.features || [];
    const out: CctvCamera[] = [];
    const seen = new Set<string>();
    for (const c of arr) {
      const lat = parseFloat(c.gisy);
      const lng = parseFloat(c.gisx);
      const img = c.html;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (typeof img !== 'string' || !img.startsWith('https://')) continue;
      const id = String(c.id || `${lat},${lng}`);
      if (seen.has(id)) continue;
      seen.add(id);
      // id tipo "CCTV-N1-N-0.100-M" → "Autopista N1 (N) · km 0.1"
      const parts = id.split('-');
      const route = parts[1] || '';
      const dir = parts[2] || '';
      const km = parts[3] || '';
      const name = route
        ? `Autopista ${route}${dir ? ` (${dir})` : ''}${km ? ` · km ${km}` : ''}`
        : 'Cámara de autopista (Taiwán)';
      out.push({
        id: `tw-${id}`,
        lat,
        lng,
        name,
        city: 'Taiwán',
        country: 'Taiwan',
        feed_url: img,
        source: 'Freeway TW (THB)',
      });
    }
    return out;
  } catch {
    return [];
  }
}
