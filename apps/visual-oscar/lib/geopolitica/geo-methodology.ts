/**
 * `geo-methodology.ts` · Sprint G1 FASE 1 · capa metodológica común para
 * el módulo Geopolítica / OSINT.
 *
 * Objetivo: convertir el módulo en auditable. Cada señal (artículo, evento
 * ACLED, alerta ReliefWeb, item OSINT) pasa por aquí y sale con:
 *   - clasificación de fuente (live API vs RSS vs curado vs derivado)
 *   - capa analítica (signal_fast / hard_event / structural_conflict / …)
 *   - país actor / país afectado / países mencionados (no toda mención
 *     implica impacto)
 *   - severidad numérica con bandas semánticas
 *   - relevancia para España con motivos explicados
 *   - confianza multi-componente (source_quality, freshness, triangulación,
 *     specificity, evidence_strength) con razones
 *   - audit trail (qué entró, qué reglas se aplicaron, fallback/IA, warnings)
 *
 * Sin LLM. Sin dependencias nuevas. Compatible con tipos existentes
 * (GeoOsintItem, GeoAlertaItem, GeoRiesgoItem en `news-aggregator.ts`).
 *
 * Esto NO sustituye a los endpoints existentes — los enriquece. Cada
 * endpoint puede llamar a `readGeoSignal()` para devolver una señal con
 * estructura común y `_meta` con `source_mode`/confidence/warnings.
 */

// ════════════════════════════════════════════════════════════════════════
// 1 · Tipos públicos
// ════════════════════════════════════════════════════════════════════════

export type GeoSourceType =
  | 'live_api'              // ACLED, UCDP, ReliefWeb, NewsAPI, GDELT
  | 'rss_official'          // Moncloa, Defensa, Exteriores, NATO, UN SC, EEAS
  | 'rss_media'             // El País, El Mundo, Le Monde, Reuters…
  | 'curated_baseline'      // Catálogo Politeia · Spain Interests, RiskCountries
  | 'derived_from_news'     // calculado por agregación sobre RSS (no del backend)
  | 'llm_cluster'           // theme clusters generados por LLM
  | 'fallback'              // backend caído · respuesta vacía o última conocida
  | 'mock'                  // datos sintéticos de desarrollo · NO producción

export type GeoLayer =
  | 'signal_fast'           // noticias últimas horas · alta señal pero ruido
  | 'hard_event'            // ACLED, UCDP, GTD · violencia confirmada
  | 'structural_conflict'   // UCDP histórico, ICG · contexto multi-año
  | 'humanitarian'          // ReliefWeb, OCHA · presión humanitaria actual
  | 'consular'              // Travel Advisories MAEC, FCDO · riesgo viajero
  | 'military_diplomatic'   // NATO, Defensa.es, EEAS · institucional
  | 'sanctions'             // OFAC, EU, UN · medidas restrictivas
  | 'qualitative_osint'     // ICG analysis, ISW briefings · análisis cualitativo
  | 'spain_official'        // Moncloa, Exteriores, BOE · postura España
  | 'analytical_model'      // Risk Index, Convergence, Spain Watchlist · derivado

export type GeoCountryRoleKind =
  | 'actor'                 // realiza la acción (España envía ayuda)
  | 'affected'              // sufre la acción (Ucrania recibe ataque)
  | 'mentioned'             // aparece pero no es actor ni objeto principal
  | 'source'                // emisor (NATO publica, ONU informa)
  | 'spain_interest'        // país sobre el que España tiene exposición declarada

export interface GeoCountryRole {
  country: string                       // nombre canónico ES (España, Ucrania, …)
  iso3?: string                         // ISO 3166-1 alpha-3 si disponible
  role: GeoCountryRoleKind
  confidence: number                    // 0..1 · qué tan seguros estamos del rol
  evidence: string                      // frase o verbo que justificó la asignación
}

export type GeoEventType =
  | 'armed_conflict'        // combate, ataque, bombardeo
  | 'protest_unrest'        // protestas, huelgas, disturbios
  | 'diplomatic_action'     // pacta, condena, reconoce, expulsa
  | 'humanitarian_crisis'   // hambruna, desplazamiento, epidemia
  | 'migration_pressure'    // flujos migratorios, fronterizos
  | 'sanctions_action'      // sanciones, embargos
  | 'cyber_incident'        // ciberataques atribuidos
  | 'energy_event'          // gas, petróleo, gasoductos
  | 'institutional_action'  // UE, OTAN, ONU resuelven/advierten
  | 'spain_action'          // España actúa internacionalmente
  | 'narrative_only'        // sólo cobertura mediática · no hecho material
  | 'other'

export type GeoDimension =
  | 'security'              // militar, terrorista, criminal
  | 'humanitarian'          // crisis humanitaria
  | 'economic'              // sanciones, comercio, energía
  | 'political_diplomatic'  // diplomacia, instituciones
  | 'migratory'             // movimientos poblacionales
  | 'cyber'                 // ciber, desinformación digital
  | 'narrative'             // sólo cobertura · no acción material

/**
 * Reading auditable de una señal geopolítica.
 *
 * Cualquier endpoint debe poder producir esto a partir de su input bruto
 * (artículo RSS, evento ACLED, item OSINT, alerta convergence, etc).
 */
export interface GeoSignalReading {
  // Identificación
  id: string
  title: string
  summary?: string
  url?: string
  observed_at: string                   // ISO · cuándo ocurrió o se reportó

  // Procedencia
  source_name: string                   // "ACLED", "El País", "Moncloa", …
  source_type: GeoSourceType
  geo_layer: GeoLayer

  // Geografía multi-rol (FASE 2)
  country_roles: GeoCountryRole[]       // mapa completo · una entidad puede aparecer en varios roles
  country_actor?: string                // back-compat · primer actor detectado
  country_affected?: string             // back-compat · primer afectado detectado
  countries_mentioned: string[]         // back-compat · todos los nombres canónicos detectados
  region?: string                       // 'Europe' | 'MENA' | 'Sahel' | 'LATAM' | …

  // Clasificación de evento
  event_type: GeoEventType
  dimension: GeoDimension
  actors: string[]                      // organizaciones / personas no-país (Hamas, OTAN, Wagner)
  institutions: string[]                // UE, OTAN, ONU, OSCE, BCE, FMI…

  // Métricas auditables
  severity: number                      // 0..100 · 0 noticia trivial, 100 conflicto activo grave
  spain_relevance: number               // 0..100 · 0 sin impacto España, 100 directo
  confidence: GeoConfidence

  // Evidencia y trazabilidad
  evidence: string[]                    // citas/frases que justifican las inferencias
  limitations: string[]                 // qué NO podemos afirmar con esta señal
  derived_from?: string[]               // ids de otras señales que entraron en esta (convergence)
}

