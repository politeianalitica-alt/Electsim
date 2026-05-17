'use client'

import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO3 → numeric ISO3166
const ISO3_TO_NUMERIC: Record<string, string> = {
  USA: '840', CHN: '156', RUS: '643', IND: '356', GBR: '826',
  FRA: '250', DEU: '276', JPN: '392', KOR: '410', BRA: '076',
  AUS: '036', CAN: '124', ISR: '376', SAU: '682', TUR: '792',
  POL: '616', ITA: '380', ESP: '724', PRT: '620', NOR: '578',
  NLD: '528', SWE: '752', GRC: '300', UKR: '804', IRN: '364',
  PAK: '586', EGY: '818', ZAF: '710', NGA: '566', ARG: '032',
}

function getColor(pct: number | null): string {
  if (pct == null) return '#ECECEF'
  if (pct >= 4)    return '#7F1D1D'
  if (pct >= 3)    return '#DC2626'
  if (pct >= 2)    return '#F59E0B'
  if (pct >= 1.5)  return '#FCD34D'
  if (pct >= 1)    return '#BEF264'
  return '#DCFCE7'
}

interface Props {
  items: Array<{ iso3: string; pct_pib: number | null }>
}

export function BudgetChoropleth({ items }: Props) {
  const lookup = useMemo(() => {
    const m: Record<string, number | null> = {}
    for (const it of items) m[it.iso3] = it.pct_pib
    return m
  }, [items])

  return (
    <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#F9FAFB', border: '1px solid #ECECEF' }}>
      <ComposableMap
        projectionConfig={{ scale: 140 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numericId = geo.id as string
                const iso3 = Object.entries(ISO3_TO_NUMERIC).find(([, v]) => v === numericId)?.[0]
                const pct = iso3 ? lookup[iso3] ?? null : null
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(pct)}
                    stroke="#fff"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', opacity: 0.85 },
                      pressed: { outline: 'none' },
                    }}
                  >
                    {pct != null && <title>{iso3}: {pct.toFixed(2)}% PIB</title>}
                  </Geography>
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', flexWrap: 'wrap', fontSize: 10 }}>
        {[
          { color: '#DCFCE7', label: '< 1%' },
          { color: '#BEF264', label: '1–1.5%' },
          { color: '#FCD34D', label: '1.5–2%' },
          { color: '#F59E0B', label: '2–3% OTAN' },
          { color: '#DC2626', label: '3–4%' },
          { color: '#7F1D1D', label: '> 4%' },
          { color: '#ECECEF', label: 'Sin datos' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6e6e73' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, border: '1px solid #DDDDE3', display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
