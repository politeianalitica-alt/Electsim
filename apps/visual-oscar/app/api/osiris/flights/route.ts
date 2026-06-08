
import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/osiris/stealthFetch';

// Datos en vivo (adsb.lol); no debe prerenderizarse en build (allí adsb.lol
// no resuelve y la ruta queda rota/404). Se ejecuta bajo demanda.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Politeia — Flight Data API
 * Fetches real-time aircraft positions from adsb.lol (no API key required)
 * Covers 6 global regions for maximum coverage
 */

// IMPORTANTE: muchos círculos en paralelo desde la IP de Vercel hacen que
// adsb.lol nos limite (timeouts → MENOS vuelos). Con pocos círculos GRANDES no
// limita y, además, deja ancho de banda para que OpenSky (cobertura global)
// rellene los huecos. El dedupe por hex elimina los solapes.
// 6 círculos GRANDES (radio 2.200-2.500 nm) que se solapan y cubren el mundo
// sin saturar adsb.lol. NO añadir más: con >~6 llamadas en paralelo adsb.lol
// rate-limita y deja regiones vacías (p.ej. Europa). La densidad en
// Asia/África/océanos depende de OpenSky (OAuth2), no de más círculos.
const REGIONS = [
  { lat: 39.8, lon: -98.5, dist: 2200 },    // Norteamérica
  { lat: 50.0, lon: 15.0, dist: 2200 },     // Europa
  { lat: 35.0, lon: 105.0, dist: 2300 },    // Asia
  { lat: -25.0, lon: 133.0, dist: 2200 },   // Australia / SE Asia
  { lat: 5.0, lon: 22.0, dist: 2500 },      // África / Oriente Medio
  { lat: -15.0, lon: -58.0, dist: 2300 },   // Sudamérica
];

// Helicopter type codes
const HELI_TYPES = new Set([
  'R22','R44','R66','B06','B06T','B204','B205','B206','B212','B222','B230',
  'B407','B412','B427','B429','B430','B505','B525',
  'AS32','AS35','AS50','AS55','AS65',
  'EC20','EC25','EC30','EC35','EC45','EC55','EC75',
  'H125','H130','H135','H145','H155','H160','H175','H215','H225',
  'S55','S58','S61','S64','S70','S76','S92',
  'A109','A119','A139','A169','A189','AW09',
  'MD52','MD60','MDHI','MD90','NOTR',
  'B47G','HUEY','GAMA','CABR','EXE',
]);

// Private jet types
const PRIVATE_JET_TYPES = new Set([
  'G150','G200','G280','GLEX','G500','G550','G600','G650','G700',
  'GLF2','GLF3','GLF4','GLF5','GLF6','GL5T','GL7T','GV','GIV',
  'CL30','CL35','CL60','BD70','BD10',
  'C25A','C25B','C25C','C500','C510','C525','C550','C560','C56X','C680','C700','C750',
  'E35L','E50P','E55P','E545','E550',
  'FA50','FA7X','FA8X','F900','F2TH',
  'LJ35','LJ40','LJ45','LJ60','LJ70','LJ75',
  'PC12','PC24','TBM7','TBM8','TBM9',
  'PRM1','SF50','EA50','VLJ',
]);

// Military type indicators
const MILITARY_INDICATORS = new Set([
  'C17','C5M','C130','C30J','KC10','KC46','KC35','E3CF','E3TF','E8A',
  'B1B','B2','B52','F16','F15','F18','F22','F35','A10','F117',
  'RC135','E6B','P8A','P3','MQ9','RQ4','U2','EP3','RC12',
  'V22','CH47','UH60','AH64','AH1Z','MV22',
  'EUFI','RFAL','TORD','TYP','GR4',
]);

const AIRLINE_CODE_RE = /^([A-Z]{3})\d/;

async function fetchRegion(region: typeof REGIONS[0]): Promise<any[]> {
  try {
    const url = `https://api.adsb.lol/v2/lat/${region.lat}/lon/${region.lon}/dist/${region.dist}`;
    const res = await stealthFetch(url, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.ac || [];
    }
  } catch (e) {
    console.warn(`Region fetch failed for lat=${region.lat}:`, e);
  }
  return [];
}

