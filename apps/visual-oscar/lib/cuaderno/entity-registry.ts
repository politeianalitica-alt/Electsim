/**
 * Registry de entidades del dashboard accesibles desde Cuaderno.
 *
 * El Cuaderno es Obsidian-style: permite escribir [[Pedro Sánchez]] o
 * [[Banca]] y obtener un badge clickable que enlaza a /figuras/X o /sector-X.
 *
 * Sprint Cuaderno N1 · seed inicial con ~150 entidades + búsqueda fuzzy +
 * resolución por slug/nombre/alias. Las siguientes sprints añadirán fetch
 * live a /api/entities cuando esté disponible el backend.
 */

import { SECTOR_CATALOG } from '@/lib/macro/sector-catalog'
import { CCAA_CATALOG } from '@/lib/macro/ccaa-catalog'
import { COMPANY_CATALOG } from '@/lib/macro/company-catalog'

export type EntityKind =
  | 'person'        // Político, líder, ministro, dirigente
  | 'party'         // Partido político
  | 'ccaa'          // Comunidad Autónoma
  | 'sector'        // Sector económico
  | 'company'       // Empresa cotizada / IBEX
  | 'institution'   // Institución pública/internacional
  | 'country'       // País

export interface CuadEntity {
  /** Identificador estable URL-friendly */
  slug: string
  /** Nombre canónico para mostrar */
  name: string
  /** Tipo · determina color, ruta destino y emoji */
  kind: EntityKind
  /** Aliases para búsqueda fuzzy (apodos, abreviaturas) */
  aliases?: string[]
  /** URL relativa en el dashboard donde profundizar */
  link: string
  /** Cargo, descripción, posición · opcional */
  role?: string
  /** Año nacimiento (Person) o fundación (resto) */
  born?: number
}

