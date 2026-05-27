'use client'
/**
 * <EsiosDemandaRealVsPrevista /> · Sprint ESIOS-DEEP S3
 *
 * Muestra demanda real peninsular vs prevista por REE D+1:
 *   - KPIs: demanda ahora, prevista para esta hora, error %, MAPE 24h
 *   - Chart 48h: línea sólida real + dashed prevista + área de error
 *   - Panel lateral: demanda actual en los 5 sistemas (Pen/Can/Bal/Ceu/Mel)
 *
 * Consume /api/esios/demanda. Sin libs · SVG inline.
 */
import { useEffect, useState } from 'react'

interface SerieValor { t: string; v: number }
interface Serie {
  slug: string; ok: boolean
  label: string; short: string; unit: string
  latest_mw: number | null
  latest_datetime: string | null
  avg_24h_mw: number | null
  serie_24h: SerieValor[]
  error?: string
}
interface Response {
  ok: boolean; error?: string
  forecast: Record<string, Serie>
  sistemas: Record<string, Serie>
  mape_24h_pct: number | null
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; note: string }
}

const SYS_LABELS: Record<string, { name: string; accent: string }> = {
  demanda_real: { name: 'Península', accent: '#0891b2' },
  demanda_canarias: { name: 'Canarias', accent: '#f59e0b' },
  demanda_baleares: { name: 'Baleares', accent: '#16a34a' },
  demanda_ceuta: { name: 'Ceuta', accent: '#7c3aed' },
  demanda_melilla: { name: 'Melilla', accent: '#dc2626' },
}

export function EsiosDemandaRealVsPrevista() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/demanda', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
          letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
        }}>
          Demanda · real vs prevista + 5 sistemas
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Demanda peninsular real (10-min) vs prevista oficial REE · error MAPE 24h.
          Snapshot por sistema (Península / Canarias / Baleares / Ceuta / Melilla).
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando demanda ESIOS…</p>}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && data?.ok && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(320px, 2fr) minmax(180px, 1fr)',
          gap: 14,
        }}>
          <div>
            <ForecastKpis data={data} />
            <ForecastChart real={data.forecast.demanda_real} pred={data.forecast.demanda_prevista} />
          </div>
          <SistemasPanel sistemas={data.sistemas} />
        </div>
      )}
    </section>
  )
}

function ForecastKpis({ data }: { data: Response }) {
  const real = data.forecast.demanda_real
  const pred = data.forecast.demanda_prevista
  const errorPct = real?.latest_mw && pred?.latest_mw
    ? Math.round(((real.latest_mw - pred.latest_mw) / pred.latest_mw) * 1000) / 10
    : null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 8, marginBottom: 12,
    }}>
      <Kpi label="Real ahora" value={real?.latest_mw ? `${(real.latest_mw / 1000).toFixed(2)} GW` : '—'} sub={real?.latest_datetime?.slice(11, 16) + 'h'} accent="#0891b2" />
      <Kpi label="Prevista" value={pred?.latest_mw ? `${(pred.latest_mw / 1000).toFixed(2)} GW` : '—'} sub="REE D+1" accent="#94a3b8" />
      {errorPct !== null && (
        <Kpi
          label="Error vs prev."
          value={`${errorPct > 0 ? '+' : ''}${errorPct.toFixed(1)}%`}
          sub={errorPct > 2 ? 'superando previsión' : errorPct < -2 ? 'por debajo de previsión' : 'cerca de previsión'}
          accent={Math.abs(errorPct) < 2 ? '#16a34a' : Math.abs(errorPct) < 5 ? '#f59e0b' : '#dc2626'}
        />
      )}
      {data.mape_24h_pct !== null && (
        <Kpi label="MAPE 24h" value={`${data.mape_24h_pct.toFixed(2)}%`} sub="error medio forecast REE" accent="#7c3aed" />
      )}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      padding: '8px 10px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function ForecastChart({ real, pred }: { real?: Serie; pred?: Serie }) {
  if (!real?.serie_24h.length || !pred?.serie_24h.length) return null
  const all = [...real.serie_24h, ...pred.serie_24h]
  const vals = all.map((p) => p.v)
  const minV = Math.min(...vals) * 0.95
  const maxV = Math.max(...vals) * 1.05
  const range = maxV - minV || 1

  const n = Math.max(real.serie_24h.length, pred.serie_24h.length)
  const w = 520, h = 200, padL = 36, padR = 8, padT = 14, padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const xOf = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH

  const realPath = real.serie_24h.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
  const predPath = pred.serie_24h.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Demanda 48h · real vs prevista
      </p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 0.5, 1].map((t) => {
          const v = maxV - range * t
          const y = padT + innerH * t
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">
                {(v / 1000).toFixed(1)} GW
              </text>
            </g>
          )
        })}
        <path d={predPath} fill="none" stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="4 3" />
        <path d={realPath} fill="none" stroke="#0891b2" strokeWidth={1.8} />
        {real.serie_24h.length > 0 && [0, Math.floor(n / 2), n - 1].map((i) => {
          const p = real.serie_24h[i] || pred.serie_24h[i]
          return (
            <text key={i} x={xOf(i)} y={h - 6} fontSize={8} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
              {p.t.slice(11, 16)}
            </text>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: '#475569' }}>
        <Legend color="#0891b2" label="Real" />
        <Legend color="#94a3b8" label="Prevista REE" dashed />
      </div>
    </div>
  )
}

function SistemasPanel({ sistemas }: { sistemas: Record<string, Serie> }) {
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Demanda por sistema
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Object.entries(SYS_LABELS).map(([slug, meta]) => {
          const s = sistemas[slug]
          if (!s) return null
          const ok = s.ok && s.latest_mw !== null
          return (
            <div key={slug} style={{
              padding: '8px 10px', background: '#fff', borderRadius: 6,
              borderLeft: `3px solid ${meta.accent}`, border: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 600 }}>{meta.name}</p>
                {s.latest_datetime && (
                  <p style={{ margin: 0, fontSize: 8, color: '#94a3b8' }}>{s.latest_datetime.slice(11, 16)}h</p>
                )}
              </div>
              {ok ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                  {(s.latest_mw! / 1000).toFixed(2)} GW
                </span>
              ) : (
                <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>—</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width={16} height={4}><line x1={0} y1={2} x2={16} y2={2} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '3 2' : undefined} /></svg>
      <span>{label}</span>
    </span>
  )
}

export default EsiosDemandaRealVsPrevista
