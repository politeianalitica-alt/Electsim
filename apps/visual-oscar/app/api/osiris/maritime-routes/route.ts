import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Rutas comerciales marítimas (grandes corredores, curado) y focos
 * de piratería marítima (zonas de riesgo, curado).
 */
const LANES: Array<{ name: string; coords: number[][] }> = [
  { name: 'Transatlántico Norte', coords: [[4, 52], [-1.5, 50], [-30, 48], [-60, 42], [-74, 40.5]] },
  { name: 'Transpacífico', coords: [[122, 31], [140, 35], [170, 41], [-160, 40], [-130, 37], [-118, 34]] },
  { name: 'Asia–Europa (Suez)', coords: [[104, 1.3], [80, 6], [60, 12], [50, 13], [43.3, 12.6], [37, 22], [33, 28], [32.5, 30], [32, 32], [18, 36], [10, 37], [-1, 36], [-6, 36], [-9.5, 41], [-1.5, 49], [4, 52]] },
  { name: 'Asia–Europa (Cabo)', coords: [[104, 1.3], [80, 3], [60, -2], [40, -12], [25, -34], [18, -35], [5, -25], [-10, 0], [-18, 20], [-10, 36], [-9.5, 41], [4, 52]] },
  { name: 'Asia–Costa Este EE. UU. (Panamá)', coords: [[122, 31], [180, 25], [-140, 18], [-95, 12], [-80, 9], [-78, 15], [-74, 40]] },
  { name: 'Golfo Pérsico (Hormuz)', coords: [[50, 28], [54, 26.5], [56.5, 26.5], [60, 24], [66, 18], [74, 10], [85, 5], [100, 3]] },
  { name: 'Estrecho de Malaca', coords: [[96, 5.5], [99, 4], [101, 2.5], [103.5, 1.3], [105, 1]] },
  { name: 'Europa–Sudamérica E', coords: [[-9.5, 41], [-20, 25], [-30, 5], [-35, -8], [-43, -23], [-48, -28]] },
  { name: 'Asia–Oceanía', coords: [[104, 1.3], [110, -6], [115, -20], [115, -32], [138, -35], [151, -34]] },
  { name: 'Báltico–Mar del Norte', coords: [[24, 59], [18, 57], [12, 56], [10, 57.5], [4, 53], [1, 51]] },
  { name: 'Costa Oeste de África', coords: [[-9.5, 41], [-17, 21], [-17, 8], [-5, 4], [6, 3], [9, -1], [12, -10], [14, -23]] },
  { name: 'Transindico (Asia–Golfo)', coords: [[100, 3], [88, 8], [78, 8], [68, 12], [58, 16], [50, 14]] },
];

const PIRACY = [
  { name: 'Golfo de Guinea', lat: 3.5, lng: 4.5, risk: 'alto' },
  { name: 'Golfo de Adén / Somalia', lat: 12.5, lng: 48.0, risk: 'alto' },
  { name: 'Estrecho de Malaca', lat: 3.0, lng: 99.5, risk: 'medio' },
  { name: 'Estrecho de Singapur', lat: 1.2, lng: 104.2, risk: 'alto' },
  { name: 'Mar de Sulú-Célebes', lat: 6.0, lng: 120.0, risk: 'medio' },
  { name: 'Bab el-Mandeb / Mar Rojo sur', lat: 13.0, lng: 43.2, risk: 'alto' },
  { name: 'Bahía de Bengala (Bangladés)', lat: 22.3, lng: 91.8, risk: 'medio' },
  { name: 'Callao (Perú)', lat: -12.05, lng: -77.2, risk: 'medio' },
  { name: 'Caribe / Venezuela', lat: 11.0, lng: -65.0, risk: 'medio' },
  { name: 'Mar de China Meridional', lat: 8.0, lng: 112.0, risk: 'medio' },
];

export async function GET() {
  const routes = {
    type: 'FeatureCollection',
    features: LANES.map((l) => ({ type: 'Feature', properties: { name: l.name }, geometry: { type: 'LineString', coordinates: l.coords } })),
  };
  const piracy = PIRACY.map((p) => ({ ...p, color: p.risk === 'alto' ? '#EF5350' : '#FFA726' }));
  return NextResponse.json(
    { routes, piracy, total_routes: LANES.length, total_piracy: piracy.length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
