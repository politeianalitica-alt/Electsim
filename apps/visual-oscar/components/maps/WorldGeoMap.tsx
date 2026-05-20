'use client'

import { useEffect, useState, useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'

interface WorldGeoMapProps {
  /** Risk data by ISO2 or ISO3 country code */
  riesgo: Array<{
    code: string
    name: string
    risk: number
    status?: string
    n_articles_30d?: number
    avg_sentiment?: number
    has_data?: boolean
  }>
  /** Highlight Spain by default */
  highlightISO?: string
  /** Optional click handler */
  onCountryClick?: (code: string, name: string) => void
}

// ── ISO mapping ────────────────────────────────────────────────────────────
// World GeoJSON uses country names only. We map them to ISO2 for our data.
const NAME_TO_ISO2: Record<string, string> = {
 'Russia': 'RU', 'Russian Federation': 'RU',
 'Ukraine': 'UA',
 'Israel': 'IL',
 'Palestine': 'PS', 'Palestinian Territories': 'PS',
 'Iran': 'IR', 'Iran, Islamic Republic of': 'IR',
 'China': 'CN', "People's Republic of China": 'CN',
 'United States': 'US', 'United States of America': 'US', 'USA': 'US',
 'Morocco': 'MA',
 'Algeria': 'DZ',
 'Turkey': 'TR',
 'Venezuela': 'VE',
 'United Kingdom': 'GB',
 'France': 'FR',
 'Germany': 'DE',
 'Italy': 'IT',
 'Spain': 'ES',
 'Portugal': 'PT',
 'North Korea': 'KP', 'Democratic People\'s Republic of Korea': 'KP',
 'South Korea': 'KR', 'Republic of Korea': 'KR',
 'Syria': 'SY', 'Syrian Arab Republic': 'SY',
 'Lebanon': 'LB',
 'Egypt': 'EG',
 'Mexico': 'MX',
 'Argentina': 'AR',
 'Brazil': 'BR',
 'India': 'IN',
 'Pakistan': 'PK',
 'Saudi Arabia': 'SA',
 'Libya': 'LY',
 'Sudan': 'SD',
 'Mali': 'ML',
 'Niger': 'NE',
 'Chad': 'TD',
 'Ethiopia': 'ET',
 'Somalia': 'SO',
 'Afghanistan': 'AF',
 'Iraq': 'IQ',
 'Yemen': 'YE',
 'Myanmar': 'MM',
 'Japan': 'JP',
 'Taiwan': 'TW',
 'Cuba': 'CU',
 'Colombia': 'CO',
 'Peru': 'PE',
 'Chile': 'CL',
 'Nigeria': 'NG',
 'South Africa': 'ZA',
 'Kenya': 'KE',
 'Australia': 'AU',
 'Canada': 'CA',
 'Belarus': 'BY',
 'Poland': 'PL',
 'Belgium': 'BE',
 'Netherlands': 'NL',
 'Switzerland': 'CH',
 'Greece': 'GR',
 'Sweden': 'SE',
 'Norway': 'NO',
 'Finland': 'FI',
 'Denmark': 'DK',
 'Austria': 'AT',
 'Ireland': 'IE',
 'Hungary': 'HU',
 'Romania': 'RO',
 'Czech Republic': 'CZ', 'Czechia': 'CZ',
 'Slovakia': 'SK',
}

function riskColor(r: number): string {
  if (r >= 70) return '#dc2626'
  if (r >= 50) return '#f59e0b'
  if (r >= 30) return '#3b82f6'
  return '#86efac'
}

function riskFill(r: number, alpha = 1): string {
  if (r >= 70) return `rgba(220, 38, 38, ${alpha})`
  if (r >= 50) return `rgba(245, 158, 11, ${alpha})`
  if (r >= 30) return `rgba(59, 130, 246, ${alpha})`
  if (r > 0) return `rgba(134, 239, 172, ${alpha})`
  return '#e2e8f0'
}

interface GeoFeature {
  type: 'Feature'
  properties: { name?: string; [k: string]: unknown } | null
  geometry: unknown
}

interface GeoFC {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

const SVG_W = 900
const SVG_H = 460

export default function WorldGeoMap({
  riesgo,
  highlightISO = 'ES',
  onCountryClick,
}: WorldGeoMapProps) {
  const [geojson, setGeojson] = useState<GeoFC | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; name: string; iso: string; data: typeof riesgo[number] | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/geodata/world-countries.geojson')
      .then(r => r.json())
      .then(j => { if (!cancelled) setGeojson(j) })
      .catch(e => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [])

  const riskByISO = useMemo(() => {
    const m: Record<string, typeof riesgo[number]> = {}
    riesgo.forEach(r => {
      if (r.code) m[r.code.toUpperCase()] = r
    })
    return m
  }, [riesgo])

  // d3-geo path generator with Natural Earth projection
  const { pathFn, projection } = useMemo(() => {
    const proj = geoNaturalEarth1()
      .scale(150)
      .translate([SVG_W / 2, SVG_H / 2])
    const path = geoPath(proj)
    return { pathFn: path, projection: proj }
  }, [])

  if (error) {
    return <div style={{ padding: 40, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Error cargando mapa: {error}</div>
  }
  if (!geojson) {
    return <div style={{ padding: 40, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Cargando mapa mundial…</div>
  }

  return (
 <div style={{ position: 'relative' }}>
 <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', display: 'block', background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)' }}
        onMouseLeave={() => setHover(null)}
      >
 <defs>
 <pattern id="dots-pattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
 <circle cx="1.5" cy="1.5" r="0.4" fill="#cbd5e1" />
 </pattern>
 </defs>

        {/* Country polygons coloured by risk */}
        {geojson.features.map((feat, idx) => {
          const name = String(feat.properties?.name ?? '')
          const iso = NAME_TO_ISO2[name]
          const d = pathFn(feat as never)
          if (!d) return null
          const data = iso ? riskByISO[iso] : null
          const isHighlight = iso === highlightISO
          const fill = data
            ? riskFill(data.risk, data.has_data ? 0.78 : 0.32)
            : '#e2e8f0'

          return (
 <path
              key={`c-${idx}`}
              d={d}
              fill={fill}
              stroke={isHighlight ? '#1F4E8C' : '#ffffff'}
              strokeWidth={isHighlight ? 1.5 : 0.4}
              style={{
                cursor: data || iso ? 'pointer' : 'default',
                transition: 'fill 180ms, stroke 180ms',
              }}
              onMouseEnter={e => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  name,
                  iso: iso || '—',
                  data,
                })
              }}
              onMouseMove={e => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover(h => h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h)
              }}
              onClick={() => { if (iso && onCountryClick) onCountryClick(iso, name) }}
            />
          )
        })}

        {/* Highlight Spain centroid */}
        {(() => {
          const sp = geojson.features.find(f => f.properties?.name === 'Spain')
          if (!sp) return null
          const c = pathFn.centroid(sp as never)
          if (!c || isNaN(c[0])) return null
          return (
 <g pointerEvents="none">
 <circle cx={c[0]} cy={c[1]} r={6} fill="#1F4E8C" stroke="white" strokeWidth={2} />
 <text x={c[0]} y={c[1] - 12} textAnchor="middle" fontSize={9} fontWeight={800} fill="#1F4E8C">ESP</text>
 </g>
          )
        })()}

        {/* Risk bubbles for countries with data — overlay on centroid */}
        {riesgo.filter(r => r.has_data && r.risk >= 30).map(item => {
          const iso = item.code.toUpperCase()
          if (iso === 'ES') return null
          const feat = geojson.features.find(f => NAME_TO_ISO2[String(f.properties?.name ?? '')] === iso)
          if (!feat) return null
          const c = pathFn.centroid(feat as never)
          if (!c || isNaN(c[0])) return null
          const radius = Math.max(5, Math.min(18, item.risk / 5))
          return (
 <g key={`bubble-${iso}`} pointerEvents="none">
 <circle cx={c[0]} cy={c[1]} r={radius + 3} fill={riskColor(item.risk)} opacity={0.15} />
 <circle cx={c[0]} cy={c[1]} r={radius} fill={riskColor(item.risk)} stroke="white" strokeWidth={1.2} opacity={0.92} />
              {radius >= 10 && (
 <text x={c[0]} y={c[1] + 3} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="white">{iso}</text>
              )}
 </g>
          )
        })}
 </svg>

      {/* Tooltip */}
      {hover && (
 <div
          style={{
            position: 'absolute',
            left: hover.x + 14,
            top: hover.y - 10,
            zIndex: 100,
            pointerEvents: 'none',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            minWidth: 180,
            maxWidth: 280,
          }}
        >
 <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            {hover.name}
 <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{hover.iso}</span>
 </div>
          {hover.data ? (
 <>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
 <span style={{ fontSize: 22, fontWeight: 900, color: riskColor(hover.data.risk) }}>{hover.data.risk}</span>
 <span style={{ fontSize: 9, fontWeight: 800, color: riskColor(hover.data.risk), textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {hover.data.risk >= 70 ? 'CRÍTICO' : hover.data.risk >= 50 ? 'ELEVADO' : hover.data.risk >= 30 ? 'MODERADO' : 'BAJO'}
 </span>
 </div>
              {hover.data.n_articles_30d != null && (
 <div style={{ fontSize: 10, color: '#64748b' }}>{hover.data.n_articles_30d} artículos · 30 días</div>
              )}
              {hover.data.avg_sentiment != null && (
 <div style={{ fontSize: 10, color: '#64748b' }}>
                  Sentimiento: <strong style={{ color: hover.data.avg_sentiment < -0.1 ? '#dc2626' : '#22c55e' }}>{hover.data.avg_sentiment.toFixed(2)}</strong>
 </div>
              )}
              {!hover.data.has_data && (
 <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>Riesgo estructural · sin cobertura reciente</div>
              )}
 </>
          ) : (
 <div style={{ fontSize: 10, color: '#94a3b8' }}>Sin datos de riesgo</div>
          )}
 </div>
      )}
 </div>
  )
}