export interface GeoConfidence {
  overall: number                       // 0..1 · combinación ponderada
  source_quality: number                // 0..1 · live_api > rss_official > rss_media > derived > mock
  freshness: number                     // 0..1 · 1 hoy, decae con antigüedad
  triangulation: number                 // 0..1 · cuántas fuentes independientes lo respaldan
  specificity: number                   // 0..1 · qué tan concretos son países/actores
  evidence_strength: number             // 0..1 · cuánta evidencia textual fuerte
  reasons: string[]                     // razones legibles ("freshness baja: 12d", "sin triangulación", …)
}

export interface GeoAuditTrail {
  input_sources: Array<{ source_name: string; source_type: GeoSourceType; count: number }>
  transformations: string[]             // pasos aplicados ("normalizar países", "clasificar verbo", "calcular convergencia")
  rules_triggered: string[]             // reglas concretas ("frontera ES-Marruecos", "energía Europa", …)
  fallback_used: boolean                // alguna fuente vino del cache/fallback
  llm_used: boolean                     // intervino LLM en algún paso
  confidence: GeoConfidence
  warnings: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>
}

// Forma estándar del bloque _meta que todo endpoint geopolítica debe devolver
// (FASE 3). Compatible con buildMeta() de media-methodology, pero específico.
export interface GeoEndpointMeta {
  source_mode: 'live' | 'derived' | 'curated' | 'hybrid' | 'fallback' | 'mock'
  sources_used: Array<{ source_name: string; source_type: GeoSourceType; count?: number }>
  generated_at: string
  latency_ms: number
  confidence: number                    // 0..1
  warnings: string[]
  methodology_version: string
  layer?: GeoLayer
  notes?: string
}

// ════════════════════════════════════════════════════════════════════════
// 2 · Diccionarios estables
// ════════════════════════════════════════════════════════════════════════

export const GEO_METHODOLOGY_VERSION = '1.0.0-G1F1'

export const SOURCE_TYPE_LABEL: Record<GeoSourceType, string> = {
  live_api: 'LIVE API',
  rss_official: 'RSS oficial',
  rss_media: 'RSS medios',
  curated_baseline: 'Curado Politeia',
  derived_from_news: 'Derivado',
  llm_cluster: 'IA',
  fallback: 'Fallback',
  mock: 'Mock',
}

export const LAYER_LABEL: Record<GeoLayer, string> = {
  signal_fast: 'Señal rápida',
  hard_event: 'Evento confirmado',
  structural_conflict: 'Conflicto estructural',
  humanitarian: 'Crisis humanitaria',
  consular: 'Riesgo consular',
  military_diplomatic: 'Militar / diplomático',
  sanctions: 'Sanciones',
  qualitative_osint: 'OSINT cualitativo',
  spain_official: 'Postura oficial España',
  analytical_model: 'Modelo derivado',
}

// País canónico → aliases reconocibles en texto ES. ISO3 para join con
// catálogos externos (ACLED, ReliefWeb, World Bank).
interface CountryEntry {
  canonical: string
  iso3?: string
  aliases: string[]                    // formas en texto castellano
  region?: string
}

