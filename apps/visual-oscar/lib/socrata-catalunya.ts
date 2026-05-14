/**
 * Cliente para Socrata Open Data de la Generalitat de Catalunya.
 * Dataset: "Contractació pública (publicaciones agregadas)" · ybgg-dgi6
 *
 * Endpoint público sin auth, paginación libre, devuelve JSON.
 * Soporta SoQL completo: $q, $where, $select, $group, $order, $limit, $offset.
 *
 * Inspirado en BquantFinance/licitaciones-espana y buscalicitaciones.com,
 * que usan los parquets agregados de las 10 fuentes públicas. Aquí
 * usamos el endpoint Socrata en vivo para no descargar 1.5 GB.
 */

const ENDPOINT = 'https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json'

const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

// ─── Schema crudo del dataset ───────────────────────────────
export interface CatalunyaContrato {
  codi_ambit?: string
  nom_ambit?: string
  codi_organ?: string
  nom_organ?: string
  codi_unitat?: string
  nom_unitat?: string
  codi_dir3?: string
  codi_expedient?: string
  tipus_contracte?: string
  procediment?: string
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

// ─── Schema canónico (compatible con UI agnóstica de fuente) ───────
export interface NormalizedContrato {
  id: string
  fuente: 'CATALUNYA_SOCRATA' | 'PLACSP'
  fuente_label: string
  expediente: string
  organo: string
  organo_dir3?: string
  ambito?: string
  objeto: string
  tipo_contrato?: string
  procedimiento?: string
  cpv?: string
  cpv_div?: string                  // primeros 2 dígitos
  lugar_ejecucion?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  importe_adjudicacion_iva?: number
  adjudicatario?: string
  adjudicatario_nif?: string
  ofertas_recibidas?: number
  estado?: string
  fecha_publicacion?: string
  fecha_adjudicacion?: string
  fecha_formalizacion?: string
  anio?: number
  es_pyme?: boolean
  url?: string
  source_id?: string
}

// ─── Helpers ────────────────────────────────────────────────
function toNum(s?: string): number | undefined {
  if (s == null || s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
function toIsoDate(s?: string): string | undefined {
  if (!s) return undefined
  return s.length >= 10 ? s.slice(0, 10) : undefined
}
function sqlStr(s: string): string {
  return s.replace(/'/g, "''")
}

export function normalizeCatalunya(c: CatalunyaContrato): NormalizedContrato {
  const fechaAdj = toIsoDate(c.data_adjudicacio_contracte)
  const fechaPub = toIsoDate(c.data_publicacio_contracte)
  const anio = (fechaAdj || fechaPub || '').slice(0, 4)
  const isPyme =
    c.tipus_empresa?.toLowerCase().includes('pime') ||
    c.tipus_empresa?.toLowerCase().includes('pyme') ||
    false
  return {
    id: `CT-${c.codi_expedient || c.codi_organ || Math.random().toString(36).slice(2)}`,
    source_id: c.codi_expedient,
    fuente: 'CATALUNYA_SOCRATA',
    fuente_label: 'Catalunya · Open Data',
    expediente: c.codi_expedient || '',
    organo: c.nom_organ || c.nom_unitat || '—',
    organo_dir3: c.codi_dir3,
    ambito: c.nom_ambit,
    objeto: c.objecte_contracte || c.denominacio || '—',
    tipo_contrato: c.tipus_contracte,
    procedimiento: c.procediment,
    cpv: c.codi_cpv,
    cpv_div: c.codi_cpv?.slice(0, 2),
    lugar_ejecucion: c.lloc_execucio,
    importe_licitacion: toNum(c.pressupost_licitacio_sense),
    importe_adjudicacion: toNum(c.import_adjudicacio_sense),
    importe_adjudicacion_iva: toNum(c.import_adjudicacio_amb_iva),
    adjudicatario: c.denominacio_adjudicatari,
    adjudicatario_nif: c.identificacio_adjudicatari,
    ofertas_recibidas: toNum(c.ofertes_rebudes),
    estado: c.fase_publicacio || c.resultat,
    fecha_publicacion: fechaPub,
    fecha_adjudicacion: fechaAdj,
    fecha_formalizacion: toIsoDate(c.data_formalitzacio_contracte),
    anio: anio ? Number(anio) : undefined,
    es_pyme: isPyme,
    url: c.enllac_publicacio?.url,
  }
}

// ─── Filter set canónico (compatible con UI tipo buscalicitaciones) ───
export interface SocrataFilters {
  q?: string
  type?: 'texto' | 'adjudicatario' | 'organo' | 'cpv'
  desde?: string
  hasta?: string
  anio?: number
  cpv?: string                      // CPV completo o prefijo
  cpv_div?: string                  // división de 2 dígitos
  tipo_contrato?: string            // 'Serveis' | 'Obres' | etc
  procedimiento?: string
  organo?: string                   // contains
  adjudicatario_nif?: string        // exact match (NIF)
  importe_min?: number
  importe_max?: number
  es_pyme?: boolean
  // ccaa y source no son filtrables aquí (sólo Catalunya por ahora)
  // pero los dejamos en la API para forward-compat
}

export interface SocrataPaging {
  limit?: number
  offset?: number
  order?: string
}

// ─── Constructor del WHERE clause SoQL (a partir de filtros canónicos) ───
function buildWhere(f: SocrataFilters): string[] {
  const w: string[] = []
  if (f.desde) w.push(`data_publicacio_contracte >= '${f.desde}T00:00:00'`)
  if (f.hasta) w.push(`data_publicacio_contracte <= '${f.hasta}T23:59:59'`)
  if (f.anio) {
    w.push(`data_publicacio_contracte >= '${f.anio}-01-01T00:00:00'`)
    w.push(`data_publicacio_contracte <= '${f.anio}-12-31T23:59:59'`)
  }
  // CPV: división tiene preferencia (más performante), si no usamos cpv completo
  if (f.cpv_div) w.push(`starts_with(codi_cpv, '${sqlStr(f.cpv_div)}')`)
  else if (f.cpv) w.push(`starts_with(codi_cpv, '${sqlStr(f.cpv)}')`)
  if (f.tipo_contrato) w.push(`tipus_contracte = '${sqlStr(f.tipo_contrato)}'`)
  if (f.procedimiento) w.push(`procediment = '${sqlStr(f.procedimiento)}'`)
  if (f.organo) w.push(`upper(nom_organ) like '%${sqlStr(f.organo.toUpperCase())}%'`)
  if (f.adjudicatario_nif) w.push(`identificacio_adjudicatari = '${sqlStr(f.adjudicatario_nif)}'`)
  // importes son strings en Socrata, hay que ignorarlos en $where (post-filtro)
  // es_pyme es post-filtro también
  return w
}

function buildQ(f: SocrataFilters): string | undefined {
  if (!f.q) return undefined
  // Si hay type específico, transformamos en filtro $where en lugar de $q
  // (más preciso) — pero para simplicidad usamos $q full-text siempre.
  return f.q
}

function applyClientFilters(items: NormalizedContrato[], f: SocrataFilters): NormalizedContrato[] {
  let out = items
  if (typeof f.importe_min === 'number') {
    out = out.filter(i => (i.importe_adjudicacion ?? i.importe_licitacion ?? 0) >= f.importe_min!)
  }
  if (typeof f.importe_max === 'number') {
    out = out.filter(i => {
      const v = i.importe_adjudicacion ?? i.importe_licitacion ?? 0
      return v > 0 && v <= f.importe_max!
    })
  }
  if (typeof f.es_pyme === 'boolean') {
    out = out.filter(i => i.es_pyme === f.es_pyme)
  }
  return out
}

// ─── Búsqueda principal ────────────────────────────────────
export async function searchCatalunya(
  f: SocrataFilters & SocrataPaging,
  timeoutMs = 8000,
): Promise<{ ok: boolean; items: NormalizedContrato[]; error?: string; ms: number }> {
  const t0 = Date.now()
  const url = new URL(ENDPOINT)
  const limit = Math.min(500, Math.max(1, f.limit ?? 50))
  const offset = Math.max(0, f.offset ?? 0)
  url.searchParams.set('$limit', String(limit))
  url.searchParams.set('$offset', String(offset))
  url.searchParams.set('$order', f.order || 'data_publicacio_contracte DESC NULL LAST')

  const q = buildQ(f)
  if (q) url.searchParams.set('$q', q)

  const w = buildWhere(f)
  if (w.length) url.searchParams.set('$where', w.join(' AND '))

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, items: [], error: `HTTP ${res.status}`, ms: Date.now() - t0 }
    const raw = (await res.json()) as CatalunyaContrato[]
    let items = raw.map(normalizeCatalunya)
    items = applyClientFilters(items, f)
    return { ok: true, items, ms: Date.now() - t0 }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, items: [], error: msg, ms: Date.now() - t0 }
  }
}

// ─── Cuenta total filtrada (para paginación) ─────────────
export async function countCatalunya(
  f: SocrataFilters,
  timeoutMs = 6000,
): Promise<number | null> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('$select', 'count(*) as n')
  const q = buildQ(f); if (q) url.searchParams.set('$q', q)
  const w = buildWhere(f); if (w.length) url.searchParams.set('$where', w.join(' AND '))
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
    return j[0]?.n ? Number(j[0].n) : null
  } catch { return null }
}

