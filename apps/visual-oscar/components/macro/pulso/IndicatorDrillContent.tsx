'use client'
/**
 * `<IndicatorDrillContent />` · Sprint N11.
 *
 * Contenido del MacroDrawer cuando se hace drill-down en un indicador:
 *  - Big value último + YoY + estado vs umbral
 *  - Gráfica de línea histórica con thresholds amber/red overlay
 *  - Metadata: source, sourceCode, frequency, description completa
 *  - Mini peer comparison (España vs DE/FR/IT/PT) si es Eurostat
 *  - Botón "Abrir detalle completo" → /macro/{slug}/indicator/{id}
 *
 * Diseñado para análisis exploratorio rápido sin salir del subtab.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult, PulsoPoint } from '@/lib/macro/pulso-fetcher'

interface Props {
  indicator: PulsoIndicatorMeta
  subtabSlug: string
  subtabLabel: string
  accent: string
  /** Result preloaded from overview (no extra fetch needed) */
  preloaded?: PulsoFetchResult
}

interface PeerHit {
  id: string
  peerable: boolean
  ranking?: { geo: string; geoLabel: string; value: number | null }[]
  spainPosition?: number
  nCountries?: number
  spainVsAvgPct?: number | null
  goodAbove?: boolean | null
}

function statusForValue(v: number | null, threshold?: PulsoIndicatorMeta['threshold']): 'green' | 'amber' | 'red' | 'na' {
  if (v == null || !threshold) return 'na'
  const { amber, red, goodAbove } = threshold
  if (goodAbove) {
    if (red != null && v < red) return 'red'
    if (amber != null && v < amber) return 'amber'
    return 'green'
  }
  if (red != null && v > red) return 'red'
  if (amber != null && v > amber) return 'amber'
  return 'green'
}

function computeYoY(meta: PulsoIndicatorMeta, series: PulsoPoint[]): number | null {
  if (!series || series.length < 2) return null
  const valid = series.filter((p) => p.value != null)
  if (valid.length < 2) return null
  const last = valid[valid.length - 1]
  const lag = meta.frequency === 'monthly' ? 12 : meta.frequency === 'quarterly' ? 4 : 1
  const yoyIdx = valid.length - 1 - lag
  if (yoyIdx < 0) return null
  const prev = valid[yoyIdx]
  if (prev?.value == null || prev.value === 0 || last?.value == null) return null
  return ((last.value - prev.value) / Math.abs(prev.value)) * 100
}

const STATUS_LABEL = { green: 'OK', amber: 'Alerta', red: 'Crítico', na: 'Sin umbral' }
const STATUS_COLORS = {
  green: { bg: '#dcfce7', fg: '#166534' },
  amber: { bg: '#fef3c7', fg: '#92400e' },
  red:   { bg: '#fee2e2', fg: '#991b1b' },
  na:    { bg: '#f1f5f9', fg: '#64748b' },
}

/** Mini line chart SVG con thresholds overlay */
function HistoricalChart({ series, threshold, color, unit }: {
  series: PulsoPoint[]
  threshold?: PulsoIndicatorMeta['threshold']
  color: string
  unit: string
}) {
  const valid = series.filter((p) => p.value != null) as { period: string; value: number }[]
  if (valid.length < 2) {
    return (
      <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
        Serie insuficiente para gráfica histórica ({valid.length} puntos)
      </div>
    )
  }
  const slice = valid.slice(-60)
  const values = slice.map((p) => p.value)
  const min = Math.min(...values, threshold?.red ?? Infinity, threshold?.amber ?? Infinity)
  const max = Math.max(...values, threshold?.red ?? -Infinity, threshold?.amber ?? -Infinity)
  const range = max - min || 1
  const w = 620
  const h = 200
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const stepX = chartW / Math.max(1, slice.length - 1)
  const yFor = (v: number) => padT + chartH - ((v - min) / range) * chartH
  const pts = slice.map((p, i) => `${padL + i * stepX},${yFor(p.value)}`).join(' ')

  const yTicks = [min, min + (max - min) * 0.5, max]

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* Y-axis grid + labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={yFor(v)} y2={yFor(v)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={padL - 6} y={yFor(v) + 3} fontSize={9} fill="#94a3b8" textAnchor="end">
            {v.toLocaleString('es-ES', { maximumFractionDigits: 1 })}{unit}
          </text>
        </g>
      ))}
      {/* Threshold amber line */}
      {threshold?.amber != null && (
        <line x1={padL} x2={w - padR} y1={yFor(threshold.amber)} y2={yFor(threshold.amber)}
          stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}>
          <title>Umbral amber: {threshold.amber}{unit}</title>
        </line>
      )}
      {/* Threshold red line */}
      {threshold?.red != null && (
        <line x1={padL} x2={w - padR} y1={yFor(threshold.red)} y2={yFor(threshold.red)}
          stroke="#dc2626" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}>
          <title>Umbral red: {threshold.red}{unit}</title>
        </line>
      )}
      {/* Línea principal */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Punto final destacado */}
      <circle cx={padL + (slice.length - 1) * stepX} cy={yFor(slice[slice.length - 1].value)} r={3.5} fill={color} />
      {/* X-axis ticks: primero, mitad, último */}
      {[0, Math.floor(slice.length / 2), slice.length - 1].map((idx, i) => (
        <text key={i} x={padL + idx * stepX} y={h - 8} fontSize={9} fill="#94a3b8" textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
          {slice[idx]?.period || ''}
        </text>
      ))}
    </svg>
  )
}

