
import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/osiris/stealthFetch';

// Datos en vivo (adsb.lol); no debe prerenderizarse en build (allí adsb.lol
// no resuelve y la ruta queda rota/404). Se ejecuta bajo demanda.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Politeia — Flight Data API
 * Posiciones de aeronaves en tiempo real agregando varias fuentes abiertas
 * (todas best-effort: si una falla, el resto sigue funcionando):
 *  - adsb.lol: 6 círculos grandes que cubren el mundo (base principal)
 *  - adsb.fi: 8 círculos de 250 nm sobre los corredores más densos (cupo propio)
 *  - airplanes.live: /v2/mil (militar global), /v2/ladd y /v2/pia (globales)
 *  - OpenSky: snapshot global con fallback por dead-reckoning si el cupo
 *    anónimo de la IP de Vercel está agotado
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

// adsb.fi (opendata.adsb.fi): proveedor INDEPENDIENTE de adsb.lol → cupo de
// rate-limit propio. Refuerza los corredores más densos cuando adsb.lol
// rate-limita alguna región. OJO: con dist grande devuelve VACÍO, así que se
// usan círculos de 250 nm; y su JSON usa la clave "aircraft" (no "ac"),
// aunque cada avión tiene el mismo formato tar1090 que adsb.lol.
const ADSBFI_SPOTS = [
  { lat: 50.0, lon: 8.5 },    // Centroeuropa (Frankfurt)
  { lat: 52.5, lon: -1.5 },   // Reino Unido (Birmingham)
  { lat: 40.0, lon: -2.0 },   // España / Mediterráneo oeste
  { lat: 39.5, lon: -76.0 },  // EEUU costa este
  { lat: 39.0, lon: -95.0 },  // EEUU centro
  { lat: 36.5, lon: -119.0 }, // EEUU costa oeste
  { lat: 36.0, lon: 137.0 },  // Japón / Corea
  { lat: 5.0, lon: 103.0 },   // Sudeste asiático / Singapur
];
// Su límite es ~1 req/s ESTRICTO: verificado que con ~150 ms entre peticiones
// rechaza la mitad y con ~1,1 s responde todo. Stagger de 1,2 s entre inicios
// (última petición arranca en ~8,4 s; cabe de sobra en maxDuration=30).
const ADSBFI_STAGGER_MS = 1200;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function fetchAdsbFiSpot(spot: typeof ADSBFI_SPOTS[0], delayMs: number): Promise<any[]> {
  try {
    if (delayMs > 0) await sleep(delayMs);
    const url = `https://opendata.adsb.fi/api/v2/lat/${spot.lat}/lon/${spot.lon}/dist/250`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (PoliteiaOSINT)' },
    });
    if (res.ok) {
      const data = await res.json();
      return data.aircraft || []; // adsb.fi usa "aircraft", no "ac"
    }
  } catch { /* best-effort: sin este círculo quedan adsb.lol/OpenSky */ }
  return [];
}

// OpenSky /states/all: TODOS los vuelos del mundo en una sola llamada
// (best-effort; si falla o limita, se ignora y quedan los de adsb.lol).
// OpenSky OAuth2 (client_credentials): con credenciales el cupo va ligado a la
// CUENTA, no a la IP compartida de Vercel → fetch global fiable (~12k aviones).
// Sin credenciales, intento anónimo best-effort (suele limitar desde Vercel).
let openskyTok: { token: string; exp: number } | null = null;
// Último motivo de fallo del flujo OpenSky (token o states/all), expuesto en
// sources.opensky_debug para diagnosticar desde producción sin log streaming.
let openskyDebug: string | null = null;
async function getOpenSkyToken(): Promise<string | null> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) { openskyDebug = 'sin credenciales en env'; return null; }
  if (openskyTok && Date.now() < openskyTok.exp) return openskyTok.token;
  try {
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) {
      openskyDebug = `token HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`;
      console.warn('[opensky]', openskyDebug);
      return null;
    }
    const j = await res.json();
    if (!j.access_token) {
      openskyDebug = `token sin access_token: ${JSON.stringify(j).slice(0, 150)}`;
      console.warn('[opensky]', openskyDebug);
      return null;
    }
    openskyTok = { token: j.access_token, exp: Date.now() + ((j.expires_in || 1800) - 60) * 1000 };
    return openskyTok.token;
  } catch (e: any) {
    openskyDebug = `token fetch falló: ${e?.message || e}`;
    console.warn('[opensky]', openskyDebug);
    return null;
  }
}

