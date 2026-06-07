/**
 * lib/tercer-sector/global-opportunities/types.ts · Contratos del GLOBAL
 * OPPORTUNITY GRAPH · Tercer Sector cockpit · Sprint Ga.
 *
 * Este módulo define DOS shapes:
 *
 *   1. `GlobalOpportunity` — una oportunidad concreta (tender / grant / call /
 *      EOI / RFP …) normalizada a un shape ÚNICO y exhaustivo, sea cual sea su
 *      origen (ONU, banco multilateral, UE, nacional, regional, local). Es un
 *      supraconjunto de `OportunidadTS` (oportunidades/types.ts): el agregador
 *      "España-céntrico" sigue usando `OportunidadTS`; este shape es el contrato
 *      del catálogo global y de un futuro normalizador multifuente.
 *
 *   2. `OpportunitySource` — la METADATA de cada fuente del catálogo: cómo se
 *      accede, qué tipos de oportunidad publica, para qué sirve a una ONG, qué
 *      campos expone, y su estado de integración (`live` = ya conectada en
 *      nuestro agregador, `catalog` = catalogada sin conector, `planned` = en
 *      cola de un sprint). El catálogo concreto vive en `sources.ts`.
 *
 * Principio Politeia (CLAUDE.md): este es un CATÁLOGO DE CONECTORES con metadata,
 * NO un scraper. Nada aquí hace red. URLs/api_url son REALES (no inventadas).
 * Lo que una fuente no da → `null` / `[]` (nunca se inventa importe ni aptitud).
 *
 * Plano (sin dependencias) para usarse en route handlers Next.js y en tests
 * Node (`--experimental-strip-types`). Cero emojis.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. La oportunidad concreta
// ─────────────────────────────────────────────────────────────────────────

/**
 * Naturaleza de una oportunidad en el ecosistema global de financiación y
 * contratación pública/multilateral. Vocabulario deliberadamente amplio para
 * cubrir la terminología de ONU, bancos de desarrollo, UE y portales nacionales.
 *   - `tender`                    licitación / contrato público (genérico)
 *   - `grant`                     subvención / ayuda (no reembolsable)
 *   - `call_for_proposal`         convocatoria de propuestas (UE / agencias ONU)
 *   - `expression_of_interest`    EOI — manifestación de interés (preselección)
 *   - `request_for_proposal`      RFP — solicitud de propuesta (servicios)
 *   - `request_for_quotation`     RFQ — solicitud de cotización (compra menor)
 *   - `invitation_to_bid`         ITB — invitación a licitar (bienes)
 *   - `consultancy`               servicio de consultoría / asistencia técnica
 *   - `implementing_partner_call` llamada a socios implementadores (ACNUR/UNICEF…)
 *   - `framework_agreement`       acuerdo marco
 *   - `award_notice`             notificación de adjudicación (inteligencia, no apta)
 *   - `procurement_plan`          plan de adquisiciones anticipado (pipeline)
 *   - `project_pipeline`          proyecto en cartera (banco multilateral)
 */
export type OpportunityKind =
  | 'tender'
  | 'grant'
  | 'call_for_proposal'
  | 'expression_of_interest'
  | 'request_for_proposal'
  | 'request_for_quotation'
  | 'invitation_to_bid'
  | 'consultancy'
  | 'implementing_partner_call'
  | 'framework_agreement'
  | 'award_notice'
  | 'procurement_plan'
  | 'project_pipeline'

/** Naturaleza de la entidad que compra/financia. */
export type BuyerType =
  | 'international_org' // agencia ONU, Cruz Roja internacional, etc.
  | 'mdb' // banco multilateral de desarrollo
  | 'eu_institution' // Comisión / agencias UE
  | 'national_government'
  | 'regional_government'
  | 'local_government'
  | 'public_body' // organismo público / agencia estatal
  | 'foundation'
  | 'ngo' // ONG que subcontrata a socios
  | 'other'

/** Estado del ciclo de vida de la oportunidad. */
export type OpportunityStatus =
  | 'forecast' // anunciada / planificada (aún no abierta)
  | 'open' // abierta a presentación
  | 'closing_soon' // abierta, plazo inminente
  | 'closed' // plazo cerrado
  | 'awarded' // adjudicada
  | 'cancelled'
  | 'unknown'

/** Método de acceso técnico a una fuente (cómo se obtienen los datos). */
export type AccessMethod =
  | 'api' // API JSON/REST documentada
  | 'rss'
  | 'atom'
  | 'ocds' // Open Contracting Data Standard (API/bulk OCDS)
  | 'bulk_download' // dumps periódicos (CSV/JSON/XML)
  | 'html_scrape' // sin API: requiere scraping del HTML
  | 'sdmx' // SDMX (estadística: Eurostat, OCDE…)
  | 'ckan' // portal CKAN (datos.gob.es, HDX…)
  | 'socrata' // portal Socrata (USAspending, algunos US)

/** Requisito de autenticación de la fuente. */
export type SourceAuth = 'none' | 'api_key' | 'registration' | 'login'

