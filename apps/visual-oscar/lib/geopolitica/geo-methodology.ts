/**
 * `geo-methodology.ts` · Sprint G13 · Geo Intelligence Methodology & Audit Layer.
 *
 * Objetivo (spec ampliado): convertir el módulo Geopolítica/OSINT en una
 * herramienta auditable con ontología propia de inteligencia. Cada señal sale
 * con:
 *   - qué ha pasado (event_type, dimension)
 *   - dónde (countries con role · actor/affected/origin/destination/theatre/…)
 *   - quién dice qué (source_mode + source_name)
 *   - qué tipo de fuente y qué grado de actualidad (temporal_scope)
 *   - 5 SCORES SEPARADOS: material_risk, media_attention, narrative_pressure,
 *     spain_exposure, urgency · nunca un único "riesgo" sin apellido
 *   - confidence multi-componente con razones y warnings
 *   - audit trail con `what_this_means` / `what_this_does_not_mean`
 *
 * Decisión fundacional: NO sumar señales heterogéneas bajo la palabra "riesgo".
 * Un score material no es lo mismo que cobertura mediática ni que recomendación
 * consular. Esta capa los mantiene separados y explica las limitaciones.
 *
 * Sin LLM. Sin dependencias nuevas. Compatible con tipos legacy via aliases.
 */

// ════════════════════════════════════════════════════════════════════════
// 1 · Tipos públicos
// ════════════════════════════════════════════════════════════════════════

export type GeoSourceMode =
  | 'live_api'              // ACLED, UCDP, ReliefWeb, NewsAPI, GDELT
  | 'rss_official'          // Moncloa, Defensa, Exteriores, NATO, UN SC, EEAS
  | 'rss_media'             // El País, El Mundo, Le Monde, Reuters…
  | 'derived_from_news'     // calculado por agregación sobre RSS (no del backend)
  | 'curated_baseline'      // Catálogo Politeia · Spain Interests, RiskCountries
  | 'analytical_model'      // Risk Index, Convergence, Spain Watchlist · derivado
  | 'llm_cluster'           // theme clusters generados por LLM
  | 'fallback'              // backend caído · respuesta vacía o última conocida
  | 'mock'                  // datos sintéticos de desarrollo · NO producción

// Endpoint-level mode (puede mezclar varios source_mode)
export type GeoEndpointMode = GeoSourceMode | 'hybrid'

// Back-compat · algunos endpoints legacy usaban estos nombres genéricos
export type GeoSourceType = GeoSourceMode

export type GeoLayer =
  | 'fast_signal'           // noticias últimas horas · alta señal pero ruido
  | 'hard_event'            // ACLED, UCDP, GTD · violencia confirmada
  | 'structural_conflict'   // UCDP histórico, ICG · contexto multi-año
  | 'humanitarian'          // ReliefWeb, OCHA · presión humanitaria actual
  | 'consular'              // Travel Advisories MAEC, FCDO · riesgo viajero
  | 'military_diplomatic'   // NATO, Defensa.es, EEAS · institucional
  | 'sanctions'             // OFAC, EU, UN · medidas restrictivas
  | 'qualitative_osint'     // ICG analysis, ISW briefings · análisis cualitativo
  | 'spain_official'        // Moncloa, Exteriores, BOE · postura España
  | 'media_attention'       // GDELT, volúmenes de cobertura · NO realidad material
  | 'analytical_model'      // Risk Index, Convergence, Spain Watchlist · derivado

export type GeoCountryRole =
  | 'actor'                 // realiza la acción (España envía ayuda)
  | 'affected'              // sufre la acción (Ucrania recibe ataque)
  | 'mentioned'             // aparece pero no es actor ni objeto principal
  | 'origin'                // origen de un flujo (Sahel como origen migratorio)
  | 'destination'           // destino de un flujo (Canarias destino migratorio)
  | 'theatre'               // teatro de operaciones / escenario (flanco este OTAN)
  | 'source_country'        // emisor de la fuente oficial (Moncloa → España)
  | 'spain_interest'        // país con exposición declarada de España

// Back-compat · antiguos tests usaban GeoCountryRoleKind como tipo
export type GeoCountryRoleKind = GeoCountryRole

export interface GeoCountryMention {
  country: string                       // nombre canónico ES (España, Ucrania, …)
  iso3?: string                         // ISO 3166-1 alpha-3
  role: GeoCountryRole
  confidence: number                    // 0..1
  evidence: string                      // frase o verbo que justificó la asignación
}

export type GeoTemporalScope =
  | 'realtime'              // ahora · API en vivo o RSS de hoy
  | 'last_24h'
  | 'last_7d'
  | 'last_30d'
  | 'annual'                // anual · UCDP típico
  | 'historical'            // histórico estructural · no señal de hoy
  | 'curated'               // catálogo Politeia · revisión manual
  | 'unknown'

export type GeoEventType =
  | 'armed_conflict'        // combate, ataque, bombardeo
  | 'protest_unrest'        // protestas, huelgas, disturbios
  | 'diplomatic_warning'    // adverte, pacta, condena, expulsa
  | 'sanction'              // sanciones, embargos
  | 'humanitarian_crisis'   // hambruna, desplazamiento, epidemia
  | 'military_deployment'   // refuerzo OTAN, ejercicio militar
  | 'consular_warning'      // travel advisory MAEC/FCDO
  | 'migration_pressure'    // flujos migratorios, fronterizos
  | 'energy_disruption'     // gas, petróleo, gasoducto
  | 'cyber'                 // ciberataques atribuidos
  | 'spain_action'          // España actúa internacionalmente
  | 'media_narrative'       // sólo cobertura mediática · no hecho material
  | 'other'

