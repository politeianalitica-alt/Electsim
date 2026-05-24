/**
 * /api/tesoro/scrape-pdf · Sprint N18
 *
 * Best-effort scraper del Boletín Mensual del Tesoro Público.
 * Listado: https://www.tesoro.es/deuda-publica/boletin-mensual
 *
 * Estrategia defensiva:
 *  1. Fetch página listado → extrae 1ª URL PDF (último publicado)
 *  2. Descarga PDF, extrae texto con unpdf
 *  3. Aplica regex para localizar métricas clave
 *  4. Devuelve { ok, scraped: {...}, fallback_used: bool }
 *
 * Si cualquier paso falla, devuelve el snapshot curado existente.
 *
 * Métricas extraídas (best-effort, regex tolerante):
 *  - vida_media_deuda_anios (años)
 *  - coste_medio_emisiones_pct (%)
 *  - coste_medio_stock_pct (%)
 *  - pct_no_residentes
 *  - pct_bce_eurosistema
 *  - pct_inversores_domesticos
 *  - deuda_total_meur
 *
 * Cache 24h porque el boletín es mensual.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400
export const maxDuration = 60

const TESORO_LISTING = 'https://www.tesoro.es/deuda-publica/boletin-mensual'

// Snapshot curado fallback (mismo que /api/tesoro/snapshot)
const FALLBACK = {
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
    // Busca primer href con extensión PDF en la sección "Boletin_Mensual"
    const m = html.match(/href="([^"]+(?:Boletin_Mensual|boletin-mensual)[^"]*\.pdf)"/i)
    if (!m) return null
    const href = m[1]
    return href.startsWith('http') ? href : `https://www.tesoro.es${href.startsWith('/') ? href : `/${href}`}`
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
    // Dynamic import: unpdf es ESM, evita problemas bundling Next.js
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await extractText(pdf, { mergePages: true })
    const out = typeof text === 'string' ? text : (Array.isArray(text) ? (text as unknown as string[]).join('\n') : '')
    return { ok: true, text: out }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200) }
  }
}

export async function GET(): Promise<NextResponse> {
  const generated_at = new Date().toISOString()
  const pdfUrl = await findLatestPdfUrl()
  if (!pdfUrl) {
    return NextResponse.json({
      ok: false,
      generated_at,
      error: 'no_pdf_url_found',
      fallback_used: true,
      snapshot: FALLBACK,
      note: 'No se encontró URL PDF del último boletín en la página de listado · usando snapshot curado',
    })
  }
  const scrape = await scrapePdf(pdfUrl)
  if (!scrape.ok || !scrape.text) {
    return NextResponse.json({
      ok: false,
      generated_at,
      pdf_url: pdfUrl,
      error: scrape.error,
      fallback_used: true,
      snapshot: FALLBACK,
    })
  }
  const text = scrape.text
  // Aplicar regex tolerantes (Tesoro reporta cifras en notación es-ES con coma decimal)
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
  // Merge con fallback (mantiene curado si el regex no encontró)
  const merged: Record<string, number | null> = {}
  for (const k of Object.keys(FALLBACK) as (keyof typeof FALLBACK)[]) {
    merged[k] = scraped[k] != null && Number.isFinite(scraped[k] as number)
      ? scraped[k]
      : FALLBACK[k]
  }
  const extractedCount = Object.values(scraped).filter((v) => v != null).length
  return NextResponse.json({
    ok: true,
    generated_at,
    pdf_url: pdfUrl,
    text_length: text.length,
    extracted_count: extractedCount,
    scraped,
    snapshot: merged,
    fallback_used: extractedCount < 2,
    note: extractedCount >= 2
      ? `Scraper extrajo ${extractedCount}/5 métricas del PDF · campos faltantes vienen del snapshot curado`
      : 'Scraper extrajo <2 métricas · usando principalmente snapshot curado · regex puede necesitar ajuste',
  })
}
