'use client'
/**
 * `<GeoTermometro />` · Sprint G2.
 *
 * Hero superior con score Spain Composite Risk 0-100 + breakdown de
 * componentes. Inspiración directa: BlackRock Geopolitical Risk Indicator
 * (Z-score) + Verisk Maplecroft Country Risk Rating, pero TRANSPARENTE
 * (cada componente y peso visible).
 *
 * Score 0 = riesgo mínimo (verde). Score 100 = crítico (rojo).
 *
 * Diferenciador vs Verisk/BlackRock:
 *   - Open methodology (no caja negra)
 *   - Spain-optimized (alertas + ACLED + GDELT + OSINT volumen + sanciones)
 *   - Realtime refresh (vs anual/trimestral)
 *   - Free (vs $50k/yr Verisk)
 */
import { useEffect, useState } from 'react'

interface RiskIndexResponse {
  ok: boolean
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  components: Array<{
    key: string
    label: string
    raw: number | null
    norm: number | null
    weight: number
    source: string
  }>
  methodology: string
  cite: string
  generated_at: string
}

const BAND_COLOR: Record<RiskIndexResponse['band'], { bg: string; fg: string; track: string }> = {
  BAJO:    { bg: '#dcfce7', fg: '#166534', track: '#16a34a' },
  MEDIO:   { bg: '#fef3c7', fg: '#92400e', track: '#f59e0b' },
  ALTO:    { bg: '#ffedd5', fg: '#9a3412', track: '#f97316' },
  CRITICO: { bg: '#fee2e2', fg: '#991b1b', track: '#dc2626' },
}

export function GeoTermometro() {
  const [data, setData] = useState<RiskIndexResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/risk-index', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch((e) => { if (alive) setErr(String(e?.message ?? e).slice(0, 120)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <section style={{ background: '#0f172a', borderRadius: 12, padding: 20, color: '#94a3b8' }}>
        Calculando Spain Risk Index…
      </section>
    )
  }
  if (err || !data) {
    return (
      <section style={{ background: '#0f172a', borderRadius: 12, padding: 20, color: '#fca5a5' }}>
        Error cargando Risk Index · {err || 'sin datos'}
      </section>
    )
  }

  const band = BAND_COLOR[data.band]

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid #1e293b',
        borderLeft: `4px solid ${band.track}`,
        borderRadius: 12,
        padding: 20,
        color: '#f1f5f9',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
            ◆ Spain Composite Risk Index · Sprint G2
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
            Score geopolítico España 0-100 · multi-fuente transparente
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
            Inspirado en BlackRock GRI + Verisk Maplecroft · refrescado cada 6h
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 64, fontWeight: 700, color: band.track, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as const }}>
            {data.score}
          </p>
          <span style={{
            display: 'inline-block',
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '4px 12px',
            borderRadius: 12,
            background: band.bg,
            color: band.fg,
          }}>
            BANDA · {data.band}
          </span>
        </div>
      </header>

      {/* Barra horizontal score */}
      <div style={{ position: 'relative', height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${data.score}%`,
          background: `linear-gradient(90deg, #16a34a 0%, #f59e0b 35%, #f97316 55%, #dc2626 80%)`,
          transition: 'width 400ms ease',
        }} />
        {/* Marcadores umbral */}
        {[30, 55, 75].map((m) => (
          <div key={m} style={{ position: 'absolute', top: -2, left: `${m}%`, width: 1, height: 12, background: '#64748b' }} />
        ))}
      </div>

      {/* Breakdown componentes */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          ⓘ Descomposición · {data.components.length} factores
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.components.map((c) => {
            const pct = c.norm ?? 0
            const barColor = pct < 30 ? '#16a34a' : pct < 55 ? '#f59e0b' : pct < 75 ? '#f97316' : '#dc2626'
            return (
              <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px 50px', gap: 10, alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: '#cbd5e1' }}>{c.label}</span>
                <div style={{ position: 'relative', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  {c.norm != null && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: `${pct}%`,
                      background: barColor,
                      transition: 'width 300ms ease',
                    }} />
                  )}
                </div>
                <span style={{ textAlign: 'right', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' as const }}>
                  {c.norm != null ? `${pct.toFixed(0)}/100` : '—'}
                </span>
                <span style={{ textAlign: 'right', fontSize: 9, color: '#64748b' }}>
                  {Math.round(c.weight * 100)}%
                </span>
              </div>
            )
          })}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
          {data.methodology}
        </p>
      </div>
    </section>
  )
}

export default GeoTermometro
