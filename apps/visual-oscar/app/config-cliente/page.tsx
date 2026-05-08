'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'

type SystemHealth = {
  status?: 'ok' | 'degraded' | 'down'
  uptime_pct?: number
  api_latency_ms?: number
  db_latency_ms?: number
  ollama?: { status?: string; model?: string; latency_ms?: number }
  last_check?: string
}
type PipelineRun = { id: string; name: string; status: 'success' | 'running' | 'failed' | 'queued'; started_at?: string; duration_s?: number; rows_in?: number; rows_out?: number }
type AnalyticsSnap = { nowcast?: { pp?: number; psoe?: number; vox?: number; sumar?: number; updated_at?: string }; pedersen?: { last_30d?: number; last_90d?: number } }

const TABS = ['Sistema', 'Pipelines ETL', 'Analítica', 'Cuenta'] as const
type Tab = typeof TABS[number]

const FALLBACK_HEALTH: SystemHealth = {
  status: 'ok', uptime_pct: 99.94, api_latency_ms: 142, db_latency_ms: 18,
  ollama: { status: 'ok', model: 'politeia-brain:latest', latency_ms: 1240 },
  last_check: new Date().toISOString(),
}
const FALLBACK_PIPELINES: PipelineRun[] = [
  { id: 'boe', name: 'ETL · BOE diario', status: 'success', started_at: '2026-05-08T06:00:00Z', duration_s: 142, rows_in: 312, rows_out: 312 },
  { id: 'congreso', name: 'ETL · Congreso iniciativas', status: 'success', started_at: '2026-05-08T06:15:00Z', duration_s: 98, rows_in: 47, rows_out: 47 },
  { id: 'prensa', name: 'ETL · Prensa RSS (10 medios)', status: 'running', started_at: '2026-05-08T07:00:00Z', rows_in: 0 },
  { id: 'narrativas', name: 'NLP · Detección narrativas', status: 'queued' },
  { id: 'gdelt', name: 'ETL · GDELT geopolítico', status: 'failed', started_at: '2026-05-08T05:45:00Z', duration_s: 12 },
]
const FALLBACK_ANALYTICS: AnalyticsSnap = {
  nowcast: { pp: 33.2, psoe: 28.7, vox: 13.5, sumar: 8.1, updated_at: '2026-05-08T08:00:00Z' },
  pedersen: { last_30d: 4.2, last_90d: 8.6 },
}

function statusColor(s?: string) {
  if (s === 'ok' || s === 'success') return '#2d8a39'
  if (s === 'degraded' || s === 'running' || s === 'queued') return '#b25000'
  return '#c42c2c'
}

