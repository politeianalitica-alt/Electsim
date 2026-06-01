import type { CctvCamera } from './types';

/**
 * Helper genérico para cámaras de tráfico publicadas en Feature/Map Services
 * de ArcGIS (datos abiertos de DOTs de EE.UU. y Canadá). Cada DOT expone un
 * servicio con geometría (lng/lat) y un campo con la URL de imagen JPG.
 *
 * Solo se aceptan imágenes HTTPS (embebibles sin mixed-content); las fuentes
 * que sirven la imagen por HTTP quedan descartadas automáticamente.
 *
 * Pagina con resultOffset hasta agotar el servicio (respeta maxRecordCount).
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

interface ArcgisCamSource {
  url: string; // .../FeatureServer/0 o .../MapServer/0
  source: string;
  country: string;
  idPrefix: string;
  imageField: string;
  nameField: string;
  cityDefault: string;
}

export async function fetchArcgisCameras(o: ArcgisCamSource): Promise<CctvCamera[]> {
  const out: CctvCamera[] = [];
  const seen = new Set<string>();
  try {
    let offset = 0;
    for (let page = 0; page < 8; page++) {
      const u =
        `${o.url}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json&outSR=4326` +
        `&resultRecordCount=2000&resultOffset=${offset}`;
      const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) break;
      const data = await res.json();
      const feats: any[] = data.features || [];
      if (feats.length === 0) break;
      for (const f of feats) {
        const a = f.attributes || {};
        const g = f.geometry || {};
        const lat = typeof g.y === 'number' ? g.y : parseFloat(a.latitude ?? a.LATITUDE);
        const lng = typeof g.x === 'number' ? g.x : parseFloat(a.longitude ?? a.LONGITUDE);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        let img = a[o.imageField];
        if (typeof img !== 'string' || !img.startsWith('https://')) continue;
        img = img.replace(/ /g, '%20');
        const oid =
          a.ObjectId ?? a.OBJECTID ?? a.FID ?? a.ESRI_OID ?? `${lat.toFixed(5)},${lng.toFixed(5)}`;
        const id = `${o.idPrefix}-${oid}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const name = String(a[o.nameField] ?? '').trim() || o.cityDefault;
        out.push({ id, lat, lng, name, city: o.cityDefault, country: o.country, feed_url: img, source: o.source });
      }
      if (!data.exceededTransferLimit && feats.length < 2000) break;
      offset += feats.length;
    }
  } catch {
    /* silent */
  }
  return out;
}

// ── DOTs de EE.UU. (vía ArcGIS abierto, imagen JPG HTTPS) ──
export const fetchOregonCameras = () =>
  fetchArcgisCameras({
    url: 'https://services.arcgis.com/uUvqNMGPm7axC2dD/arcgis/rest/services/TripCheck_Cameras/FeatureServer/0',
    source: 'TripCheck (Oregon)', country: 'US', idPrefix: 'or',
    imageField: 'attributes_filename', nameField: 'attributes_title', cityDefault: 'Oregon',
  });

export const fetchIowaCameras = () =>
  fetchArcgisCameras({
    url: 'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/Traffic_Cameras_View/FeatureServer/0',
    source: 'Iowa DOT', country: 'US', idPrefix: 'ia',
    imageField: 'ImageURL', nameField: 'Desc_', cityDefault: 'Iowa',
  });

export const fetchAustinCameras = () =>
  fetchArcgisCameras({
    url: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/TRANSPORTATION_traffic_cameras/FeatureServer/0',
    source: 'Austin TX', country: 'US', idPrefix: 'tx',
    imageField: 'SCREENSHOT_ADDRESS', nameField: 'LOCATION_NAME', cityDefault: 'Austin',
  });

// ── Canadá (Región de York, Ontario) ──
export const fetchYorkCameras = () =>
  fetchArcgisCameras({
    url: 'https://ww8.yorkmaps.ca/arcgis/rest/services/OpenData/Traffic/MapServer/0',
    source: 'York Region', country: 'Canada', idPrefix: 'york',
    imageField: 'photo', nameField: 'cameralocation', cityDefault: 'York (ON)',
  });
