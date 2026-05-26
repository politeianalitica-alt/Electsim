import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, geoRiesgoFromArticles } from '@/lib/news-aggregator'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Riesgos base (curados): países que estructuralmente vigilamos aunque no haya noticias hoy
// Score 0-10 (riesgo geopolítico) · interes_espana 0-10 (relevancia para España)
const BASE_RIESGO = [
  // Conflicto activo / alto riesgo
  { pais: 'Rusia',         iso: 'RUS', score: 8.5, interes_espana: 7.2, lat: 60,    lon: 100,   categoria: 'militar' },
  { pais: 'Ucrania',       iso: 'UKR', score: 9.1, interes_espana: 6.5, lat: 48.4,  lon: 31.2,  categoria: 'militar' },
  { pais: 'Israel',        iso: 'ISR', score: 8.4, interes_espana: 6.8, lat: 31.0,  lon: 35.0,  categoria: 'militar' },
  { pais: 'Gaza',          iso: 'GAZ', score: 9.4, interes_espana: 6.8, lat: 31.5,  lon: 34.4,  categoria: 'militar' },
  { pais: 'Palestina',     iso: 'PSE', score: 8.6, interes_espana: 6.5, lat: 31.9,  lon: 35.2,  categoria: 'militar' },
  { pais: 'Irán',          iso: 'IRN', score: 8.0, interes_espana: 5.8, lat: 32.4,  lon: 53.7,  categoria: 'militar' },
  { pais: 'Libia',         iso: 'LBY', score: 7.5, interes_espana: 6.8, lat: 26.3,  lon: 17.2,  categoria: 'migracion' },
  { pais: 'Mali',          iso: 'MLI', score: 8.2, interes_espana: 6.0, lat: 17.6,  lon: -4.0,  categoria: 'militar' },
  { pais: 'Venezuela',     iso: 'VEN', score: 7.3, interes_espana: 6.8, lat:  6.4,  lon: -66.6, categoria: 'diplomatica' },
  // Vecindad inmediata
  { pais: 'Marruecos',     iso: 'MAR', score: 6.1, interes_espana: 9.5, lat: 31.8,  lon: -7.1,  categoria: 'migracion' },
  { pais: 'Argelia',       iso: 'DZA', score: 5.8, interes_espana: 8.2, lat: 28.0,  lon:  3.0,  categoria: 'energia' },
  { pais: 'Mauritania',    iso: 'MRT', score: 5.5, interes_espana: 7.0, lat: 21.0,  lon: -10.9, categoria: 'migracion' },
  { pais: 'Senegal',       iso: 'SEN', score: 5.2, interes_espana: 7.2, lat: 14.5,  lon: -14.5, categoria: 'migracion' },
  { pais: 'Túnez',         iso: 'TUN', score: 6.0, interes_espana: 6.5, lat: 33.9,  lon:  9.6,  categoria: 'migracion' },
  { pais: 'Egipto',        iso: 'EGY', score: 5.5, interes_espana: 6.0, lat: 26.8,  lon: 30.8,  categoria: 'diplomatica' },
  // Socios UE
  { pais: 'Francia',       iso: 'FRA', score: 4.0, interes_espana: 8.0, lat: 46.2,  lon:  2.2,  categoria: 'diplomatica' },
  { pais: 'Alemania',      iso: 'DEU', score: 3.6, interes_espana: 7.0, lat: 51.2,  lon: 10.5,  categoria: 'diplomatica' },
  { pais: 'Italia',        iso: 'ITA', score: 4.3, interes_espana: 6.5, lat: 42.5,  lon: 12.6,  categoria: 'diplomatica' },
  { pais: 'Portugal',      iso: 'PRT', score: 2.5, interes_espana: 9.0, lat: 39.4,  lon: -8.2,  categoria: 'diplomatica' },
  { pais: 'Reino Unido',   iso: 'GBR', score: 4.5, interes_espana: 6.8, lat: 55.4,  lon: -3.4,  categoria: 'diplomatica' },
  { pais: 'Países Bajos',  iso: 'NLD', score: 3.2, interes_espana: 6.5, lat: 52.1,  lon:  5.3,  categoria: 'comercio' },
  { pais: 'Bélgica',       iso: 'BEL', score: 3.5, interes_espana: 6.2, lat: 50.5,  lon:  4.5,  categoria: 'union_europea' },
  { pais: 'Polonia',       iso: 'POL', score: 5.0, interes_espana: 5.5, lat: 51.9,  lon: 19.1,  categoria: 'militar' },
  { pais: 'Suecia',        iso: 'SWE', score: 3.6, interes_espana: 5.0, lat: 60.1,  lon: 18.6,  categoria: 'diplomatica' },
  { pais: 'Suiza',         iso: 'CHE', score: 2.5, interes_espana: 5.5, lat: 46.8,  lon:  8.2,  categoria: 'comercio' },
  { pais: 'Grecia',        iso: 'GRC', score: 4.5, interes_espana: 5.8, lat: 39.0,  lon: 21.8,  categoria: 'union_europea' },
  // EE.UU. y Asia
  { pais: 'Estados Unidos',iso: 'USA', score: 6.2, interes_espana: 7.5, lat: 38.0,  lon: -97.0, categoria: 'militar' },
  { pais: 'Canadá',        iso: 'CAN', score: 3.0, interes_espana: 5.0, lat: 56.1,  lon: -106.3, categoria: 'comercio' },
  { pais: 'China',         iso: 'CHN', score: 7.0, interes_espana: 6.0, lat: 35.0,  lon: 105.0, categoria: 'comercio' },
  { pais: 'Japón',         iso: 'JPN', score: 3.8, interes_espana: 5.2, lat: 36.2,  lon: 138.3, categoria: 'comercio' },
  { pais: 'Corea del Sur', iso: 'KOR', score: 5.5, interes_espana: 5.5, lat: 35.9,  lon: 127.8, categoria: 'comercio' },
  { pais: 'India',         iso: 'IND', score: 5.2, interes_espana: 5.0, lat: 20.6,  lon: 78.9,  categoria: 'comercio' },
  { pais: 'Australia',     iso: 'AUS', score: 3.0, interes_espana: 4.5, lat: -25.3, lon: 133.8, categoria: 'diplomatica' },
  // Oriente Medio / Magreb
  { pais: 'Turquía',       iso: 'TUR', score: 6.5, interes_espana: 5.5, lat: 39.0,  lon: 35.0,  categoria: 'militar' },
  { pais: 'Arabia Saudí',  iso: 'SAU', score: 5.8, interes_espana: 6.0, lat: 23.9,  lon: 45.1,  categoria: 'energia' },
  // América Latina
  { pais: 'México',        iso: 'MEX', score: 6.3, interes_espana: 5.8, lat: 23.6,  lon: -102.5, categoria: 'diplomatica' },
  { pais: 'Brasil',        iso: 'BRA', score: 5.0, interes_espana: 5.5, lat: -14.0, lon: -51.9, categoria: 'comercio' },
  { pais: 'Argentina',     iso: 'ARG', score: 6.0, interes_espana: 5.2, lat: -38.4, lon: -63.6, categoria: 'diplomatica' },
  { pais: 'Cuba',          iso: 'CUB', score: 5.8, interes_espana: 4.5, lat: 21.5,  lon: -77.8, categoria: 'diplomatica' },
  { pais: 'Chile',         iso: 'CHL', score: 4.0, interes_espana: 5.5, lat: -35.7, lon: -71.5, categoria: 'comercio' },
  { pais: 'Colombia',      iso: 'COL', score: 5.5, interes_espana: 5.8, lat:  4.6,  lon: -74.1, categoria: 'comercio' },
  { pais: 'Perú',          iso: 'PER', score: 6.0, interes_espana: 5.0, lat: -10.0, lon: -76.0, categoria: 'comercio' },
  { pais: 'Ecuador',       iso: 'ECU', score: 6.8, interes_espana: 5.5, lat:  -1.8, lon: -78.2, categoria: 'migracion' },
  { pais: 'Uruguay',       iso: 'URY', score: 2.5, interes_espana: 4.5, lat: -32.5, lon: -55.8, categoria: 'diplomatica' },
  { pais: 'Bolivia',       iso: 'BOL', score: 5.2, interes_espana: 4.8, lat: -16.3, lon: -63.6, categoria: 'energia' },
  // África subsahariana
  { pais: 'Sudáfrica',     iso: 'ZAF', score: 5.0, interes_espana: 4.5, lat: -30.6, lon: 22.9,  categoria: 'comercio' },
  { pais: 'Nigeria',       iso: 'NGA', score: 6.5, interes_espana: 5.5, lat:  9.1,  lon:  8.7,  categoria: 'energia' },
]

