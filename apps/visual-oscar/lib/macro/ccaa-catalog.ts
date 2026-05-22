/**
 * Catálogo de Comunidades Autónomas + Ciudades Autónomas de España.
 *
 * Códigos:
 *   - id: slug URL-friendly (lowercase, sin acentos)
 *   - ineCode: código INE (01-19)
 *   - nuts2: código Eurostat NUTS2 (ES11..ES70)
 *   - capital
 *   - población (último censo INE)
 *
 * Usado por:
 *   - /macro/{subtab}/region/[ccaa]/page.tsx
 *   - /api/macro/region/[ccaa]/overview
 *   - GroqRegional analysis context
 */

export interface CCAA {
  id: string;
  ineCode: string;
  nuts2: string;
  label: string;
  shortLabel: string;
  capital: string;
  population: number;
  gdpShare: number; // % PIB España
  notes?: string;
}

export const CCAA_CATALOG: CCAA[] = [
  { id: "andalucia", ineCode: "01", nuts2: "ES61", label: "Andalucía", shortLabel: "AND", capital: "Sevilla", population: 8584147, gdpShare: 13.5 },
  { id: "aragon", ineCode: "02", nuts2: "ES24", label: "Aragón", shortLabel: "ARA", capital: "Zaragoza", population: 1351647, gdpShare: 3.1 },
  { id: "asturias", ineCode: "03", nuts2: "ES12", label: "Asturias", shortLabel: "AST", capital: "Oviedo", population: 1011160, gdpShare: 1.9 },
  { id: "baleares", ineCode: "04", nuts2: "ES53", label: "Illes Balears", shortLabel: "BAL", capital: "Palma", population: 1209906, gdpShare: 2.7 },
  { id: "canarias", ineCode: "05", nuts2: "ES70", label: "Canarias", shortLabel: "CAN", capital: "Las Palmas / Santa Cruz", population: 2244423, gdpShare: 3.6 },
  { id: "cantabria", ineCode: "06", nuts2: "ES13", label: "Cantabria", shortLabel: "CTB", capital: "Santander", population: 588387, gdpShare: 1.1 },
  { id: "castilla-la-mancha", ineCode: "07", nuts2: "ES42", label: "Castilla-La Mancha", shortLabel: "CLM", capital: "Toledo", population: 2087739, gdpShare: 3.4 },
  { id: "castilla-leon", ineCode: "08", nuts2: "ES41", label: "Castilla y León", shortLabel: "CYL", capital: "Valladolid (sede Junta)", population: 2391718, gdpShare: 4.7 },
  { id: "cataluna", ineCode: "09", nuts2: "ES51", label: "Cataluña", shortLabel: "CAT", capital: "Barcelona", population: 7841977, gdpShare: 19.1 },
  { id: "valencia", ineCode: "10", nuts2: "ES52", label: "Comunitat Valenciana", shortLabel: "CVA", capital: "Valencia", population: 5117190, gdpShare: 9.4 },
  { id: "extremadura", ineCode: "11", nuts2: "ES43", label: "Extremadura", shortLabel: "EXT", capital: "Mérida", population: 1054681, gdpShare: 1.6 },
  { id: "galicia", ineCode: "12", nuts2: "ES11", label: "Galicia", shortLabel: "GAL", capital: "Santiago de Compostela", population: 2701743, gdpShare: 5.2 },
  { id: "madrid", ineCode: "13", nuts2: "ES30", label: "Comunidad de Madrid", shortLabel: "MAD", capital: "Madrid", population: 6871903, gdpShare: 19.3 },
  { id: "murcia", ineCode: "14", nuts2: "ES62", label: "Región de Murcia", shortLabel: "MUR", capital: "Murcia", population: 1531878, gdpShare: 2.6 },
  { id: "navarra", ineCode: "15", nuts2: "ES22", label: "Comunidad Foral de Navarra", shortLabel: "NAV", capital: "Pamplona", population: 666477, gdpShare: 1.7, notes: "Régimen foral · Convenio Económico" },
  { id: "pais-vasco", ineCode: "16", nuts2: "ES21", label: "País Vasco", shortLabel: "PV", capital: "Vitoria-Gasteiz", population: 2231050, gdpShare: 6.1, notes: "Régimen foral · Concierto Económico" },
  { id: "la-rioja", ineCode: "17", nuts2: "ES23", label: "La Rioja", shortLabel: "RIO", capital: "Logroño", population: 320601, gdpShare: 0.7 },
  { id: "ceuta", ineCode: "18", nuts2: "ES63", label: "Ceuta", shortLabel: "CEU", capital: "Ceuta", population: 84032, gdpShare: 0.1, notes: "Ciudad Autónoma" },
  { id: "melilla", ineCode: "19", nuts2: "ES64", label: "Melilla", shortLabel: "MEL", capital: "Melilla", population: 86487, gdpShare: 0.1, notes: "Ciudad Autónoma" },
];

export function getCCAA(id: string): CCAA | undefined {
  return CCAA_CATALOG.find((c) => c.id === id);
}

export function getCCAAByIneCode(code: string): CCAA | undefined {
  return CCAA_CATALOG.find((c) => c.ineCode === code);
}

export function getCCAAByNuts2(nuts2: string): CCAA | undefined {
  return CCAA_CATALOG.find((c) => c.nuts2 === nuts2);
}

export function listCCAA(): CCAA[] {
  return CCAA_CATALOG.slice().sort((a, b) => b.gdpShare - a.gdpShare);
}
