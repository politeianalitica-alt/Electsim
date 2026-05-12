import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface PresenciaItem {
  pais: string
  lat: number
  lon: number
  categoria: 'diplomatica' | 'empresarial' | 'militar' | 'cooperacion'
  intensidad: number  // 0-100
}

// Curado: presencia estructural histórica española (embajadas, IBEX-35 expansión, ONGs, militar OTAN)
const PRESENCIA_BASE: PresenciaItem[] = [
  { pais: 'Marruecos',  lat: 31.8,  lon: -7.1,    categoria: 'diplomatica', intensidad: 85 },
  { pais: 'México',     lat: 23.6,  lon: -102.5,  categoria: 'empresarial', intensidad: 72 },
  { pais: 'Brasil',     lat: -14.2, lon: -51.9,   categoria: 'empresarial', intensidad: 68 },
  { pais: 'Francia',    lat: 46.2,  lon: 2.2,     categoria: 'diplomatica', intensidad: 78 },
  { pais: 'Alemania',   lat: 51.2,  lon: 10.5,    categoria: 'diplomatica', intensidad: 71 },
  { pais: 'Ucrania',    lat: 48.4,  lon: 31.2,    categoria: 'militar',     intensidad: 45 },
  { pais: 'Argentina',  lat: -38.4, lon: -63.6,   categoria: 'empresarial', intensidad: 65 },
  { pais: 'Chile',      lat: -35.7, lon: -71.5,   categoria: 'empresarial', intensidad: 60 },
  { pais: 'Colombia',   lat: 4.6,   lon: -74.1,   categoria: 'empresarial', intensidad: 58 },
  { pais: 'Portugal',   lat: 39.4,  lon: -8.2,    categoria: 'diplomatica', intensidad: 88 },
  { pais: 'Argelia',    lat: 28.0,  lon: 2.6,     categoria: 'diplomatica', intensidad: 62 },
  { pais: 'Mauritania', lat: 21.0,  lon: -10.9,   categoria: 'cooperacion', intensidad: 55 },
  { pais: 'Senegal',    lat: 14.5,  lon: -14.5,   categoria: 'cooperacion', intensidad: 52 },
  { pais: 'Italia',     lat: 41.9,  lon: 12.6,    categoria: 'diplomatica', intensidad: 70 },
  { pais: 'Reino Unido',lat: 55.4,  lon: -3.4,    categoria: 'empresarial', intensidad: 75 },
  { pais: 'Israel',     lat: 31.0,  lon: 35.0,    categoria: 'diplomatica', intensidad: 38 },
]

const COUNTRY_MENTIONS: Record<string, string> = {
  marruecos: 'Marruecos', argelia: 'Argelia', francia: 'Francia', alemania: 'Alemania',
  rusia: 'Rusia', ucrania: 'Ucrania', china: 'China', israel: 'Israel', irán: 'Irán', iran: 'Irán',
  'estados unidos': 'EE.UU.', 'ee.uu.': 'EE.UU.', portugal: 'Portugal', italia: 'Italia',
  'reino unido': 'Reino Unido', méxico: 'México', mexico: 'México', brasil: 'Brasil',
  argentina: 'Argentina', chile: 'Chile', colombia: 'Colombia', mauritania: 'Mauritania', senegal: 'Senegal',
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
