import { NextResponse } from 'next/server';
import worldPorts from './ports-world.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Maritime Intelligence
 * - Barcos en vivo (AIS) vía Digitraffic / Fintraffic (REST abierto, sin key);
 *   cobertura del Báltico y mar del Norte. Se unen DOS endpoints por MMSI:
 *     · /locations → posición, rumbo, velocidad, estado de navegación.
 *     · /vessels   → metadatos: nombre real, tipo de buque (AIS shipType),
 *                    destino, calado, IMO, indicativo.
 *   Esto permite clasificar cada barco por tipo (carga, petrolero, pasaje,
 *   pesca, remolcador, alta velocidad, militar, otros) y filtrarlo en el mapa.
 * - Puertos: 52 principales (con volumen de carga + congestión calculada en
 *   vivo) + ~1.586 puertos del mundo (dataset estático).
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const AIS_LOCATIONS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';
const AIS_VESSELS_URL = 'https://meri.digitraffic.fi/api/ais/v1/vessels';
const MAX_SHIPS = 4000;
const DT_HEADERS = { 'User-Agent': UA, 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'PoliteiaOsintMap' };

/**
 * Clasifica un barco según el código AIS shipType (ITU-R M.1371).
 * Devuelve una categoría legible y filtrable en el mapa.
 */
function shipCategory(code: number | null | undefined): string {
  if (code == null || code <= 0) return 'other';
  if (code === 30) return 'fishing';
  if (code === 31 || code === 32 || code === 52) return 'tug';      // towing / tug
  if (code === 35 || code === 55) return 'military';                // military / law enforcement
  if ((code >= 20 && code <= 29) || (code >= 40 && code <= 49)) return 'highspeed'; // WIG / HSC
  if (code >= 60 && code <= 69) return 'passenger';
  if (code >= 70 && code <= 79) return 'cargo';
  if (code >= 80 && code <= 89) return 'tanker';
  // 33/34 dragado/buceo, 36 vela, 37 recreo, 50/51/53/54/58 servicio, 90-99 otros
  return 'other';
}

/** MID (3 primeros dígitos del MMSI) → ISO país del pabellón. */
const MID_TO_FLAG: Record<string, string> = {
  '201': 'AL', '202': 'AD', '203': 'AT', '204': 'AZ', '205': 'BE', '206': 'BY', '207': 'BG',
  '208': 'VA', '209': 'CY', '210': 'CY', '211': 'DE', '212': 'CY', '213': 'GE', '214': 'MD',
  '215': 'MT', '218': 'DE', '219': 'DK', '220': 'DK', '224': 'ES', '225': 'ES', '226': 'FR',
  '227': 'FR', '228': 'FR', '229': 'MT', '230': 'FI', '231': 'FO', '232': 'GB', '233': 'GB',
  '234': 'GB', '235': 'GB', '236': 'GI', '237': 'GR', '238': 'HR', '239': 'GR', '240': 'GR',
  '241': 'GR', '242': 'MA', '243': 'HU', '244': 'NL', '245': 'NL', '246': 'NL', '247': 'IT',
  '248': 'MT', '249': 'MT', '250': 'IE', '251': 'IS', '252': 'LI', '253': 'LU', '254': 'MC',
  '255': 'PT', '256': 'MT', '257': 'NO', '258': 'NO', '259': 'NO', '261': 'PL', '262': 'ME',
  '263': 'PT', '264': 'RO', '265': 'SE', '266': 'SE', '267': 'SK', '268': 'SM', '269': 'CH',
  '270': 'CZ', '271': 'TR', '272': 'UA', '273': 'RU', '274': 'MK', '275': 'LV', '276': 'EE',
  '277': 'LT', '278': 'SI', '279': 'RS',
  '301': 'AI', '303': 'US', '304': 'AG', '305': 'AG', '306': 'CW', '308': 'BS', '309': 'BS',
  '311': 'BS', '312': 'BS', '316': 'CA', '319': 'KY', '338': 'US', '341': 'KN', '351': 'PA',
  '352': 'PA', '353': 'PA', '354': 'PA', '355': 'PA', '356': 'PA', '357': 'PA', '370': 'PA',
  '371': 'PA', '372': 'PA', '373': 'PA', '374': 'PA', '366': 'US', '367': 'US', '368': 'US',
  '369': 'US', '375': 'VC', '376': 'VC', '377': 'VC',
  '412': 'CN', '413': 'CN', '414': 'CN', '416': 'TW', '419': 'IN', '422': 'IR', '431': 'JP',
  '432': 'JP', '440': 'KR', '441': 'KR', '445': 'KP', '450': 'LB', '457': 'MN', '470': 'AE',
  '477': 'HK', '525': 'ID', '533': 'MY', '538': 'MH', '563': 'SG', '564': 'SG', '565': 'SG',
  '566': 'SG', '574': 'VN', '636': 'LR', '637': 'LR', '710': 'BR', '720': 'BO', '725': 'CL',
};