const COUNTRIES: CountryEntry[] = [
  // España y vecinos
  { canonical: 'España', iso3: 'ESP', aliases: ['españa', 'spain', 'español', 'española'], region: 'Europe' },
  { canonical: 'Portugal', iso3: 'PRT', aliases: ['portugal', 'portugués', 'portuguesa'], region: 'Europe' },
  { canonical: 'Francia', iso3: 'FRA', aliases: ['francia', 'france', 'francés', 'francesa'], region: 'Europe' },
  { canonical: 'Andorra', iso3: 'AND', aliases: ['andorra'], region: 'Europe' },
  // UE-grandes
  { canonical: 'Alemania', iso3: 'DEU', aliases: ['alemania', 'germany', 'alemán', 'alemana'], region: 'Europe' },
  { canonical: 'Italia', iso3: 'ITA', aliases: ['italia', 'italy', 'italiano', 'italiana'], region: 'Europe' },
  { canonical: 'Países Bajos', iso3: 'NLD', aliases: ['países bajos', 'paises bajos', 'holanda', 'netherlands'], region: 'Europe' },
  { canonical: 'Bélgica', iso3: 'BEL', aliases: ['bélgica', 'belgica', 'belgium'], region: 'Europe' },
  { canonical: 'Polonia', iso3: 'POL', aliases: ['polonia', 'poland', 'polaco', 'polaca'], region: 'Europe' },
  { canonical: 'Reino Unido', iso3: 'GBR', aliases: ['reino unido', 'uk', 'gran bretaña', 'británico', 'britanica', 'inglaterra', 'london'], region: 'Europe' },
  { canonical: 'Irlanda', iso3: 'IRL', aliases: ['irlanda', 'ireland'], region: 'Europe' },
  // Norte de África y MENA
  { canonical: 'Marruecos', iso3: 'MAR', aliases: ['marruecos', 'morocco', 'marroquí', 'marroqui', 'rabat'], region: 'MENA' },
  { canonical: 'Argelia', iso3: 'DZA', aliases: ['argelia', 'algeria', 'argelino', 'argelina'], region: 'MENA' },
  { canonical: 'Túnez', iso3: 'TUN', aliases: ['túnez', 'tunez', 'tunisia'], region: 'MENA' },
  { canonical: 'Libia', iso3: 'LBY', aliases: ['libia', 'libya'], region: 'MENA' },
  { canonical: 'Egipto', iso3: 'EGY', aliases: ['egipto', 'egypt', 'egipcio', 'egipcia'], region: 'MENA' },
  { canonical: 'Sahara Occidental', aliases: ['sahara occidental', 'sáhara', 'sahara', 'polisario'], region: 'MENA' },
  // Oriente Medio
  { canonical: 'Israel', iso3: 'ISR', aliases: ['israel', 'israelí', 'israeli'], region: 'MENA' },
  { canonical: 'Palestina', iso3: 'PSE', aliases: ['palestina', 'palestino', 'gaza', 'cisjordania', 'west bank'], region: 'MENA' },
  { canonical: 'Líbano', iso3: 'LBN', aliases: ['líbano', 'libano', 'lebanon', 'beirut'], region: 'MENA' },
  { canonical: 'Siria', iso3: 'SYR', aliases: ['siria', 'syria', 'sirio', 'damasco'], region: 'MENA' },
  { canonical: 'Irán', iso3: 'IRN', aliases: ['irán', 'iran', 'iraní', 'iraniano', 'teherán'], region: 'MENA' },
  { canonical: 'Irak', iso3: 'IRQ', aliases: ['irak', 'iraq', 'iraquí'], region: 'MENA' },
  { canonical: 'Yemen', iso3: 'YEM', aliases: ['yemen', 'yemení', 'houthi', 'huzí'], region: 'MENA' },
  { canonical: 'Arabia Saudí', iso3: 'SAU', aliases: ['arabia saudí', 'arabia saudita', 'saudi arabia', 'riad'], region: 'MENA' },
  { canonical: 'Turquía', iso3: 'TUR', aliases: ['turquía', 'turquia', 'turkey', 'turco', 'turca', 'erdogan', 'ankara'], region: 'MENA' },
  // Sahel y África Subsahariana
  { canonical: 'Mali', iso3: 'MLI', aliases: ['mali', 'malí'], region: 'Sahel' },
  { canonical: 'Burkina Faso', iso3: 'BFA', aliases: ['burkina faso', 'burkina'], region: 'Sahel' },
  { canonical: 'Níger', iso3: 'NER', aliases: ['níger', 'niger'], region: 'Sahel' },
  { canonical: 'Chad', iso3: 'TCD', aliases: ['chad'], region: 'Sahel' },
  { canonical: 'Sudán', iso3: 'SDN', aliases: ['sudán', 'sudan', 'jartum', 'darfur'], region: 'Sahel' },
  { canonical: 'Sudán del Sur', iso3: 'SSD', aliases: ['sudán del sur', 'sudan del sur', 'south sudan'], region: 'Sahel' },
  { canonical: 'Etiopía', iso3: 'ETH', aliases: ['etiopía', 'etiopia', 'tigray'], region: 'África' },
  { canonical: 'Somalia', iso3: 'SOM', aliases: ['somalia', 'somalí'], region: 'África' },
  { canonical: 'Nigeria', iso3: 'NGA', aliases: ['nigeria', 'nigeriano', 'boko haram'], region: 'África' },
  { canonical: 'Sudáfrica', iso3: 'ZAF', aliases: ['sudáfrica', 'sudafrica', 'south africa'], region: 'África' },
  // Ucrania, Rusia, Bielorrusia
  { canonical: 'Ucrania', iso3: 'UKR', aliases: ['ucrania', 'ukraine', 'ucraniano', 'kiev', 'kyiv', 'mariúpol', 'donbass', 'jersón'], region: 'Europe' },
  { canonical: 'Rusia', iso3: 'RUS', aliases: ['rusia', 'russia', 'ruso', 'putin', 'kremlin', 'moscú'], region: 'Europe' },
  { canonical: 'Bielorrusia', iso3: 'BLR', aliases: ['bielorrusia', 'belarus'], region: 'Europe' },
  // Asia-Pacífico
  { canonical: 'China', iso3: 'CHN', aliases: ['china', 'pekín', 'beijing', 'xi jinping'], region: 'Asia' },
  { canonical: 'Taiwán', iso3: 'TWN', aliases: ['taiwán', 'taiwan'], region: 'Asia' },
  { canonical: 'Japón', iso3: 'JPN', aliases: ['japón', 'japon', 'tokio'], region: 'Asia' },
  { canonical: 'Corea del Norte', iso3: 'PRK', aliases: ['corea del norte', 'north korea', 'pionyang'], region: 'Asia' },
  { canonical: 'Corea del Sur', iso3: 'KOR', aliases: ['corea del sur', 'south korea', 'seúl'], region: 'Asia' },
  { canonical: 'India', iso3: 'IND', aliases: ['india', 'nueva delhi'], region: 'Asia' },
  { canonical: 'Pakistán', iso3: 'PAK', aliases: ['pakistán', 'pakistan'], region: 'Asia' },
  { canonical: 'Afganistán', iso3: 'AFG', aliases: ['afganistán', 'afganistan', 'kabul', 'talibán', 'taliban'], region: 'Asia' },
  // América
  { canonical: 'Estados Unidos', iso3: 'USA', aliases: ['estados unidos', 'eeuu', 'ee.uu.', 'usa', 'estadounidense', 'washington', 'biden', 'trump'], region: 'Americas' },
  { canonical: 'Canadá', iso3: 'CAN', aliases: ['canadá', 'canada'], region: 'Americas' },
  { canonical: 'México', iso3: 'MEX', aliases: ['méxico', 'mexico', 'mexicano'], region: 'LATAM' },
  { canonical: 'Venezuela', iso3: 'VEN', aliases: ['venezuela', 'caracas', 'maduro'], region: 'LATAM' },
  { canonical: 'Cuba', iso3: 'CUB', aliases: ['cuba', 'la habana'], region: 'LATAM' },
  { canonical: 'Colombia', iso3: 'COL', aliases: ['colombia', 'bogotá'], region: 'LATAM' },
  { canonical: 'Argentina', iso3: 'ARG', aliases: ['argentina', 'buenos aires', 'milei'], region: 'LATAM' },
  { canonical: 'Brasil', iso3: 'BRA', aliases: ['brasil', 'brazil', 'brasileño', 'lula'], region: 'LATAM' },
  { canonical: 'Chile', iso3: 'CHL', aliases: ['chile', 'chileno'], region: 'LATAM' },
  { canonical: 'Perú', iso3: 'PER', aliases: ['perú', 'peru', 'peruano'], region: 'LATAM' },
  // Regiones especiales que actúan como entidades
  { canonical: 'Unión Europea', aliases: ['unión europea', 'union europea', 'ue ', 'european union', 'bruselas', 'comisión europea', 'comision europea', 'parlamento europeo'], region: 'Europe' },
  { canonical: 'OTAN', aliases: ['otan', 'nato', 'alianza atlántica'], region: 'Europe' },
  { canonical: 'ONU', aliases: ['onu', 'naciones unidas', 'consejo de seguridad', 'security council', 'un sc'], region: 'Global' },
]

const COUNTRY_INDEX = new Map<string, CountryEntry>()
for (const c of COUNTRIES) {
  for (const a of c.aliases) COUNTRY_INDEX.set(a.toLowerCase(), c)
}

// Verbos que marcan rol del país que LOS PRECEDE como actor activo
const ACTOR_VERBS = [
  'envía', 'envia', 'envió', 'envio', 'anuncia', 'firma', 'aprueba',
  'condena', 'acusa', 'denuncia', 'rechaza', 'expulsa', 'reconoce',
  'sanciona', 'sanciones contra', 'critica', 'amenaza', 'advierte',
  'ataca', 'bombardea', 'bombardean', 'invade', 'invaden', 'presiona',
  'presionan', 'apoya', 'respalda', 'rompe relaciones',
  'retira embajador', 'expulsó',
  'lanza ofensiva', 'lanza una ofensiva',
  // Sprint G1 FASE 10 · verbos faltantes detectados por fixtures
  'refuerza', 'refuerzan', 'negocia', 'negocian', 'acuerda', 'acuerdan',
  'pacta', 'pactan', 'firma con', 'media',
]

// Verbos bilaterales · "X y Y verbo" implica ambos son actores (no objeto)
const BILATERAL_VERBS = new Set([
  'negocia', 'negocian', 'pacta', 'pactan', 'acuerda', 'acuerdan',
  'firma con', 'media',
])

