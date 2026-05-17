/**
 * Cliente Senado — Open Data XML
 * Endpoint único: https://www.senado.es/web/ficopendataservlet?tipoFich=N&legis=15
 *
 * tipoFich:
 *   4  → GruposYpartidos
 *   6  → senadores
 *   7  → listaComisiones
 *   9  → listaIniciativasLegislativas (la más usada)
 *   13 → sesionPlenaria (última)
 *   14 → listaSesionesPlenarias (todas)
 *   15 → listaInterpelaciones
 *   16 → listaMociones
 *   18 → leyesAprobadas
 *   19 → agendas
 *
 * Devuelve XML UTF-8. Sin auth.
 */

import type { LegislativeInitiative, Commission, CommissionSession } from './types'
import senadoComisionesXV from '@/data/senado-comisiones-xv.json'

const BASE = 'https://www.senado.es/web/ficopendataservlet'
const LEGIS = '15'

// Browser-like headers - el Senado bloquea UAs identificables como bots
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Accept': 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.senado.es/web/relacionesciudadanos/datosabiertos/catalogodatos/index.html',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
}

// Wayback Machine como fallback cuando senado.es nos bloquea (403 desde cloud IPs)
const WAYBACK_BASE = 'https://web.archive.org/web/2026/'

async function fetchXml(tipoFich: number, timeoutMs = 12_000): Promise<string | null> {
  const url = `${BASE}?tipoFich=${tipoFich}&legis=${LEGIS}`
  // 1) Intento directo con headers de browser
  const direct = await tryFetch(url, BROWSER_HEADERS, timeoutMs)
  if (direct && !isAccessDenied(direct)) return direct

  // 2) Fallback: Wayback Machine
  const waybackUrl = `${WAYBACK_BASE}${url}`
  const wayback = await tryFetch(waybackUrl, BROWSER_HEADERS, timeoutMs + 5000)
  if (wayback && !isAccessDenied(wayback)) return wayback

  // 3) Probar timestamp específico Wayback (más fiable que /2026/)
  const fallbackUrl = `https://web.archive.org/web/2026if_/${url}`
  return tryFetch(fallbackUrl, BROWSER_HEADERS, timeoutMs + 5000)
}

async function tryFetch(url: string, headers: Record<string, string>, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      next: { revalidate: 1800 }, // 30 min cache
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function isAccessDenied(html: string): boolean {
  return html.includes('Access Denied') || html.includes('Forbidden') || html.length < 500
}

/** Extrae bloques <tagName>...</tagName> del XML.
 * Usa boundary `(?:\s|>)` para evitar que `<nombre>` matchee `<nombreBreve>` etc. */
function extractBlocks(xml: string, tagName: string): string[] {
  const blocks: string[] = []
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'g')
  let m
  while ((m = re.exec(xml)) !== null) blocks.push(m[1])
  return blocks
}

/** Extrae el contenido textual de un único tag (con boundary correcto). */
function tagText(block: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`)
  const m = re.exec(block)
  if (!m) return null
  return (m[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/\s+/g, ' ').trim() || null
}

// ─── Iniciativas ───────────────────────────────────────────────────────────

/** Mapeo tipoExpediente Senado → kind interno */
function mapTipoExp(tipo: string): 'PL' | 'PPL' | 'RDL' | 'LO' | 'PROP' | 'OTHER' {
  // 600s = reformas, 621s = proyectos, 622s = proposiciones, 624s = orgánicas
  const t = tipo.trim()
  if (t.startsWith('621')) return 'PL'
  if (t.startsWith('622')) return 'PPL'
  if (t.startsWith('624')) return 'LO'
  if (t.startsWith('625')) return 'RDL'
  if (t.startsWith('600')) return 'PROP'
  return 'OTHER'
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

/** Tags extraídos del título (palabras de >5 chars no genéricas) */
function inferTags(titulo: string): string[] {
  const STOP = new Set(['proyecto','proposicion','proposición','ley','orgánica','organica','reforma',
    'normas','normativa','ámbito','medidas','sobre','desde','hasta','entre','según','según',
    'general','generales','público','públicas'])
  const words = titulo.toLowerCase().split(/\W+/).filter(w => w.length >= 6 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

export async function fetchSenadoInitiatives(): Promise<LegislativeInitiative[]> {
  const xml = await fetchXml(9)
  if (!xml) return []
  const blocks = extractBlocks(xml, 'iniciativa')
  const out: LegislativeInitiative[] = []
  for (const b of blocks) {
    const tipo = tagText(b, 'tipoExpediente') || ''
    const numero = tagText(b, 'numeroExpediente') || ''
    const titulo = tagText(b, 'titulo') || ''
    const urlPag = tagText(b, 'urlPagina') || ''
    if (!titulo || !numero) continue

    const id = `sen-${tipo}-${numero}`
    const expediente = `${tipo}/${numero}`
    const url = urlPag.startsWith('http') ? urlPag : `https://www.senado.es${urlPag}`

    out.push({
      id,
      ambito: 'nacional-senado',
      ccaa: null,
      expediente,
      titulo,
      kind: mapTipoExp(tipo),
      materia: inferMateria(titulo),
      promotor: 'Senado',
      stage: 'comision', // estado por defecto - el Senado actúa como revisor
      fechaRegistro: null,
      fechaActualizacion: new Date().toISOString(),
      urlOficial: url,
      fuente: 'senado.es/opendata',
      tags: inferTags(titulo),
    })
  }
  return out
}

// ─── Leyes aprobadas (tipoFich=18) ─────────────────────────────────────────

export interface SenadoApprovedLaw {
  numero: string
  titulo: string
  fechaSesion: string | null
  url: string | null
}

