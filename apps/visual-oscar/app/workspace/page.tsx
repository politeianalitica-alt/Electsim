'use client'
/* Workspace · War Room operativo
   Portado de apps/web/app/workspace (Politeia v3) a la estética
   Apple-Newsroom de Visual_Oscar. Mismas pestañas y datos:
   Panorama / Issues / Evidence wall / Acciones / Decisiones / Equipo. */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ── Data demo (idéntica al original de apps/web) ────────────────────────
type TabId = 'panorama' | 'issues' | 'evidence' | 'actions' | 'decisions' | 'team'
const TABS: { id: TabId; label: string }[] = [
  { id: 'panorama',  label: 'Panorama'      },
  { id: 'issues',    label: 'Issues'        },
  { id: 'evidence',  label: 'Evidence wall' },
  { id: 'actions',   label: 'Acciones'      },
  { id: 'decisions', label: 'Decisiones'    },
  { id: 'team',      label: 'Equipo'        },
]

type Priority = 'critical' | 'high' | 'medium' | 'low'

const ISSUES: { title: string; priority: Priority; assignee: string; status: string; deadline: string }[] = [
  { title: 'Ley de vivienda — riesgo bloqueo Junts',  priority: 'critical', assignee: 'MR', status: 'in_progress', deadline: '8 may' },
  { title: 'Crisis comunicacional sondeos PP',         priority: 'high',     assignee: 'AL', status: 'open',        deadline: '6 may' },
  { title: 'Plan reforma fiscal Sumar',                priority: 'medium',   assignee: 'JS', status: 'open',        deadline: '12 may' },
  { title: 'Análisis pacto PP-VOX Galicia',            priority: 'low',      assignee: 'VG', status: 'in_progress', deadline: '15 may' },
]

const ACTIONS: { title: string; priority: Priority; deadline: string; responsible: string }[] = [
  { title: 'Preparar Q&A para entrevista TVE viernes',          priority: 'critical', deadline: '9 may',  responsible: 'Comunicación' },
  { title: 'Reunión interna análisis sondeos territoriales',    priority: 'high',     deadline: '7 may',  responsible: 'Analítica' },
  { title: 'Briefing para socio de coalición',                  priority: 'high',     deadline: '8 may',  responsible: 'Estrategia' },
  { title: 'Revisar marco legal amnistía',                      priority: 'medium',   deadline: '10 may', responsible: 'Legal' },
]

const DECISIONS = [
  { date: '5 may', title: 'No responder al ataque de OK Diario sobre alto cargo', by: 'Comité de comunicación', rationale: 'Amplificaría narrativa rival.' },
  { date: '4 may', title: 'Activar mensaje sobre vivienda con propuestas concretas', by: 'Estrategia', rationale: 'Capturar agenda mediática antes que oposición.' },
  { date: '3 may', title: 'Aplazar reforma fiscal hasta cierre semestre', by: 'Hacienda', rationale: 'Mejor coyuntura macro tras datos IPC.' },
]

const EVIDENCE = [
  { tag: 'Encuesta',     source: 'Sigma Dos · 8 may',       title: 'PP 32,1 % (+0,4) — distancia con PSOE +5,3 pp en intención de voto', risk: 'medium' },
  { tag: 'Prensa',       source: 'OK Diario · 7 may',       title: 'Filtración sobre alto cargo — 56k tweets en 4h', risk: 'high' },
  { tag: 'Parlamento',   source: 'BOCG · 7 may',            title: 'Junts presenta enmiendas de bloqueo a la Ley de Vivienda', risk: 'high' },
  { tag: 'Mercados',     source: 'BME · 6 may cierre',      title: 'IBEX cierra +1,2 % tras dato de inflación favorable', risk: 'low' },
  { tag: 'CCAA',         source: 'Junta Andalucía · 6 may', title: 'Moreno presenta plan presupuestario para 2027', risk: 'low' },
]

const TEAM = [
  { initials: 'AL', name: 'Antonio López', role: 'Senior Analyst', status: 'active',     workload: 4 },
  { initials: 'MR', name: 'María Ruiz',    role: 'Senior Analyst', status: 'active',     workload: 6 },
  { initials: 'JS', name: 'Javier Sanz',   role: 'Analyst',        status: 'in_meeting', workload: 3 },
  { initials: 'VG', name: 'Vera Gómez',    role: 'Junior Analyst', status: 'active',     workload: 2 },
]

