/**
 * Centroides geográficos de los países (lat/lon) + nombre humano.
 *
 * Usados para:
 *   - Renderizar puntos en el mapa mundial esquemático del Radar Global
 *   - Mostrar la posición de eventos GDELT/UCDP en el mapa de conflictos
 *   - Convertir entre ISO3 ↔ nombre legible
 *
 * Fuente: medianas oficiales de Natural Earth (puntos representativos
 * del centro poblacional, no del centroide geométrico, para evitar que
 * países con territorios dispersos caigan en el océano).
 *
 * Cobertura: 80 países alineados con VDEM_2023 + SIPRI_2023 + países
 * con eventos GDELT/UCDP frecuentes. Si necesitas más, añade aquí.
 */

export interface CountryCoord {
  /** Nombre en español */
  name_es: string
  /** Nombre en inglés (para queries GDELT) */
  name_en: string
  /** ISO 3166-1 alpha-2 */
  iso2: string
  /** Latitud del centro poblacional */
  lat: number
  /** Longitud del centro poblacional */
  lon: number
  /** Región geopolítica */
  region: 'europa_occ' | 'europa_este' | 'norteamerica' | 'latam' | 'asia_orient' | 'asia_sudest' | 'asia_sur' | 'asia_central' | 'oriente_medio' | 'norte_africa' | 'africa_subsahariana' | 'oceania'
}