// ─── Aggregations: top empresas, top órganos, top CPV ─────
export interface AggRow {
  key: string
  label: string
  n_contratos: number
  // importe_total no disponible vía Socrata directo (campo es texto)
  // se calcula en post-procesado client-side si se piden los registros
}

async function socrataAgg<T>(params: URLSearchParams, timeoutMs = 8000): Promise<T[]> {
  const url = new URL(ENDPOINT)
  params.forEach((v, k) => url.searchParams.set(k, v))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return []
    return (await res.json()) as T[]
  } catch { return [] }
}

// Top empresas por número de contratos
export async function topEmpresas(
  f: SocrataFilters,
  limit = 50,
): Promise<AggRow[]> {
  const p = new URLSearchParams()
  p.set('$select', 'identificacio_adjudicatari, denominacio_adjudicatari, count(*) as n')
  const w = buildWhere(f)
  // Excluir filas sin adjudicatario
  w.push(`identificacio_adjudicatari is not null`)
  w.push(`denominacio_adjudicatari is not null`)
  p.set('$where', w.join(' AND '))
  if (f.q) p.set('$q', f.q)
  p.set('$group', 'identificacio_adjudicatari, denominacio_adjudicatari')
  p.set('$order', 'n DESC')
  p.set('$limit', String(limit))
  type Row = { identificacio_adjudicatari: string; denominacio_adjudicatari: string; n: string }
  const rows = await socrataAgg<Row>(p)
  return rows.map(r => ({
    key: r.identificacio_adjudicatari,
    label: r.denominacio_adjudicatari,
    n_contratos: Number(r.n),
  }))
}