export async function GET() {
  const startedAt = Date.now()

  // 1. Backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/riesgo-pais?limite=30')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json({
      ...withMeta(real, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'live_api',
        sources_used: ['backend · /api/geopolitica/riesgo-pais'],
        startedAt, confidence: 0.75, layer: 'analytical_model',
        notes: 'Score de riesgo país desde backend FastAPI',
      }),
    })
  }

  // 2. Derivar de feeds — fusionado con la lista base
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 96 })
    const derived  = geoRiesgoFromArticles(articles)

    const byPais = new Map<string, typeof BASE_RIESGO[number]>()
    for (const b of BASE_RIESGO) byPais.set(b.pais, b)
    for (const d of derived)     byPais.set(d.pais, d)

    const data = Array.from(byPais.values()).sort((a, b) => b.score - a.score)
    return NextResponse.json({
      ...withMeta({ data, total: data.length, derived_from_feeds: derived.length > 0 }, 'backend'),
      _geo_meta: buildGeoMeta({
        // Híbrido: baseline curado (la mayoría) + override de feeds RSS (algunos países)
        source_mode: derived.length > 0 ? 'hybrid' : 'curated_baseline',
        sources_used: [
          `baseline curado · ${BASE_RIESGO.length} países`,
          ...(derived.length > 0 ? [`RSS agregado · ${articles.length} artículos · ${derived.length} países con override`] : []),
        ],
        startedAt,
        confidence: derived.length > 0 ? 0.6 : 0.55,
        layer: 'analytical_model',
        warnings: [
          'Score "riesgo país" es PRIOR CURADO + override por noticias · NO es probabilidad objetiva de conflicto',
          'interes_espana es valor editorial Politeia · revisión manual',
        ],
        notes: 'Baseline curado de 47 países + override por feeds RSS si hay menciones recientes',
      }),
    })
  } catch (e) {
    console.error('[riesgo-pais] feed derivation failed:', e)
  }

  // 3. Fallback puro al baseline curado
  return NextResponse.json({
    ...withMeta({ data: BASE_RIESGO }, 'mock'),
    _geo_meta: buildGeoMeta({
      source_mode: 'curated_baseline',
      sources_used: [`baseline curado · ${BASE_RIESGO.length} países`],
      startedAt, confidence: 0.50, layer: 'analytical_model',
      warnings: ['RSS no disponible · sólo baseline curado · sin override por noticias recientes'],
    }),
  })
}