export type GeoDimension =
  | 'security'              // militar, terrorista, criminal
  | 'military'              // específicamente fuerzas armadas / despliegue
  | 'humanitarian'          // crisis humanitaria
  | 'economic'              // sanciones, comercio
  | 'energy'                // específicamente energético
  | 'diplomatic'            // diplomacia
  | 'institutional'         // UE, OTAN, ONU
  | 'migration'             // movimientos poblacionales
  | 'consular'              // recomendaciones a nacionales
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
  source_name: string
  source_mode: GeoSourceMode
  geo_layer: GeoLayer
  temporal_scope: GeoTemporalScope

  // Geografía multi-rol
  countries: GeoCountryMention[]        // forma canónica del spec G13
  // Atajos derivados (back-compat / conveniencia UI)
  country_actor?: string
  country_affected?: string
  countries_mentioned: string[]
  region?: string

  // Clasificación de evento
  event_type: GeoEventType
  dimension: GeoDimension
  actors: string[]                      // organizaciones / personas no-país
  institutions: string[]                // UE, OTAN, ONU, OSCE, BCE, FMI…

  // ── 5 SCORES SEPARADOS ───────────────────────────────────────────────
  // No mezclar bajo la palabra "riesgo" sin apellido.
  material_risk_score: number           // 0..100 · evento duro (combate, sanción, crisis)
  media_attention_score: number         // 0..100 · volumen de cobertura
  narrative_pressure_score: number      // 0..100 · intensidad mediática/discursiva
  spain_exposure_score: number          // 0..100 · exposición de España (canal/territorio)
  urgency_score: number                 // 0..100 · prioridad de seguimiento combinada

  confidence: GeoConfidence

  // Evidencia y trazabilidad
  evidence: string[]
  limitations: string[]
  derived_from?: string[]               // ids de otras señales (convergence)

  // ── Alias legacy para callers existentes ─────────────────────────────
  /** @deprecated usa source_mode */
  source_type?: GeoSourceMode
  /** @deprecated usa countries */
  country_roles?: GeoCountryMention[]
  /** @deprecated usa material_risk_score */
  severity?: number
  /** @deprecated usa spain_exposure_score */
  spain_relevance?: number
}

export interface GeoConfidence {
  overall: number                       // 0..1 · combinación ponderada
  source_quality: number                // 0..1
  freshness: number                     // 0..1
  triangulation: number                 // 0..1
  specificity: number                   // 0..1
  evidence_strength: number             // 0..1
  reasons: string[]                     // razones legibles
  warnings: string[]                    // advertencias específicas de confianza
}

export interface GeoAuditTrail {
  input_sources: Array<{
    name: string
    endpoint?: string
    source_mode: GeoSourceMode
    layer: GeoLayer
    freshness?: string
  }>
  transformations: string[]
  rules_triggered: string[]
  fallback_used: boolean
  llm_used: boolean
  confidence: GeoConfidence
  warnings: string[]
  what_this_means: string
  what_this_does_not_mean: string
}

export interface GeoEndpointMeta {
  source_mode: GeoEndpointMode
  sources_used: string[]
  methodology_version: string
  generated_at: string
  latency_ms: number
  confidence: number
  warnings: string[]
  layer?: GeoLayer
  notes?: string
}

// ════════════════════════════════════════════════════════════════════════
// 2 · Diccionarios estables
// ════════════════════════════════════════════════════════════════════════

export const GEO_METHODOLOGY_VERSION = 'geo-methodology-v1'

export const SOURCE_MODE_LABEL: Record<GeoSourceMode, string> = {
  live_api: 'LIVE API',
  rss_official: 'RSS oficial',
  rss_media: 'RSS medios',
  derived_from_news: 'Derivado',
  curated_baseline: 'Curado Politeia',
  analytical_model: 'Modelo analítico',
  llm_cluster: 'IA',
  fallback: 'Fallback',
  mock: 'Mock',
}
// Back-compat
export const SOURCE_TYPE_LABEL = SOURCE_MODE_LABEL

export const LAYER_LABEL: Record<GeoLayer, string> = {
  fast_signal: 'Señal rápida',
  hard_event: 'Evento confirmado',
  structural_conflict: 'Conflicto estructural',
  humanitarian: 'Crisis humanitaria',
  consular: 'Riesgo consular',
  military_diplomatic: 'Militar / diplomático',
  sanctions: 'Sanciones',
  qualitative_osint: 'OSINT cualitativo',
  spain_official: 'Postura oficial España',
  media_attention: 'Atención mediática',
  analytical_model: 'Modelo derivado',
}

export const TEMPORAL_SCOPE_LABEL: Record<GeoTemporalScope, string> = {
  realtime: 'Tiempo real',
  last_24h: 'Últimas 24h',
  last_7d: 'Últimos 7 días',
  last_30d: 'Últimos 30 días',
  annual: 'Anual',
  historical: 'Histórico estructural',
  curated: 'Curado · revisión manual',
  unknown: 'Desconocido',
}

// País canónico → aliases reconocibles en texto ES. ISO3 para join con
// catálogos externos (ACLED, ReliefWeb, World Bank).
interface CountryEntry {
  canonical: string
  iso3?: string
  aliases: string[]
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
  { canonical: 'Letonia', iso3: 'LVA', aliases: ['letonia', 'latvia'], region: 'Europe' },
  { canonical: 'Estonia', iso3: 'EST', aliases: ['estonia'], region: 'Europe' },
  { canonical: 'Lituania', iso3: 'LTU', aliases: ['lituania', 'lithuania'], region: 'Europe' },
  { canonical: 'Reino Unido', iso3: 'GBR', aliases: ['reino unido', 'uk', 'gran bretaña', 'británico', 'britanica', 'inglaterra', 'london'], region: 'Europe' },
  { canonical: 'Irlanda', iso3: 'IRL', aliases: ['irlanda', 'ireland'], region: 'Europe' },
  // Norte de África y MENA
  { canonical: 'Marruecos', iso3: 'MAR', aliases: ['marruecos', 'morocco', 'marroquí', 'marroqui', 'rabat'], region: 'MENA' },
  { canonical: 'Argelia', iso3: 'DZA', aliases: ['argelia', 'algeria', 'argelino', 'argelina'], region: 'MENA' },
  { canonical: 'Túnez', iso3: 'TUN', aliases: ['túnez', 'tunez', 'tunisia'], region: 'MENA' },
  { canonical: 'Libia', iso3: 'LBY', aliases: ['libia', 'libya'], region: 'MENA' },
  { canonical: 'Egipto', iso3: 'EGY', aliases: ['egipto', 'egypt', 'egipcio', 'egipcia'], region: 'MENA' },
  { canonical: 'Mauritania', iso3: 'MRT', aliases: ['mauritania', 'nuakchot'], region: 'MENA' },
  { canonical: 'Senegal', iso3: 'SEN', aliases: ['senegal', 'dakar'], region: 'África' },
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
  { canonical: 'Sahel', aliases: ['sahel'], region: 'Sahel' },
]

