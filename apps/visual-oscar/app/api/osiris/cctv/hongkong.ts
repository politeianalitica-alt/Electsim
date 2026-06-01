import type { CctvCamera } from './types';

/**
 * Cámaras de tráfico de Hong Kong — Transport Department (data.gov.hk, datos
 * abiertos). Varios cientos de cámaras con imagen JPG pública por HTTPS,
 * embebible directamente en el visor.
 *
 * Ubicaciones (CSV): https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv
 * Imagen de cada cámara: https://tdcctv.data.one.gov.hk/{KEY}.JPG
 *
 * Columnas (separadas por TAB): key, region, district, description,
 * easting, northing, latitude, longitude, url. El fichero viene codificado
 * en UTF-16 LE (con BOM), por eso se decodifica con TextDecoder('utf-16le').
 * Las 5 últimas columnas tienen posición fija al final.
 */
const HK_CSV =
  'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv';

export async function fetchHongKongCameras(): Promise<CctvCamera[]> {
  try {
    const res = await fetch(HK_CSV, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const buf = await res.arrayBuffer();
    const text = new TextDecoder('utf-16le').decode(buf);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const out: CctvCamera[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length < 9) continue;
      const url = parts[parts.length - 1].trim();
      const lng = parseFloat(parts[parts.length - 2]);
      const lat = parseFloat(parts[parts.length - 3]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      const key = parts[0].trim();
      const region = (parts[1] || '').trim();
      const district = (parts[2] || '').trim();
      const description = parts
        .slice(3, parts.length - 5)
        .join(' ')
        .trim()
        .replace(/\s*\[[^\]]*\]\s*$/, '') // quita el sufijo "[KEY]"
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
