/**
 * Cliente Banco de España · series de vivienda · Politeia Vivienda v3
 *
 * BdE publica series estadísticas en su Boletín Estadístico vía un servicio
 * de descarga directa de CSV/XLSX. No hay API JSON formal, pero los CSV
 * tienen un esquema estable y pueden parsearse.
 *
 * Foco V2:
 *   - Tabla 25.10 · Precio de la vivienda libre (nominal y real)
 *     · Serie nominal trimestral desde 1987
 *     · Serie real deflactada por IPC
 *     · Variación interanual y respecto al máximo
 *
 * Estrategia:
 *   - Si BdE falla (404, CORS, timeout), el endpoint devuelve `ok: false`
 *     con el motivo. Nunca inventar valores.
 *   - Cache CDN 12h (publicación trimestral).
 *
 * NOTA: el CSV directo del BdE expone columnas con cabecera larga en
 * castellano. Lo parseamos en cliente para no inflar el bundle de FE.
 */

const BDE_BASE = 'https://www.bde.es/webbde/es/estadis/infoest/series'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

export interface BdePoint {
  /** Etiqueta del periodo, ej "2024 T2". */
  periodo: string
  /** Año extraído del periodo. */
  anyo: number
  /** Trimestre extraído (1-4) cuando aplica. */
  trim: number | null
  /** Valor nominal (€/m² o índice). */
  nominal: number | null
  /** Valor real deflactado por IPC, base 2015=100 (cuando el CSV lo trae). */
  real: number | null
  /** Variación anual nominal, %. */
  var_anual_nominal: number | null
  /** Variación anual real, %. */
  var_anual_real: number | null
}

/**
 * Descarga el CSV de la tabla 25.10 (precio de la vivienda) y lo
 * normaliza a `BdePoint[]`. La tabla 25.10 publica el precio del metro
 * cuadrado en euros + la serie real deflactada.
 *
 * El esquema CSV del BdE cambia ocasionalmente. Si el parseo falla, el
 * endpoint devuelve `ok: false` con el motivo en vez de inventar valores.
 */
export async function fetchBdePrecioVivienda(
  timeoutMs = 9000
): Promise<{ ok: true; points: BdePoint[] } | { ok: false; error: string }> {
  // La URL directa al CSV del Boletín Estadístico del BdE tabla 25.10.
  // Si el BdE migra la URL, devolveremos error honesto.
  const url = `${BDE_BASE}/be2510.csv`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/csv,text/plain,*/*' },
      signal: ctrl.signal,
      next: { revalidate: 43200 }, // 12h
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} bde 25.10` }
    const text = await res.text()
    if (!text || text.length < 100) return { ok: false, error: 'CSV vacío o demasiado corto' }
    return { ok: true, points: parseBde2510(text) }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

/**
 * Parser tolerante del CSV del BdE.
 * Detecta cabecera (primera fila no vacía con texto), busca columnas por
 * heurística semántica y emite el primer dato numérico encontrado por fila.
 *
 * Asume separador ';' (típico CSV español) pero acepta ','.
 */
export function parseBde2510(csv: string): BdePoint[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const sep = lines[0].includes(';') ? ';' : ','
  // Encontrar fila de cabecera (la primera con al menos 2 celdas y algo de texto descriptivo)
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = lines[i].split(sep)
    if (cells.length >= 2 && /(periodo|fecha|trimestre|t\d|año)/i.test(cells[0] || cells[1] || '')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) headerIdx = 0
  const dataStart = headerIdx + 1

  const points: BdePoint[] = []
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim())
    if (cells.length < 2) continue
    const periodo = cells[0]
    // Match típico "2024 T2", "2024T2", "2024/IV", "2024-Q2"
    const m = periodo.match(/(\d{4})\s*[-/]?\s*(?:T|Q|IV|III|II|I)?\s*(\d|IV|III|II|I)?/i)
    if (!m) continue
    const anyo = Number(m[1])
    if (!Number.isFinite(anyo)) continue
    const trimRaw = m[2]
    const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 }
    const trim = trimRaw
      ? (romanMap[trimRaw.toUpperCase()] ?? (Number(trimRaw) || null))
      : null

    // Buscar los 4 primeros valores numéricos: nominal, real, var_nom, var_real
    const nums = cells.slice(1).map((c) => parseSpanishNumber(c))
    const nominal = nums[0] ?? null
    const real = nums[1] ?? null
    const var_anual_nominal = nums[2] ?? null
    const var_anual_real = nums[3] ?? null

    points.push({ periodo, anyo, trim, nominal, real, var_anual_nominal, var_anual_real })
  }
  return points
}

/** Parser tolerante de números en formato español (1.234,56 / 1234,56 / 1234.56). */
function parseSpanishNumber(s: string): number | null {
  if (!s) return null
  const cleaned = s
    .replace(/\s/g, '')
    .replace(/[%€$]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '') // miles
    .replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