// Verbos que marcan rol del país que LOS PRECEDE como actor activo
const ACTOR_VERBS = [
  'envía', 'envia', 'envió', 'envio', 'anuncia', 'firma', 'aprueba',
  'condena', 'acusa', 'denuncia', 'rechaza', 'expulsa', 'reconoce',
  'sanciona', 'sanciones contra', 'critica', 'amenaza', 'advierte',
  'ataca', 'bombardea', 'bombardean', 'invade', 'invaden', 'presiona',
  'presionan', 'apoya', 'respalda', 'rompe relaciones',
  'retira embajador', 'expulsó',
  'lanza ofensiva', 'lanza una ofensiva',
  'refuerza', 'refuerzan', 'negocia', 'negocian', 'acuerda', 'acuerdan',
  'pacta', 'pactan', 'firma con', 'media', 'recomienda',
]

// Verbos bilaterales · "X y Y verbo" implica ambos son actores (no objeto)
const BILATERAL_VERBS = new Set([
  'negocia', 'negocian', 'pacta', 'pactan', 'acuerda', 'acuerdan',
  'firma con', 'media',
])

// Frases que indican rol de objeto/afectado
const AFFECTED_MARKERS = [
  ' a ', ' contra ', ' hacia ', ' sobre ', ' en ',
]

// Verbos que sugieren rol "destination" (flujo hacia un destino)
const FLOW_TO_VERBS = ['hacia', 'rumbo a', 'destino', 'aumenta presión']

// Términos de presión migratoria (España)
const MIGRATION_KW = [
  'frontera', 'migrante', 'inmigración', 'inmigracion', 'pateras',
  'cayucos', 'cetí', 'ceti', 'rescate marítimo', 'ceuta', 'melilla',
  'canarias', 'frontex', 'presión migratoria', 'presion migratoria',
]

// Términos de energía
const ENERGY_KW = [
  'gas', 'gasoducto', 'gnl', 'oleoducto', 'petróleo', 'petroleo',
  'energético', 'energetico', 'energética', 'energeticas', 'energéticas',
  'eléctrica', 'electrica', 'red eléctrica', 'medgaz', 'magreb-europa',
]

// Territorios españoles · si aparecen en el texto, eleva spain_exposure
const SPAIN_TERRITORIES = [
  'ceuta', 'melilla', 'canarias', 'baleares', 'mallorca', 'tenerife',
  'gran canaria', 'lanzarote', 'fuerteventura', 'gibraltar',
  'campo de gibraltar',
]

const ORG_ACTORS = [
  'Hamas', 'Hezbolá', 'Hezbollah', 'Wagner', 'ISIS', 'Daesh', 'Al Qaeda',
  'Boko Haram', 'M23', 'Houthis', 'Houthi', 'Hutíes', 'PKK', 'PYD',
  'Frontex', 'Europol', 'Interpol',
]
const INSTITUTIONS_GEO = [
  'OTAN', 'NATO', 'ONU', 'Naciones Unidas', 'Consejo de Seguridad',
  'Unión Europea', 'Comisión Europea', 'Parlamento Europeo', 'Consejo Europeo',
  'EEAS', 'OSCE', 'Liga Árabe', 'Unión Africana',
  'BCE', 'FMI', 'OMC', 'OMS', 'OIEA',
  'Tribunal Penal Internacional', 'CPI', 'MAEC',
]

// ════════════════════════════════════════════════════════════════════════
// 3 · classifyGeoSource · clasifica fuente por nombre/URL
// ════════════════════════════════════════════════════════════════════════

interface SourceClassification {
  source_mode: GeoSourceMode
  geo_layer: GeoLayer
  temporal_scope: GeoTemporalScope
}

/**
 * Mapea source_name/url al triplete (source_mode, geo_layer, temporal_scope).
 *
 * Decisión: cada fuente tiene una temporalidad inherente. UCDP es estructural/
 * histórico — NO indica deterioro de hoy. ReliefWeb es presión humanitaria
 * de las últimas semanas. Travel Advisory es consular. Estas distinciones se
 * propagan al `_meta` de cada endpoint para que el analista no mezcle señales
 * heterogéneas bajo la misma palabra "live".
 */
