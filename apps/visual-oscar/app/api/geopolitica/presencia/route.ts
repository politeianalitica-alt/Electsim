import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface PresenciaItem {
  pais: string
  iso: string
  lat: number
  lon: number
  categoria: 'diplomatica' | 'empresarial' | 'militar' | 'cooperacion'
  intensidad: number  // 0-100
}

// Curado: presencia estructural histórica española (embajadas, IBEX-35 expansión, ONGs, militar OTAN)
const PRESENCIA_BASE: PresenciaItem[] = [
  // Vecindad y Magreb
  { pais: 'Marruecos',     iso: 'MAR', lat: 31.8,  lon:  -7.1,   categoria: 'diplomatica', intensidad: 85 },
  { pais: 'Portugal',      iso: 'PRT', lat: 39.4,  lon:  -8.2,   categoria: 'diplomatica', intensidad: 88 },
  { pais: 'Argelia',       iso: 'DZA', lat: 28.0,  lon:   2.6,   categoria: 'diplomatica', intensidad: 62 },
  { pais: 'Mauritania',    iso: 'MRT', lat: 21.0,  lon: -10.9,   categoria: 'cooperacion', intensidad: 55 },
  { pais: 'Senegal',       iso: 'SEN', lat: 14.5,  lon: -14.5,   categoria: 'cooperacion', intensidad: 52 },
  { pais: 'Túnez',         iso: 'TUN', lat: 33.9,  lon:   9.6,   categoria: 'cooperacion', intensidad: 48 },
  { pais: 'Libia',         iso: 'LBY', lat: 26.3,  lon:  17.2,   categoria: 'empresarial', intensidad: 35 },
  { pais: 'Egipto',        iso: 'EGY', lat: 26.8,  lon:  30.8,   categoria: 'empresarial', intensidad: 42 },
  { pais: 'Mali',          iso: 'MLI', lat: 17.6,  lon:  -4.0,   categoria: 'cooperacion', intensidad: 25 },
  // Europa
  { pais: 'Francia',       iso: 'FRA', lat: 46.2,  lon:   2.2,   categoria: 'diplomatica', intensidad: 78 },
  { pais: 'Alemania',      iso: 'DEU', lat: 51.2,  lon:  10.5,   categoria: 'diplomatica', intensidad: 71 },
  { pais: 'Italia',        iso: 'ITA', lat: 41.9,  lon:  12.6,   categoria: 'diplomatica', intensidad: 70 },
  { pais: 'Reino Unido',   iso: 'GBR', lat: 55.4,  lon:  -3.4,   categoria: 'empresarial', intensidad: 75 },
  { pais: 'Países Bajos',  iso: 'NLD', lat: 52.1,  lon:   5.3,   categoria: 'empresarial', intensidad: 60 },
  { pais: 'Bélgica',       iso: 'BEL', lat: 50.5,  lon:   4.5,   categoria: 'diplomatica', intensidad: 82 },
  { pais: 'Polonia',       iso: 'POL', lat: 51.9,  lon:  19.1,   categoria: 'empresarial', intensidad: 50 },
  { pais: 'Suecia',        iso: 'SWE', lat: 60.1,  lon:  18.6,   categoria: 'empresarial', intensidad: 35 },
  { pais: 'Suiza',         iso: 'CHE', lat: 46.8,  lon:   8.2,   categoria: 'empresarial', intensidad: 45 },
  { pais: 'Grecia',        iso: 'GRC', lat: 39.0,  lon:  21.8,   categoria: 'diplomatica', intensidad: 40 },
  // América
  { pais: 'México',        iso: 'MEX', lat: 23.6,  lon: -102.5,  categoria: 'empresarial', intensidad: 72 },
  { pais: 'Brasil',        iso: 'BRA', lat: -14.2, lon:  -51.9,  categoria: 'empresarial', intensidad: 68 },
  { pais: 'Argentina',     iso: 'ARG', lat: -38.4, lon:  -63.6,  categoria: 'empresarial', intensidad: 65 },
  { pais: 'Chile',         iso: 'CHL', lat: -35.7, lon:  -71.5,  categoria: 'empresarial', intensidad: 60 },
  { pais: 'Colombia',      iso: 'COL', lat: 4.6,   lon:  -74.1,  categoria: 'empresarial', intensidad: 58 },
  { pais: 'Perú',          iso: 'PER', lat: -10.0, lon:  -76.0,  categoria: 'empresarial', intensidad: 55 },
  { pais: 'Ecuador',       iso: 'ECU', lat:  -1.8, lon:  -78.2,  categoria: 'cooperacion', intensidad: 45 },
  { pais: 'Uruguay',       iso: 'URY', lat: -32.5, lon:  -55.8,  categoria: 'empresarial', intensidad: 40 },
  { pais: 'Bolivia',       iso: 'BOL', lat: -16.3, lon:  -63.6,  categoria: 'empresarial', intensidad: 38 },
  { pais: 'Cuba',          iso: 'CUB', lat: 21.5,  lon:  -77.8,  categoria: 'empresarial', intensidad: 50 },
  { pais: 'Venezuela',     iso: 'VEN', lat: 6.4,   lon:  -66.6,  categoria: 'empresarial', intensidad: 35 },
  { pais: 'Estados Unidos',iso: 'USA', lat: 38.0,  lon:  -97.0,  categoria: 'militar',     intensidad: 80 },
  { pais: 'Canadá',        iso: 'CAN', lat: 56.1,  lon: -106.3,  categoria: 'empresarial', intensidad: 32 },
  // Asia-Pacífico
  { pais: 'Japón',         iso: 'JPN', lat: 36.2,  lon:  138.3,  categoria: 'empresarial', intensidad: 38 },
  { pais: 'Corea del Sur', iso: 'KOR', lat: 35.9,  lon:  127.8,  categoria: 'empresarial', intensidad: 40 },
  { pais: 'India',         iso: 'IND', lat: 20.6,  lon:   78.9,  categoria: 'empresarial', intensidad: 35 },
  { pais: 'China',         iso: 'CHN', lat: 35.0,  lon:  105.0,  categoria: 'empresarial', intensidad: 50 },
  { pais: 'Australia',     iso: 'AUS', lat: -25.3, lon:  133.8,  categoria: 'empresarial', intensidad: 30 },
  // Oriente Medio
  { pais: 'Turquía',       iso: 'TUR', lat: 39.0,  lon:   35.0,  categoria: 'empresarial', intensidad: 42 },
  { pais: 'Arabia Saudí',  iso: 'SAU', lat: 23.9,  lon:   45.1,  categoria: 'empresarial', intensidad: 48 },
  { pais: 'Israel',        iso: 'ISR', lat: 31.0,  lon:   35.0,  categoria: 'diplomatica', intensidad: 30 },
  // Conflicto / militar
  { pais: 'Ucrania',       iso: 'UKR', lat: 48.4,  lon:   31.2,  categoria: 'militar',     intensidad: 45 },
  // África subsahariana
  { pais: 'Sudáfrica',     iso: 'ZAF', lat: -30.6, lon:   22.9,  categoria: 'empresarial', intensidad: 28 },
  { pais: 'Nigeria',       iso: 'NGA', lat: 9.1,   lon:    8.7,  categoria: 'empresarial', intensidad: 32 },
]

