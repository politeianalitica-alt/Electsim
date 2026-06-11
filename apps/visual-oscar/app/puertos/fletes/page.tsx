'use client'
/**
 * /puertos/fletes · Baltic Dry + FBX + tanker indices.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useFreightSnapshot, useFreightPrice } from '@/hooks/usePorts'
import { FreightSnapshotGrid } from '@/components/ports/FreightSnapshotGrid'

const ACCENT = '#0e7490'

export default function FletesPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { items, dataSource } = useFreightSnapshot()
  const [selected, setSelected] = useState<string>('baltic_dry')
  const [range, setRange] = useState('6mo')

  const { data } = useFreightPrice(selected, range)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          ← Puertos & Comercio Global
        </Link>

        <header style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            FLETES · BALTIC EXCHANGE + FBX
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            Coste del transporte marítimo
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            BDI dry bulk · BCI capesize · BPI panamax · BDTI/BCTI tanker · FBX container · fuente {dataSource ?? '—'}
          </p>
        </header>

        <section style={{ marginTop: 18 }}>
          {/* Anclas #slug para que /puertos/fletes#<slug> haga scroll al índice (patrón id={ck.slug} de chokepoints). */}
          {items.map((it) => (
            <div key={it.slug} id={it.slug} style={{ scrollMarginTop: 72 }} />
          ))}
          <FreightSnapshotGrid items={items} />
        </section>

        <section style={{ marginTop: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>
              SERIE OHLC · {data?.name ?? selected}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} style={selectStyle}>
                {items.map((it) => (
                  <option key={it.slug} value={it.slug}>{it.name}</option>
                ))}
              </select>
              <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle}>
                <option value="1mo">1 mes</option>
                <option value="3mo">3 meses</option>
                <option value="6mo">6 meses</option>
                <option value="1y">1 año</option>
              </select>
            </div>
          </div>
          {data?.ohlc?.length ? (
            <OHLCChart ohlc={data.ohlc} />
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Sin serie disponible.</p>
          )}
        </section>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }

function OHLCChart({ ohlc }: { ohlc: Array<{ ts: string; open: number; high: number; low: number; close: number }> }) {
  const w = 1100
  const h = 240
  const pad = 30
  if (!ohlc.length) {
    return (
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Sin serie disponible.</p>
    )
  }
  const xs = ohlc.length
  const lows = ohlc.map((p) => p.low).filter((v) => Number.isFinite(v))
  const highs = ohlc.map((p) => p.high).filter((v) => Number.isFinite(v))
  if (!lows.length || !highs.length) {
    return (
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
        Serie OHLC con valores inválidos · sin datos para renderizar.
      </p>
    )
  }
  const allLow = Math.min(...lows)
  const allHigh = Math.max(...highs)
  const range = Math.max(1, allHigh - allLow)
  const candleW = Math.max(1.4, (w - pad * 2) / xs - 1)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 260, marginTop: 10 }} preserveAspectRatio="none">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#cbd5e1" strokeWidth={0.5} />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#cbd5e1" strokeWidth={0.5} />
      {ohlc.map((p, i) => {
        const x = pad + (i / xs) * (w - pad * 2)
        const yHigh = h - pad - ((p.high - allLow) / range) * (h - pad * 2)
        const yLow = h - pad - ((p.low - allLow) / range) * (h - pad * 2)
        const yOpen = h - pad - ((p.open - allLow) / range) * (h - pad * 2)
        const yClose = h - pad - ((p.close - allLow) / range) * (h - pad * 2)
        const up = p.close >= p.open
        const color = up ? '#16a34a' : '#dc2626'
        return (
          <g key={i}>
            <line x1={x + candleW / 2} y1={yHigh} x2={x + candleW / 2} y2={yLow} stroke={color} strokeWidth={0.7} />
            <rect
              x={x}
              y={Math.min(yOpen, yClose)}
              width={candleW}
              height={Math.max(1, Math.abs(yClose - yOpen))}
              fill={color}
              opacity={0.85}
            />
          </g>
        )
      })}
      <text x={pad} y={16} fontSize={10} fill="#64748b">{allHigh.toFixed(1)}</text>
      <text x={pad} y={h - pad - 4} fontSize={10} fill="#64748b">{allLow.toFixed(1)}</text>
    </svg>
  )
}
