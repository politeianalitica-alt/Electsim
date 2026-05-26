/**
 * State-Media Catalog · Sprint G14 FASE 4 (versión ligera)
 *
 * Registro de medios estatales / régimen autoritario relevantes para la
 * lectura de narrativa internacional vista desde España. Cada entrada lleva:
 *  - feed_url: RSS directo (oficial) o vía RSSHub público (rsshub.app)
 *  - country, language, regime: para tag + filtros
 *  - relevance_to_spain: justificación de por qué importa
 *  - reliability_note: cómo interpretar el contenido (no factual ground truth)
 *
 * Procedencia: análisis sprint G14 sobre 342 repos `gits amigos`, joya MBFC +
 * RSSHub (`Awesome-OSINT-For-Everything-main`, `RSSHub-master`).
 *
 * IMPORTANTE: usar instancia PÚBLICA `rsshub.app` significa que el endpoint
 * puede tener rate-limits o caídas. Para producción robusta migrar a Docker
 * self-host de RSSHub. Por ahora vale: si rsshub.app falla, el feed devuelve
 * array vacío y el endpoint no rompe (silencio informativo).
 *
 * No incluimos aquí medios "free press" internacionales (Reuters, BBC, AP) ni
 * españoles · esos los cubren los catálogos existentes en /prensa.
 */

import type { PressFreedomBand } from './media-bias-registry'

export type RegimeType = 'authoritarian' | 'hybrid' | 'state_funded_democracy' | 'public_service'

export interface StateMediaFeed {
  /** ID slug · estable. */
  id: string
  /** Nombre humano · UI display. */
  name: string
  /** ISO3 del país emisor (o supranacional como 'EUR'). */
  country_iso3: string
  /** Nombre país en español, lowercase. */
  country_name: string
  /** Idioma principal del feed (ISO 639-1). */
  language: string
  /** Banda libertad de prensa MBFC alineada · ver media-bias-registry. */
  press_freedom: PressFreedomBand
  /** Régimen agregado · para tag UI rápido. */
  regime: RegimeType
  /** URL del RSS (oficial o vía RSSHub público). */
  feed_url: string
  /** True si es vía instancia pública de RSSHub (rsshub.app). False si es oficial directo. */
  via_rsshub: boolean
  /** Por qué importa para la lectura geopolítica España-mundo. */
  relevance_to_spain: string
  /** Cómo debe interpretarse · siempre con caveat. */
  reliability_note: string
  /** Tags temáticos típicos del feed para filtrado/agrupación. */
  topics: string[]
}

/**
 * Catálogo curado · ordenado por relevancia decreciente para análisis ES.
 * Mantener pequeño y trazable. Cada nuevo feed requiere justificación analítica.
 */