// OpenSky /states/all: TODOS los vuelos del mundo en una sola llamada
// (best-effort; si falla o limita, se ignora y quedan los de adsb.lol).
// OpenSky OAuth2 (client_credentials): con credenciales el cupo va ligado a la
// CUENTA, no a la IP compartida de Vercel → fetch global fiable (~12k aviones).
// Sin credenciales, intento anónimo best-effort (suele limitar desde Vercel).
let openskyTok: { token: string; exp: number } | null = null;
async function getOpenSkyToken(): Promise<string | null> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (openskyTok && Date.now() < openskyTok.exp) return openskyTok.token;
  try {
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const j = await res.json();
    if (!j.access_token) return null;
    openskyTok = { token: j.access_token, exp: Date.now() + ((j.expires_in || 1800) - 60) * 1000 };
    return openskyTok.token;
  } catch {
    return null;
  }
}

async function fetchOpenSky(): Promise<any[]> {
  const token = await getOpenSkyToken();
  // Con token: timeout amplio (fiable). Sin token: corto best-effort (suele
  // limitar desde la IP de Vercel; cuando responde rellena huecos oceánicos).
  try {
    const res = await fetch('https://opensky-network.org/api/states/all', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(token ? 9000 : 3500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.states || [];
  } catch {
    return [];
  }
}

// Feed dedicado de aeronaves militares (airplanes.live /v2/mil): devuelve en una
// sola llamada TODAS las colas etiquetadas como militares en el mundo, con el
// mismo formato {ac:[...]} que adsb.lol. Cubre los huecos del muestreo regional
// (cazas, ISR, cisternas, AWACS sobre océanos y zonas sin región propia).
async function fetchMil(): Promise<any[]> {
  try {
    const res = await fetch('https://api.airplanes.live/v2/mil', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (PoliteiaOSINT)' },
    });
    if (res.ok) { const data = await res.json(); return data.ac || []; }
  } catch { /* sin feed militar: quedan los detectados por región/heurística */ }
  return [];
}

const MIL_CALLSIGN_RE = /^(RCH|REACH|KING|DUKE|EVAC|JAKE|CONVOY|RRR|ASCOT|NAVY|ARMY|HERKY|FORTE|GRZLY|HOMER|SENTRY|SLAM|VADER|BAF|CFC|NATO|AWACS)\d*/i;

// Clasifica un state-vector de OpenSky (array) heurísticamente por callsign.
function classifyOpenSky(s: any[]) {
  const hex = (s[0] || '').toLowerCase().trim();
  const callsign = (s[1] || '').trim();
  const lon = s[5], lat = s[6];
  if (!hex || lat == null || lon == null) return null;
  const altM = typeof s[7] === 'number' ? s[7] : (typeof s[13] === 'number' ? s[13] : 0);
  const velMs = typeof s[9] === 'number' ? s[9] : null;
  const track = typeof s[10] === 'number' ? s[10] : 0;
  let category: 'commercial' | 'private' | 'military' = 'private';
  if (MIL_CALLSIGN_RE.test(callsign)) category = 'military';
  else if (AIRLINE_CODE_RE.test(callsign)) category = 'commercial';
  const airlineMatch = AIRLINE_CODE_RE.exec(callsign);
  return {
    callsign: callsign || hex,
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lon * 100000) / 100000,
    alt: Math.round(altM),
    heading: Math.round(track),
    speed_knots: velMs != null ? Math.round(velMs * 1.94384 * 10) / 10 : null,
    model: 'Unknown',
    icao24: hex,
    registration: 'N/A',
    squawk: s[14] || '',
    airline_code: airlineMatch ? airlineMatch[1] : '',
    aircraft_category: 'plane',
    category,
    grounded: s[8] === true,
    type: 'flight',
  };
}

