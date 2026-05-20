'use client'
import './crisis.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCrisis } from '@/hooks/useCrisis'
import type { Severidad, Fase, TipoCrisis, StakePos } from '@/data/crisis-fixture'

// ─────────────────────────────────────────────────────────────────────────
// UI maps (colores / metadatos visuales)
// ─────────────────────────────────────────────────────────────────────────
const SEV_META: Record<Severidad, { color: string }> = {
  'CRÍTICA': { color:'#DC2626' },
  'ALTA':    { color:'#F97316' },
  'MEDIA':   { color:'#EAB308' },
  'BAJA':    { color:'#0EA5E9' },
}

const TIPO_META: Record<TipoCrisis, { color: string }> = {
  'Política':    { color:'#1F4E8C' },
  'Económica':   { color:'#16A34A' },
  'Sanitaria':   { color:'#0EA5E9' },
  'Mediática':   { color:'#7C3AED' },
  'Tecnológica': { color:'#5B21B6' },
  'Climática':   { color:'#0F766E' },
  'Diplomática': { color:'#B45309' },
  'Social':      { color:'#DC2626' },
  'Energética':  { color:'#F97316' },
  'Migratoria':  { color:'#9333EA' },
}

const FASE_META: Record<Fase, { color: string; pct: number }> = {
  'Detección':   { color:'#0EA5E9', pct: 15 },
  'Activa':      { color:'#DC2626', pct: 40 },
  'Contención':  { color:'#F97316', pct: 65 },
  'Resolución':  { color:'#16A34A', pct: 85 },
  'Cerrada':     { color:'#525258', pct: 100 },
}

const POS_COLOR: Record<StakePos, string> = {
  'aliado':   '#16A34A',
  'neutral':  '#6e6e73',
  'opositor': '#DC2626',
}

const IMP_COLOR = { 'positivo':'#16A34A', 'neutral':'#6e6e73', 'negativo':'#DC2626' } as const
const ACC_META = { 'Pendiente': '#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' } as const


// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function CrisisPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { crisis: CRISIS, playbooks: PLAYBOOKS } = useCrisis()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'timeline' | 'stakeholders' | 'acciones' | 'metricas' | 'playbook'>('timeline')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')

  useEffect(() => {
    if (!selectedId && CRISIS.length > 0) setSelectedId(CRISIS[0].id)
  }, [selectedId, CRISIS])

  const selected = useMemo(
    () => CRISIS.find(c => c.id === selectedId) ?? CRISIS[0],
    [CRISIS, selectedId],
  )

  const totals = useMemo(() => {
    const cri = CRISIS.filter(c => c.severidad === 'CRÍTICA').length
    const alt = CRISIS.filter(c => c.severidad === 'ALTA').length
    const activas = CRISIS.filter(c => c.fase === 'Activa' || c.fase === 'Detección' || c.fase === 'Contención').length
    const accionesAbiertas = CRISIS.reduce((s, c) => s + c.acciones.filter(a => a.estado !== 'Completada').length, 0)
    return { total: CRISIS.length, cri, alt, activas, accionesAbiertas }
  }, [CRISIS])

  const visibles = useMemo(() => CRISIS.filter(c => filterSev === 'Todas' || c.severidad === filterSev), [CRISIS, filterSev])

  if (!selected) {
    return (
      <div className="cr-root">
        <AppHeader/>
        <main className="cr-main">
          <p className="cr-loading">Cargando crisis…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="cr-root">
      <AppHeader/>
      <main className="cr-main">

        {/* Cross-reference to the structural risk engine */}
        <RiskContextStrip/>

        {/* ───── Hero ───── */}
        <section className="cr-hero">
          {/* Pulso decorativo */}
          <div className="cr-hero-pulse"/>
          <div className="cr-hero-body">
            <p className="cr-hero-eyebrow">
              <span className="cr-hero-eyebrow-dot">●</span> RIESGO · CRISIS INTELLIGENCE EN TIEMPO REAL
            </p>
            <h1 className="cr-hero-title">
              {totals.activas} crisis activas <em>requieren atención</em>
            </h1>
            <p className="cr-hero-sub">
              {totals.cri} {totals.cri === 1 ? 'crítica' : 'críticas'} · {totals.alt} {totals.alt === 1 ? 'alta' : 'altas'} · {totals.accionesAbiertas} acciones abiertas pendientes de ejecución.
              Monitorización 24/7 con alertas automáticas, gestión de stakeholders y playbooks por tipo de crisis.
            </p>
          </div>
          <div className="cr-hero-kpis">
            <HeroKPI label="Crisis"     value={String(totals.total)} accent="#FCA5A5"/>
            <HeroKPI label="Críticas"   value={String(totals.cri)}   accent="#DC2626"/>
            <HeroKPI label="Activas"    value={String(totals.activas)} accent="#F97316"/>
            <HeroKPI label="Acciones"   value={String(totals.accionesAbiertas)} accent="#EAB308"/>
          </div>
        </section>

        {/* ───── Filtro y selector de crisis (cards) ───── */}
        <div className="cr-filter-bar">
          <span className="cr-filter-label">Severidad:</span>
          <div className="cr-segment">
            {(['Todas','CRÍTICA','ALTA','MEDIA','BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
                <button
                  key={s}
                  onClick={() => setFilterSev(s)}
                  className={`cr-segment-btn${active ? ' is-active' : ''}`}
                  style={active ? { color: col } : undefined}
                >{s}</button>
              )
            })}
          </div>
          <span className="cr-filter-count">{visibles.length} crisis visibles</span>
        </div>

        <section className="cr-grid">
          {visibles.map(c => {
            const sev = SEV_META[c.severidad]
            const tm = TIPO_META[c.tipo]
            const fm = FASE_META[c.fase]
            const active = c.id === selectedId
            const sentColor = c.metricas.sentimiento >= 0 ? '#16A34A' : c.metricas.sentimiento >= -0.2 ? '#F97316' : '#DC2626'
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="cr-card"
                style={{
                  border: `1px solid ${active ? sev.color : '#ECECEF'}`,
                  boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft: `4px solid ${sev.color}`,
                }}
              >
                <header className="cr-card-header">
                  <div className="cr-card-chips">
                    <span className="cr-chip-sev" style={{ background: sev.color }}>● {c.severidad}</span>
                    <span
                      className="cr-chip-tipo"
                      style={{ background:`${tm.color}15`, color:tm.color, border:`1px solid ${tm.color}40` }}
                    >{c.tipo.toUpperCase()}</span>
                    <span
                      className="cr-chip-fase"
                      style={{ background:`${fm.color}15`, color:fm.color, border:`1px solid ${fm.color}40` }}
                    >{c.fase.toUpperCase()}</span>
                  </div>
                  <h3 className="cr-card-title">{c.titulo}</h3>
                  <div className="cr-card-loc">{c.ubicacion}</div>
                </header>
                <div className="cr-card-body">
                  <p className="cr-card-summary">{c.resumen}</p>
                  <div className="cr-card-minis">
                    <Mini label="Impacto" value={`${c.metricas.impactoMediatico}`} sub="/100" color={sev.color}/>
                    <Mini label="Sent." value={`${c.metricas.sentimiento >= 0 ? '+' : ''}${c.metricas.sentimiento.toFixed(2)}`} sub="" color={sentColor}/>
                    <Mini label="Spike" value={`+${c.metricas.spike}%`} sub="24h" color="#5B21B6"/>
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
        <section
          className="cr-detail"
          style={{ borderLeft: `5px solid ${SEV_META[selected.severidad].color}` }}
        >
          <div className="cr-detail-row">
            <div className="cr-detail-main">
              <div className="cr-detail-chips">
                <span className="cr-detail-chip-sev" style={{ background: SEV_META[selected.severidad].color }}>● {selected.severidad}</span>
                <span
                  className="cr-detail-chip-tipo"
                  style={{ background:`${TIPO_META[selected.tipo].color}15`, color:TIPO_META[selected.tipo].color, border:`1px solid ${TIPO_META[selected.tipo].color}40` }}
                >{selected.tipo.toUpperCase()}</span>
                <span className="cr-detail-meta">· INICIO: {selected.inicio}</span>
                <span className="cr-detail-meta">· ÚLT: {selected.actualizacion}</span>
              </div>
              <h2 className="cr-detail-title">{selected.titulo}</h2>
              <p className="cr-detail-loc">{selected.ubicacion}</p>
              <p className="cr-detail-summary">{selected.resumen}</p>
            </div>
            <div className="cr-detail-kpis">
              <CardKPI label="Impacto" value={`${selected.metricas.impactoMediatico}`} sub="/100" color={SEV_META[selected.severidad].color}/>
              <CardKPI label="Sentim." value={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} sub="-1..+1" color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
              <CardKPI label="Audien." value={selected.metricas.audienciaPotencial} sub="potencial" color="#5B21B6"/>
              <CardKPI label="Mencs." value={`${selected.metricas.menciones24h}K`} sub="24 h" color="#0EA5E9"/>
            </div>
          </div>
          {/* Barra de progreso de fase */}
          <div className="cr-phase-wrap">
            <div className="cr-phase-labels">
              <span>Fase: <span style={{ color: FASE_META[selected.fase].color }}>{selected.fase}</span></span>
              <span>{FASE_META[selected.fase].pct}% del ciclo</span>
            </div>
            <div className="cr-phase-bar">
              {(['Detección','Activa','Contención','Resolución','Cerrada'] as Fase[]).map(f => {
                const isPast = FASE_META[f].pct <= FASE_META[selected.fase].pct
                return (
                  <div
                    key={f}
                    className={`cr-phase-seg${f !== 'Cerrada' ? ' cr-phase-seg-divider' : ''}`}
                    style={{ background: isPast ? FASE_META[selected.fase].color : 'transparent' }}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="cr-tabs">
          {([
            { k:'timeline',     label:'Timeline',         count: selected.hitos.length },
            { k:'stakeholders', label:'Stakeholders',     count: selected.stakeholders.length },
            { k:'acciones',     label:'Plan de acción',   count: selected.acciones.length },
            { k:'metricas',     label:'Métricas y riesgos', count: selected.riesgos.length },
            { k:'playbook',     label:'Playbook',         count: PLAYBOOKS.find(p => p.tipo === selected.tipo) ? 1 : 0 },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`cr-tab-btn${active ? ' is-active' : ''}`}
              >
                {t.label}{' '}
                <span
                  className="cr-tab-count"
                  style={active ? { color: SEV_META[selected.severidad].color } : undefined}
                >{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Timeline ───── */}
        {tab === 'timeline' && (
          <section className="cr-panel">
            <div className="cr-timeline">
              <div className="cr-timeline-rail"/>
              {[...selected.hitos].reverse().map((h, i) => (
                <div
                  key={i}
                  className={`cr-timeline-row${i === 0 ? ' is-first' : ''}`}
                >
                  <div className="cr-timeline-date">
                    <div className="cr-timeline-fecha">{h.fecha.slice(0,5)}</div>
                    <div className="cr-timeline-hora">{h.hora}</div>
                  </div>
                  <div className="cr-timeline-dot-wrap">
                    <div
                      className="cr-timeline-dot"
                      style={{
                        border: `3px solid ${IMP_COLOR[h.impacto]}`,
                        boxShadow: `0 0 0 3px ${IMP_COLOR[h.impacto]}22`,
                      }}
                    />
                  </div>
                  <div className="cr-timeline-evento">
                    <p>{h.evento}</p>
                    <div className="cr-timeline-fuente">· {h.fuente}</div>
                  </div>
                  <span
                    className="cr-timeline-impacto"
                    style={{ background:`${IMP_COLOR[h.impacto]}15`, color:IMP_COLOR[h.impacto], border:`1px solid ${IMP_COLOR[h.impacto]}40` }}
                  >{h.impacto.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── TAB · Stakeholders ───── */}
        {tab === 'stakeholders' && (
          <section className="cr-stake-grid">
            {selected.stakeholders.map((s, i) => (
              <article
                key={i}
                className="cr-stake-card"
                style={{ borderLeft: `3px solid ${POS_COLOR[s.posicion]}` }}
              >
                <div
                  className="cr-stake-avatar"
                  style={{ background: POS_COLOR[s.posicion] }}
                >{s.nombre.split(/[\s·]+/).filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase()}</div>
                <div className="cr-stake-body">
                  <div className="cr-stake-name">{s.nombre}</div>
                  <div className="cr-stake-rol">{s.rol}</div>
                  <div className="cr-stake-pos-wrap">
                    <span
                      className="cr-stake-pos"
                      style={{ background:`${POS_COLOR[s.posicion]}15`, color:POS_COLOR[s.posicion], border:`1px solid ${POS_COLOR[s.posicion]}40` }}
                    >{s.posicion.toUpperCase()}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Plan de acción ───── */}
        {tab === 'acciones' && (
          <section className="cr-actions">
            <div className="cr-actions-scroll">
              <table className="cr-actions-table">
                <thead>
                  <tr>
                    {['Acción','Responsable','Plazo','Estado'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.acciones.map((a, i) => (
                    <tr key={i} className={i % 2 ? 'is-zebra' : undefined}>
                      <td className="cr-actions-accion">{a.accion}</td>
                      <td>{a.responsable}</td>
                      <td className="cr-actions-plazo">{a.plazo}</td>
                      <td>
                        <span
                          className="cr-actions-estado"
                          style={{ background:`${ACC_META[a.estado]}15`, color:ACC_META[a.estado], border:`1px solid ${ACC_META[a.estado]}40` }}
                        >
                          {a.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Métricas y riesgos ───── */}
        {tab === 'metricas' && (
          <section className="cr-metrics-grid">
            <div className="cr-metric-panel">
              <h3 className="cr-metric-title">Métricas mediáticas</h3>
              <div className="cr-metric-list">
                <Metric label="Impacto mediático"      value={selected.metricas.impactoMediatico} max={100} unit="/100" color={SEV_META[selected.severidad].color}/>
                <Metric label="Sentimiento (−1..+1)"   value={Math.round((selected.metricas.sentimiento + 1) * 50)} max={100} unit={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
                <Metric label="Spike de menciones 24h" value={Math.min(100, selected.metricas.spike)} max={100} unit={`+${selected.metricas.spike}%`} color="#5B21B6"/>
                <div className="cr-metric-extra">
                  <Mini label="Audien. potencial" value={selected.metricas.audienciaPotencial}        sub="alcance" color="#5B21B6"/>
                  <Mini label="Menciones 24h"     value={`${selected.metricas.menciones24h}K`}        sub="vol. total" color="#0EA5E9"/>
                </div>
              </div>
            </div>
            <div className="cr-metric-panel">
              <h3 className="cr-metric-title is-danger">Riesgos identificados</h3>
              <div className="cr-risk-list">
                {selected.riesgos.map(r => (
                  <div key={r} className="cr-risk-item">
                    <span className="cr-risk-bang">!</span>
                    <span className="cr-risk-text">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB · Playbook ───── */}
        {tab === 'playbook' && (() => {
          const pb = PLAYBOOKS.find(p => p.tipo === selected.tipo)
          if (!pb) return (
            <section className="cr-playbook-empty">
              No hay playbook específico para crisis de tipo <strong>{selected.tipo}</strong>.
            </section>
          )
          const tm = TIPO_META[pb.tipo]
          return (
            <section className="cr-playbook">
              <div className="cr-playbook-head">
                <span className="cr-playbook-marker" style={{ background: tm.color }}/>
                <h3 className="cr-playbook-name">{pb.nombre}</h3>
              </div>
              <p className="cr-playbook-desc">{pb.descripcion}</p>
              <div className="cr-playbook-steps">
                {pb.pasos.map((p, i) => (
                  <div key={i} className="cr-playbook-step">
                    <div
                      className="cr-playbook-step-num"
                      style={{ background: tm.color }}
                    >{i+1}</div>
                    <span className="cr-playbook-step-text">{p}</span>
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

        {/* ───── Biblioteca de playbooks ───── */}
        <section className="cr-library">
          <div className="cr-library-head">
            <h2 className="cr-library-title">
              Biblioteca de playbooks · protocolos por tipo de crisis
            </h2>
            <span className="cr-library-count">{PLAYBOOKS.length} playbooks</span>
          </div>
          <div className="cr-library-grid">
            {PLAYBOOKS.map(pb => {
              const tm = TIPO_META[pb.tipo]
              return (
                <article
                  key={pb.id}
                  className="cr-library-card"
                  style={{ borderLeft: `3px solid ${tm.color}` }}
                >
                  <div className="cr-library-chips">
                    <span className="cr-library-chip" style={{ background: tm.color }}>{pb.tipo.toUpperCase()}</span>
                  </div>
                  <h4 className="cr-library-name">{pb.nombre}</h4>
                  <p className="cr-library-desc">{pb.descripcion}</p>
                  <div className="cr-library-meta">
                    <strong>{pb.pasos.length}</strong> pasos protocolizados
                  </div>
                </article>
              )
            })}
          </div>
        </section>

      </main>
      <footer className="cr-footer">
        Crisis Intelligence · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div className="cr-hero-kpi" style={{ border: `1px solid ${accent}55` }}>
      <div className="cr-hero-kpi-value">{value}</div>
      <div className="cr-hero-kpi-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="cr-card-kpi">
      <div className="cr-card-kpi-value" style={{ color }}>{value}</div>
      <div className="cr-card-kpi-label">{label}</div>
      {sub && <div className="cr-card-kpi-sub">{sub}</div>}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="cr-mini">
      <div className="cr-mini-value" style={{ color }}>{value}{sub && <span className="cr-mini-sub">{sub}</span>}</div>
      <div className="cr-mini-label">{label}</div>
    </div>
  )
}

function RiskContextStrip() {
  const [indices, setIndices] = useState<Array<{ index_id: string; display_name: string; icon: string; score: number; label: string; colors: { low: string; medium: string; high: string; critical: string } }>>([])
  const [alerts, setAlerts] = useState<number>(0)
  useEffect(() => {
    Promise.all([
      fetch('/api/risk-v2/indices?country=ES').then(r => r.json()).catch(() => null),
      fetch('/api/risk-v2/alerts?country=ES&days=7').then(r => r.json()).catch(() => null),
    ]).then(([iR, aR]) => {
      if (iR?.indices) setIndices(iR.indices)
      if (aR?.n_active != null) setAlerts(aR.n_active)
    })
  }, [])
  if (indices.length === 0) return null
  const colorFor = (label: string, c: { low: string; medium: string; high: string; critical: string }) => {
    if (label === 'BAJO') return c.low
    if (label === 'MEDIO') return c.medium
    if (label === 'ALTO') return c.high
    return c.critical
  }
  return (
    <section className="cr-risk-strip">
      <div className="cr-risk-strip-label">
         Contexto · Riesgo estructural
      </div>
      <div className="cr-risk-strip-indices">
        {indices.map(idx => (
          <span
            key={idx.index_id}
            className="cr-risk-strip-index"
            style={{ background: colorFor(idx.label, idx.colors) }}
          >
            {idx.icon} {idx.display_name.replace('Riesgo ','').replace('Estabilidad ','Est. ')} {idx.score}
          </span>
        ))}
      </div>
      {alerts > 0 && (
        <span className="cr-risk-strip-alerts">
           {alerts} alertas estructurales activas
        </span>
      )}
      <Link href="/riesgo" className="cr-risk-strip-link">Ver termómetro completo →</Link>
    </section>
  )
}

function Metric({ label, value, max, unit, color }: { label:string, value:number, max:number, unit:string, color:string }) {
  const pct = (value / max) * 100
  return (
    <div>
      <div className="cr-metric-row-head">
        <span className="cr-metric-row-label">{label}</span>
        <span className="cr-metric-row-value" style={{ color }}>{unit}</span>
      </div>
      <div className="cr-metric-row-track">
        <div className="cr-metric-row-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  )
}
