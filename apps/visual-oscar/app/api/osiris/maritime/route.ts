import { NextResponse } from 'next/server';
import worldPorts from './ports-world.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Maritime Intelligence
 * - Barcos en vivo (AIS) vía Digitraffic / Fintraffic (REST abierto, sin key);
 *   cobertura del Báltico y mar del Norte. Antes se usaba un WebSocket de
 *   aisstream que no persiste en serverless (0 barcos) — sustituido.
 * - Puertos: 52 principales (con volumen/naval + congestión calculada en vivo)
 *   + ~1.586 puertos del mundo (dataset estático).
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const AIS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';
const MAX_SHIPS = 4000;

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

async function fetchShips(): Promise<any[]> {
  try {
    const res = await fetch(AIS_URL, {
      headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'PoliteiaOsintMap' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
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
      const navStat = p.navStat;
      ships.push({
        id: p.mmsi, mmsi: p.mmsi, lat, lng,
        speed: typeof p.sog === 'number' ? p.sog : 0,
        heading: p.heading != null && p.heading !== 511 ? p.heading : (p.cog ?? 0),
        type: navStat === 1 || navStat === 5 ? 'anchored' : 'cargo',
        name: `MMSI ${p.mmsi}`,
        source: 'Digitraffic AIS',
      });
      if (ships.length >= MAX_SHIPS) break;
    }
    return ships;
  } catch {
    return [];
  }
}

const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dx = (lng1 - lng2) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dy = lat1 - lat2;
  return Math.sqrt(dx * dx + dy * dy) * 111.32;
};

export async function GET() {
  const ships = await fetchShips();

  const majorPorts = PORTS_MAJOR.map((port) => {
    let nearby = 0, waiting = 0;
    for (const s of ships) {
      if (getDistanceKm(port.lat, port.lng, s.lat, s.lng) < 50) {
        nearby++;
        if (s.speed < 0.5 && s.type !== 'military') waiting++;
      }
    }
    const ratio = nearby > 0 ? waiting / nearby : 0;
    let congestion = 'NORMAL', dwell = '1-2 Days';
    if (ratio > 0.6 || waiting > 30) { congestion = 'SEVERE'; dwell = '7+ Days'; }
    else if (ratio > 0.4 || waiting > 15) { congestion = 'CONGESTED'; dwell = '3-5 Days'; }
    return { ...port, congestion, dwell_time: dwell, live_nearby: nearby };
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
      total_ports: ports.length,
      total_chokepoints: chokepoints.length,
      total_ships: ships.length,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  );
}
