import { NextResponse } from 'next/server';
import countries from './countries.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Geopolítica:
 *  - countries: países (Natural Earth) con bloque militar (OTAN/OTSC/Aliado
 *    EE.UU.) y marca de sanciones, para colorear el mapa.
 *  - disputes: territorios en disputa (lista curada).
 *  - orgs: sedes de organismos internacionales (lista curada).
 */
const DISPUTES = [
  { name: 'Crimea', lat: 45.3, lng: 34.2, parties: 'Rusia · Ucrania' },
  { name: 'Donbás', lat: 48.3, lng: 38.0, parties: 'Rusia · Ucrania' },
  { name: 'Cachemira', lat: 34.1, lng: 76.5, parties: 'India · Pakistán · China' },
  { name: 'Aksai Chin', lat: 35.1, lng: 79.4, parties: 'India · China' },
  { name: 'Arunachal Pradesh', lat: 28.2, lng: 94.7, parties: 'India · China' },
  { name: 'Sáhara Occidental', lat: 24.5, lng: -13.0, parties: 'Marruecos · Polisario' },
  { name: 'Taiwán', lat: 23.7, lng: 121.0, parties: 'China · Taiwán' },
  { name: 'Mar de China Meridional', lat: 13.0, lng: 114.0, parties: 'China · vecinos ASEAN' },
  { name: 'Islas Senkaku / Diaoyu', lat: 25.7, lng: 123.5, parties: 'Japón · China' },
  { name: 'Nagorno-Karabaj', lat: 39.8, lng: 46.7, parties: 'Armenia · Azerbaiyán' },
  { name: 'Altos del Golán', lat: 33.0, lng: 35.75, parties: 'Israel · Siria' },
  { name: 'Cisjordania', lat: 31.9, lng: 35.3, parties: 'Israel · Palestina' },
  { name: 'Kosovo', lat: 42.6, lng: 21.0, parties: 'Kosovo · Serbia' },
  { name: 'Islas Kuriles', lat: 44.5, lng: 147.0, parties: 'Rusia · Japón' },
  { name: 'Islas Malvinas', lat: -51.7, lng: -59.2, parties: 'Reino Unido · Argentina' },
  { name: 'Transnistria', lat: 47.0, lng: 29.5, parties: 'Moldavia · separatistas' },
  { name: 'Abjasia', lat: 43.0, lng: 41.0, parties: 'Georgia · Rusia' },
  { name: 'Osetia del Sur', lat: 42.3, lng: 43.9, parties: 'Georgia · Rusia' },
  { name: 'Chipre del Norte', lat: 35.3, lng: 33.4, parties: 'Chipre · Turquía' },
  { name: 'Gibraltar', lat: 36.14, lng: -5.35, parties: 'Reino Unido · España' },
  { name: 'Esequibo', lat: 6.0, lng: -59.5, parties: 'Guyana · Venezuela' },
];

const ORGS = [
  { name: 'ONU (Sede)', lat: 40.75, lng: -73.97, city: 'Nueva York' },
  { name: 'ONU Ginebra', lat: 46.23, lng: 6.14, city: 'Ginebra' },
  { name: 'OTAN', lat: 50.88, lng: 4.42, city: 'Bruselas' },
  { name: 'Unión Europea', lat: 50.84, lng: 4.38, city: 'Bruselas' },
  { name: 'Unión Africana', lat: 9.01, lng: 38.74, city: 'Adís Abeba' },
  { name: 'ASEAN', lat: -6.24, lng: 106.80, city: 'Yakarta' },
  { name: 'Liga Árabe', lat: 30.05, lng: 31.23, city: 'El Cairo' },
  { name: 'OEA', lat: 38.89, lng: -77.04, city: 'Washington' },
  { name: 'Interpol', lat: 45.78, lng: 4.86, city: 'Lyon' },
  { name: 'OMC', lat: 46.22, lng: 6.15, city: 'Ginebra' },
  { name: 'OMS', lat: 46.23, lng: 6.13, city: 'Ginebra' },
  { name: 'FMI / Banco Mundial', lat: 38.90, lng: -77.04, city: 'Washington' },
  { name: 'Corte Penal Internacional', lat: 52.07, lng: 4.35, city: 'La Haya' },
  { name: 'Corte Internacional de Justicia', lat: 52.09, lng: 4.30, city: 'La Haya' },
  { name: 'OPEP', lat: 48.20, lng: 16.37, city: 'Viena' },
  { name: 'OIEA', lat: 48.23, lng: 16.42, city: 'Viena' },
  { name: 'OCDE', lat: 48.87, lng: 2.27, city: 'París' },
  { name: 'Consejo de Europa', lat: 48.59, lng: 7.77, city: 'Estrasburgo' },
  { name: 'Mercosur', lat: -34.90, lng: -56.16, city: 'Montevideo' },
];

export async function GET() {
  return NextResponse.json(
    { countries, disputes: DISPUTES, orgs: ORGS, total_countries: (countries as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