// Territorios españoles · si aparecen en el texto, eleva spain_relevance
// porque España está topológicamente involucrada aunque no se nombre
const SPAIN_TERRITORIES = [
  'ceuta', 'melilla', 'canarias', 'baleares', 'mallorca', 'tenerife',
  'gran canaria', 'lanzarote', 'fuerteventura', 'gibraltar', // estrecho · soberanía disputada
  'campo de gibraltar',
]

// Frases que indican rol de objeto/afectado en sintagma "X verbo a/contra Y"
const AFFECTED_MARKERS = [
  ' a ', ' contra ', ' hacia ', ' sobre ', ' en ',
]

// Términos de presión migratoria (España)
const MIGRATION_KW = [
  'frontera', 'migrante', 'inmigración', 'inmigracion', 'pateras',
  'cayucos', 'cetí', 'ceti', 'rescate marítimo', 'ceuta', 'melilla',
  'canarias', 'frontex',
]

// Términos de energía (España depende de gas argelino, GNL EEUU, oleoductos…)
const ENERGY_KW = [
  'gas', 'gasoducto', 'gnl', 'oleoducto', 'petróleo', 'petroleo',
  'energético', 'energetico', 'energética', 'energeticas', 'energéticas',
  'eléctrica', 'electrica', 'red eléctrica', 'medgaz', 'magreb-europa',
]

// ════════════════════════════════════════════════════════════════════════
// 3 · classifyGeoSource · clasifica fuente por nombre/URL
// ════════════════════════════════════════════════════════════════════════

/**
 * Mapea source_name/url al par (source_type, geo_layer). Heurística estable:
 *   - acled.* → live_api + hard_event
 *   - ucdp.* → live_api + structural_conflict
 *   - reliefweb.* → live_api + humanitarian
 *   - moncloa/lamoncloa/defensa.gob/exteriores.gob → rss_official + spain_official
 *   - nato.int / ucm / un.org / coe / eeas → rss_official + military_diplomatic
 *   - icg / isw → rss_official + qualitative_osint
 *   - gdelt → live_api + signal_fast (cobertura mediática)
 *   - los demás RSS → rss_media + signal_fast
 *
 * Si no reconoce, devuelve {rss_media, signal_fast} con confidence baja.
 */
export function classifyGeoSource(sourceName?: string, url?: string): { source_type: GeoSourceType; geo_layer: GeoLayer } {
  const s = (sourceName || '').toLowerCase()
  const u = (url || '').toLowerCase()
  const probe = `${s} ${u}`

  if (probe.includes('acled')) return { source_type: 'live_api', geo_layer: 'hard_event' }
  if (probe.includes('ucdp')) return { source_type: 'live_api', geo_layer: 'structural_conflict' }
  if (probe.includes('reliefweb')) return { source_type: 'live_api', geo_layer: 'humanitarian' }
  if (probe.includes('travel-advisory') || probe.includes('travel.state.gov') || probe.includes('gov.uk/foreign-travel-advice') || probe.includes('exteriores.gob.es/recomenda')) return { source_type: 'rss_official', geo_layer: 'consular' }
  if (probe.includes('gdelt')) return { source_type: 'live_api', geo_layer: 'signal_fast' }
  if (probe.includes('nato.int') || probe.includes('nato.')) return { source_type: 'rss_official', geo_layer: 'military_diplomatic' }
  if (probe.includes('un.org') || probe.includes('sc/press') || probe.includes('security-council')) return { source_type: 'rss_official', geo_layer: 'military_diplomatic' }
  if (probe.includes('eeas.europa.eu') || probe.includes('eu external action')) return { source_type: 'rss_official', geo_layer: 'military_diplomatic' }
  if (probe.includes('defensa.gob.es')) return { source_type: 'rss_official', geo_layer: 'spain_official' }
  if (probe.includes('exteriores.gob.es')) return { source_type: 'rss_official', geo_layer: 'spain_official' }
  if (probe.includes('lamoncloa.gob.es') || probe.includes('moncloa.gob.es')) return { source_type: 'rss_official', geo_layer: 'spain_official' }
  if (probe.includes('boe.es')) return { source_type: 'rss_official', geo_layer: 'spain_official' }
  if (probe.includes('crisisgroup') || probe.includes('icg ')) return { source_type: 'rss_official', geo_layer: 'qualitative_osint' }
  if (probe.includes('understandingwar') || probe.includes('isw ') || probe.includes('institute for the study of war')) return { source_type: 'rss_official', geo_layer: 'qualitative_osint' }
  if (probe.includes('ofac') || probe.includes('eu sanctions') || probe.includes('un sanctions')) return { source_type: 'rss_official', geo_layer: 'sanctions' }

  // Politeia catálogos curados
  if (probe.includes('politeia') || probe.includes('catalog')) return { source_type: 'curated_baseline', geo_layer: 'analytical_model' }
  // LLM cluster
  if (probe.includes('theme_clusters') || probe.includes('llm_summary')) return { source_type: 'llm_cluster', geo_layer: 'qualitative_osint' }

  // Default · RSS de medios convencionales
  return { source_type: 'rss_media', geo_layer: 'signal_fast' }
}

// ════════════════════════════════════════════════════════════════════════
// 4 · detectCountryRoles · separa actor / afectado / mencionado / source
// ════════════════════════════════════════════════════════════════════════

/**
 * Busca países en `text` y les asigna rol heurístico:
 *   - actor: aparece antes de un verbo activo (ACTOR_VERBS)
 *   - affected: aparece después del verbo + marcador "a/contra/hacia"
 *   - mentioned: aparece pero sin patrón
 *
 * `sourceCountry` (opcional) marca el rol 'source' cuando un país emite la
 * señal vía fuente oficial (Moncloa → España como source).
 *
 * Devuelve roles deduplicados pero un mismo país puede aparecer con varios
 * roles (ej. España actor + spain_interest). El primer rol "fuerte" gana
 * en country_actor / country_affected back-compat.
 */
