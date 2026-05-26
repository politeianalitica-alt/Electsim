import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, geoAlertasFromArticles } from '@/lib/news-aggregator'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const startedAt = Date.now()

  // 1. Intentar backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/alertas-geo?limite=40')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json({
      ...withMeta(real, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'live_api',
        sources_used: ['backend · /api/geopolitica/alertas-geo'],
        startedAt, confidence: 0.8, layer: 'fast_signal',
      }),
    })
  }

  // 2. Derivar de feeds RSS
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 72 })
    const items = geoAlertasFromArticles(articles).slice(0, 25)
    if (items.length > 0) {
      const data = items.map(a => ({
        id: a.id, titulo: a.titulo, nivel: a.nivel, fecha: a.fecha,
        paises: a.paises, descripcion: a.descripcion,
        fuente: 'Feed RSS · Politeia', url: a.url,
      }))
      return NextResponse.json({
        ...withMeta({ data, total: data.length, derived_from_feeds: true }, 'backend'),
        _geo_meta: buildGeoMeta({
          source_mode: 'derived_from_news',
          sources_used: [`RSS agregado · ${articles.length} artículos`],
          startedAt, confidence: 0.55, layer: 'fast_signal',
          warnings: ['Alertas derivadas de titulares RSS · no de fuente OSINT oficial · severidad heurística'],
        }),
      })
    }
  } catch (e) {
    console.error('[alertas-geo] feed derivation failed:', e)
  }

  // 3. Fallback mock
  const mock = {
    data: [
      { id: '1', titulo: 'Crisis migratoria Canarias — nivel máximo', nivel: 'CRITICO', fecha: new Date().toISOString(), paises: ['Marruecos', 'Senegal'], descripcion: 'Llegadas +34% en 2026. Presión extrema.', fuente: 'FRONTEX' },
      { id: '2', titulo: 'Escalada tensión Oriente Medio', nivel: 'ALTO', fecha: new Date().toISOString(), paises: ['Israel', 'Irán'], descripcion: 'Riesgo de extensión del conflicto.', fuente: 'ACLED' },
      { id: '3', titulo: 'Aranceles EE.UU. a exportaciones españolas', nivel: 'ALTO', fecha: new Date().toISOString(), paises: ['EE.UU.'], descripcion: 'Exposición estimada 12.000M€.', fuente: 'Comisión Europea' },
      { id: '4', titulo: 'Elecciones Francia — escenario Le Pen', nivel: 'MEDIO', fecha: new Date().toISOString(), paises: ['Francia'], descripcion: 'Victoria Le Pen reforzaría narrativa VOX.', fuente: 'ElectSim' },
    ],
  }
  return NextResponse.json({
    ...withMeta(mock, 'mock'),
    _geo_meta: buildGeoMeta({
      source_mode: 'mock',
      sources_used: ['mock interno · 4 alertas hardcoded'],
      startedAt, confidence: 0.10, layer: 'fast_signal',
      warnings: ['DATOS SINTÉTICOS · NO usar en producción'],
    }),
  })
}