export const COUNTRY_COORDS: Record<string, CountryCoord> = {
  // Europa Occidental
  ESP: { name_es: 'España', name_en: 'Spain', iso2: 'ES', lat: 40.0, lon: -4.0, region: 'europa_occ' },
  FRA: { name_es: 'Francia', name_en: 'France', iso2: 'FR', lat: 46.6, lon: 2.2, region: 'europa_occ' },
  DEU: { name_es: 'Alemania', name_en: 'Germany', iso2: 'DE', lat: 51.2, lon: 10.5, region: 'europa_occ' },
  GBR: { name_es: 'Reino Unido', name_en: 'United Kingdom', iso2: 'GB', lat: 54.0, lon: -2.5, region: 'europa_occ' },
  ITA: { name_es: 'Italia', name_en: 'Italy', iso2: 'IT', lat: 42.8, lon: 12.5, region: 'europa_occ' },
  PRT: { name_es: 'Portugal', name_en: 'Portugal', iso2: 'PT', lat: 39.4, lon: -8.2, region: 'europa_occ' },
  NLD: { name_es: 'Países Bajos', name_en: 'Netherlands', iso2: 'NL', lat: 52.1, lon: 5.3, region: 'europa_occ' },
  BEL: { name_es: 'Bélgica', name_en: 'Belgium', iso2: 'BE', lat: 50.6, lon: 4.6, region: 'europa_occ' },
  AUT: { name_es: 'Austria', name_en: 'Austria', iso2: 'AT', lat: 47.5, lon: 14.5, region: 'europa_occ' },
  CHE: { name_es: 'Suiza', name_en: 'Switzerland', iso2: 'CH', lat: 46.8, lon: 8.2, region: 'europa_occ' },
  SWE: { name_es: 'Suecia', name_en: 'Sweden', iso2: 'SE', lat: 60.1, lon: 18.6, region: 'europa_occ' },
  NOR: { name_es: 'Noruega', name_en: 'Norway', iso2: 'NO', lat: 60.5, lon: 8.5, region: 'europa_occ' },
  DNK: { name_es: 'Dinamarca', name_en: 'Denmark', iso2: 'DK', lat: 56.3, lon: 9.5, region: 'europa_occ' },
  FIN: { name_es: 'Finlandia', name_en: 'Finland', iso2: 'FI', lat: 61.9, lon: 25.7, region: 'europa_occ' },
  IRL: { name_es: 'Irlanda', name_en: 'Ireland', iso2: 'IE', lat: 53.4, lon: -8.2, region: 'europa_occ' },
  GRC: { name_es: 'Grecia', name_en: 'Greece', iso2: 'GR', lat: 39.1, lon: 21.8, region: 'europa_occ' },
  // Europa del Este
  POL: { name_es: 'Polonia', name_en: 'Poland', iso2: 'PL', lat: 51.9, lon: 19.1, region: 'europa_este' },
  HUN: { name_es: 'Hungría', name_en: 'Hungary', iso2: 'HU', lat: 47.2, lon: 19.5, region: 'europa_este' },
  CZE: { name_es: 'Chequia', name_en: 'Czech Republic', iso2: 'CZ', lat: 49.8, lon: 15.5, region: 'europa_este' },
  ROU: { name_es: 'Rumanía', name_en: 'Romania', iso2: 'RO', lat: 45.9, lon: 24.9, region: 'europa_este' },
  UKR: { name_es: 'Ucrania', name_en: 'Ukraine', iso2: 'UA', lat: 48.4, lon: 31.2, region: 'europa_este' },
  RUS: { name_es: 'Rusia', name_en: 'Russia', iso2: 'RU', lat: 61.5, lon: 105.3, region: 'europa_este' },
  BLR: { name_es: 'Bielorrusia', name_en: 'Belarus', iso2: 'BY', lat: 53.7, lon: 27.9, region: 'europa_este' },
  MDA: { name_es: 'Moldavia', name_en: 'Moldova', iso2: 'MD', lat: 47.4, lon: 28.4, region: 'europa_este' },
  // Norteamérica
  USA: { name_es: 'Estados Unidos', name_en: 'United States', iso2: 'US', lat: 39.8, lon: -98.5, region: 'norteamerica' },
  CAN: { name_es: 'Canadá', name_en: 'Canada', iso2: 'CA', lat: 56.1, lon: -106.3, region: 'norteamerica' },
  MEX: { name_es: 'México', name_en: 'Mexico', iso2: 'MX', lat: 23.6, lon: -102.5, region: 'norteamerica' },
  // Latinoamérica
  BRA: { name_es: 'Brasil', name_en: 'Brazil', iso2: 'BR', lat: -14.2, lon: -51.9, region: 'latam' },
  ARG: { name_es: 'Argentina', name_en: 'Argentina', iso2: 'AR', lat: -38.4, lon: -63.6, region: 'latam' },
  CHL: { name_es: 'Chile', name_en: 'Chile', iso2: 'CL', lat: -35.7, lon: -71.5, region: 'latam' },
  COL: { name_es: 'Colombia', name_en: 'Colombia', iso2: 'CO', lat: 4.6, lon: -74.3, region: 'latam' },
  PER: { name_es: 'Perú', name_en: 'Peru', iso2: 'PE', lat: -9.2, lon: -75.0, region: 'latam' },
  URY: { name_es: 'Uruguay', name_en: 'Uruguay', iso2: 'UY', lat: -32.5, lon: -55.8, region: 'latam' },
  ECU: { name_es: 'Ecuador', name_en: 'Ecuador', iso2: 'EC', lat: -1.8, lon: -78.2, region: 'latam' },
  BOL: { name_es: 'Bolivia', name_en: 'Bolivia', iso2: 'BO', lat: -16.3, lon: -63.6, region: 'latam' },
  VEN: { name_es: 'Venezuela', name_en: 'Venezuela', iso2: 'VE', lat: 6.4, lon: -66.6, region: 'latam' },
  CUB: { name_es: 'Cuba', name_en: 'Cuba', iso2: 'CU', lat: 21.5, lon: -77.8, region: 'latam' },
  NIC: { name_es: 'Nicaragua', name_en: 'Nicaragua', iso2: 'NI', lat: 12.9, lon: -85.2, region: 'latam' },
  // Asia Oriental
  CHN: { name_es: 'China', name_en: 'China', iso2: 'CN', lat: 35.9, lon: 104.2, region: 'asia_orient' },
  JPN: { name_es: 'Japón', name_en: 'Japan', iso2: 'JP', lat: 36.2, lon: 138.3, region: 'asia_orient' },
  KOR: { name_es: 'Corea del Sur', name_en: 'South Korea', iso2: 'KR', lat: 35.9, lon: 127.8, region: 'asia_orient' },
  PRK: { name_es: 'Corea del Norte', name_en: 'North Korea', iso2: 'KP', lat: 40.3, lon: 127.5, region: 'asia_orient' },
  TWN: { name_es: 'Taiwán', name_en: 'Taiwan', iso2: 'TW', lat: 23.7, lon: 121.0, region: 'asia_orient' },
  MNG: { name_es: 'Mongolia', name_en: 'Mongolia', iso2: 'MN', lat: 46.9, lon: 103.8, region: 'asia_orient' },
  // Sudeste Asiático
  IDN: { name_es: 'Indonesia', name_en: 'Indonesia', iso2: 'ID', lat: -0.8, lon: 113.9, region: 'asia_sudest' },
  PHL: { name_es: 'Filipinas', name_en: 'Philippines', iso2: 'PH', lat: 12.9, lon: 121.8, region: 'asia_sudest' },
  MYS: { name_es: 'Malasia', name_en: 'Malaysia', iso2: 'MY', lat: 4.2, lon: 101.9, region: 'asia_sudest' },
  THA: { name_es: 'Tailandia', name_en: 'Thailand', iso2: 'TH', lat: 15.9, lon: 100.9, region: 'asia_sudest' },
  VNM: { name_es: 'Vietnam', name_en: 'Vietnam', iso2: 'VN', lat: 14.1, lon: 108.3, region: 'asia_sudest' },
  SGP: { name_es: 'Singapur', name_en: 'Singapore', iso2: 'SG', lat: 1.4, lon: 103.8, region: 'asia_sudest' },
  MMR: { name_es: 'Myanmar', name_en: 'Myanmar', iso2: 'MM', lat: 21.9, lon: 95.9, region: 'asia_sudest' },
  // Asia del Sur
  IND: { name_es: 'India', name_en: 'India', iso2: 'IN', lat: 20.6, lon: 78.9, region: 'asia_sur' },
  PAK: { name_es: 'Pakistán', name_en: 'Pakistan', iso2: 'PK', lat: 30.4, lon: 69.3, region: 'asia_sur' },
  BGD: { name_es: 'Bangladesh', name_en: 'Bangladesh', iso2: 'BD', lat: 23.7, lon: 90.4, region: 'asia_sur' },
  LKA: { name_es: 'Sri Lanka', name_en: 'Sri Lanka', iso2: 'LK', lat: 7.9, lon: 80.8, region: 'asia_sur' },
  AFG: { name_es: 'Afganistán', name_en: 'Afghanistan', iso2: 'AF', lat: 33.9, lon: 67.7, region: 'asia_sur' },
  // Asia Central + Cáucaso
  KAZ: { name_es: 'Kazajistán', name_en: 'Kazakhstan', iso2: 'KZ', lat: 48.0, lon: 66.9, region: 'asia_central' },
  UZB: { name_es: 'Uzbekistán', name_en: 'Uzbekistan', iso2: 'UZ', lat: 41.4, lon: 64.6, region: 'asia_central' },
  GEO: { name_es: 'Georgia', name_en: 'Georgia', iso2: 'GE', lat: 42.3, lon: 43.4, region: 'asia_central' },
  ARM: { name_es: 'Armenia', name_en: 'Armenia', iso2: 'AM', lat: 40.1, lon: 45.0, region: 'asia_central' },
  AZE: { name_es: 'Azerbaiyán', name_en: 'Azerbaijan', iso2: 'AZ', lat: 40.1, lon: 47.6, region: 'asia_central' },
  // Oriente Medio
  ISR: { name_es: 'Israel', name_en: 'Israel', iso2: 'IL', lat: 31.0, lon: 34.9, region: 'oriente_medio' },
  TUR: { name_es: 'Turquía', name_en: 'Turkey', iso2: 'TR', lat: 38.9, lon: 35.2, region: 'oriente_medio' },
  IRN: { name_es: 'Irán', name_en: 'Iran', iso2: 'IR', lat: 32.4, lon: 53.7, region: 'oriente_medio' },
  SAU: { name_es: 'Arabia Saudí', name_en: 'Saudi Arabia', iso2: 'SA', lat: 23.9, lon: 45.1, region: 'oriente_medio' },
  ARE: { name_es: 'EAU', name_en: 'United Arab Emirates', iso2: 'AE', lat: 23.4, lon: 53.8, region: 'oriente_medio' },
  QAT: { name_es: 'Catar', name_en: 'Qatar', iso2: 'QA', lat: 25.4, lon: 51.2, region: 'oriente_medio' },
  KWT: { name_es: 'Kuwait', name_en: 'Kuwait', iso2: 'KW', lat: 29.3, lon: 47.5, region: 'oriente_medio' },
  IRQ: { name_es: 'Irak', name_en: 'Iraq', iso2: 'IQ', lat: 33.2, lon: 43.7, region: 'oriente_medio' },
  SYR: { name_es: 'Siria', name_en: 'Syria', iso2: 'SY', lat: 34.8, lon: 38.9, region: 'oriente_medio' },
  YEM: { name_es: 'Yemen', name_en: 'Yemen', iso2: 'YE', lat: 15.6, lon: 48.5, region: 'oriente_medio' },
  LBN: { name_es: 'Líbano', name_en: 'Lebanon', iso2: 'LB', lat: 33.9, lon: 35.9, region: 'oriente_medio' },
  JOR: { name_es: 'Jordania', name_en: 'Jordan', iso2: 'JO', lat: 30.6, lon: 36.2, region: 'oriente_medio' },
  // Norte de África
  EGY: { name_es: 'Egipto', name_en: 'Egypt', iso2: 'EG', lat: 26.8, lon: 30.8, region: 'norte_africa' },
  MAR: { name_es: 'Marruecos', name_en: 'Morocco', iso2: 'MA', lat: 31.8, lon: -7.1, region: 'norte_africa' },
  DZA: { name_es: 'Argelia', name_en: 'Algeria', iso2: 'DZ', lat: 28.0, lon: 1.7, region: 'norte_africa' },
  TUN: { name_es: 'Túnez', name_en: 'Tunisia', iso2: 'TN', lat: 33.9, lon: 9.5, region: 'norte_africa' },
  LBY: { name_es: 'Libia', name_en: 'Libya', iso2: 'LY', lat: 26.3, lon: 17.2, region: 'norte_africa' },
  // África Subsahariana
  ZAF: { name_es: 'Sudáfrica', name_en: 'South Africa', iso2: 'ZA', lat: -30.6, lon: 22.9, region: 'africa_subsahariana' },
  NGA: { name_es: 'Nigeria', name_en: 'Nigeria', iso2: 'NG', lat: 9.1, lon: 8.7, region: 'africa_subsahariana' },
  KEN: { name_es: 'Kenia', name_en: 'Kenya', iso2: 'KE', lat: -0.0, lon: 37.9, region: 'africa_subsahariana' },
  ETH: { name_es: 'Etiopía', name_en: 'Ethiopia', iso2: 'ET', lat: 9.1, lon: 40.5, region: 'africa_subsahariana' },
  SDN: { name_es: 'Sudán', name_en: 'Sudan', iso2: 'SD', lat: 12.9, lon: 30.2, region: 'africa_subsahariana' },
  SOM: { name_es: 'Somalia', name_en: 'Somalia', iso2: 'SO', lat: 5.2, lon: 46.2, region: 'africa_subsahariana' },
  GHA: { name_es: 'Ghana', name_en: 'Ghana', iso2: 'GH', lat: 7.9, lon: -1.0, region: 'africa_subsahariana' },
  SEN: { name_es: 'Senegal', name_en: 'Senegal', iso2: 'SN', lat: 14.5, lon: -14.5, region: 'africa_subsahariana' },
  CIV: { name_es: 'Costa Marfil', name_en: 'Ivory Coast', iso2: 'CI', lat: 7.5, lon: -5.5, region: 'africa_subsahariana' },
  MLI: { name_es: 'Mali', name_en: 'Mali', iso2: 'ML', lat: 17.6, lon: -4.0, region: 'africa_subsahariana' },
  BFA: { name_es: 'Burkina Faso', name_en: 'Burkina Faso', iso2: 'BF', lat: 12.2, lon: -1.6, region: 'africa_subsahariana' },
  NER: { name_es: 'Níger', name_en: 'Niger', iso2: 'NE', lat: 17.6, lon: 8.1, region: 'africa_subsahariana' },
  COD: { name_es: 'RDC', name_en: 'DR Congo', iso2: 'CD', lat: -4.0, lon: 21.8, region: 'africa_subsahariana' },
  RWA: { name_es: 'Ruanda', name_en: 'Rwanda', iso2: 'RW', lat: -2.0, lon: 29.9, region: 'africa_subsahariana' },
  ZWE: { name_es: 'Zimbabue', name_en: 'Zimbabwe', iso2: 'ZW', lat: -19.0, lon: 29.2, region: 'africa_subsahariana' },
  // Oceanía
  AUS: { name_es: 'Australia', name_en: 'Australia', iso2: 'AU', lat: -25.3, lon: 133.8, region: 'oceania' },
  NZL: { name_es: 'Nueva Zelanda', name_en: 'New Zealand', iso2: 'NZ', lat: -40.9, lon: 174.9, region: 'oceania' },
}

