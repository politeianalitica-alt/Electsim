'use client'
/**
 * Grid de KPIs agrupados por familia (PIB · Demanda · Empleo · Precios ...).
 *
 * Sprint N15: headers de cada familia ahora son COLLAPSE expandible
 * (default expanded). El usuario esperaba acción al click sobre la categoría.
 * Cada card sigue siendo clicable → `/macro/{slug}/indicator/{id}`.
 */
import { useState } from 'react'
import Link from 'next/link'
import type { PulsoIndicatorMeta, PulsoFamily } from '@/lib/macro/pulso-indicators'
import { PULSO_FAMILY_META } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'
import { MethodologyTooltip } from './MethodologyTooltip'

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
  // Sprint N15: estado collapse por familia (default expanded=true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (fam: string) => setCollapsed((c) => ({ ...c, [fam]: !c[fam] }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {order.map((fam) => {
        const group = byFamily[fam]
        if (!group || group.indicators.length === 0) return null
        const isCollapsed = !!collapsed[fam]
        return (
          <div key={fam}>
            <button
              type="button"
              onClick={() => toggle(fam)}
              aria-expanded={!isCollapsed}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 8,
                background: 'transparent',
                border: 0,
                padding: '4px 0',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 10, color: '#64748b', width: 12, display: 'inline-block', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const }}>
                {isCollapsed ? '▸' : '▾'}
              </span>
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
            </button>
            {!isCollapsed && (
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
                  <MethodologyTooltip
                    key={id}
                    label={meta.label}
                    methodology={meta.methodologyNote}
                    release={meta.releaseSchedule}
                    confidence={meta.confidenceLevel}
                    description={meta.description}
                  >
                  <Link
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
                      position: 'relative',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {meta.shortLabel || meta.label}
                      {meta.methodologyNote && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 11,
                            height: 11,
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '50%',
                            fontSize: 8,
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                          aria-hidden
                        >
                          ?
                        </span>
                      )}
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
                  </MethodologyTooltip>
                )
              })}
            </div>
            )}
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
