'use client'
import { useEffect, useRef, useState } from 'react'
import { useApi } from '@/lib/useApi'

type TickerItem = { id?: string | number; label: string; value?: string; severity?: 'low'|'med'|'high'|'info'; ts?: string }
type TickerResponse = { items?: TickerItem[] }

const FALLBACK: TickerItem[] = [
  { label: 'BOE', value: 'Real Decreto-ley energía publicado', severity: 'info' },
  { label: 'Congreso', value: 'PNL sobre vivienda admitida a trámite', severity: 'med' },
  { label: 'Macro', value: 'Prima de riesgo 92pb (-3pb)', severity: 'low' },
  { label: 'Geopolítica', value: 'Le Pen +2pp en sondeos Francia', severity: 'med' },
  { label: 'Mercados', value: 'IBEX +0.42% · Telefónica +1.8%', severity: 'low' },
  { label: 'Riesgo', value: 'Burst en narrativa migración (Canarias)', severity: 'high' },
]

function color(sev?: string) {
  if (sev === 'high') return '#c42c2c'
  if (sev === 'med') return '#b25000'
  if (sev === 'low') return '#2d8a39'
  return '#6e6e73'
}

export default function LiveTicker() {
  const { data, source } = useApi<TickerResponse>('/api/system/ticker', { refreshInterval: 60_000 })
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const items = (data?.items && data.items.length > 0) ? data.items : FALLBACK
  // duplicate for seamless loop
  const loop = [...items, ...items]

  return (
 <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: '#fff',
        border: '1px solid #e8e8ed',
        borderRadius: 14,
        padding: '0 14px',
        height: 38,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 18,
      }}
    >
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingRight: 12, borderRight: '1px solid #e8e8ed' }}>
 <span style={{ width: 7, height: 7, borderRadius: 999, background: '#2d8a39', boxShadow: '0 0 0 3px rgba(45,138,57,0.18)' }} />
 <span style={{ fontSize: 10, fontWeight: 700, color: '#1d1d1f', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Live · {source === 'mock' ? 'demo' : source === 'backend' ? 'on' : '…'}
 </span>
 </div>

 <div style={{ flex: 1, overflow: 'hidden', height: '100%', position: 'relative' }}>
 <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: 28,
            alignItems: 'center',
            height: '100%',
            whiteSpace: 'nowrap',
            animation: `ticker-scroll 50s linear infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {loop.map((it, i) => (
 <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
 <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: color(it.severity),
                padding: '2px 7px', borderRadius: 999,
                background: `${color(it.severity)}14`,
              }}>
                {it.label}
 </span>
 <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{it.value || ''}</span>
 <span style={{ color: '#d2d2d7' }}>•</span>
 </span>
          ))}
 </div>
 </div>

 <style jsx>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
 `}</style>
 </div>
  )
}