export function classifyGeoSource(sourceName?: string, url?: string): SourceClassification {
  const s = (sourceName || '').toLowerCase()
  const u = (url || '').toLowerCase()
  const probe = `${s} ${u}`

  if (probe.includes('acled')) return { source_mode: 'live_api', geo_layer: 'hard_event', temporal_scope: 'last_30d' }
  if (probe.includes('ucdp')) return { source_mode: 'live_api', geo_layer: 'structural_conflict', temporal_scope: 'annual' }
  if (probe.includes('reliefweb')) return { source_mode: 'live_api', geo_layer: 'humanitarian', temporal_scope: 'last_30d' }
  if (probe.includes('travel-advisory') || probe.includes('travel.state.gov') || probe.includes('gov.uk/foreign-travel-advice') || probe.includes('exteriores.gob.es/recomenda')) {
    return { source_mode: 'rss_official', geo_layer: 'consular', temporal_scope: 'realtime' }
  }
  if (probe.includes('gdelt')) return { source_mode: 'live_api', geo_layer: 'media_attention', temporal_scope: 'last_24h' }
  if (probe.includes('nato.int') || probe.includes('nato.')) return { source_mode: 'rss_official', geo_layer: 'military_diplomatic', temporal_scope: 'last_7d' }
  if (probe.includes('un.org') || probe.includes('sc/press') || probe.includes('security-council')) return { source_mode: 'rss_official', geo_layer: 'military_diplomatic', temporal_scope: 'last_7d' }
  if (probe.includes('eeas.europa.eu') || probe.includes('eu external action')) return { source_mode: 'rss_official', geo_layer: 'military_diplomatic', temporal_scope: 'last_7d' }
  if (probe.includes('defensa.gob.es')) return { source_mode: 'rss_official', geo_layer: 'spain_official', temporal_scope: 'last_7d' }
  if (probe.includes('exteriores.gob.es')) return { source_mode: 'rss_official', geo_layer: 'spain_official', temporal_scope: 'last_7d' }
  if (probe.includes('lamoncloa.gob.es') || probe.includes('moncloa.gob.es')) return { source_mode: 'rss_official', geo_layer: 'spain_official', temporal_scope: 'last_7d' }
  if (probe.includes('maec')) return { source_mode: 'rss_official', geo_layer: 'spain_official', temporal_scope: 'realtime' }
  if (probe.includes('boe.es')) return { source_mode: 'rss_official', geo_layer: 'spain_official', temporal_scope: 'realtime' }
  if (probe.includes('crisisgroup') || probe.includes('icg ')) return { source_mode: 'rss_official', geo_layer: 'qualitative_osint', temporal_scope: 'last_30d' }
  if (probe.includes('understandingwar') || probe.includes('isw ') || probe.includes('institute for the study of war')) return { source_mode: 'rss_official', geo_layer: 'qualitative_osint', temporal_scope: 'last_7d' }
  if (probe.includes('ofac') || probe.includes('eu sanctions') || probe.includes('un sanctions')) return { source_mode: 'rss_official', geo_layer: 'sanctions', temporal_scope: 'realtime' }

  // Politeia catálogos curados
  if (probe.includes('politeia') || probe.includes('catalog')) return { source_mode: 'curated_baseline', geo_layer: 'analytical_model', temporal_scope: 'curated' }
  // LLM cluster
  if (probe.includes('theme_clusters') || probe.includes('llm_summary')) return { source_mode: 'llm_cluster', geo_layer: 'qualitative_osint', temporal_scope: 'last_24h' }

  // Default · RSS de medios convencionales
  return { source_mode: 'rss_media', geo_layer: 'fast_signal', temporal_scope: 'last_24h' }
}

// ════════════════════════════════════════════════════════════════════════
// 4 · detectCountryRoles · separa actor/affected/origin/destination/theatre/source/mentioned
// ════════════════════════════════════════════════════════════════════════

export function detectCountryRoles(text: string, sourceCountry?: string): GeoCountryMention[] {
  const t = (text || '').toLowerCase()
  if (!t && !sourceCountry) return []

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
  if (hits.length === 0 && !sourceCountry) return []

  const seen = new Map<string, GeoCountryMention>()
  function addOrUpgrade(country: string, role: GeoCountryRole, confidence: number, evidence: string, iso3?: string) {
    const k = `${country}::${role}`
    const prev = seen.get(k)
    if (!prev || prev.confidence < confidence) {
      seen.set(k, { country, role, confidence, evidence, iso3 })
    }
  }

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]
    const after = t.slice(h.pos + h.matchedAlias.length, h.pos + h.matchedAlias.length + 80)
    const before = t.slice(Math.max(0, h.pos - 30), h.pos)

    // Pre-detección: "X y Y verbo" → ambos son actores
    let isCompoundActor = false
    if (i > 0) {
      const prev = hits[i - 1]
      const gap = t.slice(prev.pos + prev.matchedAlias.length, h.pos)
      if (/^\s*(y|and|,)\s*$/.test(gap)) {
        const verbHit = ACTOR_VERBS.find((v) => after.includes(v) && after.indexOf(v) < 40)
        if (verbHit) {
          isCompoundActor = true
          addOrUpgrade(prev.entry.canonical, 'actor', 0.7, `sujeto compuesto "${prev.matchedAlias} y ${h.matchedAlias}" + verbo "${verbHit}"`, prev.entry.iso3)
        }
      }
    }

    // ¿verbo activo en los siguientes 40 chars? → actor
    let isActor = false
    let actorVerb = ''
    for (const v of ACTOR_VERBS) {
      if (after.includes(v) && after.indexOf(v) < 40) { isActor = true; actorVerb = v; break }
    }

    // ¿verbo entre el hit anterior y éste? → affected (salvo bilateral)
    let isAffected = false
    let affectedReason = ''
    if (i > 0 && !isCompoundActor) {
      const prev = hits[i - 1]
      const between = t.slice(prev.pos + prev.matchedAlias.length, h.pos)
      const verbInBetween = ACTOR_VERBS.find((v) => between.includes(v))
      const hasMarker = AFFECTED_MARKERS.some((m) => between.includes(m))
      const isBilateral = verbInBetween && BILATERAL_VERBS.has(verbInBetween)
      if (verbInBetween && !isBilateral) {
        if (hasMarker || between.length < 80) {
          isAffected = true
          affectedReason = (hasMarker ? `verbo "${verbInBetween}" + marker` : `verbo transitivo "${verbInBetween}" gap ${between.length}c`)
        }
      }
    }
    // Pasivas explícitas
    if (!isAffected && /\b(es|son|fue|fueron|ha sido|han sido)\s+(atacad|sancionad|criticad|condenad|denunciad|presionad|amenazad|invadid|bombardead)/.test(after)) {
      isAffected = true
      affectedReason = 'pasiva explícita'
    }

    // Flujo a destino · "hacia X" / "rumbo a X" / "destino X"
    let isDestination = false
    for (const f of FLOW_TO_VERBS) {
      if (before.endsWith(f + ' ') || before.endsWith(f)) { isDestination = true; break }
    }
    // Origen de flujo · "crisis en X aumenta presión"
    let isOrigin = false
    if (/^crisis en /.test(before) || /^conflicto en /.test(before) || (before.includes('aumenta presión') || after.includes('aumenta presión'))) {
      // mejor heurística: si la frase tiene "presión migratoria" o "aumenta presión" + país está EN la zona de inicio
      if (/(presión migratoria|presion migratoria|crisis en|conflicto en|flujos? desde)/.test(t) && t.indexOf(h.matchedAlias) < t.indexOf('hacia')) {
        isOrigin = true
      }
    }
    // Teatro · "flanco este" / "frente" / "teatro de operaciones"
    let isTheatre = false
    if (/flanco este|frente sur|teatro de operaciones/.test(t) && (h.entry.region === 'Europe' || /letonia|estonia|lituania|polonia|ucrania/.test(h.matchedAlias))) {
      isTheatre = true
    }

    if (isActor) addOrUpgrade(h.entry.canonical, 'actor', 0.75, `verbo "${actorVerb}" tras "${h.matchedAlias}"`, h.entry.iso3)
    if (isAffected) addOrUpgrade(h.entry.canonical, 'affected', 0.7, `objeto de acción · ${affectedReason}`, h.entry.iso3)
    if (isDestination) addOrUpgrade(h.entry.canonical, 'destination', 0.65, 'flujo "hacia ..."', h.entry.iso3)
    if (isOrigin) addOrUpgrade(h.entry.canonical, 'origin', 0.6, 'origen de flujo / crisis en zona', h.entry.iso3)
    if (isTheatre) addOrUpgrade(h.entry.canonical, 'theatre', 0.6, 'teatro de operaciones', h.entry.iso3)
    if (!isActor && !isAffected && !isDestination && !isOrigin && !isTheatre && !isCompoundActor) {
      addOrUpgrade(h.entry.canonical, 'mentioned', 0.45, `mención en posición ${h.pos}`, h.entry.iso3)
    }
  }

  // spain_interest si hay términos migratorios/energéticos y España no está como rol fuerte
  const hasSpain = Array.from(seen.values()).some((r) => r.country === 'España')
  const migrationHit = MIGRATION_KW.some((k) => t.includes(k))
  const energyHit = ENERGY_KW.some((k) => t.includes(k))
  if ((migrationHit || energyHit) && !hasSpain) {
    addOrUpgrade('España', 'spain_interest', 0.55, migrationHit ? 'términos migratorios detectados' : 'términos energéticos detectados', 'ESP')
  }

  // source_country
  if (sourceCountry) {
    const entry = COUNTRIES.find((c) => c.canonical === sourceCountry)
    addOrUpgrade(sourceCountry, 'source_country', 0.9, 'fuente oficial', entry?.iso3)
  }

  return Array.from(seen.values())
}

