/**
 * Adaptador para CKAN datastore de la Generalitat Valenciana.
 *
 * Catálogo: https://dadesobertes.gva.es/
 * Cada año tiene su propio resource_id en el "Registro Oficial de Contratos".
 * Se accede vía /api/3/action/datastore_search con full text search (q=) +
 * filtros (filters JSON) + paginación (limit/offset).
 *
 * Fuente original: BquantFinance/licitaciones-espana · scripts/ccaa_valencia_parquet.py
 */

import type { NormalizedContrato } from '@/lib/socrata-catalunya'

const CKAN_BASE = 'https://dadesobertes.gva.es/api/3/action'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

// Resource IDs descubiertos via package_search?q=Registro+Oficial+Contratos
// (los IDs son estables y públicos · si Valencia los rota, fallback graceful)
const RESOURCES_BY_YEAR: Record<number, string> = {
  2013: '48c361fd-fdfb-48ac-aec0-5d53ac1ee084',
  2014: '3ec3d8dc-11af-471a-b86f-1086bfb6e5a2',
  2015: 'f6fbb208-fef0-47be-abae-e7ead867b5c1',
  2016: '1730580e-5fd9-4bd6-9acf-6804974d4025',
  2017: '9b0adff4-2eca-4369-8806-750f2dc19c38',
  2018: '89414f44-374c-403f-82ef-53cd160317a7',
  2019: '08e05c03-5d5e-4c83-8629-e06156061482',
  2020: '1f4c0be1-623b-4b5a-967d-46e51ff54446',
  2021: '9001ba25-fc73-438f-8fbf-a14000733051',
  2022: '299b6b0d-c6c9-463a-8689-39709eed6b10',
  2023: 'a8b3aae7-ecb9-4508-80a6-c764805958a0',
  2024: '69879ad2-ee19-426d-ad29-d1e5abe71c67',
  2025: 'eb94c040-e7c0-4793-b921-144d2342d531',
}

interface ValenciaRecord {
  _id: number
  EJERCICIO?: number
  EXPEDIENTE?: string
  CLASE_DE_CONTRATO?: string
  CONSELLERIA_ENT_ADJUD?: string
  UNIDAD?: string
  OBJETO?: string
  LUGAR_EJECUCION?: string
  TIPO?: string
  TIPO_TRAMITACION?: string
  PROCEDIMIENTO?: string
  IMPORTE_LICIT_SIN_IVA?: string | number
  IMPORTE_LICIT_IVA?: string | number
  IMP_ADJUD_SIN_IVA?: string | number
  IMP_ADJUD_IVA?: string | number
  IMP_TOTAL_ADJUD?: string | number
  CIF_NIF_ENMASCARADO?: string
  NOMBRE_O_RAZON_SOCIAL?: string
  PYME?: string
  FECHA_ADJUDICACION?: string
  FECHA_FORMALIZACION?: string
  FECHA_PUBL_ADJ_FORM_PERFIL?: string
  CODIGO_CPV?: string
  CPV?: string
  URL_LICITACION?: string
  NUM_LICITADORES?: string | number
  rank?: number
}

