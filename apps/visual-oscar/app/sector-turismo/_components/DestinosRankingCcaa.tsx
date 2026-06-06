'use client'
/**
 * <DestinosRankingCcaa /> · Turismo v3 · Sprint T6 (Destinos y territorio)
 *
 * Ranking de Comunidades Autónomas por pernoctaciones (barras horizontales),
 * con su cuota nacional (%) y la variación interanual (YoY) como chip de color
 * (verde sube · rojo baja). Barras SVG-free (puro div) para encajar en el
 * lenguaje de los paneles del shell sin dependencias de charting.
 *
 * Consume las filas de `/api/turismo/ccaa` que le pasa el padre (ya ordenadas
 * desc por pernoctaciones, pero re-ordena por robustez). Regiones sin dato se
 * listan al final con guion. Cero emojis · Unicode geométrico (⊳ ▲ ▼).
 */
import { useMemo } from 'react'
import type { CcaaRow } from './DestinosTerritorioView'

const ACCENT = '#0EA5E9'
const UP = '#16A34A'
const DOWN = '#DC2626'

function fmtMillones(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k`
  return v.toLocaleString('es-ES')
}

interface Props {
  rows: CcaaRow[]
  loading?: boolean
  /** Nº máximo de filas a mostrar (default: todas). */
  topN?: number
}

export function DestinosRankingCcaa({ rows, loading = false, topN }: Props) {
  const sorted = useMemo(() => {
    const r = rows.slice().sort((a, b) => (b.pernoctaciones ?? -1) - (a.pernoctaciones ?? -1))
    return typeof topN === 'number' ? r.slice(0, topN) : r
  }, [rows, topN])

  const max = useMemo(
    () => Math.max(1, ...sorted.map((r) => r.pernoctaciones ?? 0)),
    [sorted],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 30, background: '#F1F5F9', borderRadius: 8 }} />
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Sin datos de pernoctaciones por comunidad.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {sorted.map((r, i) => {
        const has = r.pernoctaciones != null
        const pct = has ? Math.max(2, ((r.pernoctaciones as number) / max) * 100) : 0
        const yoy = r.yoy_pct
        const yoyColor = yoy == null ? '#94A3B8' : yoy >= 0 ? UP : DOWN
        const yoyArrow = yoy == null ? '·' : yoy >= 0 ? '▲' : '▼'
        return (
          <div key={r.nuts2} style={{ display: 'grid', gridTemplateColumns: '22px minmax(120px, 1.1fr) 2fr auto', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.ccaa}>
              {r.ccaa}
            </span>
            {/* Barra + valor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 18, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: has ? ACCENT : '#E2E8F0',
                    borderRadius: 5,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E', fontFamily: 'var(--font-display)', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmtMillones(r.pernoctaciones)}
              </span>
            </div>
            {/* Cuota + YoY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', minWidth: 116 }}>
              <span style={{ fontSize: 11, color: '#64748B', minWidth: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {r.cuota_pct != null ? `${r.cuota_pct.toFixed(1)}%` : '—'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: yoyColor,
                  background: yoy == null ? '#F1F5F9' : yoy >= 0 ? '#DCFCE7' : '#FEE2E2',
                  borderRadius: 999,
                  padding: '2px 7px',
                  minWidth: 58,
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {yoyArrow} {yoy != null ? `${Math.abs(yoy).toFixed(1)}%` : 'n/d'}
              </span>
            </div>
          </div>
        )
      })}
      <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94A3B8' }}>
        Cuota = peso de la comunidad sobre el total nacional de pernoctaciones. YoY = variación interanual.
      </p>
    </div>
  )
}

export default DestinosRankingCcaa
