/**
 * Cliente Congreso de los Diputados — Open Data + Scraping de comisiones.
 *
 * Datos de iniciativas:
 *   - Scrape https://www.congreso.es/opendata/iniciativas (302 → /es/opendata/iniciativas)
 *   - Extract hrefs *.json del día (timestamp rotativo ~05:00 CEST)
 *   - 4 datasets: ProyectosDeLey, ProposicionesDeLey, PropuestasDeReforma, IniciativasLegislativasAprobadas
 *   - JSON es array directo
 *
 * Datos de comisiones:
 *   - Scrape /comisiones para extraer codComision
 *   - POST AJAX a /es/organos/composicion-en-la-legislatura para composición real
 *
 * IMPORTANTE: User-Agent obligatorio (WAF rechaza sin él)
 */

import type { LegislativeInitiative, Commission, Stage } from './types'

const BASE = 'https://www.congreso.es'
const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

interface IndexCache { ts: number; hrefs: Record<string, string> }
const indexCache: Map<string, IndexCache> = new Map()
const INDEX_TTL_MS = 60 * 60 * 1000

async function indexSection(seccion: string): Promise<Record<string, string>> {
  const cached = indexCache.get(seccion)
  if (cached && Date.now() - cached.ts < INDEX_TTL_MS) return cached.hrefs

  const url = `${BASE}/opendata/${seccion}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      next: { revalidate: 3600 },
      redirect: 'follow',
    })
    if (!res.ok) return cached?.hrefs ?? {}
    const html = await res.text()
    // Match: href="/webpublica/opendata/iniciativas/Name__20260517050010.json"
    const re = /href="(\/webpublica\/opendata\/[^"]+\/([A-Za-z]+)__\d{14}\.json)"/g
    const hrefs: Record<string, string> = {}
    let m
    while ((m = re.exec(html)) !== null) {
      const path = m[1]
      const datasetName = m[2]
      hrefs[datasetName] = `${BASE}${path}`
    }
    indexCache.set(seccion, { ts: Date.now(), hrefs })
    return hrefs
  } catch {
    return cached?.hrefs ?? {}
  } finally {
    clearTimeout(t)
  }
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 15000): Promise<T | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 3600 },
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─── Iniciativas ────────────────────────────────────────────────────────────

/** Shape REAL del dataset ProyectosDeLey (rico) */
interface CongresoIniciativaProyecto {
  LEGISLATURA?: string
  SUPERTIPO?: string
  AGRUPACION?: string
  TIPO?: string
  OBJETO?: string                  // descripción completa
  NUMEXPEDIENTE?: string
  FECHAPRESENTACION?: string       // DD/MM/YYYY
  FECHACALIFICACION?: string
  AUTOR?: string
  TIPOTRAMITACION?: string         // "Urgente" | "Ordinaria"
  RESULTADOTRAMITACION?: string
  SITUACIONACTUAL?: string         // ← clave para mapear stage real
  COMISIONCOMPETENTE?: string
  PLAZOS?: string                  // separado por \n
  PONENTES?: string                // separado por \n
  TRAMITACIONSEGUIDA?: string      // ORO PURO: pasos completados con fechas
  INICIATIVASRELACIONADAS?: string
  ENLACESBOCG?: string
  ENLACESDS?: string
}

/** Shape simple para IniciativasLegislativasAprobadas */
interface CongresoLeyAprobada {
  TIPO?: string
  NUMERO_LEY?: string
  TITULO_LEY?: string
  NUMERO_BOLETIN?: string
  FECHA_BOLETIN?: string
  FECHA_LEY?: string
  PDF?: string
}

function inferMateria(titulo: string): import('./types').Materia {
  const t = titulo.toLowerCase()
  if (/vivienda|alquiler|hipoteca/.test(t)) return 'Vivienda'
  if (/sanidad|sanitar|salud/.test(t)) return 'Sanidad'
  if (/educa|universi|escuela/.test(t)) return 'Educación'
  if (/justicia|judicial|cgpj|fiscal|penal/.test(t)) return 'Justicia'
  if (/defensa|militar|fuerzas armadas/.test(t)) return 'Defensa'
  if (/migra|extranj|asilo|refugia/.test(t)) return 'Migración'
  if (/energ|electric|renovable|combustible/.test(t)) return 'Energía'
  if (/digital|telecom|datos|inteligencia artificial|ciber/.test(t)) return 'Digital'
  if (/agra|agricul|ganader|pesca/.test(t)) return 'Agraria'
  if (/cultura|patrimonio|memoria/.test(t)) return 'Cultura'
  if (/intern|exter|tratado/.test(t)) return 'Internacional'
  if (/autonom|territori|financiación|comunidades/.test(t)) return 'Territorial'
  if (/social|pensión|empleo|trabajo|salario/.test(t)) return 'Social'
  if (/fisca|tribut|impuest|presupuest|económic/.test(t)) return 'Económica'
  return 'Otro'
}

function inferTags(titulo: string): string[] {
  const STOP = new Set(['proyecto','proposicion','proposición','ley','orgánica','organica','reforma',
    'normas','normativa','ámbito','medidas','sobre','desde','hasta','entre','según','según',
    'general','generales','público','públicas','real','decreto','relativa','relativo','presentada'])
  const words = titulo.toLowerCase().split(/\W+/).filter(w => w.length >= 6 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

/** Mapea SITUACIONACTUAL del Congreso a stage interno */
function mapSituacionToStage(situacion: string | undefined, tramitacionSeguida?: string): Stage {
  if (!situacion && !tramitacionSeguida) return 'desconocido'
  const s = (situacion || tramitacionSeguida || '').toLowerCase()
  if (/publicad|boe/.test(s)) return 'publicado'
  if (/aprobad.*pleno|aprobad.*definitiv/.test(s)) return 'aprobado'
  if (/aprobad/.test(s)) return 'aprobado'
  if (/rechaz/.test(s)) return 'rechazado'
  if (/caduc/.test(s)) return 'caducado'
  if (/retira/.test(s)) return 'caducado'
  if (/senado|cámara revisora|camara revisora/.test(s)) return 'pleno-revision'
  if (/pleno/.test(s)) return 'pleno-origen'
  if (/dictamen/.test(s)) return 'dictamen'
  if (/ponenci/.test(s)) return 'ponencia'
  if (/enmiend/.test(s)) return 'enmiendas'
  if (/comisi/.test(s)) return 'comision'
  if (/calific/.test(s)) return 'calificacion'
  if (/registr|presentad/.test(s)) return 'registrado'
  return 'desconocido'
}

function detectKindFromExp(numero: string, supertipo?: string, tipo?: string): 'PL' | 'PPL' | 'RDL' | 'LO' | 'PROP' | 'OTHER' {
  if (tipo) {
    const t = tipo.toLowerCase()
    if (/orgánica|organica/.test(t)) return 'LO'
    if (/decreto-ley|decretoley/.test(t)) return 'RDL'
  }
  if (supertipo) {
    const s = supertipo.toLowerCase()
    if (/proyecto/.test(s)) return 'PL'
    if (/proposici/.test(s)) return 'PPL'
    if (/decreto-ley|decreto ley/.test(s)) return 'RDL'
  }
  // Por número de expediente
  if (numero.startsWith('121')) return 'PL'
  if (numero.startsWith('122')) return 'PPL'
  if (numero.startsWith('130')) return 'RDL'
  return 'OTHER'
}

function parseFecha(s: string | undefined): string | null {
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}

/**
 * Devuelve TODAS las iniciativas del Congreso XV en tramitación o aprobadas.
 * Usa los 4 datasets oficiales.
 */
export async function fetchCongresoInitiatives(): Promise<LegislativeInitiative[]> {
  const idx = await indexSection('iniciativas')
  const all: LegislativeInitiative[] = []

  // 1) Datasets ricos: ProyectosDeLey, ProposicionesDeLey, PropuestasDeReforma
  for (const ds of ['ProyectosDeLey', 'ProposicionesDeLey', 'PropuestasDeReforma'] as const) {
    const url = idx[ds]
    if (!url) continue
    const json = await fetchJson<CongresoIniciativaProyecto[] | { data?: CongresoIniciativaProyecto[] }>(url)
    if (!json) continue
    const rows: CongresoIniciativaProyecto[] = Array.isArray(json) ? json : (json.data ?? [])

    for (const r of rows) {
      const titulo = (r.OBJETO || '').trim()
      const expediente = (r.NUMEXPEDIENTE || '').trim()
      if (!titulo) continue

      const kind = detectKindFromExp(expediente, r.SUPERTIPO, r.TIPO)
      const stage = mapSituacionToStage(r.SITUACIONACTUAL, r.TRAMITACIONSEGUIDA)
      const promotor = (r.AUTOR || (kind === 'PL' ? 'Gobierno' : 'Grupo parlamentario')).split('\n')[0].trim()

      all.push({
        id: `cgr-${expediente || titulo.slice(0, 40).replace(/\s/g, '-')}`,
        ambito: 'nacional-congreso',
        ccaa: null,
        expediente,
        titulo,
        kind,
        materia: inferMateria(titulo),
        promotor,
        stage,
        fechaRegistro: parseFecha(r.FECHAPRESENTACION),
        fechaActualizacion: parseFecha(r.FECHACALIFICACION) || parseFecha(r.FECHAPRESENTACION) || new Date().toISOString(),
        urlOficial: `${BASE}/busqueda-de-iniciativas?p_p_id=iniciativas&_iniciativas_legislatura=XV&_iniciativas_numExp=${encodeURIComponent(expediente)}`,
        fuente: `congreso.es/opendata/${ds}`,
        tags: inferTags(titulo),
        proxTramite: r.SITUACIONACTUAL,
      })
    }
  }

  // 2) Leyes aprobadas (dataset simple)
  const aprobadasUrl = idx['IniciativasLegislativasAprobadas']
  if (aprobadasUrl) {
    const json = await fetchJson<CongresoLeyAprobada[]>(aprobadasUrl)
    const rows: CongresoLeyAprobada[] = Array.isArray(json) ? json : []
    for (const r of rows) {
      const titulo = (r.TITULO_LEY || '').trim()
      if (!titulo) continue
      const expediente = r.NUMERO_LEY ? `LEY-${r.NUMERO_LEY}` : titulo.slice(0, 30)
      // Solo añadir si no la hemos visto ya (las leyes están en proyectos también)
      if (all.some(it => it.titulo === titulo)) continue
      all.push({
        id: `cgr-aprobada-${expediente}`,
        ambito: 'nacional-congreso',
        ccaa: null,
        expediente,
        titulo,
        kind: 'PL',
        materia: inferMateria(titulo),
        promotor: 'Gobierno / Pleno',
        stage: 'publicado',
        fechaRegistro: null,
        fechaActualizacion: parseFecha(r.FECHA_LEY),
        urlOficial: r.PDF || `${BASE}/constitucion`,
        fuente: 'congreso.es/opendata/IniciativasLegislativasAprobadas',
        tags: inferTags(titulo),
      })
    }
  }

  // Dedup por expediente · preferir aprobado/publicado
  const seen = new Map<string, LegislativeInitiative>()
  for (const it of all) {
    const key = it.expediente || it.id
    const prev = seen.get(key)
    if (!prev || it.stage === 'publicado' || it.stage === 'aprobado') seen.set(key, it)
  }
  return Array.from(seen.values())
}

// ─── Detalle ampliado de una iniciativa (TRAMITACIONSEGUIDA, PONENTES, etc.) ─

export interface CongresoInitiativeDetail extends LegislativeInitiative {
  objeto: string
  autor: string
  tipoTramitacion?: string
  comisionCompetente?: string
  ponentes: string[]
  plazos: string[]
  tramitacionSeguida: string[]
  iniciativasRelacionadas: string[]
  enlacesBOCG: string[]
  enlacesDS: string[]
}

/**
 * Devuelve el detalle ampliado de una iniciativa concreta del Congreso.
 * Útil para Trazabilidad (TRAMITACIONSEGUIDA) y Huella (PONENTES).
 */
export async function fetchCongresoInitiativeDetail(expediente: string): Promise<CongresoInitiativeDetail | null> {
  const idx = await indexSection('iniciativas')
  for (const ds of ['ProyectosDeLey', 'ProposicionesDeLey', 'PropuestasDeReforma'] as const) {
    const url = idx[ds]
    if (!url) continue
    const json = await fetchJson<CongresoIniciativaProyecto[]>(url)
    const rows: CongresoIniciativaProyecto[] = Array.isArray(json) ? json : []
    const row = rows.find(r => (r.NUMEXPEDIENTE || '').trim() === expediente)
    if (!row) continue

    const titulo = (row.OBJETO || '').trim()
    const kind = detectKindFromExp(expediente, row.SUPERTIPO, row.TIPO)
    const stage = mapSituacionToStage(row.SITUACIONACTUAL, row.TRAMITACIONSEGUIDA)

    return {
      id: `cgr-${expediente}`,
      ambito: 'nacional-congreso',
      ccaa: null,
      expediente,
      titulo,
      kind,
      materia: inferMateria(titulo),
      promotor: (row.AUTOR || '').split('\n')[0].trim(),
      stage,
      fechaRegistro: parseFecha(row.FECHAPRESENTACION),
      fechaActualizacion: parseFecha(row.FECHACALIFICACION),
      urlOficial: `${BASE}/busqueda-de-iniciativas?p_p_id=iniciativas&_iniciativas_legislatura=XV&_iniciativas_numExp=${encodeURIComponent(expediente)}`,
      fuente: `congreso.es/opendata/${ds}`,
      tags: inferTags(titulo),
      objeto: titulo,
      autor: (row.AUTOR || '').trim(),
      tipoTramitacion: row.TIPOTRAMITACION,
      comisionCompetente: row.COMISIONCOMPETENTE,
      ponentes: (row.PONENTES || '').split('\n').map(s => s.trim()).filter(Boolean),
      plazos: (row.PLAZOS || '').split('\n').map(s => s.trim()).filter(Boolean),
      tramitacionSeguida: (row.TRAMITACIONSEGUIDA || '').split('\n').map(s => s.trim()).filter(Boolean),
      iniciativasRelacionadas: (row.INICIATIVASRELACIONADAS || '').split('\n').map(s => s.trim()).filter(Boolean),
      enlacesBOCG: (row.ENLACESBOCG || '').split('\n').map(s => s.trim()).filter(Boolean),
      enlacesDS: (row.ENLACESDS || '').split('\n').map(s => s.trim()).filter(Boolean),
    }
  }
  return null
}

// ─── Comisiones · scrape real ───────────────────────────────────────────────

interface CommissionListCache { ts: number; data: Commission[] }
let commListCache: CommissionListCache | null = null
const COMM_LIST_TTL = 6 * 60 * 60 * 1000  // 6h

/**
 * Scrape /comisiones para extraer los códigos REALES de comisiones activas.
 * No hay endpoint JSON oficial — toca scraping HTML.
 */
export async function fetchCongresoComisiones(): Promise<Commission[]> {
  if (commListCache && Date.now() - commListCache.ts < COMM_LIST_TTL) return commListCache.data

  const url = `${BASE}/comisiones`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 21600 }, // 6h
      redirect: 'follow',
    })
    if (!res.ok) return commListCache?.data ?? []
    const html = await res.text()
    // Extrae: codComision=NNN + texto del enlace
    // Patrón típico: <a href="...codComision=305...">Comisión de Hacienda y Función Pública</a>
    const re = /href="[^"]*_organos_codComision=(\d+)[^"]*"[^>]*>\s*([^<]+?)\s*</g
    const seen = new Map<string, string>()
    let m
    while ((m = re.exec(html)) !== null) {
      const codigo = m[1]
      // Decodificar entidades + expandir abreviaturas
      let nombre = m[2].replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
      nombre = nombre.replace(/^Com\.Investiga?\.?\s+/i, 'Comisión de Investigación sobre ')
                     .replace(/^Comi\.Investig?\.?\s+/i, 'Comisión de Investigación sobre ')
                     .replace(/^Comi?\.Invest\.?\s+/i, 'Comisión de Investigación sobre ')
                     .replace(/\bsuminis(?:tro|\.)/gi, 'suministro')
                     .replace(/\binterrup\.?\b/g, 'interrupción')
                     .replace(/\beléctric\b/g, 'eléctrico')
                     .replace(/\bregul\.\s+/g, 'regulación de ')
                     .replace(/\binfor\.\s+/g, 'información ')
      if (nombre.length < 5) continue
      if (!seen.has(codigo)) seen.set(codigo, nombre)
    }

    const commissions: Commission[] = []
    for (const [codigo, nombre] of seen) {
      const nombreLower = nombre.toLowerCase()
      const isInvestigation = /investigaci/.test(nombreLower)
      const isMixta = /mixt/.test(nombreLower)
      const kind: import('./types').CommissionKind =
        isInvestigation ? 'investigacion'
        : isMixta ? 'mixta'
        : /no permanente|no_permanente/.test(nombreLower) ? 'no-permanente'
        : /sub/.test(nombreLower) ? 'subcomision'
        : /ponencia/.test(nombreLower) ? 'ponencia'
        : 'permanente'

      commissions.push({
        id: `cgr-${codigo}`,
        codigo,
        nombre,
        camara: isMixta ? 'mixta' : 'congreso',
        ccaa: null,
        kind,
        active: true,
        isInvestigation,
        url: `${BASE}/comisiones?p_p_id=organos&_organos_codComision=${codigo}`,
      })
    }
    commListCache = { ts: Date.now(), data: commissions }
    return commissions
  } catch {
    return commListCache?.data ?? []
  } finally {
    clearTimeout(t)
  }
}

// ─── Composición real de una comisión ───────────────────────────────────────

export interface CommissionMember {
  id: number
  nombre: string
  cargo: string  // Presidente, Vicepresidenta Primera, Secretario, Vocal, Portavoz
  grupo: string  // GS, GP, GVOX, GSUMAR, GR, GJxCAT, GEH Bildu, GV (EAJ-PNV), GMx
  fechaAlta: string
  fechaBaja: string  // vacío = activo
  urlFicha: string
}

export interface CommissionComposition {
  codigo: string
  fechaConstitucion: string | null
  fechaDisolucion: string | null
  members: CommissionMember[]
  byGroup: Record<string, number>
  total: number
  active: boolean
}

const CGR_GROUP_LABEL: Record<string, { label: string; color: string }> = {
  'GS':         { label: 'PSOE',     color: '#E1322D' },
  'GP':         { label: 'PP',       color: '#1F4E8C' },
  'GVOX':       { label: 'VOX',      color: '#5BA02E' },
  'GSUMAR':     { label: 'Sumar',    color: '#D43F8D' },
  'GR':         { label: 'ERC',      color: '#E8A030' },
  'GJxCAT':     { label: 'Junts',    color: '#1FA89B' },
  'GEH Bildu':  { label: 'EH Bildu', color: '#3F7A3A' },
  'GV (EAJ-PNV)': { label: 'PNV',    color: '#7DB94B' },
  'GMx':        { label: 'Mixto',    color: '#94A3B8' },
  '':           { label: '—',        color: '#525252' },
}

export function groupInfo(siglas: string): { label: string; color: string } {
  return CGR_GROUP_LABEL[siglas] || { label: siglas, color: '#6E6E73' }
}

/**
 * POST al endpoint AJAX del Congreso para obtener la composición real.
 * Devuelve miembros, fechas, cargos y grupos.
 */
export async function fetchCommissionComposition(codigo: string, organoSup = '1'): Promise<CommissionComposition | null> {
  const url = `${BASE}/es/organos/composicion-en-la-legislatura?p_p_id=organos&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=searchOrgano&p_p_cacheability=cacheLevelPage&_organos_selectedLegislatura=XV&_organos_selectedOrganoSup=${organoSup}&_organos_selectedSuborgano=${codigo}`
  const body = `_organos_selectedLegislatura=XV&_organos_compoHistorica=false&_organos_selectedOrganoSup=${organoSup}&_organos_selectedSuborgano=${codigo}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'text/html, */*',
      },
      body,
      signal: controller.signal,
      next: { revalidate: 7200 }, // 2h
    })
    if (!res.ok) return null
    const text = await res.text()
    const json = JSON.parse(text)

    interface RawMember {
      idCargo?: number
      apellidosNombre: string
      fechaAltaFormat?: string
      fechaBajaFormat?: string
      urlFichaDiputado?: string
      descCargo?: string
      siglas?: string
    }

    const members: CommissionMember[] = (json.data || []).map((m: RawMember) => ({
      id: m.idCargo || 0,
      nombre: m.apellidosNombre || '',
      cargo: m.descCargo || 'Vocal',
      grupo: m.siglas || '',
      fechaAlta: m.fechaAltaFormat || '',
      fechaBaja: m.fechaBajaFormat || '',
      urlFicha: m.urlFichaDiputado ? `${BASE}${m.urlFichaDiputado}` : '',
    }))

    const byGroup: Record<string, number> = {}
    for (const m of members) {
      if (m.fechaBaja) continue
      byGroup[m.grupo || '—'] = (byGroup[m.grupo || '—'] || 0) + 1
    }

    return {
      codigo,
      fechaConstitucion: json.fechaConstitucion?.fechaConstitucion || null,
      fechaDisolucion: json.fechaDisolucion?.fechaDisolucion || null,
      members: members.filter(m => !m.fechaBaja),
      byGroup,
      total: members.filter(m => !m.fechaBaja).length,
      active: !json.fechaDisolucion?.fechaDisolucion,
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─── Próximas convocatorias ─────────────────────────────────────────────────

export interface CommissionSchedule {
  hasSession: boolean
  message: string
  url: string
}

export async function fetchCommissionSchedule(codigo: string): Promise<CommissionSchedule> {
  const url = `${BASE}/es/actualidad/sesiones-de-comisiones?modo=organoSesiones&codOrgano=${codigo}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 3600 },
      redirect: 'follow',
    })
    if (!res.ok) return { hasSession: false, message: '—', url }
    const html = await res.text()
    const noSession = html.includes('No hay establecido Orden del Día')
    return {
      hasSession: !noSession,
      message: noSession ? 'Sin sesión convocada' : 'Sesión convocada — ver agenda oficial',
      url,
    }
  } catch {
    return { hasSession: false, message: '—', url }
  } finally {
    clearTimeout(t)
  }
}

/** Determina el organoSup (familia) para una comisión a partir de su nombre */
export function inferOrganoSup(c: Commission): string {
  if (c.isInvestigation) return '152'
  if (c.kind === 'mixta') return '157'
  return '1'  // Permanentes Legislativas (default)
}
