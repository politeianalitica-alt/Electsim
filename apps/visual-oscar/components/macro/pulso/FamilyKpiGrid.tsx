'use client'
/**
 * Grid de KPIs agrupados por familia (PIB · Demanda · Empleo · Precios ...).
 *
 * Cada card es clicable → `/macro/pulso/indicator/{id}`.
 * Color del valor según semáforo del umbral (verde/ámbar/rojo).
 */
import Link from 'next/link'
import type { PulsoIndicatorMeta, PulsoFamily } from '@/lib/macro/pulso-indicators'
import { PULSO_FAMILY_META } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface FamilyGroup {
  meta: typeof PULSO_FAMILY_META[PulsoFamily]
  indicators: { id: string; meta: PulsoIndicatorMeta; data: PulsoFetchResult }[]
}

interface Props {
  byFamily: Record<string, FamilyGroup>
  /** Slug del subtab para construir href correcto al detalle. Default: pulso-macro. */
  subtabSlug?: string
}

function statusColor(meta: PulsoIndicatorMeta, value: number | null): string {
  if (value == null || !meta.threshold) return meta.accent
  const { amber, red, goodAbove } = meta.threshold
  if (goodAbove === true) {
    if (red != null && value <= red) return '#dc2626'
    if (amber != null && value < amber) return '#f59e0b'
    return '#16a34a'
  }
  if (goodAbove === false) {
    if (red != null && value >= red) return '#dc2626'
    if (amber != null && value > amber) return '#f59e0b'
    return '#16a34a'
  }
  return meta.accent
}

function formatValue(v: number | null, unit: string, decimals: number): string {
  if (v == null) return '—'
  const formatted = Math.abs(v) >= 1000 ? v.toLocaleString('es-ES', { maximumFractionDigits: decimals }) : v.toFixed(decimals)
  return `${formatted}${unit.startsWith(' ') ? unit : unit}`
}

export function FamilyKpiGrid({ byFamily, subtabSlug = 'pulso-macro' }: Props) {
  // Orden estable de familias
  const order: PulsoFamily[] = ['pib', 'demanda', 'exterior', 'empleo', 'precios', 'forecast', 'oferta', 'sentimiento']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {order.map((fam) => {
        const group = byFamily[fam]
        if (!group || group.indicators.length === 0) return null
        return (
          <div key={fam}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: group.meta.color,
                  display: 'inline-block',
                  borderRadius: 3,
                }}
              />
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  letterSpacing: 0.6,
                  color: '#0f172a',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {group.meta.label}
              </h3>
              <span style={{ fontSize: 11, color: '#64748b' }}>{group.meta.description}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
                {group.indicators.length} indicadores
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {group.indicators.map(({ id, meta, data }) => {
                const v = data?.last?.value ?? null
                const period = data?.last?.period
                const color = statusColor(meta, v)
                return (
                  <Link
                    key={id}
                    href={`/macro/${subtabSlug}/indicator/${id}`}
                    style={{
                      textDecoration: 'none',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 8,
                      padding: 12,
                      display: 'block',
                      transition: 'box-shadow 120ms ease, transform 120ms ease',
                    }}
                    className="pulso-kpi-card"
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        color: '#64748b',
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {meta.shortLabel || meta.label}
                    </p>
                    <p
                      style={{
                        margin: '6px 0 4px',
                        fontSize: 24,
                        fontWeight: 700,
                        color,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.1,
                      }}
                    >
                      {formatValue(v, meta.unit, meta.decimals)}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                      {meta.sourceCode} · {period ?? 's/d'}
                    </p>
                    {data?.status === 'missing' && (
                      <span
                        style={{
                          marginTop: 4,
                          display: 'inline-block',
                          fontSize: 9,
                          padding: '1px 6px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: 4,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                        }}
                      >
                        SIN DATO
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
      <style jsx global>{`
        .pulso-kpi-card:hover {
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}

export default FamilyKpiGrid
