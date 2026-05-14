'use client'
/* /workspaces/[workspaceId]/overview
   Vista resumen del Workspace seleccionado. Combina:
   - Header con nombre del workspace + sector + miembros
   - 4 KPIs (alertas activas, señales 24h, índice riesgo, briefings pendientes)
   - Issues / Acciones / Decisiones recientes
   - Briefings descargables
   Comparte el modelo visual con /workspace (War Room) y la familia
   Apple-Newsroom del resto del dashboard. */
import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'

// ── Catálogo de workspaces conocidos ────────────────────────────────────
type WorkspaceMeta = {
  id: string
  name: string
  fullName: string
  sector: string
  members: number
  description: string
  accent: string  // color principal del hero
  accent2: string // gradient end
}

const WORKSPACE_CATALOG: Record<string, WorkspaceMeta> = {
  ws_espana_2026: {
    id: 'ws_espana_2026',
    name: 'España 2026',
    fullName: 'Workspace España · Ciclo Electoral 2026',
    sector: 'Electoral · Político',
    members: 4,
    description: 'Centro operativo del equipo · monitorización electoral, legislativa, riesgo y narrativa pública.',
    accent: '#0F2A4F',
    accent2: '#020617',
  },
  spain_energy: {
    id: 'spain_energy',
    name: 'Energía España',
    fullName: 'Workspace · Energía & Utilities',
    sector: 'Energía',
    members: 4,
    description: 'Vigilancia regulatoria y narrativa sectorial.',
    accent: '#B45309',
    accent2: '#5C2310',
  },
  banking_eu: {
    id: 'banking_eu',
    name: 'Banca UE',
    fullName: 'Workspace · Banca & Supervisión Europea',
    sector: 'Banca',
    members: 3,
    description: 'Monitorización MiCA, DORA y supervisión BCE.',
    accent: '#1F4E8C',
    accent2: '#0F2A4F',
  },
  health_public: {
    id: 'health_public',
    name: 'Sanidad pública',
    fullName: 'Workspace · Sanidad Pública',
    sector: 'Salud',
    members: 5,
    description: 'CCAA, presupuestos sanitarios y narrativa hospitalaria.',
    accent: '#0F766E',
    accent2: '#064E47',
  },
}

function resolveWorkspace(id: string): WorkspaceMeta {
  return WORKSPACE_CATALOG[id] || {
    id, name: id, fullName: id, sector: '—', members: 0,
    description: 'Workspace personalizado.',
    accent: '#1F4E8C', accent2: '#0F2A4F',
  }
}

// ── Datos demo del overview (mismo shape que /workspace War Room) ───────
const ISSUES_RECENT = [
  { title: 'Ley de vivienda — riesgo bloqueo Junts', priority: 'critical', deadline: '8 may' },
  { title: 'Crisis comunicacional sondeos PP',        priority: 'high',     deadline: '6 may' },
  { title: 'Plan reforma fiscal Sumar',               priority: 'medium',   deadline: '12 may' },
]
const ACTIONS_RECENT = [
  { title: 'Preparar Q&A para entrevista TVE viernes', deadline: '9 may',  responsible: 'Comunicación' },
  { title: 'Briefing para socio de coalición',          deadline: '8 may',  responsible: 'Estrategia' },
  { title: 'Revisar marco legal amnistía',              deadline: '10 may', responsible: 'Legal' },
]
const DECISIONS_RECENT = [
  { date: '5 may', title: 'No responder al ataque de OK Diario sobre alto cargo', by: 'Comunicación' },
  { date: '4 may', title: 'Activar mensaje sobre vivienda con propuestas concretas', by: 'Estrategia' },
]
const BRIEFINGS = [
  { id: 'b-2026-05-08', title: 'Briefing matinal · 8 mayo 2026', size: '412 KB', date: '2026-05-08T07:30:00Z', type: 'matinal' },
  { id: 'b-2026-05-07', title: 'Briefing semanal · 7 mayo 2026', size: '980 KB', date: '2026-05-07T19:00:00Z', type: 'semanal' },
  { id: 'b-2026-05-06', title: 'Briefing matinal · 6 mayo 2026', size: '388 KB', date: '2026-05-06T07:30:00Z', type: 'matinal' },
]

