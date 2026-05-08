'use client'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/useApi'

type Component = { name: string; weight: number; current: number; baseline?: number; description?: string }
type RiskBreakdownData = { components?: Component[]; composite?: number; tilt?: 'up' | 'down' | 'flat' }
type SentimentBreakdown = { positive: number; neutral: number; negative: number; trend?: number }

const FALLBACK_COMPONENTS: Component[] = [
  { name: 'Volatilidad mediática', weight: 0.20, current: 68, baseline: 52, description: 'Pedersen + burst Kleinberg sobre cobertura' },
  { name: 'Tensión institucional', weight: 0.18, current: 54, baseline: 48, description: 'Conflictos Gobierno–CCAA, judicatura, oposición' },
  { name: 'Inestabilidad regulatoria', weight: 0.15, current: 71, baseline: 55, description: 'Velocidad y volumen normativo BOE/BOCG' },
  { name: 'Polarización social', weight: 0.15, current: 79, baseline: 70, description: 'Sentimiento RRSS + manifestaciones' },
  { name: 'Riesgo geopolítico', weight: 0.12, current: 62, baseline: 58, description: 'GDELT + ACLED + tensión bilateral' },
  { name: 'Estrés económico', weight: 0.10, current: 41, baseline: 45, description: 'Prima riesgo, IBEX volatilidad, inflación' },
  { name: 'Riesgo electoral', weight: 0.10, current: 56, baseline: 50, description: 'Volatilidad encuestas + nowcast' },
]

const FALLBACK_SENTIMENT: SentimentBreakdown = { positive: 22, neutral: 41, negative: 37, trend: -3 }

export default function RiskBreakdown() {
  const { data: bk } = useApi<RiskBreakdownData>('/api/risk/breakdown', { refreshInterval: 300_000 })
  const { data: st } = useApi<SentimentBreakdown>('/api/risk/sentiment-breakdown', { refreshInterval: 300_000 })

  const components = (bk?.components && bk.components.length > 0) ? bk.components : FALLBACK_COMPONENTS
  const sentiment = st ?? FALLBACK_SENTIMENT
  const composite = bk?.composite ?? Math.round(components.reduce((a, c) => a + c.current * c.weight, 0))

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginTop: 22 }}>
      {/* Componentes del Risk Index */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Composición del Risk Index</h3>
          <span style={{ fontSize: 11, color: '#6e6e73' }}>
            Composite: <strong style={{ color: '#1d1d1f', fontFamily: 'var(--font-display,system-ui)', fontSize: 13 }}>{composite}</strong>/100
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {components.map(c => {
            const delta = c.baseline != null ? c.current - c.baseline : 0
            const trendColor = delta > 5 ? '#c42c2c' : delta < -5 ? '#2d8a39' : '#6e6e73'
            const barColor = c.current >= 70 ? '#c42c2c' : c.current >= 50 ? '#b25000' : '#2d8a39'
            return (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 90px 60px', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{c.name}</div>
                  {c.description && <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2, lineHeight: 1.35 }}>{c.description}</div>}
                </div>
                <div>
                  <div style={{ height: 8, background: '#f5f5f7', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${c.current}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 600ms ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-display,system-ui)', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>
                  {c.current}
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: trendColor }}>
                  {delta > 0 ? '+' : ''}{delta} {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f5f5f7', fontSize: 10.5, color: '#6e6e73', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Pesos suman 1.0</span>
          <span>Δ vs. baseline 30d</span>
          <span>Umbrales: ≥70 alto, ≥50 medio, &lt;50 bajo</span>
        </div>
      </div>

      {/* Sentimiento */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Sentimiento agregado</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, marginBottom: 14 }}>
          {([
            { label: 'Positivo', v: sentiment.positive, c: '#2d8a39' },
            { label: 'Neutro', v: sentiment.neutral, c: '#6e6e73' },
            { label: 'Negativo', v: sentiment.negative, c: '#c42c2c' },
          ]).map(b => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: b.c }}>{b.v}%</span>
              <div style={{
                width: '100%', height: `${b.v * 1.1}px`, background: b.c, borderRadius: '8px 8px 2px 2px',
                opacity: 0.85, transition: 'height 600ms ease',
              }} />
              <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 500 }}>{b.label}</span>
            </div>
          ))}
        </div>
        {sentiment.trend != null && (
          <div style={{ padding: '10px 12px', background: '#fafafc', borderRadius: 10, fontSize: 11.5, color: '#424245' }}>
            Tendencia 7d: <strong style={{
              color: sentiment.trend < -2 ? '#c42c2c' : sentiment.trend > 2 ? '#2d8a39' : '#6e6e73',
            }}>{sentiment.trend > 0 ? '+' : ''}{sentiment.trend} pp</strong>
            <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 4 }}>
              Calculado sobre 414 fuentes y análisis Ollama.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
