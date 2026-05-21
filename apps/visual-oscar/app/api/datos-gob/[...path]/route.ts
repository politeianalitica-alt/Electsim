/**
 * /api/datos-gob/[...path] · datos.gob.es CKAN catálogo nacional.
 *
 * Fuente: datos.gob.es/apidata · catálogo nacional español, sin auth.
 *
 * NOTA arquitectónica: el portal datos.gob.es es un agregador de catálogos.
 * Su API expone búsqueda y fichas de dataset, no series temporales directas
 * (que están en las APIs origen de cada organismo · AIReF, IGAE, OEPM...).
 *
 * Estrategia: maximizar lo que datos.gob.es ofrece nativamente
 *   1. Búsqueda CKAN por keyword/publisher/tema
 *   2. Catálogo de datasets por tema (taxonomía DCAT)
 *   3. Listado de organismos publishers
 *   4. Detalle de dataset (recursos descargables)
 *   5. Para series temporales específicas (AIReF, IGAE, SCI, OEPM):
 *      empty state didáctico con activation_steps + fallback_endpoint
 *
 * Rutas:
 *   GET /api/datos-gob/health
 *   GET /api/datos-gob/search?q=AIReF&publisher=&theme=
 *   GET /api/datos-gob/themes              · taxonomía DCAT (16 temas)
 *   GET /api/datos-gob/publishers?q=       · organismos publishers
 *   GET /api/datos-gob/dataset?id=URI      · ficha completa de dataset
 *   GET /api/datos-gob/by-theme?theme=     · datasets por tema DCAT
 *   GET /api/datos-gob/spain-economic-pulse · datasets clave macroeconómicos
 *   GET /api/datos-gob/airef-forecast      · AIReF previsiones
 *   GET /api/datos-gob/igae-ejecucion      · IGAE ejecución
 *   GET /api/datos-gob/sci-inversiones     · DataInvex SCI
 *   GET /api/datos-gob/oepm-patentes       · OEPM patentes
 *   GET /api/datos-gob/registro-mercantil  · Registradores demografía
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

// Helper to flatten Multilingual fields
function pick(field: any): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) {
    const es = field.find((f) => f._lang === 'es' || f['xml:lang'] === 'es') || field[0]
    return es?._value || es?.value || ''
  }
  return field._value || field.value || ''
}

// Mapper: CKAN dataset item → shape canónico
function mapDataset(it: any) {
  return {
    id: it._about,
    title: pick(it.title),
    description: pick(it.description),
    publisher: it.publisher?.['_about'] ?? null,
    issued: it.issued ?? null,
    modified: it.modified ?? null,
    themes: Array.isArray(it.theme) ? it.theme.map((t: any) => t._about || t).filter(Boolean) : [],
    n_distributions: Array.isArray(it.distribution) ? it.distribution.length : 0,
  }
}

const DCAT_THEMES = [
  { id: 'economy',         label: 'Economía',                  uri: 'http://datos.gob.es/kos/sector-publico/sector/economia' },
  { id: 'finance',         label: 'Hacienda',                  uri: 'http://datos.gob.es/kos/sector-publico/sector/hacienda' },
  { id: 'employment',      label: 'Empleo',                    uri: 'http://datos.gob.es/kos/sector-publico/sector/empleo' },
  { id: 'industry',        label: 'Industria',                 uri: 'http://datos.gob.es/kos/sector-publico/sector/industria' },
  { id: 'commerce',        label: 'Comercio',                  uri: 'http://datos.gob.es/kos/sector-publico/sector/comercio' },
  { id: 'demography',      label: 'Demografía',                uri: 'http://datos.gob.es/kos/sector-publico/sector/demografia' },
  { id: 'housing',         label: 'Vivienda',                  uri: 'http://datos.gob.es/kos/sector-publico/sector/vivienda' },
  { id: 'transport',       label: 'Transporte',                uri: 'http://datos.gob.es/kos/sector-publico/sector/transporte' },
  { id: 'energy',          label: 'Energía',                   uri: 'http://datos.gob.es/kos/sector-publico/sector/energia' },
  { id: 'environment',     label: 'Medio Ambiente',            uri: 'http://datos.gob.es/kos/sector-publico/sector/medio-ambiente' },
  { id: 'education',       label: 'Educación',                 uri: 'http://datos.gob.es/kos/sector-publico/sector/educacion' },
  { id: 'health',          label: 'Salud',                     uri: 'http://datos.gob.es/kos/sector-publico/sector/salud' },
  { id: 'science',         label: 'Ciencia y Tecnología',      uri: 'http://datos.gob.es/kos/sector-publico/sector/ciencia-tecnologia' },
  { id: 'social',          label: 'Sociedad y bienestar',      uri: 'http://datos.gob.es/kos/sector-publico/sector/sociedad-bienestar' },
  { id: 'government',      label: 'Sector público',            uri: 'http://datos.gob.es/kos/sector-publico/sector/sector-publico' },
  { id: 'urbanism',        label: 'Urbanismo',                 uri: 'http://datos.gob.es/kos/sector-publico/sector/urbanismo-infraestructuras' },
]

// Datasets clave (curados) para "spain-economic-pulse"
const SPAIN_ECONOMIC_CURATED = [
  { key: 'pib',           keyword: 'PIB trimestral España',       publisher_hint: 'Instituto Nacional de Estadística' },
  { key: 'ipc',           keyword: 'IPC Índice precios consumo',  publisher_hint: 'Instituto Nacional de Estadística' },
  { key: 'epa',           keyword: 'EPA Encuesta Población Activa', publisher_hint: 'Instituto Nacional de Estadística' },
  { key: 'paro_registrado', keyword: 'paro registrado SEPE',      publisher_hint: 'Servicio Público de Empleo Estatal' },
  { key: 'tesoro',        keyword: 'subastas Tesoro deuda',        publisher_hint: 'Tesoro Público' },
  { key: 'bde_macro',     keyword: 'indicadores macroeconómicos Banco España', publisher_hint: 'Banco de España' },
  { key: 'ree_demanda',   keyword: 'demanda eléctrica REE',        publisher_hint: 'Red Eléctrica de España' },
  { key: 'tcr',           keyword: 'tipo cambio real efectivo',     publisher_hint: 'Banco de España' },
  { key: 'cnmv_emisiones', keyword: 'emisiones renta fija CNMV',   publisher_hint: 'Comisión Nacional del Mercado de Valores' },
  { key: 'aemps_medicamentos', keyword: 'medicamentos AEMPS',      publisher_hint: 'Agencia Española de Medicamentos' },
]

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
      n_datasets_global: probe?.result?.totalItems || null,
    })
  }

  // /api/datos-gob/search
  if (action === 'search') {
    const q = url.searchParams.get('q') || 'macro'
    const pageSize = url.searchParams.get('pageSize') || '20'
    const publisher = url.searchParams.get('publisher') || ''
    let path = `/catalog/dataset?_pageSize=${pageSize}&q=${encodeURIComponent(q)}`
    if (publisher) path += `&publisher=${encodeURIComponent(publisher)}`
    const data = await datosFetch(path)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'datos.gob.es', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      q,
      publisher: publisher || null,
      data_quality: quality('live', 'datos.gob.es · catalog'),
      n_items: data?.result?.items?.length || 0,
      n_total: data?.result?.totalItems || 0,
      items: (data?.result?.items || []).map(mapDataset),
    })
  }

  // /api/datos-gob/themes
  if (action === 'themes') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'datos.gob.es · taxonomía DCAT'),
      n_themes: DCAT_THEMES.length,
      themes: DCAT_THEMES,
    })
  }

  // /api/datos-gob/by-theme?theme=economy
  if (action === 'by-theme') {
    const themeKey = url.searchParams.get('theme') || 'economy'
    const theme = DCAT_THEMES.find((t) => t.id === themeKey)
    if (!theme) {
      return NextResponse.json({ ok: false, error: `theme '${themeKey}' not found`, available: DCAT_THEMES.map((t) => t.id) })
    }
    const pageSize = url.searchParams.get('pageSize') || '20'
    const data = await datosFetch(`/catalog/dataset/theme/${encodeURIComponent(theme.uri.split('/').pop()!)}?_pageSize=${pageSize}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        theme: theme.id,
        data_quality: quality('missing', 'datos.gob.es', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      theme: theme.id,
      theme_label: theme.label,
      data_quality: quality('live', `datos.gob.es · tema ${theme.label}`),
      n_items: data?.result?.items?.length || 0,
      items: (data?.result?.items || []).map(mapDataset),
    })
  }

  // /api/datos-gob/publishers
  if (action === 'publishers') {
    const q = url.searchParams.get('q') || ''
    const data = await datosFetch(`/catalog/publisher${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'datos.gob.es · publishers', data.error),
      })
    }
    const items = (data?.result?.items || []).map((p: any) => ({
      id: p._about,
      label: pick(p.label) || pick(p.prefLabel),
      n_datasets: p.publisherDatasetCount ?? null,
    }))
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'datos.gob.es · publishers'),
      n_items: items.length,
      items,
    })
  }

  // /api/datos-gob/spain-economic-pulse · datasets clave macroeconómicos
  if (action === 'spain-economic-pulse') {
    const results = await Promise.all(
      SPAIN_ECONOMIC_CURATED.map(async (c) => {
        const data = await datosFetch(`/catalog/dataset?_pageSize=1&q=${encodeURIComponent(c.keyword)}`)
        const top = data?.result?.items?.[0]
        return {
          key: c.key,
          keyword: c.keyword,
          publisher_hint: c.publisher_hint,
          top_match: top
            ? {
                id: top._about,
                title: pick(top.title),
                modified: top.modified,
                n_distributions: Array.isArray(top.distribution) ? top.distribution.length : 0,
              }
            : null,
        }
      })
    )
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'datos.gob.es · pulse macro España'),
      n_curated: results.length,
      pulse: results,
    })
  }

  // /api/datos-gob/airef-forecast · AIReF previsiones fiscales
  if (action === 'airef-forecast') {
    // Probar búsqueda en catálogo
    const data = await datosFetch('/catalog/dataset?_pageSize=5&q=AIReF+previsiones+macroecon%C3%B3micas')
    const top = data?.result?.items?.slice(0, 5).map(mapDataset) || []
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'AIReF', 'PDF scraping required for time series'),
      catalog_matches: top,
      activation_steps: [
        '1. AIReF publica previsiones en PDFs trimestrales (airef.es/es/publicaciones)',
        '2. Catálogo datos.gob.es indexa metadata pero no series numéricas',
        '3. Para extraer valores: scraper PDF cron job semanal',
        '4. Alternativa actual: usar IMF GGXWDG_NGDP forecast como proxy (ya disponible /api/imf/country)',
      ],
      fallback_endpoint: '/api/imf/country?indicator=GGXWDG_NGDP&iso=ESP',
      registration_url: 'https://www.airef.es/es/publicaciones',
    })
  }

  // /api/datos-gob/igae-ejecucion · IGAE ejecución presupuestaria mensual
  if (action === 'igae-ejecucion') {
    const data = await datosFetch('/catalog/dataset?_pageSize=5&q=IGAE+ejecuci%C3%B3n+presupuestaria')
    const top = data?.result?.items?.slice(0, 5).map(mapDataset) || []
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'IGAE Hacienda', 'PDF/Excel extraction required'),
      catalog_matches: top,
      activation_steps: [
        '1. IGAE publica boletines mensuales PDF (igaenet.igae.hacienda.gob.es)',
        '2. Cada boletín contiene: ingresos · gastos · saldo · deuda por subsector AAPP',
        '3. Scraper PDF + Excel parser pendiente · cron mensual día 15',
        '4. Alternativa: Eurostat gov_10dd_ggdebt + gov_10dd_edpt1 (anual oficial)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=gov_10dd_edpt1',
      registration_url: 'https://www.igae.hacienda.gob.es',
    })
  }

  // /api/datos-gob/sci-inversiones · DataInvex inversión extranjera
  if (action === 'sci-inversiones') {
    const data = await datosFetch('/catalog/dataset?_pageSize=5&q=DataInvex+inversi%C3%B3n+extranjera')
    const top = data?.result?.items?.slice(0, 5).map(mapDataset) || []
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'DataInvex SCI', 'Manual CSV download'),
      catalog_matches: top,
      activation_steps: [
        '1. Subdirección General de Inversiones (mincotur.gob.es/datainvex)',
        '2. Descarga manual CSV trimestral · datos IED por sector receptor + CCAA + país origen',
        '3. Alternativa actual: Eurostat bop_c6_q + IMF BOP (cuenta financiera)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=bop_c6_q',
      registration_url: 'https://www.mincotur.gob.es/PortalAyudas/datainvex',
    })
  }

  // /api/datos-gob/oepm-patentes
  if (action === 'oepm-patentes') {
    const data = await datosFetch('/catalog/dataset?_pageSize=5&q=OEPM+patentes')
    const top = data?.result?.items?.slice(0, 5).map(mapDataset) || []
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'OEPM', 'XML export download'),
      catalog_matches: top,
      activation_steps: [
        '1. OEPM Oficina Española de Patentes y Marcas (oepm.es)',
        '2. Sin API pública oficial · exports XML manuales',
        '3. Alternativa: Eurostat pat_ep_nrgdp (patentes EPO por millón habitantes)',
      ],
      fallback_endpoint: '/api/eurostat/dataset?code=pat_ep_nrgdp',
      registration_url: 'https://www.oepm.es',
    })
  }

  // /api/datos-gob/registro-mercantil · Registradores demografía empresarial
  if (action === 'registro-mercantil') {
    const data = await datosFetch('/catalog/dataset?_pageSize=5&q=Registradores+demograf%C3%ADa+empresarial')
    const top = data?.result?.items?.slice(0, 5).map(mapDataset) || []
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'Registradores de España', 'Manual PDF/Excel'),
      catalog_matches: top,
      activation_steps: [
        '1. Registradores publica Estadística Mercantil mensual (registradores.org)',
        '2. PDFs + Excel mensuales con creación/extinción sociedades',
        '3. Alternativa: INE DIRCE anual + Eurostat bd_size_r3',
      ],
      fallback_endpoint: '/api/ine/dirce-creacion',
      registration_url: 'https://www.registradores.org/estadisticas',
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/datos-gob/health',
        'GET /api/datos-gob/search?q=AIReF&publisher=&pageSize=20',
        'GET /api/datos-gob/themes                · 16 temas DCAT',
        'GET /api/datos-gob/by-theme?theme=economy',
        'GET /api/datos-gob/publishers?q=',
        'GET /api/datos-gob/spain-economic-pulse  · 10 datasets clave curados',
        'GET /api/datos-gob/airef-forecast',
        'GET /api/datos-gob/igae-ejecucion',
        'GET /api/datos-gob/sci-inversiones',
        'GET /api/datos-gob/oepm-patentes',
        'GET /api/datos-gob/registro-mercantil',
      ],
    },
    { status: 404 },
  )
}
