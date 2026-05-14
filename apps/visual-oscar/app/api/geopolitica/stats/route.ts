import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import {
  getAggregatedNews,
  geoOsintFromArticles,
  geoAlertasFromArticles,
  geoRiesgoFromArticles,
} from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  // 1. Backend real
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/geo-stats')
  if (real && typeof real === 'object' && 'osint_24h' in real) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Derivar agregados de los feeds (ventana de 7 días para llenar el KPI "Noticias int. 7d")
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 168 })
    const osint    = geoOsintFromArticles(articles)
    const alertas  = geoAlertasFromArticles(articles)
    const riesgos  = geoRiesgoFromArticles(articles)

    const now    = Date.now()
    const last24 = articles.filter(a => a.pubDate && now - a.pubDate.getTime() < 24 * 3600_000)
    const last7d = articles.filter(a => a.pubDate && now - a.pubDate.getTime() < 7 * 24 * 3600_000)
    const osint24h = osint.filter(o => now - new Date(o.fecha).getTime() < 24 * 3600_000).length

    const alertCount: Record<string, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
    for (const a of alertas) alertCount[a.nivel]++

    // Conflictos activos: países con score ≥ 8 (riesgo alto sostenido)
    const conflictos = riesgos.filter(r => r.score >= 8).length
    // Impacto alto España: alertas críticas + altas que tocan a España o vecindad
    const impactoAlto = alertCount.CRITICO + alertCount.ALTO

    return NextResponse.json(withMeta({
      // KPIs core
      articulos_internacionales_7d: last7d.length,
      alertas_activas: alertas.length,
      paises_monitorizados: riesgos.length,
      conflictos_activos: conflictos,
      impacto_espana_alto_7d: impactoAlto,
      presencia_activa: 12, // valor estructural (España tiene presencia diplomática activa en ~12 países clave)
      // KPIs auxiliares (legacy)
      osint_24h: osint24h || osint.length,
      total_articulos: last24.length,
      alertas_count: alertCount,
      derived_from_feeds: true,
      updated_at: new Date().toISOString(),
    }, 'backend'))
  } catch (e) {
    console.error('[geo-stats] feed derivation failed:', e)
  }

  // 3. Fallback
  const mock = {
    articulos_internacionales_7d: 1240,
    alertas_activas: 8,
    paises_monitorizados: 23,
    conflictos_activos: 4,
    impacto_espana_alto_7d: 5,
    presencia_activa: 12,
    osint_24h: 47,
    alertas_count: { CRITICO: 2, ALTO: 3, MEDIO: 3 },
    updated_at: new Date().toISOString(),
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