// ════════════════════════════════════════════════════════════════════════
// 5 · classifyGeoEventType
// ════════════════════════════════════════════════════════════════════════

export function classifyGeoEventType(text: string, layer: GeoLayer): GeoEventType {
  const t = text.toLowerCase()

  // Verbos/keywords prioritarios (antes que layer fallback)
  if (/\b(combate|combat|ataque|bombardea|bombardean|bombardeo|misil|misiles|invade|invaden|invasión|invasion|ofensiva|bombing)\b/.test(t)) return 'armed_conflict'
  if (/\b(crisis humanitaria|hambruna|desplazad|refugiad|epidemia|brote)\b/.test(t)) return 'humanitarian_crisis'
  if (/\b(sanción|sanciones|sanciona|embargo|congela activos)\b/.test(t)) return 'sanction'
  if (/\b(migrante|migrantes|inmigración|inmigracion|frontera|frontex|patera|cayuco|presión migratoria|presion migratoria)\b/.test(t)) return 'migration_pressure'
  if (/\b(ciberataque|ransomware|hackers?|hackeo|ciberseguridad)\b/.test(t)) return 'cyber'
  if (/\b(travel advisory|recomienda no viajar|recomendación de viaje|consular|alerta para viajeros)\b/.test(t)) return 'consular_warning'
  if (/\b(refuerza|refuerzan|despliega|brigadas|tropas|flanco este|misión)\b/.test(t)) return 'military_deployment'
  if (/\b(negocia|negocian|pacta|pactan|firma|condena|condenan|expulsa|expulsan|reconoce|reconocen|rompe relaciones|advierte|advertencia|presiona|presionan)\b/.test(t)) return 'diplomatic_warning'
  if (/\b(gasoducto|gnl|oleoducto|petróleo|petroleo|red eléctrica)\b/.test(t)) return 'energy_disruption'
  if (/\b(cobertura televisiva|aumenta cobertura|tono mediático|saliencia mediática)\b/.test(t)) return 'media_narrative'

  // Fallback por layer
  if (layer === 'hard_event') return 'armed_conflict'
  if (layer === 'humanitarian') return 'humanitarian_crisis'
  if (layer === 'sanctions') return 'sanction'
  if (layer === 'consular') return 'consular_warning'
  if (layer === 'spain_official') return 'spain_action'
  if (layer === 'military_diplomatic') return 'military_deployment'
  if (layer === 'media_attention') return 'media_narrative'
  if (layer === 'qualitative_osint') return 'other'
  if (layer === 'fast_signal') return 'media_narrative'
  return 'other'
}

function inferDimension(event_type: GeoEventType, layer: GeoLayer): GeoDimension {
  switch (event_type) {
    case 'armed_conflict': return 'security'
    case 'humanitarian_crisis': return 'humanitarian'
    case 'sanction': return 'economic'
    case 'cyber': return 'cyber'
    case 'migration_pressure': return 'migration'
    case 'diplomatic_warning': return 'diplomatic'
    case 'consular_warning': return 'consular'
    case 'military_deployment': return 'military'
    case 'energy_disruption': return 'energy'
    case 'spain_action': return 'diplomatic'
    case 'media_narrative': return 'narrative'
    case 'protest_unrest': return 'security'
    default: return layer === 'humanitarian' ? 'humanitarian' : layer === 'media_attention' ? 'narrative' : 'institutional'
  }
}

