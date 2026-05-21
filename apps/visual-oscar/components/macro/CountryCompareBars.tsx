'use client'
/**
 * `<CountryCompareBars />` · Barras horizontales comparando ES con peers.
 *
 * Hace fetch a /api/imf/country?indicator=X&iso=Y para cada peer y dibuja
 * un barchart ordenado con highlight de España.
 *
 * Usado en cada tab macro para contextualizar dónde está España.
 */
import { useEffect, useState } from 'react'

interface CountryValue {
  iso: string
  name: string
  value: number | null
  year?: number
}

interface Props {
  indicator: string           // ej. 'NGDP_RPCH' (IMF code)
  countries?: string[]        // ISO3 codes, default = peers UE
  unit?: string
  decimals?: number
  spainColor?: string
  title?: string
  subtitle?: string
}

const COUNTRY_LABELS: Record<string, string> = {
  ESP: 'España', FRA: 'Francia', DEU: 'Alemania', ITA: 'Italia',
  PRT: 'Portugal', NLD: 'Países Bajos', GRC: 'Grecia', BEL: 'Bélgica',
  AUT: 'Austria', GBR: 'Reino Unido', POL: 'Polonia', SWE: 'Suecia',
  IRL: 'Irlanda', FIN: 'Finlandia', EUR: 'Zona Euro',
}

const DEFAULT_PEERS = ['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']

export function CountryCompareBars({
  indicator,
  countries = DEFAULT_PEERS,
  unit = '%',
  decimals = 1,
  spainColor = '#0f766e',
  title,
  subtitle,
}: Props) {
  const [data, setData] = useState<CountryValue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all(
      countries.map(async (iso) => {
        try {
          const r = await fetch(`/api/imf/country?iso=${iso}&indicator=${indicator}`, { cache: 'force-cache' })
          const d = await r.json()
          const series = (d.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
          const last = series[series.length - 1]
          return {
            iso,
            name: COUNTRY_LABELS[iso] || iso,
            value: last?.value ?? null,
            year: last?.year,
          }
        } catch {
          return { iso, name: COUNTRY_LABELS[iso] || iso, value: null }
        }
      }),
    ).then((rows) => {
      if (!alive) return
      const sorted = rows
        .filter((r) => r.value != null)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
      setData(sorted)
      setLoading(false)
    })
    return () => { alive = false }
  }, [indicator, JSON.stringify(countries)])

  if (loading) {
    return <p style={{ fontSize: 12, color: '#94a3b8', margin: '12px 0' }}>Cargando comparativa peers UE…</p>
  }

  if (data.length === 0) {
    return null // no mostrar si no hay datos · regla del usuario
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value || 0)))
  const min = Math.min(...data.map((d) => d.value || 0))
  const range = max - Math.min(0, min) || 1
  const yearAny = data.find((d) => d.year != null)?.year

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: 12 }}>
          {title && (
            <p style={{ fontSize: 11, color: spainColor, margin: 0, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {title}
            </p>
          )}
          {subtitle && (
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>
              {subtitle}{yearAny ? ` · año ${yearAny}` : ''}
            </p>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d) => {
          const isSpain = d.iso === 'ESP'
          const v = d.value || 0
          const barW = (Math.abs(v) / max) * 100
          const isNegative = v < 0
          return (
            <div key={d.iso} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: isSpain ? spainColor : '#475569', fontWeight: isSpain ? 700 : 500, textAlign: 'right' }}>
                {d.name}
              </span>
              <div style={{ background: '#f1f5f9', borderRadius: 4, height: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: `${barW}%`,
                  height: '100%',
                  background: isSpain ? spainColor : isNegative ? '#fca5a5' : '#cbd5e1',
                  borderRadius: 4,
                  marginLeft: isNegative ? `${100 - barW}%` : 0,
                  transition: 'width 200ms',
                }} />
              </div>
              <span style={{
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
                fontWeight: isSpain ? 700 : 600,
                color: isSpain ? spainColor : v < 0 ? '#dc2626' : '#0f172a',
                textAlign: 'right',
              }}>
                {v > 0 && unit === '%' ? '+' : ''}{v.toFixed(decimals)}{unit}
              </span>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 9, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right', fontStyle: 'italic' }}>
        Fuente · IMF DataMapper / {indicator}
      </p>
    </div>
  )
}

export default CountryCompareBars
