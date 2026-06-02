import type { CctvCamera } from './types';

/**
 * Cámaras de carretera de DriveBC — British Columbia (Canadá).
 *
 * Datos abiertos del Ministry of Transportation (OGL-BC): ~1.034 cámaras
 * con coordenadas, publicadas como CSV en el portal DataBC. La imagen en
 * vivo se sirve por HTTPS y es embebible (sin hotlink-protection):
 *   https://www.drivebc.ca/images/{id}.jpg
 * (el campo links_imageDisplay del CSV usa un host antiguo ya deprecado,
 * por eso construimos la URL nueva a partir del id.)
 */
const BC_CSV =
  'https://catalogue.data.gov.bc.ca/dataset/6b39a910-6c77-476f-ac96-7b4f18849b1c/resource/a9d52d85-8402-4ce7-b2ac-a2779837c48a/download/webcams.csv';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Parser de una línea CSV respetando comillas dobles y comas internas.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
      } else { cur += c; }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export async function fetchBritishColumbiaCameras(): Promise<CctvCamera[]> {
  try {
    const res = await fetch(BC_CSV, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(13000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    const header = parseCsvLine(lines[0]);
    const iId = header.indexOf('id');
    const iName = header.indexOf('camName');
    const iLoc = header.indexOf('highway_locationDescription');
    const iLat = header.indexOf('latitude');
    const iLng = header.indexOf('longitude');
    if (iId < 0 || iLat < 0 || iLng < 0) return [];
    const out: CctvCamera[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const f = parseCsvLine(lines[i]);
      const id = (f[iId] || '').trim();
      const lat = parseFloat(f[iLat]);
      const lng = parseFloat(f[iLng]);
      if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const loc = (f[iLoc] || '').trim();
      const name = (f[iName] || loc || 'Cámara DriveBC').trim();
      out.push({
        id: `bc-${id}`,
        lat,
        lng,
        name,
        city: loc || 'British Columbia',
        country: 'Canada',
        feed_url: `https://www.drivebc.ca/images/${id}.jpg`,
        source: 'DriveBC',
      });
    }
    return out;
  } catch {
    return [];
  }
}