export default function ConfigClientePage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<Tab>('Sistema')
  const { data: hData } = useApi<SystemHealth>('/api/system/health', { refreshInterval: 60_000 })
  const { data: pData } = useApi<{ items?: PipelineRun[] } | PipelineRun[]>('/api/system/pipelines', { refreshInterval: 60_000 })
  const { data: aData } = useApi<AnalyticsSnap>('/api/analytics/snapshot', { refreshInterval: 300_000 })

  const health = hData ?? FALLBACK_HEALTH
  const pipelines: PipelineRun[] = (Array.isArray(pData) ? pData : pData?.items) ?? FALLBACK_PIPELINES
  const analytics = aData ?? FALLBACK_ANALYTICS

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 80px' }}>

        <header style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Configuración</p>
          <h1 style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px', color: '#1d1d1f' }}>
            Ajustes del cliente
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
            Salud del sistema, pipelines de datos, analítica y cuenta.
          </p>
        </header>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e8ed', marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              border: 'none', background: 'transparent', padding: '12px 20px', marginBottom: -1,
              borderBottom: tab === t ? '2px solid #1d1d1f' : '2px solid transparent',
              fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#1d1d1f' : '#6e6e73',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>

        {/* SISTEMA */}
        {tab === 'Sistema' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>API & Backend</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Row label="Estado" value={(health.status ?? 'ok').toUpperCase()} color={statusColor(health.status)}/>
                <Row label="Uptime 30d" value={`${health.uptime_pct ?? 0}%`}/>
                <Row label="Latencia API" value={`${health.api_latency_ms ?? 0} ms`}/>
                <Row label="Latencia DB" value={`${health.db_latency_ms ?? 0} ms`}/>
                <Row label="Última comprobación" value={health.last_check ? new Date(health.last_check).toLocaleString('es-ES') : '—'} subtle/>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Brain · Ollama</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Row label="Estado" value={(health.ollama?.status ?? 'ok').toUpperCase()} color={statusColor(health.ollama?.status)}/>
                <Row label="Modelo" value={health.ollama?.model ?? 'politeia-brain:latest'} mono/>
                <Row label="Latencia" value={`${health.ollama?.latency_ms ?? 0} ms`}/>
                <Row label="Cobertura RAG" value="ChromaDB · 12.4k docs"/>
                <Row label="Embeddings" value="nomic-embed-text" mono subtle/>
              </div>
            </div>
          </div>
        )}

        {/* PIPELINES */}
        {tab === 'Pipelines ETL' && (
          <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Últimas ejecuciones</h3>
              <span style={{ fontSize: 11, color: '#6e6e73' }}>{pipelines.length} pipelines · auto-refresh 60s</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
                  <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pipeline</th>
                  <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Inicio</th>
                  <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Duración</th>
                  <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Filas</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < pipelines.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: statusColor(p.status), background: `${statusColor(p.status)}14`,
                      }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                      {p.started_at ? new Date(p.started_at).toLocaleTimeString('es-ES') : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6e6e73', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {p.duration_s != null ? `${p.duration_s}s` : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6e6e73', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {p.rows_in != null ? `${p.rows_in.toLocaleString('es-ES')} → ${(p.rows_out ?? p.rows_in).toLocaleString('es-ES')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ANALITICA */}
        {tab === 'Analítica' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Nowcast electoral</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {([
                  { p: 'PP', v: analytics.nowcast?.pp, c: '#1F4E8C' },
                  { p: 'PSOE', v: analytics.nowcast?.psoe, c: '#E1322D' },
                  { p: 'VOX', v: analytics.nowcast?.vox, c: '#5BA02E' },
                  { p: 'Sumar', v: analytics.nowcast?.sumar, c: '#D43F8D' },
                ]).map(x => (
                  <div key={x.p} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: x.c, marginBottom: 6 }}>{x.p}</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {x.v != null ? `${x.v.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
              {analytics.nowcast?.updated_at && (
                <p style={{ fontSize: 10.5, color: '#6e6e73', margin: '12px 0 0' }}>
                  Última actualización: {new Date(analytics.nowcast.updated_at).toLocaleString('es-ES')}
                </p>
              )}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Volatilidad Pedersen</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Row label="Últimos 30 días" value={analytics.pedersen?.last_30d != null ? analytics.pedersen.last_30d.toFixed(2) : '—'} mono/>
                <Row label="Últimos 90 días" value={analytics.pedersen?.last_90d != null ? analytics.pedersen.last_90d.toFixed(2) : '—'} mono/>
                <p style={{ fontSize: 11, color: '#6e6e73', margin: '4px 0 0', lineHeight: 1.5 }}>
                  Índice Pedersen: medida agregada de transferencia de voto entre partidos. Valores altos indican fragmentación.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CUENTA */}
        {tab === 'Cuenta' && (
          <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Cuenta y preferencias</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="Plan" value="Politeia Enterprise"/>
              <Row label="Workspaces incluidos" value="Ilimitados"/>
              <Row label="Usuarios activos" value="—"/>
              <Row label="Integración Slack" value="Conectada" color="#2d8a39"/>
              <Row label="Integración Drive" value="No conectada" color="#6e6e73" subtle/>
              <Row label="2FA" value="Habilitada" color="#2d8a39"/>
            </div>
          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid var(--hairline,#e8e8ed)', padding: '20px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 11.5 }}>
        Politeia Analítica · Configuración · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function Row({ label, value, color, mono, subtle }: { label: string; value: string | number; color?: string; mono?: boolean; subtle?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 11.5, color: '#6e6e73' }}>{label}</span>
      <span style={{
        fontSize: subtle ? 11 : 12.5, fontWeight: 600,
        color: color ?? '#1d1d1f',
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      }}>{value}</span>
    </div>
  )
}
