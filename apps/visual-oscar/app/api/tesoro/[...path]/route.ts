/**
 * /api/tesoro/[...path] · Tesoro Público · estadística pública deuda.
 *
 * Sprint N15 · Fuente principal: www.tesoro.es
 * Sin API formal; se usan boletines mensuales accesibles vía HTTP simple.
 *
 * Sprint N18 · Best-effort scrape PDF inline + fallback curado.
 *
 * Rutas:
 *   GET /api/tesoro/health
 *   GET /api/tesoro/snapshot   → vida media + tipos medios (scrape PDF + curado fallback)
 *   GET /api/tesoro/scrape-pdf → scrape directo del último boletín (best-effort)
 *   GET /api/tesoro/calendario → próximas subastas (metadata)
 */
import { NextResponse } from 'next/server'

export const revalidate = 86400
export const runtime = 'nodejs'
export const maxDuration = 60

const TESORO_PUBLIC = 'https://www.tesoro.es'
const TESORO_BOLETIN_PATH = '/deuda-publica/estadisticas-mensuales/boletines-mensuales'
const TESORO_LISTING = `${TESORO_PUBLIC}/deuda-publica/boletin-mensual`

const CURATED = {
  vida_media_deuda_anios: 7.92,
  coste_medio_emisiones_pct: 3.18,
  coste_medio_stock_pct: 2.16,
  deuda_total_meur: 1622000,
  pct_no_residentes: 41.8,
  pct_bce_eurosistema: 31.4,
  pct_inversores_domesticos: 26.8,
}

function extractMetric(text: string, patterns: RegExp[]): number | null {
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m && m[1]) {
      const v = Number(m[1].replace(/\./g, '').replace(',', '.'))
      if (Number.isFinite(v)) return v
    }
  }
  return null
}

async function findLatestPdfUrl(): Promise<string | null> {
  try {
    const r = await fetch(TESORO_LISTING, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return null
    const html = await r.text()
    const m = html.match(/href="([^"]+(?:Boletin_Mensual|boletin-mensual)[^"]*\.pdf)"/i)
    if (!m) return null
    const href = m[1]
    return href.startsWith('http') ? href : `${TESORO_PUBLIC}${href.startsWith('/') ? href : `/${href}`}`
  } catch {
    return null
  }
}

async function fetchPdfText(url: string): Promise<{ ok: boolean; text?: string; error?: string }> {
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

/**
 * Scrape directo del último boletín. Devuelve métricas extraídas + URL del PDF.
 * Si algo falla, indica fallback_used=true sin valores scraped.
 */
async function scrapeLatestTesoroBoletin(): Promise<{
  ok: boolean
  pdf_url: string | null
  extracted_count: number
  scraped: Record<string, number | null>
  merged: typeof CURATED
  error?: string
  text_length?: number
}> {
  const pdfUrl = await findLatestPdfUrl()
  if (!pdfUrl) {
    return { ok: false, pdf_url: null, extracted_count: 0, scraped: {}, merged: CURATED, error: 'no_pdf_url_found' }
  }
  const r = await fetchPdfText(pdfUrl)
  if (!r.ok || !r.text) {
    return { ok: false, pdf_url: pdfUrl, extracted_count: 0, scraped: {}, merged: CURATED, error: r.error }
  }
  const text = r.text
  const scraped: Record<string, number | null> = {
    vida_media_deuda_anios: extractMetric(text, [
      /vida\s+media[^0-9]{0,30}(\d+[,\.]\d{1,2})\s*años?/i,
      /vida\s+media[^0-9]{0,30}(\d+[,\.]\d{1,2})/i,
    ]),
    coste_medio_emisiones_pct: extractMetric(text, [
      /coste\s+medio\s+(?:de\s+las\s+)?emisiones[^0-9]{0,30}(\d+[,\.]\d{1,2})/i,
    ]),
    coste_medio_stock_pct: extractMetric(text, [
      /coste\s+medio\s+(?:del\s+)?stock[^0-9]{0,30}(\d+[,\.]\d{1,2})/i,
    ]),
    pct_no_residentes: extractMetric(text, [
      /no\s+residentes[^0-9]{0,40}(\d+[,\.]\d{1,2})\s*%/i,
    ]),
    pct_bce_eurosistema: extractMetric(text, [
      /(?:BCE|Eurosistema|sistema\s+europeo)[^0-9]{0,40}(\d+[,\.]\d{1,2})\s*%/i,
    ]),
  }
  const merged: any = { ...CURATED }
  for (const k of Object.keys(CURATED) as (keyof typeof CURATED)[]) {
    if (scraped[k] != null && Number.isFinite(scraped[k] as number)) {
      merged[k] = scraped[k]
    }
  }
  const extractedCount = Object.values(scraped).filter((v) => v != null).length
  return { ok: true, pdf_url: pdfUrl, extracted_count: extractedCount, scraped, merged, text_length: text.length }
}

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    return NextResponse.json({
      ok: true,
      source_type: 'metadata_only',
      note: 'Tesoro Público no expone API JSON · boletines mensuales PDF · scraper N18 best-effort',
      base_url: TESORO_PUBLIC,
      boletines: `${TESORO_PUBLIC}${TESORO_BOLETIN_PATH}`,
    })
  }

  // Sprint N18 · /api/tesoro/scrape-pdf inline (sin Vercel function adicional)
  if (action === 'scrape-pdf') {
    const result = await scrapeLatestTesoroBoletin()
    return NextResponse.json({
      ...result,
      generated_at: new Date().toISOString(),
      fallback_used: result.extracted_count < 2,
      note: result.extracted_count >= 2
        ? `Scraper extrajo ${result.extracted_count}/5 métricas`
        : 'Scraper <2 métricas · usando snapshot curado',
    })
  }

  if (action === 'snapshot') {
    const result = await scrapeLatestTesoroBoletin()
    const usingScraped = result.ok && result.extracted_count >= 2
    return NextResponse.json({
      ok: true,
      data_quality: {
        source_type: usingScraped ? 'live' : 'curated',
        source_name: usingScraped ? 'Tesoro Público PDF scrape' : 'Tesoro Público boletín (curado)',
      },
      snapshot: usingScraped ? result.merged : CURATED,
      reference_period: usingScraped ? new Date().toISOString().slice(0, 7) : '2024-10',
      reference_pdf: result.pdf_url || `${TESORO_PUBLIC}${TESORO_BOLETIN_PATH}`,
      scraper_meta: {
        attempted: true,
        ok: result.ok,
        extracted_count: result.extracted_count,
        fallback_used: !usingScraped,
      },
      next_update_note: usingScraped
        ? 'Auto-actualizado vía scraper PDF (cache 24h)'
        : 'Snapshot curado · scraper PDF intentado pero usó fallback',
    })
  }

  if (action === 'calendario') {
    return NextResponse.json({
      ok: true,
      data_quality: { source_type: 'metadata', source_name: 'Tesoro Público' },
      calendar_url: `${TESORO_PUBLIC}/inversores/calendario-subastas`,
      note: 'Calendario subastas Letras Tesoro (quincenal), Bonos+Obligaciones (mensual).',
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/tesoro/health',
      'GET /api/tesoro/snapshot   · curado + scraper PDF fallback',
      'GET /api/tesoro/scrape-pdf · scrape directo (best-effort)',
      'GET /api/tesoro/calendario · próximas subastas',
    ],
  }, { status: 404 })
}
