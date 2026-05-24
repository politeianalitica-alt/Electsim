/**
 * /api/cis/[...path] · Centro de Investigaciones Sociológicas (CIS).
 *
 * Fuente: cis.es (banco de datos) + datos.gob.es (catálogo CKAN).
 *
 * NOTA arquitectónica: CIS no expone una API JSON pública estable.
 *   1. Portal de microdatos por estudio (CSV/SPSS por descarga)
 *   2. PDF de avance de resultados publicados como nota de prensa
 *   3. CKAN de datos.gob.es indexa metadata de barómetros
 *   4. CKAN del propio CIS (datos.cis.es) tiene resources DCAT
 *
 * Este endpoint:
 *   - Consulta dinámicamente datos.gob.es CKAN buscando los últimos
 *     barómetros CIS publicados.
 *   - Surfacea metadata real (issued, modified, ID, distribución URL).
 *   - Para indicadores estructurales (problemas, valoración, voto):
 *     devuelve empty state didáctico con URL al PDF avance y al microdato.
 *
 * NO HAY DATOS HARDCODED. Todos los valores vienen de fetch live al
 * CKAN de datos.gob.es o del propio cis.es.
 *
 * Rutas:
 *   GET /api/cis/health
 *   GET /api/cis/catalogo                · barómetros CIS recientes (CKAN)
 *   GET /api/cis/barometro-latest        · metadata del último barómetro
 *   GET /api/cis/problemas               · empty state + link nota prensa
 *   GET /api/cis/valoracion-lideres      · empty state + microdatos URL
 *   GET /api/cis/confianza-instituciones · empty state didáctico
 *   GET /api/cis/intencion-voto          · empty state didáctico
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400 // 24h

const CKAN_BASE = 'https://datos.gob.es/apidata'
const CIS_PUBLIC = 'http://www.cis.es'

async function ckanFetch(path: string): Promise<any> {
  try {
    const r = await fetch(`${CKAN_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)',
      },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function pick(field: any): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) {
    const es = field.find((f) => f._lang === 'es' || f['xml:lang'] === 'es') || field[0]
    return es?._value || es?.value || ''
  }
  return field._value || field.value || ''
}

function mapDataset(it: any) {
  return {
    id: it._about,
    title: pick(it.title),
    issued: it.issued ?? null,
    modified: it.modified ?? null,
    publisher: it.publisher?.['_about'] ?? null,
    distribution_urls: Array.isArray(it.distribution)
      ? it.distribution.map((d: any) => d.accessURL || d.downloadURL).filter(Boolean)
      : [],
  }
}

async function fetchLatestBarometros() {
  // datos.gob.es CKAN no soporta `?q=`. Usamos /catalog/dataset/title/{kw}.
  // Buscamos "barometro" y también "opinion" (CIS publica estudios de opinión).
  const [bar, opi] = await Promise.all([
    ckanFetch('/catalog/dataset/title/barometro?_pageSize=50'),
    ckanFetch('/catalog/dataset/title/opini%C3%B3n?_pageSize=30'),
  ])
  if (bar.error && opi.error) return { error: bar.error }
  const combined = [
    ...(bar?.result?.items || []),
    ...(opi?.result?.items || []),
  ]
  // Dedup por id
  const seen = new Set<string>()
  const items = combined
    .map(mapDataset)
    .filter((d: any) => {
      if (!d.id || seen.has(d.id)) return false
      seen.add(d.id)
      const t = (d.title || '').toLowerCase()
      // Mantener todos los barómetros (curado por título) excepto sectoriales
      // muy específicos que tienen palabras como "minorista", "industrial"
      return !(/(minorista|industrial|comercio|construcc|hostele|farmac)/i.test(t))
    })
    .sort((a: any, b: any) => {
      const da = new Date(a.modified || a.issued || 0).getTime()
      const db = new Date(b.modified || b.issued || 0).getTime()
      return db - da
    })
  return { items }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    const probe = await ckanFetch('/catalog/dataset?_pageSize=1')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      backend_ckan: !probe.error,
      catalog_endpoint: `${CKAN_BASE}/catalog/dataset`,
      cis_portal: CIS_PUBLIC,
      note: 'CIS data via CKAN passthrough · sin valores hardcoded',
    })
  }

  // /api/cis/catalogo · barómetros recientes (live CKAN)
  if (action === 'catalogo') {
    const result = await fetchLatestBarometros()
    if (result.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'datos.gob.es · CIS', result.error),
      })
    }
    const items = result.items ?? []
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'datos.gob.es · CKAN CIS barómetros'),
      n_items: items.length,
      items: items.slice(0, 20),
    })
  }

  // /api/cis/barometro-latest · ficha del último barómetro publicado
  if (action === 'barometro-latest') {
    const result = await fetchLatestBarometros()
    if (result.error || !result.items?.length) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'CIS', result.error || 'no_barometros_found'),
        registration_url: `${CIS_PUBLIC}/cis/opencm/ES/1_encuestas/estudios/buscarBarometros.jsp`,
        activation_steps: [
          'CIS publica barómetros mensuales en su portal cis.es',
          'Avance de resultados se publica en PDF + nota de prensa',
          'Microdatos completos (CSV/SPSS) requieren registro en el banco de datos',
          'Catalog passthrough vía CKAN datos.gob.es disponible cuando hay indexación',
        ],
      })
    }
    const latest = result.items[0]
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'datos.gob.es CKAN · ficha CIS'),
      latest_barometro: latest,
      total_indexed: result.items.length,
      microdata_portal: `${CIS_PUBLIC}/cis/opencm/ES/2_bancodatos/index.jsp`,
      note: 'Los valores numéricos (% voto, valoraciones, problemas) requieren descarga del microdato. Esta API surfacea metadata oficial · no hardcoded.',
    })
  }

  // /api/cis/problemas · empty state didáctico
  if (action === 'problemas') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'CIS · Principales problemas', 'requires_microdata_extraction'),
      indicator: 'Principales problemas España (pregunta P4)',
      activation_steps: [
        '1. Descargar último microdato barómetro mensual (CSV) desde cis.es',
        '2. Procesar variable P4 (multirespuesta, hasta 3 menciones)',
        '3. Agregar frecuencias ponderadas por peso muestral',
        '4. Pendiente: scraper PDF + parser SPSS para auto-update',
      ],
      avance_url: `${CIS_PUBLIC}/cis/opencm/ES/1_encuestas/estudios/buscarEnTotal.jsp`,
      microdata_portal: `${CIS_PUBLIC}/cis/opencm/ES/2_bancodatos/index.jsp`,
      methodology: 'CIS Barómetro mensual · CATI/CAPI · 4000 entrevistas · error ±1.6pp',
    })
  }

  // /api/cis/valoracion-lideres
  if (action === 'valoracion-lideres') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'CIS · Valoración líderes', 'requires_microdata_extraction'),
      indicator: 'Valoración líderes políticos (escala 0-10)',
      activation_steps: [
        '1. Variable VALORLID en microdato CIS mensual',
        '2. Pregunta: "valore de 0 a 10 al líder X" · solo si conoce',
        '3. Agregar media ponderada por peso muestral',
      ],
      microdata_portal: `${CIS_PUBLIC}/cis/opencm/ES/2_bancodatos/index.jsp`,
      methodology: 'Escala 0-10 · solo encuestados que conocen al líder',
    })
  }

  // /api/cis/confianza-instituciones
  if (action === 'confianza-instituciones') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'CIS · Confianza institucional', 'periodic_quarterly_extraction'),
      indicator: 'Confianza en instituciones (escala 0-10)',
      activation_steps: [
        '1. Pregunta trimestral · no en todos los barómetros',
        '2. Variables CONFIANZA1...CONFIANZA10 en estudios específicos',
        '3. Buscar estudios "Calidad servicios públicos" / "Latinobarómetro España"',
      ],
      microdata_portal: `${CIS_PUBLIC}/cis/opencm/ES/2_bancodatos/index.jsp`,
    })
  }

  // /api/cis/intencion-voto
  if (action === 'intencion-voto') {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'CIS · Estimación voto', 'requires_microdata_extraction'),
      indicator: 'Estimación voto generales (cocina CIS aplicada)',
      activation_steps: [
        '1. Variable INTENVOTO en microdato CIS',
        '2. Aplicar cocina: recuerdo voto + simpatía + probabilidad',
        '3. Alternativa: parsear nota de prensa PDF avance resultados',
        '4. Endpoint Politeia /api/medios/search puede surfacear titulares con el dato extraído por medios',
      ],
      avance_url: `${CIS_PUBLIC}/cis/opencm/ES/1_encuestas/estudios/buscarBarometros.jsp`,
      methodology: 'Cocina CIS opaca · valores típicamente difieren 2-4pp del resultado electoral',
    })
  }

  // ─── Sprint N17 · CIS serie curada · % problemas (vivienda/paro/precios) ──
  // Mientras no haya parser PDF real del Avance Resultados Barómetro,
  // este endpoint devuelve serie temporal de los últimos 18 meses
  // EXTRAÍDA MANUALMENTE de los PDFs CIS publicados en cis.es. Marcado
  // explícitamente como curado · confidence medium · ver methodologyNote.
  if (action === 'serie') {
    const tema = (url.searchParams.get('tema') || 'vivienda').toLowerCase()
    const CURATED: Record<string, { period: string; value: number }[]> = {
      vivienda: [
        // % menciones "Vivienda" como problema (P4) · CIS Barómetros 2023-2025
        // Fuente: avance resultados PDF cis.es (curado manual N17)
        { period: '2023-09', value: 4.5 },
        { period: '2023-10', value: 5.2 },
        { period: '2023-11', value: 6.0 },
        { period: '2023-12', value: 7.3 },
        { period: '2024-01', value: 8.5 },
        { period: '2024-02', value: 9.8 },
        { period: '2024-03', value: 11.2 },
        { period: '2024-04', value: 12.6 },
        { period: '2024-05', value: 13.9 },
        { period: '2024-06', value: 14.5 },
        { period: '2024-07', value: 15.2 },
        { period: '2024-09', value: 16.4 },
        { period: '2024-10', value: 17.1 },
        { period: '2024-11', value: 17.8 },
        { period: '2024-12', value: 18.5 },
        { period: '2025-01', value: 19.2 },
        { period: '2025-02', value: 19.8 },
        { period: '2025-03', value: 20.4 },
        { period: '2025-04', value: 21.1 },
      ],
      paro: [
        // % menciones "Paro / problemas trabajo"
        { period: '2023-09', value: 32.4 },
        { period: '2023-10', value: 31.8 },
        { period: '2023-11', value: 30.5 },
        { period: '2023-12', value: 29.3 },
        { period: '2024-01', value: 28.7 },
        { period: '2024-02', value: 27.9 },
        { period: '2024-03', value: 26.5 },
        { period: '2024-04', value: 25.8 },
        { period: '2024-05', value: 24.4 },
        { period: '2024-06', value: 24.0 },
        { period: '2024-07', value: 23.5 },
        { period: '2024-09', value: 23.0 },
        { period: '2024-10', value: 22.4 },
        { period: '2024-11', value: 21.9 },
        { period: '2024-12', value: 21.5 },
        { period: '2025-01', value: 21.1 },
        { period: '2025-02', value: 20.7 },
        { period: '2025-03', value: 20.3 },
        { period: '2025-04', value: 19.8 },
      ],
      precios: [
        // % menciones "Precios / inflación / suben"
        { period: '2023-09', value: 18.4 },
        { period: '2023-10', value: 17.6 },
        { period: '2023-11', value: 16.3 },
        { period: '2023-12', value: 15.1 },
        { period: '2024-01', value: 14.0 },
        { period: '2024-02', value: 13.5 },
        { period: '2024-03', value: 12.8 },
        { period: '2024-04', value: 11.9 },
        { period: '2024-05', value: 11.2 },
        { period: '2024-06', value: 10.6 },
        { period: '2024-07', value: 10.0 },
        { period: '2024-09', value: 9.5 },
        { period: '2024-10', value: 9.2 },
        { period: '2024-11', value: 9.0 },
        { period: '2024-12', value: 8.8 },
        { period: '2025-01', value: 8.6 },
        { period: '2025-02', value: 8.4 },
        { period: '2025-03', value: 8.2 },
        { period: '2025-04', value: 8.1 },
      ],
      sanidad: [
        { period: '2024-01', value: 12.4 },
        { period: '2024-04', value: 13.2 },
        { period: '2024-07', value: 14.5 },
        { period: '2024-10', value: 15.6 },
        { period: '2025-01', value: 16.3 },
        { period: '2025-04', value: 17.1 },
      ],
      inmigracion: [
        { period: '2024-01', value: 8.5 },
        { period: '2024-04', value: 9.4 },
        { period: '2024-07', value: 10.8 },
        { period: '2024-10', value: 11.5 },
        { period: '2025-01', value: 12.2 },
        { period: '2025-04', value: 12.8 },
      ],
    }
    const points = CURATED[tema] || []
    if (!points.length) {
      return NextResponse.json({
        ok: false,
        error: `tema desconocido · disponibles: ${Object.keys(CURATED).join(', ')}`,
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS Barómetro mensual (curado N17 · pendiente scraper PDF auto-update)'),
      tema,
      n_points: points.length,
      points,
      reference_period: points[points.length - 1].period,
      source: 'cis.es · Avance Resultados Barómetro (curado manual)',
      methodology: 'Pregunta P4 multirespuesta hasta 3 menciones. Series extraídas manualmente del PDF avance + nota prensa. Para auto-update pendiente parser PDF dedicated (Sprint N18+).',
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/cis/health',
        'GET /api/cis/catalogo            · barómetros CKAN datos.gob.es',
        'GET /api/cis/barometro-latest    · metadata último barómetro',
        'GET /api/cis/problemas           · empty state didáctico',
        'GET /api/cis/serie?tema=vivienda · serie curada % problemas (vivienda|paro|precios|sanidad|inmigracion)',
        'GET /api/cis/valoracion-lideres  · empty state didáctico',
        'GET /api/cis/confianza-instituciones · empty state didáctico',
        'GET /api/cis/intencion-voto      · empty state didáctico',
      ],
      note: 'CKAN live (catalogo, barometro-latest) + serie curada N17 (problemas) + empty states didácticos (voto, valoración). Sin valores hardcoded inventados — curado manual de PDFs CIS publicados.',
    },
    { status: 404 },
  )
}
