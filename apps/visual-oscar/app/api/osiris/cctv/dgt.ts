import type { CctvCamera } from './types';

/**
 * Cámaras de tráfico de la DGT (España) — dataset oficial de datos abiertos
 * vía el feature service de ArcGIS "Cámaras DGT - Tiempo real" (~1.712 cámaras).
 *
 * La DGT migró su portal a etraffic.dgt.es y ahora sirve las imágenes de forma
 * ofuscada/con sesión, por lo que NO se pueden embeber. Se añaden como marcadores
 * con ubicación + vía (carretera/pk/municipio) y enlace externo al portal oficial.
 */
const DGT_ARCGIS =
  'https://services1.arcgis.com/nCKYwcSONQTkPA4K/arcgis/rest/services/CamarasDGT/FeatureServer/0/query';

const DGT_PORTAL = 'https://etraffic.dgt.es/etrafficWEB/';

export async function fetchDgtCameras(): Promise<CctvCamera[]> {
  try {
    const url =
      `${DGT_ARCGIS}?where=1%3D1&outFields=id,carretera,pk,NAMEUNIT&returnGeometry=true` +
      `&f=json&resultRecordCount=2000&outSR=4326`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    const out: CctvCamera[] = [];
    for (const f of data.features || []) {
      const a = f.attributes || {};
      const g = f.geometry || {};
      const lat = typeof g.y === 'number' ? g.y : parseFloat(a.latitud);
      const lng = typeof g.x === 'number' ? g.x : parseFloat(a.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const via = [a.carretera, a.pk ? `pk ${a.pk}` : null].filter(Boolean).join(' · ');
      out.push({
        id: `dgt-${a.id ?? `${lat},${lng}`}`,
        lat,
        lng,
        name: via || 'Cámara de tráfico DGT',
        city: a.NAMEUNIT || 'España',
        country: 'Spain',
        external_url: DGT_PORTAL,
        source: 'DGT',
      });
    }
    return out;
  } catch {
    return [];
  }
}