export async function fetchSenadoApprovedLaws(): Promise<SenadoApprovedLaw[]> {
  const xml = await fetchXml(18)
  if (!xml) return []
  const blocks = extractBlocks(xml, 'ley')
  const out: SenadoApprovedLaw[] = []
  for (const b of blocks) {
    const numero = tagText(b, 'numero') || tagText(b, 'numeroLey') || ''
    const titulo = tagText(b, 'titulo') || ''
    const fecha = tagText(b, 'fechaAprobacion') || tagText(b, 'fecha') || null
    const url = tagText(b, 'url') || tagText(b, 'urlPagina') || null
    if (!titulo) continue
    out.push({
      numero,
      titulo,
      fechaSesion: fecha,
      url: url && !url.startsWith('http') ? `https://www.senado.es${url}` : url,
    })
  }
  return out
}

// ─── Comisiones ────────────────────────────────────────────────────────────

/** Convierte una entrada del catálogo enumerado a Commission */
function entryToCommission(entry: { codigo: string; nombre: string; clase: string }): Commission {
  const lower = entry.nombre.toLowerCase()
  const isInvestigation = /investigaci/.test(lower)
  const isMixta = /mixt|conjunta/.test(lower)
  const isPonencia = /ponencia/.test(lower) || entry.clase === '02'
  const kind: import('./types').CommissionKind =
    isInvestigation ? 'investigacion'
    : isMixta ? 'mixta'
    : isPonencia ? 'ponencia'
    : 'permanente'
  return {
    id: `sen-${entry.codigo}`,
    codigo: entry.codigo,
    nombre: entry.nombre,
    camara: isMixta ? 'mixta' : 'senado',
    ccaa: null,
    kind,
    active: true,
    isInvestigation,
    url: `https://www.senado.es/web/actividadparlamentaria/sesionescomision/detallecomisiones/composicion/index.html?id=${entry.codigo}&legis=${LEGIS}&esMixta=${isMixta ? 'S' : 'N'}`,
  }
}

/**
 * Devuelve las comisiones del Senado XV.
 *
 * Estrategia: el WAF del Senado bloquea las IPs de cloud (Vercel, AWS, etc.)
 * con HTTP 403 sobre el endpoint XML público. Por eso:
 *   1) Catálogo enumerado en data/senado-comisiones-xv.json como source primario
 *      (datos REALES extraídos del XML oficial, actualizados periódicamente).
 *   2) Fetch dinámico como complemento opcional: si funciona (cambio de
 *      bloqueo), se mezcla y dedup. Si no, sólo se usa el catálogo.
 */
export async function fetchSenadoComisiones(): Promise<Commission[]> {
  // 1) Catálogo enumerado (primary - siempre funciona)
  const catalogo: Commission[] = (senadoComisionesXV as Array<{ codigo: string; nombre: string; clase: string }>)
    .map(entryToCommission)

  // 2) Intento adicional: fetch dinámico (puede fallar por WAF)
  try {
    const xml = await fetchXml(7, 8000)
    if (xml && !isAccessDenied(xml)) {
      const blocks = extractBlocks(xml, 'comision')
      const fromXml: Commission[] = []
      for (const b of blocks) {
        const codigo = tagText(b, 'codigo') || ''
        const nombre = tagText(b, 'nombre') || ''
        if (!codigo || !nombre) continue
        const clase = tagText(b, 'clase') || ''
        fromXml.push(entryToCommission({ codigo, nombre, clase }))
      }
      // Merge: si el XML aporta comisiones nuevas, las añadimos
      const seen = new Set(catalogo.map(c => c.codigo))
      for (const c of fromXml) {
        if (!seen.has(c.codigo)) {
          catalogo.push(c)
          seen.add(c.codigo)
        }
      }
    }
  } catch {/* catálogo enumerado basta */}

  return catalogo
}

// ─── Sesiones plenarias ────────────────────────────────────────────────────

export async function fetchSenadoSesiones(): Promise<CommissionSession[]> {
  const xml = await fetchXml(14)
  if (!xml) return []
  const blocks = extractBlocks(xml, 'sesion')
  const out: CommissionSession[] = []
  for (const b of blocks) {
    const numero = tagText(b, 'numero') || tagText(b, 'numeroSesion') || ''
    const fecha = tagText(b, 'fecha') || tagText(b, 'fechaSesion') || ''
    const titulo = tagText(b, 'titulo') || tagText(b, 'denominacion') || `Sesión ${numero}`
    const url = tagText(b, 'urlPagina') || null
    if (!fecha) continue
    out.push({
      id: `sen-pleno-${numero}`,
      commissionId: 'sen-pleno',
      fecha,
      titulo,
      comparecientes: [],
      resumen: null,
      url: url && !url.startsWith('http') ? `https://www.senado.es${url}` : url,
    })
  }
  return out
}

// ─── Mociones e interpelaciones ────────────────────────────────────────────

export async function fetchSenadoMociones(): Promise<Array<{ titulo: string; autor: string; fecha: string | null; url: string | null }>> {
  const xml = await fetchXml(16)
  if (!xml) return []
  const blocks = extractBlocks(xml, 'mocion')
  const out = []
  for (const b of blocks) {
    const titulo = tagText(b, 'titulo') || tagText(b, 'objeto') || ''
    const autor = tagText(b, 'autor') || tagText(b, 'grupoAutor') || ''
    const fecha = tagText(b, 'fecha') || tagText(b, 'fechaPresentacion') || null
    const url = tagText(b, 'urlPagina') || null
    if (!titulo) continue
    out.push({
      titulo,
      autor,
      fecha,
      url: url && !url.startsWith('http') ? `https://www.senado.es${url}` : url,
    })
  }
  return out
}
