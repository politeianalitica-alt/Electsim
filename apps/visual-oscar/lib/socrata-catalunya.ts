/**
 * Cliente para Socrata Open Data de la Generalitat de Catalunya
 * Dataset "Contractació pública (publicaciones agregadas)" · ybgg-dgi6
 *
 * Endpoint público sin autenticación, paginación libre, devuelve JSON.
 * Inspirado en BquantFinance/licitaciones-espana (scripts/ccaa_cataluna.py).
 *
 * Soporta: $q (full text), $where (filtros SoQL), $limit, $offset, $order, $select
 */

const ENDPOINT = 'https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json'

const UA = 'Politeia-Analitica/1.0 (search proxy · contracting intelligence)'

// Schema crudo del dataset (tal cual lo devuelve Socrata)
export interface CatalunyaContrato {
  codi_ambit?: string
  nom_ambit?: string
  codi_organ?: string
  nom_organ?: string
  codi_unitat?: string
  nom_unitat?: string
  codi_dir3?: string
  codi_expedient?: string
  tipus_contracte?: string         // 'Serveis' | 'Obres' | 'Subministrament' | 'Mixt' | 'Concessió'
  procediment?: string             // 'Obert' | 'Contracte menor' | 'Restringit' | etc.
  fase_publicacio?: string
  denominacio?: string
  objecte_contracte?: string
  valor_estimat_contracte?: string
  codi_nuts?: string
  lloc_execucio?: string
  durada_contracte?: string
  codi_cpv?: string
  identificacio_adjudicatari?: string
  denominacio_adjudicatari?: string
  import_adjudicacio_sense?: string
  import_adjudicacio_amb_iva?: string
  pressupost_licitacio_sense?: string
  pressupost_licitacio_amb?: string
  ofertes_rebudes?: string
  resultat?: string
  enllac_publicacio?: { url?: string }
  url_json_agregada?: { url?: string }
  data_publicacio_contracte?: string
  data_adjudicacio_contracte?: string
  data_formalitzacio_contracte?: string
  tipus_tramitacio?: string
  tipus_empresa?: string
}

// Schema normalizado común (compatible con UI agnóstica de fuente)
export interface NormalizedContrato {
  id: string
  fuente: 'CATALUNYA_SOCRATA' | 'PLACSP'
  fuente_label: string
  expediente: string
  organo: string
  organo_dir3?: string
  ambito?: string                  // 'Local' | 'Autonómico' | 'Otros'
  objeto: string
  tipo_contrato?: string
  procedimiento?: string
  cpv?: string
  lugar_ejecucion?: string
  importe_licitacion?: number      // EUR sin IVA
  importe_adjudicacion?: number    // EUR sin IVA
  importe_adjudicacion_iva?: number
  adjudicatario?: string
  adjudicatario_nif?: string
  ofertas_recibidas?: number
  estado?: string
  fecha_publicacion?: string       // ISO date
  fecha_adjudicacion?: string
  fecha_formalizacion?: string
  url?: string
  raw?: Record<string, unknown>
}

