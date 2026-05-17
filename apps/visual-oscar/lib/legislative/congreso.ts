/**
 * Cliente Congreso de los Diputados — Open Data
 *
 * Hub: https://www.congreso.es/opendata
 *
 * Los datasets se publican como JSON/CSV/XML con nombre dinámico:
 *   /webpublica/opendata/<seccion>/<NombreDataset>__YYYYMMDDHHMMSS.{json,xml,csv}
 *
 * Es necesario primero scrapear /opendata/<seccion> para obtener el href
 * actual del fichero del día (timestamp cambia cada noche ~05:00 CEST).
 */

import type { LegislativeInitiative, Commission } from './types'

const BASE = 'https://www.congreso.es'
const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

interface IndexCache {
  ts: number
  hrefs: Record<string, string>
}
const indexCache: Map<string, IndexCache> = new Map()
const INDEX_TTL_MS = 60 * 60 * 1000 // 1 hora

/**
 * Scrapea la página de Open Data y extrae los hrefs de los datasets actuales.
 * Devuelve { datasetName: absoluteUrl } solo para JSON.
 */
async function indexSection(seccion: string): Promise<Record<string, string>> {
  const cached = indexCache.get(seccion)
  if (cached && Date.now() - cached.ts < INDEX_TTL_MS) return cached.hrefs

  const url = `${BASE}/opendata/${seccion}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return {}
    const html = await res.text()
    // Buscar enlaces a /webpublica/opendata/<seccion>/<NombreDataset>__\d+.json
    const re = /\/webpublica\/opendata\/[^"'\s]+__\d{14}\.json/g
    const matches = html.match(re) ?? []
    const hrefs: Record<string, string> = {}
    for (const path of matches) {
      const filename = path.split('/').pop()!
      const datasetName = filename.split('__')[0]
      hrefs[datasetName] = path.startsWith('http') ? path : `${BASE}${path}`
    }
    indexCache.set(seccion, { ts: Date.now(), hrefs })
    return hrefs
  } catch {
    return cached?.hrefs ?? {}
  } finally {
    clearTimeout(t)
  }
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 12000): Promise<T | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 3600 },
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

interface CongresoIniciativaRaw {
  TIPO?: string
  NUMERO_LEY?: string
  TITULO_LEY?: string
  TITULO?: string
  NUMERO_EXPEDIENTE?: string
  FECHA_PRESENTACION?: string
  FECHA_PUBLICACION?: string
  FECHA_BOLETIN?: string
  FECHA_LEY?: string
  PDF?: string
  ESTADO?: string
  SITUACION?: string
  PROMOTOR?: string
  AUTOR?: string
  GRUPO?: string
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
    'general','generales','público','públicas','real','decreto'])
  const words = titulo.toLowerCase().split(/\W+/).filter(w => w.length >= 6 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

function inferStage(estado: string | undefined): import('./types').Stage {
  if (!estado) return 'desconocido'
  const s = estado.toLowerCase()
  if (/aproba/.test(s)) return 'aprobado'
  if (/rechaza/.test(s)) return 'rechazado'
  if (/caduc/.test(s)) return 'caducado'
  if (/comisi/.test(s)) return 'comision'
  if (/enmiend/.test(s)) return 'enmiendas'
  if (/ponenc/.test(s)) return 'ponencia'
  if (/dicta/.test(s)) return 'dictamen'
  if (/pleno/.test(s)) return 'pleno-origen'
  if (/senado/.test(s)) return 'pleno-revision'
  if (/publicad/.test(s)) return 'publicado'
  if (/registr/.test(s)) return 'registrado'
  if (/calific/.test(s)) return 'calificacion'
  return 'desconocido'
}

function detectKindFromExp(numero: string, tipo?: string): 'PL' | 'PPL' | 'RDL' | 'LO' | 'PROP' | 'OTHER' {
  if (tipo) {
    const t = tipo.toLowerCase()
    if (/proyecto/.test(t)) return 'PL'
    if (/proposici/.test(t)) return 'PPL'
    if (/decreto-ley|decretoley/.test(t)) return 'RDL'
    if (/orgánica|organica/.test(t)) return 'LO'
  }
  // Por número de expediente: 121/* = PL, 122/* = PPL
  if (numero.startsWith('121')) return 'PL'
  if (numero.startsWith('122')) return 'PPL'
  if (numero.startsWith('130')) return 'RDL'
  return 'OTHER'
}

function parseFecha(s: string | undefined): string | null {
  if (!s) return null
  // Formatos comunes: "08/04/2026" → "2026-04-08"
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}

/**
 * Devuelve TODAS las iniciativas del Congreso XV en tramitación o aprobadas.
 * Combina los 4 datasets: ProyectosDeLey, ProposicionesDeLey, PropuestasDeReforma, IniciativasLegislativasAprobadas.
 */
export async function fetchCongresoInitiatives(): Promise<LegislativeInitiative[]> {
  const idx = await indexSection('iniciativas')
  const datasets = ['ProyectosDeLey', 'ProposicionesDeLey', 'PropuestasDeReforma', 'IniciativasLegislativasAprobadas']
  const all: LegislativeInitiative[] = []

  for (const ds of datasets) {
    const url = idx[ds]
    if (!url) continue
    const json = await fetchJson<CongresoIniciativaRaw[] | { data?: CongresoIniciativaRaw[] }>(url)
    if (!json) continue
    const rows: CongresoIniciativaRaw[] = Array.isArray(json) ? json : (json.data ?? [])

    for (const r of rows) {
      const titulo = (r.TITULO_LEY || r.TITULO || '').trim()
      const expediente = (r.NUMERO_EXPEDIENTE || (r.NUMERO_LEY ? `LEY-${r.NUMERO_LEY}/${ds.includes('Aprobad') ? 'BOE' : 'TRAM'}` : '')).trim()
      if (!titulo) continue

      const isApproved = ds === 'IniciativasLegislativasAprobadas'
      const kind = detectKindFromExp(expediente, r.TIPO)
      const stage: import('./types').Stage = isApproved ? 'publicado' : inferStage(r.ESTADO || r.SITUACION)
      const promotor = r.PROMOTOR || r.AUTOR || r.GRUPO || (kind === 'PL' ? 'Gobierno' : 'Grupo parlamentario')

      const fechaReg = parseFecha(r.FECHA_PRESENTACION)
      const fechaUpd = parseFecha(r.FECHA_BOLETIN || r.FECHA_PUBLICACION || r.FECHA_LEY)

      all.push({
        id: `cgr-${expediente || titulo.slice(0, 40)}`,
        ambito: 'nacional-congreso',
        ccaa: null,
        expediente,
        titulo,
        kind,
        materia: inferMateria(titulo),
        promotor,
        stage,
        fechaRegistro: fechaReg,
        fechaActualizacion: fechaUpd || new Date().toISOString(),
        urlOficial: r.PDF || `${BASE}/busqueda-de-iniciativas`,
        fuente: `congreso.es/opendata/${ds}`,
        tags: inferTags(titulo),
      })
    }
  }

  // Dedup por expediente
  const seen = new Map<string, LegislativeInitiative>()
  for (const it of all) {
    const key = it.expediente || it.id
    const prev = seen.get(key)
    // Si una iniciativa aparece en aprobadas + en tramitación, prevalece aprobada
    if (!prev || it.stage === 'publicado' || it.stage === 'aprobado') seen.set(key, it)
  }
  return Array.from(seen.values())
}

// ─── Comisiones (lista enumerada de la página oficial) ─────────────────────

/**
 * Lista canónica de comisiones del Congreso · legislatura XV.
 * Extraída de https://www.congreso.es/comisiones (códigos verificados).
 * Como el endpoint open-data de órganos es paginado y complejo, mantenemos
 * esta lista enumerada que actualizamos manualmente cuando cambia.
 */
const COMISIONES_CONGRESO_XV: Array<{
  codigo: string
  nombre: string
  kind: import('./types').CommissionKind
  isInvestigation?: boolean
  isMixta?: boolean
  parent?: string
}> = [
  // Permanentes legislativas
  { codigo: '301', nombre: 'Constitucional',                              kind: 'permanente' },
  { codigo: '302', nombre: 'Asuntos Exteriores',                          kind: 'permanente' },
  { codigo: '303', nombre: 'Justicia',                                    kind: 'permanente' },
  { codigo: '304', nombre: 'Defensa',                                     kind: 'permanente' },
  { codigo: '305', nombre: 'Hacienda y Función Pública',                  kind: 'permanente' },
  { codigo: '306', nombre: 'Interior',                                    kind: 'permanente' },
  { codigo: '307', nombre: 'Presupuestos',                                kind: 'permanente' },
  { codigo: '308', nombre: 'Educación, FP y Deportes',                    kind: 'permanente' },
  { codigo: '309', nombre: 'Trabajo, Economía Social, Inclusión y Seguridad Social', kind: 'permanente' },
  { codigo: '310', nombre: 'Industria y Turismo',                         kind: 'permanente' },
  { codigo: '311', nombre: 'Agricultura, Pesca y Alimentación',           kind: 'permanente' },
  { codigo: '312', nombre: 'Reglamento',                                  kind: 'permanente' },
  { codigo: '313', nombre: 'Estatuto del Diputado',                       kind: 'permanente' },
  { codigo: '314', nombre: 'Peticiones',                                  kind: 'permanente' },
  { codigo: '320', nombre: 'Igualdad',                                    kind: 'permanente' },
  { codigo: '326', nombre: 'Cooperación Internacional para el Desarrollo', kind: 'permanente' },
  { codigo: '327', nombre: 'Transportes y Movilidad Sostenible',          kind: 'permanente' },
  { codigo: '329', nombre: 'Interior',                                    kind: 'permanente' },
  { codigo: '330', nombre: 'Política Territorial',                        kind: 'permanente' },
  { codigo: '331', nombre: 'Calidad Democrática',                         kind: 'permanente' },
  { codigo: '332', nombre: 'Juventud e Infancia',                         kind: 'permanente' },
  { codigo: '333', nombre: 'Vivienda y Agenda Urbana',                    kind: 'permanente' },
  { codigo: '345', nombre: 'Derechos Sociales y Consumo',                 kind: 'permanente' },
  { codigo: '346', nombre: 'Política Social y Discapacidad',              kind: 'permanente' },
  // Sectoriales
  { codigo: '371', nombre: 'Cultura',                                     kind: 'permanente' },
  { codigo: '372', nombre: 'Sanidad',                                     kind: 'permanente' },
  { codigo: '373', nombre: 'Transición Ecológica y Reto Demográfico',     kind: 'permanente' },
  { codigo: '374', nombre: 'Asuntos Económicos y Transformación Digital', kind: 'permanente' },
  { codigo: '375', nombre: 'Ciencia, Innovación y Universidades',         kind: 'permanente' },
  // Mixtas Congreso-Senado
  { codigo: '317', nombre: 'Comisión Mixta para las Relaciones con el Tribunal de Cuentas', kind: 'mixta', isMixta: true },
  { codigo: '318', nombre: 'Comisión Mixta para la Unión Europea',         kind: 'mixta', isMixta: true },
  { codigo: '319', nombre: 'Comisión Mixta para el Estudio del Problema de las Drogas', kind: 'mixta', isMixta: true },
  // Especiales / no permanentes
  { codigo: '343', nombre: 'Pacto de Toledo',                              kind: 'no-permanente' },
  { codigo: '344', nombre: 'Seguridad Vial',                               kind: 'no-permanente' },
  { codigo: '338', nombre: 'Subcomisión de Violencia de Género',           kind: 'subcomision' },
  { codigo: '150', nombre: 'Comisión Consultiva de Nombramientos',         kind: 'no-permanente' },
  { codigo: '151', nombre: 'Comisión de Gastos Reservados',                kind: 'no-permanente' },
  // Investigación (actualizar según legislatura)
  { codigo: '365', nombre: 'Comisión de Investigación sobre la gestión de la DANA', kind: 'investigacion', isInvestigation: true },
  { codigo: '367', nombre: 'Comisión de Investigación "Operación Cataluña"', kind: 'investigacion', isInvestigation: true },
  { codigo: '368', nombre: 'Comisión de Investigación sobre los atentados de Barcelona y Cambrils', kind: 'investigacion', isInvestigation: true },
  { codigo: '362', nombre: 'Comisión de Investigación sobre el apagón eléctrico del 28 de abril de 2025', kind: 'investigacion', isInvestigation: true },
]

export function getCongresoComisiones(): Commission[] {
  return COMISIONES_CONGRESO_XV.map(c => ({
    id: `cgr-${c.codigo}`,
    codigo: c.codigo,
    nombre: c.nombre,
    camara: c.isMixta ? 'mixta' : 'congreso',
    ccaa: null,
    kind: c.kind,
    active: true,
    isInvestigation: !!c.isInvestigation,
    url: `${BASE}/comisiones?p_p_id=organos&_organos_codComision=${c.codigo}`,
  }))
}
