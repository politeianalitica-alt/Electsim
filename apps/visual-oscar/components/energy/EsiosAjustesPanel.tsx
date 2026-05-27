'use client'
/**
 * <EsiosAjustesPanel /> · Sprint ESIOS-DEEP S4
 *
 * Panel B2B/pro de servicios de ajuste del sistema eléctrico:
 *   - 6 servicios: banda sec. sub/baj, terciaria sub/baj, desvíos, restricciones
 *   - Cada uno: precio actual + media 24h + max/min + sparkline + nivel tensión
 *   - Sistema global tensión (low/normal/elevated/high)
 *
 * Útil para traders, comercializadoras, agregadores de demanda.
 * Consume /api/esios/ajustes. Sin libs · SVG inline.
 */
import { useEffect, useState } from 'react'

interface SerieValor { t: string; v: number }
interface AjusteService {
  slug: string; ok: boolean
  label: string; short: string; unit: string; use_case: string
  latest: { value: number; datetime: string } | null
  avg_24h: number | null
  max_24h: number | null
  min_24h: number | null
  serie_24h: SerieValor[]
  tension_level: 'low' | 'normal' | 'elevated' | 'high' | null
  error?: string
}
interface Response {
  ok: boolean; error?: string
  services: Record<string, AjusteService>
  system_tension: 'low' | 'normal' | 'elevated' | 'high'
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; tension_rules: string; note: string }
}

const TENSION_COLOR: Record<string, string> = {
  low: '#16a34a',
  normal: '#0891b2',
  elevated: '#f59e0b',
  high: '#dc2626',
}
const TENSION_LABEL: Record<string, string> = {
  low: 'Bajo · sistema relajado',
  normal: 'Normal',
  elevated: 'Elevado · vigilar',
  high: 'Alto · sistema tensionado',
}

export function EsiosAjustesPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/ajustes', { cache: 'force-cache' })
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
      <header style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
            letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
          }}>
            Mercado de regulación · servicios de ajuste (B2B)
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Banda secundaria · terciaria · gestión desvíos · restricciones técnicas.
            Útil para trading, comercializadoras y agregadores.
          </p>
        </div>
        {data?.ok && (
          <SystemTension level={data.system_tension} />
        )}
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando servicios ESIOS…</p>}

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
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}>
          {Object.values(data.services).map((s) => <ServiceCard key={s.slug} svc={s} />)}
        </div>
      )}

      {!loading && data?._meta && (
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          {data._meta.tension_rules} · Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a>
        </p>
      )}
    </section>
  )
}

function SystemTension({ level }: { level: 'low' | 'normal' | 'elevated' | 'high' }) {
  return (
    <div style={{
      padding: '6px 12px', background: `${TENSION_COLOR[level]}15`,
      border: `1px solid ${TENSION_COLOR[level]}40`,
      borderRadius: 6, fontSize: 11, color: TENSION_COLOR[level], fontWeight: 600,
    }}>
      Tensión sistema: {TENSION_LABEL[level]}
    </div>
  )
}

function ServiceCard({ svc }: { svc: AjusteService }) {
  if (!svc.ok || !svc.latest) {
    return (
      <div style={{
        padding: '10px 12px', background: '#f8fafc', borderRadius: 6,
        borderLeft: '3px solid #cbd5e1', border: '1px solid #f1f5f9',
      }}>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 600 }}>{svc.short}</p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
          {svc.error || 'sin datos'}
        </p>
      </div>
    )
  }

  const accent = svc.tension_level ? TENSION_COLOR[svc.tension_level] : '#64748b'

  // Sparkline
  const vals = svc.serie_24h.map((p) => p.v)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const w = 80, h = 22
  const path = svc.serie_24h.length > 1
    ? svc.serie_24h.map((p, i) => {
        const x = (i / (svc.serie_24h.length - 1)) * w
        const y = h - ((p.v - minV) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    : null

  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }} title={svc.use_case}>
      <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.3 }}>
        {svc.short}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
          {svc.latest.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
        </span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>{svc.unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
          media: {svc.avg_24h?.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
        </span>
        {path && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <path d={path} fill="none" stroke={accent} strokeWidth={1.4} />
          </svg>
        )}
      </div>
      {svc.tension_level && svc.tension_level !== 'normal' && (
        <p style={{ margin: '4px 0 0', fontSize: 9, color: accent, fontWeight: 600 }}>
          ⚠ {TENSION_LABEL[svc.tension_level]}
        </p>
      )}
      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#cbd5e1' }}>
        rango 24h: {svc.min_24h?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}–{svc.max_24h?.toLocaleString('es-ES', { maximumFractionDigits: 0 })} {svc.unit}
      </p>
    </div>
  )
}

export default EsiosAjustesPanel