// ────────────────────────────────────────────────────────────────────────
// SEED · figuras políticas nacionales clave (~30)
// ────────────────────────────────────────────────────────────────────────
const PERSONS: CuadEntity[] = [
  { slug: 'pedro-sanchez', name: 'Pedro Sánchez', kind: 'person', role: 'Presidente del Gobierno · PSOE', aliases: ['Sánchez', 'PSOE Presidente'], link: '/figuras/pedro-sanchez', born: 1972 },
  { slug: 'alberto-nunez-feijoo', name: 'Alberto Núñez Feijóo', kind: 'person', role: 'Líder PP · oposición', aliases: ['Feijóo', 'Nunez Feijoo'], link: '/figuras/alberto-nunez-feijoo', born: 1961 },
  { slug: 'santiago-abascal', name: 'Santiago Abascal', kind: 'person', role: 'Presidente Vox', aliases: ['Abascal'], link: '/figuras/santiago-abascal', born: 1976 },
  { slug: 'yolanda-diaz', name: 'Yolanda Díaz', kind: 'person', role: 'Vicepresidenta 2ª · Sumar', aliases: ['Yolanda', 'Sumar'], link: '/figuras/yolanda-diaz', born: 1971 },
  { slug: 'maria-jesus-montero', name: 'María Jesús Montero', kind: 'person', role: 'Vicepresidenta 1ª · Hacienda', aliases: ['Montero'], link: '/figuras/maria-jesus-montero', born: 1966 },
  { slug: 'fernando-grande-marlaska', name: 'Fernando Grande-Marlaska', kind: 'person', role: 'Ministro Interior', aliases: ['Marlaska'], link: '/figuras/fernando-grande-marlaska', born: 1962 },
  { slug: 'jose-luis-escriva', name: 'José Luis Escrivá', kind: 'person', role: 'Ministro Transformación Digital · ex-AIReF', aliases: ['Escrivá'], link: '/figuras/jose-luis-escriva', born: 1960 },
  { slug: 'carlos-cuerpo', name: 'Carlos Cuerpo', kind: 'person', role: 'Ministro Economía', aliases: ['Cuerpo'], link: '/figuras/carlos-cuerpo', born: 1980 },
  { slug: 'oscar-puente', name: 'Óscar Puente', kind: 'person', role: 'Ministro Transportes', aliases: ['Puente'], link: '/figuras/oscar-puente', born: 1968 },
  { slug: 'felix-bolanos', name: 'Félix Bolaños', kind: 'person', role: 'Ministro Presidencia · Justicia', aliases: ['Bolaños'], link: '/figuras/felix-bolanos', born: 1975 },
  { slug: 'mona-garcia', name: 'Mónica García', kind: 'person', role: 'Ministra Sanidad · Más Madrid', aliases: ['García Sanidad'], link: '/figuras/mona-garcia', born: 1974 },
  { slug: 'cuca-gamarra', name: 'Cuca Gamarra', kind: 'person', role: 'Portavoz PP Congreso', aliases: ['Gamarra'], link: '/figuras/cuca-gamarra', born: 1974 },
  { slug: 'isabel-diaz-ayuso', name: 'Isabel Díaz Ayuso', kind: 'person', role: 'Presidenta Comunidad Madrid · PP', aliases: ['Ayuso', 'Díaz Ayuso'], link: '/figuras/isabel-diaz-ayuso', born: 1978 },
  { slug: 'salvador-illa', name: 'Salvador Illa', kind: 'person', role: 'Presidente Generalitat · PSC', aliases: ['Illa'], link: '/figuras/salvador-illa', born: 1966 },
  { slug: 'imanol-pradales', name: 'Imanol Pradales', kind: 'person', role: 'Lehendakari · PNV', aliases: ['Pradales', 'Lehendakari'], link: '/figuras/imanol-pradales', born: 1975 },
  { slug: 'alfonso-rueda', name: 'Alfonso Rueda', kind: 'person', role: 'Presidente Xunta Galicia · PP', aliases: ['Rueda'], link: '/figuras/alfonso-rueda', born: 1968 },
  { slug: 'juanma-moreno', name: 'Juanma Moreno', kind: 'person', role: 'Presidente Junta Andalucía · PP', aliases: ['Moreno', 'Juanma'], link: '/figuras/juanma-moreno', born: 1970 },
  { slug: 'carlos-mazon', name: 'Carlos Mazón', kind: 'person', role: 'Presidente Generalitat Valenciana · PP', aliases: ['Mazón'], link: '/figuras/carlos-mazon', born: 1974 },
  { slug: 'felipe-vi', name: 'Felipe VI', kind: 'person', role: 'Rey de España · Jefe del Estado', aliases: ['Rey', 'Borbón'], link: '/figuras/felipe-vi', born: 1968 },
  { slug: 'jose-luis-rodriguez-zapatero', name: 'José Luis Rodríguez Zapatero', kind: 'person', role: 'Expresidente · PSOE', aliases: ['Zapatero', 'ZP'], link: '/figuras/jose-luis-rodriguez-zapatero', born: 1960 },
  { slug: 'mariano-rajoy', name: 'Mariano Rajoy', kind: 'person', role: 'Expresidente · PP', aliases: ['Rajoy'], link: '/figuras/mariano-rajoy', born: 1955 },
  { slug: 'felipe-gonzalez', name: 'Felipe González', kind: 'person', role: 'Expresidente · PSOE', aliases: ['Felipe', 'González'], link: '/figuras/felipe-gonzalez', born: 1942 },
  { slug: 'jose-maria-aznar', name: 'José María Aznar', kind: 'person', role: 'Expresidente · PP', aliases: ['Aznar'], link: '/figuras/jose-maria-aznar', born: 1953 },
  { slug: 'jose-manuel-albares', name: 'José Manuel Albares', kind: 'person', role: 'Ministro Exteriores', aliases: ['Albares'], link: '/figuras/jose-manuel-albares', born: 1972 },
  { slug: 'margarita-robles', name: 'Margarita Robles', kind: 'person', role: 'Ministra Defensa', aliases: ['Robles'], link: '/figuras/margarita-robles', born: 1956 },
  { slug: 'teresa-ribera', name: 'Teresa Ribera', kind: 'person', role: 'Vicepresidenta · CE Competencia', aliases: ['Ribera'], link: '/figuras/teresa-ribera', born: 1969 },
  { slug: 'nadia-calvino', name: 'Nadia Calviño', kind: 'person', role: 'Presidenta BEI · ex-VP economía', aliases: ['Calviño'], link: '/figuras/nadia-calvino', born: 1968 },
  { slug: 'pablo-iglesias', name: 'Pablo Iglesias', kind: 'person', role: 'Exvicepresidente · ex-Podemos', aliases: ['Iglesias', 'Pablo'], link: '/figuras/pablo-iglesias', born: 1978 },
  { slug: 'ione-belarra', name: 'Ione Belarra', kind: 'person', role: 'Secretaria General Podemos', aliases: ['Belarra'], link: '/figuras/ione-belarra', born: 1987 },
]

