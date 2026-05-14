/**
 * Adaptador para el portal de contratación pública de la Junta de Andalucía.
 *
 * Consume el endpoint Elasticsearch público (sin auth) del Sistema de
 * Información de Recursos Económicos para Contratación (SIREC):
 *   POST /haciendayadministracionpublica/apl/pdc-front-publico/elastic/
 *        sirec_pdc_expedientes/_search
 *
 * Cobertura: 866.000+ expedientes (2017-actualidad), todos los perfiles
 * contratantes de la Junta.
 */

import type { NormalizedContrato } from '@/lib/socrata-catalunya'

const ENDPOINT = 'https://www.juntadeandalucia.es/haciendayadministracionpublica/apl/pdc-front-publico/elastic/sirec_pdc_expedientes/_search'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface AndaluciaExpediente {
  idExpediente?: number
  tipoContrato?: { codigo?: string; descripcion?: string }
  perfilContratante?: { codigo?: string; descripcion?: string; codigoDir3?: string }
  codigoProcedimiento?: string
  numeroExpediente?: string
  titulo?: string
  divisionLotes?: 'N' | 'S'
  numeroLotes?: number
  importeLicitacion?: number
  valorEstimado?: number | null
  estado?: { codigo?: string; nombre?: string }
  cofinanciadoUE?: 'N' | 'S'
  provinciasEjecucion?: string[]
  codigosCpv?: string[]
  fechaPublicacion?: string
  fechaLimitePresentacion?: string
  mediosPublicacion?: Array<{ codigo?: string; fechaPublicacion?: string }>
  codigoTipoTramitacion?: string
  adjudicaciones?: Array<{
    nifAdjudicatario?: string
    nombreAdjudicatario?: string
    importeAdjudicacion?: number
    fechaResolucion?: string
    fechaFormalizacion?: string
    codigoResultado?: string
    definitivo?: boolean
  }>
}

interface AndaluciaSearchResponse {
  hits?: {
    total?: { value: number }
    hits?: Array<{ _source: AndaluciaExpediente }>
  }
}

// ─── Provincias Andalucía (códigos INE) ───────────────────
const PROVINCIAS: Record<string, string> = {
  '04': 'Almería', '11': 'Cádiz', '14': 'Córdoba', '18': 'Granada',
  '21': 'Huelva',  '23': 'Jaén',  '29': 'Málaga',  '41': 'Sevilla',
}

// ─── Procedimientos Andalucía (códigos SIREC) ─────────────
const PROCEDIMIENTOS_AND: Record<string, string> = {
  '1': 'Abierto',
  '2': 'Restringido',
  '3': 'Negociado con publicidad',
  '4': 'Negociado sin publicidad',
  '5': 'Diálogo competitivo',
  '6': 'Acuerdo marco',
  '7': 'Sistema dinámico',
  '9': 'Contrato menor',
  '13': 'Asociación para la innovación',
}

function normalize(e: AndaluciaExpediente): NormalizedContrato {
  const fechaPub = e.fechaPublicacion?.slice(0, 10)
  const adj = e.adjudicaciones?.[0]
  const fechaAdj = adj?.fechaResolucion?.slice(0, 10)
  const provincia = e.provinciasEjecucion?.[0]
  const procedimiento = e.codigoProcedimiento ? PROCEDIMIENTOS_AND[e.codigoProcedimiento] : undefined
  return {
    id: `AN-${e.idExpediente || e.numeroExpediente}`,
    source_id: e.numeroExpediente,
    fuente: 'ANDALUCIA' as 'CATALUNYA_SOCRATA',
    fuente_label: 'Junta de Andalucía',
    expediente: e.numeroExpediente || String(e.idExpediente || ''),
    organo: e.perfilContratante?.descripcion?.trim() || '—',
    organo_dir3: e.perfilContratante?.codigoDir3,
    ambito: 'Junta',
    objeto: e.titulo || '—',
    tipo_contrato: e.tipoContrato?.descripcion,
    procedimiento,
    cpv: e.codigosCpv?.[0],
    cpv_div: e.codigosCpv?.[0]?.slice(0, 2),
    lugar_ejecucion: provincia ? PROVINCIAS[provincia] : undefined,
    importe_licitacion: typeof e.importeLicitacion === 'number' ? e.importeLicitacion : undefined,
    importe_adjudicacion: typeof adj?.importeAdjudicacion === 'number' ? adj.importeAdjudicacion : undefined,
    adjudicatario: adj?.nombreAdjudicatario,
    adjudicatario_nif: adj?.nifAdjudicatario,
    estado: e.estado?.nombre,
    fecha_publicacion: fechaPub,
    fecha_adjudicacion: fechaAdj,
    fecha_formalizacion: adj?.fechaFormalizacion?.slice(0, 10),
    anio: fechaPub ? Number(fechaPub.slice(0, 4)) : undefined,
    es_pyme: false,  // no expuesto en SIREC
    url: e.idExpediente
      ? `https://www.juntadeandalucia.es/haciendayadministracionpublica/apl/pdc-front-publico/expediente/${e.idExpediente}`
      : undefined,
  }
}