// ── Helpers visuales ────────────────────────────────────────────────────
const PRIO_META: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: 'CRÍTICA', color: '#7F1D1D', bg: 'rgba(127,29,29,0.10)' },
  high:     { label: 'ALTA',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  medium:   { label: 'MEDIA',   color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
  low:      { label: 'BAJA',    color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
}
function PrioChip({ p }: { p: Priority }) {
  const m = PRIO_META[p]
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
      color: '#fff', background: m.color, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  )
}
function Avatar({ initials, size = 22 }: { initials: string; size?: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)', color: '#fff',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.42,
      letterSpacing: '0.02em', flexShrink: 0,
    }}>{initials}</span>
  )
}

// ── KPI card (consistente con Panel Ejecutivo) ──────────────────────────
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

// ── TabBar pill (consistente con Geopolítica / Panel Ejecutivo) ─────────
function TabBar({ items, active, onChange }: { items: typeof TABS; active: TabId; onChange: (i: TabId) => void }) {
  return (
    <div style={{
      display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
      padding: 4, marginBottom: 18, overflowX: 'auto', maxWidth: '100%',
    }}>
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            border: 'none',
            background: active === t.id ? '#fff' : 'transparent',
            color: active === t.id ? '#1d1d1f' : '#6e6e73',
            padding: '7px 16px', borderRadius: 999,
            fontSize: 12.5, fontWeight: active === t.id ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: active === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 160ms',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Card primitive ──────────────────────────────────────────────────────
function Card({ title, children, padded = true }: { title?: string; children: React.ReactNode; padded?: boolean }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
      padding: padded ? '20px 22px' : 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {title && (
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d',
          margin: '0 0 14px',
        }}>{title}</h2>
      )}
      {children}
    </section>
  )
}

