'use client'
/**
 * `<CNTDesglosePanel />` · INE Contabilidad Nacional Trimestral.
 *
 * Muestra el PIB español trimestral desglosado en sus 4 componentes:
 * consumo hogares + consumo AAPP + inversión (FBKF) + sector exterior.
 *
 * Datos via /api/ine/cnt-desglose · cache 12h.
 */
import { useEffect, useState } from 'react'

interface CNTPoint {
  period: string
  year: number
  value: number | null
}
interface CNTComponent {
  name?: string
  points: CNTPoint[]
}
interface CNTData {
  ok: boolean
  data_quality?: { source_type: string; source_name: string }
  components?: {
    pib_total: CNTComponent
    consumo_hogares: CNTComponent
    consumo_aapp: CNTComponent
    inversion: CNTComponent
    exterior: CNTComponent
  }
  n_quarters?: number
}

const ACCENT = '#0F766E'  // teal Pulso macro
const COLORS = {
  consumo_hogares: '#0F766E',
  consumo_aapp:    '#0891B2',
  inversion:       '#F97316',
  exterior:        '#7C3AED',
}

export function CNTDesglosePanel() {
  const [data, setData] = useState<CNTData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/ine/cnt-desglose?n=12', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: CNTData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const comps = data?.components

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
            INE CNT · Desglose PIB Trimestral España
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Volumen YoY · consumo hogares + AAPP + inversión + exterior · {data?.n_quarters ?? 12} trimestres · cache 12h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#ccfbf1', color: ACCENT, borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · INE
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            INE no disponible
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando INE CNT…</p>}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>INE WSTempus no respondió</strong> · puede ser rate-limit o serie temporalmente no disponible. Cache 12h ya activo.
        </div>
      )}

      {!loading && isLive && comps && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { key: 'consumo_hogares', label: 'Consumo Hogares', color: COLORS.consumo_hogares, comp: comps.consumo_hogares },
            { key: 'consumo_aapp',    label: 'Consumo AAPP',    color: COLORS.consumo_aapp,    comp: comps.consumo_aapp },
            { key: 'inversion',       label: 'Inversión FBKF',  color: COLORS.inversion,       comp: comps.inversion },
            { key: 'exterior',        label: 'Sector Exterior', color: COLORS.exterior,        comp: comps.exterior },
          ].map((row) => {
            const lastPoint = row.comp?.points?.[0]   // INE devuelve más reciente primero
            const prevPoint = row.comp?.points?.[4]   // 4 trimestres atrás → YoY directo del INE
            const value = lastPoint?.value
            const prevValue = prevPoint?.value
            return (
              <div
                key={row.key}
                style={{
                  background: '#f9fafb',
                  borderRadius: 8,
                  padding: 12,
                  borderLeft: `3px solid ${row.color}`,
                }}
              >
                <p style={{ fontSize: 11, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  {row.label}
                </p>
                <p style={{ fontSize: 24, color: row.color, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {value != null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—'}
                </p>
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {lastPoint?.period ?? '—'} · YoY volumen
                </p>
                {/* Mini sparkline 12 trimestres */}
                <div style={{ marginTop: 6 }}>
                  <MiniSpark points={row.comp?.points?.map((p) => p.value).filter((v): v is number => v != null).reverse() ?? []} color={row.color} />
                </div>
              </div>
            )
          })}

          {/* PIB total grande */}
          {comps.pib_total?.points?.[0] && (
            <div
              style={{
                gridColumn: 'span 4',
                background: ACCENT,
                color: '#fff',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, margin: 0, opacity: 0.85, textTransform: 'uppercase' }}>
                  PIB ESPAÑA · volumen YoY · {comps.pib_total.points[0]?.period}
                </p>
                <p style={{ fontSize: 36, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {comps.pib_total.points[0]?.value != null ? `+${comps.pib_total.points[0]!.value!.toFixed(1)}%` : '—'}
                </p>
              </div>
              <MiniSpark
                points={comps.pib_total.points.map((p) => p.value).filter((v): v is number => v != null).reverse()}
                color="rgba(255,255,255,0.85)"
                stroke={3}
                width={280}
                height={70}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function MiniSpark({ points, color, stroke = 1.5, width = 180, height = 28 }: { points: number[]; color: string; stroke?: number; width?: number; height?: number }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = width / Math.max(points.length - 1, 1)
  const pts = points.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </svg>
  )
}

export default CNTDesglosePanel