// Top órganos contratantes por número de contratos
export async function topOrganos(
  f: SocrataFilters,
  limit = 50,
): Promise<AggRow[]> {
  const p = new URLSearchParams()
  p.set('$select', 'codi_dir3, nom_organ, count(*) as n')
  const w = buildWhere(f)
  w.push(`nom_organ is not null`)
  p.set('$where', w.join(' AND '))
  if (f.q) p.set('$q', f.q)
  p.set('$group', 'codi_dir3, nom_organ')
  p.set('$order', 'n DESC')
  p.set('$limit', String(limit))
  type Row = { codi_dir3?: string; nom_organ: string; n: string }
  const rows = await socrataAgg<Row>(p)
  return rows.map(r => ({
    key: r.codi_dir3 || r.nom_organ,
    label: r.nom_organ,
    n_contratos: Number(r.n),
  }))
}

// Top CPV (división de 2 dígitos) por número de contratos
export async function topCPV(
  f: SocrataFilters,
  limit = 50,
): Promise<AggRow[]> {
  const p = new URLSearchParams()
  p.set('$select', 'substring(codi_cpv, 1, 2) as cpv_div, count(*) as n')
  const w = buildWhere(f)
  w.push(`codi_cpv is not null`)
  w.push(`length(codi_cpv) >= 2`)
  p.set('$where', w.join(' AND '))
  if (f.q) p.set('$q', f.q)
  p.set('$group', 'cpv_div')
  p.set('$order', 'n DESC')
  p.set('$limit', String(limit))
  type Row = { cpv_div: string; n: string }
  const rows = await socrataAgg<Row>(p)
  return rows.map(r => ({
    key: r.cpv_div,
    label: `${r.cpv_div} · ${cpvDivLabel(r.cpv_div)}`,
    n_contratos: Number(r.n),
  }))
}

