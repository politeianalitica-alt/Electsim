// Cliente para la Plataforma de Contratación del Sector Público (PLACSP)
// https://contrataciondelestado.es
//
// Usa los feeds Atom de sindicación (CODICE format).
// Cada feed tiene paginación con <link rel="next">. Devolvemos solo la
// página actual (más reciente) por defecto.
//
// Nota crítica: el dominio usa cert FNMT que muchos clientes no validan
// por defecto. Usamos `dispatcher` de undici con `rejectUnauthorized: false`
// (es un endpoint público de solo lectura, riesgo aceptable).

import { Agent, fetch as undiciFetch } from 'undici'

// Agent que ignora la validación del cert FNMT de PLACSP
const placspAgent = new Agent({
  connect: { rejectUnauthorized: false },
  bodyTimeout: 30000,
  headersTimeout: 15000,
})

// Feeds principales · suelen rotar nombre con sufijo _YYYYMMDD_HHMMSS
// Estos son los "head" que apuntan al más reciente.
export const PLACSP_FEEDS = {
  licitaciones:    'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
  // Adjudicaciones tiene URL distinta · si no responde, se omite
  adjudicaciones:  'https://contrataciondelestado.es/sindicacion/sindicacion_644/adjudicacionesPerfilesContratanteCompleto3.atom',
} as const

export type PlacspTipo = 'licitacion' | 'adjudicacion'

export interface ContratoItem {
  id: string                    // p.ej. "19627132"
  tipo: PlacspTipo
  expediente: string            // ContractFolderID p.ej. "557/2026"
  titulo: string                // título del contrato
  organismo: string             // p.ej. "Ayuntamiento de Porto do Son"
  organismo_nif: string         // CIF/NIF del organismo
  importe: number               // EUR (sin IVA o con IVA según fuente)
  estado: string                // "PUB" | "ADJ" | "RES" | "ANUL" | etc
  estado_label: string          // "Publicada" / "Adjudicada" / "Resuelta" / "Anulada"
  fecha: string                 // ISO timestamp del <updated>
  url_detalle: string           // enlace al detalle en PLACSP
  ciudad: string | null
  cpv: string | null            // código CPV (si está)
}

interface FetchResult {
  ok: boolean
  items: ContratoItem[]
  error?: string
  total_in_feed: number         // entradas detectadas (algunas pueden filtrarse)
}