export function detectCountryRoles(text: string, sourceCountry?: string): GeoCountryRole[] {
  const t = (text || '').toLowerCase()
  if (!t) return []

  // 1 · localiza todas las menciones con posición
  interface Hit { entry: CountryEntry; pos: number; matchedAlias: string }
  const hits: Hit[] = []
  for (const c of COUNTRIES) {
    let bestPos = -1
    let bestAlias = ''
    for (const a of c.aliases) {
      const idx = t.indexOf(a.toLowerCase())
      if (idx >= 0 && (bestPos < 0 || idx < bestPos)) {
        bestPos = idx
        bestAlias = a
      }
    }
    if (bestPos >= 0) hits.push({ entry: c, pos: bestPos, matchedAlias: bestAlias })
  }
  hits.sort((a, b) => a.pos - b.pos)
  if (hits.length === 0) return sourceCountry ? syntheticSourceRoles(sourceCountry) : []

  // 2 · clasifica cada hit según patrón sintáctico simple
  const roles: GeoCountryRole[] = []
  const seen = new Map<string, GeoCountryRole>()

  function addOrUpgrade(country: string, role: GeoCountryRoleKind, confidence: number, evidence: string, iso3?: string) {
    const k = `${country}::${role}`
    const prev = seen.get(k)
    if (!prev || prev.confidence < confidence) {
      const r: GeoCountryRole = { country, role, confidence, evidence, iso3 }
      seen.set(k, r)
    }
  }

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]
    const after = t.slice(h.pos + h.matchedAlias.length, h.pos + h.matchedAlias.length + 80)

    // Pre-detección: "X y Y verbo" → ambos son actores (no objeto)
    // Si el hit anterior está conectado a éste por " y " e inmediatamente
    // después del actual hay un verbo activo, ambos comparten rol actor.
    let isCompoundActor = false
    if (i > 0) {
      const prev = hits[i - 1]
      const gap = t.slice(prev.pos + prev.matchedAlias.length, h.pos)
      if (/^\s*(y|and|,)\s*$/.test(gap)) {
        // Mirar si después del actual hay verbo activo
        const verbHit = ACTOR_VERBS.find((v) => after.includes(v) && after.indexOf(v) < 40)
        if (verbHit) {
          // Marca al previo también como actor si no lo estaba ya
          isCompoundActor = true
          addOrUpgrade(prev.entry.canonical, 'actor', 0.7, `sujeto compuesto "${prev.matchedAlias} y ${h.matchedAlias}" + verbo "${verbHit}"`, prev.entry.iso3)
        }
      }
    }

    // ¿Hay verbo activo en los siguientes 40 chars?
    let isActor = false
    let actorVerb = ''
    for (const v of ACTOR_VERBS) {
      if (after.includes(v) && after.indexOf(v) < 40) { isActor = true; actorVerb = v; break }
    }

    // ¿Hay verbo activo entre el hit anterior y éste (otro país lo precede)?
    let isAffected = false
    let affectedReason = ''
    if (i > 0 && !isCompoundActor) {
      const prev = hits[i - 1]
      const between = t.slice(prev.pos + prev.matchedAlias.length, h.pos)
      const verbInBetween = ACTOR_VERBS.find((v) => between.includes(v))
      const hasMarker = AFFECTED_MARKERS.some((m) => between.includes(m))
      const isBilateral = verbInBetween && BILATERAL_VERBS.has(verbInBetween)
      if (verbInBetween && !isBilateral) {
        // Permitimos affected sin marker explícito si el gap es corto y el
        // verbo es transitivo · "Rusia bombardea infraestructuras ucranianas"
        // tiene Ucrania como objeto del bombardeo aunque no haya " a /contra".
        if (hasMarker || between.length < 80) {
          isAffected = true
          affectedReason = (hasMarker ? `verbo "${verbInBetween}" + marker` : `verbo transitivo "${verbInBetween}" gap ${between.length}c`)
        }
      }
    }
    // Pasivas explícitas tipo "X es atacado/sancionado/criticado"
    if (!isAffected && /\b(es|son|fue|fueron|ha sido|han sido)\s+(atacad|sancionad|criticad|condenad|denunciad|presionad|amenazad|invadid|bombardead)/.test(after)) {
      isAffected = true
      affectedReason = 'pasiva explícita'
    }

    if (isActor) {
      addOrUpgrade(h.entry.canonical, 'actor', 0.75, `verbo "${actorVerb}" tras "${h.matchedAlias}"`, h.entry.iso3)
    }
    if (isAffected) {
      addOrUpgrade(h.entry.canonical, 'affected', 0.7, `objeto de acción · ${affectedReason}`, h.entry.iso3)
    }
    if (!isActor && !isAffected && !isCompoundActor) {
      addOrUpgrade(h.entry.canonical, 'mentioned', 0.45, `mención en posición ${h.pos}`, h.entry.iso3)
    }
  }

  // 3 · si España aparece y hay migración/energía → marca spain_interest extra
  const hasSpain = Array.from(seen.values()).some((r) => r.country === 'España')
  const migrationHit = MIGRATION_KW.some((k) => t.includes(k))
  const energyHit = ENERGY_KW.some((k) => t.includes(k))
  if ((migrationHit || energyHit) && !hasSpain) {
    addOrUpgrade('España', 'spain_interest', 0.55, migrationHit ? 'términos migratorios detectados' : 'términos energéticos detectados', 'ESP')
  }

  // 4 · source country (si la fuente es oficial de un país, ese país es source)
  if (sourceCountry) {
    const entry = COUNTRIES.find((c) => c.canonical === sourceCountry)
    addOrUpgrade(sourceCountry, 'source', 0.9, 'fuente oficial', entry?.iso3)
  }

  for (const r of Array.from(seen.values())) roles.push(r)
  return roles
}

function syntheticSourceRoles(country: string): GeoCountryRole[] {
  const entry = COUNTRIES.find((c) => c.canonical === country || c.aliases.includes(country.toLowerCase()))
  return [{ country: entry?.canonical || country, role: 'source', confidence: 0.9, evidence: 'fuente oficial', iso3: entry?.iso3 }]
}

// ════════════════════════════════════════════════════════════════════════
// 5 · assessGeoSeverity · 0..100 con razones
// ════════════════════════════════════════════════════════════════════════

const SEVERITY_KW: Array<{ rx: RegExp; delta: number; label: string }> = [
  { rx: /\b(muertos|muerto|fallecid|víctimas mortales|killed|dead)\b/i, delta: 25, label: 'víctimas mortales' },
  { rx: /\b(heridos|heridas|injured|wounded)\b/i, delta: 10, label: 'heridos' },
  { rx: /\b(masacre|matanza|massacre|atrocidad)\b/i, delta: 30, label: 'masacre' },
  { rx: /\b(bombardeo|misil|misiles|drones?|ataque aéreo|airstrike|shelled)\b/i, delta: 20, label: 'ataque aéreo' },
  { rx: /\b(invasión|invade|invadid)\b/i, delta: 35, label: 'invasión' },
  { rx: /\b(golpe de estado|coup)\b/i, delta: 30, label: 'golpe de estado' },
  { rx: /\b(crisis humanitaria|hambruna|famine|epidemia)\b/i, delta: 25, label: 'crisis humanitaria' },
  { rx: /\b(desplazad|refugiad|displaced|refugees)\b/i, delta: 15, label: 'desplazamiento' },
  { rx: /\b(sanción|sanciones|sanction|embargo)\b/i, delta: 12, label: 'sanciones' },
  { rx: /\b(condena|condemn)\b/i, delta: 6, label: 'condena diplomática' },
  { rx: /\b(amenaza|threat)\b/i, delta: 8, label: 'amenaza' },
  { rx: /\b(tregua|alto el fuego|ceasefire)\b/i, delta: -10, label: 'alto el fuego (negativo)' },
  { rx: /\b(acuerdo|firma|pacta|negocia|negotiat)\b/i, delta: -5, label: 'acuerdo / negociación (negativo)' },
]

