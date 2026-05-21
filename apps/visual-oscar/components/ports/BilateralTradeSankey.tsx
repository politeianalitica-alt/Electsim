'use client'
/**
 * BilateralTradeSankey · Sankey reporter → partner → HS chapter.
 * Carga react-plotly.js dinámicamente (ya instalado en deps).
 */
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { TradeFlow } from '@/types/ports'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export function BilateralTradeSankey({ flows }: { flows: TradeFlow[] }) {
  const data = useMemo(() => {
    if (!flows.length) return null
    // Construye nodos únicos · reporter | partner | hs_code(2dig)
    const labels: string[] = []
    const idx = new Map<string, number>()
    function add(s: string) {
      if (!idx.has(s)) {
        idx.set(s, labels.length)
        labels.push(s)
      }
      return idx.get(s)!
    }

    const src: number[] = []
    const tgt: number[] = []
    const val: number[] = []

    flows.forEach((f) => {
      const a = add(`${f.reporter_iso} (reporter)`)
      const b = add(`${f.partner_iso}`)
      const hsLabel = `HS ${f.hs_code.slice(0, 2)}`
      const c = add(hsLabel)
      src.push(a)
      tgt.push(b)
      val.push(f.value_usd)
      src.push(b)
      tgt.push(c)
      val.push(f.value_usd)
    })

    return {
      labels,
      links: { source: src, target: tgt, value: val },
    }
  }, [flows])

  if (!data) {
    return (
      <div
        style={{
          height: 360,
          background: '#f9fafb',
          border: '1px dashed #e5e7eb',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        Sin flujos comerciales para visualizar.
      </div>
    )
  }

  return (
    <Plot
      data={[
        {
          type: 'sankey',
          orientation: 'h',
          node: {
            pad: 14,
            thickness: 14,
            line: { color: '#cbd5e1', width: 0.5 },
            label: data.labels,
            color: data.labels.map((l) =>
              l.endsWith('(reporter)') ? '#2563eb' : l.startsWith('HS') ? '#9333ea' : '#0891b2',
            ),
          },
          link: {
            source: data.links.source,
            target: data.links.target,
            value: data.links.value,
            color: 'rgba(124,58,237,0.25)',
          },
        } as any,
      ]}
      layout={{
        font: { family: 'Inter, system-ui', size: 11 },
        height: 380,
        margin: { l: 8, r: 8, t: 12, b: 12 },
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}

export default BilateralTradeSankey