function toNum(v: unknown): number | undefined {
  if (v == null || v === '' || v === 'None') return undefined
  // Valencia usa coma decimal en algunos campos
  const s = typeof v === 'string' ? v.replace(',', '.') : v
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
function toIsoDate(v?: string): string | undefined {
  if (!v) return undefined
  // Valencia usa 'YYYY/MM/DD HH:mm:ss.NS' o 'DD/MM/YYYY'
  const ymd = v.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  const dmy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return undefined
}

function normalize(r: ValenciaRecord, year: number): NormalizedContrato {
  const fechaAdj = toIsoDate(r.FECHA_ADJUDICACION) || toIsoDate(r.FECHA_PUBL_ADJ_FORM_PERFIL)
  const importeAdj = toNum(r.IMP_ADJUD_SIN_IVA)
  const importeAdjIva = toNum(r.IMP_TOTAL_ADJUD)
  const importeLic = toNum(r.IMPORTE_LICIT_SIN_IVA)
  return {
    id: `VC-${year}-${r._id}`,
    source_id: r.EXPEDIENTE,
    fuente: 'CATALUNYA_SOCRATA' as never,   // se sobreescribe abajo
    fuente_label: 'Generalitat Valenciana',
    expediente: r.EXPEDIENTE || `${r._id}`,
    organo: r.CONSELLERIA_ENT_ADJUD || r.UNIDAD || '—',
    ambito: 'Generalitat',
    objeto: r.OBJETO || '—',
    tipo_contrato: r.TIPO,
    procedimiento: r.PROCEDIMIENTO?.split('/')[0]?.trim(),
    cpv: r.CODIGO_CPV,
    cpv_div: r.CODIGO_CPV?.slice(0, 2),
    lugar_ejecucion: r.LUGAR_EJECUCION,
    importe_licitacion: importeLic,
    importe_adjudicacion: importeAdj,
    importe_adjudicacion_iva: importeAdjIva,
    adjudicatario: r.NOMBRE_O_RAZON_SOCIAL,
    adjudicatario_nif: r.CIF_NIF_ENMASCARADO,
    ofertas_recibidas: toNum(r.NUM_LICITADORES),
    estado: 'Adjudicado',
    fecha_publicacion: fechaAdj,
    fecha_adjudicacion: fechaAdj,
    fecha_formalizacion: toIsoDate(r.FECHA_FORMALIZACION),
    anio: year,
    es_pyme: r.PYME?.toLowerCase().includes('sí') || r.PYME?.toLowerCase().includes('si') || false,
    url: r.URL_LICITACION && r.URL_LICITACION !== 'No encontrada' ? r.URL_LICITACION : undefined,
  }
}

export interface ValenciaSearchParams {
  q?: string
  anio?: number
  desde?: string                   // ISO YYYY-MM-DD (filtra por FECHA_ADJUDICACION)
  hasta?: string
  cpv_div?: string
  tipo_contrato?: string
  procedimiento?: string
  organo?: string
  adjudicatario_nif?: string
  importe_min?: number
  importe_max?: number
  es_pyme?: boolean
  limit?: number
  offset?: number
}

/**
 * Llamada CKAN datastore_search a UN año concreto.
 */
async function searchYear(
  year: number,
  p: ValenciaSearchParams,
  timeoutMs = 6000,
): Promise<NormalizedContrato[]> {
  const rid = RESOURCES_BY_YEAR[year]
  if (!rid) return []

  const url = new URL(`${CKAN_BASE}/datastore_search`)
  url.searchParams.set('resource_id', rid)
  url.searchParams.set('limit', String(Math.min(500, p.limit ?? 50)))
  if (p.offset) url.searchParams.set('offset', String(p.offset))
  if (p.q) url.searchParams.set('q', p.q)

  // Filters JSON · CKAN solo soporta filtros exactos
  const filters: Record<string, string> = {}
  if (p.tipo_contrato) filters.TIPO = p.tipo_contrato
  if (p.adjudicatario_nif) filters.CIF_NIF_ENMASCARADO = p.adjudicatario_nif.toUpperCase()
  if (Object.keys(filters).length) url.searchParams.set('filters', JSON.stringify(filters))

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return []
    const json = (await res.json()) as { success?: boolean; result?: { records?: ValenciaRecord[] } }
    if (!json.success) return []
    return (json.result?.records || []).map(r => {
      const n = normalize(r, year)
      return { ...n, fuente: 'VALENCIA_CKAN' as 'CATALUNYA_SOCRATA', fuente_label: 'Generalitat Valenciana · CKAN' }
    })
  } catch {
    return []
  }
}

/**
 * Búsqueda principal: si no hay año, ataca los últimos 3 años (current, -1, -2)
 * en paralelo. Si hay año, sólo ese.
 */
export async function searchValencia(
  p: ValenciaSearchParams,
  timeoutMs = 8000,
): Promise<{ ok: boolean; items: NormalizedContrato[]; ms: number; error?: string }> {
  const t0 = Date.now()
  try {
    const currentYear = new Date().getFullYear()
    const years = p.anio
      ? [p.anio]
      : [currentYear, currentYear - 1, currentYear - 2].filter(y => RESOURCES_BY_YEAR[y])

    const perYearLimit = Math.max(20, Math.ceil((p.limit ?? 50) / years.length))
    const results = await Promise.all(
      years.map(y => searchYear(y, { ...p, limit: perYearLimit }, timeoutMs)),
    )

    let items = results.flat()

    // Filtros que CKAN no soporta directamente → post-filtro
    if (p.cpv_div) items = items.filter(i => i.cpv?.startsWith(p.cpv_div!))
    if (p.procedimiento) items = items.filter(i => i.procedimiento === p.procedimiento)
    if (p.organo) {
      const ol = p.organo.toUpperCase()
      items = items.filter(i => i.organo?.toUpperCase().includes(ol))
    }
    if (p.desde) items = items.filter(i => (i.fecha_adjudicacion || '') >= p.desde!)
    if (p.hasta) items = items.filter(i => (i.fecha_adjudicacion || '') <= p.hasta!)
    if (typeof p.importe_min === 'number') {
      items = items.filter(i => (i.importe_adjudicacion ?? 0) >= p.importe_min!)
    }
    if (typeof p.importe_max === 'number') {
      items = items.filter(i => {
        const v = i.importe_adjudicacion ?? 0
        return v > 0 && v <= p.importe_max!
      })
    }
    if (typeof p.es_pyme === 'boolean') items = items.filter(i => i.es_pyme === p.es_pyme)

    items.sort((a, b) => (b.fecha_adjudicacion || '').localeCompare(a.fecha_adjudicacion || ''))
    return { ok: true, items: items.slice(0, p.limit ?? 50), ms: Date.now() - t0 }
  } catch (e: unknown) {
    return { ok: false, items: [], ms: Date.now() - t0, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export const VALENCIA_YEARS = Object.keys(RESOURCES_BY_YEAR).map(Number).sort((a, b) => b - a)