// ════════════════════════════════════════════════════════════════════════
// 6 · assessGeoSeverity → material_risk_score
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
    case 'armed_conflict': base = 55; break
    case 'humanitarian_crisis': base = 45; break
    case 'sanction': base = 25; break
    case 'cyber': base = 30; break
    case 'protest_unrest': base = 25; break
    case 'migration_pressure': base = 30; break
    case 'military_deployment': base = 35; break
    case 'consular_warning': base = 35; break
    case 'diplomatic_warning': base = 15; break
    case 'energy_disruption': base = 30; break
    case 'spain_action': base = 20; break
    case 'media_narrative': base = 10; break
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
// 7 · assessSpainExposure → spain_exposure_score
// ════════════════════════════════════════════════════════════════════════

export function assessSpainExposure(
  countries: GeoCountryMention[],
  text: string,
  event_type: GeoEventType,
  layer?: GeoLayer,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const spainRoles = countries.filter((r) => r.country === 'España')

  for (const r of spainRoles) {
    if (r.role === 'affected') { score += 60; reasons.push('España es objeto/afectado directo (+60)') }
    else if (r.role === 'actor') { score += 45; reasons.push('España es actor activo (+45)') }
    else if (r.role === 'destination') { score += 50; reasons.push('España es destino de flujo (+50)') }
    else if (r.role === 'source_country') { score += 25; reasons.push('Fuente oficial española (+25)') }
    else if (r.role === 'spain_interest') { score += 20; reasons.push('Exposición española detectada (+20)') }
  }
  if (spainRoles.length > 0 && spainRoles.every((r) => r.role === 'mentioned')) {
    score += 15; reasons.push('España mencionada pero rol no claro (+15)')
  }

  // Territorios españoles citados
  const lowerText = (text || '').toLowerCase()
  const territoryHit = SPAIN_TERRITORIES.find((tr) => lowerText.includes(tr))
  if (territoryHit) {
    score += 30
    reasons.push(`Territorio español citado ("${territoryHit}") · España topológicamente involucrada (+30)`)
  }
  // Vecindad
  const neighbors = ['Marruecos', 'Portugal', 'Francia', 'Argelia', 'Sahara Occidental']
  if (countries.some((r) => neighbors.includes(r.country))) {
    score += 12; reasons.push('Vecindario inmediato (+12)')
  }
  // Bloques actor (UE/OTAN)
  const blocs = ['Unión Europea', 'OTAN']
  const blocActor = countries.find((r) => blocs.includes(r.country) && r.role === 'actor')
  const blocAny = countries.find((r) => blocs.includes(r.country))
  if (blocActor) { score += 30; reasons.push(`${blocActor.country} actúa como bloque → España como miembro (+30)`) }
  else if (blocAny) { score += 10; reasons.push('UE/OTAN involucrada (+10)') }
  // Migración
  if (MIGRATION_KW.some((k) => lowerText.includes(k))) { score += 10; reasons.push('Canal migratorio (+10)') }
  // Energía + país europeo afectado
  if (ENERGY_KW.some((k) => lowerText.includes(k))) {
    score += 10; reasons.push('Canal energético (+10)')
    const europeanAffected = countries.find((r) => r.role === 'affected' && ['Ucrania', 'Alemania', 'Italia', 'Francia', 'Polonia'].includes(r.country))
    if (europeanAffected) { score += 8; reasons.push(`Mercado energético europeo afectado vía ${europeanAffected.country} (+8)`) }
  }
  // Conflicto armado en Europa
  if (event_type === 'armed_conflict') {
    const europeanCountry = countries.find((r) => {
      const e = COUNTRIES.find((c) => c.canonical === r.country)
      return e?.region === 'Europe' && r.country !== 'España'
    })
    if (europeanCountry) {
      score += 15
      reasons.push(`Conflicto armado en Europa (${europeanCountry.country}) afecta a España vía UE/defensa colectiva (+15)`)
    }
  }
  // Confluencia spain_interest + territorio
  if (spainRoles.some((r) => r.role === 'spain_interest') && territoryHit) {
    score += 10
    reasons.push('Confluencia spain_interest + territorio español (+10)')
  }
  // Consular
  if (layer === 'consular' || event_type === 'consular_warning') {
    score += 15
    reasons.push('Capa consular · señal para nacionales españoles (+15)')
  }

  if (spainRoles.length === 0 && event_type === 'media_narrative') {
    score = Math.max(0, score - 10); reasons.push('Sólo cobertura mediática y España no es actor/afectado (-10)')
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}

// Back-compat alias
export const assessSpainRelevance = assessSpainExposure

// ════════════════════════════════════════════════════════════════════════
// 8 · computeGeoConfidence
// ════════════════════════════════════════════════════════════════════════

const SOURCE_QUALITY_TABLE: Record<GeoSourceMode, number> = {
  live_api: 0.90,
  rss_official: 0.85,
  rss_media: 0.65,
  derived_from_news: 0.55,
  curated_baseline: 0.70,
  analytical_model: 0.60,
  llm_cluster: 0.45,
  fallback: 0.25,
  mock: 0.10,
}

export function computeGeoConfidence(
  source_mode: GeoSourceMode,
  observed_at: string,
  countries: GeoCountryMention[],
  evidence: string[],
  triangulation_count = 1,
): GeoConfidence {
  const reasons: string[] = []
  const warnings: string[] = []
  const source_quality = SOURCE_QUALITY_TABLE[source_mode] ?? 0.4
  reasons.push(`source_quality=${source_quality.toFixed(2)} (${SOURCE_MODE_LABEL[source_mode]})`)
  if (source_mode === 'mock') warnings.push('DATOS SINTÉTICOS · NO usar en producción')
  if (source_mode === 'fallback') warnings.push('Fuente cayó · puede estar desactualizado')
  if (source_mode === 'llm_cluster') warnings.push('Generado por IA · validar con fuente primaria')

  let freshness = 0.5
  const t = Date.parse(observed_at)
  if (!Number.isNaN(t)) {
    const days = Math.max(0, (Date.now() - t) / 86400000)
    freshness = Math.max(0.1, 1 - days / 30)
    reasons.push(`freshness=${freshness.toFixed(2)} (${days.toFixed(1)}d antigüedad)`)
    if (days > 30) warnings.push(`Señal con ${days.toFixed(0)}d · puede no reflejar situación actual`)
  } else {
    reasons.push('freshness=0.5 (observed_at no parseable)')
  }

  const triangulation = triangulation_count >= 3 ? 0.9 : triangulation_count === 2 ? 0.7 : 0.4
  reasons.push(`triangulation=${triangulation.toFixed(2)} (${triangulation_count} fuente(s))`)
  if (triangulation_count === 1) warnings.push('Sin triangulación · validar con segunda fuente')

  const strongRoles = countries.filter((r) => r.role !== 'mentioned')
  const specificity = Math.min(1, strongRoles.length / 3)
  reasons.push(`specificity=${specificity.toFixed(2)} (${strongRoles.length} roles fuertes)`)

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

  if (overall < 0.5) warnings.push('Confianza global <0.5 · interpretar con cautela')

  return { overall, source_quality, freshness, triangulation, specificity, evidence_strength, reasons, warnings }
}

// ════════════════════════════════════════════════════════════════════════
// 9 · buildGeoAuditTrail · con what_this_means / what_this_does_not_mean
// ════════════════════════════════════════════════════════════════════════

const WHAT_IT_MEANS_BY_LAYER: Record<GeoLayer, string> = {
  fast_signal: 'Señal de cobertura informativa reciente · indica que el tema está en la agenda.',
  hard_event: 'Evento de violencia material registrado por base de datos (ACLED/UCDP).',
  structural_conflict: 'Conflicto armado registrado estructuralmente · contexto multi-año.',
  humanitarian: 'Reportes humanitarios actuales · presión sobre población civil.',
  consular: 'Recomendación consular para viajeros nacionales.',
  military_diplomatic: 'Comunicación institucional militar/diplomática.',
  sanctions: 'Medida restrictiva oficial.',
  qualitative_osint: 'Análisis cualitativo de fuente experta (think tank, instituto).',
  spain_official: 'Postura oficial de la administración española.',
  media_attention: 'Volumen de cobertura mediática.',
  analytical_model: 'Score derivado por modelo Politeia sobre fuentes externas.',
}

const WHAT_IT_DOES_NOT_MEAN_BY_LAYER: Record<GeoLayer, string> = {
  fast_signal: 'NO implica gravedad material · sólo que la prensa lo ha cubierto.',
  hard_event: 'NO mide percepción pública ni recomendación política.',
  structural_conflict: 'NO indica deterioro de HOY · el dato es histórico/anual.',
  humanitarian: 'NO mide intensidad militar ni atribución de responsables.',
  consular: 'NO mide violencia material · depende de política consular del emisor.',
  military_diplomatic: 'NO mide voluntad de uso de la fuerza · sólo declaración.',
  sanctions: 'NO garantiza cumplimiento ni impacto económico real.',
  qualitative_osint: 'NO es dato cuantitativo · es opinión experta.',
  spain_official: 'NO necesariamente refleja consenso parlamentario ni opinión pública.',
  media_attention: 'NO mide realidad material · sólo intensidad de cobertura.',
  analytical_model: 'NO es observación primaria · puede heredar errores de fuentes.',
}

export function buildGeoAuditTrail(args: {
  inputs: Array<{ name: string; endpoint?: string; source_mode: GeoSourceMode; layer: GeoLayer; freshness?: string }>
  transformations: string[]
  rules_triggered?: string[]
  fallback_used?: boolean
  llm_used?: boolean
  confidence: GeoConfidence
  warnings?: string[]
  primary_layer?: GeoLayer
}): GeoAuditTrail {
  const primary = args.primary_layer || args.inputs[0]?.layer || 'fast_signal'
  return {
    input_sources: args.inputs,
    transformations: args.transformations,
    rules_triggered: args.rules_triggered || [],
    fallback_used: !!args.fallback_used,
    llm_used: !!args.llm_used,
    confidence: args.confidence,
    warnings: args.warnings || [],
    what_this_means: WHAT_IT_MEANS_BY_LAYER[primary],
    what_this_does_not_mean: WHAT_IT_DOES_NOT_MEAN_BY_LAYER[primary],
  }
}

// ════════════════════════════════════════════════════════════════════════
// 10 · readGeoSignal · pipeline universal
// ════════════════════════════════════════════════════════════════════════

export interface ReadGeoSignalInput {
  id: string
  title: string
  summary?: string
  url?: string
  observed_at: string
  source_name: string
  source_country?: string
  raw_event_type?: GeoEventType
  derived_from?: string[]
  // opcional · volumen para media_attention_score
  coverage_volume?: number          // 0..N artículos relacionados
  // opcional · tono para narrative_pressure_score
  tone_intensity?: number           // 0..1 (intensidad emocional)
}

export function readGeoSignal(input: ReadGeoSignalInput): GeoSignalReading {
  const { source_mode, geo_layer, temporal_scope } = classifyGeoSource(input.source_name, input.url)
  const fullText = `${input.title} ${input.summary || ''}`
  const countries = detectCountryRoles(fullText, input.source_country)
  const countries_mentioned = Array.from(new Set(countries.map((r) => r.country)))
  const country_actor = countries.find((r) => r.role === 'actor')?.country
  const country_affected = countries.find((r) => r.role === 'affected')?.country
  const region = inferRegion(countries)

  const event_type = input.raw_event_type || classifyGeoEventType(fullText, geo_layer)
  const dimension = inferDimension(event_type, geo_layer)
  const material = assessGeoSeverity(fullText, event_type)
  const exposure = assessSpainExposure(countries, fullText, event_type, geo_layer)

  // media_attention_score · si tenemos coverage_volume, escalamos log; si no,
  // mapeamos por source_mode (media → algo, oficial → poco, mock → 0)
  const media_attention_score = (() => {
    if (typeof input.coverage_volume === 'number' && input.coverage_volume > 0) {
      return Math.min(100, Math.round(20 * Math.log10(1 + input.coverage_volume)))
    }
    // GDELT u otras live_api en capa media_attention → indicador fuerte de saliencia
    if (geo_layer === 'media_attention') return source_mode === 'live_api' ? 50 : 35
    if (source_mode === 'rss_media') return 35
    return 5
  })()

  // narrative_pressure_score · tono explícito > heurística por keywords
  const narrative_pressure_score = (() => {
    if (typeof input.tone_intensity === 'number') return Math.round(input.tone_intensity * 100)
    // heurística por keywords cargadas
    const charged = /\b(amenaza|crisis|colapso|escalada|derrumbe|alarma|tensión|tension|polariz)\b/i.test(fullText)
    if (charged) return source_mode === 'rss_media' ? 55 : 35
    return 15
  })()

  const evidence: string[] = []
  for (const r of countries.slice(0, 5)) evidence.push(`${r.country} (${r.role}): ${r.evidence}`)
  if (input.title) evidence.push(`titular: ${input.title.slice(0, 200)}`)

  const limitations: string[] = []
  if (source_mode === 'rss_media') limitations.push('Cobertura mediática · no necesariamente refleja realidad material')
  if (source_mode === 'derived_from_news') limitations.push('Derivado de agregación · no es dato primario')
  if (source_mode === 'llm_cluster') limitations.push('Resumen IA · validar con fuente primaria antes de citar')
  if (source_mode === 'fallback') limitations.push('Fallback · la fuente original falló · puede estar desactualizado')
  if (source_mode === 'mock') limitations.push('DATOS SINTÉTICOS · NO USAR EN PRODUCCIÓN')
  if (source_mode === 'analytical_model') limitations.push('Score derivado · no es observación primaria')
  if (geo_layer === 'media_attention') limitations.push('Mide cobertura, no realidad material · validar con ACLED/UCDP si es conflicto')
  if (geo_layer === 'structural_conflict') limitations.push('Estructural/histórico · NO indica deterioro de hoy')
  if (countries.length === 0) limitations.push('Sin países detectados · no se puede atribuir geográficamente')
  if (event_type === 'media_narrative') limitations.push('Sólo cobertura · sin hecho material verificable')

  const confidence = computeGeoConfidence(source_mode, input.observed_at, countries, evidence)

  // urgency_score · combina material_risk + spain_exposure + confianza
  const urgency_score = Math.max(0, Math.min(100, Math.round(
    material.score * 0.35 + exposure.score * 0.45 + confidence.overall * 100 * 0.20
  )))

  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    url: input.url,
    observed_at: input.observed_at,
    source_name: input.source_name,
    source_mode,
    geo_layer,
    temporal_scope,
    countries,
    country_actor,
    country_affected,
    countries_mentioned,
    region,
    event_type,
    dimension,
    actors: extractActors(fullText),
    institutions: extractInstitutions(fullText),
    material_risk_score: material.score,
    media_attention_score,
    narrative_pressure_score,
    spain_exposure_score: exposure.score,
    urgency_score,
    confidence,
    evidence,
    limitations,
    derived_from: input.derived_from,
    // Alias legacy
    source_type: source_mode,
    country_roles: countries,
    severity: material.score,
    spain_relevance: exposure.score,
  }
}