export function assessGeoSeverity(text: string, event_type: GeoEventType): { score: number; reasons: string[] } {
  let base = 0
  const reasons: string[] = []
  switch (event_type) {
    case 'armed_conflict': base = 50; break
    case 'humanitarian_crisis': base = 45; break
    case 'sanctions_action': base = 25; break
    case 'cyber_incident': base = 30; break
    case 'protest_unrest': base = 25; break
    case 'migration_pressure': base = 30; break
    case 'diplomatic_action': base = 15; break
    case 'institutional_action': base = 15; break
    case 'energy_event': base = 25; break
    case 'spain_action': base = 20; break
    case 'narrative_only': base = 10; break
    default: base = 15
  }
  reasons.push(`base por event_type=${event_type}: ${base}`)
  let acc = base
  for (const k of SEVERITY_KW) {
    if (k.rx.test(text)) { acc += k.delta; reasons.push(`${k.label}: ${k.delta >= 0 ? '+' : ''}${k.delta}`) }
  }
  acc = Math.max(0, Math.min(100, acc))
  return { score: acc, reasons }
}

// ════════════════════════════════════════════════════════════════════════
// 6 · assessSpainRelevance · 0..100 con motivos auditables
// ════════════════════════════════════════════════════════════════════════

export function assessSpainRelevance(
  roles: GeoCountryRole[],
  text: string,
  event_type: GeoEventType,
  layer?: GeoLayer,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const spainRoles = roles.filter((r) => r.country === 'España')

  // Sprint G1 FASE 10 · iterar TODOS los roles España, no sólo el primero.
  // Caso real: Moncloa publica que España envía ayuda → España es source +
  // actor a la vez. Antes sólo contábamos el primero.
  for (const r of spainRoles) {
    if (r.role === 'affected') { score += 60; reasons.push('España es objeto/afectado directo (+60)') }
    else if (r.role === 'actor') { score += 45; reasons.push('España es actor activo (+45)') }
    else if (r.role === 'source') { score += 25; reasons.push('Fuente oficial española (+25)') }
    else if (r.role === 'spain_interest') { score += 20; reasons.push('Exposición española detectada por términos migratorios/energéticos (+20)') }
  }
  if (spainRoles.length > 0 && spainRoles.every((r) => r.role === 'mentioned')) {
    score += 15; reasons.push('España mencionada pero rol no claro (+15)')
  }

  // Sprint G1 FASE 10 · territorios españoles citados elevan relevancia
  // significativamente · "Canarias" / "Ceuta" / "Melilla" implican España
  // topológicamente involucrada aunque "España" no aparezca como palabra.
  const lowerText = (text || '').toLowerCase()
  const territoryHit = SPAIN_TERRITORIES.find((tr) => lowerText.includes(tr))
  if (territoryHit) {
    score += 30
    reasons.push(`Territorio español citado ("${territoryHit}") · España topológicamente involucrada (+30)`)
  }

  // Vecindad geográfica
  const neighbors = ['Marruecos', 'Portugal', 'Francia', 'Argelia', 'Sahara Occidental']
  if (roles.some((r) => neighbors.includes(r.country))) {
    score += 12; reasons.push('Vecindario inmediato (Marruecos/Portugal/Francia/Argelia) +12')
  }
  // UE / OTAN involucradas · si son ACTOR, bonus extra porque España es miembro
  const blocs = ['Unión Europea', 'OTAN']
  const blocActor = roles.find((r) => blocs.includes(r.country) && r.role === 'actor')
  const blocAny = roles.find((r) => blocs.includes(r.country))
  if (blocActor) {
    score += 30; reasons.push(`${blocActor.country} actúa como bloque → España como miembro (+30)`)
  } else if (blocAny) {
    score += 10; reasons.push('UE/OTAN involucrada (+10)')
  }
  // Migración explícita
  if (MIGRATION_KW.some((k) => lowerText.includes(k))) {
    score += 10; reasons.push('Canal migratorio relevante para España (+10)')
  }
  // Energía · si además hay UE o un país europeo afectado, España vía mercado europeo
  if (ENERGY_KW.some((k) => lowerText.includes(k))) {
    score += 10; reasons.push('Canal energético relevante para España (+10)')
    const europeanAffected = roles.find((r) => r.role === 'affected' && ['Ucrania', 'Alemania', 'Italia', 'Francia', 'Polonia'].includes(r.country))
    if (europeanAffected) { score += 8; reasons.push(`Mercado energético europeo afectado vía ${europeanAffected.country} (+8)`) }
  }
  // Conflicto armado en Europa eleva relevancia para España aunque no esté
  // citada (mercado UE, defensa colectiva, refugiados)
  if (event_type === 'armed_conflict') {
    const europeanCountry = roles.find((r) => {
      const e = COUNTRIES.find((c) => c.canonical === r.country)
      return e?.region === 'Europe' && r.country !== 'España'
    })
    if (europeanCountry) {
      score += 15
      reasons.push(`Conflicto armado en Europa (${europeanCountry.country}) afecta a España vía UE/defensa colectiva (+15)`)
    }
  }
  // Confluencia: spain_interest + territorio español es señal fuerte
  if (spainRoles.some((r) => r.role === 'spain_interest') && territoryHit) {
    score += 10
    reasons.push('Confluencia spain_interest + territorio español (+10)')
  }
  // Layer consular · una travel advisory española sobre país X es por
  // definición consularmente relevante para nacionales españoles
  if (layer === 'consular') {
    score += 10
    reasons.push('Capa consular · señal por definición relevante para nacionales españoles (+10)')
  }
  // Tipo de evento sin actor España: degrada
  if (spainRoles.length === 0 && event_type === 'narrative_only') {
    score = Math.max(0, score - 10); reasons.push('Sólo cobertura mediática y España no es actor/afectado (-10)')
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}

// ════════════════════════════════════════════════════════════════════════
// 7 · computeGeoConfidence
// ════════════════════════════════════════════════════════════════════════

const SOURCE_QUALITY_TABLE: Record<GeoSourceType, number> = {
  live_api: 0.90,
  rss_official: 0.85,
  rss_media: 0.65,
  curated_baseline: 0.70,
  derived_from_news: 0.55,
  llm_cluster: 0.45,
  fallback: 0.25,
  mock: 0.10,
}

export function computeGeoConfidence(
  source_type: GeoSourceType,
  observed_at: string,
  roles: GeoCountryRole[],
  evidence: string[],
  triangulation_count = 1,
): GeoConfidence {
  const reasons: string[] = []
  const source_quality = SOURCE_QUALITY_TABLE[source_type] ?? 0.4
  reasons.push(`source_quality=${source_quality.toFixed(2)} (${SOURCE_TYPE_LABEL[source_type]})`)

  // Freshness · decae lineal hasta 30 días, suelo 0.1
  let freshness = 0.5
  const t = Date.parse(observed_at)
  if (!Number.isNaN(t)) {
    const days = Math.max(0, (Date.now() - t) / 86400000)
    freshness = Math.max(0.1, 1 - days / 30)
    reasons.push(`freshness=${freshness.toFixed(2)} (${days.toFixed(1)}d antigüedad)`)
  } else {
    reasons.push('freshness=0.5 (observed_at no parseable)')
  }

  // Triangulación · 1 fuente=0.4 · 2=0.7 · 3+=0.9
  const triangulation = triangulation_count >= 3 ? 0.9 : triangulation_count === 2 ? 0.7 : 0.4
  reasons.push(`triangulation=${triangulation.toFixed(2)} (${triangulation_count} fuente(s))`)

  // Specificity · cuántos países con rol no-mentioned tenemos
  const strongRoles = roles.filter((r) => r.role !== 'mentioned')
  const specificity = Math.min(1, strongRoles.length / 3)
  reasons.push(`specificity=${specificity.toFixed(2)} (${strongRoles.length} roles fuertes)`)

  // Evidence strength · longitud agregada de evidencia textual
  const evLen = evidence.reduce((s, e) => s + e.length, 0)
  const evidence_strength = Math.min(1, evLen / 400)
  reasons.push(`evidence_strength=${evidence_strength.toFixed(2)} (${evLen} chars evidencia)`)

  const overall = +(
    source_quality * 0.35 +
    freshness * 0.20 +
    triangulation * 0.20 +
    specificity * 0.15 +
    evidence_strength * 0.10
  ).toFixed(3)

  if (overall < 0.5) reasons.push('Overall <0.5 · señal débil · validar con segunda fuente')
  if (freshness < 0.3) reasons.push('Atención: señal antigua · puede haber evolucionado')

  return { overall, source_quality, freshness, triangulation, specificity, evidence_strength, reasons }
}

// ════════════════════════════════════════════════════════════════════════
// 8 · buildGeoAuditTrail
// ════════════════════════════════════════════════════════════════════════

export function buildGeoAuditTrail(args: {
  inputs: Array<{ source_name: string; source_type: GeoSourceType; count?: number }>
  transformations: string[]
  rules_triggered?: string[]
  fallback_used?: boolean
  llm_used?: boolean
  confidence: GeoConfidence
  warnings?: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>
}): GeoAuditTrail {
  const counts = new Map<string, { source_type: GeoSourceType; count: number }>()
  for (const i of args.inputs) {
    const key = i.source_name
    const prev = counts.get(key)
    counts.set(key, { source_type: i.source_type, count: (prev?.count || 0) + (i.count || 1) })
  }
  return {
    input_sources: Array.from(counts.entries()).map(([source_name, v]) => ({ source_name, source_type: v.source_type, count: v.count })),
    transformations: args.transformations,
    rules_triggered: args.rules_triggered || [],
    fallback_used: !!args.fallback_used,
    llm_used: !!args.llm_used,
    confidence: args.confidence,
    warnings: args.warnings || [],
  }
}

// ════════════════════════════════════════════════════════════════════════
// 9 · readGeoSignal · entrada universal
// ════════════════════════════════════════════════════════════════════════

export interface ReadGeoSignalInput {
  id: string
  title: string
  summary?: string
  url?: string
  observed_at: string
  source_name: string
  source_country?: string                          // si la fuente es oficial de un país
  raw_event_type?: GeoEventType                    // si el endpoint ya conoce el tipo
  derived_from?: string[]
}

/**
 * Lectura universal de una señal. Cualquier endpoint puede llamar a esto
 * sobre un input bruto (artículo RSS, evento ACLED, alerta convergence)
 * y obtener un GeoSignalReading uniforme.
 *
 * Sin LLM. Sin red. Puro determinista.
 */
export function readGeoSignal(input: ReadGeoSignalInput): GeoSignalReading {
  const { source_type, geo_layer } = classifyGeoSource(input.source_name, input.url)
  const fullText = `${input.title} ${input.summary || ''}`
  const country_roles = detectCountryRoles(fullText, input.source_country)
  const countries_mentioned = Array.from(new Set(country_roles.map((r) => r.country)))
  const country_actor = country_roles.find((r) => r.role === 'actor')?.country
  const country_affected = country_roles.find((r) => r.role === 'affected')?.country
  const region = inferRegion(country_roles)

  const event_type = input.raw_event_type || inferEventType(fullText, geo_layer)
  const dimension = inferDimension(event_type, geo_layer)
  const sev = assessGeoSeverity(fullText, event_type)
  const spain = assessSpainRelevance(country_roles, fullText, event_type, geo_layer)

  // Evidencia mínima: títulos/frases que dispararon la asignación
  const evidence: string[] = []
  for (const r of country_roles.slice(0, 5)) evidence.push(`${r.country} (${r.role}): ${r.evidence}`)
  if (input.title) evidence.push(`titular: ${input.title.slice(0, 200)}`)

  const limitations: string[] = []
  if (source_type === 'rss_media') limitations.push('Cobertura mediática · no necesariamente refleja realidad material')
  if (source_type === 'derived_from_news') limitations.push('Derivado de agregación · no es dato primario')
  if (source_type === 'llm_cluster') limitations.push('Resumen IA · validar con fuente primaria antes de citar')
  if (source_type === 'fallback') limitations.push('Fallback · la fuente original falló · puede estar desactualizado')
  if (source_type === 'mock') limitations.push('DATOS SINTÉTICOS · NO USAR EN PRODUCCIÓN')
  if (country_roles.length === 0) limitations.push('Sin países detectados · no se puede atribuir geográficamente')
  if (event_type === 'narrative_only') limitations.push('Sólo cobertura · sin hecho material verificable')

  const confidence = computeGeoConfidence(source_type, input.observed_at, country_roles, evidence)

  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    url: input.url,
    observed_at: input.observed_at,
    source_name: input.source_name,
    source_type,
    geo_layer,
    country_roles,
    country_actor,
    country_affected,
    countries_mentioned,
    region,
    event_type,
    dimension,
    actors: extractActors(fullText),
    institutions: extractInstitutions(fullText),
    severity: sev.score,
    spain_relevance: spain.score,
    confidence,
    evidence,
    limitations,
    derived_from: input.derived_from,
  }
}

