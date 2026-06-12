import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * Politeia — Precio de la vivienda (€/m²).
 *
 * España: precio medio del m² de vivienda libre por comunidad autónoma
 * (dato oficial del ecosistema INE/MITMA, último disponible ~2024, redondeado
 * y orientativo). Se ENRIQUECE en vivo con la variación interanual del Índice
 * de Precios de Vivienda (IPV) del INE — esos sí son datos del INE en directo
 * (API Tempus3, tabla 79540).
 *
 * Otros países: precio medio nacional aproximado (€/m²) donde existe dato
 * oficial publicado. Marcados como "media nacional aprox." con su año.
 *
 * Nota de honestidad: ni el INE ni Eurostat publican €/m² por API abierta
 * (solo un ÍNDICE base 2015=100). Por eso los €/m² son una instantánea
 * oficial curada y la parte "live" es la variación del IPV.
 */

interface PriceRow {
  scope: 'city' | 'country';
  name: string;
  lat: number;
  lng: number;
  price: number;      // €/m²
  year: number;
  source: string;
  ccaa?: string;      // para emparejar la variación INE por CCAA
  yoy?: number;       // variación interanual % (INE, solo España si live OK)
}

// ── España · €/m² por municipio (capitales de provincia + grandes ciudades) ──
// Snapshot oficial orientativo ~2024 (€/m² vivienda libre, ecosistema INE/MITMA),
// redondeado. `ccaa` se usa para colgar la variación interanual del IPV (INE live).
const SPAIN_MUNI: Array<Omit<PriceRow, 'scope' | 'source'>> = [
  { name: 'Donostia / San Sebastián', lat: 43.32, lng: -1.98, price: 5500, year: 2024, ccaa: 'País Vasco' },
  { name: 'Barcelona',          lat: 41.39, lng: 2.17,  price: 4400, year: 2024, ccaa: 'Cataluña' },
  { name: 'Madrid',             lat: 40.42, lng: -3.70, price: 4200, year: 2024, ccaa: 'Madrid' },
  { name: 'Palma',              lat: 39.57, lng: 2.65,  price: 3700, year: 2024, ccaa: 'Illes Balears' },
  { name: "L'Hospitalet",       lat: 41.36, lng: 2.10,  price: 3500, year: 2024, ccaa: 'Cataluña' },
  { name: 'Marbella',           lat: 36.51, lng: -4.89, price: 3500, year: 2024, ccaa: 'Andalucía' },
  { name: 'Bilbao',             lat: 43.26, lng: -2.93, price: 3300, year: 2024, ccaa: 'País Vasco' },
  { name: 'Málaga',             lat: 36.72, lng: -4.42, price: 3000, year: 2024, ccaa: 'Andalucía' },
  { name: 'Cádiz',              lat: 36.53, lng: -6.29, price: 2700, year: 2024, ccaa: 'Andalucía' },
  { name: 'Vitoria-Gasteiz',    lat: 42.85, lng: -2.67, price: 2700, year: 2024, ccaa: 'País Vasco' },
  { name: 'Pamplona',           lat: 42.81, lng: -1.64, price: 2700, year: 2024, ccaa: 'Navarra' },
  { name: 'Santander',          lat: 43.46, lng: -3.81, price: 2550, year: 2024, ccaa: 'Cantabria' },
  { name: 'Valencia',           lat: 39.47, lng: -0.38, price: 2450, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Girona',             lat: 41.98, lng: 2.82,  price: 2450, year: 2024, ccaa: 'Cataluña' },
  { name: 'Sevilla',            lat: 37.39, lng: -5.99, price: 2400, year: 2024, ccaa: 'Andalucía' },
  { name: 'A Coruña',           lat: 43.37, lng: -8.40, price: 2350, year: 2024, ccaa: 'Galicia' },
  { name: 'Las Palmas de G.C.', lat: 28.12, lng: -15.43, price: 2300, year: 2024, ccaa: 'Canarias' },
  { name: 'Alicante',           lat: 38.35, lng: -0.48, price: 2150, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Granada',            lat: 37.18, lng: -3.60, price: 2100, year: 2024, ccaa: 'Andalucía' },
  { name: 'Sta. Cruz de Tenerife', lat: 28.47, lng: -16.25, price: 2100, year: 2024, ccaa: 'Canarias' },
  { name: 'Vigo',               lat: 42.24, lng: -8.72, price: 2100, year: 2024, ccaa: 'Galicia' },
  { name: 'Zaragoza',           lat: 41.65, lng: -0.89, price: 2050, year: 2024, ccaa: 'Aragón' },
  { name: 'Gijón',              lat: 43.53, lng: -5.66, price: 2000, year: 2024, ccaa: 'Asturias' },
  { name: 'Salamanca',          lat: 40.97, lng: -5.66, price: 2000, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Oviedo',             lat: 43.36, lng: -5.85, price: 1950, year: 2024, ccaa: 'Asturias' },
  { name: 'Tarragona',          lat: 41.12, lng: 1.25,  price: 1900, year: 2024, ccaa: 'Cataluña' },
  { name: 'Burgos',             lat: 42.34, lng: -3.70, price: 1900, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Logroño',            lat: 42.47, lng: -2.45, price: 1900, year: 2024, ccaa: 'La Rioja' },
  { name: 'Pontevedra',         lat: 42.43, lng: -8.64, price: 1850, year: 2024, ccaa: 'Galicia' },
  { name: 'Valladolid',         lat: 41.65, lng: -4.72, price: 1800, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Segovia',            lat: 40.95, lng: -4.12, price: 1700, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Córdoba',            lat: 37.89, lng: -4.78, price: 1700, year: 2024, ccaa: 'Andalucía' },
  { name: 'Guadalajara',        lat: 40.63, lng: -3.16, price: 1700, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Ourense',            lat: 42.34, lng: -7.86, price: 1650, year: 2024, ccaa: 'Galicia' },
  { name: 'Almería',            lat: 36.84, lng: -2.46, price: 1600, year: 2024, ccaa: 'Andalucía' },
  { name: 'Toledo',             lat: 39.86, lng: -4.02, price: 1600, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Huesca',             lat: 42.14, lng: -0.41, price: 1600, year: 2024, ccaa: 'Aragón' },
  { name: 'Huelva',             lat: 37.26, lng: -6.94, price: 1550, year: 2024, ccaa: 'Andalucía' },
  { name: 'Castellón',          lat: 39.99, lng: -0.04, price: 1500, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Murcia',             lat: 37.99, lng: -1.13, price: 1500, year: 2024, ccaa: 'Región de Murcia' },
  { name: 'León',               lat: 42.60, lng: -5.57, price: 1500, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Lugo',               lat: 43.01, lng: -7.56, price: 1500, year: 2024, ccaa: 'Galicia' },
  { name: 'Lleida',             lat: 41.62, lng: 0.62,  price: 1450, year: 2024, ccaa: 'Cataluña' },
  { name: 'Albacete',           lat: 38.99, lng: -1.86, price: 1400, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Cáceres',            lat: 39.47, lng: -6.37, price: 1400, year: 2024, ccaa: 'Extremadura' },
  { name: 'Palencia',           lat: 42.01, lng: -4.53, price: 1400, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Soria',              lat: 41.76, lng: -2.46, price: 1400, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Ávila',              lat: 40.66, lng: -4.70, price: 1350, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Zamora',             lat: 41.50, lng: -5.74, price: 1350, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Teruel',             lat: 40.34, lng: -1.11, price: 1350, year: 2024, ccaa: 'Aragón' },
  { name: 'Mérida',             lat: 38.92, lng: -6.34, price: 1300, year: 2024, ccaa: 'Extremadura' },
  { name: 'Badajoz',            lat: 38.88, lng: -6.97, price: 1300, year: 2024, ccaa: 'Extremadura' },
  { name: 'Cuenca',             lat: 40.07, lng: -2.14, price: 1300, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Jaén',               lat: 37.77, lng: -3.79, price: 1250, year: 2024, ccaa: 'Andalucía' },
  { name: 'Ciudad Real',        lat: 38.99, lng: -3.93, price: 1200, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Ceuta',              lat: 35.89, lng: -5.31, price: 2100, year: 2024, ccaa: 'Ceuta' },
  { name: 'Melilla',            lat: 35.29, lng: -2.94, price: 2000, year: 2024, ccaa: 'Melilla' },
];

// ── Otros países · €/m² medio nacional aproximado (fuentes nacionales) ──
const COUNTRIES: Array<Omit<PriceRow, 'scope' | 'source' | 'yoy'>> = [
  { name: 'Portugal',        lat: 39.5,  lng: -8.0,  price: 1700, year: 2024 },
  { name: 'Francia',         lat: 46.6,  lng: 2.4,   price: 3100, year: 2024 },
  { name: 'Alemania',        lat: 51.2,  lng: 10.4,  price: 3600, year: 2024 },
  { name: 'Italia',          lat: 42.8,  lng: 12.6,  price: 2050, year: 2024 },
  { name: 'Países Bajos',    lat: 52.2,  lng: 5.3,   price: 3900, year: 2024 },
  { name: 'Reino Unido',     lat: 53.0,  lng: -1.5,  price: 3500, year: 2024 },
  { name: 'Irlanda',         lat: 53.2,  lng: -8.0,  price: 3300, year: 2024 },
  { name: 'Bélgica',         lat: 50.6,  lng: 4.6,   price: 2700, year: 2024 },
  { name: 'Austria',         lat: 47.6,  lng: 14.1,  price: 4500, year: 2024 },
  { name: 'Suiza',           lat: 46.8,  lng: 8.2,   price: 7800, year: 2024 },
  { name: 'Luxemburgo',      lat: 49.8,  lng: 6.1,   price: 8500, year: 2024 },
  { name: 'Polonia',         lat: 52.0,  lng: 19.4,  price: 2100, year: 2024 },
  { name: 'Suecia',          lat: 60.1,  lng: 15.6,  price: 3600, year: 2024 },
  { name: 'Dinamarca',       lat: 56.0,  lng: 10.0,  price: 3400, year: 2024 },
  { name: 'Noruega',         lat: 61.0,  lng: 8.5,   price: 4600, year: 2024 },
  { name: 'Grecia',          lat: 39.0,  lng: 22.0,  price: 1600, year: 2024 },
  { name: 'Estados Unidos',  lat: 39.5,  lng: -98.0, price: 3000, year: 2024 },
];

// ── Ciudades del mundo · €/m² centro (aprox. 2024, ref. coste de vida) ──
// No existe API gratuita oficial de €/m² por ciudad a nivel global; esta es
// una instantánea curada y orientativa de grandes ciudades por país.
const WORLD_CITIES: Array<Omit<PriceRow, 'scope' | 'source' | 'yoy' | 'ccaa'>> = [
  // Europa
  { name: 'Lisboa', lat: 38.72, lng: -9.14, price: 4500, year: 2024 }, { name: 'Porto', lat: 41.15, lng: -8.61, price: 3200, year: 2024 },
  { name: 'París', lat: 48.86, lng: 2.35, price: 11500, year: 2024 }, { name: 'Lyon', lat: 45.76, lng: 4.84, price: 4800, year: 2024 }, { name: 'Marsella', lat: 43.30, lng: 5.37, price: 3500, year: 2024 }, { name: 'Niza', lat: 43.70, lng: 7.27, price: 5500, year: 2024 },
  { name: 'Berlín', lat: 52.52, lng: 13.40, price: 6500, year: 2024 }, { name: 'Múnich', lat: 48.14, lng: 11.58, price: 9800, year: 2024 }, { name: 'Fráncfort', lat: 50.11, lng: 8.68, price: 7000, year: 2024 }, { name: 'Hamburgo', lat: 53.55, lng: 10.00, price: 6500, year: 2024 }, { name: 'Colonia', lat: 50.94, lng: 6.96, price: 5500, year: 2024 },
  { name: 'Roma', lat: 41.90, lng: 12.50, price: 6500, year: 2024 }, { name: 'Milán', lat: 45.46, lng: 9.19, price: 9500, year: 2024 }, { name: 'Nápoles', lat: 40.85, lng: 14.27, price: 3000, year: 2024 }, { name: 'Florencia', lat: 43.77, lng: 11.26, price: 4500, year: 2024 }, { name: 'Turín', lat: 45.07, lng: 7.69, price: 2400, year: 2024 },
  { name: 'Ámsterdam', lat: 52.37, lng: 4.90, price: 8000, year: 2024 }, { name: 'Róterdam', lat: 51.92, lng: 4.48, price: 5200, year: 2024 },
  { name: 'Londres', lat: 51.51, lng: -0.13, price: 13000, year: 2024 }, { name: 'Mánchester', lat: 53.48, lng: -2.24, price: 4200, year: 2024 }, { name: 'Edimburgo', lat: 55.95, lng: -3.19, price: 5000, year: 2024 }, { name: 'Birmingham', lat: 52.49, lng: -1.89, price: 3500, year: 2024 },
  { name: 'Dublín', lat: 53.35, lng: -6.26, price: 6500, year: 2024 },
  { name: 'Bruselas', lat: 50.85, lng: 4.35, price: 4200, year: 2024 }, { name: 'Amberes', lat: 51.22, lng: 4.40, price: 3600, year: 2024 },
  { name: 'Viena', lat: 48.21, lng: 16.37, price: 7200, year: 2024 },
  { name: 'Zúrich', lat: 47.38, lng: 8.54, price: 16000, year: 2024 }, { name: 'Ginebra', lat: 46.20, lng: 6.14, price: 14500, year: 2024 },
  { name: 'Luxemburgo', lat: 49.61, lng: 6.13, price: 11000, year: 2024 },
  { name: 'Varsovia', lat: 52.23, lng: 21.01, price: 4200, year: 2024 }, { name: 'Cracovia', lat: 50.06, lng: 19.94, price: 3500, year: 2024 },
  { name: 'Estocolmo', lat: 59.33, lng: 18.07, price: 8000, year: 2024 }, { name: 'Gotemburgo', lat: 57.71, lng: 11.97, price: 5000, year: 2024 },
  { name: 'Copenhague', lat: 55.68, lng: 12.57, price: 6800, year: 2024 }, { name: 'Oslo', lat: 59.91, lng: 10.75, price: 7800, year: 2024 }, { name: 'Helsinki', lat: 60.17, lng: 24.94, price: 6000, year: 2024 },
  { name: 'Atenas', lat: 37.98, lng: 23.73, price: 2600, year: 2024 },
  { name: 'Praga', lat: 50.08, lng: 14.44, price: 5500, year: 2024 }, { name: 'Budapest', lat: 47.50, lng: 19.04, price: 3500, year: 2024 }, { name: 'Bucarest', lat: 44.43, lng: 26.10, price: 2200, year: 2024 }, { name: 'Sofía', lat: 42.70, lng: 23.32, price: 1900, year: 2024 }, { name: 'Zagreb', lat: 45.81, lng: 15.98, price: 3000, year: 2024 }, { name: 'Belgrado', lat: 44.79, lng: 20.45, price: 2800, year: 2024 },
  { name: 'Tallin', lat: 59.44, lng: 24.75, price: 3500, year: 2024 }, { name: 'Riga', lat: 56.95, lng: 24.11, price: 2400, year: 2024 }, { name: 'Vilna', lat: 54.69, lng: 25.28, price: 2600, year: 2024 },
  { name: 'Reikiavik', lat: 64.15, lng: -21.94, price: 6200, year: 2024 },
  { name: 'Moscú', lat: 55.76, lng: 37.62, price: 4500, year: 2024 }, { name: 'San Petersburgo', lat: 59.94, lng: 30.31, price: 3400, year: 2024 }, { name: 'Kiev', lat: 50.45, lng: 30.52, price: 1800, year: 2024 },
  { name: 'Estambul', lat: 41.01, lng: 28.98, price: 2500, year: 2024 }, { name: 'Ankara', lat: 39.93, lng: 32.86, price: 1500, year: 2024 },
  // Américas
  { name: 'Nueva York', lat: 40.71, lng: -74.01, price: 16000, year: 2024 }, { name: 'San Francisco', lat: 37.77, lng: -122.42, price: 13000, year: 2024 }, { name: 'Los Ángeles', lat: 34.05, lng: -118.24, price: 9000, year: 2024 }, { name: 'Boston', lat: 42.36, lng: -71.06, price: 9500, year: 2024 }, { name: 'Washington D.C.', lat: 38.90, lng: -77.04, price: 7500, year: 2024 }, { name: 'Seattle', lat: 47.61, lng: -122.33, price: 8500, year: 2024 }, { name: 'Miami', lat: 25.76, lng: -80.19, price: 7000, year: 2024 }, { name: 'Chicago', lat: 41.88, lng: -87.63, price: 5000, year: 2024 }, { name: 'Austin', lat: 30.27, lng: -97.74, price: 4500, year: 2024 },
  { name: 'Toronto', lat: 43.65, lng: -79.38, price: 9000, year: 2024 }, { name: 'Vancouver', lat: 49.28, lng: -123.12, price: 11000, year: 2024 }, { name: 'Montreal', lat: 45.50, lng: -73.57, price: 5000, year: 2024 },
  { name: 'Ciudad de México', lat: 19.43, lng: -99.13, price: 3000, year: 2024 }, { name: 'Monterrey', lat: 25.69, lng: -100.32, price: 2200, year: 2024 }, { name: 'Cancún', lat: 21.16, lng: -86.85, price: 2500, year: 2024 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, price: 2800, year: 2024 }, { name: 'Río de Janeiro', lat: -22.91, lng: -43.17, price: 3200, year: 2024 },
  { name: 'Buenos Aires', lat: -34.60, lng: -58.38, price: 2500, year: 2024 }, { name: 'Santiago de Chile', lat: -33.45, lng: -70.67, price: 2800, year: 2024 }, { name: 'Bogotá', lat: 4.71, lng: -74.07, price: 1800, year: 2024 }, { name: 'Medellín', lat: 6.24, lng: -75.57, price: 1700, year: 2024 }, { name: 'Lima', lat: -12.05, lng: -77.04, price: 1700, year: 2024 }, { name: 'Montevideo', lat: -34.90, lng: -56.16, price: 2800, year: 2024 }, { name: 'Ciudad de Panamá', lat: 8.98, lng: -79.52, price: 2200, year: 2024 },
  // Asia
  { name: 'Tokio', lat: 35.68, lng: 139.69, price: 11000, year: 2024 }, { name: 'Osaka', lat: 34.69, lng: 135.50, price: 6000, year: 2024 },
  { name: 'Hong Kong', lat: 22.32, lng: 114.17, price: 20000, year: 2024 }, { name: 'Singapur', lat: 1.35, lng: 103.82, price: 17000, year: 2024 }, { name: 'Seúl', lat: 37.57, lng: 126.98, price: 12000, year: 2024 }, { name: 'Taipéi', lat: 25.03, lng: 121.57, price: 9000, year: 2024 },
  { name: 'Pekín', lat: 39.90, lng: 116.40, price: 13000, year: 2024 }, { name: 'Shanghái', lat: 31.23, lng: 121.47, price: 14000, year: 2024 }, { name: 'Shenzhen', lat: 22.54, lng: 114.06, price: 12000, year: 2024 }, { name: 'Cantón', lat: 23.13, lng: 113.26, price: 8000, year: 2024 },
  { name: 'Bombay', lat: 19.08, lng: 72.88, price: 6000, year: 2024 }, { name: 'Nueva Delhi', lat: 28.61, lng: 77.21, price: 3500, year: 2024 }, { name: 'Bangalore', lat: 12.97, lng: 77.59, price: 3000, year: 2024 },
  { name: 'Bangkok', lat: 13.76, lng: 100.50, price: 4500, year: 2024 }, { name: 'Yakarta', lat: -6.21, lng: 106.85, price: 2800, year: 2024 }, { name: 'Kuala Lumpur', lat: 3.14, lng: 101.69, price: 3000, year: 2024 }, { name: 'Manila', lat: 14.60, lng: 120.98, price: 3500, year: 2024 }, { name: 'Ho Chi Minh', lat: 10.82, lng: 106.63, price: 4000, year: 2024 }, { name: 'Hanói', lat: 21.03, lng: 105.85, price: 3000, year: 2024 },
  { name: 'Dubái', lat: 25.20, lng: 55.27, price: 5500, year: 2024 }, { name: 'Abu Dabi', lat: 24.45, lng: 54.38, price: 4000, year: 2024 }, { name: 'Doha', lat: 25.29, lng: 51.53, price: 4000, year: 2024 }, { name: 'Riad', lat: 24.71, lng: 46.68, price: 2000, year: 2024 }, { name: 'Tel Aviv', lat: 32.08, lng: 34.78, price: 12000, year: 2024 }, { name: 'Jerusalén', lat: 31.77, lng: 35.21, price: 8000, year: 2024 },
  { name: 'Almaty', lat: 43.24, lng: 76.91, price: 1500, year: 2024 }, { name: 'Karachi', lat: 24.86, lng: 67.01, price: 1200, year: 2024 },
  // Oceanía
  { name: 'Sídney', lat: -33.87, lng: 151.21, price: 11000, year: 2024 }, { name: 'Melbourne', lat: -37.81, lng: 144.96, price: 8000, year: 2024 }, { name: 'Brisbane', lat: -27.47, lng: 153.03, price: 6000, year: 2024 }, { name: 'Perth', lat: -31.95, lng: 115.86, price: 5000, year: 2024 }, { name: 'Auckland', lat: -36.85, lng: 174.76, price: 7000, year: 2024 }, { name: 'Wellington', lat: -41.29, lng: 174.78, price: 6000, year: 2024 },
  // África
  { name: 'El Cairo', lat: 30.04, lng: 31.24, price: 1200, year: 2024 }, { name: 'Lagos', lat: 6.52, lng: 3.38, price: 2000, year: 2024 }, { name: 'Johannesburgo', lat: -26.20, lng: 28.05, price: 1200, year: 2024 }, { name: 'Ciudad del Cabo', lat: -33.92, lng: 18.42, price: 2600, year: 2024 }, { name: 'Nairobi', lat: -1.29, lng: 36.82, price: 1800, year: 2024 }, { name: 'Casablanca', lat: 33.57, lng: -7.59, price: 1800, year: 2024 }, { name: 'Rabat', lat: 34.02, lng: -6.83, price: 1600, year: 2024 }, { name: 'Túnez', lat: 36.81, lng: 10.18, price: 1200, year: 2024 }, { name: 'Argel', lat: 36.75, lng: 3.06, price: 1500, year: 2024 }, { name: 'Accra', lat: 5.60, lng: -0.19, price: 1800, year: 2024 }, { name: 'Addis Abeba', lat: 9.03, lng: 38.74, price: 1500, year: 2024 },
];

export function priceColor(eur: number): string {
  if (eur < 1500) return '#2E7D32';     // muy asequible
  if (eur < 2500) return '#9CCC65';
  if (eur < 4000) return '#FFEE58';
  if (eur < 6000) return '#FFA726';
  if (eur < 9000) return '#FB8C00';
  if (eur < 13000) return '#F4511E';
  return '#B71C1C';                       // carísimo (>13.000)
}

/** Variación interanual del IPV nacional (INE, tabla 79540) en vivo. */
async function fetchIneYoY(): Promise<{ national: number | null; byCcaa: Record<string, number> }> {
  const out = { national: null as number | null, byCcaa: {} as Record<string, number> };
  try {
    const res = await fetch('https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/79540?nult=1', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return out;
    const series = await res.json();
    if (!Array.isArray(series)) return out;
    for (const s of series) {
      const nombre: string = s?.Nombre ?? '';
      // Solo variaciones anuales del índice GENERAL (no nueva/segunda mano)
      if (!/Variación anual/i.test(nombre) || !/General/i.test(nombre)) continue;
      const data = s?.Data;
      const val = Array.isArray(data) && data.length ? data[data.length - 1]?.Valor : null;
      if (typeof val !== 'number') continue;
      if (/Nacional/i.test(nombre)) out.national = val;
      else {
        const ccaa = nombre.split('.')[0].trim();
        if (ccaa) out.byCcaa[ccaa] = val;
      }
    }
  } catch {
    /* INE no disponible: se devuelve el €/m² curado sin la variación live */
  }
  return out;
}

// Normaliza nombres de CCAA del INE a los de nuestra tabla (acentos/variantes).
function matchCcaaYoY(name: string, byCcaa: Record<string, number>): number | undefined {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const target = norm(name);
  for (const [k, v] of Object.entries(byCcaa)) {
    const kk = norm(k);
    if (kk === target || kk.includes(target.split(' ')[0]) || target.includes(kk.split(' ')[0])) return v;
  }
  return undefined;
}

export async function GET() {
  const ine = await fetchIneYoY();

  const rows: PriceRow[] = [
    // España · municipios (capitales + grandes ciudades) con variación INE live
    ...SPAIN_MUNI.map((r) => ({
      ...r, scope: 'city' as const,
      source: '€/m² vivienda libre (MITMA/INE) · aprox.',
      yoy: matchCcaaYoY(r.ccaa ?? '', ine.byCcaa) ?? ine.national ?? undefined,
    })),
    // Resto del mundo · grandes ciudades (€/m² centro, aprox.)
    ...WORLD_CITIES.map((r) => ({
      ...r, scope: 'city' as const,
      source: '€/m² centro ciudad · aprox.',
    })),
    // Medias nacionales (vista de bajo zoom)
    ...COUNTRIES.map((r) => ({
      ...r, scope: 'country' as const,
      source: 'Media nacional aprox.',
    })),
  ];

  return NextResponse.json(
    {
      rows,
      spain_yoy: ine.national,             // variación IPV nacional INE (live)
      total: rows.length,
      note: '€/m² oficial orientativo (último disponible). Variación interanual = INE IPV en vivo.',
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
