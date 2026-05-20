'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'

type Workspace = { id: string; name: string; description?: string; sector?: string; members?: number; created_at?: string; updated_at?: string }
type Briefing = { id: string; title?: string; created_at?: string; type?: string; format?: string; size_kb?: number; download_url?: string }
type KPISnap = { active_alerts?: number; new_signals_24h?: number; risk_index?: number; coverage_pct?: number; pending_briefings?: number }

const FALLBACK_WORKSPACES: Workspace[] = [
  // Workspace principal — datos curados completos (cabecera ejecutiva España 2026)
  { id: 'ws_espana_2026', name: 'España 2026', description: 'Workspace principal · Elecciones Generales 2026 · datos curados + 10 secciones ejecutivas', sector: 'Política Nacional', members: 5 },
  { id: 'spain-energy', name: 'Energía España', description: 'Vigilancia regulatoria y narrativa sectorial.', sector: 'Energía', members: 4 },
  { id: 'banking-eu', name: 'Banca UE', description: 'Monitorización MiCA, DORA y supervisión BCE.', sector: 'Banca', members: 3 },
  { id: 'health-public', name: 'Sanidad pública', description: 'CCAA, presupuestos sanitarios y narrativa hospitalaria.', sector: 'Salud', members: 5 },
]
const FALLBACK_BRIEFINGS: Briefing[] = [
  { id: 'b-2026-05-08', title: 'Briefing matinal · 8 mayo 2026', created_at: '2026-05-08T07:30:00Z', format: 'pdf', size_kb: 412, type: 'matinal' },
  { id: 'b-2026-05-07', title: 'Briefing semanal · 7 mayo 2026', created_at: '2026-05-07T19:00:00Z', format: 'pdf', size_kb: 980, type: 'semanal' },
  { id: 'b-2026-05-06', title: 'Briefing matinal · 6 mayo 2026', created_at: '2026-05-06T07:30:00Z', format: 'pdf', size_kb: 388, type: 'matinal' },
]

export default function WorkspacesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data: wsData } = useApi<{ items?: Workspace[] } | Workspace[]>('/api/workspaces', { refreshInterval: 0 })
  const workspaces = useMemo<Workspace[]>(() => {
    const arr = Array.isArray(wsData) ? wsData : (wsData?.items ?? [])
    return arr.length > 0 ? arr : FALLBACK_WORKSPACES
  }, [wsData])

  const [activeId, setActiveId] = useState<string>('')
  useEffect(() => { if (!activeId && workspaces.length) setActiveId(workspaces[0].id) }, [workspaces, activeId])

  const { data: kpiData } = useApi<KPISnap>(activeId ? `/api/workspaces/${activeId}/kpis` : '/api/system/kpis', { refreshInterval: 60_000 })
  const { data: briefData } = useApi<{ items?: Briefing[] } | Briefing[]>(activeId ? `/api/workspaces/${activeId}/briefings` : '/api/briefings/archive', { refreshInterval: 0 })
  const briefings = useMemo<Briefing[]>(() => {
    const arr = Array.isArray(briefData) ? briefData : (briefData?.items ?? [])
    return arr.length > 0 ? arr : FALLBACK_BRIEFINGS
  }, [briefData])

  const kpis: KPISnap = kpiData ?? { active_alerts: 12, new_signals_24h: 38, risk_index: 64, coverage_pct: 82, pending_briefings: 2 }
  const active = workspaces.find(w => w.id === activeId)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 32px', marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Espacios de trabajo · {workspaces.length} activos
            </p>
            <h1 style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {active?.name ?? 'Workspace'}
            </h1>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
              {active?.description ?? 'Selecciona un workspace para ver su estado.'}
            </p>
          </div>

          {/* Workspace selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase' }}>Workspace activo</label>
            <select value={activeId} onChange={e => setActiveId(e.target.value)}
              style={{
                padding: '10px 14px', border: '1px solid #e8e8ed', borderRadius: 10, background: '#fff',
                fontSize: 13, fontFamily: 'inherit', color: '#1d1d1f', cursor: 'pointer',
              }}>
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name} {w.sector ? `· ${w.sector}` : ''}</option>
              ))}
            </select>
          </div>
        </section>

        {/* KPIs */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18,
        }}>
          {[
            { label: 'Alertas activas', value: kpis.active_alerts ?? 0, color: '#c42c2c' },
            { label: 'Señales 24h', value: kpis.new_signals_24h ?? 0, color: '#1F4E8C' },
            { label: 'Índice de Riesgo Político', value: kpis.risk_index ?? 0, color: kpis.risk_index && kpis.risk_index > 60 ? '#c42c2c' : '#b25000' },
            { label: 'Cobertura', value: `${kpis.coverage_pct ?? 0}%`, color: '#2d8a39' },
            { label: 'Briefings pdte.', value: kpis.pending_briefings ?? 0, color: '#5B21B6' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>
                {k.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: k.color }}>
                {k.value}
              </div>
            </div>
          ))}
        </section>

        {/* Briefings archive */}
        <section style={{
          background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Archivo de briefings · {active?.name ?? '—'}
            </h2>
            <span style={{
              padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.045)',
              fontSize: 11, fontWeight: 500, color: '#6e6e73',
            }}>
              {briefings.length} archivos
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
                <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Título</th>
                <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tamaño</th>
                <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {briefings.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: i < briefings.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                  <td style={{ padding: '12px 8px', color: '#1d1d1f', fontWeight: 500 }}>{b.title ?? b.id}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 999,
                      color: b.type === 'semanal' ? '#5B21B6' : '#1F4E8C',
                      background: b.type === 'semanal' ? 'rgba(91,33,182,0.10)' : 'rgba(31,78,140,0.10)',
                    }}>
                      {b.type ?? 'briefing'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                    {b.size_kb ? `${b.size_kb} KB` : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <a
                      href={b.download_url ?? '#'}
                      onClick={(e) => { if (!b.download_url) e.preventDefault() }}
                      style={{
                        padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        color: '#1F4E8C', background: 'rgba(31,78,140,0.08)', textDecoration: 'none',
                        opacity: b.download_url ? 1 : 0.5, cursor: b.download_url ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Descargar {b.format?.toUpperCase() ?? 'PDF'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {briefings.length === 0 && (
            <p style={{ fontSize: 12, color: '#6e6e73', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
              No hay briefings archivados para este workspace.
            </p>
          )}
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--hairline,#e8e8ed)', padding: '20px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 11.5 }}>
        Politeia Analítica · Workspaces · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
