/**
 * lib/tercer-sector/oportunidades/types.ts · Contrato del AGREGADOR DE
 * OPORTUNIDADES · Tercer Sector cockpit · Sprint W1a.
 *
 * `OportunidadTS` es el shape ÚNICO al que el endpoint
 * `/api/tercer-sector/oportunidades` normaliza CUALQUIER fuente de
 * "dinero/contrato disponible para el tercer sector":
 *   - subvenciones BDNS (convocatorias),
 *   - licitaciones multinivel (PLACE/TED/SEDIA/WorldBank/BDNS-contratos),
 *   - grants UE (SEDIA / Funding & Tenders),
 *   - cooperación internacional (organismos internacionales).
 *
 * Principio Politeia (CLAUDE.md): NUNCA inventar importes ni aptitud. Lo que la
 * fuente no da → `null` / `[]`. El scoring (`scoring.ts`) es la fuente única de
 * verdad de `score_ong`/`score_label`/`razones_score`/`riesgo`; este archivo
 * solo define la forma de los datos.
 *
 * Plano (sin dependencias) para usarse en route handlers Next.js y en tests
 * Node (`--experimental-strip-types`).
 */

/** Naturaleza de la oportunidad — determina el "ángulo" y filtros en la UI. */
export type TipoOportunidad =
  | 'subvencion' // subvención/ayuda pública (BDNS convocatorias)
  | 'licitacion' // contrato público (PLACE/TED/BDNS-contratos/UK…)
  | 'grant_ue' // grant europeo (SEDIA / Funding & Tenders, Horizon/CERV…)
  | 'cooperacion_internacional' // organismos internacionales (World Bank, etc.)
  | 'convenio' // convenio de colaboración
  | 'premio' // premio / reconocimiento con dotación
  | 'otro'

/** Documento adjunto (pliego, bases reguladoras, anexo, convocatoria…). */
export interface DocumentoOportunidad {
  /** Nombre legible del documento. */
  nombre: string
  /** URL de descarga / detalle del documento. */
  url: string
  /** Tipo funcional (pliego, bases, anuncio, anexo, otro). */
  tipo: string
  /** Extensión normalizada en minúsculas: pdf, docx, odt, xlsx, html, xml, zip, desconocido. */
  formato: string
}

/**
 * Oportunidad normalizada — shape común del agregador.
 *
 * `id` es estable y prefijado por fuente (ej. `bdns-conv:12345`,
 * `lic:place:19627132`) para dedup determinista cross-source. `importe_eur` es
 * el importe en euros SOLO si la fuente lo da (si no, `null` — no se inventa).
 */
export interface OportunidadTS {
  id: string
  tipo: TipoOportunidad
  titulo: string
  /** Organismo convocante / órgano de contratación / financiador. */
  organismo: string
  /** Identificador de la fuente (ej. "bdns", "place", "ted", "sedia"). */
  fuente: string
  /** URL pública de la fuente (para citar en la UI). */
  fuente_url: string
  /** URL al detalle / ficha de la oportunidad. */
  url: string
  /** Nombre de país legible (ej. "España", "Unión Europea"). */
  pais: string
  /** Región / estado subnacional libre, si la fuente lo da. */
  region: string | null
  /** Clave estable de CCAA (ej. "madrid"), si se reconoce. */
  ccaa: string | null
  /** Fecha de publicación (ISO-8601 / YYYY-MM-DD), null si desconocida. */
  fecha_publicacion: string | null
  /** Fecha/plazo límite de presentación (ISO-8601 / YYYY-MM-DD), null si desconocida. */
  fecha_limite: string | null
  /** Días naturales hasta `fecha_limite` (negativo si vencida), null si sin plazo. */
  dias_restantes: number | null
  /** Importe / valor estimado en EUR. null si la fuente no lo informa. */
  importe_eur: number | null
  /** Moneda original del importe (ISO-4217, ej. "EUR", "USD"). */
  moneda: string
  /** Sector tercer sector inferido (clave de SECTOR_LABEL), null si no inferible. */
  sector_ts: string | null
  /** Código CPV principal (hasta 8 dígitos) si está disponible. */
  cpv: string | null
  /** Sector CAD/OCDE de cooperación (codelist), null si no aplica. */
  dac_sector: string | null
  /** Colectivos destinatarios detectados (ej. "infancia", "migrantes"). */
  beneficiarios_objetivo: string[]
  /** Resumen de requisitos/solvencia si la fuente lo da (no se inventa). */
  requisitos_resumen: string | null
  /** Documentos descargables (pliegos, bases…). */
  documentos: DocumentoOportunidad[]
  /** Puntuación de aptitud ONG (0-100). Fuente única: scoring.ts. */
  score_ong: number
  /** Etiqueta de aptitud. 'incierta' si faltan datos clave (no se inventa). */
  score_label: 'alta' | 'media' | 'baja' | 'incierta'
  /** Razones legibles del score (para transparencia en la UI). */
  razones_score: string[]
  /** Riesgo de encaje/ejecución para una ONG. 'incierto' si faltan datos. */
  riesgo: 'bajo' | 'medio' | 'alto' | 'incierto'
}

/** Filtros del agregador (mapean 1:1 a los query params del endpoint). */
export interface OportunidadesFiltros {
  tipo?: TipoOportunidad
  /** Clave/nombre de CCAA (ej. "madrid"). */
  ccaa?: string
  /** País (ISO-2 o nombre); el endpoint decide. */
  pais?: string
  /** Sector tercer sector (clave de SECTOR_LABEL). */
  sector?: string
  /** Texto libre (busca en título + organismo). */
  q?: string
  /** Solo oportunidades cuyo plazo cae dentro de N días. */
  diasMax?: number
  /** Importe mínimo en EUR (solo aplica a las que declaran importe). */
  importeMin?: number
  /** Importe máximo en EUR (solo aplica a las que declaran importe). */
  importeMax?: number
  /** Score ONG mínimo. */
  scoreMin?: number
  /** Página 1-based. */
  page?: number
  /** Tamaño de página (default 30, clamp 1-100). */
  pageSize?: number
}

/** Cuerpo `data` de la respuesta del endpoint `/api/tercer-sector/oportunidades`. */
export interface OportunidadesResponse {
  oportunidades: OportunidadTS[]
  total: number
  page: number
  page_size: number
  /** Conteo por tipo de oportunidad (sobre el conjunto filtrado). */
  por_tipo: Record<string, number>
  /** Conteo por fuente (sobre el conjunto filtrado). */
  por_fuente: Record<string, number>
  /** Fuentes que respondieron OK. */
  fuentes_ok: string[]
  /** Fuentes que degradaron, con su error legible. */
  fuentes_error: { fuente: string; error: string }[]
}
