/**
 * Tipos compartidos de la capa IATI · Sprint Tercer Sector v3 · TS2-iati.
 *
 * IATI (International Aid Transparency Initiative) publica datos de cooperación
 * internacional / ayuda al desarrollo en un estándar abierto. Politeia lo usa
 * para el ángulo "cooperación internacional" del sector Tercer Sector / ONGs:
 * actividades de ONGD españolas, por país receptor, por sector DAC y sus
 * desembolsos.
 *
 * IATI expone TRES APIs (solo la primera necesita key):
 *   1. Datastore (Solr)  · requiere IATI_API_KEY (header Ocp-Apim-Subscription-Key)
 *      https://api.iatistandard.org/datastore/{activity,transaction,budget}/select
 *   2. Registry (CKAN)   · KEYLESS · publishers / organizaciones
 *      https://iatiregistry.org/api/action/...
 *   3. Codelists         · KEYLESS · mapeos código→nombre (Sector DAC, Country, ...)
 *      https://iatistandard.org/codelists/downloads/clv3/json/<X>.json
 *
 * Estos tipos se mantienen PLANOS y sin dependencias para poder consumirse tanto
 * en route handlers / componentes Next.js como en tests Node
 * (`node --experimental-strip-types`). Patrón heredado de `lib/energia/types.ts`.
 *
 * NOTA · convivencia con `app/api/iati/spain-overview/route.ts` (módulo legacy
 * que hace su propia query Solr de facets con shape distinto `IatiOverview`).
 * Esta capa (`/api/tercer-sector/iati/*`) es la fuente de verdad de TS v3 y NO
 * colisiona: rutas y tipos separados.
 */

// ─────────────────────────────────────────────────────────────────────────
// Envelope común (patrón Politeia · igual que lib/energia)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sobre estándar de toda respuesta de esta capa. `ok:false` NUNCA lanza: ante
 * key ausente, rate-limit o fallo de red devuelve `data:null` + `error`.
 *
 * `degraded`/`degraded_reason` señalan que la respuesta es parcial pero útil
 * (p. ej. overview servido desde Registry+Codelists porque falta IATI_API_KEY):
 * en ese caso `ok` sigue siendo `true` y `data` viene poblado con lo disponible.
 */
export interface IatiEnvelope<T> {
  ok: boolean
  data: T | null
  error?: string
  /** True si la respuesta es válida pero degradada (sin Datastore, etc.). */
  degraded?: boolean
  /** Explicación honesta de la degradación, mostrable al usuario. */
  degraded_reason?: string
  fetched_at: string
  source_url: string
}

// ─────────────────────────────────────────────────────────────────────────
// Codelists (keyless)
// ─────────────────────────────────────────────────────────────────────────

/** Entrada de un codelist IATI normalizada a {code,name}. */
export interface CodelistEntry {
  code: string
  name: string
  /** Categoría DAC del sector (solo en Sector); ej. "151" para "Government". */
  category?: string
  description?: string
}

/** Resultado del proxy de codelists: mapas listos para resolver códigos. */
export interface CodelistsData {
  /** Sectores DAC (5 dígitos) code→entry. */
  sectors: Record<string, CodelistEntry>
  /** Países ISO-2 code→entry. */
  countries: Record<string, CodelistEntry>
  /** Cuántos sectores/países cargados (para UI/diagnóstico). */
  counts: { sectors: number; countries: number }
}

// ─────────────────────────────────────────────────────────────────────────
// Registry / organizaciones (keyless)
// ─────────────────────────────────────────────────────────────────────────

/** Organización publicadora en el Registry IATI (CKAN), normalizada. */
export interface IatiOrg {
  /** Slug CKAN del publisher (id para organization_show). */
  slug: string
  /** Nombre legible del publisher. */
  name: string
  /** Identificador IATI del publisher (ej. "ES-CIF-G58236803"); puede faltar. */
  iati_ref: string | null
  /** Tipo de organización (código IATI OrganisationType) si lo expone. */
  org_type: string | null
  /** País del publisher (ISO-2) si lo expone. */
  country: string | null
  /** Nº de datasets (packages) publicados por la organización. */
  dataset_count: number
  /** True si es una de las ONGD españolas curadas que buscamos. */
  curated_spanish: boolean
}