function flagFromMmsi(mmsi: number | undefined): string {
  if (!mmsi) return '';
  return MID_TO_FLAG[String(mmsi).slice(0, 3)] || '';
}

const PORTS_MAJOR = [
  // ── Top Container Ports ──
  { name: 'Shanghai', country: 'CN', lat: 31.23, lng: 121.47, type: 'container', volume: '47.3M TEU', rank: 1 },
  { name: 'Singapore', country: 'SG', lat: 1.26, lng: 103.84, type: 'container', volume: '37.2M TEU', rank: 2 },
  { name: 'Ningbo-Zhoushan', country: 'CN', lat: 29.87, lng: 121.55, type: 'container', volume: '33.3M TEU', rank: 3 },
  { name: 'Shenzhen', country: 'CN', lat: 22.54, lng: 114.05, type: 'container', volume: '30.0M TEU', rank: 4 },
  { name: 'Guangzhou', country: 'CN', lat: 23.08, lng: 113.32, type: 'container', volume: '24.2M TEU', rank: 5 },
  { name: 'Busan', country: 'KR', lat: 35.10, lng: 129.04, type: 'container', volume: '22.7M TEU', rank: 6 },
  { name: 'Qingdao', country: 'CN', lat: 36.07, lng: 120.38, type: 'container', volume: '22.0M TEU', rank: 7 },
  { name: 'Rotterdam', country: 'NL', lat: 51.90, lng: 4.50, type: 'container', volume: '14.5M TEU', rank: 8 },
  { name: 'Tokyo', country: 'JP', lat: 35.61, lng: 139.79, type: 'container', volume: '4.5M TEU' },
  { name: 'Yokohama', country: 'JP', lat: 35.45, lng: 139.66, type: 'container', volume: '2.9M TEU' },
  { name: 'Kobe', country: 'JP', lat: 34.67, lng: 135.21, type: 'container', volume: '2.8M TEU' },
  { name: 'Nagoya', country: 'JP', lat: 35.08, lng: 136.87, type: 'container', volume: '2.6M TEU' },
  { name: 'Osaka', country: 'JP', lat: 34.63, lng: 135.41, type: 'container', volume: '2.1M TEU' },
  { name: 'Dubai (Jebel Ali)', country: 'AE', lat: 25.01, lng: 55.06, type: 'container', volume: '14.0M TEU', rank: 9 },
  { name: 'Port Klang', country: 'MY', lat: 2.99, lng: 101.39, type: 'container', volume: '13.2M TEU', rank: 10 },
  { name: 'Antwerp', country: 'BE', lat: 51.30, lng: 4.40, type: 'container', volume: '12.0M TEU', rank: 11 },
  { name: 'Xiamen', country: 'CN', lat: 24.48, lng: 118.09, type: 'container', volume: '11.4M TEU', rank: 12 },
  { name: 'Hamburg', country: 'DE', lat: 53.55, lng: 9.97, type: 'container', volume: '8.7M TEU', rank: 14 },
  { name: 'Los Angeles', country: 'US', lat: 33.74, lng: -118.27, type: 'container', volume: '9.9M TEU', rank: 13 },
  { name: 'Long Beach', country: 'US', lat: 33.75, lng: -118.19, type: 'container', volume: '8.0M TEU', rank: 15 },
  { name: 'Tanjung Pelepas', country: 'MY', lat: 1.36, lng: 103.55, type: 'container', volume: '9.8M TEU', rank: 16 },
  { name: 'Savannah', country: 'US', lat: 32.08, lng: -81.09, type: 'container', volume: '5.6M TEU', rank: 20 },
  { name: 'Felixstowe', country: 'GB', lat: 51.96, lng: 1.35, type: 'container', volume: '3.8M TEU', rank: 25 },
  { name: 'Santos', country: 'BR', lat: -23.95, lng: -46.31, type: 'container', volume: '4.2M TEU', rank: 22 },
  { name: 'Colombo', country: 'LK', lat: 6.94, lng: 79.84, type: 'container', volume: '7.2M TEU', rank: 17 },
  // ── Energy/Oil Ports ──
  { name: 'Ras Tanura', country: 'SA', lat: 26.64, lng: 50.16, type: 'energy', volume: '6.5M bpd' },
  { name: 'Fujairah', country: 'AE', lat: 25.14, lng: 56.35, type: 'energy', volume: '3.5M bpd' },
  { name: 'Novorossiysk', country: 'RU', lat: 44.72, lng: 37.77, type: 'energy', volume: '2.8M bpd' },
  { name: 'Houston Ship Channel', country: 'US', lat: 29.73, lng: -95.27, type: 'energy', volume: '2.5M bpd' },
  { name: 'Kharg Island', country: 'IR', lat: 29.24, lng: 50.33, type: 'energy', volume: '2.0M bpd' },
  { name: 'Primorsk', country: 'RU', lat: 60.35, lng: 28.70, type: 'energy', volume: '1.6M bpd' },
  // ── Major Naval Bases ──
  { name: 'Norfolk Naval Station', country: 'US', lat: 36.95, lng: -76.33, type: 'naval', fleet: 'US Atlantic Fleet' },
  { name: 'San Diego Naval Base', country: 'US', lat: 32.69, lng: -117.15, type: 'naval', fleet: 'US Pacific Fleet' },
  { name: 'Pearl Harbor', country: 'US', lat: 21.35, lng: -157.97, type: 'naval', fleet: 'US Pacific Fleet' },
  { name: 'Yokosuka', country: 'JP', lat: 35.28, lng: 139.67, type: 'naval', fleet: 'US 7th Fleet' },
  { name: 'Severomorsk', country: 'RU', lat: 69.07, lng: 33.42, type: 'naval', fleet: 'Russian Northern Fleet' },
  { name: 'Tartus', country: 'SY', lat: 34.89, lng: 35.89, type: 'naval', fleet: 'Russian Mediterranean' },
  { name: 'Zhanjiang', country: 'CN', lat: 21.20, lng: 110.39, type: 'naval', fleet: 'PLA Navy South Sea Fleet' },
  { name: 'Portsmouth', country: 'GB', lat: 50.80, lng: -1.11, type: 'naval', fleet: 'Royal Navy' },
  { name: 'Toulon', country: 'FR', lat: 43.12, lng: 5.93, type: 'naval', fleet: 'French Navy Mediterranean' },
  { name: 'Changi Naval Base', country: 'SG', lat: 1.33, lng: 104.01, type: 'naval', fleet: 'Republic of Singapore Navy' },
  { name: 'Visakhapatnam', country: 'IN', lat: 17.69, lng: 83.30, type: 'naval', fleet: 'Indian Navy Eastern Command' },
  { name: 'Mumbai Naval', country: 'IN', lat: 18.93, lng: 72.84, type: 'naval', fleet: 'Indian Navy Western Command' },
];