/** Modelo de coste de acceso. */
export type SourceCost = 'free' | 'freemium' | 'commercial'

/** Nivel administrativo / institucional de la fuente. */
export type SourceLevel =
  | 'international_org'
  | 'mdb'
  | 'eu'
  | 'national'
  | 'regional'
  | 'local'

/** Utilidad estimada para una organización del tercer sector. */
export type NgoUsefulness = 'alta' | 'media' | 'baja'

/** Prioridad de implementación del conector (planning interno). */
export type ImplementationPriority = 'P0' | 'P1' | 'P2' | 'P3'

/**
 * Estado de integración en NUESTRO agregador:
 *   - `live`    — ya hay un conector real consumiendo esta fuente.
 *   - `catalog` — catalogada con metadata, sin conector (este sprint).
 *   - `planned` — en cola de un sprint concreto (p.ej. Gb).
 */
export type IntegrationStatus = 'live' | 'catalog' | 'planned'

/** Documento adjunto a una oportunidad (pliego, bases, anexo…). */
export interface GlobalOpportunityDocument {
  /** Nombre legible del documento. */
  name: string
  /** URL de descarga / detalle. */
  url: string
  /** Tipo funcional (pliego, bases, anexo, notice, otro). */
  doc_type: string
  /** Extensión normalizada en minúsculas: pdf, docx, xlsx, html, xml, zip, unknown. */
  format: string
  /** Idioma del documento (ISO-639-1) si se conoce. */
  language: string | null
}

/** Requisitos de elegibilidad (quién puede presentarse). */
export interface OpportunityEligibility {
  /** Tipos de entidad admitidos (ej. ["ngo","foundation","sme"]). */
  entity_types: string[]
  /** Países cuyas entidades pueden presentarse (ISO-2 o nombres). [] = no restringido/declarado. */
  countries_allowed: string[]
  /** ¿Se admiten entidades sin ánimo de lucro? null si la fuente no lo declara. */
  nonprofit_allowed: boolean | null
  /** ¿Exige consorcio? null si no declarado. */
  consortium_required: boolean | null
  /** ¿Exige socio local en el país de ejecución? null si no declarado. */
  local_partner_required: boolean | null
  /** ¿Exige registro previo (en portal/registro de la fuente)? null si no declarado. */
  registration_required: boolean | null
}

/** Requisitos de capacidad / documentación exigidos. */
export interface OpportunityRequirements {
  /** Idioma exigido para la propuesta (ISO-639-1) si se conoce. */
  language: string | null
  /** Documentos exigidos (ej. ["estatutos","cuentas auditadas"]). */
  documents: string[]
  /** Capacidad financiera exigida (texto literal de la fuente) si se da. */
  financial_capacity: string | null
  /** Capacidad técnica exigida (texto literal) si se da. */
  technical_capacity: string | null
  /** Experiencia previa exigida (texto literal) si se da. */
  past_experience: string | null
  /** Cofinanciación exigida (texto/porcentaje) si se da. */
  cofinancing: string | null
  /** Garantía / aval exigido (texto/importe) si se da. */
  guarantee: string | null
}

/**
 * Oportunidad global normalizada — shape ÚNICO y exhaustivo.
 *
 * Supraconjunto de `OportunidadTS`. `id` estable y prefijado por fuente. Los
 * importes y la aptitud NO se inventan: lo que la fuente no da → `null` / `[]`.
 */
export interface GlobalOpportunity {
  /** Id estable, prefijado por fuente (ej. `ungm:123456`, `wb:OP000123`). */
  id: string
  /** Id de la fuente (coincide con `OpportunitySource.id`). */
  source: string
  /** URL pública de la fuente / ficha de la oportunidad. */
  source_url: string
  /** Tipo de fuente (familia): mismo dominio que `AccessMethod` por trazabilidad. */
  source_type: AccessMethod
  /** Naturaleza de la oportunidad. */
  kind: OpportunityKind
  /** Título de la oportunidad. */
  title: string
  /** Descripción / objeto (texto), null si no la da la fuente. */
  description: string | null
  /** Comprador / financiador (nombre legible). */
  buyer_or_funder: string
  /** Naturaleza del comprador/financiador. */
  buyer_type: BuyerType
  /** País del comprador/financiador (ISO-2 o nombre), null si transnacional. */
  country: string | null
  /** Región / estado subnacional (libre), null si no aplica. */
  region: string | null
  /** Localidad / municipio, null si no aplica. */
  locality: string | null
  /** País beneficiario (cooperación): dónde llega la ayuda. null si no aplica. */
  beneficiary_country: string | null
  /** Lugar de ejecución del contrato, null si no se da. */
  place_of_performance: string | null
  /** Fecha de publicación (ISO-8601 / YYYY-MM-DD), null si desconocida. */
  publication_date: string | null
  /** Plazo límite de presentación (ISO-8601 / YYYY-MM-DD), null si desconocido. */
  deadline: string | null
  /** Días naturales hasta `deadline` (negativo si vencido), null si sin plazo. */
  days_remaining: number | null
  /** Estado del ciclo de vida. */
  status: OpportunityStatus
  /** Importe / valor en la moneda original. null si la fuente no lo informa. */
  value_amount: number | null
  /** Moneda original del importe (ISO-4217), null si sin importe. */
  value_currency: string | null
  /** Importe convertido a EUR si es posible. null si no convertible/no informado. */
  value_eur: number | null
  /** Código CPV (UE) si aplica, null si no. */
  cpv: string | null
  /** Código UNSPSC (ONU) si aplica, null si no. */
  unspsc: string | null
  /** Código NAICS (Norteamérica) si aplica, null si no. */
  naics: string | null
  /** Sector CAD/OCDE (cooperación) si aplica, null si no. */
  dac_sector: string | null
  /** ODS / SDGs relacionados (ej. [1,5,10]). [] si no se declara. */
  sdgs: number[]
  /** Requisitos de elegibilidad. */
  eligibility: OpportunityEligibility
  /** Requisitos de capacidad / documentación. */
  requirements: OpportunityRequirements
  /** Documentos descargables. */
  documents: GlobalOpportunityDocument[]
  /** Etiquetas del analista (libres). */
  analyst_tags: string[]
  /** Puntuación de aptitud ONG (0-100). Fuente única: scoring (oportunidades). */
  ngo_relevance_score: number
  /** Razones legibles del score (transparencia). */
  reasons: string[]
}