/** Directorio de ONGD españolas reportantes en IATI. */
export interface IatiOrgsData {
  orgs: IatiOrg[]
  total: number
  /** Cuántas de las curadas se resolvieron en el Registry. */
  matched_curated: number
}

// ─────────────────────────────────────────────────────────────────────────
// Datastore: overview / actividades / transacciones (requiere key)
// ─────────────────────────────────────────────────────────────────────────

/** Par código+conteo con nombre resuelto (vía codelists/curado). */
export interface FacetCount {
  code: string
  name: string
  count: number
}

/** Visión España de la cooperación internacional vía IATI. */
export interface IatiOverviewData {
  /** Nº total de actividades reportadas por orgs españolas. */
  total_activities: number
  /** Total desembolsado (transaction_type 3) en EUR, si disponible. */
  total_disbursed_eur: number | null
  /** Top países receptores por nº de actividades (nombre resuelto). */
  top_recipient_countries: FacetCount[]
  /** Top sectores DAC por nº de actividades (nombre resuelto). */
  top_sectors: FacetCount[]
  /** Top organizaciones reportantes por nº de actividades. */
  top_reporting_orgs: FacetCount[]
  /** Modo de obtención del dato: datastore (con key) o registry (degradado). */
  mode: 'datastore' | 'registry'
}

/** Una actividad IATI normalizada (subset relevante). */
export interface IatiActivity {
  /** iati-identifier de la actividad. */
  id: string
  /** Título (idioma reportado; preferimos es/en). */
  title: string
  /** Ref del reporting org. */
  reporting_org_ref: string | null
  /** Nombre del reporting org si viene en el doc. */
  reporting_org_name: string | null
  /** Países receptores (ISO-2). */
  recipient_countries: string[]
  /** Sectores DAC (códigos). */
  sectors: string[]
  /** Importe asociado (presupuesto/valor) en EUR si se pudo derivar. */
  amount_eur: number | null
  /** Estado de la actividad (activity_status_code) si viene. */
  status: string | null
}

/** Resultado paginado de actividades filtradas. */
export interface IatiActivitiesData {
  activities: IatiActivity[]
  /** Total de coincidencias en el Datastore (numFound). */
  total_found: number
  /** Filtros efectivos aplicados (eco de la query). */
  filters: {
    recipient_country: string | null
    reporting_org: string | null
    sector: string | null
  }
  /** Paginación. */
  page: { start: number; rows: number }
}

/** Una transacción/desembolso IATI normalizada. */
export interface IatiTransaction {
  /** Actividad a la que pertenece. */
  activity_id: string
  /** Ref del reporting org. */
  reporting_org_ref: string | null
  /** Código de tipo de transacción (3 = desembolso, 2 = compromiso, ...). */
  type_code: string | null
  /** Fecha ISO (transaction_date_iso_date). */
  date: string | null
  /** Valor en EUR si se pudo derivar (transaction_value normalizado). */
  value_eur: number | null
  /** País receptor (ISO-2) si viene. */
  recipient_country: string | null
}

/** Punto de la serie temporal agregada de desembolsos. */
export interface DisbursementBucket {
  /** Periodo (YYYY o YYYY-MM según granularidad). */
  period: string
  /** Suma de valores en EUR del periodo. */
  value_eur: number
  /** Nº de transacciones en el periodo. */
  count: number
}

/** Resultado de transacciones: detalle + timeline agregado. */
export interface IatiTransactionsData {
  /** Transacciones individuales (muestra acotada). */
  transactions: IatiTransaction[]
  /** Serie temporal agregada de desembolsos (orden cronológico ascendente). */
  timeline: DisbursementBucket[]
  /** Suma total en EUR del conjunto devuelto. */
  total_value_eur: number
  /** Total de coincidencias en el Datastore (numFound). */
  total_found: number
  filters: {
    reporting_org: string | null
    recipient_country: string | null
    type_code: string
  }
}

// Aliases de respuesta (envelope tipado por endpoint).
export type IatiCodelistsResponse = IatiEnvelope<CodelistsData>
export type IatiOrgsResponse = IatiEnvelope<IatiOrgsData>
export type IatiOverviewResponse = IatiEnvelope<IatiOverviewData>
export type IatiActivitiesResponse = IatiEnvelope<IatiActivitiesData>
export type IatiTransactionsResponse = IatiEnvelope<IatiTransactionsData>