const CHOKEPOINTS = [
  { name: 'Strait of Hormuz', lat: 26.57, lng: 56.25, traffic: '21M bpd oil', risk: 'HIGH' },
  { name: 'Strait of Malacca', lat: 2.50, lng: 101.50, traffic: '16M bpd oil', risk: 'MODERATE' },
  { name: 'Suez Canal', lat: 30.43, lng: 32.34, traffic: '12% world trade', risk: 'ELEVATED' },
  { name: 'Bab el-Mandeb', lat: 12.58, lng: 43.33, traffic: '6.2M bpd oil', risk: 'CRITICAL' },
  { name: 'Panama Canal', lat: 9.08, lng: -79.68, traffic: '5% world trade', risk: 'LOW' },
  { name: 'Turkish Straits', lat: 41.12, lng: 29.07, traffic: '3M bpd oil', risk: 'MODERATE' },
  { name: 'Danish Straits', lat: 55.70, lng: 12.60, traffic: '3.2M bpd oil', risk: 'LOW' },
  { name: 'Cape of Good Hope', lat: -34.36, lng: 18.47, traffic: 'Alt route Suez', risk: 'LOW' },
  { name: 'Taiwan Strait', lat: 24.00, lng: 119.00, traffic: '88% large ships', risk: 'ELEVATED' },
  { name: 'Lombok Strait', lat: -8.47, lng: 115.72, traffic: 'Alt Malacca', risk: 'LOW' },
];

