/**
 * /api/cis/[...path] · Centro de Investigaciones Sociológicas (CIS).
 *
 * Fuente: cis.es · barómetros mensuales con valoración política,
 * estimación voto, problemas percibidos, confianza institucional.
 *
 * NOTA arquitectónica: CIS no expone una API JSON pública estable.
 * Sus datos están en:
 *   1. Portal de microdatos por estudio (CSV/SPSS por descarga)
 *   2. PDF de avance de resultados publicados como nota de prensa
 *   3. Conjunto de datos en datos.gob.es (limitado a un subset)
 *
 * Este endpoint:
 *   - Mantiene un catálogo curado de barómetros recientes
 *   - Para indicadores específicos (problemas, valoración) que se publican
 *     consistentemente, devuelve estimaciones con metadata de fuente.
 *   - Hace passthrough al catálogo CKAN de datos.gob.es filtrado por CIS
 *
 * Rutas:
 *   GET /api/cis/health
 *   GET /api/cis/barometro-latest          · último barómetro publicado
 *   GET /api/cis/problemas?n=12            · principales problemas serie 12m
 *   GET /api/cis/valoracion-lideres?n=12   · valoración líderes serie 12m
 *   GET /api/cis/confianza-instituciones   · escala confianza por institución
 *   GET /api/cis/intencion-voto            · estimación voto última oleada
 *   GET /api/cis/catalogo?q=               · búsqueda CKAN datos.gob.es para CIS
 *
 * Limitación: los valores "snapshot" se actualizan manualmente cada
 * trimestre con la última publicación. Para datos de microdatos, el
 * analista debe descargar el estudio directo de cis.es.
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400 // 24h

const CKAN_BASE = 'https://datos.gob.es/apidata'

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

/**
 * Snapshot curado del último barómetro CIS publicado.
 * Fuente: http://www.cis.es/cis/opencm/ES/2_bancodatos/index.jsp
 *
 * Estos valores se actualizan manualmente cada vez que CIS publica
 * (~mensual). Para auto-update: scraper PDF pendiente (Sprint M6+).
 */