// Snapshot del último resultado bueno de OpenSky (a nivel de módulo, por
// isolate). El cupo anónimo de OpenSky es POR IP y las IPs de salida de Vercel
// rotan entre invocaciones: cuando toca una IP con cupo agotado el fetch
// fresco falla. En ese caso se reutiliza el snapshot avanzando cada avión por
// su velocidad y rumbo (dead-reckoning) hasta un máximo de 20 minutos.
let openskySnap: { states: any[]; ts: number } | null = null;
const OPENSKY_SNAP_TTL_MS = 20 * 60 * 1000;

type OpenSkyResult = {
  states: any[];
  mode: 'live' | 'reckoned' | 'none';
  ageS: number; // antigüedad de los datos en segundos (-1 si mode='none')
};

async function fetchOpenSkyOnce(token: string | null, timeoutMs = 9000): Promise<any[] | null> {
  try {
    const res = await fetch('https://opensky-network.org/api/states/all', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      openskyDebug = `states/all HTTP ${res.status} (con token: ${!!token})`;
      console.warn('[opensky]', openskyDebug);
      return null;
    }
    const data = await res.json();
    return data.states || [];
  } catch (e: any) {
    openskyDebug = `states/all falló (con token: ${!!token}): ${e?.message || e}`;
    console.warn('[opensky]', openskyDebug);
    return null;
  }
}

// Avanza cada state-vector dtS segundos por su velocidad (m/s) y rumbo (grados
// desde el norte, horario). 111.320 m por grado de latitud; la longitud se
// corrige por cos(lat) y se normaliza a [-180, 180) para el antimeridiano.
function deadReckonStates(states: any[], dtS: number): any[] {
  const out: any[] = [];
  for (const s of states) {
    const lat = s[6];
    const lon = s[5];
    if (lat == null || lon == null) continue;
    const velMs = typeof s[9] === 'number' ? s[9] : null;
    const track = typeof s[10] === 'number' ? s[10] : null;
    // Sin velocidad/rumbo, en tierra o casi parado: mantiene la posición.
    if (velMs == null || track == null || s[8] === true || velMs < 1) {
      out.push(s);
      continue;
    }
    const rad = (track * Math.PI) / 180;
    const dNorthM = velMs * dtS * Math.cos(rad);
    const dEastM = velMs * dtS * Math.sin(rad);
    let newLat = lat + dNorthM / 111320;
    newLat = Math.max(-89.9, Math.min(89.9, newLat));
    const cosLat = Math.max(0.01, Math.cos((newLat * Math.PI) / 180));
    let newLon = lon + dEastM / (111320 * cosLat);
    newLon = ((((newLon + 180) % 360) + 360) % 360) - 180; // antimeridiano
    // Copia: el snapshot original no se muta (se re-avanza desde su timestamp
    // en cada petición mientras siga vigente).
    const advanced = s.slice();
    advanced[5] = newLon;
    advanced[6] = newLat;
    out.push(advanced);
  }
  return out;
}

// Recogida OpenSky desacoplada de la respuesta (patrón espera-acotada, como el
// PortWatch del route maritime): desde Vercel la conexión a OpenSky va lenta
// (>9s para ~1,4MB; verificado que el endpoint responde desde otros
// datacenters), así que se le da un timeout holgado SIN bloquear al mapa: la
// promesa corre en segundo plano con coalescing y la respuesta espera como
// mucho OPENSKY_WAIT_MS; si no llega, sale con el snapshot dead-reckoned (o
// 'none') y el poll siguiente del cliente (60s) recoge el resultado ya cacheado.
let openskyInflight: Promise<any[] | null> | null = null;
const OPENSKY_WAIT_MS = 8000;       // espera máxima dentro de una petición
const OPENSKY_FRESH_MS = 90_000;    // snapshot reciente: se sirve como 'live'

async function refreshOpenSkySnap(): Promise<any[] | null> {
  const token = await getOpenSkyToken();
  // Con token el cupo es de la cuenta: un único intento largo. Anónimo: dos
  // intentos cortos (la rotación de IPs de salida de Vercel puede dar con una
  // IP con cupo disponible).
  let states = await fetchOpenSkyOnce(token, token ? 22000 : 9000);
  if ((!states || states.length === 0) && !token) {
    states = await fetchOpenSkyOnce(token, 9000);
  }
  if (states && states.length > 0) {
    openskySnap = { states, ts: Date.now() };
  }
  return states;
}