interface VesselMeta {
  name?: string;
  shipType?: number;
  destination?: string;
  draught?: number;
  callSign?: string;
  imo?: number;
}

// Caché de metadatos en memoria: cambian poco y el endpoint se sondea cada 10s.
let metaCache: Map<number, VesselMeta> | null = null;
let metaCacheTime = 0;
const META_TTL = 300000; // 5 min

/** Descarga metadatos de buques y los indexa por MMSI (con caché de 5 min). */
async function fetchVesselMeta(): Promise<Map<number, VesselMeta>> {
  if (metaCache && Date.now() - metaCacheTime < META_TTL) return metaCache;
  const map = new Map<number, VesselMeta>();
  try {
    const res = await fetch(AIS_VESSELS_URL, { headers: DT_HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return metaCache || map;
    const arr: any[] = await res.json();
    for (const v of arr) {
      if (v.mmsi == null) continue;
      map.set(v.mmsi, {
        name: typeof v.name === 'string' ? v.name.trim() : undefined,
        shipType: typeof v.shipType === 'number' ? v.shipType : undefined,
        destination: typeof v.destination === 'string' ? v.destination.trim() : undefined,
        draught: typeof v.draught === 'number' ? v.draught : undefined,
        callSign: typeof v.callSign === 'string' ? v.callSign.trim() : undefined,
        imo: typeof v.imo === 'number' && v.imo > 0 ? v.imo : undefined,
      });
    }
    metaCache = map;
    metaCacheTime = Date.now();
  } catch {
    /* sin metadatos: los barcos quedarán como 'other' */
    return metaCache || map;
  }
  return map;
}

async function fetchShips(): Promise<{ ships: any[]; counts: Record<string, number> }> {
  const counts: Record<string, number> = {
    cargo: 0, tanker: 0, passenger: 0, fishing: 0, tug: 0, highspeed: 0, military: 0, other: 0,
  };
  try {
    const [locRes, meta] = await Promise.all([
      fetch(AIS_LOCATIONS_URL, { headers: DT_HEADERS, signal: AbortSignal.timeout(12000) }),
      fetchVesselMeta(),
    ]);
    if (!locRes.ok) return { ships: [], counts };
    const data = await locRes.json();
    const feats: any[] = data.features || [];
    const step = Math.max(1, Math.floor(feats.length / MAX_SHIPS));
    const ships: any[] = [];
    for (let i = 0; i < feats.length; i += step) {
      const f = feats[i];
      const c = (f.geometry || {}).coordinates;
      if (!c) continue;
      const lng = c[0], lat = c[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const p = f.properties || {};
      const mmsi = p.mmsi;
      const m = mmsi != null ? meta.get(mmsi) : undefined;
      const category = shipCategory(m?.shipType);
      const navStat = p.navStat;
      const moored = navStat === 1 || navStat === 5; // 1 anclado, 5 amarrado
      counts[category] = (counts[category] || 0) + 1;
      const ship: any = {
        id: mmsi,
        mmsi,
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
        speed: typeof p.sog === 'number' ? p.sog : 0,
        course: typeof p.cog === 'number' && p.cog !== 360 ? p.cog : null,
        heading: p.heading != null && p.heading !== 511 ? p.heading : (p.cog ?? 0),
        type: category,
        name: m?.name || `MMSI ${mmsi}`,
        flag: flagFromMmsi(mmsi),
        moored,
      };
      if (m?.destination) ship.destination = m.destination;
      if (m?.draught) ship.draught = Math.round(m.draught) / 10; // decímetros → metros
      if (m?.callSign) ship.callsign = m.callSign;
      if (m?.imo) ship.imo = m.imo;
      ships.push(ship);
      if (ships.length >= MAX_SHIPS) break;
    }
    return { ships, counts };
  } catch {
    return { ships: [], counts };
  }
}

const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dx = (lng1 - lng2) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dy = lat1 - lat2;
  return Math.sqrt(dx * dx + dy * dy) * 111.32;
};

export async function GET() {
  const { ships, counts } = await fetchShips();

  const majorPorts = PORTS_MAJOR.map((port) => {
    let nearby = 0, waiting = 0;
    for (const s of ships) {
      if (getDistanceKm(port.lat, port.lng, s.lat, s.lng) < 50) {
        nearby++;
        if (s.speed < 0.5) waiting++;
      }
    }
    const ratio = nearby > 0 ? waiting / nearby : 0;
    let congestion = 'NORMAL', dwell = '1-2 días';
    if (ratio > 0.6 || waiting > 30) { congestion = 'SEVERA'; dwell = '7+ días'; }
    else if (ratio > 0.4 || waiting > 15) { congestion = 'CONGESTIONADO'; dwell = '3-5 días'; }
    return { ...port, congestion, dwell_time: dwell, live_nearby: nearby, live_waiting: waiting };
  });

  // Puertos del mundo (dataset estático) sin cálculo de congestión.
  const wPorts = (worldPorts as Array<{ name: string; country: string; lat: number; lng: number }>).map((p) => ({
    name: p.name, country: p.country, lat: p.lat, lng: p.lng, type: 'port',
  }));

  const chokepoints = CHOKEPOINTS.map((choke) => {
    let nearby = 0;
    for (const s of ships) if (getDistanceKm(choke.lat, choke.lng, s.lat, s.lng) < 100) nearby++;
    let risk = choke.risk;
    if (nearby > 50) risk = 'CRITICAL';
    else if (nearby > 20 && risk !== 'CRITICAL') risk = 'HIGH';
    else if (nearby > 5 && risk === 'LOW') risk = 'ELEVATED';
    return { ...choke, traffic: `${choke.traffic} | LIVE: ${nearby}`, risk };
  });

  const ports = [...majorPorts, ...wPorts];

  return NextResponse.json(
    {
      ports,
      chokepoints,
      ships,
      ship_type_counts: counts,
      ships_source: 'Digitraffic / Fintraffic AIS',
      total_ports: ports.length,
      total_chokepoints: chokepoints.length,
      total_ships: ships.length,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  );
}