// ─────────────────────────────────────────────────────────────────────────
// 2. La fuente (metadata del catálogo)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Metadata curada de una fuente de oportunidades. Esto es el "Opportunity Graph":
 * el mapa de TODAS las puertas de entrada a financiación/contratación útiles para
 * el tercer sector, con cómo acceder a cada una y su estado de integración.
 */
export interface OpportunitySource {
  /** Id estable, kebab-case (ej. "ungm", "world-bank-procnotices"). */
  id: string
  /** Nombre legible de la fuente. */
  label: string
  /** URL pública/portal de la fuente (REAL). */
  url: string
  /** URL de la API/endpoint de datos (REAL), null si no hay API pública. */
  api_url: string | null
  /** Método de acceso técnico. */
  access_method: AccessMethod
  /** Requisito de autenticación. */
  auth: SourceAuth
  /** Modelo de coste. */
  cost: SourceCost
  /** Cobertura geográfica (ISO-2, nombres de región, o "global"). */
  geography: string[]
  /** Niveles administrativos/institucionales que cubre. */
  levels: SourceLevel[]
  /** Tipos de oportunidad que publica. */
  opportunity_types: OpportunityKind[]
  /** Utilidad estimada para una ONG. */
  useful_for_ngo: NgoUsefulness
  /** Campos que la fuente expone (para saber qué se puede normalizar). */
  fields_available: string[]
  /** Frecuencia de actualización (texto libre, ej. "diaria", "continua"). */
  update_frequency: string
  /** Prioridad de implementación del conector. */
  implementation_priority: ImplementationPriority
  /** Estado de integración en nuestro agregador. */
  integration_status: IntegrationStatus
  /** Notas del analista (gratuidad, límites, gotchas, idioma…). */
  notes: string
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Respuesta del endpoint (vistas derivadas del catálogo)
// ─────────────────────────────────────────────────────────────────────────

/** Filtros opcionales del endpoint `/api/tercer-sector/global-opportunities`. */
export interface GlobalSourcesFiltros {
  /** Nivel (international_org|mdb|eu|national|regional|local). */
  level?: SourceLevel
  /** Geografía (ISO-2, nombre de región, o "global"). */
  geography?: string
  /** Estado de integración. */
  status?: IntegrationStatus
  /** Prioridad de implementación. */
  priority?: ImplementationPriority
  /** Texto libre (busca en label/notes/id). */
  q?: string
}

/** Cuerpo `data` de la respuesta del endpoint del catálogo global. */
export interface GlobalSourcesResponse {
  /** Catálogo completo (tras aplicar filtros opcionales). */
  sources: OpportunitySource[]
  /** Fuentes prioritarias (P0 / P1). */
  priority_sources: OpportunitySource[]
  /** Fuentes con API/OCDS (access_method ∈ {api, ocds}). */
  api_sources: OpportunitySource[]
  /** Fuentes que requieren scraping (access_method = html_scrape). */
  scrape_sources: OpportunitySource[]
  /** Fuentes que publican grants/calls. */
  grant_sources: OpportunitySource[]
  /** Fuentes que publican tenders/licitaciones. */
  tender_sources: OpportunitySource[]
  /** Fuentes internacionales (levels incluye international_org o mdb). */
  international_sources: OpportunitySource[]
  /** Fuentes nacionales (levels incluye national). */
  national_sources: OpportunitySource[]
  /** Fuentes regionales/locales (levels incluye regional o local). */
  regional_sources: OpportunitySource[]
  /** Total de fuentes (tras filtros). */
  total: number
  /** Conteo por estado de integración. */
  por_status: Record<IntegrationStatus, number>
  /** Cobertura por país/región (cuántas fuentes tocan cada geografía). */
  por_pais_cobertura: Record<string, number>
}
