/**
 * /api/datos-gob/[...path] · datos.gob.es CKAN catálogo nacional.
 *
 * Fuente: datos.gob.es/apidata · catálogo nacional español, sin auth.
 *
 * NOTA: el portal datos.gob.es es un agregador de catálogos. La API
 * tradicional /apidata expone búsqueda y fichas de dataset, no las
 * series temporales directamente (que están en las APIs origen de
 * cada organismo · AIReF, IGAE, OEPM, etc.).
 *
 * Rutas:
 *   GET /api/datos-gob/health
 *   GET /api/datos-gob/search?q=AIReF · búsqueda catálogo
 *   GET /api/datos-gob/airef-forecast · placeholder (requiere scraping AIReF directo)
 *   GET /api/datos-gob/igae-ejecucion · placeholder (requiere PAPI Hacienda)
 *   GET /api/datos-gob/sci-inversiones · placeholder DataInvex SCI
 *   GET /api/datos-gob/oepm-patentes · placeholder OEPM
 *
 * Los placeholders devuelven empty state didáctico apuntando a la fuente
 * real cuando se quiera integrar más profundamente.
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 21600 // 6h

const DATOS_GOB_BASE = 'https://datos.gob.es/apidata'

async function datosFetch(path: string): Promise<any> {
  try {
    const r = await fetch(`${DATOS_GOB_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)',
      },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/datos-gob/health
  if (action === 'health') {
    const probe = await datosFetch('/catalog/dataset?_pageSize=1')
    return NextResponse.json({
      ok: !probe.error,
      backend: 'datos.gob.es · apidata CKAN',
      probe_status: probe.error ?? 'live',
    })
  }

  // /api/datos-gob/search?q=...
  if (action === 'search') {
    const q = url.searchParams.get('q') || 'macro'
    const pageSize = url.searchParams.get('pageSize') || '20'
    const data = await datosFetch(`/catalog/dataset?_pageSize=${pageSize}&q=${encodeURIComponent(q)}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'datos.gob.es', data.error),
      })
    }
    const items = (data?.result?.items || []).map((it: any) => ({
      id: it._about,
      title: Array.isArray(it.title) ? it.title[0]?._value : it.title,
      description: Array.isArray(it.description) ? it.description[0]?._value : it.description,
      publisher: it.publisher?.['_about'] ?? null,
      issued: it.issued ?? null,
      modified: it.modified ?? null,
    }))
    return NextResponse.json({
      ok: true,
      q,
      data_quality: quality('live', 'datos.gob.es · catalog'),
      n_items: items.length,
      items,
    })
  }

  // /api/datos-gob/airef-forecast · AIReF previsiones fiscales
  // AIReF no tiene API oficial · datos.gob.es indexa sus PDF reports
  if (action === 'airef-forecast') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'AIReF', 'requires_manual_scrape'),
      activation_steps: [
        '1. AIReF publica previsiones en PDFs trimestrales (airef.es/es/publicaciones)',
        '2. Scraper Python pendiente · cron job semanal',
        '3. Alternativa: usar IMF GGXWDG_NGDP forecast como proxy (ya disponible)',
      ],
      fallback_endpoint: '/api/imf/country?indicator=GGXWDG_NGDP&iso=ESP',
      registration_url: 'https://www.airef.es/es/publicaciones',
    })
  }

  // /api/datos-gob/igae-ejecucion · IGAE ejecución presupuestaria mensual
  if (action === 'igae-ejecucion') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'IGAE Hacienda', 'requires_pap_pdf_extraction'),
      activation_steps: [
        '1. IGAE publica boletines mensuales PDF (igaenet.igae.hacienda.gob.es)',
        '2. Cada mes contiene: ingresos · gastos · saldo · deuda por nivel administración',
        '3. Scraper PDF pendiente · cron job mensual día 15',
        '4. Alternativa: usar Eurostat gov_10dd_ggdebt + gov_10dd_edpt1 (anual oficial)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=gov_10dd_edpt1',
      registration_url: 'https://www.igae.hacienda.gob.es',
    })
  }

  // /api/datos-gob/sci-inversiones · DataInvex inversión extranjera
  if (action === 'sci-inversiones') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'DataInvex SCI', 'manual_csv_download'),
      activation_steps: [
        '1. Subdirección General de Inversiones (mincotur.gob.es/datainvex)',
        '2. Descarga manual CSV trimestral · datos IED por sector receptor',
        '3. Alternativa: usar Eurostat bop_c6_q + IMF BOP (cuenta financiera)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=bop_c6_q',
      registration_url: 'https://www.mincotur.gob.es/PortalAyudas/datainvex',
    })
  }

  // /api/datos-gob/oepm-patentes
  if (action === 'oepm-patentes') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'OEPM', 'requires_export_xml'),
      activation_steps: [
        '1. OEPM Oficina Española de Patentes y Marcas (oepm.es)',
        '2. Endpoints REST: oepm.es/es/index.html (no API pública oficial)',
        '3. Alternativa: usar Eurostat pat_ep_nrgdp (patentes EPO por habitante)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=pat_ep_nrgdp',
      registration_url: 'https://www.oepm.es',
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/datos-gob/health',
        'GET /api/datos-gob/search?q=AIReF · búsqueda catálogo datasets',
        'GET /api/datos-gob/airef-forecast · AIReF previsiones (empty state)',
        'GET /api/datos-gob/igae-ejecucion · IGAE ejecución (empty state)',
        'GET /api/datos-gob/sci-inversiones · DataInvex IED (empty state)',
        'GET /api/datos-gob/oepm-patentes · OEPM patentes (empty state)',
      ],
    },
    { status: 404 },
  )
}