// ════════════════════════════════════════════════════════════════════════
// 10 · explainGeoSignal · narrativa humana auditable
// ════════════════════════════════════════════════════════════════════════

export function explainGeoSignal(reading: GeoSignalReading): string {
  const bits: string[] = []
  bits.push(`[${SOURCE_TYPE_LABEL[reading.source_type]} · ${LAYER_LABEL[reading.geo_layer]}]`)
  if (reading.country_actor) bits.push(`actor: ${reading.country_actor}`)
  if (reading.country_affected) bits.push(`afectado: ${reading.country_affected}`)
  bits.push(`tipo: ${reading.event_type}`)
  bits.push(`severidad ${reading.severity}/100`)
  bits.push(`España ${reading.spain_relevance}/100`)
  bits.push(`conf ${Math.round(reading.confidence.overall * 100)}%`)
  return bits.join(' · ')
}

// ════════════════════════════════════════════════════════════════════════
// 11 · Helpers internos
// ════════════════════════════════════════════════════════════════════════

function inferRegion(roles: GeoCountryRole[]): string | undefined {
  for (const r of roles) {
    if (r.role === 'actor' || r.role === 'affected') {
      const e = COUNTRIES.find((c) => c.canonical === r.country)
      if (e?.region) return e.region
    }
  }
  // fallback al primer match
  for (const r of roles) {
    const e = COUNTRIES.find((c) => c.canonical === r.country)
    if (e?.region) return e.region
  }
  return undefined
}