const ESTADO_LABELS: Record<string, string> = {
  PUB:  'Publicada',
  RES:  'Resuelta',
  ADJ:  'Adjudicada',
  EV:   'Evaluación',
  ANUL: 'Anulada',
  PRE:  'Preadjudicada',
  PER:  'Pendiente Resolución',
  CREA: 'Creada',
  DESI: 'Desierta',
  FORM: 'Formalizada',
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string {
  // Captura `<name [attrs]>...</name>` (no greedy, primer match)
  // Soporta tags con namespace tipo `cac-place-ext:ContractFolderStatus`
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i')
  const m = block.match(re)
  return m ? decode(m[1]) : ''
}

function attr(block: string, name: string, attrName: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?\\s${attrName}=["']([^"']+)["']`, 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

// Extrae info del `<summary>` formateado por PLACSP, ej:
// "Id licitación: 557/2026; Órgano de Contratación: ...; Importe: 41126.64 EUR; Estado: PUB"
function parseSummary(summary: string): { idLicitacion: string; organo: string; importe: number; estado: string } {
  const out = { idLicitacion: '', organo: '', importe: 0, estado: '' }
  const idM = summary.match(/Id licitaci[oó]n:\s*([^;]+)/i)
  if (idM) out.idLicitacion = idM[1].trim()
  const orgM = summary.match(/[OÓ]rgano de Contrataci[oó]n:\s*([^;]+)/i)
  if (orgM) out.organo = orgM[1].trim()
  const impM = summary.match(/Importe:\s*([\d.,]+)\s*EUR/i)
  if (impM) {
    // Manejo de comas y puntos · PLACSP suele usar punto decimal
    const cleaned = impM[1].replace(/\./g, '').replace(',', '.')
    out.importe = parseFloat(cleaned) || 0
    // Si la versión de arriba sale rara (a veces el 41126.64 ya es decimal con punto), reintenta
    const direct = parseFloat(impM[1].replace(',', '.'))
    if (!isNaN(direct) && direct > 0) out.importe = direct
  }
  const estM = summary.match(/Estado:\s*([A-Z]+)/)
  if (estM) out.estado = estM[1].trim()
  return out
}

function parseEntry(block: string, tipo: PlacspTipo): ContratoItem | null {
  const id_url = tag(block, 'id')
  if (!id_url) return null
  // El id es una URL · extraemos el último segmento
  const idMatch = id_url.match(/\/(\d+)\/?$/)
  const id = idMatch ? idMatch[1] : id_url

  const titulo = tag(block, 'title')
  const summary = tag(block, 'summary')
  const updated = tag(block, 'updated')
  const linkHref = attr(block, 'link', 'href')

  const sum = parseSummary(summary)
  const expediente = tag(block, 'cbc:ContractFolderID') || sum.idLicitacion

  // Buscar nombre del organismo (puede aparecer en cbc:Name dentro de PartyName)
  let organismo = sum.organo
  if (!organismo) {
    const nameMatch = block.match(/<cac:PartyName>[\s\S]*?<cbc:Name>([\s\S]*?)<\/cbc:Name>/)
    if (nameMatch) organismo = decode(nameMatch[1])
  }

  // NIF/CIF del organismo
  let organismo_nif = ''
  const nifMatch = block.match(/<cbc:ID schemeName="NIF">([^<]+)</)
  if (nifMatch) organismo_nif = nifMatch[1].trim()

  // Estado
  const estado = sum.estado || tag(block, 'cbc-place-ext:ContractFolderStatusCode')
  const estado_label = ESTADO_LABELS[estado] || estado || 'Desconocido'

  // Importe
  let importe = sum.importe
  if (!importe) {
    const totalMatch = block.match(/<cbc:TotalAmount[^>]*>([\d.,]+)<\/cbc:TotalAmount>/)
    if (totalMatch) {
      const v = parseFloat(totalMatch[1].replace(',', '.'))
      if (!isNaN(v)) importe = v
    }
  }

  // Ciudad
  let ciudad: string | null = null
  const ciudadMatch = block.match(/<cbc:CityName>([^<]+)<\/cbc:CityName>/)
  if (ciudadMatch) ciudad = decode(ciudadMatch[1])

  // CPV
  let cpv: string | null = null
  const cpvMatch = block.match(/<cbc:ItemClassificationCode[^>]*listName="CPV[^"]*"[^>]*>([^<]+)</)
  if (cpvMatch) cpv = cpvMatch[1].trim()

  return {
    id,
    tipo,
    expediente: expediente.slice(0, 60),
    titulo: titulo.slice(0, 300),
    organismo: organismo.slice(0, 200),
    organismo_nif,
    importe,
    estado,
    estado_label,
    fecha: updated || new Date().toISOString(),
    url_detalle: linkHref,
    ciudad,
    cpv,
  }
}

export async function fetchPlacspFeed(tipo: PlacspTipo, timeoutMs = 20000): Promise<FetchResult> {
  return fetchPlacspMultiPage(tipo, 1, timeoutMs)
}

/**
 * Fetch multipage del feed PLACSP siguiendo los <link rel="next">.
 * Cada página atom trae ~350 entries. Con 5 páginas obtienes ~1750
 * licitaciones recientes de TODAS las CCAA y entidades del sector
 * público (cobertura nacional según Ley 9/2017).
 *
 * Las CCAA con plataforma propia no integrada (CyL, CLM, La Rioja,
 * Asturias, Aragón, Cantabria, Canarias, Murcia, Navarra, Baleares,
 * Extremadura) se cubren mayoritariamente vía PLACSP.
 */
export async function fetchPlacspMultiPage(
  tipo: PlacspTipo,
  maxPages = 1,
  timeoutMs = 20000,
): Promise<FetchResult> {
  const startUrl = PLACSP_FEEDS[tipo === 'licitacion' ? 'licitaciones' : 'adjudicaciones']
  const items: ContratoItem[] = []
  const seen = new Set<string>()
  let nextUrl: string | null = startUrl
  let pagesFetched = 0
  let totalInFeed = 0
  let error: string | undefined

  while (nextUrl && pagesFetched < maxPages) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await undiciFetch(nextUrl, {
        signal: controller.signal,
        dispatcher: placspAgent,
        headers: {
          'Accept': 'application/atom+xml, application/xml, */*',
          'User-Agent': 'PoliteiaAnalitica/1.0',
        },
      })
      if (!res.ok) {
        error = `HTTP ${res.status}`
        break
      }
      const xml = await res.text()
      // Parse next link
      const nextMatch = xml.match(/<link[^>]+href="([^"]+)"[^>]+rel="next"|<link[^>]+rel="next"[^>]+href="([^"]+)"/i)
      const nextHref = nextMatch?.[1] || nextMatch?.[2] || null

      const blocks = xml.split(/<entry[\s>]/).slice(1)
      totalInFeed += blocks.length
      for (const raw of blocks) {
        const closeIdx = raw.search(/<\/entry>/i)
        const block = closeIdx > 0 ? raw.slice(0, closeIdx) : raw
        const item = parseEntry(block, tipo)
        if (item && !seen.has(item.id)) {
          seen.add(item.id)
          items.push(item)
        }
      }
      pagesFetched += 1
      nextUrl = nextHref
    } catch (e: unknown) {
      error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      break
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    ok: items.length > 0 || (!error && pagesFetched > 0),
    items,
    total_in_feed: totalInFeed,
    error,
  }
}
