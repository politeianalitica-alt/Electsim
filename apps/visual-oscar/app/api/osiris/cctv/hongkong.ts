import type { CctvCamera } from './types';

/**
 * Cámaras de tráfico de Hong Kong — Transport Department (data.gov.hk, datos
 * abiertos). Varios cientos de cámaras con imagen JPG pública por HTTPS,
 * embebible directamente en el visor.
 *
 * Ubicaciones (CSV): https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv
 * Imagen de cada cámara: https://tdcctv.data.one.gov.hk/{KEY}.JPG
 *
 * Columnas: key,region,district,description,easting,northing,latitude,longitude,url
 * Las 5 últimas columnas (easting, northing, latitude, longitude, url) tienen
 * posición fija al final, así que el parseo es robusto aunque «description»
 * contenga comas.
 */
const HK_CSV =
  'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv';

export async function fetchHongKongCameras(): Promise<CctvCamera[]> {
  try {
    const res = await fetch(HK_CSV, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const out: CctvCamera[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 9) continue;
      const url = parts[parts.length - 1].trim();
      const lng = parseFloat(parts[parts.length - 2]);
      const lat = parseFloat(parts[parts.length - 3]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      const key = parts[0].trim();
      const region = (parts[1] || '').trim();
      const district = (parts[2] || '').trim();
      // description puede contener comas → todo lo que queda entre la col 3 y las 5 finales
      const description = parts
        .slice(3, parts.length - 5)
        .join(',')
        .trim()
        .replace(/\s*\[[^\]]*\]\s*$/, '') // quita el sufijo "[KEY]"
        .replace(/^"|"$/g, '')
        .trim();
      out.push({
        id: `hk-${key || `${lat},${lng}`}`,
        lat,
        lng,
        name: description || `Cámara ${key}`,
        city: district || region || 'Hong Kong',
        country: 'Hong Kong',
        feed_url: url,
        source: 'HK Transport Dept',
      });
    }
    return out;
  } catch {
    return [];
  }
}