// ─── Página principal ───────────────────────────────────────────────────
export default function WorkspacePage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<TabId>('panorama')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg,#0F2A4F 0%,#020617 100%)',
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
              textTransform: 'uppercase', margin: '0 0 8px',
            }}>WAR ROOM OPERATIVO · CENTRO DE OPERACIONES</p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
              letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1,
            }}>
              Workspace <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' }}>España 2026.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
              Centro operativo del equipo · {ISSUES.length} issues abiertos · {ACTIONS.length} acciones pendientes · {TEAM.length} miembros activos.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{
              background: '#fff', color: '#0F2A4F', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: 12.5, fontWeight: 700,
              letterSpacing: '-0.005em', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
              </svg>
              Crear issue
            </button>
          </div>
        </section>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KPICard label="Issues abiertos"        value={ISSUES.length}    accent="#F97316" sub="2 críticos · vence esta semana"/>
          <KPICard label="Acciones pendientes"    value={ACTIONS.length}   accent="#1F4E8C" sub="2 alta prioridad"/>
          <KPICard label="Decisiones esta semana" value={DECISIONS.length} accent="#7C3AED" sub="registradas en log"/>
          <KPICard label="Miembros activos"       value={TEAM.length}      accent="#0F766E" sub="1 en reunión ahora"/>
        </div>

        <TabBar items={TABS} active={tab} onChange={setTab}/>

        {/* TAB · Panorama (issues + acciones lado a lado) */}
        {tab === 'panorama' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            <Card title="Issues prioritarios">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ISSUES.map((iss, i) => (
                  <li key={i} style={{
                    padding: '10px 12px', borderRadius: 10, background: '#FAFAFB',
                    border: '1px solid #f0f0f3', cursor: 'pointer', transition: 'background 140ms',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>{iss.title}</span>
                      <PrioChip p={iss.priority}/>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6e6e73' }}>
                      <Avatar initials={iss.assignee} size={20}/>
                      <span>{iss.status === 'in_progress' ? 'En curso' : 'Abierto'}</span>
                      <span>·</span>
                      <span>vence <strong style={{ color: '#3a3a3d' }}>{iss.deadline}</strong></span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Próximas acciones">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACTIONS.map((a, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10, background: '#FAFAFB',
                    border: '1px solid #f0f0f3', cursor: 'pointer',
                  }}>
                    <PrioChip p={a.priority}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 3 }}>
                        {a.responsible} · vence <strong style={{ color: '#3a3a3d' }}>{a.deadline}</strong>
                      </div>
                    </div>
                    <button style={{
                      background: 'transparent', border: 'none', color: '#1F4E8C',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      padding: 0, flexShrink: 0,
                    }}>Completar →</button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* TAB · Issues (tabla más densa) */}
        {tab === 'issues' && (
          <Card title={`${ISSUES.length} issues abiertos`}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ECECEF' }}>
                  {['Título', 'Prioridad', 'Asignado', 'Estado', 'Vence'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 10px',
                      fontSize: 10, fontWeight: 700, color: '#6e6e73',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ISSUES.map((iss, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1d1d1f' }}>{iss.title}</td>
                    <td style={{ padding: '10px' }}><PrioChip p={iss.priority}/></td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Avatar initials={iss.assignee} size={20}/>
                        {iss.assignee}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#6e6e73' }}>{iss.status === 'in_progress' ? 'En curso' : 'Abierto'}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{iss.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* TAB · Evidence wall (lista de evidencias) */}
        {tab === 'evidence' && (
          <Card title={`${EVIDENCE.length} evidencias en el muro`}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVIDENCE.map((e, i) => {
                const m = e.risk === 'high' ? PRIO_META.high : e.risk === 'medium' ? PRIO_META.medium : PRIO_META.low
                return (
                  <li key={i} style={{
                    display: 'grid', gridTemplateColumns: '90px 1fr auto',
                    gap: 12, alignItems: 'center', padding: '10px 14px',
                    background: m.bg, border: `1px solid ${m.color}33`, borderRadius: 12,
                  }}>
                    <span style={{
                      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                      color: '#fff', background: m.color, padding: '2px 8px', borderRadius: 999,
                      textAlign: 'center', textTransform: 'uppercase',
                    }}>{e.tag}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{e.title}</div>
                      <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>{e.source}</div>
                    </div>
                    <button style={{
                      background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#3a3a3d',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Vincular →</button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {/* TAB · Acciones (similar al panorama pero exclusiva) */}
        {tab === 'actions' && (
          <Card title={`${ACTIONS.length} acciones pendientes`}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACTIONS.map((a, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, background: '#FAFAFB',
                  border: '1px solid #f0f0f3',
                }}>
                  <PrioChip p={a.priority}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 3 }}>
                      Responsable: <strong style={{ color: '#3a3a3d' }}>{a.responsible}</strong> · vence {a.deadline}
                    </div>
                  </div>
                  <button style={{
                    background: '#1F4E8C', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 14px', fontSize: 11.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Completar</button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* TAB · Decisiones (decision log) */}
        {tab === 'decisions' && (
          <Card title="Decision log">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DECISIONS.map((d, i) => (
                <li key={i} style={{
                  borderLeft: '3px solid #1F4E8C', paddingLeft: 16, paddingBottom: 4,
                }}>
                  <div style={{
                    fontSize: 10.5, fontFamily: 'ui-monospace,monospace', color: '#1F4E8C',
                    fontWeight: 600, marginBottom: 4,
                  }}>{d.date}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
                    letterSpacing: '-0.014em', margin: '0 0 4px', color: '#1d1d1f',
                  }}>{d.title}</h3>
                  <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 5 }}>
                    Decidido por: <strong style={{ color: '#3a3a3d' }}>{d.by}</strong>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: 0, lineHeight: 1.5 }}>{d.rationale}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* TAB · Equipo */}
        {tab === 'team' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {TEAM.map((m) => (
              <div key={m.initials} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <Avatar initials={m.initials} size={44}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                    letterSpacing: '-0.012em', color: '#1d1d1f',
                  }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#6e6e73' }}>{m.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: m.status === 'active' ? '#16A34A' : '#F97316',
                    }}/>
                    <span style={{ fontSize: 10, color: '#6e6e73' }}>
                      {m.status === 'active' ? 'Activo' : 'En reunión'}
                    </span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' }}>{m.workload} tareas</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        War Room · Workspace España 2026 · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
