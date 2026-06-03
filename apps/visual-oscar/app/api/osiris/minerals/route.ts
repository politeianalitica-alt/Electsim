import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Minas y depósitos de minerales críticos (lista curada de los
 * yacimientos más relevantes por materia prima estratégica).
 */
type Mine = { name: string; lat: number; lng: number; m: string; country: string };
const MINES: Mine[] = [
  // Litio
  { name: 'Greenbushes', lat: -33.86, lng: 116.06, m: 'litio', country: 'Australia' },
  { name: 'Pilgangoora', lat: -21.0, lng: 118.9, m: 'litio', country: 'Australia' },
  { name: 'Salar de Atacama', lat: -23.5, lng: -68.2, m: 'litio', country: 'Chile' },
  { name: 'Salar de Uyuni', lat: -20.3, lng: -67.0, m: 'litio', country: 'Bolivia' },
  { name: 'Salar del Hombre Muerto', lat: -25.4, lng: -67.0, m: 'litio', country: 'Argentina' },
  { name: 'Thacker Pass', lat: 41.7, lng: -118.0, m: 'litio', country: 'EE. UU.' },
  { name: 'Jadar', lat: 44.5, lng: 19.3, m: 'litio', country: 'Serbia' },
  { name: 'Manono', lat: -7.3, lng: 27.4, m: 'litio', country: 'RD Congo' },
  // Cobalto
  { name: 'Mutanda', lat: -10.7, lng: 25.9, m: 'cobalto', country: 'RD Congo' },
  { name: 'Tenke Fungurume', lat: -10.6, lng: 26.1, m: 'cobalto', country: 'RD Congo' },
  { name: 'Kamoto', lat: -10.7, lng: 25.4, m: 'cobalto', country: 'RD Congo' },
  // Tierras raras
  { name: 'Bayan Obo', lat: 41.8, lng: 109.97, m: 'tierras raras', country: 'China' },
  { name: 'Mountain Pass', lat: 35.48, lng: -115.53, m: 'tierras raras', country: 'EE. UU.' },
  { name: 'Mount Weld', lat: -28.9, lng: 122.5, m: 'tierras raras', country: 'Australia' },
  { name: 'Lovozero', lat: 67.8, lng: 34.6, m: 'tierras raras', country: 'Rusia' },
  // Níquel
  { name: 'Norilsk', lat: 69.3, lng: 88.2, m: 'níquel / paladio', country: 'Rusia' },
  { name: 'Sorowako', lat: -2.5, lng: 121.4, m: 'níquel', country: 'Indonesia' },
  { name: 'Goro', lat: -22.3, lng: 167.0, m: 'níquel', country: 'Nueva Caledonia' },
  { name: 'Ambatovy', lat: -18.8, lng: 48.3, m: 'níquel / cobalto', country: 'Madagascar' },
  // Cobre
  { name: 'Escondida', lat: -24.27, lng: -69.07, m: 'cobre', country: 'Chile' },
  { name: 'Collahuasi', lat: -20.98, lng: -68.65, m: 'cobre', country: 'Chile' },
  { name: 'El Teniente', lat: -34.1, lng: -70.35, m: 'cobre', country: 'Chile' },
  { name: 'Grasberg', lat: -4.06, lng: 137.12, m: 'cobre / oro', country: 'Indonesia' },
  { name: 'Oyu Tolgoi', lat: 43.0, lng: 106.9, m: 'cobre / oro', country: 'Mongolia' },
  { name: 'Kamoa-Kakula', lat: -10.8, lng: 25.3, m: 'cobre', country: 'RD Congo' },
  { name: 'Morenci', lat: 33.05, lng: -109.36, m: 'cobre', country: 'EE. UU.' },
  { name: 'Cerro Verde', lat: -16.5, lng: -71.6, m: 'cobre', country: 'Perú' },
  // Platino / Manganeso
  { name: 'Complejo Bushveld', lat: -24.8, lng: 29.3, m: 'platino', country: 'Sudáfrica' },
  { name: 'Kalahari (manganeso)', lat: -27.2, lng: 22.9, m: 'manganeso', country: 'Sudáfrica' },
  // Grafito
  { name: 'Balama', lat: -13.3, lng: 38.6, m: 'grafito', country: 'Mozambique' },
  // Uranio
  { name: 'McArthur River', lat: 57.8, lng: -105.0, m: 'uranio', country: 'Canadá' },
  { name: 'Olympic Dam', lat: -30.44, lng: 136.88, m: 'uranio / cobre', country: 'Australia' },
  { name: 'Husab', lat: -22.6, lng: 15.1, m: 'uranio', country: 'Namibia' },
  // Estaño / Wolframio
  { name: 'Cínovec', lat: 50.7, lng: 13.8, m: 'estaño / litio', country: 'Chequia' },
];

const COLOR: Record<string, string> = {
  litio: '#26C6DA', cobalto: '#5C6BC0', 'tierras raras': '#FFCA28', níquel: '#8D6E63',
  'níquel / paladio': '#8D6E63', 'níquel / cobalto': '#8D6E63', cobre: '#FF7043',
  'cobre / oro': '#FFB300', platino: '#B0BEC5', manganeso: '#7E57C2', grafito: '#546E7A',
  uranio: '#66BB6A', 'uranio / cobre': '#66BB6A', 'estaño / litio': '#26C6DA',
};

export async function GET() {
  const mines = MINES.map((m) => ({ ...m, color: COLOR[m.m] || '#26A69A' }));
  return NextResponse.json(
    { mines, total: mines.length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
