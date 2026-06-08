import { NextResponse } from 'next/server';

// Datos curados de infraestructura de España (coordenadas precisas) para el mapa
// dedicado de España. Estático; el clima por ciudad (calidad del aire /
// temperatura) se sirve dinámico en /api/espana/clima (Open-Meteo, sin clave).
export const dynamic = 'force-static';

export const CIUDADES = [
  { n: 'Madrid', lat: 40.4168, lng: -3.7038, pob: 3280000 },
  { n: 'Barcelona', lat: 41.3874, lng: 2.1686, pob: 1620000 },
  { n: 'Valencia', lat: 39.4699, lng: -0.3763, pob: 800000 },
  { n: 'Sevilla', lat: 37.3891, lng: -5.9845, pob: 681000 },
  { n: 'Zaragoza', lat: 41.6488, lng: -0.8891, pob: 681000 },
  { n: 'Málaga', lat: 36.7213, lng: -4.4214, pob: 579000 },
  { n: 'Murcia', lat: 37.9922, lng: -1.1307, pob: 460000 },
  { n: 'Palma', lat: 39.5696, lng: 2.6502, pob: 419000 },
  { n: 'Las Palmas', lat: 28.1235, lng: -15.4363, pob: 379000 },
  { n: 'Bilbao', lat: 43.263, lng: -2.935, pob: 346000 },
  { n: 'Alicante', lat: 38.3452, lng: -0.481, pob: 338000 },
  { n: 'Córdoba', lat: 37.8882, lng: -4.7794, pob: 322000 },
  { n: 'Valladolid', lat: 41.6523, lng: -4.7245, pob: 298000 },
  { n: 'Vigo', lat: 42.2406, lng: -8.7207, pob: 295000 },
  { n: 'Gijón', lat: 43.5453, lng: -5.6619, pob: 271000 },
  { n: 'A Coruña', lat: 43.3623, lng: -8.4115, pob: 245000 },
  { n: 'Granada', lat: 37.1773, lng: -3.5986, pob: 232000 },
  { n: 'Vitoria-Gasteiz', lat: 42.8467, lng: -2.6716, pob: 253000 },
  { n: 'Santander', lat: 43.4623, lng: -3.8099, pob: 172000 },
  { n: 'Pamplona', lat: 42.8125, lng: -1.6458, pob: 203000 },
  { n: 'San Sebastián', lat: 43.3183, lng: -1.9812, pob: 188000 },
  { n: 'Tenerife (S/C)', lat: 28.4636, lng: -16.2518, pob: 209000 },
  { n: 'Toledo', lat: 39.8628, lng: -4.0273, pob: 85000 },
];

const NUCLEARES = [
  { n: 'C.N. Almaraz', lat: 39.8067, lng: -5.6975, mw: 2017 },
  { n: 'C.N. Ascó', lat: 41.2003, lng: 0.5694, mw: 2027 },
  { n: 'C.N. Cofrentes', lat: 39.2156, lng: -1.0497, mw: 1092 },
  { n: 'C.N. Trillo', lat: 40.7008, lng: -2.6219, mw: 1066 },
  { n: 'C.N. Vandellós II', lat: 40.9519, lng: 0.8678, mw: 1087 },
];

const REFINERIAS = [
  { n: 'Repsol Cartagena', lat: 37.5836, lng: -0.9856 },
  { n: 'Repsol A Coruña', lat: 43.3236, lng: -8.3744 },
  { n: 'Petronor (Muskiz)', lat: 43.3372, lng: -3.0894 },
  { n: 'Repsol Puertollano', lat: 38.6886, lng: -4.0964 },
  { n: 'Repsol Tarragona', lat: 41.0997, lng: 1.1872 },
  { n: 'Cepsa La Rábida (Huelva)', lat: 37.1869, lng: -6.9389 },
  { n: 'Cepsa Gibraltar-San Roque', lat: 36.2206, lng: -5.3878 },
  { n: 'BP Castellón', lat: 39.9789, lng: -0.0153 },
  { n: 'Cepsa Tenerife', lat: 28.4525, lng: -16.2483 },
];