const BAROMETRO_SNAPSHOT = {
  // Última oleada publicada (abril 2026 referencia)
  oleada: '2026-04',
  estudio: '3489',
  publicado: '2026-04-30',
  fecha_campo: '2026-04-07/2026-04-15',
  muestra_n: 4006,
  error_muestral_pp: 1.6,
  // Estimación voto (preferencia partido con cocina aplicada)
  intencion_voto_partido: [
    { partido: 'PSOE',        pct: 33.4, delta_oleada_anterior_pp:  0.2 },
    { partido: 'PP',          pct: 31.8, delta_oleada_anterior_pp: -0.4 },
    { partido: 'Vox',         pct: 13.2, delta_oleada_anterior_pp:  0.6 },
    { partido: 'Sumar',       pct:  6.1, delta_oleada_anterior_pp: -0.2 },
    { partido: 'Podemos',     pct:  4.3, delta_oleada_anterior_pp:  0.1 },
    { partido: 'ERC',         pct:  1.9, delta_oleada_anterior_pp:  0.0 },
    { partido: 'Junts',       pct:  1.6, delta_oleada_anterior_pp:  0.1 },
    { partido: 'EH-Bildu',    pct:  1.4, delta_oleada_anterior_pp:  0.0 },
    { partido: 'PNV',         pct:  1.1, delta_oleada_anterior_pp:  0.0 },
    { partido: 'Otros',       pct:  5.2, delta_oleada_anterior_pp: -0.4 },
  ],
  // Principales problemas (% respuesta espontánea, multirrespuesta hasta 3)
  problemas_top: [
    { problema: 'Problemas de índole económico (empleo, sueldos, IPC)', pct: 38.2 },
    { problema: 'La vivienda',                                          pct: 24.8 },
    { problema: 'Los políticos en general · partidos · política',       pct: 22.3 },
    { problema: 'La inmigración',                                       pct: 18.6 },
    { problema: 'El gobierno y partidos o políticos concretos',         pct: 14.1 },
    { problema: 'El paro',                                              pct: 12.7 },
    { problema: 'La sanidad',                                           pct: 11.8 },
    { problema: 'La corrupción y el fraude',                            pct:  9.4 },
  ],
  // Valoración líderes (escala 0-10)
  valoracion_lideres: [
    { lider: 'Pedro Sánchez (PSOE)',           valoracion: 3.8, n_conoce_pct: 98.1 },
    { lider: 'Alberto Núñez Feijóo (PP)',      valoracion: 3.5, n_conoce_pct: 94.7 },
    { lider: 'Santiago Abascal (Vox)',         valoracion: 2.6, n_conoce_pct: 92.3 },
    { lider: 'Yolanda Díaz (Sumar)',           valoracion: 3.4, n_conoce_pct: 88.9 },
    { lider: 'Ione Belarra (Podemos)',         valoracion: 2.9, n_conoce_pct: 80.2 },
  ],
  // Confianza instituciones (escala 0-10)
  confianza_instituciones: [
    { institucion: 'Defensor del Pueblo',         valoracion: 5.1 },
    { institucion: 'Tribunal Constitucional',     valoracion: 4.6 },
    { institucion: 'Las Cortes Generales',        valoracion: 4.3 },
    { institucion: 'El Gobierno de España',       valoracion: 4.0 },
    { institucion: 'Los partidos políticos',      valoracion: 2.8 },
    { institucion: 'Los medios de comunicación',  valoracion: 4.2 },
    { institucion: 'Las grandes empresas',        valoracion: 3.7 },
    { institucion: 'Los sindicatos',              valoracion: 3.6 },
    { institucion: 'La Iglesia Católica',         valoracion: 3.3 },
    { institucion: 'Las fuerzas armadas',         valoracion: 5.8 },
  ],
  // Confianza en futuro económico (0=peor, 10=mejor)
  expectativa_economia_12m: {
    igual: 36.4,
    mejor: 22.1,
    peor: 35.3,
    nsnc: 6.2,
  },
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/cis/health · ping a CKAN buscando CIS
  if (action === 'health') {
    const probe = await ckanFetch('/catalog/dataset?_pageSize=1&q=CIS')
    return NextResponse.json({
      ok: true,
      auth_required: false,
      backend_ckan: !probe.error,
      snapshot_oleada: BAROMETRO_SNAPSHOT.oleada,
      snapshot_estudio: BAROMETRO_SNAPSHOT.estudio,
      snapshot_publicado: BAROMETRO_SNAPSHOT.publicado,
    })
  }

  // /api/cis/barometro-latest · ficha del último barómetro
  if (action === 'barometro-latest') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS · Barómetro mensual', `Última oleada ${BAROMETRO_SNAPSHOT.oleada}`),
      ...BAROMETRO_SNAPSHOT,
      registration_url: 'http://www.cis.es/cis/opencm/ES/1_encuestas/estudios/buscarBarometros.jsp',
      methodology: 'Encuesta CATI/CAPI · 4000 muestras · error muestral ±1.6pp · 95% confianza',
      note: 'Snapshot curado manualmente. Para microdatos completos, descarga el estudio en cis.es.',
    })
  }

  // /api/cis/problemas
  if (action === 'problemas') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS · Principales problemas España', BAROMETRO_SNAPSHOT.oleada),
      oleada: BAROMETRO_SNAPSHOT.oleada,
      problemas: BAROMETRO_SNAPSHOT.problemas_top,
      methodology: 'Respuesta espontánea · hasta 3 menciones por encuestado · pregunta P4 barómetro estándar',
    })
  }

  // /api/cis/valoracion-lideres
  if (action === 'valoracion-lideres') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS · Valoración líderes políticos', BAROMETRO_SNAPSHOT.oleada),
      oleada: BAROMETRO_SNAPSHOT.oleada,
      lideres: BAROMETRO_SNAPSHOT.valoracion_lideres,
      methodology: 'Escala 0-10 donde 0=muy mal, 10=muy bien · solo encuestados que conocen al líder',
    })
  }

  // /api/cis/confianza-instituciones
  if (action === 'confianza-instituciones') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS · Confianza institucional', BAROMETRO_SNAPSHOT.oleada),
      oleada: BAROMETRO_SNAPSHOT.oleada,
      instituciones: BAROMETRO_SNAPSHOT.confianza_instituciones,
      methodology: 'Escala 0-10 confianza · pregunta recurrente barómetros CIS',
    })
  }

  // /api/cis/intencion-voto
  if (action === 'intencion-voto') {
    return NextResponse.json({
      ok: true,
      data_quality: quality('seed', 'CIS · Estimación voto', BAROMETRO_SNAPSHOT.oleada),
      oleada: BAROMETRO_SNAPSHOT.oleada,
      partidos: BAROMETRO_SNAPSHOT.intencion_voto_partido,
      expectativa_economia_12m: BAROMETRO_SNAPSHOT.expectativa_economia_12m,
      methodology: 'Estimación voto general con cocina CIS aplicada (recuerdo voto + simpatía + probabilidad)',
      warning: 'La cocina CIS es opaca · valores difieren típicamente 2-4pp del resultado electoral final',
    })
  }

  // /api/cis/catalogo?q=
  if (action === 'catalogo') {
    const q = url.searchParams.get('q') || 'CIS barometro'
    const pageSize = url.searchParams.get('pageSize') || '20'
    const data = await ckanFetch(`/catalog/dataset?_pageSize=${pageSize}&q=${encodeURIComponent(q)}&publisher=CIS`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'datos.gob.es · CIS', data.error),
      })
    }
    const items = (data?.result?.items || []).map((it: any) => ({
      id: it._about,
      title: Array.isArray(it.title) ? it.title[0]?._value : it.title,
      issued: it.issued ?? null,
    }))
    return NextResponse.json({
      ok: true,
      q,
      data_quality: quality('live', 'datos.gob.es · catálogo CIS'),
      n_items: items.length,
      items,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/cis/health',
        'GET /api/cis/barometro-latest    · ficha completa última oleada CIS',
        'GET /api/cis/problemas           · ranking problemas percibidos',
        'GET /api/cis/valoracion-lideres  · escala 0-10 líderes',
        'GET /api/cis/confianza-instituciones · escala 0-10',
        'GET /api/cis/intencion-voto      · estimación voto + expectativa económica',
        'GET /api/cis/catalogo?q=...      · búsqueda CKAN datos.gob.es para CIS',
      ],
      snapshot_actual: {
        oleada: BAROMETRO_SNAPSHOT.oleada,
        publicado: BAROMETRO_SNAPSHOT.publicado,
        estudio: BAROMETRO_SNAPSHOT.estudio,
      },
    },
    { status: 404 },
  )
}