function classifyFlight(f: any) {
  const modelUpper = (f.t || '').toUpperCase();
  const flightStr = (f.flight || '').trim().toUpperCase();
  const dbFlags = (f.dbFlags || 0);

  // Skip fixed structures
  if (modelUpper === 'TWR') return null;

  const lat = f.lat;
  const lon = f.lon;
  if (lat == null || lon == null) return null;

  const callsign = flightStr || f.hex || 'UNKNOWN';
  const altRaw = f.alt_baro;
  const altMeters = typeof altRaw === 'number' ? altRaw * 0.3048 : 0;
  const speedKnots = typeof f.gs === 'number' ? Math.round(f.gs * 10) / 10 : null;
  const heading = f.track || 0;
  const isHeli = HELI_TYPES.has(modelUpper);
  const isGrounded = typeof altRaw === 'number' && altRaw < 100;

  // Extract airline code
  const airlineMatch = AIRLINE_CODE_RE.exec(callsign);
  const airlineCode = airlineMatch ? airlineMatch[1] : '';

  // Classification
  let category: 'commercial' | 'private' | 'jet' | 'military' = 'commercial';
  if (dbFlags & 1 || MILITARY_INDICATORS.has(modelUpper) || (f.flight || '').match(/^(RCH|KING|DUKE|EVAC|JAKE|REACH|CONVOY)\d/i)) {
    category = 'military';
  } else if (PRIVATE_JET_TYPES.has(modelUpper)) {
    category = 'jet';
  } else if (!airlineCode && modelUpper && !['A319','A320','A321','A332','A333','A339','A343','A359','A388','B737','B738','B739','B38M','B39M','B752','B753','B763','B764','B772','B77L','B77W','B788','B789','B78X','E170','E175','E190','E195','CRJ7','CRJ9','AT43','AT72','DH8D'].includes(modelUpper)) {
    category = 'private';
  }

  return {
    callsign,
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lon * 100000) / 100000,
    alt: Math.round(altMeters),
    heading: Math.round(heading),
    speed_knots: speedKnots,
    model: f.t || 'Unknown',
    icao24: f.hex || '',
    registration: f.r || 'N/A',
    squawk: f.squawk || '',
    airline_code: airlineCode,
    aircraft_category: isHeli ? 'heli' : 'plane',
    category,
    grounded: isGrounded,
    nac_p: f.nac_p,
    type: 'flight',
  };
}

// In-memory cache to prevent global fan-out abuse
// NOTE (Issue #110): This cache is per-isolate in serverless environments (Vercel).
// Multiple isolates may each hold their own cache, but this is acceptable because:
// 1. It coalesces concurrent requests within the same isolate
// 2. It prevents hammering adsb.lol which would cause rate-limit bans
// For a globally shared cache, migrate to Vercel KV or similar persistent store.
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 45000; // 45 seconds cache window
let fetchPromise: Promise<any> | null = null;

