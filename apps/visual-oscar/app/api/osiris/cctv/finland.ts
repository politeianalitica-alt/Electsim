import type { CctvCamera } from './types';

/**
 * Cámaras de tráfico/meteorológicas de Finlandia — Fintraffic «Digitraffic»
 * (datos abiertos, licencia CC BY 4.0). ~804 estaciones repartidas por todo
 * el país, cada una con imagen JPG pública servida por HTTPS (embebible).
 *
 * API REST: https://tie.digitraffic.fi/api/weathercam/v1/stations
 * Imagen de cada preset: https://weathercam.digitraffic.fi/{presetId}.jpg
 *
 * El endpoint exige `Accept-Encoding: gzip`; el runtime de Node (undici)
 * descomprime automáticamente al llamar a res.json().
 */
const FI_STATIONS = 'https://tie.digitraffic.fi/api/weathercam/v1/stations';
const FI_IMG = (presetId: string) => `https://weathercam.digitraffic.fi/${presetId}.jpg`;

export async function fetchFinlandCameras(): Promise<CctvCamera[]> {
  try {
    const res = await fetch(FI_STATIONS, {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out: CctvCamera[] = [];
    for (const f of data.features || []) {
      const coords = (f.geometry || {}).coordinates || [];
      const lng = coords[0];
      const lat = coords[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const props = f.properties || {};
      const presets = (props.presets || []).filter((p: any) => p && p.inCollection);
      const preset = presets[0] || (props.presets || [])[0];
      if (!preset || !preset.id) continue;
      // El nombre viene como "vt4_Jyväskylä" → "vt4 · Jyväskylä"
      const rawName = String(props.name || preset.id);
      const parts = rawName.split('_');
      const road = parts[0] || '';
      const place = parts.slice(1).join(' ').trim();
      const name = [road, place].filter(Boolean).join(' · ') || rawName;
      out.push({
        id: `fi-${props.id ?? preset.id}`,
        lat,
        lng,
        name,
        city: place || 'Finlandia',
        country: 'Finland',
        feed_url: FI_IMG(preset.id),
        source: 'Digitraffic',
      });
    }
    return out;
  } catch {
    return [];
  }
}
