import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GEO_LOOKUP: Record<string, { lat: number; lon: number; cat: string }> = {
  Marruecos:   { lat: 31.8, lon:  -7.1, cat: 'diplomatica' },
  Argelia:     { lat: 28.0, lon:   2.6, cat: 'energetica'  },
  Ucrania:     { lat: 48.4, lon:  31.2, cat: 'militar'     },
  Iraq:        { lat: 33.0, lon:  44.0, cat: 'militar'     },
  Líbano:      { lat: 33.9, lon:  35.5, cat: 'militar'     },
  Mali:        { lat: 17.0, lon:  -4.0, cat: 'militar'     },
  Níger:       { lat: 16.0, lon:   8.0, cat: 'militar'     },
  México:      { lat: 23.0, lon:-102.0, cat: 'diplomatica' },
  Argentina:   { lat:-38.0, lon: -63.0, cat: 'diplomatica' },
  Latinoamérica: { lat: -5.0, lon: -65.0, cat: 'diplomatica' },
  'Indo-Pacífico': { lat: 10.0, lon: 110.0, cat: 'diplomatica' },
}

export async function GET() {
  // Use the spain-presence endpoint which returns curated territory data
  const real = await fromBackend<Array<Record<string, unknown>>>('/geopolitica/spain-presence')
  if (Array.isArray(real) && real.length > 0) {
    const data = real.flatMap(r => {
      const territory = String(r.territory ?? '')
      const level = String(r.level ?? 'low')
      const intensidad = level === 'high' ? 80 : level === 'medium' ? 50 : 25
      const matched = Object.entries(GEO_LOOKUP).find(([k]) =>
        territory.toLowerCase().includes(k.toLowerCase())
      )
      if (!matched) return []
      const [pais, { lat, lon, cat }] = matched
      return [{ pais, lat, lon, categoria: cat, intensidad }]
    })
    if (data.length > 0) return NextResponse.json(withMeta({ data }, 'backend'))
  }
  const mock = {
    data: [
      { pais: 'Marruecos',  lat:  31.8, lon:  -7.1, categoria: 'diplomatica', intensidad: 85 },
      { pais: 'Argelia',    lat:  28.0, lon:   2.6, categoria: 'energetica',  intensidad: 90 },
      { pais: 'Ucrania',    lat:  48.4, lon:  31.2, categoria: 'militar',     intensidad: 70 },
      { pais: 'Iraq',       lat:  33.0, lon:  44.0, categoria: 'militar',     intensidad: 60 },
      { pais: 'Líbano',     lat:  33.9, lon:  35.5, categoria: 'militar',     intensidad: 65 },
      { pais: 'México',     lat:  23.0, lon:-102.0, categoria: 'diplomatica', intensidad: 55 },
      { pais: 'Argentina',  lat: -38.0, lon: -63.0, categoria: 'diplomatica', intensidad: 50 },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