async function fetchOpenSky(): Promise<OpenSkyResult> {
  // Snapshot reciente (<90s): se sirve directamente, sin tocar la red.
  if (openskySnap && Date.now() - openskySnap.ts < OPENSKY_FRESH_MS) {
    const ageS = Math.round((Date.now() - openskySnap.ts) / 1000);
    return { states: deadReckonStates(openskySnap.states, ageS), mode: 'live', ageS };
  }
  if (!openskyInflight) {
    openskyInflight = refreshOpenSkySnap().finally(() => { openskyInflight = null; });
  }
  const states = await Promise.race([
    openskyInflight,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), OPENSKY_WAIT_MS)),
  ]);
  if (states && states.length > 0) {
    return { states, mode: 'live', ageS: 0 };
  }
  if (openskySnap && Date.now() - openskySnap.ts <= OPENSKY_SNAP_TTL_MS) {
    const ageS = Math.round((Date.now() - openskySnap.ts) / 1000);
    return { states: deadReckonStates(openskySnap.states, ageS), mode: 'reckoned', ageS };
  }
  return { states: [], mode: 'none', ageS: -1 };
}

// Feeds globales de airplanes.live (una sola llamada barata cada uno, mismo
// formato {ac:[...]} que adsb.lol):
//  - /v2/mil:  TODAS las colas etiquetadas como militares en el mundo. Cubre
//    huecos del muestreo regional (cazas, ISR, cisternas, AWACS oceánicos).
//  - /v2/ladd: flota acogida al programa LADD (limitación de datos FAA).
//  - /v2/pia:  matrículas privadas anonimizadas (Privacy ICAO Address).
async function fetchAirplanesLive(feed: 'mil' | 'ladd' | 'pia'): Promise<any[]> {
  try {
    const res = await fetch(`https://api.airplanes.live/v2/${feed}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (PoliteiaOSINT)' },
    });
    if (res.ok) { const data = await res.json(); return data.ac || []; }
  } catch { /* best-effort: quedan los detectados por región/heurística */ }
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
    // Todas las fuentes en paralelo (cada una best-effort e independiente):
    // adsb.lol regional + adsb.fi escalonado + OpenSky global + airplanes.live.
    const [regionResults, adsbfiResults, openskyRes, milAc, laddAc, piaAc] = await Promise.all([
      Promise.allSettled(REGIONS.map(r => fetchRegion(r))),
      Promise.allSettled(ADSBFI_SPOTS.map((s, i) => fetchAdsbFiSpot(s, i * ADSBFI_STAGGER_MS))),
      fetchOpenSky(),
      fetchAirplanesLive('mil'),
      fetchAirplanesLive('ladd'),
      fetchAirplanesLive('pia'),
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
    const adsblolCount = allRaw.length;

    // adsb.fi: mismo formato por avión que adsb.lol → se acumula en allRaw
    // (dedupe por hex) y pasa por la misma clasificación y detección de
    // GPS jamming. Solo cuenta lo que adsb.lol no tenía ya.
    for (const result of adsbfiResults) {
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
    const adsbfiAdded = allRaw.length - adsblolCount;

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

    // airplanes.live /v2/ladd y /v2/pia: llamadas globales baratas. NO se
    // fuerza categoría militar — son flotas con datos limitados (LADD) o
    // matrículas anonimizadas (PIA); classifyFlight decide como siempre.
    let laddPiaAdded = 0;
    for (const ac of [...laddAc, ...piaAc]) {
      const hex = (ac.hex || '').toLowerCase().trim();
      if (!hex || seenHex.has(hex)) continue;
      const flight = classifyFlight(ac);
      if (!flight) continue;
      seenHex.add(hex);
      laddPiaAdded++;
      switch (flight.category) {
        case 'military': military.push(flight); break;
        case 'jet': jets.push(flight); break;
        case 'private': privateFl.push(flight); break;
        default: commercial.push(flight);
      }
    }

    // Merge OpenSky (best-effort): añade vuelos que adsb.lol no tiene (huecos
    // oceánicos, regiones sin cobertura). Clasificación heurística por callsign.
    // Puede venir en modo 'live' (fetch fresco) o 'reckoned' (snapshot avanzado
    // por dead-reckoning cuando el cupo anónimo de la IP de Vercel falla).
    let openskyAdded = 0;
    for (const s of openskyRes.states) {
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
      sources: {
        adsblol: adsblolCount,
        adsbfi_added: adsbfiAdded,
        opensky_added: openskyAdded,
        opensky_mode: openskyRes.mode,
        opensky_age_s: openskyRes.ageS,
        opensky_creds: !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET),
        opensky_debug: openskyRes.mode === 'live' ? null : openskyDebug,
        mil_added: milAdded,
        ladd_pia_added: laddPiaAdded,
      },
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