export async function GET() {
  const now = Date.now();

  // Return cached data if within TTL
  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  // Coalesce concurrent requests: wait for the active fetch rather than starting a new one
  if (fetchPromise) {
    try {
      const data = await fetchPromise;
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    } catch {
      // Fallback to error if the pending fetch failed
      return NextResponse.json({ error: 'Failed to fetch flight data' }, { status: 500 });
    }
  }

  const JAMMING_NACAP_THRESHOLD = 4;

  // Start new global fetch
  fetchPromise = (async () => {
    // Fetch all regions (adsb.lol) + OpenSky global en paralelo
    const [regionResults, openskyStates, milAc] = await Promise.all([
      Promise.allSettled(REGIONS.map(r => fetchRegion(r))),
      fetchOpenSky(),
      fetchMil(),
    ]);

    const allRaw: any[] = [];
    const seenHex = new Set<string>();

    for (const result of regionResults) {
      if (result.status === 'fulfilled') {
        for (const ac of result.value) {
          const hex = (ac.hex || '').toLowerCase().trim();
          if (hex && !seenHex.has(hex)) {
            seenHex.add(hex);
            allRaw.push(ac);
          }
        }
      }
    }

    // Classify all flights
    const commercial: any[] = [];
    const privateFl: any[] = [];
    const jets: any[] = [];
    const military: any[] = [];
    const gpsJamming: any[] = [];

    for (const raw of allRaw) {
      const flight = classifyFlight(raw);
      if (!flight) continue;

      // GPS jamming detection
      if (typeof flight.nac_p === 'number' && flight.nac_p <= JAMMING_NACAP_THRESHOLD && !flight.grounded) {
        gpsJamming.push({
          lat: flight.lat,
          lng: flight.lng,
          nac_p: flight.nac_p,
          callsign: flight.callsign,
        });
      }

      switch (flight.category) {
        case 'military': military.push(flight); break;
        case 'jet': jets.push(flight); break;
        case 'private': privateFl.push(flight); break;
        default: commercial.push(flight);
      }
    }

    // Feed militar GLOBAL (airplanes.live /v2/mil): añade colas militares que el
    // muestreo regional de adsb.lol no captura. Vienen del endpoint /mil, así que
    // se fuerzan a categoría 'military' (dedupe por hex).
    let milAdded = 0;
    for (const ac of milAc) {
      const hex = (ac.hex || '').toLowerCase().trim();
      if (!hex || seenHex.has(hex)) continue;
      const flight = classifyFlight(ac);
      if (!flight) continue;
      seenHex.add(hex);
      flight.category = 'military';
      military.push(flight);
      milAdded++;
    }

    // Merge OpenSky (best-effort): añade vuelos que adsb.lol no tiene (huecos
    // oceánicos, regiones sin cobertura). Clasificación heurística por callsign.
    let openskyAdded = 0;
    for (const s of openskyStates) {
      const hex = (s[0] || '').toLowerCase().trim();
      if (!hex || seenHex.has(hex) || s[6] == null || s[5] == null) continue;
      const fl = classifyOpenSky(s);
      if (!fl) continue;
      seenHex.add(hex);
      openskyAdded++;
      if (fl.category === 'military') military.push(fl);
      else if (fl.category === 'commercial') commercial.push(fl);
      else privateFl.push(fl);
    }

    // Aggregate GPS jamming zones (grid-based)
    const jammingZones = aggregateJamming(gpsJamming, JAMMING_NACAP_THRESHOLD);

    return {
      commercial_flights: commercial,
      private_flights: privateFl,
      private_jets: jets,
      military_flights: military,
      gps_jamming: jammingZones,
      total: seenHex.size,
      sources: { adsblol: allRaw.length, opensky_added: openskyAdded, mil_added: milAdded },
      timestamp: new Date().toISOString(),
    };
  })();

  try {
    const data = await fetchPromise;
    cachedData = data;
    lastFetchTime = Date.now();
    fetchPromise = null;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Flight fetch error:', error);
    fetchPromise = null;
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}

function aggregateJamming(points: any[], threshold: number) {
  if (points.length === 0) return [];
  const grid = new Map<string, { lat: number; lng: number; count: number; total_nac_p: number }>();
  const GRID_SIZE = 2; // degrees

  for (const p of points) {
    const gLat = Math.floor(p.lat / GRID_SIZE) * GRID_SIZE;
    const gLng = Math.floor(p.lng / GRID_SIZE) * GRID_SIZE;
    const key = `${gLat},${gLng}`;

    if (!grid.has(key)) {
      grid.set(key, { lat: gLat + GRID_SIZE / 2, lng: gLng + GRID_SIZE / 2, count: 0, total_nac_p: 0 });
    }
    const cell = grid.get(key)!;
    cell.count++;
    cell.total_nac_p += p.nac_p;
  }

  return Array.from(grid.values())
    .filter(z => z.count >= 3) // Minimum 3 aircraft with degraded NACp
    .map(z => ({
      lat: z.lat,
      lng: z.lng,
      severity: Math.round((1 - (z.total_nac_p / z.count) / threshold) * 100),
      count: z.count,
    }));
}