const GNL = [
  { n: 'Enagás Barcelona', lat: 41.3331, lng: 2.1503 },
  { n: 'Enagás Cartagena', lat: 37.5667, lng: -0.9836 },
  { n: 'Enagás Huelva', lat: 37.1592, lng: -6.9183 },
  { n: 'Saggas Sagunto', lat: 39.6306, lng: -0.2089 },
  { n: 'Bahía de Bizkaia (Bilbao)', lat: 43.3528, lng: -3.0539 },
  { n: 'Reganosa Mugardos', lat: 43.4669, lng: -8.2603 },
  { n: 'El Musel (Gijón)', lat: 43.5631, lng: -5.6953 },
];

const PRESAS = [
  { n: 'Alcántara II (J.M. de Oriol)', lat: 39.7197, lng: -6.8917, mw: 957 },
  { n: 'La Serena', lat: 38.8472, lng: -5.0978 },
  { n: 'Almendra', lat: 41.2575, lng: -6.2278, mw: 810 },
  { n: 'Aldeadávila', lat: 41.2086, lng: -6.6175, mw: 1243 },
  { n: 'Mequinenza', lat: 41.3711, lng: 0.3119, mw: 324 },
  { n: 'Buendía', lat: 40.3678, lng: -2.7589 },
  { n: 'Ricobayo', lat: 41.5483, lng: -5.9447, mw: 135 },
  { n: 'Cíjara', lat: 39.3897, lng: -4.93 },
  { n: 'Iznájar', lat: 37.2575, lng: -4.3092 },
];

const AEROPUERTOS = [
  { n: 'Madrid-Barajas', iata: 'MAD', lat: 40.4719, lng: -3.5626, pax: 60200000 },
  { n: 'Barcelona-El Prat', iata: 'BCN', lat: 41.2974, lng: 2.0833, pax: 55000000 },
  { n: 'Palma de Mallorca', iata: 'PMI', lat: 39.5517, lng: 2.7388, pax: 31000000 },
  { n: 'Málaga-Costa del Sol', iata: 'AGP', lat: 36.6749, lng: -4.4991, pax: 22000000 },
  { n: 'Alicante-Elche', iata: 'ALC', lat: 38.2822, lng: -0.5582, pax: 15000000 },
  { n: 'Gran Canaria', iata: 'LPA', lat: 27.9319, lng: -15.3866, pax: 13500000 },
  { n: 'Tenerife Sur', iata: 'TFS', lat: 28.0445, lng: -16.5725, pax: 11500000 },
  { n: 'Valencia', iata: 'VLC', lat: 39.4893, lng: -0.4816, pax: 10000000 },
  { n: 'Sevilla', iata: 'SVQ', lat: 37.418, lng: -5.8931, pax: 8000000 },
  { n: 'Bilbao', iata: 'BIO', lat: 43.3011, lng: -2.9106, pax: 6000000 },
  { n: 'Ibiza', iata: 'IBZ', lat: 38.8729, lng: 1.3731, pax: 8500000 },
  { n: 'Lanzarote', iata: 'ACE', lat: 28.9455, lng: -13.6052, pax: 7500000 },
];

const PUERTOS = [
  { n: 'Algeciras', lat: 36.1408, lng: -5.4356, teu: 4800000 },
  { n: 'Valencia', lat: 39.4422, lng: -0.3158, teu: 5000000 },
  { n: 'Barcelona', lat: 41.3433, lng: 2.1597, teu: 3500000 },
  { n: 'Bilbao', lat: 43.3514, lng: -3.05 },
  { n: 'Las Palmas', lat: 28.1419, lng: -15.4128 },
  { n: 'Cartagena', lat: 37.5836, lng: -0.9869 },
  { n: 'Huelva', lat: 37.21, lng: -6.95 },
  { n: 'Tarragona', lat: 41.0972, lng: 1.21 },
];

export async function GET() {
  return NextResponse.json({
    ciudades: CIUDADES,
    nucleares: NUCLEARES,
    refinerias: REFINERIAS,
    gnl: GNL,
    presas: PRESAS,
    aeropuertos: AEROPUERTOS,
    puertos: PUERTOS,
  });
}
