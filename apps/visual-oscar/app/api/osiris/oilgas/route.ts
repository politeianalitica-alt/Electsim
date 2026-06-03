import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Grandes campos de petróleo y gas del mundo (lista curada).
 * type: 'oil' | 'gas' | 'both'. Coordenadas aproximadas al centroide del campo.
 */
type Field = { name: string; lat: number; lng: number; type: 'oil' | 'gas' | 'both'; country: string };
const FIELDS: Field[] = [
  // Oriente Medio
  { name: 'Ghawar', lat: 25.4, lng: 49.6, type: 'oil', country: 'Arabia Saudí' },
  { name: 'Safaniya', lat: 28.0, lng: 48.8, type: 'oil', country: 'Arabia Saudí' },
  { name: 'Khurais', lat: 25.1, lng: 48.0, type: 'oil', country: 'Arabia Saudí' },
  { name: 'Manifa', lat: 27.7, lng: 49.0, type: 'oil', country: 'Arabia Saudí' },
  { name: 'Burgan', lat: 28.9, lng: 47.9, type: 'oil', country: 'Kuwait' },
  { name: 'Rumaila', lat: 30.4, lng: 47.3, type: 'oil', country: 'Irak' },
  { name: 'West Qurna', lat: 31.0, lng: 47.3, type: 'oil', country: 'Irak' },
  { name: 'Kirkuk', lat: 35.5, lng: 44.4, type: 'oil', country: 'Irak' },
  { name: 'Ahvaz', lat: 31.3, lng: 48.7, type: 'oil', country: 'Irán' },
  { name: 'Gachsaran', lat: 30.3, lng: 50.8, type: 'oil', country: 'Irán' },
  { name: 'South Pars / North Dome', lat: 26.5, lng: 52.0, type: 'gas', country: 'Irán / Catar' },
  { name: 'Zakum', lat: 24.9, lng: 53.4, type: 'oil', country: 'EAU' },
  { name: 'Bu Hasa', lat: 23.5, lng: 53.2, type: 'oil', country: 'EAU' },
  { name: 'Dukhan', lat: 25.4, lng: 50.8, type: 'both', country: 'Catar' },
  // Norteamérica
  { name: 'Permian Basin', lat: 31.8, lng: -102.5, type: 'both', country: 'EE. UU.' },
  { name: 'Eagle Ford', lat: 28.8, lng: -98.5, type: 'both', country: 'EE. UU.' },
  { name: 'Bakken', lat: 48.2, lng: -103.0, type: 'oil', country: 'EE. UU.' },
  { name: 'Prudhoe Bay', lat: 70.3, lng: -148.4, type: 'oil', country: 'EE. UU.' },
  { name: 'Marcellus (gas)', lat: 41.0, lng: -77.5, type: 'gas', country: 'EE. UU.' },
  { name: 'Cantarell', lat: 19.4, lng: -92.2, type: 'oil', country: 'México' },
  { name: 'Athabasca (arenas)', lat: 57.0, lng: -111.5, type: 'oil', country: 'Canadá' },
  { name: 'Hibernia', lat: 46.7, lng: -48.8, type: 'oil', country: 'Canadá' },
  // Sudamérica
  { name: 'Lula / Tupi (presal)', lat: -25.0, lng: -42.5, type: 'oil', country: 'Brasil' },
  { name: 'Marlim', lat: -22.5, lng: -40.0, type: 'oil', country: 'Brasil' },
  { name: 'Faja del Orinoco', lat: 8.5, lng: -64.5, type: 'oil', country: 'Venezuela' },
  { name: 'Bolívar Costanero', lat: 10.0, lng: -71.5, type: 'oil', country: 'Venezuela' },
  { name: 'Vaca Muerta', lat: -38.5, lng: -69.2, type: 'both', country: 'Argentina' },
  // Rusia / Caspio / Asia Central
  { name: 'Samotlor', lat: 61.1, lng: 76.8, type: 'oil', country: 'Rusia' },
  { name: 'Priobskoye', lat: 61.0, lng: 70.0, type: 'oil', country: 'Rusia' },
  { name: 'Urengoy', lat: 66.0, lng: 76.6, type: 'gas', country: 'Rusia' },
  { name: 'Yamburg', lat: 68.0, lng: 77.0, type: 'gas', country: 'Rusia' },
  { name: 'Bovanenkovo', lat: 70.4, lng: 68.3, type: 'gas', country: 'Rusia' },
  { name: 'Sakhalin', lat: 52.0, lng: 143.5, type: 'both', country: 'Rusia' },
  { name: 'Tengiz', lat: 46.1, lng: 53.5, type: 'oil', country: 'Kazajistán' },
  { name: 'Kashagan', lat: 46.5, lng: 51.4, type: 'oil', country: 'Kazajistán' },
  { name: 'Karachaganak', lat: 51.4, lng: 51.9, type: 'gas', country: 'Kazajistán' },
  { name: 'Azeri-Chirag-Gunashli', lat: 40.0, lng: 50.5, type: 'oil', country: 'Azerbaiyán' },
  { name: 'Shah Deniz', lat: 39.5, lng: 50.6, type: 'gas', country: 'Azerbaiyán' },
  { name: 'Galkynysh', lat: 37.2, lng: 62.2, type: 'gas', country: 'Turkmenistán' },
  // Mar del Norte / Europa
  { name: 'Groningen', lat: 53.3, lng: 6.8, type: 'gas', country: 'Países Bajos' },
  { name: 'Troll', lat: 60.7, lng: 3.7, type: 'gas', country: 'Noruega' },
  { name: 'Johan Sverdrup', lat: 58.8, lng: 2.6, type: 'oil', country: 'Noruega' },
  { name: 'Ekofisk', lat: 56.5, lng: 3.2, type: 'oil', country: 'Noruega' },
  { name: 'Forties', lat: 57.7, lng: 0.9, type: 'oil', country: 'Reino Unido' },
  // África
  { name: 'Hassi Messaoud', lat: 31.7, lng: 6.1, type: 'oil', country: 'Argelia' },
  { name: "Hassi R'Mel", lat: 32.9, lng: 3.3, type: 'gas', country: 'Argelia' },
  { name: 'Zohr', lat: 33.7, lng: 32.6, type: 'gas', country: 'Egipto' },
  { name: 'Delta del Níger', lat: 5.3, lng: 6.0, type: 'oil', country: 'Nigeria' },
  { name: 'Agbami', lat: 4.0, lng: 5.0, type: 'oil', country: 'Nigeria' },
  { name: 'Greater Plutonio', lat: -7.5, lng: 11.5, type: 'oil', country: 'Angola' },
  { name: 'Jubilee', lat: 4.6, lng: -2.9, type: 'oil', country: 'Ghana' },
  // Asia-Pacífico
  { name: 'Daqing', lat: 46.6, lng: 125.0, type: 'oil', country: 'China' },
  { name: 'Shengli', lat: 37.5, lng: 118.5, type: 'oil', country: 'China' },
  { name: 'Mumbai High', lat: 19.5, lng: 71.3, type: 'oil', country: 'India' },
  { name: 'Minas', lat: 0.9, lng: 101.4, type: 'oil', country: 'Indonesia' },
  { name: 'North West Shelf', lat: -19.6, lng: 116.1, type: 'gas', country: 'Australia' },
  { name: 'Gorgon', lat: -20.8, lng: 115.5, type: 'gas', country: 'Australia' },
  // Mediterráneo oriental
  { name: 'Leviathan', lat: 33.0, lng: 33.8, type: 'gas', country: 'Israel' },
  { name: 'Tamar', lat: 32.9, lng: 34.0, type: 'gas', country: 'Israel' },
];

const COLOR = { oil: '#8D6E63', gas: '#42A5F5', both: '#AB47BC' };

export async function GET() {
  const fields = FIELDS.map((f) => ({ ...f, color: COLOR[f.type] }));
  return NextResponse.json(
    { fields, total: fields.length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