// Distribución por año (útil para gráfica de evolución temporal)
export async function distribucionPorAnio(
  f: SocrataFilters,
): Promise<Array<{ anio: number; n: number }>> {
  const p = new URLSearchParams()
  p.set('$select', "date_extract_y(data_publicacio_contracte) as y, count(*) as n")
  const w = buildWhere(f)
  w.push(`data_publicacio_contracte is not null`)
  p.set('$where', w.join(' AND '))
  if (f.q) p.set('$q', f.q)
  p.set('$group', 'y')
  p.set('$order', 'y ASC')
  p.set('$limit', '50')
  type Row = { y: string; n: string }
  const rows = await socrataAgg<Row>(p)
  return rows.map(r => ({ anio: Number(r.y), n: Number(r.n) }))
}

// ─── Catálogo de CPV (división) ──────────────────────────────
export const CPV_DIVISIONS: Array<{ code: string; label: string }> = [
  { code: '03', label: 'Productos agrícolas, ganaderos, pesca' },
  { code: '09', label: 'Combustibles, electricidad, energía' },
  { code: '14', label: 'Productos de minería, metales básicos' },
  { code: '15', label: 'Alimentos, bebidas, tabaco' },
  { code: '16', label: 'Maquinaria agrícola' },
  { code: '18', label: 'Ropa, calzado, equipaje' },
  { code: '19', label: 'Cuero y tejidos textiles' },
  { code: '22', label: 'Imprenta, publicaciones' },
  { code: '24', label: 'Productos químicos' },
  { code: '30', label: 'Equipos informáticos y de oficina' },
  { code: '31', label: 'Maquinaria, aparatos eléctricos' },
  { code: '32', label: 'Equipos de radio, TV, comunicaciones' },
  { code: '33', label: 'Equipos médicos, farmacéuticos' },
  { code: '34', label: 'Equipos de transporte y vehículos' },
  { code: '35', label: 'Seguridad, defensa, militar' },
  { code: '37', label: 'Instrumentos musicales, juegos' },
  { code: '38', label: 'Instrumentos de laboratorio, ópticos' },
  { code: '39', label: 'Mobiliario, productos de limpieza' },
  { code: '41', label: 'Agua captada y depurada' },
  { code: '42', label: 'Maquinaria industrial' },
  { code: '43', label: 'Maquinaria minería/construcción' },
  { code: '44', label: 'Materiales de construcción' },
  { code: '45', label: 'Construcción, obras' },
  { code: '48', label: 'Software' },
  { code: '50', label: 'Reparación y mantenimiento' },
  { code: '51', label: 'Servicios de instalación' },
  { code: '55', label: 'Servicios hostelería, catering' },
  { code: '60', label: 'Servicios de transporte' },
  { code: '63', label: 'Servicios auxiliares de transporte' },
  { code: '64', label: 'Servicios postales y telecomunicaciones' },
  { code: '65', label: 'Servicios públicos' },
  { code: '66', label: 'Servicios financieros y de seguros' },
  { code: '70', label: 'Servicios inmobiliarios' },
  { code: '71', label: 'Arquitectura, ingeniería, urbanismo' },
  { code: '72', label: 'Servicios TI' },
  { code: '73', label: 'Investigación y desarrollo' },
  { code: '75', label: 'Administración pública' },
  { code: '76', label: 'Servicios industria del petróleo y gas' },
  { code: '77', label: 'Servicios agrícolas, forestales' },
  { code: '79', label: 'Servicios de empresas: derecho, marketing' },
  { code: '80', label: 'Servicios educativos' },
  { code: '85', label: 'Salud y asistencia social' },
  { code: '90', label: 'Servicios saneamiento, medio ambiente' },
  { code: '92', label: 'Servicios recreativos, culturales, deportivos' },
  { code: '98', label: 'Otros servicios comunitarios, sociales' },
]

