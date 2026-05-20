'use client'
import './fondos-europeos.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useFondosEuropeos } from '@/hooks/useFondosEuropeos'

// ─────────────────────────────────────────────────────────────────────────
// UI maps · se quedan en la página (color/estado/match son decisiones de UI)
// ─────────────────────────────────────────────────────────────────────────
const FASE_COLOR: Record<string, string> = { 'Activo':'#16A34A', 'En despliegue':'#F97316', 'Cerrado':'#6e6e73' }
const ESTADO_HITO: Record<string, string> = { 'Pendiente':'#F97316', 'Completado':'#16A34A', 'En revisión':'#5B21B6' }
const TIPO_HITO_COLOR: Record<string, string> = {
  'Desembolso':'#16A34A', 'Solicitud':'#5B21B6', 'Evaluación':'#F97316',
  'Hito':'#0EA5E9', 'Inversión':'#1F4E8C', 'Reforma':'#DC2626',
}
const MATCH_COLOR: Record<string, string> = { 'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9' }

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function FondosEuropeosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const {
    componentes: COMPONENTES,
    pertes: PERTES,
    convocatorias: CONVOCATORIAS,
    hitos: HITOS,
    beneficiarios: BENEFICIARIOS,
    mfpFondos: MFP_FONDOS,
    prtrTotals,
  } = useFondosEuropeos()

  const PRTR_TOTAL_ASIG = prtrTotals.total_asignado
  const PRTR_TOTAL_EJEC = prtrTotals.total_ejecutado
  const PRTR_TRANSF = prtrTotals.transferido
  const PRTR_HITOS_T = prtrTotals.hitos_total
  const PRTR_HITOS_C = prtrTotals.hitos_cumplidos

  const [tab, setTab] = useState<'prtr' | 'pertes' | 'mfp' | 'convocatorias' | 'hitos' | 'beneficiarios'>('prtr')

  const totals = useMemo(() => {
    const totalAsig = COMPONENTES.reduce((s, c) => s + c.asignado, 0)
    const totalEjec = COMPONENTES.reduce((s, c) => s + c.ejecutado, 0)
    const proxCierre = CONVOCATORIAS.filter(c => c.diasRestantes <= 30).length
    const totalAsigPertes = PERTES.reduce((s, p) => s + p.asignado, 0)
    const totalEjecPertes = PERTES.reduce((s, p) => s + p.ejecutado, 0)
    return { totalAsig, totalEjec, proxCierre, totalAsigPertes, totalEjecPertes }
  }, [COMPONENTES, CONVOCATORIAS, PERTES])

  const ejecPct = PRTR_TOTAL_ASIG > 0 ? Math.round((PRTR_TOTAL_EJEC / PRTR_TOTAL_ASIG) * 100) : 0
  const transfPct = PRTR_TOTAL_ASIG > 0 ? Math.round((PRTR_TRANSF / PRTR_TOTAL_ASIG) * 100) : 0
  const hitosPct = PRTR_HITOS_T > 0 ? Math.round((PRTR_HITOS_C / PRTR_HITOS_T) * 100) : 0

  return (
    <div className="fe-root">
      <AppHeader/>
      <main className="fe-main">

        {/* ───── Hero ───── */}
        <section className="fe-hero">
          {/* Estrellas UE decorativas */}
          <div className="fe-hero-stars">
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div
                key={deg}
                className="fe-hero-star"
                style={{
                  transform: `translate(${Math.cos(deg * Math.PI / 180) * 60 - 7}px, ${Math.sin(deg * Math.PI / 180) * 60 - 7}px)`,
                }}
              />
            ))}
          </div>
          <div>
            <p className="fe-hero-eyebrow">
              LICITACIONES Y CONTRATACIÓN PÚBLICA · FONDOS EUROPEOS Y PRTR
            </p>
            <h1 className="fe-hero-title">
              España · {(PRTR_TOTAL_ASIG/1000).toFixed(0)} mil M€ <em>del Plan de Recuperación</em>
            </h1>
            <p className="fe-hero-sub">
              {ejecPct}% recibido por España ({(PRTR_TOTAL_EJEC/1000).toFixed(0)} mil M€) · {transfPct}% transferido a beneficiarios · {hitosPct}% de hitos CID cumplidos. Seguimiento integrado de PRTR (NextGen) y MFP 2021-2027.
            </p>
          </div>
          <div className="fe-hero-kpis">
            <HeroKPI label="PRTR total"   value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}B€`} accent="#FFCC00"/>
            <HeroKPI label="Recibido"      value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}B€`} accent="#86EFAC"/>
            <HeroKPI label="Transferido"   value={`${(PRTR_TRANSF/1000).toFixed(0)}B€`}     accent="#FCD34D"/>
            <HeroKPI label="Hitos cumpl."  value={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`}          accent="#7DD3FC"/>
          </div>
        </section>

        {/* ───── Snapshot · KPIs financieros ───── */}
        <section className="fe-section">
          <SectionHeader label="Snapshot Plan de Recuperación · cierre Q1-2026" count="MRR · NextGenerationEU" accent="#003399"/>
          <div className="fe-kpi-grid">
            <SKpi label="∑ Asignado España"      value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}.0`} sub="mil M€" color="#003399"/>
            <SKpi label="Recibido del MRR"       value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}.0`} sub="mil M€" delta={`${ejecPct}% · 5 desembolsos`} pos color="#16A34A"/>
            <SKpi label="Transferido benefic."   value={`${(PRTR_TRANSF/1000).toFixed(1)}`}        sub="mil M€" delta={`${transfPct}% comprometido`} pos color="#0F766E"/>
            <SKpi label="Pendiente de recibir"   value={`${((PRTR_TOTAL_ASIG - PRTR_TOTAL_EJEC)/1000).toFixed(0)}.0`} sub="mil M€" color="#F97316"/>
            <SKpi label="Hitos CID cumplidos"    value={`${hitosPct}%`} sub={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`} pos color="#5B21B6"/>
            <SKpi label="Componentes seguidos"   value={String(COMPONENTES.length)} sub="de 30 totales" color="#7C3AED"/>
            <SKpi label="PERTEs estratégicos"    value={String(PERTES.length)}      sub="proyectos"     color="#DC2626"/>
            <SKpi label="Convocatorias abiertas" value={String(CONVOCATORIAS.length)} sub={`${totals.proxCierre} cierran 30d`} color="#EAB308"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="fe-tabs">
          {([
            { k:'prtr',         label:'PRTR · Componentes',     count: COMPONENTES.length },
            { k:'pertes',       label:'PERTEs estratégicos',    count: PERTES.length },
            { k:'mfp',          label:'MFP 2021-2027',          count: MFP_FONDOS.length },
            { k:'convocatorias',label:'Convocatorias abiertas', count: CONVOCATORIAS.length },
            { k:'hitos',        label:'Hitos UE y desembolsos', count: HITOS.length },
            { k:'beneficiarios',label:'Beneficiarios',           count: BENEFICIARIOS.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`fe-tab${active ? ' fe-tab--active' : ''}`}
              >
                {t.label} <span className="fe-tab-count">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · PRTR Componentes ───── */}
        {tab === 'prtr' && (
          <section className="fe-panel">
            <div className="fe-table-scroll">
              <table className="fe-table fe-table--prtr">
                <thead>
                  <tr className="fe-thead-row">
                    {['#','Área','Componente','Ministerio','Asignado','Ejecutado','% Ejec.','Hitos CID'].map(h => (
                      <th key={h} className="fe-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPONENTES.map((c, i) => {
                    const pctEj = (c.ejecutado / c.asignado) * 100
                    const pctHi = (c.hitosCumplidos / c.hitos) * 100
                    const hitosColor = pctHi >= 80 ? '#16A34A' : pctHi >= 60 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={c.id} className={`fe-tr ${i%2 ? 'fe-tr--even' : 'fe-tr--odd'}`}>
                        <td className="fe-td fe-td-num">{i+1}</td>
                        <td className="fe-td">
                          <span
                            className="fe-chip"
                            style={{ background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}40` }}
                          >{c.area}</span>
                        </td>
                        <td className="fe-td fe-td-name">{c.nombre}</td>
                        <td className="fe-td fe-td-min">{c.ministerio}</td>
                        <td className="fe-td fe-td-money" style={{ color: c.color }}>{c.asignado.toLocaleString('es-ES')}M€</td>
                        <td className="fe-td fe-td-exec">{c.ejecutado.toLocaleString('es-ES')}M€</td>
                        <td className="fe-td">
                          <div className="fe-progress-row">
                            <div className="fe-progress">
                              <div className="fe-progress-fill" style={{ width:`${pctEj}%`, background:c.color }}/>
                            </div>
                            <span className="fe-progress-pct" style={{ color: c.color }}>{pctEj.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="fe-td">
                          <span className="fe-hitos-cell" style={{ color: hitosColor }}>
                            {c.hitosCumplidos}/{c.hitos} <span className="fe-hitos-pct">· {pctHi.toFixed(0)}%</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · PERTEs ───── */}
        {tab === 'pertes' && (
          <section className="fe-pertes-grid">
            {[...PERTES].sort((a,b) => b.asignado - a.asignado).map(p => {
              const pctEj = (p.ejecutado / p.asignado) * 100
              const faseColor = FASE_COLOR[p.fase]
              return (
                <article key={p.id} className="fe-perte-card" style={{ borderLeft:`3px solid ${p.color}` }}>
                  <div className="fe-perte-head">
                    <span
                      className="fe-chip fe-chip--pill"
                      style={{ background:`${faseColor}15`, color:faseColor, border:`1px solid ${faseColor}40` }}
                    >{p.fase.toUpperCase()}</span>
                    <span className="fe-perte-min">{p.ministerio}</span>
                  </div>
                  <h3 className="fe-perte-title">{p.nombre}</h3>
                  <div className="fe-perte-exec-row">
                    <span className="fe-perte-exec-label">Ejecución</span>
                    <span className="fe-perte-exec-value" style={{ color: p.color }}>
                      {p.ejecutado.toLocaleString('es-ES')}M€ <span className="fe-perte-exec-value-sub">/ {p.asignado.toLocaleString('es-ES')}M€ · {pctEj.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="fe-perte-progress">
                    <div className="fe-progress-fill" style={{ width:`${pctEj}%`, background:p.color }}/>
                  </div>
                  <div className="fe-perte-mini-row">
                    <Mini label="Empresas" value={String(p.empresas)} sub="participan" color={p.color}/>
                    <Mini label="Empleos"  value={p.empleos}          sub="generados"  color="#16A34A"/>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · MFP ───── */}
        {tab === 'mfp' && (
          <section className="fe-panel fe-panel--padded">
            <h3 className="fe-panel-title">Marco Financiero Plurianual 2021-2027 · fondos estructurales</h3>
            <p className="fe-panel-sub">Asignación a España y nivel de ejecución por fondo · datos al cierre Q1-2026</p>
            <div className="fe-mfp-list">
              {MFP_FONDOS.map(f => {
                const pctEj = (f.ejecutado / f.asignado) * 100
                return (
                  <div key={f.fondo} className="fe-mfp-row" style={{ borderLeft:`3px solid ${f.color}` }}>
                    <div>
                      <div className="fe-mfp-fondo" style={{ color: f.color }}>{f.fondo}</div>
                      <div className="fe-mfp-desc">{f.desc}</div>
                    </div>
                    <div>
                      <div className="fe-mfp-amounts">
                        <span>Asignado: <strong>{f.asignado.toLocaleString('es-ES')}M€</strong></span>
                        <span className="fe-mfp-exec">Ejec: {f.ejecutado.toLocaleString('es-ES')}M€</span>
                      </div>
                      <div className="fe-mfp-track">
                        <div className="fe-mfp-fill" style={{ width:`${pctEj}%`, background:f.color }}/>
                      </div>
                    </div>
                    <div className="fe-mfp-pct-wrap">
                      <div className="fe-mfp-pct" style={{ color: f.color }}>
                        {pctEj.toFixed(0)}<span className="fe-mfp-pct-sym">%</span>
                      </div>
                      <div className="fe-mfp-pct-cap">Ejecutado</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {MFP_FONDOS.length > 0 && (
              <div className="fe-mfp-total">
                <div>
                  <div className="fe-mfp-total-label">∑ TOTAL MFP 2021-2027</div>
                  <div className="fe-mfp-total-value">
                    {MFP_FONDOS.reduce((s,f) => s + f.asignado, 0).toLocaleString('es-ES')}
                    <span className="fe-mfp-total-value-sub"> M€</span>
                  </div>
                </div>
                <div className="fe-mfp-total-right">
                  <div className="fe-mfp-total-label">EJECUTADO</div>
                  <div className="fe-mfp-total-value fe-mfp-total-pct">
                    {Math.round((MFP_FONDOS.reduce((s,f) => s + f.ejecutado, 0) / MFP_FONDOS.reduce((s,f) => s + f.asignado, 0)) * 100)}
                    <span className="fe-mfp-total-value-sub">%</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ───── TAB · Convocatorias ───── */}
        {tab === 'convocatorias' && (
          <section className="fe-convo-list">
            {[...CONVOCATORIAS].sort((a,b) => a.diasRestantes - b.diasRestantes).map(c => {
              const cierreColor = c.diasRestantes <= 14 ? '#DC2626' : c.diasRestantes <= 30 ? '#F97316' : '#16A34A'
              return (
                <article
                  key={c.id}
                  className="fe-convo-card"
                  style={{ borderLeft:`4px solid ${MATCH_COLOR[c.match]}` }}
                >
                  <div className="fe-convo-main">
                    <div className="fe-convo-tags-row">
                      <span className="fe-chip fe-chip--solid" style={{ background:MATCH_COLOR[c.match] }}>MATCH {c.match}</span>
                      <span className="fe-chip-fondo">{c.fondo.toUpperCase()}</span>
                      <span className="fe-chip-meta">· {c.beneficiarios.toUpperCase()} · {c.ccaa}</span>
                    </div>
                    <h3 className="fe-convo-title">{c.titulo}</h3>
                    <div className="fe-convo-org">{c.organismo}</div>
                  </div>
                  <div className="fe-convo-right">
                    <div className="fe-convo-importe">{c.importe}<span className="fe-convo-importe-unit">M€</span></div>
                    <div className="fe-convo-cap">importe convocatoria</div>
                  </div>
                  <div className="fe-convo-right">
                    <div className="fe-convo-dias" style={{ color: cierreColor }}>
                      {c.diasRestantes}<span className="fe-convo-importe-unit">d</span>
                    </div>
                    <div className="fe-convo-cap">{c.fechaCierre}</div>
                  </div>
                  <button className="fe-convo-btn">Ver bases →</button>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · Hitos ───── */}
        {tab === 'hitos' && (
          <section className="fe-panel fe-panel--padded">
            <h3 className="fe-panel-title">Calendario de hitos y desembolsos · UE-España</h3>
            <p className="fe-panel-sub fe-panel-sub--lg">Solicitudes de pago, desembolsos del MRR, hitos CID y reformas vinculadas</p>
            <div className="fe-timeline">
              <div className="fe-timeline-spine"/>
              {[...HITOS].sort((a,b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime()).map((h, i) => {
                const tipoColor = TIPO_HITO_COLOR[h.tipo]
                const estadoColor = ESTADO_HITO[h.estado]
                return (
                  <div key={i} className={`fe-timeline-row${i === 0 ? ' fe-timeline-row--first' : ''}`}>
                    <span className="fe-timeline-date">{h.fecha}</span>
                    <div className="fe-timeline-dot-wrap">
                      <div
                        className="fe-timeline-dot"
                        style={{ border:`3px solid ${tipoColor}`, boxShadow:`0 0 0 3px ${tipoColor}22` }}
                      />
                    </div>
                    <div className="fe-timeline-body">
                      <div className="fe-timeline-tags">
                        <span className="fe-chip fe-chip--solid" style={{ background: tipoColor }}>{h.tipo.toUpperCase()}</span>
                        <span
                          className="fe-chip fe-chip--pill"
                          style={{ background:`${estadoColor}15`, color: estadoColor, border:`1px solid ${estadoColor}40` }}
                        >{h.estado.toUpperCase()}</span>
                      </div>
                      <h4 className="fe-timeline-title">{h.titulo}</h4>
                      <p className="fe-timeline-detail">{h.detalle}</p>
                    </div>
                    {h.importe && (
                      <div className="fe-timeline-amount">
                        {(h.importe/1000).toFixed(1)}<span className="fe-timeline-amount-unit">B€</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Beneficiarios ───── */}
        {tab === 'beneficiarios' && (
          <section className="fe-panel">
            <div className="fe-table-scroll">
              <table className="fe-table fe-table--ben">
                <thead>
                  <tr className="fe-thead-row">
                    {['#','Beneficiario','Tipo','Total recibido','Proyectos','Sectores','Estado'].map(h => (
                      <th key={h} className="fe-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...BENEFICIARIOS].sort((a,b) => b.totalRecibido - a.totalRecibido).map((b, i) => {
                    const tipoColor = b.tipo === 'Gran empresa' ? '#1F4E8C' : b.tipo === 'Pyme' ? '#F97316' : b.tipo === 'CCAA' ? '#5B21B6' : b.tipo === 'Ayuntamiento' ? '#16A34A' : b.tipo === 'Investigación' ? '#0EA5E9' : '#D43F8D'
                    const activo = b.estado === 'Activo'
                    const estadoColor = activo ? '#16A34A' : '#6e6e73'
                    return (
                      <tr key={b.nombre} className={`fe-tr ${i%2 ? 'fe-tr--even' : 'fe-tr--odd'}`}>
                        <td className="fe-td fe-td-num">{i+1}</td>
                        <td className="fe-td fe-td-name">{b.nombre}</td>
                        <td className="fe-td">
                          <span className="fe-chip fe-chip--solid" style={{ background: tipoColor }}>{b.tipo.toUpperCase()}</span>
                        </td>
                        <td className="fe-td fe-td-money fe-td-money--ue">{b.totalRecibido}M€</td>
                        <td className="fe-td fe-td-num">{b.proyectos}</td>
                        <td className="fe-td">
                          <div className="fe-sectors">
                            {b.sectores.map(s => (
                              <span key={s} className="fe-sector-chip">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="fe-td">
                          <span
                            className="fe-chip fe-chip--pill"
                            style={{ background:`${estadoColor}15`, color: estadoColor, border:`1px solid ${estadoColor}40` }}
                          >{b.estado.toUpperCase()}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
      <footer className="fe-footer">
        Fondos Europeos y PRTR · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div className="fe-hkpi" style={{ border:`1px solid ${accent}55` }}>
      <div className="fe-hkpi-value">{value}</div>
      <div className="fe-hkpi-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="fe-section-head">
      <h2 className="fe-section-title">
        <span className="fe-section-bar" style={{ background: accent }}/>
        {label}
      </h2>
      <span className="fe-section-count">{count}</span>
    </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div className="fe-skpi">
      <div className="fe-skpi-label">{label}</div>
      <div className="fe-skpi-row">
        <span className="fe-skpi-value" style={{ color }}>{value}</span>
        {sub && <span className="fe-skpi-sub">{sub}</span>}
      </div>
      {delta && (
        <div className={`fe-skpi-delta${pos ? ' fe-skpi-delta--pos' : ''}`} style={pos ? undefined : { color }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="fe-mini">
      <div className="fe-mini-value" style={{ color }}>{value}</div>
      <div className="fe-mini-sub">{sub}</div>
      <div className="fe-mini-label">{label}</div>
    </div>
  )
}

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
