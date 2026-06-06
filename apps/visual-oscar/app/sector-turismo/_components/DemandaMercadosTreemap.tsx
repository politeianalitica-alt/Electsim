'use client'
/**
 * <DemandaMercadosTreemap /> · Turismo v3 · Sprint T4
 *
 * Mercados emisores (FRONTUR · turistas por país de residencia del último mes):
 *   - Treemap SVG: el ÁREA codifica el volumen de turistas (cuota), el COLOR
 *     codifica el crecimiento interanual (YoY) por mercado (verde sube, rojo
 *     baja, gris sin dato). Squarified simple (slice por filas equilibradas).
 *   - Ranking en barras como vista alterna (toggle), con cuota_pct + YoY.
 *
 * Degradación honesta: si un mercado no trae turistas se omite del treemap; si
 * no trae YoY se pinta gris. Sin datos → mensaje sobrio. Cero emojis.
 *
 * Sin dependencias de charting externas para el treemap (SVG procedural, patrón
 * EmpresasTreemap del repo). Solo consume props ya parseadas por la vista.
 */
import { useMemo, useState } from 'react'
import type { FronturPais } from './shared/demandaUtils'
import { fmtNum, fmtPct, yoyColor } from './shared/demandaUtils'

interface Props {
  paises: FronturPais[]
  lastPeriod: string | null
}

type Modo = 'treemap' | 'ranking'

interface Rect {
  x: number
  y: number
  w: number
  h: number
  p: FronturPais
}

/**
 * Layout slice-and-dice en filas equilibradas (mismo enfoque que
 * EmpresasTreemap): reparte los mercados en filas cuyas alturas son
 * proporcionales a la suma de cada fila, y dentro de cada fila el ancho es
 * proporcional al volumen. Determinista y legible para ~8-12 mercados.
 */
function layout(items: FronturPais[], W: number, H: number): Rect[] {
  const valid = items.filter((p) => (p.turistas ?? 0) > 0)
  const total = valid.reduce((s, p) => s + (p.turistas ?? 0), 0)
  if (total <= 0) return []

  // Nº de filas adaptativo: 1 fila hasta 4 mercados, si no 2 filas (3 si >9).
  const nRows = valid.length <= 4 ? 1 : valid.length <= 9 ? 2 : 3
  const perRow = Math.ceil(valid.length / nRows)
  const rows: FronturPais[][] = []
  for (let i = 0; i < valid.length; i += perRow) rows.push(valid.slice(i, i + perRow))

  const rects: Rect[] = []
  let y = 0
  for (const row of rows) {
    const rowTotal = row.reduce((s, p) => s + (p.turistas ?? 0), 0)
    const rowH = (rowTotal / total) * H
    let x = 0
    for (const p of row) {
      const w = rowTotal > 0 ? ((p.turistas ?? 0) / rowTotal) * W : 0
      rects.push({ x, y, w, h: rowH, p })
      x += w
    }
    y += rowH
  }
  return rects
}

export function DemandaMercadosTreemap({ paises, lastPeriod }: Props) {
  const [modo, setModo] = useState<Modo>('treemap')

  const ordered = useMemo(
    () => [...paises].sort((a, b) => (b.turistas ?? -1) - (a.turistas ?? -1)),
    [paises],
  )

  const W = 760
  const H = 320
  const rects = useMemo(() => layout(ordered, W, H), [ordered])

  if (ordered.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#86868b', margin: '8px 0' }}>
        Sin desglose por mercado emisor disponible para el último periodo.
      </p>
    )
  }

  const maxTuristas = ordered[0]?.turistas ?? 0

  return (
    <div>
      {/* Toggle treemap / ranking */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>
          Turistas por país de residencia{lastPeriod ? ` · ${lastPeriod}` : ''} · área = volumen · color = variación anual
        </span>
        <div style={{ display: 'inline-flex', gap: 2, background: '#F5F5F7', borderRadius: 8, padding: 2 }}>
          {(['treemap', 'ranking'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              aria-pressed={modo === m}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: modo === m ? '#fff' : 'transparent',
                color: modo === m ? '#1d1d1f' : '#86868b',
                fontWeight: 700,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 6,
                boxShadow: modo === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'treemap' ? 'Treemap' : 'Ranking'}
            </button>
          ))}
        </div>
      </div>

      {modo === 'treemap' ? (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', borderRadius: 10, overflow: 'hidden', background: '#F5F5F7' }}>
          {rects.map((r, i) => {
            const fill = yoyColor(r.p.yoy_pct)
            const showLabel = r.w > 64 && r.h > 40
            const showSub = r.w > 84 && r.h > 58
            return (
              <g key={i}>
                <rect x={r.x} y={r.y} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} fill={fill} rx={4} opacity={0.92}>
                  <title>
                    {r.p.pais}: {fmtNum(r.p.turistas)} turistas
                    {r.p.cuota_pct != null ? ` · ${r.p.cuota_pct}% cuota` : ''}
                    {r.p.yoy_pct != null ? ` · ${fmtPct(r.p.yoy_pct)} interanual` : ''}
                  </title>
                </rect>
                {showLabel && (
                  <text x={r.x + 9} y={r.y + 18} style={{ fontSize: 12, fontWeight: 700, fill: '#fff' }}>
                    {r.p.pais.length > 16 ? r.p.pais.slice(0, 15) + '…' : r.p.pais}
                  </text>
                )}
                {showSub && (
                  <>
                    <text x={r.x + 9} y={r.y + 34} style={{ fontSize: 10.5, fill: 'rgba(255,255,255,0.92)' }}>
                      {r.p.cuota_pct != null ? `${r.p.cuota_pct}%` : '—'}
                      {r.p.turistas != null ? ` · ${(r.p.turistas / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}k` : ''}
                    </text>
                    <text x={r.x + 9} y={r.y + 49} style={{ fontSize: 10, fontWeight: 700, fill: 'rgba(255,255,255,0.95)' }}>
                      {r.p.yoy_pct != null ? fmtPct(r.p.yoy_pct) : 's/d'}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ordered.map((p) => {
            const pctWidth = maxTuristas > 0 && p.turistas != null ? (p.turistas / maxTuristas) * 100 : 0
            const color = yoyColor(p.yoy_pct)
            return (
              <div key={p.pais} style={{ display: 'grid', gridTemplateColumns: '128px 1fr 92px', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.pais}
                </span>
                <div style={{ position: 'relative', height: 22, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pctWidth}%`, background: color, opacity: 0.85, borderRadius: 5, transition: 'width 200ms ease' }} />
                  <span style={{ position: 'absolute', left: 8, top: 0, height: 22, display: 'flex', alignItems: 'center', fontSize: 10.5, fontWeight: 700, color: pctWidth > 18 ? '#fff' : '#3a3a3d' }}>
                    {fmtNum(p.turistas)}
                    {p.cuota_pct != null && (
                      <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.9 }}>{p.cuota_pct}%</span>
                    )}
                  </span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color, textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                  {p.yoy_pct != null ? fmtPct(p.yoy_pct) : 's/d'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda de color por crecimiento */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 10, color: '#86868b' }}>
        {[
          { c: '#15803D', l: '≥ +8%' },
          { c: '#22C55E', l: '+2…+8%' },
          { c: '#EAB308', l: '−2…+2%' },
          { c: '#F97316', l: '−8…−2%' },
          { c: '#DC2626', l: '< −8%' },
          { c: '#9CA3AF', l: 'sin dato' },
        ].map((x) => (
          <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c, display: 'inline-block' }} />
            {x.l}
          </span>
        ))}
      </div>
    </div>
  )
}

export default DemandaMercadosTreemap
