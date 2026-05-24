'use client'
/**
 * `<GeoRiskHeatmap />` · Sprint G5 · feature WOW visual.
 *
 * Mapa coroplético mundial con risk score 0-100 por país.
 * Hover → tooltip con score + region + ACLED events 30d.
 * Click → navega a /geopolitica/pais/[iso3].
 *
 * Inspiración: Verisk Maplecroft Country Risk Map + CFR Global Conflict
 * Tracker. Diferenciador: free + Spain-centric + click-through al drill.
 */
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface Country {
  iso3: string
  name: string
  region: string
  baseline_risk: number
  acled_events_30d: number
  acled_fatalities_30d: number
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
}

interface HeatmapResp {
  ok: boolean
  countries: Country[]
  methodology: string
  bands: Record<string, string>
}

export function GeoRiskHeatmap() {
  const router = useRouter()
  const [data, setData] = useState<HeatmapResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/world-risk', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const plotData = data ? [{
    type: 'choropleth' as const,
    locations: data.countries.map((c) => c.iso3),
    z: data.countries.map((c) => c.score),
    text: data.countries.map((c) =>
      `<b>${c.name}</b><br>` +
      `Score: <b>${c.score}/100</b> (${c.band})<br>` +
      `Región: ${c.region}<br>` +
      `ACLED 30d: ${c.acled_events_30d} eventos, ${c.acled_fatalities_30d} fatalities<br>` +
      `<i>Click para drill país →</i>`,
    ),
    hoverinfo: 'text' as const,
    colorscale: [
      [0,    '#16a34a'],
      [0.30, '#84cc16'],
      [0.55, '#f59e0b'],
      [0.75, '#f97316'],
      [1,    '#dc2626'],
    ],
    zmin: 0, zmax: 100,
    colorbar: {
      title: { text: 'Risk Score', font: { color: '#cbd5e1' } },
      tickfont: { color: '#cbd5e1', size: 9 },
      thickness: 12,
      len: 0.5,
      bgcolor: 'rgba(0,0,0,0)',
    },
    marker: { line: { color: '#0f172a', width: 0.4 } },
  }] : []

  return (
    <section style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderLeft: '4px solid #fbbf24',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
          ◆ World Risk Heatmap · {data?.countries?.length || 0} países · choropleth Plotly
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Hover país → tooltip con score · click → drill país profundo. Inspirado en Verisk Maplecroft + CFR Global Conflict Tracker.
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando mapa mundial…</p>}
      {data && (
        <>
          <Plot
            data={plotData as any}
            layout={{
              height: 520,
              autosize: true,
              margin: { t: 10, b: 10, l: 0, r: 0 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              geo: {
                projection: { type: 'natural earth' },
                bgcolor: 'rgba(0,0,0,0)',
                showcoastlines: true,
                coastlinecolor: '#1e293b',
                showland: true,
                landcolor: '#0f172a',
                showocean: true,
                oceancolor: '#020617',
                showcountries: true,
                countrycolor: '#1e293b',
              },
              font: { family: 'system-ui, -apple-system', color: '#cbd5e1', size: 11 },
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
            onClick={(e: any) => {
              const point = e?.points?.[0]
              if (point && point.location) {
                router.push(`/geopolitica/pais/${point.location}`)
              }
            }}
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 9, color: '#94a3b8' }}>
            {Object.entries(data.bands).map(([k, label]) => (
              <span key={k}>
                <strong style={{
                  color: k === 'BAJO' ? '#16a34a' : k === 'MEDIO' ? '#f59e0b' : k === 'ALTO' ? '#f97316' : '#dc2626',
                }}>{k}</strong> · {label}
              </span>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
            {data.methodology}
          </p>
        </>
      )}
    </section>
  )
}

export default GeoRiskHeatmap