function inferEventType(text: string, layer: GeoLayer): GeoEventType {
  const t = text.toLowerCase()
  // Sprint G1 FASE 10 · prioridad de verbos/keywords ANTES que layer.
  // El orden importa: "Rusia bombardea" debe ser armed_conflict aunque la
  // fuente sea un RSS de medios (layer=signal_fast). El layer es un
  // fallback, no una verdad superior.

  // 1 · acción militar explícita
  if (/\b(combate|combat|ataque|bombardea|bombardean|bombardeo|misil|misiles|invade|invaden|invasión|invasion|ofensiva|bombing)\b/.test(t)) return 'armed_conflict'
  // 2 · crisis humanitaria
  if (/\b(crisis humanitaria|hambruna|desplazad|refugiad|epidemia|brote)\b/.test(t)) return 'humanitarian_crisis'
  // 3 · sanciones explícitas
  if (/\b(sanción|sanciones|sanciona|embargo|congela activos)\b/.test(t)) return 'sanctions_action'
  // 4 · migración
  if (/\b(migrante|migrantes|inmigración|inmigracion|frontera|frontex|patera|cayuco|presión migratoria|presion migratoria)\b/.test(t)) return 'migration_pressure'
  // 5 · cyber
  if (/\b(ciberataque|ransomware|hackers?|hackeo|ciberseguridad)\b/.test(t)) return 'cyber_incident'
  // 6 · acción diplomática (negociar, pactar, condenar, expulsar, reconocer, advertir)
  if (/\b(negocia|negocian|pacta|pactan|firma|condena|condenan|expulsa|expulsan|reconoce|reconocen|rompe relaciones|advierte|advertencia|presiona|presionan)\b/.test(t)) return 'diplomatic_action'
  // 7 · acción institucional UE/OTAN/ONU
  if (/\b(otan|nato|unión europea|comisión europea|onu|consejo de seguridad|eeas)\b/.test(t) && /\b(refuerza|refuerzan|resolución|aprueba|advierte|sanciona|despliega|misión)\b/.test(t)) return 'institutional_action'
  // 8 · energía
  if (/\b(gasoducto|gnl|oleoducto|petróleo|petroleo|red eléctrica|electricidad)\b/.test(t)) return 'energy_event'
  // 9 · protestas
  if (/\b(protesta|manifestación|huelga|disturbios|revuelta)\b/.test(t)) return 'protest_unrest'
  // 10 · consular
  if (/\b(travel advisory|recomendación de viaje|consular|alerta para viajeros)\b/.test(t)) return 'humanitarian_crisis'

  // 11 · fallback por layer
  if (layer === 'hard_event') return 'armed_conflict'
  if (layer === 'humanitarian') return 'humanitarian_crisis'
  if (layer === 'sanctions') return 'sanctions_action'
  if (layer === 'consular') return 'humanitarian_crisis'
  if (layer === 'spain_official') return 'spain_action'
  if (layer === 'military_diplomatic') return 'institutional_action'
  if (layer === 'qualitative_osint') return 'other'
  if (layer === 'signal_fast') return 'narrative_only'
  return 'other'
}

function inferDimension(event_type: GeoEventType, layer: GeoLayer): GeoDimension {
  switch (event_type) {
    case 'armed_conflict': return 'security'
    case 'humanitarian_crisis': return 'humanitarian'
    case 'sanctions_action': return 'economic'
    case 'cyber_incident': return 'cyber'
    case 'migration_pressure': return 'migratory'
    case 'diplomatic_action': return 'political_diplomatic'
    case 'institutional_action': return 'political_diplomatic'
    case 'energy_event': return 'economic'
    case 'spain_action': return 'political_diplomatic'
    case 'narrative_only': return 'narrative'
    case 'protest_unrest': return 'security'
    default: return layer === 'humanitarian' ? 'humanitarian' : 'narrative'
  }
}

const ORG_ACTORS = [
  'Hamas', 'Hezbolá', 'Hezbollah', 'Wagner', 'ISIS', 'Daesh', 'Al Qaeda', 'Boko Haram',
  'M23', 'Houthis', 'Houthi', 'Hutíes', 'PKK', 'PYD',
  'Frontex', 'Europol', 'Interpol',
]
const INSTITUTIONS_GEO = [
  'OTAN', 'NATO', 'ONU', 'Naciones Unidas', 'Consejo de Seguridad',
  'Unión Europea', 'Comisión Europea', 'Parlamento Europeo', 'Consejo Europeo',
  'EEAS', 'OSCE', 'Liga Árabe', 'Unión Africana',
  'BCE', 'FMI', 'OMC', 'OMS', 'OIEA',
  'Tribunal Penal Internacional', 'CPI',
]

function extractActors(text: string): string[] {
  const found = new Set<string>()
  for (const a of ORG_ACTORS) if (text.includes(a)) found.add(a)
  return Array.from(found)
}

function extractInstitutions(text: string): string[] {
  const found = new Set<string>()
  for (const i of INSTITUTIONS_GEO) if (text.includes(i)) found.add(i)
  return Array.from(found)
}

// ════════════════════════════════════════════════════════════════════════
// 12 · buildGeoMeta · ayuda a endpoints a generar el _meta estándar
// ════════════════════════════════════════════════════════════════════════

export function buildGeoMeta(args: {
  source_mode: GeoEndpointMeta['source_mode']
  sources_used: GeoEndpointMeta['sources_used']
  startedAt: number
  confidence: number
  warnings?: string[]
  layer?: GeoLayer
  notes?: string
}): GeoEndpointMeta {
  return {
    source_mode: args.source_mode,
    sources_used: args.sources_used,
    generated_at: new Date().toISOString(),
    latency_ms: Date.now() - args.startedAt,
    confidence: +args.confidence.toFixed(3),
    warnings: args.warnings || [],
    methodology_version: GEO_METHODOLOGY_VERSION,
    layer: args.layer,
    notes: args.notes,
  }
}