export function IndicatorDrillContent({ indicator, subtabSlug, subtabLabel, accent, preloaded }: Props) {
  const [result, setResult] = useState<PulsoFetchResult | null>(preloaded || null)
  const [peer, setPeer] = useState<PeerHit | null>(null)

  // Fetch sólo si no hay preload
  useEffect(() => {
    if (preloaded) return
    let alive = true
    fetch(`/api/macro/${subtabSlug}/overview`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (j?.ok && j.byId?.[indicator.id]) setResult(j.byId[indicator.id])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [indicator.id, subtabSlug, preloaded])

  // Fetch peer si Eurostat
  useEffect(() => {
    if (indicator.parser !== 'eurostat-simple') return
    let alive = true
    fetch(`/api/macro/peer-comparison/${subtabSlug}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j?.ok) return
        const found = j.indicators?.find((i: PeerHit) => i.id === indicator.id)
        if (found?.peerable) setPeer(found)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [indicator.id, indicator.parser, subtabSlug])

  const series = result?.series || []
  const last = result?.last
  const yoy = computeYoY(indicator, series)
  const status = statusForValue(last?.value ?? null, indicator.threshold)
  const statusCfg = STATUS_COLORS[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Big value + YoY + status */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', margin: 0, fontVariantNumeric: 'tabular-nums' as const, lineHeight: 1.1 }}>
              {last?.value != null
                ? last.value.toLocaleString('es-ES', { maximumFractionDigits: indicator.decimals })
                : '—'}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8', marginLeft: 4 }}>{indicator.unit}</span>
            </p>
            {last?.period && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Último dato · {last.period}</p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {yoy != null && (
              <span style={{ fontSize: 16, fontWeight: 700, color: yoy > 0 ? '#16a34a' : yoy < 0 ? '#dc2626' : '#64748b' }}>
                {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}% <span style={{ fontSize: 10, fontWeight: 600 }}>YoY</span>
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 12, background: statusCfg.bg, color: statusCfg.fg, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
        {indicator.threshold && (
          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#64748b' }}>
            Umbral · amber {indicator.threshold.amber ?? '—'}{indicator.unit} · red {indicator.threshold.red ?? '—'}{indicator.unit} · {indicator.threshold.goodAbove ? 'subir es bueno' : 'bajar es bueno'}
          </p>
        )}
      </section>

      {/* Histórico chart */}
      <section style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Serie histórica · últimos {Math.min(series.filter((p) => p.value != null).length, 60)} puntos
        </p>
        <HistoricalChart series={series} threshold={indicator.threshold} color={accent} unit={indicator.unit} />
      </section>

      {/* Peer comparison si aplica */}
      {peer && peer.ranking && peer.ranking.length > 0 && (
        <section>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Posición vs peers UE · España #{peer.spainPosition}/{peer.nCountries}
            {peer.spainVsAvgPct != null && (
              <span style={{ marginLeft: 8, color: peer.spainVsAvgPct > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                {peer.spainVsAvgPct > 0 ? '+' : ''}{peer.spainVsAvgPct.toFixed(1)}% vs media
              </span>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {peer.ranking.map((r) => {
              const max = Math.max(...peer.ranking!.map((rr) => Math.abs(rr.value || 0)))
              const widthPct = r.value != null && max > 0 ? (Math.abs(r.value) / max) * 100 : 0
              const isSpain = r.geo === 'ES'
              return (
                <div key={r.geo} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', gap: 6, alignItems: 'center', fontSize: 11 }}>
                  <span style={{ fontWeight: isSpain ? 700 : 500, color: isSpain ? '#dc2626' : '#475569' }}>{r.geoLabel}</span>
                  <div style={{ height: 10, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: isSpain ? '#dc2626' : '#94a3b8', transition: 'width 200ms ease' }} />
                  </div>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' as const, fontWeight: isSpain ? 700 : 500, color: '#0f172a' }}>
                    {r.value != null ? r.value.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'}{indicator.unit}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Metadata */}
      <section>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Descripción · contexto del indicador
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.55 }}>
          {indicator.description}
        </p>
      </section>

      <section style={{ background: '#f8fafc', borderRadius: 8, padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px', fontSize: 10, color: '#64748b' }}>
        <div><strong style={{ color: '#0f172a' }}>Familia:</strong> {indicator.family}</div>
        <div><strong style={{ color: '#0f172a' }}>Frecuencia:</strong> {indicator.frequency}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: '#0f172a' }}>Fuente:</strong> {indicator.source}</div>
        <div style={{ gridColumn: '1 / -1', fontFamily: 'ui-monospace, monospace' }}>
          <strong style={{ color: '#0f172a' }}>Code:</strong> {indicator.sourceCode}
        </div>
        <div style={{ gridColumn: '1 / -1', fontFamily: 'ui-monospace, monospace', color: '#94a3b8' }}>
          {indicator.endpoint}
        </div>
      </section>

      {/* Botón abrir detalle completo */}
      <Link
        href={`/macro/${subtabSlug}/indicator/${indicator.id}`}
        style={{
          display: 'inline-block',
          padding: '10px 16px',
          background: accent,
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        Abrir detalle completo · {subtabLabel} →
      </Link>
    </div>
  )
}

export default IndicatorDrillContent
