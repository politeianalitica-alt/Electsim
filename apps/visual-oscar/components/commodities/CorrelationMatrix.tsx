'use client'

import { useEffect, useState } from 'react'
import type { OHLCPoint } from '@/types/commodities'

interface Props {
  slugs: string[]
}

interface Cell {
  a: string
  b: string
  r: number | null
  n: number
}

/** Matriz de correlación Pearson sobre returns diarios.
 *  Fetcha histórico 1y de cada commodity. */
export function CorrelationMatrix({ slugs }: Props) {
  const [returnsBySlug, setReturnsBySlug] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slugs.length) return
    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      const out: Record<string, number[]> = {}
      await Promise.all(
        slugs.map(async (s) => {
          try {
            const r = await fetch(`/api/commodities/${encodeURIComponent(s)}/price?range=1y&interval=1d`)
            const data = await r.json()
            const closes: number[] = (data.ohlc ?? [])
              .map((p: OHLCPoint) => p.close)
              .filter((c: number | null): c is number => c != null)
            const rets: number[] = []
            for (let i = 1; i < closes.length; i++) {
              if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1])
            }
            out[s] = rets
          } catch {
            out[s] = []
          }
        }),
      )
      if (!cancelled) {
        setReturnsBySlug(out)
        setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [slugs.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p style={{ fontSize: 12, color: '#9ca3af' }}>Calculando correlaciones…</p>

  const cells: Cell[][] = slugs.map((a) =>
    slugs.map((b) => {
      if (a === b) return { a, b, r: 1, n: returnsBySlug[a]?.length ?? 0 }
      const ar = returnsBySlug[a] ?? []
      const br = returnsBySlug[b] ?? []
      const n = Math.min(ar.length, br.length)
      if (n < 10) return { a, b, r: null, n }
      const x = ar.slice(-n)
      const y = br.slice(-n)
      const mx = x.reduce((s, v) => s + v, 0) / n
      const my = y.reduce((s, v) => s + v, 0) / n
      let num = 0
      let dx = 0
      let dy = 0
      for (let i = 0; i < n; i++) {
        const a1 = x[i] - mx
        const b1 = y[i] - my
        num += a1 * b1
        dx += a1 * a1
        dy += b1 * b1
      }
      const denom = Math.sqrt(dx * dy)
      return { a, b, r: denom > 0 ? num / denom : null, n }
    }),
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 10 }}>
        <thead>
          <tr>
            <th style={cellHead}></th>
            {slugs.map((s) => (
              <th key={s} style={{ ...cellHead, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, i) => (
            <tr key={slugs[i]}>
              <td style={{ ...cellHead, textAlign: 'right', paddingRight: 6 }}>{slugs[i]}</td>
              {row.map((c, j) => (
                <td key={j} style={cellOf(c.r)}>
                  {c.r == null ? '—' : c.r.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
        Correlación Pearson sobre returns diarios (último año). Verde = correlación
        positiva, rojo = negativa, blanco = sin relación.
      </p>
    </div>
  )
}

function cellOf(r: number | null): React.CSSProperties {
  if (r == null) return { ...cellBase, background: '#f3f4f6', color: '#9ca3af' }
  const abs = Math.abs(r)
  const intensity = Math.min(1, abs)
  const bg = r >= 0
    ? `rgba(34,197,94,${0.15 + intensity * 0.55})`
    : `rgba(220,38,38,${0.15 + intensity * 0.55})`
  return {
    ...cellBase,
    background: bg,
    color: intensity > 0.6 ? '#fff' : '#111827',
    fontWeight: abs > 0.5 ? 700 : 400,
  }
}

const cellBase: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'center',
  border: '1px solid #fff',
  minWidth: 50,
}
const cellHead: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: 10,
  color: '#374151',
  fontWeight: 600,
  background: '#f9fafb',
  border: '1px solid #fff',
}
