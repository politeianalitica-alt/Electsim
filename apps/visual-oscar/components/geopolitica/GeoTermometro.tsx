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
import { GeoSourceBadgeFromMeta } from './GeoSourceBadge'
import { GeoAuditDrawer, buildAuditFromRiskIndex } from './GeoAuditDrawer'
import type { GeoEndpointMode, GeoLayer } from '@/lib/geopolitica/geo-methodology'

interface RiskIndexResponse {
  ok: boolean
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  confidence?: number
  components: Array<{
    key: string
    label: string
    raw: number | null
    norm: number | null
    weight: number
    source: string
    // Sprint G13 FASE 5 · campos enriquecidos
    source_mode?: 'live_api' | 'derived_from_news' | 'hybrid' | 'curated_baseline' | 'mock'
    layer?: 'fast_signal' | 'hard_event' | 'media_attention' | 'analytical_model'
    confidence?: number
    caveat?: string
    possible_double_counting?: string[]
    interpretation?: string
  }>
  methodology: string
  cite?: string
  generated_at: string
  // Sprint G13 FASE 5
  what_it_means?: string
  what_it_does_not_mean?: string
  interpretation?: string
  double_counting_warning?: string | null
  _geo_meta?: {
    source_mode: GeoEndpointMode
    layer?: GeoLayer
    confidence?: number
    sources_used?: string[]
  }
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
  const [auditOpen, setAuditOpen] = useState(false)

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
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
              ◆ Índice de presión geopolítica · entorno estratégico España
            </p>
            {/* Sprint G13 FASE 9 · badge del modo de fuente del endpoint */}
            {data._geo_meta && <GeoSourceBadgeFromMeta meta={data._geo_meta} compact />}
            {/* Sprint G13 FASE 8 · botón auditar */}
            <button
              onClick={() => setAuditOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                background: 'transparent', color: '#94a3b8', border: '1px solid #475569',
                borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
              }}
              title="Abrir auditoría de cómo se calculó este score"
            >◇ Auditar</button>
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>
            Score 0-100 · señales agregadas auditables
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>Qué mide:</strong>{' '}
            {data.what_it_means || 'presión agregada en fuentes abiertas y señales de seguridad relevantes para España (alertas, ACLED en zonas de interés, volumen OSINT, sanciones, tono mediático).'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>
            <strong style={{ color: '#94a3b8' }}>Qué NO mide:</strong>{' '}
            {data.what_it_does_not_mean || 'probabilidad de guerra en España, riesgo país soberano, opinión pública ni intención electoral. Es un proxy de presión informativa/estratégica, no de realidad material.'}
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

      {/* Sprint G13 FASE 5 · interpretación por banda */}
      {data.interpretation && (
        <p style={{ margin: '0 0 12px', padding: '8px 12px', background: '#1e293b', borderLeft: `3px solid ${band.track}`, borderRadius: 4, fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>
          <strong style={{ color: band.fg === '#166534' ? '#86efac' : band.fg === '#92400e' ? '#fcd34d' : band.fg === '#9a3412' ? '#fb923c' : '#fca5a5' }}>{data.band}:</strong>{' '}
          {data.interpretation}
        </p>
      )}

      {/* Sprint G13 FASE 5 · warning double counting */}
      {data.double_counting_warning && (
        <p style={{ margin: '0 0 12px', padding: '8px 12px', background: '#451a03', border: '1px solid #92400e', borderRadius: 4, fontSize: 11, color: '#fcd34d', lineHeight: 1.5 }}>
          <strong>▲ Posible double counting:</strong> {data.double_counting_warning}
        </p>
      )}

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
            const tipParts: string[] = []
            if (c.source) tipParts.push(`Fuente: ${c.source}`)
            if (c.source_mode) tipParts.push(`Modo: ${c.source_mode}`)
            if (c.layer) tipParts.push(`Capa: ${c.layer}`)
            if (typeof c.confidence === 'number') tipParts.push(`Conf: ${Math.round(c.confidence * 100)}%`)
            if (c.caveat) tipParts.push(`▲ ${c.caveat}`)
            if (c.possible_double_counting && c.possible_double_counting.length > 0) tipParts.push(`Solapa con: ${c.possible_double_counting.join(', ')}`)
            if (c.interpretation) tipParts.push(`Interpretación: ${c.interpretation}`)
            const tooltip = tipParts.join(' · ')
            return (
              <div key={c.key} title={tooltip} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px 50px 60px', gap: 10, alignItems: 'center', fontSize: 11, cursor: 'help' }}>
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
                <span style={{ textAlign: 'right', fontSize: 8, fontWeight: 700, color: c.source_mode === 'live_api' ? '#86efac' : c.source_mode === 'derived_from_news' ? '#fcd34d' : c.source_mode === 'hybrid' ? '#fde68a' : '#94a3b8', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  {c.source_mode === 'live_api' ? 'LIVE' : c.source_mode === 'derived_from_news' ? 'RSS' : c.source_mode === 'hybrid' ? 'MIX' : c.source_mode === 'curated_baseline' ? 'CUR' : ''}
                </span>
              </div>
            )
          })}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
          {data.methodology}
        </p>
      </div>
      {/* Sprint G13 FASE 8 · audit drawer transversal */}
      <GeoAuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        payload={data ? buildAuditFromRiskIndex(data) : null}
      />
    </section>
  )
}

export default GeoTermometro
