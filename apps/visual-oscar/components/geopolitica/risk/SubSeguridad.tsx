'use client'
/**
 * <SubSeguridad /> · Sprint GEO-RP C3 · Sub-tab 4 Seguridad & Conflicto
 *
 * Consume /api/geopolitica/pais/[iso3]/seguridad
 * - KPIs eventos 90d (war + protest + tono medio)
 * - Series semanales SVG (war + protest) doble eje
 * - Actores top 8 extraídos (chips clickables)
 * - Top dominios cobertura
 * - Lista 10 eventos recientes con enlace
 */
import { useEffect, useState } from 'react'

interface WeeklyPoint { week_start: string; events: number; avg_tone: number }
interface Actor { name: string; mentions: number }
interface Domain { domain: string; count: number }
interface Event { title: string; domain: string; url: string; datetime: string; tone: number | null }
interface SegResp {
  ok: boolean
  iso3: string
  country_name: string
  summary: { total_war_events_90d: number; total_protests_90d: number; avg_tone: number }
  war_series_weekly: WeeklyPoint[]
  protest_series_weekly: WeeklyPoint[]
  top_actors: Actor[]
  top_domains: Domain[]
  recent_events: Event[]
}

export function SubSeguridad({ iso3 }: { iso3: string }) {
  const [data, setData] = useState<SegResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/pais/${iso3}/seguridad`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando seguridad GDELT…</p>
  if (!data?.ok) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin datos GDELT para seguridad.</p>

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
        ACLED no disponible · datos GDELT WAR_CONFLICT + PROTEST themes · sin coordenadas subnacionales.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <Kpi label="War events 90d" value={String(data.summary.total_war_events_90d)} accent="#dc2626" />
        <Kpi label="Protest events 90d" value={String(data.summary.total_protests_90d)} accent="#f59e0b" />
        <Kpi label="Tono medio" value={data.summary.avg_tone.toFixed(2)} accent={data.summary.avg_tone < -3 ? '#dc2626' : data.summary.avg_tone < 0 ? '#f59e0b' : '#16a34a'} />
      </div>

      <h4 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Series semanales · violencia y protesta
      </h4>
      <DualSeries war={data.war_series_weekly} protest={data.protest_series_weekly} />

      {data.top_actors.length > 0 && (
        <>
          <h4 style={{ margin: '14px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Actores principales (extraídos de titulares)
          </h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.top_actors.map((a) => (
              <span key={a.name} style={{ padding: '3px 8px', background: '#fef2f2', color: '#7f1d1d', borderRadius: 12, fontSize: 10, border: '1px solid #fecaca' }}>
                {a.name} <strong>{a.mentions}</strong>
              </span>
            ))}
          </div>
        </>
      )}

      {data.recent_events.length > 0 && (
        <>
          <h4 style={{ margin: '14px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Eventos recientes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.recent_events.slice(0, 8).map((e) => (
              <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" style={{
                padding: '6px 8px', background: '#f8fafc', borderRadius: 4, textDecoration: 'none', color: 'inherit',
                borderLeft: `3px solid ${e.tone !== null && e.tone < -3 ? '#dc2626' : '#94a3b8'}`,
              }}>
                <p style={{ margin: 0, fontSize: 10, color: '#0f172a', lineHeight: 1.3 }}>{e.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>
                  {e.domain} · {e.datetime?.slice(0, 10)} {e.tone !== null && `· tono ${e.tone > 0 ? '+' : ''}${e.tone.toFixed(1)}`}
                </p>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function DualSeries({ war, protest }: { war: WeeklyPoint[]; protest: WeeklyPoint[] }) {
  const all = [...war, ...protest]
  if (all.length < 2) return <p style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Datos insuficientes para serie.</p>
  const maxV = Math.max(...all.map((p) => p.events), 1)
  const w = 580, h = 140, pad = 20
  const innerW = w - pad * 2, innerH = h - pad * 2
  const len = Math.max(war.length, protest.length)
  const xOf = (i: number) => pad + (i / Math.max(1, len - 1)) * innerW
  const yOf = (v: number) => pad + innerH - (v / maxV) * innerH
  const pathOf = (s: WeeklyPoint[], color: string) => {
    if (s.length < 2) return null
    const d = s.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(p.events)}`).join(' ')
    return <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
  }
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={pad} y1={pad + innerH * t} x2={w - pad} y2={pad + innerH * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {pathOf(war, '#dc2626')}
        {pathOf(protest, '#f59e0b')}
        <text x={pad - 4} y={pad + 6} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{maxV}</text>
        <text x={pad - 4} y={pad + innerH} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">0</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#475569', marginTop: 4 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 2, background: '#dc2626', verticalAlign: 'middle' }} /> War conflict</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 2, background: '#f59e0b', verticalAlign: 'middle' }} /> Protest</span>
      </div>
    </div>
  )
}

export default SubSeguridad
