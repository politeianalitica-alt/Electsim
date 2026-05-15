/**
 * Cliente de Wikipedia para sondeos electorales españoles actualizados.
 *
 * Fuente: https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Spanish_general_election
 *
 * Wikipedia mantiene la tabla maestra con TODOS los sondeos publicados
 * en España, actualizada diariamente. El formato del wikitext es:
 *
 *   |-
 *   | <Casa>/<Cliente><ref>...url=https://...</ref>
 *   | <Fechas trabajo de campo · ej. "1–8 May">
 *   | <Tamaño muestra · ej. 1,377>
 *   | <Turnout o ?>
 *   | {{Party shading/PP}}| '''32.0'''<br/>{{font|size=75%|font=Verdana|text=132}}
 *   | 29.0<br/>{{font|size=75%|font=Verdana|text=116}}    ← PSOE
 *   | 18.2<br/>{{font|size=75%|font=Verdana|text=57}}     ← VOX
 *   ... (14 columnas de partidos en orden FIJO)
 *
 * El orden de columnas es: PP · PSOE · VOX · Sumar · ERC · Junts ·
 *   EH Bildu · PNV · BNG · CC · UPN · Podemos · SALF · AC
 */

const WIKI_URL = 'https://en.wikipedia.org/w/api.php?action=parse&page=Opinion_polling_for_the_next_Spanish_general_election&prop=wikitext&format=json&formatversion=2'

// Orden FIJO de columnas en la tabla de Wikipedia
const COL_ORDER = ['PP', 'PSOE', 'VOX', 'SUMAR', 'ERC', 'JUNTS', 'BILDU', 'PNV', 'BNG', 'CC', 'UPN', 'PODEMOS', 'SALF', 'AC']

// Año actual y mes actual para parseo de fechas
const NOW_YEAR = new Date().getFullYear()
const NOW_MONTH = new Date().getMonth() + 1

const MES_TO_NUM: Record<string, number> = {
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  january:1, february:2, march:3, april:4, june:6, july:7, august:8,
  september:9, october:10, november:11, december:12,
  ene:1, abr:4, ago:8, dic:12,
}

export interface SondeoWiki {
  id: string
  casa: string
  cliente?: string
  fecha: string                            // ISO yyyy-mm-dd · último día campo
  fecha_publicacion: string
  muestra: number
  metodo: 'CATI' | 'CAWI' | 'mixed' | 'face2face' | 'panel'
  tipo: 'general'
  ambito: 'España'
  partidos: Record<string, number>
  link?: string
  source: 'wikipedia'
}

/** Descarga la tabla maestra y devuelve hasta `limit` sondeos recientes. */
export async function fetchWikipediaPolls(limit = 30): Promise<SondeoWiki[]> {
  let wikitext = ''
  try {
    const r = await fetch(WIKI_URL, {
      headers: {
        'User-Agent': 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 21600 },
    })
    if (!r.ok) return []
    const data = (await r.json()) as { parse?: { wikitext?: string } }
    wikitext = data.parse?.wikitext || ''
  } catch {
    return []
  }
  if (!wikitext) return []
  return parseWikitext(wikitext, limit)
}

// ─── Parser ────────────────────────────────────────────────────────────

function parseWikitext(wikitext: string, limit: number): SondeoWiki[] {
  // 1. Recortar a la primera tabla wikitable importante
  const startIdx = wikitext.indexOf('{| class="wikitable')
  if (startIdx < 0) return []
  const slice = wikitext.slice(startIdx)
  // Cortar al final del primer bloque |}
  const endIdx = slice.indexOf('\n|}')
  const tabla = endIdx > 0 ? slice.slice(0, endIdx) : slice

  // 2. Split por |- (separador de fila)
  const filas = tabla.split(/\n\|-/).slice(1)

  const sondeos: SondeoWiki[] = []
  let idx = 0
  for (const fila of filas) {
    if (sondeos.length >= limit) break
    const sondeo = parseFila(fila, idx)
    if (sondeo) {
      sondeos.push(sondeo)
      idx++
    }
  }
  return sondeos
}

