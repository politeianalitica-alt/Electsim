import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, geoRiesgoFromArticles } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Riesgos base (curados): países que estructuralmente vigilamos aunque no haya noticias hoy
const BASE_RIESGO = [
  { pais: 'Rusia',     iso: 'RUS', score: 8.5, interes_espana: 7.2, lat: 60,   lon: 100,    categoria: 'militar' },
  { pais: 'Marruecos', iso: 'MAR', score: 6.1, interes_espana: 8.5, lat: 31.8, lon: -7.1,   categoria: 'migracion' },
  { pais: 'Venezuela', iso: 'VEN', score: 7.3, interes_espana: 6.8, lat: 6.4,  lon: -66.6,  categoria: 'diplomatica' },
  { pais: 'Argelia',   iso: 'DZA', score: 5.8, interes_espana: 7.9, lat: 28.0, lon: 2.6,    categoria: 'energia' },
  { pais: 'Ucrania',   iso: 'UKR', score: 9.1, interes_espana: 6.5, lat: 48.4, lon: 31.2,   categoria: 'militar' },
]

export async function GET() {
  // 1. Backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/riesgo-pais?limite=30')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Derivar de feeds — fusionado con la lista base
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 96 })
    const derived  = geoRiesgoFromArticles(articles)

    // Merge: si un país base ya viene del feed, mantenemos el score derivado;
    // si no, dejamos el score base estructural.
    const byPais = new Map<string, typeof BASE_RIESGO[number]>()
    for (const b of BASE_RIESGO) byPais.set(b.pais, b)
    for (const d of derived)     byPais.set(d.pais, d)

    const data = Array.from(byPais.values()).sort((a, b) => b.score - a.score)
    return NextResponse.json(withMeta({
      data,
      total: data.length,
      derived_from_feeds: derived.length > 0,
    }, 'backend'))
  } catch (e) {
    console.error('[riesgo-pais] feed derivation failed:', e)
  }

  // 3. Fallback puro
  return NextResponse.json(withMeta({ data: BASE_RIESGO }, 'mock'))
}
