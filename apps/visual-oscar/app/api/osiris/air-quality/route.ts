import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Calidad del aire (Open-Meteo Air Quality API, gratis, sin clave).
 * Índice US AQI + PM2.5 en ~90 grandes ciudades del mundo, en una sola llamada
 * (Open-Meteo acepta múltiples coordenadas separadas por comas).
 */
const CITIES: Array<[string, number, number]> = [
  ['Madrid',40.42,-3.70],['Barcelona',41.39,2.16],['Lisboa',38.72,-9.14],['París',48.85,2.35],
  ['Londres',51.51,-0.13],['Berlín',52.52,13.40],['Roma',41.90,12.50],['Ámsterdam',52.37,4.90],
  ['Bruselas',50.85,4.35],['Viena',48.21,16.37],['Varsovia',52.23,21.01],['Moscú',55.75,37.62],
  ['Estambul',41.01,28.98],['Atenas',37.98,23.73],['Kiev',50.45,30.52],['Estocolmo',59.33,18.07],
  ['El Cairo',30.04,31.24],['Lagos',6.52,3.38],['Nairobi',-1.29,36.82],['Johannesburgo',-26.20,28.05],
  ['Casablanca',33.57,-7.59],['Argel',36.75,3.06],['Addis Abeba',9.03,38.74],['Acra',5.60,-0.19],
  ['Nueva York',40.71,-74.01],['Los Ángeles',34.05,-118.24],['Chicago',41.88,-87.63],['Ciudad de México',19.43,-99.13],
  ['Toronto',43.65,-79.38],['São Paulo',-23.55,-46.63],['Buenos Aires',-34.60,-58.38],['Lima',-12.05,-77.04],
  ['Bogotá',4.71,-74.07],['Santiago',-33.45,-70.67],['Río de Janeiro',-22.91,-43.17],['Houston',29.76,-95.37],
  ['Pekín',39.90,116.41],['Shanghái',31.23,121.47],['Delhi',28.61,77.21],['Bombay',19.08,72.88],
  ['Tokio',35.68,139.69],['Seúl',37.57,126.98],['Yakarta',-6.21,106.85],['Bangkok',13.76,100.50],
  ['Manila',14.60,120.98],['Karachi',24.86,67.01],['Daca',23.81,90.41],['Hong Kong',22.32,114.17],
  ['Singapur',1.35,103.82],['Kuala Lumpur',3.14,101.69],['Teherán',35.69,51.39],['Bagdad',33.31,44.36],
  ['Riad',24.71,46.68],['Dubái',25.20,55.27],['Lahore',31.55,74.34],['Calcuta',22.57,88.36],
  ['Chennai',13.08,80.27],['Hanói',21.03,105.85],['Taipéi',25.03,121.57],['Sídney',-33.87,151.21],
  ['Melbourne',-37.81,144.96],['Auckland',-36.85,174.76],['Dublín',53.35,-6.26],['Oslo',59.91,10.75],
  ['Copenhague',55.68,12.57],['Helsinki',60.17,24.94],['Praga',50.08,14.44],['Budapest',47.50,19.04],
  ['Bucarest',44.43,26.10],['Belgrado',44.79,20.45],['Milán',45.46,9.19],['Múnich',48.14,11.58],
  ['Zúrich',47.37,8.54],['Sevilla',37.39,-5.99],['Valencia',39.47,-0.38],['Bilbao',43.26,-2.93],
  ['Nápoles',40.85,14.27],['Mánchester',53.48,-2.24],['Marsella',43.30,5.37],['Hamburgo',53.55,9.99],
  ['Fráncfort',50.11,8.68],['Cracovia',50.06,19.94],['Doha',25.29,51.53],['Tel Aviv',32.08,34.78],
];

function level(aqi: number): { es: string; color: string } {
  if (aqi <= 50) return { es: 'Buena', color: '#66BB6A' };
  if (aqi <= 100) return { es: 'Moderada', color: '#FFEE58' };
  if (aqi <= 150) return { es: 'Dañina (sensibles)', color: '#FFA726' };
  if (aqi <= 200) return { es: 'Dañina', color: '#EF5350' };
  if (aqi <= 300) return { es: 'Muy dañina', color: '#AB47BC' };
  return { es: 'Peligrosa', color: '#7B1F1F' };
}

export async function GET() {
  try {
    const lats = CITIES.map((c) => c[1]).join(',');
    const lngs = CITIES.map((c) => c[2]).join(',');
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lngs}&current=us_aqi,pm2_5`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ stations: [], total: 0 });
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    const stations = arr.map((d: any, i: number) => {
      const city = CITIES[i];
      const aqi = d?.current?.us_aqi;
      if (!city || typeof aqi !== 'number') return null;
      const lv = level(aqi);
      return { name: city[0], lat: city[1], lng: city[2], aqi: Math.round(aqi), pm25: d.current.pm2_5, level: lv.es, color: lv.color };
    }).filter(Boolean);
    return NextResponse.json({ stations, total: stations.length },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ stations: [], total: 0 });
  }
}