// ════════════════════════════════════════════════════════════════════════
// 11 · explainGeoSignal
// ════════════════════════════════════════════════════════════════════════

export function explainGeoSignal(reading: GeoSignalReading): string {
  const bits: string[] = []
  bits.push(`[${SOURCE_MODE_LABEL[reading.source_mode]} · ${LAYER_LABEL[reading.geo_layer]} · ${TEMPORAL_SCOPE_LABEL[reading.temporal_scope]}]`)
  if (reading.country_actor) bits.push(`actor: ${reading.country_actor}`)
  if (reading.country_affected) bits.push(`afectado: ${reading.country_affected}`)
  bits.push(`tipo: ${reading.event_type}`)
  bits.push(`material ${reading.material_risk_score}/100`)
  bits.push(`atención ${reading.media_attention_score}/100`)
  bits.push(`narrativa ${reading.narrative_pressure_score}/100`)
  bits.push(`exposición ES ${reading.spain_exposure_score}/100`)
  bits.push(`urgencia ${reading.urgency_score}/100`)
  bits.push(`conf ${Math.round(reading.confidence.overall * 100)}%`)
  return bits.join(' · ')
}

// ════════════════════════════════════════════════════════════════════════
// 12 · Helpers internos
// ════════════════════════════════════════════════════════════════════════

function inferRegion(countries: GeoCountryMention[]): string | undefined {
  for (const r of countries) {
    if (r.role === 'actor' || r.role === 'affected' || r.role === 'destination' || r.role === 'origin' || r.role === 'theatre') {
      const e = COUNTRIES.find((c) => c.canonical === r.country)
      if (e?.region) return e.region
    }
  }
  for (const r of countries) {
    const e = COUNTRIES.find((c) => c.canonical === r.country)
    if (e?.region) return e.region
  }
  return undefined
}

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
// 13 · buildGeoMeta
// ════════════════════════════════════════════════════════════════════════

export function buildGeoMeta(args: {
  source_mode: GeoEndpointMode
  sources_used: string[]
  startedAt: number
  confidence: number
  warnings?: string[]
  layer?: GeoLayer
  notes?: string
}): GeoEndpointMeta {
  return {
    source_mode: args.source_mode,
    sources_used: args.sources_used,
    methodology_version: GEO_METHODOLOGY_VERSION,
    generated_at: new Date().toISOString(),
    latency_ms: Date.now() - args.startedAt,
    confidence: +args.confidence.toFixed(3),
    warnings: args.warnings || [],
    layer: args.layer,
    notes: args.notes,
  }
}