const CPV_DIV_LABEL: Record<string, string> = Object.fromEntries(
  CPV_DIVISIONS.map(d => [d.code, d.label]),
)
export function cpvDivLabel(code: string): string {
  return CPV_DIV_LABEL[code] || 'Otros'
}

// ─── Catálogos para filtros UI ─────────────────────────────
export const TIPOS_CONTRATO = [
  'Serveis', 'Obres', 'Subministrament', 'Mixt', 'Concessió',
  'Concessió de serveis', 'Patrimonial', 'Privat', 'Altres',
] as const

export const PROCEDIMIENTOS = [
  'Obert', 'Contracte menor', 'Restringit',
  'Negociat amb publicitat', 'Negociat sense publicitat',
  'Acord marc', 'Diàleg competitiu', 'Associació per la innovació', 'Altres',
] as const

// CCAA — para forward compatibility cuando añadamos más fuentes
export const CCAA_CODES = [
  { code: 'AN', label: 'Andalucía' },
  { code: 'AR', label: 'Aragón' },
  { code: 'AS', label: 'Asturias' },
  { code: 'CN', label: 'Canarias' },
  { code: 'CB', label: 'Cantabria' },
  { code: 'CL', label: 'Castilla y León' },
  { code: 'CM', label: 'Castilla-La Mancha' },
  { code: 'CT', label: 'Cataluña' },
  { code: 'CE', label: 'Ceuta' },
  { code: 'VC', label: 'Comunidad Valenciana' },
  { code: 'MD', label: 'Comunidad de Madrid' },
  { code: 'EX', label: 'Extremadura' },
  { code: 'GA', label: 'Galicia' },
  { code: 'IB', label: 'Islas Baleares' },
  { code: 'RI', label: 'La Rioja' },
  { code: 'ML', label: 'Melilla' },
  { code: 'NA', label: 'Navarra' },
  { code: 'PV', label: 'País Vasco' },
  { code: 'MC', label: 'Región de Murcia' },
] as const

export const SOURCES = [
  { code: 'CATALUNYA_SOCRATA', label: 'Catalunya · Open Data', activa: true },
  { code: 'PLACSP',            label: 'Plataforma Nacional',    activa: true },
  { code: 'MADRID_AYTO',       label: 'Madrid · Ayuntamiento',  activa: false },
  { code: 'MADRID_CAM',        label: 'Comunidad de Madrid',    activa: false },
  { code: 'GALICIA',           label: 'Galicia',                activa: false },
  { code: 'ANDALUCIA',         label: 'Andalucía',              activa: false },
  { code: 'EUSKADI',           label: 'País Vasco',             activa: false },
  { code: 'VALENCIA',          label: 'Comunidad Valenciana',   activa: false },
  { code: 'ASTURIAS',          label: 'Asturias',               activa: false },
  { code: 'TED',               label: 'DOUE (TED)',             activa: false },
] as const