// ────────────────────────────────────────────────────────────────────────
// SEED · Partidos políticos relevantes
// ────────────────────────────────────────────────────────────────────────
const PARTIES: CuadEntity[] = [
  { slug: 'psoe', name: 'PSOE', kind: 'party', role: 'Partido Socialista Obrero Español', aliases: ['Socialistas', 'PSOE-PSC'], link: '/partidos/psoe', born: 1879 },
  { slug: 'pp', name: 'PP', kind: 'party', role: 'Partido Popular', aliases: ['Populares'], link: '/partidos/pp', born: 1989 },
  { slug: 'vox', name: 'Vox', kind: 'party', role: 'Vox · derecha radical', aliases: ['VOX'], link: '/partidos/vox', born: 2013 },
  { slug: 'sumar', name: 'Sumar', kind: 'party', role: 'Movimiento Sumar (coalición)', aliases: ['Movimiento Sumar'], link: '/partidos/sumar', born: 2023 },
  { slug: 'podemos', name: 'Podemos', kind: 'party', role: 'Podemos · izquierda', aliases: [], link: '/partidos/podemos', born: 2014 },
  { slug: 'erc', name: 'ERC', kind: 'party', role: 'Esquerra Republicana de Catalunya', aliases: ['Esquerra', 'Republicans'], link: '/partidos/erc', born: 1931 },
  { slug: 'junts', name: 'Junts', kind: 'party', role: 'Junts per Catalunya', aliases: ['JxCat'], link: '/partidos/junts', born: 2020 },
  { slug: 'pnv', name: 'PNV', kind: 'party', role: 'Partido Nacionalista Vasco · EAJ', aliases: ['EAJ-PNV', 'jeltzales'], link: '/partidos/pnv', born: 1895 },
  { slug: 'eh-bildu', name: 'EH Bildu', kind: 'party', role: 'Euskal Herria Bildu · izquierda abertzale', aliases: ['Bildu'], link: '/partidos/eh-bildu', born: 2012 },
  { slug: 'bng', name: 'BNG', kind: 'party', role: 'Bloque Nacionalista Galego', aliases: [], link: '/partidos/bng', born: 1982 },
  { slug: 'cs', name: 'Ciudadanos', kind: 'party', role: 'Ciudadanos (en disolución)', aliases: ['Cs'], link: '/partidos/ciudadanos', born: 2006 },
  { slug: 'mas-pais', name: 'Más País', kind: 'party', role: 'Más País · ahora Sumar', aliases: ['Más Madrid'], link: '/partidos/mas-pais', born: 2019 },
  { slug: 'cup', name: 'CUP', kind: 'party', role: 'Candidatura Unidad Popular · independentista', aliases: [], link: '/partidos/cup', born: 1986 },
]

// ────────────────────────────────────────────────────────────────────────
// SEED · derivados de catálogos macro existentes
// ────────────────────────────────────────────────────────────────────────
const CCAA_ENTRIES: CuadEntity[] = CCAA_CATALOG.map((c) => ({
  slug: c.id,
  name: c.label,
  kind: 'ccaa' as const,
  aliases: c.shortLabel ? [c.shortLabel, c.label.toLowerCase()] : [c.label.toLowerCase()],
  role: `Comunidad Autónoma · ${c.capital}`,
  link: `/macro?ccaa=${c.id}`,
}))