function toNum(s?: string): number | undefined {
  if (s == null || s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function toIsoDate(s?: string): string | undefined {
  if (!s) return undefined
  // Socrata devuelve "2024-02-16T11:04:00.000" — válido como ISO
  return s.length >= 10 ? s.slice(0, 10) : undefined
}

export function normalizeCatalunya(c: CatalunyaContrato): NormalizedContrato {
  return {
    id: `CT-${c.codi_expedient || c.codi_organ || Math.random().toString(36).slice(2)}`,
    fuente: 'CATALUNYA_SOCRATA',
    fuente_label: 'Generalitat · Open Data',
    expediente: c.codi_expedient || '',
    organo: c.nom_organ || c.nom_unitat || '—',
    organo_dir3: c.codi_dir3,
    ambito: c.nom_ambit,
    objeto: c.objecte_contracte || c.denominacio || '—',
    tipo_contrato: c.tipus_contracte,
    procedimiento: c.procediment,
    cpv: c.codi_cpv,
    lugar_ejecucion: c.lloc_execucio,
    importe_licitacion: toNum(c.pressupost_licitacio_sense),
    importe_adjudicacion: toNum(c.import_adjudicacio_sense),
    importe_adjudicacion_iva: toNum(c.import_adjudicacio_amb_iva),
    adjudicatario: c.denominacio_adjudicatari,
    adjudicatario_nif: c.identificacio_adjudicatari,
    ofertas_recibidas: toNum(c.ofertes_rebudes),
    estado: c.fase_publicacio || c.resultat,
    fecha_publicacion: toIsoDate(c.data_publicacio_contracte),
    fecha_adjudicacion: toIsoDate(c.data_adjudicacio_contracte),
    fecha_formalizacion: toIsoDate(c.data_formalitzacio_contracte),
    url: c.enllac_publicacio?.url,
  }
}

export interface SocrataParams {
  q?: string                        // full text search
  desde?: string                    // ISO date YYYY-MM-DD
  hasta?: string                    // ISO date YYYY-MM-DD
  cpv?: string                      // CPV prefix (e.g. "33" para sanidad)
  tipo?: string                     // tipus_contracte exact
  organo?: string                   // nom_organ contains
  limit?: number                    // default 50
  offset?: number                   // default 0
  order?: string                    // p.ej. 'data_publicacio_contracte DESC'
}

export async function searchCatalunya(
  p: SocrataParams,
  timeoutMs = 8000,
): Promise<{ ok: boolean; items: NormalizedContrato[]; error?: string; ms: number }> {
  const t0 = Date.now()
  const url = new URL(ENDPOINT)

  const limit = Math.min(200, Math.max(1, p.limit ?? 50))
  const offset = Math.max(0, p.offset ?? 0)
  url.searchParams.set('$limit', String(limit))
  url.searchParams.set('$offset', String(offset))
  url.searchParams.set('$order', p.order || 'data_publicacio_contracte DESC NULL LAST')

  if (p.q) url.searchParams.set('$q', p.q)

  // Construir $where compuesto
  const whereParts: string[] = []
  if (p.desde) whereParts.push(`data_publicacio_contracte >= '${p.desde}T00:00:00'`)
  if (p.hasta) whereParts.push(`data_publicacio_contracte <= '${p.hasta}T23:59:59'`)
  if (p.cpv) whereParts.push(`starts_with(codi_cpv, '${p.cpv.replace(/'/g, "''")}')`)
  if (p.tipo) whereParts.push(`tipus_contracte = '${p.tipo.replace(/'/g, "''")}'`)
  if (p.organo) whereParts.push(`upper(nom_organ) like '%${p.organo.toUpperCase().replace(/'/g, "''")}%'`)
  if (whereParts.length) url.searchParams.set('$where', whereParts.join(' AND '))

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      // cache 10 min en CDN; es público y no cambia rápidamente
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) {
      return { ok: false, items: [], error: `HTTP ${res.status}`, ms: Date.now() - t0 }
    }
    const raw = (await res.json()) as CatalunyaContrato[]
    const items = raw.map(normalizeCatalunya)
    return { ok: true, items, ms: Date.now() - t0 }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, items: [], error: msg, ms: Date.now() - t0 }
  }
}

/** Cuenta total estimada (Socrata permite SELECT count(*) via $select) */
export async function countCatalunya(p: SocrataParams, timeoutMs = 8000): Promise<number | null> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('$select', 'count(*) as n')
  if (p.q) url.searchParams.set('$q', p.q)
  const whereParts: string[] = []
  if (p.desde) whereParts.push(`data_publicacio_contracte >= '${p.desde}T00:00:00'`)
  if (p.hasta) whereParts.push(`data_publicacio_contracte <= '${p.hasta}T23:59:59'`)
  if (p.cpv) whereParts.push(`starts_with(codi_cpv, '${p.cpv.replace(/'/g, "''")}')`)
  if (p.tipo) whereParts.push(`tipus_contracte = '${p.tipo.replace(/'/g, "''")}'`)
  if (p.organo) whereParts.push(`upper(nom_organ) like '%${p.organo.toUpperCase().replace(/'/g, "''")}%'`)
  if (whereParts.length) url.searchParams.set('$where', whereParts.join(' AND '))
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const j = (await res.json()) as Array<{ n?: string }>
    const n = j[0]?.n
    return n ? Number(n) : null
  } catch {
    return null
  }
}