const COUNTRY_MENTIONS: Record<string, string> = {
  // Vecindad
  marruecos: 'Marruecos', argelia: 'Argelia', francia: 'Francia', alemania: 'Alemania',
  rusia: 'Rusia', ucrania: 'Ucrania', china: 'China', israel: 'Israel', irán: 'Irán', iran: 'Irán',
 'estados unidos': 'Estados Unidos', 'ee.uu.': 'Estados Unidos', portugal: 'Portugal', italia: 'Italia',
 'reino unido': 'Reino Unido', méxico: 'México', mexico: 'México', brasil: 'Brasil',
  argentina: 'Argentina', chile: 'Chile', colombia: 'Colombia', mauritania: 'Mauritania', senegal: 'Senegal',
  // Nuevos
  perú: 'Perú', peru: 'Perú', ecuador: 'Ecuador', uruguay: 'Uruguay', bolivia: 'Bolivia',
  cuba: 'Cuba', venezuela: 'Venezuela', canadá: 'Canadá', canada: 'Canadá',
 'países bajos': 'Países Bajos', 'paises bajos': 'Países Bajos', holanda: 'Países Bajos',
  bélgica: 'Bélgica', belgica: 'Bélgica', polonia: 'Polonia', suecia: 'Suecia',
  suiza: 'Suiza', grecia: 'Grecia', egipto: 'Egipto', túnez: 'Túnez', tunez: 'Túnez',
  libia: 'Libia', sudáfrica: 'Sudáfrica', sudafrica: 'Sudáfrica', nigeria: 'Nigeria',
  mali: 'Mali', japón: 'Japón', japon: 'Japón', 'corea del sur': 'Corea del Sur',
  india: 'India', australia: 'Australia', turquía: 'Turquía', turquia: 'Turquía',
 'arabia saudí': 'Arabia Saudí', 'arabia saudi': 'Arabia Saudí',
}

export async function GET() {
  // 1. Backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/presencia-espanola-geo')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Modular intensidad por menciones recientes en feeds
  try {
    const articles = await getAggregatedNews({ maxSources: 30, hoursBack: 72 })
    const mentionCount = new Map<string, number>()
    for (const a of articles) {
      const lower = `${a.title} ${a.description}`.toLowerCase()
      for (const [k, v] of Object.entries(COUNTRY_MENTIONS)) {
        if (lower.includes(k)) {
          mentionCount.set(v, (mentionCount.get(v) || 0) + 1)
        }
      }
    }
    // Ajuste +/-: cada mención aporta hasta +10 a la intensidad estructural
    const data = PRESENCIA_BASE.map(p => {
      const ment = mentionCount.get(p.pais) || 0
      const boost = Math.min(15, Math.log10(ment + 1) * 8)
      return { ...p, intensidad: Math.min(100, Math.round(p.intensidad + boost)) }
    })
    return NextResponse.json(withMeta({
      data,
      total: data.length,
      derived_from_feeds: true,
    }, 'backend'))
  } catch (e) {
    console.error('[presencia] feed derivation failed:', e)
  }

  // 3. Fallback estructural
  return NextResponse.json(withMeta({ data: PRESENCIA_BASE }, 'mock'))
}
