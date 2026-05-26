import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, geoOsintFromArticles } from '@/lib/news-aggregator'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  // Sprint G13 FASE 2 · _geo_meta complementa _meta legacy con source_mode
  // declarativo (live_api / derived_from_news / mock) para que la UI distinga.
  const startedAt = Date.now()

  // 1. Intentar backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/osint-feed?limite=20')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json({
      ...withMeta(real, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'live_api',
        sources_used: ['backend · /api/geopolitica/osint-feed'],
        startedAt,
        confidence: 0.8,
        layer: 'fast_signal',
        notes: 'Backend FastAPI · feed OSINT en vivo',
      }),
    })
  }

  // 2. Derivar de feed RSS agregado
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 48 })
    const items = geoOsintFromArticles(articles).slice(0, 30)
    if (items.length > 0) {
      return NextResponse.json({
        ...withMeta({
          data: items,
          total: items.length,
          derived_from_feeds: true,
        }, 'backend'),
        _geo_meta: buildGeoMeta({
          source_mode: 'derived_from_news',
          sources_used: [`RSS agregado · ${articles.length} artículos`],
          startedAt,
          confidence: 0.55,
          layer: 'fast_signal',
          warnings: ['Derivado de titulares RSS · no es fuente OSINT primaria · validar con backend cuando esté disponible'],
          notes: 'Derivación heurística sobre RSS · sin backend',
        }),
      })
    }
  } catch (e) {
    console.error('[osint] feed derivation failed:', e)
  }

  // 3. Fallback mock
  const mock = {
    data: [
      { id: '1', titulo: 'Reunión bilateral España-Marruecos sobre migración', fuente: 'El País', fecha: new Date().toISOString(), urgencia: 4, categoria: 'migracion', resumen: 'Los ministros de exteriores han acordado nuevas medidas.' },
      { id: '2', titulo: 'OTAN reafirma compromiso con España en Mediterráneo', fuente: 'ABC', fecha: new Date().toISOString(), urgencia: 3, categoria: 'militar', resumen: 'La alianza confirma presencia naval.' },
      { id: '3', titulo: 'Tensión energética: España reduce dependencia del gas argelino', fuente: 'El Mundo', fecha: new Date().toISOString(), urgencia: 2, categoria: 'energia', resumen: 'El Gobierno diversifica proveedores.' },
    ],
  }
  return NextResponse.json({
    ...withMeta(mock, 'mock'),
    _geo_meta: buildGeoMeta({
      source_mode: 'mock',
      sources_used: ['mock interno · 3 items hardcoded'],
      startedAt,
      confidence: 0.10,
      layer: 'fast_signal',
      warnings: ['DATOS SINTÉTICOS · backend caído y RSS sin resultados · NO usar en producción'],
      notes: 'Última opción · fallback de desarrollo',
    }),
  })
}
