/**
 * /api/cis/scrape-pdf?tema=vivienda · Sprint N18
 *
 * Best-effort scraper del Avance Resultados último Barómetro CIS.
 * Estrategia:
 *  1. Fetch listado barómetros desde CIS web (cis.es)
 *  2. Extrae primer link PDF del avance + study ID
 *  3. Descarga PDF, extrae texto con unpdf
 *  4. Aplica regex sobre tabla P4 "Principales problemas" para localizar
 *     porcentajes por categoría (vivienda, paro, precios, sanidad, inmigración).
 *  5. Devuelve { ok, scraped_values: {...}, fallback_used: bool, raw_text_snippet }
 *
 * Si cualquier paso falla, indica fallback al endpoint curado /api/cis/serie.
 *
 * CIS no publica una API JSON estable de % por barómetro, así que este scraper
 * es necesariamente regex-frágil. Curado seguirá siendo el primary source.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400
export const maxDuration = 60

const CIS_BASE = 'https://www.cis.es'
const CIS_LISTING = `${CIS_BASE}/cis/opencm/ES/1_encuestas/estudios/buscarBarometros.jsp`

// Mapping tema → regex patrones de la tabla P4 CIS
// Tabla P4 típica: "Vivienda    14,5    13,8    ..." (varias columnas: total + sexo + edad)
const TEMA_REGEX: Record<string, RegExp[]> = {
  vivienda: [
    /(?:^|\n)\s*La\s+vivienda\s+[^\d]*(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Vivienda\s+[^\d]*(\d{1,2}[,\.]\d)/im,
  ],
  paro: [
    /(?:^|\n)\s*El\s+paro\s+[^\d]*(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Paro\s+[^\d]*(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Los\s+problemas\s+de\s+(?:tipo\s+)?económico[^\d]{0,40}(\d{1,2}[,\.]\d)/im,
  ],
  precios: [
    /(?:^|\n)\s*(?:Los\s+precios|La\s+inflaci[óo]n|Los\s+precios.*?[^\d]+)(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Precios\s+[^\d]+(\d{1,2}[,\.]\d)/im,
  ],
  sanidad: [
    /(?:^|\n)\s*La\s+sanidad\s+[^\d]+(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Sanidad\s+[^\d]+(\d{1,2}[,\.]\d)/im,
  ],
  inmigracion: [
    /(?:^|\n)\s*La\s+inmigraci[óo]n\s+[^\d]+(\d{1,2}[,\.]\d)/im,
    /(?:^|\n)\s*Inmigraci[óo]n\s+[^\d]+(\d{1,2}[,\.]\d)/im,
  ],
}

function extractTema(text: string, tema: string): number | null {
  const patterns = TEMA_REGEX[tema] || []
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m && m[1]) {
      const v = Number(m[1].replace(',', '.'))
      if (Number.isFinite(v)) return v
    }
  }
  return null
}

async function findLatestAvancePdf(): Promise<string | null> {
  try {
    const r = await fetch(CIS_LISTING, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return null
    const html = await r.text()
    // Busca primer href con "avance" y .pdf
    const m = html.match(/href="([^"]+(?:avance|Av|av)[^"]*\.pdf)"/i)
    if (!m) return null
    const href = m[1]
    return href.startsWith('http') ? href : `${CIS_BASE}${href.startsWith('/') ? href : `/${href}`}`
  } catch {
    return null
  }
}

async function scrapePdf(url: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { ok: false, error: `pdf HTTP ${r.status}` }
    const buf = await r.arrayBuffer()
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await extractText(pdf, { mergePages: true })
    const out = typeof text === 'string' ? text : (Array.isArray(text) ? (text as unknown as string[]).join('\n') : '')
    return { ok: true, text: out }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200) }
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const tema = (url.searchParams.get('tema') || 'vivienda').toLowerCase()
  const generated_at = new Date().toISOString()
  const pdfUrl = await findLatestAvancePdf()
  if (!pdfUrl) {
    return NextResponse.json({
      ok: false,
      generated_at,
      tema,
      error: 'no_pdf_url_found',
      fallback_used: true,
      note: 'No se localizó URL del avance PDF en cis.es · use /api/cis/serie?tema=X (curado)',
    })
  }
  const scrape = await scrapePdf(pdfUrl)
  if (!scrape.ok || !scrape.text) {
    return NextResponse.json({
      ok: false,
      generated_at,
      tema,
      pdf_url: pdfUrl,
      error: scrape.error,
      fallback_used: true,
      note: 'Scraper falló · use /api/cis/serie?tema=X (curado)',
    })
  }
  const text = scrape.text
  const valueScraped = extractTema(text, tema)
  // Aplica también a todos los temas para devolver snapshot múltiple
  const allTemas: Record<string, number | null> = {}
  for (const t of Object.keys(TEMA_REGEX)) {
    allTemas[t] = extractTema(text, t)
  }
  const extractedCount = Object.values(allTemas).filter((v) => v != null).length
  return NextResponse.json({
    ok: valueScraped != null,
    generated_at,
    tema,
    pdf_url: pdfUrl,
    text_length: text.length,
    extracted_count: extractedCount,
    value: valueScraped,
    all_temas_snapshot: allTemas,
    fallback_used: extractedCount < 2,
    text_snippet: text.slice(0, 400),
    note: extractedCount >= 2
      ? `Scraper PDF extrajo ${extractedCount}/${Object.keys(TEMA_REGEX).length} temas. Regex frágil — verificar manualmente.`
      : 'Scraper extrajo <2 temas. Regex no encontró tabla P4 esperada en el PDF. Use /api/cis/serie (curado).',
  })
}