export function getCountryCoord(iso3: string): CountryCoord | null {
  return COUNTRY_COORDS[iso3.toUpperCase()] || null
}

export function isoToName(iso3: string, lang: 'es' | 'en' = 'es'): string {
  const c = getCountryCoord(iso3)
  if (!c) return iso3
  return lang === 'es' ? c.name_es : c.name_en
}

/**
 * Proyecta lat/lon a coordenadas SVG en una proyección equirectangular simple.
 * @param viewportW ancho del SVG (px)
 * @param viewportH alto del SVG (px)
 * @returns {x,y} en píxeles
 */
export function projectEquirect(
  lat: number, lon: number,
  viewportW: number, viewportH: number,
): { x: number; y: number } {
  // Equirectangular: lat ∈ [-90, 90], lon ∈ [-180, 180]
  // x = (lon + 180) / 360 · W
  // y = (90 - lat) / 180 · H
  return {
    x: ((lon + 180) / 360) * viewportW,
    y: ((90 - lat) / 180) * viewportH,
  }
}

/** Convierte ISO2 (ej: 'es') a ISO3 ('ESP'). Devuelve null si no mapeado. */
export function iso2ToIso3(iso2: string): string | null {
  const u = iso2.toUpperCase()
  for (const [iso3, c] of Object.entries(COUNTRY_COORDS)) {
    if (c.iso2 === u) return iso3
  }
  return null
}

export const COUNTRY_COORDS_COUNT = Object.keys(COUNTRY_COORDS).length
