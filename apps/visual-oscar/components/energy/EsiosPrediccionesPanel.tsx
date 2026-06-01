'use client'
/**
 * <EsiosPrediccionesPanel /> · Sprint ESIOS-DEEP S4
 *
 * Predicciones oficiales REE D+1 + comparación con realización 24h:
 *   - 4 paneles paralelos (eólica, solar PV, renovable total, demanda)
 *   - Cada panel: KPI ahora pred vs real + MAPE + bias + chart 48h
 *   - Chart muestra real (pasado) + pred (futuro) en una línea continua
 *
 * Consume /api/esios/predicciones. Sin libs · SVG inline.
 */
import { useEffect, useState } from 'react'

interface SerieValor { t: string; v: number }
interface PredPair {
  pred_slug: string; real_slug: string; ok: boolean
  label: string; short: string; unit: string
  pred_serie: SerieValor[]
  real_serie: SerieValor[]
  pred_now: number | null
  real_now: number | null
  mape_24h_pct: number | null
  bias_pct: number | null
  error?: string
}
interface Response {
  ok: boolean; error?: string
  pairs: PredPair[]
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; note: string }
}

export function EsiosPrediccionesPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/predicciones', { cache: 'force-cache' })
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
          {/* Sprint Q-C.5 · S4 · acrónimos REE/D+1 explicados + MAPE/bias con regla interpretativa. */}
          Predicciones del operador del sistema (REE) para el día siguiente · eólica, solar, renovable, demanda
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Previsiones oficiales del operador con comparativa real frente a previsto.
          Error medio (MAPE): &lt;5% excelente, 5-15% razonable, &gt;15% mal. Sesgo: diferencia media predicción − real (positivo = sobreestima sistemáticamente).
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando predicciones ESIOS…</p>}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && data?.pairs && data.pairs.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {data.pairs.map((p) => <PredPairCard key={p.pred_slug} pair={p} />)}
        </div>
      )}
      {!loading && data?._meta && (
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          {data._meta.note} · Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a>
        </p>
      )}
    </section>
  )
}

function PredPairCard({ pair }: { pair: PredPair }) {
  if (!pair.ok) {
    return (
      <div style={{
        padding: '12px 14px', background: '#f8fafc', borderRadius: 8,
        borderLeft: '3px solid #cbd5e1', border: '1px solid #f1f5f9',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>{pair.short}</p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
          {pair.error || 'sin datos'}
        </p>
      </div>
    )
  }

  const isDemand = pair.pred_slug === 'demanda_prevista'
  const mainColor = pair.pred_slug === 'prediccion_eolica' ? '#3b82f6'
    : pair.pred_slug === 'prediccion_solar' ? '#f59e0b'
    : pair.pred_slug === 'prediccion_renovable' ? '#16a34a'
    : '#0891b2'

  const all = [...pair.real_serie, ...pair.pred_serie]
  const vals = all.map((p) => p.v)
  const minV = vals.length > 0 ? Math.min(...vals) * 0.95 : 0
  const maxV = vals.length > 0 ? Math.max(...vals) * 1.05 : 1
  const range = maxV - minV || 1

  const w = 280, h = 110, padL = 30, padR = 8, padT = 10, padB = 18
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const n = pair.real_serie.length + pair.pred_serie.length
  const xOf = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH

  // Real path
  const realPath = pair.real_serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
  // Pred path comienza donde acaba real
  const predOffset = pair.real_serie.length - 1
  const predPath = pair.pred_serie.length > 0
    ? pair.pred_serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(predOffset + i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
    : null

  // Vertical line "ahora" entre real y pred
  const nowX = xOf(predOffset)

  return (
    <div style={{
      padding: '12px 14px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${mainColor}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#475569', fontWeight: 600 }}>{pair.short}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10 }}>
        <span>
          <span style={{ color: '#94a3b8' }}>Real ahora:</span>{' '}
          <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>
            {pair.real_now !== null ? (pair.real_now / 1000).toFixed(2) : '—'} GW
          </strong>
        </span>
        <span>
          <span style={{ color: '#94a3b8' }}>Pred:</span>{' '}
          <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>
            {pair.pred_now !== null ? (pair.pred_now / 1000).toFixed(2) : '—'} GW
          </strong>
        </span>
      </div>

      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', marginTop: 6 }}>
        {[0, 1].map((t) => {
          const y = padT + innerH * t
          return <line key={t} x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
        })}
        {realPath && <path d={realPath} fill="none" stroke={mainColor} strokeWidth={1.6} />}
        {predPath && <path d={predPath} fill="none" stroke={mainColor} strokeWidth={1.6} strokeDasharray="3 2" opacity={0.7} />}
        {/* línea "ahora" */}
        <line x1={nowX} y1={padT} x2={nowX} y2={padT + innerH} stroke="#0f172a" strokeWidth={0.5} strokeDasharray="2 2" />
        <text x={nowX + 2} y={padT + 8} fontSize={8} fill="#475569">ahora</text>
        {/* eje Y · max/min */}
        <text x={padL - 4} y={padT + 6} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{(maxV / 1000).toFixed(1)}</text>
        <text x={padL - 4} y={padT + innerH} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{(minV / 1000).toFixed(1)}</text>
      </svg>

      <div style={{ display: 'flex', gap: 10, fontSize: 9, color: '#475569', marginTop: 4, flexWrap: 'wrap' }}>
        {pair.mape_24h_pct !== null && (
          <span>MAPE 24h: <strong style={{ fontFamily: 'ui-monospace, monospace', color: pair.mape_24h_pct < 5 ? '#16a34a' : pair.mape_24h_pct < 15 ? '#f59e0b' : '#dc2626' }}>{pair.mape_24h_pct.toFixed(1)}%</strong></span>
        )}
        {pair.bias_pct !== null && (
          <span>bias: <strong style={{ fontFamily: 'ui-monospace, monospace', color: Math.abs(pair.bias_pct) < 3 ? '#16a34a' : '#f59e0b' }}>{pair.bias_pct > 0 ? '+' : ''}{pair.bias_pct.toFixed(1)}%</strong></span>
        )}
      </div>
    </div>
  )
}

export default EsiosPrediccionesPanel
