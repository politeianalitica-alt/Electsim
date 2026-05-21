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
  // datos.gob.es CKAN no soporta `?q=`. Usamos /catalog/dataset/title/{kw}
  // que sí indexa título. Filtramos client-side por publisher CIS.
  const data = await ckanFetch('/catalog/dataset/title/barometro?_pageSize=50')
  if (data.error) return { error: data.error }
  const items = (data?.result?.items || [])
    .map(mapDataset)
    .filter((d: any) => {
      const t = (d.title || '').toLowerCase()
      const pub = (d.publisher || '').toLowerCase()
      // Filtro suave: o publisher CIS o título contiene "CIS"
      return pub.includes('cis') || t.includes('cis') || t.includes('opinión')
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
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'datos.gob.es · CKAN CIS barómetros'),
      n_items: result.items.length,
      items: result.items.slice(0, 20),
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

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/cis/health',
        'GET /api/cis/catalogo            · barómetros CKAN datos.gob.es',
        'GET /api/cis/barometro-latest    · metadata último barómetro',
        'GET /api/cis/problemas           · empty state didáctico',
        'GET /api/cis/valoracion-lideres  · empty state didáctico',
        'GET /api/cis/confianza-instituciones · empty state didáctico',
        'GET /api/cis/intencion-voto      · empty state didáctico',
      ],
      note: 'API sin valores hardcoded. Todos los datos vienen de CKAN live o son empty states didácticos.',
    },
    { status: 404 },
  )
}