const SECTOR_ENTRIES: CuadEntity[] = SECTOR_CATALOG.map((s: any) => ({
  slug: s.id,
  name: s.label,
  kind: 'sector' as const,
  aliases: [s.label.split(' ')[0]],
  role: 'Sector económico',
  link: `/sector-${s.id}`,
}))

const COMPANY_ENTRIES: CuadEntity[] = COMPANY_CATALOG.map((c: any) => ({
  slug: c.ticker.replace('.MC', '').toLowerCase(),
  name: c.name || c.ticker,
  kind: 'company' as const,
  aliases: [c.ticker, c.ticker.replace('.MC', '')],
  role: `IBEX35 · ${c.sector || ''}`,
  link: `/competidores?empresa=${c.ticker}`,
}))

// ────────────────────────────────────────────────────────────────────────
// SEED · Instituciones nacionales y supranacionales clave
// ────────────────────────────────────────────────────────────────────────
const INSTITUTIONS: CuadEntity[] = [
  { slug: 'congreso', name: 'Congreso de los Diputados', kind: 'institution', aliases: ['Congreso'], role: 'Cámara baja Cortes Generales', link: '/instituciones' },
  { slug: 'senado', name: 'Senado', kind: 'institution', aliases: [], role: 'Cámara alta', link: '/instituciones' },
  { slug: 'gobierno', name: 'Gobierno de España', kind: 'institution', aliases: ['Moncloa'], role: 'Poder ejecutivo', link: '/instituciones' },
  { slug: 'cgpj', name: 'CGPJ', kind: 'institution', aliases: ['Consejo Poder Judicial'], role: 'Consejo General del Poder Judicial', link: '/instituciones' },
  { slug: 'tc', name: 'Tribunal Constitucional', kind: 'institution', aliases: ['TC'], role: 'Garante constitucional', link: '/instituciones' },
  { slug: 'ts', name: 'Tribunal Supremo', kind: 'institution', aliases: ['TS', 'Supremo'], role: 'Cúspide judicial', link: '/instituciones' },
  { slug: 'bde', name: 'Banco de España', kind: 'institution', aliases: ['BdE'], role: 'Banco central nacional', link: '/sector-banca' },
  { slug: 'cnmv', name: 'CNMV', kind: 'institution', aliases: [], role: 'Supervisión mercados valores', link: '/sector-banca' },
  { slug: 'cnmc', name: 'CNMC', kind: 'institution', aliases: [], role: 'Comisión Nacional Mercados Competencia', link: '/sector-telecom' },
  { slug: 'aireef', name: 'AIReF', kind: 'institution', aliases: ['Autoridad Independiente Responsabilidad Fiscal'], role: 'Vigilancia fiscal', link: '/macro?tab=margen-fiscal' },
  { slug: 'ine', name: 'INE', kind: 'institution', aliases: ['Instituto Nacional Estadística'], role: 'Estadística oficial', link: '/macro' },
  { slug: 'cis', name: 'CIS', kind: 'institution', aliases: ['Centro Investigaciones Sociológicas'], role: 'Barómetros públicos', link: '/macro?tab=hogares-empleo-vivienda' },
  { slug: 'ue', name: 'Unión Europea', kind: 'institution', aliases: ['UE', 'EU'], role: 'Bloque supranacional', link: '/geopolitica' },
  { slug: 'bce', name: 'BCE', kind: 'institution', aliases: ['Banco Central Europeo', 'ECB'], role: 'Política monetaria EUR', link: '/macro?tab=regimen-monetario' },
  { slug: 'comision-europea', name: 'Comisión Europea', kind: 'institution', aliases: ['CE', 'Bruselas'], role: 'Ejecutivo UE', link: '/geopolitica' },
  { slug: 'otan', name: 'OTAN', kind: 'institution', aliases: ['NATO'], role: 'Alianza Atlántica', link: '/sector-defensa' },
  { slug: 'onu', name: 'ONU', kind: 'institution', aliases: ['UN', 'Naciones Unidas'], role: 'Organización mundial', link: '/geopolitica' },
  { slug: 'fmi', name: 'FMI', kind: 'institution', aliases: ['IMF', 'Fondo Monetario'], role: 'Estabilidad financiera global', link: '/geopolitica' },
]