export const STATE_MEDIA_FEEDS: StateMediaFeed[] = [
  // ──────────────── RUSIA ────────────────
  {
    id: 'sputnik-mundo',
    name: 'Sputnik Mundo · español',
    country_iso3: 'RUS',
    country_name: 'rusia',
    language: 'es',
    press_freedom: 'not_free',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/sputniknews/spanish',
    via_rsshub: true,
    relevance_to_spain:
      'Único vector ruso de narrativa dirigida explícitamente a hispanohablantes. Crítico para detectar líneas de comunicación FIMI sobre Ucrania, OTAN, Catalunya, migración.',
    reliability_note:
      'Estado ruso. NO usar como fuente factual. Útil sólo para análisis de framing y propaganda de Estado.',
    topics: ['ucrania', 'otan', 'eu-criticism', 'latam', 'multipolarity'],
  },
  {
    id: 'rt-en',
    name: 'RT (Russia Today) · inglés',
    country_iso3: 'RUS',
    country_name: 'rusia',
    language: 'en',
    press_freedom: 'not_free',
    regime: 'authoritarian',
    feed_url: 'https://www.rt.com/rss/news/',
    via_rsshub: false,
    relevance_to_spain:
      'Vector ruso global. Influye en discurso anti-OTAN y anti-UE. Sancionado en UE pero RSS sigue accesible desde fuera.',
    reliability_note:
      'Estado ruso. Sancionado UE (Reg. 2022/350). NO usar como fuente factual.',
    topics: ['russia', 'ukraine', 'us-criticism', 'multipolarity'],
  },
  {
    id: 'tass-en',
    name: 'TASS · inglés',
    country_iso3: 'RUS',
    country_name: 'rusia',
    language: 'en',
    press_freedom: 'not_free',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/tass/news',
    via_rsshub: true,
    relevance_to_spain:
      'Agencia oficial rusa. Línea editorial Kremlin. Lectura primaria para entender posición rusa oficial vs RT (más editorializada).',
    reliability_note:
      'Agencia estatal rusa. Útil para tracking de comunicados oficiales. NO factual.',
    topics: ['russia-official', 'kremlin', 'foreign-ministry'],
  },

  // ──────────────── CHINA ────────────────
  {
    id: 'xinhua-en',
    name: 'Xinhua · inglés',
    country_iso3: 'CHN',
    country_name: 'china',
    language: 'en',
    press_freedom: 'oppression',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/xinhuanet/whxw',
    via_rsshub: true,
    relevance_to_spain:
      'Agencia oficial china. Detectar cobertura de España, UE, BRI, Marruecos, Latinoamérica permite leer prioridades estratégicas chinas hacia el bloque hispano.',
    reliability_note:
      'Estado chino · opresión total prensa. Útil para tracking comunicados oficiales y posición sobre temas geopolíticos.',
    topics: ['china-official', 'bri', 'foreign-ministry'],
  },
  {
    id: 'cgtn-en',
    name: 'CGTN · inglés',
    country_iso3: 'CHN',
    country_name: 'china',
    language: 'en',
    press_freedom: 'oppression',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/cgtn/podcast',
    via_rsshub: true,
    relevance_to_spain:
      'Cadena estatal china en inglés. Más editorializada que Xinhua. Útil para framing comparativo cross-país.',
    reliability_note:
      'Estado chino. NO factual. Usar sólo para análisis narrativa.',
    topics: ['china-public-diplomacy', 'taiwan', 'us-china'],
  },
  {
    id: 'chinadaily-en',
    name: 'China Daily · inglés',
    country_iso3: 'CHN',
    country_name: 'china',
    language: 'en',
    press_freedom: 'oppression',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/chinadaily/world',
    via_rsshub: true,
    relevance_to_spain:
      'Editorial estatal china orientada a audiencias occidentales. Más sofisticado que CGTN, suele anticipar shifts diplomáticos.',
    reliability_note: 'Estado chino. Líneas editoriales aprobadas. NO factual.',
    topics: ['china-soft-power', 'culture', 'economy'],
  },

  // ──────────────── IRÁN ────────────────
  {
    id: 'presstv-en',
    name: 'Press TV · inglés',
    country_iso3: 'IRN',
    country_name: 'irán',
    language: 'en',
    press_freedom: 'not_free',
    regime: 'authoritarian',
    feed_url: 'https://www.presstv.ir/rss.xml',
    via_rsshub: false,
    relevance_to_spain:
      'Voz oficial iraní en inglés. Detecta línea sobre Israel-Hamás, Yemen, Líbano, MENA. Relevante para Mediterráneo y oriente próximo.',
    reliability_note:
      'Estado iraní. Sancionado UE. NO factual. Útil para entender posición Teherán.',
    topics: ['middle-east', 'israel-palestine', 'us-iran', 'shiite-axis'],
  },

  // ──────────────── QATAR ────────────────
  {
    id: 'aljazeera-en',
    name: 'Al Jazeera · inglés',
    country_iso3: 'QAT',
    country_name: 'qatar',
    language: 'en',
    press_freedom: 'not_free',
    regime: 'hybrid',
    feed_url: 'https://www.aljazeera.com/xml/rss/all.xml',
    via_rsshub: false,
    relevance_to_spain:
      'Voz qatarí · cobertura MENA más profunda que medios occidentales. Línea editorial sympathetic to Hamas/Hermanos Musulmanes pero con periodismo de calidad técnica.',
    reliability_note:
      'Financiado por la familia real Qatar. Sesgo evidente en Israel-Palestina y Egipto. Calidad técnica alta en África y MENA. Usar con cuidado, no es ground truth.',
    topics: ['middle-east', 'africa', 'palestine', 'mena'],
  },

  // ──────────────── TURQUÍA ────────────────
  {
    id: 'trtworld-en',
    name: 'TRT World · inglés',
    country_iso3: 'TUR',
    country_name: 'türkiye',
    language: 'en',
    press_freedom: 'not_free',
    regime: 'hybrid',
    feed_url: 'https://www.trtworld.com/rss',
    via_rsshub: false,
    relevance_to_spain:
      'Voz turca · cobertura Mediterráneo Oriental, Siria, Libia, Sahel. Posición sobre OTAN ambigua. Relevante para Marruecos-Argelia-Sáhara dinámica.',
    reliability_note:
      'Estado turco bajo control AKP. NO factual sobre temas internos turcos. Útil para framing pro-Erdogan en MENA.',
    topics: ['mena', 'syria', 'libya', 'mediterranean', 'kurds'],
  },

  // ──────────────── CUBA / VENEZUELA ────────────────
  {
    id: 'granma-es',
    name: 'Granma · español (Cuba)',
    country_iso3: 'CUB',
    country_name: 'cuba',
    language: 'es',
    press_freedom: 'oppression',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/granma/es',
    via_rsshub: true,
    relevance_to_spain:
      'Órgano oficial PCC. Voz autoritaria en español sobre Latinoamérica · útil para tracking de líneas alternativas a la prensa libre regional.',
    reliability_note:
      'Estado cubano. NO factual. Útil sólo para análisis narrativa LATAM.',
    topics: ['cuba', 'latam', 'us-criticism'],
  },
  {
    id: 'telesur-es',
    name: 'teleSUR · español',
    country_iso3: 'VEN',
    country_name: 'venezuela',
    language: 'es',
    press_freedom: 'not_free',
    regime: 'authoritarian',
    feed_url: 'https://rsshub.app/telesur/es',
    via_rsshub: true,
    relevance_to_spain:
      'Cadena venezolana con presencia regional. Útil para detectar línea Maduro hacia Latinoamérica e influencia en discurso anti-EE.UU. en español.',
    reliability_note:
      'Estado venezolano. NO factual. Útil para framing regional bolivariano.',
    topics: ['venezuela', 'latam', 'bolivarian'],
  },
]

/** Helper · feeds por país. */
export function feedsByCountry(iso3: string): StateMediaFeed[] {
  return STATE_MEDIA_FEEDS.filter((f) => f.country_iso3 === iso3.toUpperCase())
}

/** Helper · feeds por régimen. */
export function feedsByRegime(regime: RegimeType): StateMediaFeed[] {
  return STATE_MEDIA_FEEDS.filter((f) => f.regime === regime)
}

/** Helper · feeds en un idioma (útil para "todo lo que cubre España en castellano"). */
export function feedsByLanguage(lang: string): StateMediaFeed[] {
  return STATE_MEDIA_FEEDS.filter((f) => f.language === lang)
}

export const STATE_MEDIA_CATALOG_VERSION = 'state-media-v1'
