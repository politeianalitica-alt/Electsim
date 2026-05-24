'use client'
/**
 * `<PeerComparisonBlock />` · Sprint N8.
 *
 * Para cada indicador Eurostat del catálogo, hace fetch del mismo dataset
 * cambiando `geo=ES` por DEU/FRA/ITA/PRT/EA20. Muestra para cada uno:
 *  - Bar chart horizontal con valor por país (España destacada en color)
 *  - Posición de España en el ranking
 *  - Δ vs media de peers (verde si bueno, rojo si malo según goodAbove)
 *
 * Responde a la petición del usuario: ver España en contexto europeo en
 * lugar de aislado. Aprovecha los 30+ indicadores Eurostat añadidos en N6.2/N6.3.
 */
import { useEffect, useState, useMemo } from 'react'

interface Props {
  subtabSlug: string
  accent: string
}

interface IndicatorRanking {
  id: string
  label: string
  unit: string
  family: string
  peerable: boolean
  reason?: string
  datasetCode?: string
  ranking?: { geo: string; geoLabel: string; value: number | null; period: string | null }[]
  spainPosition?: number
  nCountries?: number
  peerAvg?: number | null
  spainVsAvgPct?: number | null
  goodAbove?: boolean | null
  threshold?: { amber?: number; red?: number; goodAbove?: boolean } | null
}

interface PeerResp {
  ok: boolean
  slug: string
  label: string
  n_total: number
  n_eurostat: number
  n_peerable: number
  indicators: IndicatorRanking[]
}

const GEO_COLORS: Record<string, string> = {
  ES: '#dc2626',   // España destacada en rojo Politeia
  DE: '#94a3b8',
  FR: '#94a3b8',
  IT: '#94a3b8',
  PT: '#94a3b8',
  EA20: '#0F766E', // Eurozona destacada en teal
}

function BarRow({ geo, geoLabel, value, max, unit, isSpain, isEA, period }: {
  geo: string
  geoLabel: string
  value: number | null
  max: number
  unit: string
  isSpain: boolean
  isEA: boolean
  period: string | null
}) {
  const widthPct = value != null && max > 0 ? (Math.abs(value) / max) * 100 : 0
  const isNeg = value != null && value < 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px', gap: 6, alignItems: 'center', fontSize: 10 }}>
      <span style={{ fontWeight: isSpain || isEA ? 700 : 500, color: isSpain ? '#dc2626' : isEA ? '#0F766E' : '#475569' }}>
        {geoLabel}
      </span>
      <div style={{ position: 'relative', height: 12, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: isNeg ? `${50 - widthPct / 2}%` : '0%',
          width: `${Math.min(widthPct, 100)}%`,
          background: GEO_COLORS[geo] || '#94a3b8',
          opacity: isSpain ? 1 : 0.7,
          transition: 'width 200ms ease',
        }} />
      </div>
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' as const, fontWeight: isSpain ? 700 : 500, color: '#0f172a' }}>
        {value != null ? value.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'}
        <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>{unit}</span>
        {period && <span style={{ display: 'block', fontSize: 8, color: '#cbd5e1', fontWeight: 400 }}>{period}</span>}
      </span>
    </div>
  )
}

function IndicatorPeerCard({ ind }: { ind: IndicatorRanking }) {
  if (!ind.peerable || !ind.ranking || ind.ranking.length === 0) {
    return null
  }
  const maxAbs = Math.max(...ind.ranking.map((r) => Math.abs(r.value || 0)))
  const spainValue = ind.ranking.find((r) => r.geo === 'ES')?.value
  const goodHigh = ind.goodAbove ?? true
  const spainVsAvg = ind.spainVsAvgPct
  const aboveAvg = spainValue != null && ind.peerAvg != null ? spainValue > ind.peerAvg : null
  // Si goodAbove=true, estar arriba es bueno (verde); si goodAbove=false, estar arriba es malo (rojo)
  const isGood = aboveAvg != null ? (goodHigh ? aboveAvg : !aboveAvg) : null
  const deltaColor = isGood == null ? '#94a3b8' : isGood ? '#16a34a' : '#dc2626'
  const positionLabel = ind.spainPosition && ind.nCountries
    ? `#${ind.spainPosition}/${ind.nCountries}`
    : '—'

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
          {ind.label}
        </p>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
            {positionLabel}
          </span>
          {spainVsAvg != null && (
            <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: deltaColor }}>
              {spainVsAvg > 0 ? '+' : ''}{spainVsAvg.toFixed(1)}% vs peers
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ind.ranking.map((r) => (
          <BarRow
            key={r.geo}
            geo={r.geo}
            geoLabel={r.geoLabel}
            value={r.value}
            max={maxAbs}
            unit={ind.unit}
            isSpain={r.geo === 'ES'}
            isEA={r.geo === 'EA20'}
            period={r.period}
          />
        ))}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
        Eurostat · {ind.datasetCode}
      </p>
    </div>
  )
}

export function PeerComparisonBlock({ subtabSlug, accent }: Props) {
  const [data, setData] = useState<PeerResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setData(null)
    setError(null)
    fetch(`/api/macro/peer-comparison/${subtabSlug}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: PeerResp) => {
        if (!alive) return
        if (j.ok) setData(j)
        else setError('peer_comparison_failed')
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [subtabSlug])

  const peerableIndicators = useMemo(
    () => data?.indicators.filter((i) => i.peerable) || [],
    [data]
  )

  if (loading) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Calculando comparativa España vs peers UE…</p>
      </section>
    )
  }
  if (error || !data) {
    return null // silencioso, no estresar al analista con errores no críticos
  }
  if (peerableIndicators.length === 0) {
    return null // este subtab no tiene indicadores Eurostat comparables
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
          Comparativa peers UE · {peerableIndicators.length} indicadores Eurostat
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          España vs Alemania · Francia · Italia · Portugal · Eurozona 20. Cada indicador trae el mismo dataset cambiando solo el filtro geo. Posición ES + Δ% vs media de peers (sin España, sin EA20).
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        {peerableIndicators.map((ind) => (
          <IndicatorPeerCard key={ind.id} ind={ind} />
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Verde "vs peers": España está en la dirección "buena" según el umbral (goodAbove). Rojo: en la dirección "mala". Si no hay umbral configurado, color neutro.
      </p>
    </section>
  )
}

export default PeerComparisonBlock