// ────────────────────────────────────────────────────────────────────────
// SEED · países más relevantes para análisis geopolítico (UE5 + USA + grandes)
// ────────────────────────────────────────────────────────────────────────
const COUNTRIES: CuadEntity[] = [
  { slug: 'usa', name: 'Estados Unidos', kind: 'country', aliases: ['USA', 'EEUU', 'EE.UU.'], link: '/geopolitica?pais=USA' },
  { slug: 'alemania', name: 'Alemania', kind: 'country', aliases: ['Germany', 'DEU'], link: '/geopolitica?pais=DEU' },
  { slug: 'francia', name: 'Francia', kind: 'country', aliases: ['France', 'FRA'], link: '/geopolitica?pais=FRA' },
  { slug: 'italia', name: 'Italia', kind: 'country', aliases: ['Italy', 'ITA'], link: '/geopolitica?pais=ITA' },
  { slug: 'portugal', name: 'Portugal', kind: 'country', aliases: ['PRT'], link: '/geopolitica?pais=PRT' },
  { slug: 'reino-unido', name: 'Reino Unido', kind: 'country', aliases: ['UK', 'Inglaterra', 'GBR'], link: '/geopolitica?pais=GBR' },
  { slug: 'rusia', name: 'Rusia', kind: 'country', aliases: ['Russia', 'RUS', 'Federación Rusa'], link: '/geopolitica?pais=RUS' },
  { slug: 'china', name: 'China', kind: 'country', aliases: ['CHN', 'RPC'], link: '/geopolitica?pais=CHN' },
  { slug: 'ucrania', name: 'Ucrania', kind: 'country', aliases: ['Ukraine', 'UKR'], link: '/geopolitica?pais=UKR' },
  { slug: 'israel', name: 'Israel', kind: 'country', aliases: ['ISR'], link: '/geopolitica?pais=ISR' },
  { slug: 'palestina', name: 'Palestina', kind: 'country', aliases: ['Gaza', 'Cisjordania', 'PSE'], link: '/geopolitica?pais=PSE' },
  { slug: 'marruecos', name: 'Marruecos', kind: 'country', aliases: ['Morocco', 'MAR'], link: '/geopolitica?pais=MAR' },
  { slug: 'argelia', name: 'Argelia', kind: 'country', aliases: ['Algeria', 'DZA'], link: '/geopolitica?pais=DZA' },
  { slug: 'venezuela', name: 'Venezuela', kind: 'country', aliases: ['VEN'], link: '/geopolitica?pais=VEN' },
  { slug: 'mexico', name: 'México', kind: 'country', aliases: ['MEX'], link: '/geopolitica?pais=MEX' },
  { slug: 'argentina', name: 'Argentina', kind: 'country', aliases: ['ARG'], link: '/geopolitica?pais=ARG' },
  { slug: 'turquia', name: 'Turquía', kind: 'country', aliases: ['Turkey', 'TUR'], link: '/geopolitica?pais=TUR' },
]

// ────────────────────────────────────────────────────────────────────────
// Registry consolidado · 150+ entidades
// ────────────────────────────────────────────────────────────────────────
export const ENTITY_REGISTRY: CuadEntity[] = [
  ...PERSONS,
  ...PARTIES,
  ...CCAA_ENTRIES,
  ...SECTOR_ENTRIES,
  ...COMPANY_ENTRIES,
  ...INSTITUTIONS,
  ...COUNTRIES,
]