function parseFila(fila: string, idx: number): SondeoWiki | null {
  // Una fila = serie de líneas que empiezan con "| "
  // Split por líneas que empiezan con | (ignorar las que empiezan con ! o |})
  const celdas = fila
    .split(/\n\|\s+/)
    .map(c => c.trim())
    .filter(Boolean)
    .filter(c => !c.startsWith('}') && !c.startsWith('!'))

  if (celdas.length < 6) return null

  // Celda 0: Casa/Cliente (con <ref>)
  // Celda 1: Fechas (ej. "1–8 May" o "10 May")
  // Celda 2: Muestra (ej. "1,377" o "1377")
  // Celda 3: Turnout (?)
  // Celdas 4..: partidos en orden FIJO

  const casaCell = celdas[0]
  const fechaCell = celdas[1]
  const muestraCell = celdas[2]

  // ─── Casa + cliente + URL del ref ───
  let casa = ''
  let cliente: string | undefined
  let link: string | undefined
  // Extraer URL de <ref>
  const urlMatch = casaCell.match(/url=(https?:\/\/[^\s|}]+)/)
  if (urlMatch) link = urlMatch[1]
  // Limpiar todo lo wiki + ref + html
  const casaTxt = casaCell
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'+/g, '')
    .trim()
  const splitCasa = casaTxt.match(/^(.+?)\s*\/\s*(.+?)$/)
  if (splitCasa) {
    casa = splitCasa[1].trim()
    cliente = splitCasa[2].trim()
  } else {
    casa = casaTxt
  }
  if (!casa || casa.length < 2) return null

  // ─── Fecha · "1–8 May" o "10 May" o "1 May–3 Jun" ───
  // Tomamos el ÚLTIMO día (final del campo) y el mes/año correspondientes.
  // Wikipedia no incluye el año salvo si es ambiguo · asumimos año actual o
  // anterior si el mes es > mes actual.
  const fecha = parseFechaCelda(fechaCell)
  if (!fecha) return null

  // Solo sondeos de los últimos 18 meses
  const cutoff = Date.now() - 18 * 30 * 86400 * 1000
  if (new Date(fecha).getTime() < cutoff) return null

  // ─── Tamaño muestra ───
  const muestraTxt = muestraCell.replace(/[^0-9]/g, '')
  const muestra = muestraTxt ? parseInt(muestraTxt) : 1000
  if (muestra < 200 || muestra > 50000) return null

  // ─── Cifras de partidos · 14 columnas en orden fijo ───
  // Las celdas de partidos son las que están desde celda 4 en adelante
  // (algunas filas tienen una celda extra de turnout, otras no).
  // Mejor estrategia: localizar la celda con {{Party shading/PP}} y a partir
  // de ahí leer las siguientes 14 celdas.
  let pIdx = -1
  for (let i = 0; i < celdas.length; i++) {
    if (/Party shading\/PP/.test(celdas[i])) { pIdx = i; break }
  }
  if (pIdx < 0) return null

  const partidos: Record<string, number> = {}
  for (let j = 0; j < COL_ORDER.length && pIdx + j < celdas.length; j++) {
    const cell = celdas[pIdx + j]
    const partido = COL_ORDER[j]
    // Extraer % · puede ser '''32.0''' o solo 32.0
    const m = cell.match(/(?:'''|^)([\d.]+)(?:'''|<br|$)/)
    if (m) {
      const pct = parseFloat(m[1])
      if (!isNaN(pct) && pct >= 0 && pct <= 60) {
        partidos[partido] = pct
      }
    }
  }

  if (partidos.PP == null || partidos.PSOE == null) return null

  return {
    id: `wiki-${idx}`,
    casa, cliente, fecha,
    fecha_publicacion: fecha,
    muestra,
    metodo: 'mixed',
    tipo: 'general',
    ambito: 'España',
    partidos,
    link,
    source: 'wikipedia',
  }
}

/** Parsea celdas tipo "1–8 May", "10 May", "1 May–3 Jun" → ISO yyyy-mm-dd */
function parseFechaCelda(s: string): string | null {
  // Limpiar
  const clean = s.replace(/<[^>]+>/g, '').replace(/&ndash;/g, '–').trim()
  // Buscar último día y último mes
  // Patrones: "1–8 May" → día=8 mes=May / "8 May" / "1 May–3 Jun" → día=3 mes=Jun
  const partes = clean.split(/[–—-]/).map(p => p.trim())
  const ultima = partes[partes.length - 1]
  const m = ultima.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?|(\w+)\s+(\d{4})/)
  if (!m) return null
  let dia = 0
  let mesTxt = ''
  let yyyy = 0
  if (m[1] && m[2]) {
    dia = parseInt(m[1])
    mesTxt = m[2].toLowerCase()
    yyyy = m[3] ? parseInt(m[3]) : 0
  } else if (m[4] && m[5]) {
    dia = 1
    mesTxt = m[4].toLowerCase()
    yyyy = parseInt(m[5])
  }
  // Si la primera parte de "1–8 May" no tenía mes, usamos el de la última
  if (partes.length > 1 && !partes[0].includes(mesTxt) && !/[A-Za-z]/.test(partes[0])) {
    // primera es solo número, ok
  }
  const mes = MES_TO_NUM[mesTxt] || MES_TO_NUM[mesTxt.slice(0, 3)]
  if (!mes || dia < 1 || dia > 31) return null

  // Inferir año: si Wikipedia no lo da, asumir año actual; si el mes es > mes actual, año anterior
  if (!yyyy) {
    yyyy = mes > NOW_MONTH ? NOW_YEAR - 1 : NOW_YEAR
  }
  return `${yyyy}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