// ── Helpers visuales ────────────────────────────────────────────────────
const PRIO_COLOR: Record<string, string> = {
  critical: '#7F1D1D', high: '#DC2626', medium: '#F97316', low: '#EAB308',
}
const PRIO_LABEL: Record<string, string> = {
  critical: 'CRÍTICA', high: 'ALTA', medium: 'MEDIA', low: 'BAJA',
}
function PrioChip({ p }: { p: string }) {
  const color = PRIO_COLOR[p] || '#6e6e73'
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
      color: '#fff', background: color, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>{PRIO_LABEL[p] || p.toUpperCase()}</span>
  )
}

function KPICard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      padding: '14px 16px 12px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: accent }}/>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
        color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.022em', lineHeight: 1, color: accent,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
      padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d', margin: 0,
        }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// ── Tipos del backend (opcional, fallback OK si no responde) ────────────
type KPISnap = { active_alerts?: number; new_signals_24h?: number; risk_index?: number; coverage_pct?: number; pending_briefings?: number }

// ─── Página ──────────────────────────────────────────────────────────────
export default function WorkspaceOverviewPage(props: { params: Promise<{ workspaceId: string }> }) {
  // Next 15+ envuelve params en Promise; en versiones anteriores es objeto.
  // Soportamos ambos con `use()`.
  const params = (props.params as unknown as { workspaceId: string }) instanceof Promise
    ? use(props.params)
    : (props.params as unknown as { workspaceId: string })
  const workspaceId = params.workspaceId
  const ws = useMemo(() => resolveWorkspace(workspaceId), [workspaceId])

  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // KPIs en vivo del backend si hay endpoint disponible
  const { data: kpiData } = useApi<KPISnap>(`/api/workspaces/${workspaceId}/kpis`, { refreshInterval: 60_000 })
  const kpi: KPISnap = (kpiData as KPISnap) || {}

  const [tab, setTab] = useState<'overview' | 'briefings' | 'team'>('overview')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero — acento del workspace */}
        <section style={{
          background: `linear-gradient(135deg,${ws.accent} 0%,${ws.accent2} 100%)`,
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
              textTransform: 'uppercase', margin: '0 0 8px',
            }}>WORKSPACE · {ws.sector.toUpperCase()}</p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
              letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1,
            }}>
              {ws.name} <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' }}>· overview.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.78, margin: 0, lineHeight: 1.5 }}>
              {ws.description}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, opacity: 0.85 }}>
              <span><strong style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>{ws.members}</strong> miembros activos</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>id: <code style={{ fontFamily: 'ui-monospace,monospace', opacity: 0.85 }}>{ws.id}</code></span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Link href="/workspace" style={{
              background: 'rgba(255,255,255,0.18)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.28)', borderRadius: 10,
              padding: '9px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '-0.005em',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
            }}>Abrir War Room →</Link>
            <button style={{
              background: '#fff', color: ws.accent, border: 'none', borderRadius: 10,
              padding: '9px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '-0.005em',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}>Crear issue +</button>
          </div>
        </section>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KPICard label="Alertas activas"        value={kpi.active_alerts ?? 12} accent="#DC2626" sub={`${ISSUES_RECENT.filter(i => i.priority === 'critical').length} críticas`}/>
          <KPICard label="Señales 24h"            value={kpi.new_signals_24h ?? 248} accent="#1F4E8C" sub="+18% vs ayer"/>
          <KPICard label="Índice riesgo"          value={(kpi.risk_index ?? 38) + '/100'} accent="#F97316" sub="amarillo · estable"/>
          <KPICard label="Briefings pendientes"   value={kpi.pending_briefings ?? BRIEFINGS.length} accent="#0F766E" sub={`${BRIEFINGS.filter(b => b.type === 'matinal').length} matinales`}/>
        </div>

        {/* Pestañas pill */}
        <div style={{
          display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
          padding: 4, marginBottom: 18,
        }}>
          {[
            { k: 'overview',  l: 'Overview' },
            { k: 'briefings', l: 'Briefings' },
            { k: 'team',      l: 'Equipo' },
          ].map((o) => {
            const active = tab === o.k
            return (
              <button key={o.k} onClick={() => setTab(o.k as typeof tab)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 16px',
                fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 160ms',
              }}>{o.l}</button>
            )
          })}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
            {/* Issues recientes */}
            <Card title="Issues recientes"
              action={<Link href="/workspace" style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C', textDecoration: 'none' }}>Ver todos →</Link>}
            >
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ISSUES_RECENT.map((iss, i) => (
                  <li key={i} style={{
                    padding: '10px 12px', borderRadius: 10, background: '#FAFAFB',
                    border: '1px solid #f0f0f3', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <PrioChip p={iss.priority}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{iss.title}</div>
                      <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>vence <strong style={{ color: '#3a3a3d' }}>{iss.deadline}</strong></div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Decisiones recientes */}
            <Card title="Decisiones recientes"
              action={<Link href="/workspace" style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C', textDecoration: 'none' }}>Ver log →</Link>}
            >
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DECISIONS_RECENT.map((d, i) => (
                  <li key={i} style={{ borderLeft: `3px solid ${ws.accent}`, paddingLeft: 12 }}>
                    <div style={{
                      fontSize: 10.5, fontFamily: 'ui-monospace,monospace', color: ws.accent,
                      fontWeight: 600, marginBottom: 3,
                    }}>{d.date}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>{d.title}</div>
                    <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 3 }}>por: {d.by}</div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Próximas acciones (full-width abajo) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Card title="Próximas acciones"
                action={<Link href="/workspace" style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C', textDecoration: 'none' }}>Ver todas →</Link>}
              >
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ACTIONS_RECENT.map((a, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #f0f0f3',
                    }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                        color: '#fff', background: ws.accent, padding: '2px 8px', borderRadius: 999,
                      }}>VENCE {a.deadline}</span>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>{a.title}</div>
                      <span style={{ fontSize: 11, color: '#6e6e73' }}>{a.responsible}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === 'briefings' && (
          <Card title={`${BRIEFINGS.length} briefings recientes`}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ECECEF' }}>
                  {['Título', 'Tipo', 'Tamaño', 'Acción'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 3 ? 'right' : 'left', padding: '8px 10px',
                      fontSize: 10, fontWeight: 700, color: '#6e6e73',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BRIEFINGS.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1d1d1f' }}>{b.title}</td>
                    <td style={{ padding: '10px', textTransform: 'capitalize', color: '#6e6e73' }}>{b.type}</td>
                    <td style={{ padding: '10px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>{b.size}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button style={{
                        background: '#1F4E8C', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '6px 14px', fontSize: 11.5, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>Descargar PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === 'team' && (
          <Card title={`${ws.members} miembros activos`}>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 14px' }}>
              Gestión completa del equipo en{' '}
              <Link href="/workspace" style={{ color: '#1F4E8C', fontWeight: 600 }}>War Room → Equipo</Link>.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10,
            }}>
              {[
                { initials: 'AL', name: 'Antonio López', role: 'Senior Analyst' },
                { initials: 'MR', name: 'María Ruiz',    role: 'Senior Analyst' },
                { initials: 'JS', name: 'Javier Sanz',   role: 'Analyst' },
                { initials: 'VG', name: 'Vera Gómez',    role: 'Junior Analyst' },
              ].slice(0, ws.members).map((m) => (
                <div key={m.initials} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #f0f0f3',
                }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `linear-gradient(135deg,${ws.accent} 0%,${ws.accent2} 100%)`,
                    color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  }}>{m.initials}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#6e6e73' }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Workspace · {ws.fullName} · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
