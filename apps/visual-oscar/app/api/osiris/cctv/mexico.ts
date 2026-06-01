import type { CctvCamera } from './types';

/**
 * Webcams en vivo de México — «Webcams de México» (webcamsdemexico.com).
 *
 * ~102 cámaras georreferenciadas por todo el país (Cancún, Ciudad de México,
 * Acapulco, Guadalajara, Querétaro, etc.) con imagen JPG pública servida por
 * HTTPS y embebible (sin protección anti-hotlink ni mixed-content).
 *
 * API: WordPress REST, custom post type «webcammx». Cada cámara trae en
 * cmb2.webcammx_single_settings el dominio + carpeta con los que se compone
 * la imagen en vivo: https://{dominio}/{carpeta}/live.jpg?live=1
 */
const WCMX_API = 'https://webcamsdemexico.com/wp-json/wp/v2/webcammx';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export async function fetchMexicoCameras(): Promise<CctvCamera[]> {
  try {
    const out: CctvCamera[] = [];
    for (const page of [1, 2]) {
      const res = await fetch(`${WCMX_API}?per_page=100&page=${page}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const posts = await res.json();
      if (!Array.isArray(posts)) continue;
      for (const p of posts) {
        const s = (p && p.cmb2 && p.cmb2.webcammx_single_settings) || {};
        if (s.webcammx_enable !== '1') continue;
        const lat = parseFloat(s.webcammx_latitud);
        const lng = parseFloat(s.webcammx_longitud);
        const dom = s.webcammx_dominio;
        const car = s.webcammx_carpeta;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !dom || !car) continue;
        const titulo = (s.webcammx_titulo || s.webcammx_titulo_corto || 'Cámara en vivo').trim();
        const ciudad = (s.webcammx_ciudad || '').trim();
        const name = ciudad && !titulo.toLowerCase().includes(ciudad.toLowerCase())
          ? `${ciudad} · ${titulo}`
          : titulo;
        out.push({
          id: `mx-${s.webcammx_camid || car}`,
          lat,
          lng,
          name,
          city: ciudad || s.webcammx_estado || 'México',
          country: 'Mexico',
          feed_url: `https://${dom}/${car}/live.jpg?live=1`,
          source: 'Webcams de México',
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