// ─── Filter set canónico para Andalucía ───────────────────
export interface AndaluciaSearchParams {
  q?: string
  desde?: string                   // ISO date
  hasta?: string
  cpv_div?: string                 // prefijo CPV (e.g. "33")
  cpv?: string
  tipo_contrato?: string           // 'OBRA' | 'SUM' | 'SER' | etc
  organo?: string                  // contains
  adjudicatario_nif?: string
  importe_min?: number
  importe_max?: number
  limit?: number
  offset?: number
  order?: 'date_desc' | 'date_asc' | 'imp_desc' | 'imp_asc'
}

function buildQuery(p: AndaluciaSearchParams): unknown {
  const must: unknown[] = []
  if (p.q) {
    must.push({
      multi_match: {
        query: p.q,
        fields: ['titulo^2', 'numeroExpediente', 'perfilContratante.descripcion', 'adjudicaciones.nombreAdjudicatario'],
        operator: 'and',
      },
    })
  }
  if (p.desde || p.hasta) {
    const range: Record<string, string> = {}
    if (p.desde) range.gte = `${p.desde}T00:00:00Z`
    if (p.hasta) range.lte = `${p.hasta}T23:59:59Z`
    must.push({ range: { fechaPublicacion: range } })
  }
  if (p.cpv_div || p.cpv) {
    const prefix = p.cpv_div || p.cpv!
    must.push({ prefix: { codigosCpv: prefix } })
  }
  if (p.tipo_contrato) {
    must.push({ match: { 'tipoContrato.descripcion': p.tipo_contrato } })
  }
  if (p.organo) {
    must.push({ match: { 'perfilContratante.descripcion': p.organo } })
  }
  if (p.adjudicatario_nif) {
    must.push({ match: { 'adjudicaciones.nifAdjudicatario': p.adjudicatario_nif.toUpperCase() } })
  }
  if (typeof p.importe_min === 'number' || typeof p.importe_max === 'number') {
    const range: Record<string, number> = {}
    if (typeof p.importe_min === 'number') range.gte = p.importe_min
    if (typeof p.importe_max === 'number') range.lte = p.importe_max
    must.push({ range: { importeLicitacion: range } })
  }

  return must.length > 0 ? { bool: { must } } : { match_all: {} }
}

function buildSort(order?: AndaluciaSearchParams['order']): unknown[] {
  switch (order) {
    case 'date_asc':  return [{ fechaPublicacion: { order: 'asc' } }]
    case 'imp_desc':  return [{ importeLicitacion: { order: 'desc' } }]
    case 'imp_asc':   return [{ importeLicitacion: { order: 'asc' } }]
    case 'date_desc':
    default:          return [{ fechaPublicacion: { order: 'desc' } }]
  }
}

export async function searchAndalucia(
  p: AndaluciaSearchParams,
  timeoutMs = 8000,
): Promise<{ ok: boolean; total: number; items: NormalizedContrato[]; ms: number; error?: string }> {
  const t0 = Date.now()
  const limit = Math.min(100, Math.max(1, p.limit ?? 50))
  const offset = Math.max(0, Math.min(9900, p.offset ?? 0))

  const body = {
    query: buildQuery(p),
    size: limit,
    from: offset,
    sort: buildSort(p.order),
    track_total_hits: true,
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, total: 0, items: [], ms: Date.now() - t0, error: `HTTP ${res.status}` }
    const json = (await res.json()) as AndaluciaSearchResponse
    const total = json.hits?.total?.value ?? 0
    const items = (json.hits?.hits || []).map(h => normalize(h._source))
    return { ok: true, total, items, ms: Date.now() - t0 }
  } catch (e: unknown) {
    return { ok: false, total: 0, items: [], ms: Date.now() - t0, error: e instanceof Error ? e.message : 'unknown' }
  }
}
