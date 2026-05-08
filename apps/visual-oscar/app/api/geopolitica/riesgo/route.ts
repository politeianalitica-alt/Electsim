import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Static lat/lon for common countries to support Plotly scattergeo
const GEO: Record<string, [number, number]> = {
  RU: [60, 100], UA: [48.4, 31.2], IL: [31.5, 35], PS: [31.9, 35.2],
  IR: [32, 53], CN: [35, 105], US: [38, -97], MA: [31.8, -7.1],
  DZ: [28, 2.6], TR: [39, 35], VE: [6.4, -66.6], GB: [54, -2],
  FR: [46, 2], DE: [51, 10], IT: [42, 12], KP: [40, 127],
  SY: [35, 38], LB: [33.9, 35.5], EG: [27, 30], MX: [23, -102],
  AR: [-38, -63], BR: [-10, -55], IN: [20, 77], PK: [30, 70],
  SA: [24, 45], LY: [27, 17], SD: [15, 30], ML: [17, -4],
  NE: [16, 8], TD: [15, 19], ET: [9, 38], SO: [6, 46],
  AF: [33, 65], IQ: [33, 44], YE: [15, 48], MM: [17, 96],
}
const NAME_TO_ISO: Record<string, string> = {
  Russia: 'RU', Ukraine: 'UA', Israel: 'IL', Palestine: 'PS',
  Iran: 'IR', China: 'CN', USA: 'US', 'United States': 'US',
  Morocco: 'MA', Algeria: 'DZ', Turkey: 'TR', Venezuela: 'VE',
  'United Kingdom': 'GB', France: 'FR', Germany: 'DE', Italy: 'IT',
  'North Korea': 'KP', Syria: 'SY', Lebanon: 'LB', Egypt: 'EG',
  Mexico: 'MX', Argentina: 'AR',
}

export async function GET() {
  // Use the real country-risk endpoint which queries news_articles
  const real = await fromBackend<Array<Record<string, unknown>>>('/geopolitica/country-risk')
  if (Array.isArray(real) && real.length > 0) {
    const data = real.map(r => {
      const name = String(r.name ?? '')
      const code = String(r.code ?? NAME_TO_ISO[name] ?? name.slice(0, 2).toUpperCase())
      const [lat, lon] = GEO[code] ?? [0, 0]
      return {
        pais: name,
        iso: code,
        score: Number(r.risk ?? 0) / 10,       // scale 0-100 → 0-10
        interes_espana: Number(r.n_articles_7d ?? 0) / 5,
        lat, lon,
        categoria: String(r.status ?? 'watch'),
      }
    })
    return NextResponse.json(withMeta({ data }, 'backend'))
  }
  const mock = {
    data: [
      { pais: 'Rusia',       iso: 'RU', score: 9.1, interes_espana: 7.2, lat: 60,   lon: 100,   categoria: 'militar' },
      { pais: 'Ucrania',     iso: 'UA', score: 9.1, interes_espana: 6.5, lat: 48.4, lon: 31.2,  categoria: 'militar' },
      { pais: 'Marruecos',   iso: 'MA', score: 6.1, interes_espana: 8.5, lat: 31.8, lon: -7.1,  categoria: 'migracion' },
      { pais: 'Venezuela',   iso: 'VE', score: 7.3, interes_espana: 6.8, lat: 6.4,  lon: -66.6, categoria: 'diplomatica' },
      { pais: 'Argelia',     iso: 'DZ', score: 5.8, interes_espana: 7.9, lat: 28.0, lon: 2.6,   categoria: 'energia' },
      { pais: 'Irán',        iso: 'IR', score: 7.2, interes_espana: 5.0, lat: 32,   lon: 53,    categoria: 'militar' },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
