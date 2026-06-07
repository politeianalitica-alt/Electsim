/**
 * Tipos del agregador multinivel de licitaciones · Tercer Sector v3 · TS2-lic-src
 *
 * Shape COMÚN al que todos los conectores normalizan. La pieza central de la
 * vista de Licitaciones es un buscador exhaustivo que va de CCAA a organismos
 * internacionales, así que el modelo tiene que ser lo bastante genérico para
 * absorber: ATOM CODICE/UBL (PLACE), JSON de subvenciones (BDNS), OCDS (UK,
 * Tenders.guru, World Bank), search-api de SEDIA, y TED v3.
 *
 * Principio: NUNCA inventar campos. Lo que la fuente no da → null / []. Cada
 * conector devuelve un `SourceResult` (envelope honesto con ok/error) para que
 * el endpoint pueda reportar `fuentes_ok` / `fuentes_error` sin adivinar.
 */

/**
 * Nivel administrativo de la licitación. Determina el "ángulo" en la UI
 * (chips de filtro) y permite priorizar el ángulo tercer sector / cooperación.
 */
export type NivelLicitacion =
  | 'ccaa' // comunidad autónoma / entidad local española
  | 'nacional_es' // administración general del Estado (ES)
  | 'ue' // instituciones de la Unión Europea (TED, SEDIA grants)
  | 'pais_extranjero' // gobierno central de otro país (UK, etc.)
  | 'regional_extranjero' // estado/provincia/región fuera de España
  | 'org_internacional' // organización internacional (World Bank, UNGM, BID…)

/** Tipo de documento adjunto a una licitación (pliego, anexo, etc.). */
export type TipoDocumento =
  | 'pliego' // pliego de cláusulas administrativas / técnicas
  | 'anuncio' // anuncio de licitación / nota
  | 'anexo' // anexos, formularios, modelos
  | 'aclaracion' // aclaraciones, preguntas y respuestas
  | 'adjudicacion' // resolución de adjudicación
  | 'otro'

/** Documento de pliego/anuncio. `formato` es la extensión normalizada (pdf, docx…). */
export interface DocumentoLicitacion {
  nombre: string
  url: string
  /** Extensión normalizada en minúsculas: pdf, docx, odt, xlsx, html, xml, zip, desconocido. */
  formato: string
  tipo: TipoDocumento
}

/**
 * Licitación normalizada — shape común del agregador.
 *
 * `id` es estable y prefijado por fuente (ej. `place:19627132`, `ted:123-2026`)
 * para dedup determinista cross-source. `valor_eur` es el importe ya convertido
 * a euros cuando se conoce la moneda (si no, null y se conserva `moneda`).
 */
export interface LicitacionNormalizada {
  id: string
  titulo: string
  /** Órgano de contratación / comprador. */
  comprador: string
  nivel: NivelLicitacion
  /** Nombre de país legible (ej. "España", "Reino Unido"). */
  pais: string
  /** Región / CCAA / estado subnacional, si la fuente lo da. */
  region: string | null
  /** Valor estimado en EUR (convertido si hace falta). null si desconocido. */
  valor_eur: number | null
  /** Moneda original del importe (ISO-4217, ej. "EUR", "GBP", "USD"). */
  moneda: string
  /** Código CPV principal (8 dígitos) si está disponible. */
  cpv: string | null
  /** Fecha/plazo límite de presentación (ISO-8601) si se conoce. */
  plazo: string | null
  /** Fecha de publicación (ISO-8601). */
  fecha_pub: string | null
  /** URL al detalle / ficha de la licitación. */
  url: string
  /** Identificador de la fuente (ver `FuenteLicitacion`). */
  fuente: FuenteLicitacion
  /** Documentos de pliego/anuncio detectados. */
  documentos: DocumentoLicitacion[]
  /** Idioma principal del anuncio (ISO-639-1, ej. "es", "en"). */
  idioma: string
}

/** Identificador canónico de cada conector / fuente. */
export type FuenteLicitacion =
  | 'place' // PLACE/PLACSP ATOM (ES + CCAA)
  | 'bdns' // BDNS subvenciones (ES)
  | 'ted' // TED — Tenders Electronic Daily (UE)
  | 'sedia' // EU Funding & Tenders (SEDIA grants)
  | 'worldbank' // World Bank procurement notices
  | 'uk-ocds' // UK Find a Tender (OCDS)
  | 'tendersguru' // Tenders.guru (multi-país)
  | 'opentender' // OpenTender.eu

/**
 * Envelope por-fuente. Cada conector devuelve esto: o bien `ok:true` con sus
 * licitaciones normalizadas, o `ok:false` con un error legible (degradación
 * honesta — sin lanzar, sin inventar). `fetched_at` y `source_url` para trazas.
 */
export interface SourceResult {
  fuente: FuenteLicitacion
  ok: boolean
  licitaciones: LicitacionNormalizada[]
  error?: string
  fetched_at: string
  source_url: string
  /** Total reportado por la fuente (puede ser > licitaciones.length por paginación). */
  total_reported?: number
}

/** Filtros del agregador (mapean 1:1 a los query params del endpoint). */
export interface LicitacionesFiltros {
  nivel?: NivelLicitacion
  /** Código de país ISO-2 (ej. "es", "gb") o nombre; el conector decide. */
  pais?: string
  /** Código/categoría CPV (prefijo, ej. "85" salud, "853" servicios sociales). */
  cpv?: string
  /** Texto libre (busca en título + comprador). */
  q?: string
  /** Fecha desde (YYYY-MM-DD) sobre fecha de publicación. */
  desde?: string
  /** Fecha hasta (YYYY-MM-DD) sobre fecha de publicación. */
  hasta?: string
  /** Página 1-based para la respuesta paginada. */
  page?: number
  /** Tamaño de página (default 30, clamp 1-100). */
  pageSize?: number
}

/** Respuesta del endpoint `/api/tercer-sector/licitaciones`. */
export interface LicitacionesResponse {
  licitaciones: LicitacionNormalizada[]
  total: number
  page: number
  page_size: number
  por_nivel: Record<string, number>
  por_fuente: Record<string, number>
  fuentes_ok: FuenteLicitacion[]
  fuentes_error: { fuente: FuenteLicitacion; error: string }[]
  fetched_at: string
}

/** Opciones comunes de fetch para los conectores. */
export interface ConnectorOpts {
  filtros?: LicitacionesFiltros
  /** Timeout por fuente en ms (default corto · 8s). El fan-out es paralelo. */
  timeoutMs?: number
  /** Saltar caché en memoria. */
  noCache?: boolean
}