// Index por slug para resolución O(1)
const BY_SLUG = new Map<string, CuadEntity>()
const BY_NAME_LOWER = new Map<string, CuadEntity>()
const BY_ALIAS_LOWER = new Map<string, CuadEntity>()

for (const e of ENTITY_REGISTRY) {
  BY_SLUG.set(e.slug, e)
  BY_NAME_LOWER.set(e.name.toLowerCase(), e)
  for (const alias of e.aliases ?? []) {
    BY_ALIAS_LOWER.set(alias.toLowerCase(), e)
  }
}

/**
 * Resuelve una mención `[[X]]` a una entidad concreta.
 * Acepta el slug, el nombre canónico o un alias.
 */
export function resolveEntity(mention: string): CuadEntity | null {
  if (!mention) return null
  const m = mention.trim()
  const lower = m.toLowerCase()
  return (
    BY_SLUG.get(m) ??
    BY_SLUG.get(slugifyMention(m)) ??
    BY_NAME_LOWER.get(lower) ??
    BY_ALIAS_LOWER.get(lower) ??
    null
  )
}

/**
 * Búsqueda fuzzy para autocompletado · prioriza prefijo > contains > alias.
 */
export function searchEntities(query: string, limit = 20): CuadEntity[] {
  const q = query.trim().toLowerCase()
  if (q.length < 1) return ENTITY_REGISTRY.slice(0, limit)

  const scored: Array<{ e: CuadEntity; score: number }> = []
  for (const e of ENTITY_REGISTRY) {
    const name = e.name.toLowerCase()
    const slug = e.slug.toLowerCase()
    let score = 0
    if (name === q || slug === q) score = 100
    else if (name.startsWith(q) || slug.startsWith(q)) score = 80
    else if (name.includes(q) || slug.includes(q)) score = 50
    else {
      for (const alias of e.aliases ?? []) {
        const a = alias.toLowerCase()
        if (a === q) { score = Math.max(score, 90); break }
        if (a.startsWith(q)) { score = Math.max(score, 70); break }
        if (a.includes(q)) { score = Math.max(score, 30); break }
      }
    }
    if (score > 0) scored.push({ e, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.e)
}

/**
 * Entidades por tipo (útil para pickers segmentados).
 */
export function entitiesByKind(kind: EntityKind): CuadEntity[] {
  return ENTITY_REGISTRY.filter((e) => e.kind === kind)
}

/**
 * Color asociado a cada tipo · para badges en el preview.
 */
export const KIND_COLORS: Record<EntityKind, { bg: string; fg: string; border: string; glyph: string }> = {
  person:      { bg: 'rgba(15,118,110,0.10)',  fg: '#0F766E', border: 'rgba(15,118,110,0.3)',  glyph: '◉' },
  party:       { bg: 'rgba(220,38,38,0.10)',   fg: '#dc2626', border: 'rgba(220,38,38,0.3)',   glyph: '⊞' },
  ccaa:        { bg: 'rgba(124,58,237,0.10)',  fg: '#7C3AED', border: 'rgba(124,58,237,0.3)',  glyph: '▦' },
  sector:      { bg: 'rgba(22,163,74,0.10)',   fg: '#16a34a', border: 'rgba(22,163,74,0.3)',   glyph: '⬡' },
  company:     { bg: 'rgba(245,158,11,0.10)',  fg: '#d97706', border: 'rgba(245,158,11,0.3)',  glyph: '⊟' },
  institution: { bg: 'rgba(8,145,178,0.10)',   fg: '#0891B2', border: 'rgba(8,145,178,0.3)',   glyph: '◐' },
  country:     { bg: 'rgba(75,85,99,0.10)',    fg: '#4B5563', border: 'rgba(75,85,99,0.3)',    glyph: '✦' },
}

/**
 * Helper · convierte texto libre en slug URL-friendly equivalente al del registry.
 * Sirve para que `[[Pedro Sánchez]]` resuelva igual que `[[pedro-sanchez]]`.
 */
export function slugifyMention(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function totalEntities(): number {
  return ENTITY_REGISTRY.length
}
