'use client'
import './adjudicaciones.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'
import { useAdjudicaciones } from '@/hooks/contratacion/useAdjudicaciones'
import type {
  SectorContratacion, RiesgoContrato, ProcedimientoAdj, EstadoExpediente,
} from '@/types/contratacion'

const SECTOR_COLOR: Record<SectorContratacion, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
  'Servicios sociales':'#D43F8D', 'Cultura':'#7C3AED', 'Otros':'#6e6e73',
}
const PROC_COLOR: Record<ProcedimientoAdj, string> = {
  'Abierto':'#16A34A', 'Restringido':'#0EA5E9', 'Negociado':'#F97316',
  'Diálogo competitivo':'#5B21B6', 'Emergencia':'#DC2626',
  'Acuerdo marco':'#7C3AED', 'Concursal':'#525258',
}
const RIESGO_C: Record<RiesgoContrato, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const EST_C: Record<EstadoExpediente, string> = {
  'Adjudicado':'#16A34A', 'En licitación':'#5B21B6', 'Recurrido':'#F97316',
  'Anulado':'#DC2626', 'Modificado':'#EAB308',
}

// Static analytics data (not from API)
const SERIE_MENSUAL = {
  meses: ['Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May'],
  numero:[ 248, 198, 312, 318, 342, 358, 396, 412, 442, 468, 285 ],
  importe:[ 4.2, 3.5, 5.8, 6.2, 7.1, 7.8, 8.4, 9.1, 9.8, 10.4, 6.2 ],
}
const POR_PROC: { p: ProcedimientoAdj; n: number }[] = [
  { p:'Abierto',              n:42.4 },
  { p:'Acuerdo marco',         n:18.6 },
  { p:'Restringido',          n:14.2 },
  { p:'Negociado',            n:10.8 },
  { p:'Diálogo competitivo',  n: 6.4 },
  { p:'Emergencia',           n: 4.8 },
  { p:'Concursal',           n: 2.8 },
]
const POR_SECTOR: { s: SectorContratacion; n: number }[] = [
  { s:'Infraestructuras',    n:28.4 },
  { s:'Sanidad',              n:18.6 },
  { s:'Defensa',              n:14.2 },
  { s:'TIC',                  n:12.8 },
  { s:'Servicios sociales',   n:10.5 },
  { s:'Energía',              n: 8.2 },
  { s:'Educación',            n: 5.1 },
  { s:'Otros',                n: 2.2 },
]

export default function AdjudicacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useAdjudicaciones()

  const adjudicaciones   = data?.adjudicaciones    ?? []
  const organismos       = data?.organismos         ?? []
  const empresas         = data?.empresas            ?? []
  const casosMediaticos  = data?.casos_mediaticos   ?? []

  const [tab, setTab] = useState<'recientes' | 'organismos' | 'empresas' | 'casos' | 'series' | 'distribucion'>('recientes')
  const [filterRiesgo, setFilterRiesgo] = useState<RiesgoContrato | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const totalImporte = adjudicaciones.reduce((s, a) => s + a.importeAdj, 0) / 1_000_000
    const bajaMedia = adjudicaciones.length ? adjudicaciones.reduce((s, a) => s + a.baja, 0) / adjudicaciones.length : 0
    const numEmergencia = adjudicaciones.filter(a => a.procedimiento === 'Emergencia').length
    const conAlertas = adjudicaciones.filter(a => a.alertas.length > 0).length
    const criticos = adjudicaciones.filter(a => a.riesgo === 'CRÍTICO' || a.riesgo === 'ALTO').length
    return { total: adjudicaciones.length, totalImporte, bajaMedia, numEmergencia, conAlertas, criticos }
  }, [adjudicaciones])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adjudicaciones
      .filter(a => filterRiesgo === 'Todos' || a.riesgo === filterRiesgo)
      .filter(a => !q || a.titulo.toLowerCase().includes(q) || a.organismo.toLowerCase().includes(q) || a.adjudicatario.toLowerCase().includes(q) || a.exp.toLowerCase().includes(q))
      .sort((a,b) => parseDate(b.fechaAdj).getTime() - parseDate(a.fechaAdj).getTime())
  }, [adjudicaciones, filterRiesgo, query])

  if (loading) return (
    <div className="adj-root">
      <AppHeader/>
      <main className="adj-main adj-main--loading">
        <div className="adj-loading-text">Cargando adjudicaciones…</div>
      </main>
    </div>
  )

  return (
    <div className="adj-root">
      <AppHeader/>
      <main className="adj-main">

        {/* ───── Hero ───── */}
        <section className="adj-hero">
          <div>
            <p className="adj-hero-eyebrow">
              LICITACIONES Y CONTRATACIÓN PÚBLICA · INTELIGENCIA DE ADJUDICACIONES
            </p>
            <h1 className="adj-hero-title">
              {totals.totalImporte.toFixed(0)} M€ adjudicados <em>en últimas 6 semanas</em>
            </h1>
            <p className="adj-hero-subtitle">
              {totals.total} expedientes monitorizados · {totals.criticos} con riesgo alto o crítico · {totals.numEmergencia} por emergencia · {totals.conAlertas} con alertas activas. Cruce con BOE, PLACSP, FNMT y datos abiertos del Tribunal de Cuentas.
            </p>
          </div>
          <div className="adj-hero-kpis">
            <HeroKPI label="Expedientes" value={String(totals.total)}                 accent="#86EFAC"/>
            <HeroKPI label="∑ Importe"   value={`${totals.totalImporte.toFixed(0)}M€`} accent="#7DD3FC"/>
            <HeroKPI label="Baja media"   value={`${totals.bajaMedia.toFixed(1)}%`}    accent="#FCD34D"/>
            <HeroKPI label="Críticos"     value={String(totals.criticos)}              accent="#FCA5A5"/>
          </div>
        </section>

        {/* ═══ PLACSP · adjudicaciones reales en vivo ═══ */}
        <ContratosLiveFeed
          tipo="both"
          estado="ADJ"
          limit={12}
          titulo="ADJUDICACIONES RECIENTES · PLACSP"
        />

        {/* ───── Snapshot · 8 KPIs detallados ───── */}
        <section className="adj-snapshot">
          <SectionHeader label="Snapshot del mercado" count="2026 · ene-may" accent="#0F766E"/>
          <div className="adj-snapshot-grid">
            <SKpi label="Total adjudicado 2026"     value="68.4"    sub="mil M€"   delta="+12.4%"  pos color="#0F766E"/>
            <SKpi label="Nº de expedientes"          value="9.842"   sub="acum."    delta="+8.5%"  pos color="#5B21B6"/>
            <SKpi label="Importe medio"              value="6.95"    sub="M€/exp"   delta="+3.2%"  pos color="#1F4E8C"/>
            <SKpi label="Baja media"                  value="5.8"    sub="% global" delta="−0.4 pp" color="#F97316"/>
            <SKpi label="% emergencia"                value="4.8"    sub="% del €"  delta="+0.6 pp" color="#DC2626"/>
            <SKpi label="% modificados"               value="11.2"   sub="vs base"  delta="−0.8 pp" pos color="#16A34A"/>
            <SKpi label="Conc. top-10 empresas"      value="38.4"    sub="% del €"  delta="+1.4 pp" color="#EAB308"/>
            <SKpi label="Recursos ante TACRC"        value="284"    sub="enero-mayo" delta="+18.4%" color="#DC2626"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="adj-tabs">
          {([
            { k:'recientes',     label:'Adjudicaciones recientes', count: adjudicaciones.length },
            { k:'organismos',    label:'Organismos contratantes',  count: organismos.length },
            { k:'empresas',      label:'Empresas adjudicatarias',  count: empresas.length },
            { k:'casos',         label:'Casos e investigaciones',  count: casosMediaticos.length },
            { k:'series',        label:'Evolución temporal',        count: SERIE_MENSUAL.meses.length },
            { k:'distribucion',  label:'Distribución por sector',  count: POR_SECTOR.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`adj-tab-btn${active ? ' adj-tab-btn--active' : ''}`}
              >
                {t.label} <span className="adj-tab-count">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Recientes ───── */}
        {tab === 'recientes' && (
          <>
            <div className="adj-filters">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, empresa o expediente…"
                className="adj-search-input"
              />
              <span className="adj-filter-label">Riesgo:</span>
              <div className="adj-filter-pills">
                {(['Todos','CRÍTICO','ALTO','MEDIO','BAJO'] as const).map(r => {
                  const active = filterRiesgo === r
                  const col = r === 'Todos' ? '#1d1d1f' : RIESGO_C[r as RiesgoContrato]
                  return (
                    <button
                      key={r}
                      onClick={() => setFilterRiesgo(r)}
                      className={`adj-filter-pill${active ? ' adj-filter-pill--active' : ''}`}
                      style={{ color: active ? col : undefined }}  // dynamic riesgo color
                    >{r}</button>
                  )
                })}
              </div>
              <span className="adj-filter-count">{filtered.length} expedientes visibles</span>
            </div>
            <div className="adj-list">
              {filtered.map(a => (
                <article key={a.id} className="adj-card" style={{ borderLeft:`4px solid ${RIESGO_C[a.riesgo]}` }}>
                  <header className="adj-card-header">
                    <div className="adj-card-headline">
                      <div className="adj-card-badges">
                        <span className="adj-badge-riesgo" style={{ background:RIESGO_C[a.riesgo] }}>RIESGO {a.riesgo}</span>
                        <span className="adj-badge-tag" style={{ background:`${SECTOR_COLOR[a.sector]}15`, color:SECTOR_COLOR[a.sector], border:`1px solid ${SECTOR_COLOR[a.sector]}40` }}>{a.sector.toUpperCase()}</span>
                        <span className="adj-badge-tag" style={{ background:`${PROC_COLOR[a.procedimiento]}15`, color:PROC_COLOR[a.procedimiento], border:`1px solid ${PROC_COLOR[a.procedimiento]}40` }}>{a.procedimiento.toUpperCase()}</span>
                        <span className="adj-badge-estado" style={{ background:`${EST_C[a.estado]}15`, color:EST_C[a.estado], border:`1px solid ${EST_C[a.estado]}40` }}>{a.estado.toUpperCase()}</span>
                        <span className="adj-badge-exp">· EXP. {a.exp}</span>
                      </div>
                      <h3 className="adj-card-title">{a.titulo}</h3>
                      <div className="adj-card-subtitle">{a.organismo} · <span className="adj-card-subtitle-soft">{a.ccaa}</span></div>
                    </div>
                    <div className="adj-card-money">
                      <div className="adj-card-money-value">
                        {(a.importeAdj / 1_000_000).toFixed(1)}<span className="adj-card-money-unit">M€</span>
                      </div>
                      <div className="adj-card-money-base">vs base {(a.importeBase / 1_000_000).toFixed(1)}M€</div>
                      <div
                        className="adj-card-money-baja"
                        style={{ color: a.baja >= 5 ? '#16A34A' : a.baja > 0 ? '#F97316' : '#DC2626' }}
                      >
                        {a.baja > 0 ? '▼' : '→'} baja {a.baja.toFixed(1)}%
                      </div>
                    </div>
                  </header>
                  <div className="adj-card-meta">
                    <div>
                      <div className="adj-meta-label">Adjudicatario</div>
                      <div className="adj-meta-value">{a.adjudicatario}</div>
                    </div>
                    <div>
                      <div className="adj-meta-label">Licitadores</div>
                      <div
                        className="adj-meta-licit"
                        style={{ color: a.numLicit >= 5 ? '#16A34A' : a.numLicit >= 3 ? '#F97316' : '#DC2626' }}
                      >{a.numLicit > 0 ? a.numLicit : '—'}</div>
                    </div>
                    <div>
                      <div className="adj-meta-label">Duración</div>
                      <div className="adj-meta-value">{a.duracion}</div>
                    </div>
                    <div>
                      <div className="adj-meta-label">Adjudicación</div>
                      <div className="adj-meta-fecha">{a.fechaAdj}</div>
                    </div>
                  </div>
                  {a.alertas.length > 0 && (
                    <div className="adj-card-alerts">
                      <div className="adj-alerts-label">Alertas</div>
                      {a.alertas.map((al, i) => (
                        <div key={i} className="adj-alert-row">
                          <span className="adj-alert-bang">!</span>{al}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}

        {/* ───── TAB · Organismos ───── */}
        {tab === 'organismos' && (
          <section className="adj-table-card">
            <div className="adj-table-scroll">
              <table className="adj-table">
                <thead>
                  <tr>
                    {['#','Organismo','Tipo','∑ Adjudicado','Nº exp.','Baja media','Conc. top-1','% modific.','Salud licitadora'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...organismos].sort((a,b) => b.totalAdj - a.totalAdj).map((o, i) => {
                    const salud = Math.round((o.bajaMedia * 6) + (100 - o.concentracion) * 0.4 + (100 - o.modificacionesPct * 2) * 0.3)
                    const sCol = salud >= 70 ? '#16A34A' : salud >= 50 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={o.nombre} className={i%2 ? 'adj-table-row--alt' : ''}>
                        <td className="adj-table-num">{i+1}</td>
                        <td className="adj-table-name">{o.nombre}</td>
                        <td>
                          <span
                            className="adj-tipo-badge"
                            style={{ background: o.tipo === 'AGE' ? '#1F4E8C' : o.tipo === 'CCAA' ? '#5B21B6' : o.tipo === 'Local' ? '#16A34A' : '#525258' }}
                          >{o.tipo.toUpperCase()}</span>
                        </td>
                        <td className="adj-table-money">{o.totalAdj.toLocaleString('es-ES')}M€</td>
                        <td className="adj-table-mono--bold">{o.numAdj}</td>
                        <td
                          className="adj-table-mono--bold"
                          style={{ color: o.bajaMedia >= 6 ? '#16A34A' : o.bajaMedia >= 3 ? '#F97316' : '#DC2626' }}
                        >{o.bajaMedia.toFixed(1)}%</td>
                        <td>
                          <div className="adj-conc-cell">
                            <div className="adj-conc-bar">
                              <div
                                className="adj-conc-fill"
                                style={{ width:`${o.concentracion}%`, background: o.concentracion >= 40 ? '#DC2626' : o.concentracion >= 25 ? '#F97316' : '#16A34A' }}
                              />
                            </div>
                            <span className="adj-conc-pct">{o.concentracion}%</span>
                          </div>
                        </td>
                        <td
                          className="adj-table-mono--bold"
                          style={{ color: o.modificacionesPct >= 15 ? '#DC2626' : o.modificacionesPct >= 10 ? '#F97316' : '#16A34A' }}
                        >{o.modificacionesPct}%</td>
                        <td>
                          <span
                            className="adj-salud-pill"
                            style={{ background:`${sCol}15`, color:sCol, border:`1px solid ${sCol}40` }}
                          >{salud}/100</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Empresas ───── */}
        {tab === 'empresas' && (
          <section className="adj-table-card">
            <div className="adj-table-scroll">
              <table className="adj-table">
                <thead>
                  <tr>
                    {['#','Empresa','CIF','Sectores','∑ Adjudicado','Nº exp.','Empleados','Vinculación','País matriz'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...empresas].sort((a,b) => b.totalAdj - a.totalAdj).map((e, i) => {
                    const vincCol = e.vinculacion === 'Investigada' ? '#DC2626' : e.vinculacion === 'Política' ? '#F97316' : e.vinculacion === 'Mediática' ? '#EAB308' : '#16A34A'
                    return (
                      <tr key={e.cif} className={i%2 ? 'adj-table-row--alt' : ''}>
                        <td className="adj-table-num">{i+1}</td>
                        <td className="adj-table-name">{e.nombre}</td>
                        <td className="adj-table-mono">{e.cif}</td>
                        <td>
                          <div className="adj-sector-tags">
                            {e.sectores.map(s => (
                              <span
                                key={s}
                                className="adj-sector-tag"
                                style={{ background:`${SECTOR_COLOR[s]}15`, color:SECTOR_COLOR[s], border:`1px solid ${SECTOR_COLOR[s]}40` }}
                              >{s.toUpperCase()}</span>
                            ))}
                          </div>
                        </td>
                        <td className="adj-table-money">{e.totalAdj.toLocaleString('es-ES')}M€</td>
                        <td className="adj-table-mono--bold">{e.numAdj}</td>
                        <td className="adj-table-mono--bold">{e.empleados}</td>
                        <td>
                          <span
                            className="adj-vinc-pill"
                            style={{ background:`${vincCol}15`, color:vincCol, border:`1px solid ${vincCol}40` }}
                          >{e.vinculacion.toUpperCase()}</span>
                        </td>
                        <td className="adj-table-mono">{e.paisMatriz}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Casos ───── */}
        {tab === 'casos' && (
          <section className="adj-casos-grid">
            {[...casosMediaticos].sort((a,b) => {
              const order = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 } as Record<RiesgoContrato, number>
              return order[a.severidad] - order[b.severidad]
            }).map((c, i) => {
              const estCol = c.estado === 'Sumario abierto' ? '#DC2626' : c.estado === 'En instrucción' ? '#F97316' : c.estado === 'Sentencia' ? '#5B21B6' : '#525258'
              return (
                <article key={i} className="adj-caso-card" style={{ borderLeft:`3px solid ${RIESGO_C[c.severidad]}` }}>
                  <div className="adj-caso-head">
                    <span className="adj-caso-severidad" style={{ background:RIESGO_C[c.severidad] }}>{c.severidad}</span>
                    <span className="adj-caso-estado" style={{ background:`${estCol}15`, color:estCol, border:`1px solid ${estCol}40` }}>{c.estado.toUpperCase()}</span>
                    <span className="adj-caso-importe">{c.importe.toFixed(1)}M€</span>
                  </div>
                  <h4 className="adj-caso-title">{c.caso}</h4>
                  <div className="adj-caso-protag">{c.protag}</div>
                  <p className="adj-caso-detalle">{c.detalle}</p>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · Series ───── */}
        {tab === 'series' && (
          <section className="adj-series-card">
            <h3 className="adj-series-title">Evolución mensual de las adjudicaciones · 11 meses</h3>
            <p className="adj-series-subtitle">Volumen total y número de expedientes · 2025 · primera mitad de 2026</p>
            <BigSeries meses={SERIE_MENSUAL.meses} importe={SERIE_MENSUAL.importe} numero={SERIE_MENSUAL.numero}/>
            <div className="adj-series-minis">
              <Mini label="Mejor mes (importe)" value="10.4 mil M€" sub="abril 2026" color="#0F766E"/>
              <Mini label="Mejor mes (volumen)" value="468"          sub="abril 2026"   color="#5B21B6"/>
              <Mini label="Crecimiento YoY"     value="+18.4%"       sub="vs mismo periodo 2025" color="#16A34A"/>
            </div>
          </section>
        )}

        {/* ───── TAB · Distribución ───── */}
        {tab === 'distribucion' && (
          <section className="adj-distrib-grid">
            {/* Por sector */}
            <div className="adj-distrib-card">
              <h3 className="adj-distrib-h3">Por sector · % del importe total</h3>
              <p className="adj-distrib-sub">Reparto sectorial de los 68.4 mil M€ adjudicados</p>
              <div className="adj-stack-bar">
                {POR_SECTOR.map(s => (
                  <div
                    key={s.s}
                    title={`${s.s}: ${s.n}%`}
                    className="adj-stack-segment"
                    style={{ width:`${s.n}%`, background:SECTOR_COLOR[s.s] }}
                  >{s.n >= 8 ? `${s.n}%` : ''}</div>
                ))}
              </div>
              <div className="adj-legend">
                {POR_SECTOR.map(s => (
                  <div key={s.s} className="adj-legend-row">
                    <span className="adj-legend-dot" style={{ background:SECTOR_COLOR[s.s] }}/>
                    <span className="adj-legend-name">{s.s}</span>
                    <span className="adj-legend-pct" style={{ color:SECTOR_COLOR[s.s] }}>{s.n}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Por procedimiento */}
            <div className="adj-distrib-card">
              <h3 className="adj-distrib-h3">Por procedimiento · % del nº de expedientes</h3>
              <p className="adj-distrib-sub">Tipos de procedimiento usados · vigilar emergencia y negociado</p>
              <div className="adj-proc-list">
                {POR_PROC.map(p => (
                  <div key={p.p}>
                    <div className="adj-proc-row-header">
                      <span className="adj-proc-row-name">
                        <span className="adj-proc-dot" style={{ background:PROC_COLOR[p.p] }}/>
                        {p.p}
                      </span>
                      <span className="adj-proc-pct" style={{ color:PROC_COLOR[p.p] }}>{p.n}%</span>
                    </div>
                    <div className="adj-proc-bar">
                      <div
                        className="adj-proc-fill"
                        style={{ width:`${(p.n / 50) * 100}%`, background:PROC_COLOR[p.p] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="adj-redflag">
                <div className="adj-redflag-label">Bandera roja</div>
                <p className="adj-redflag-p">El 4.8% del importe va por <strong>emergencia</strong> sin licitación pública (DANA). Aumentó +1.2 pp vs 2025 · vigilar concentración de adjudicatarios y modificados.</p>
              </div>
            </div>
          </section>
        )}

      </main>
      <footer className="adj-footer">
        Inteligencia de Adjudicaciones · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div className="adj-hero-kpi" style={{ border:`1px solid ${accent}55` }}>
      <div className="adj-hero-kpi-value">{value}</div>
      <div className="adj-hero-kpi-label" style={{ color:accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="adj-section-header">
      <h2 className="adj-section-h2">
        <span className="adj-section-h2-bar" style={{ background:accent }}/>
        {label}
      </h2>
      <span className="adj-section-h2-count">{count}</span>
    </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div className="adj-skpi">
      <div className="adj-skpi-label">{label}</div>
      <div className="adj-skpi-value-row">
        <span className="adj-skpi-value" style={{ color }}>{value}</span>
        {sub && <span className="adj-skpi-sub">{sub}</span>}
      </div>
      {delta && (
        <div className={`adj-skpi-delta${pos ? ' adj-skpi-delta--pos' : ' adj-skpi-delta--neg'}`}>
          {pos ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="adj-mini">
      <div className="adj-mini-value" style={{ color }}>{value}</div>
      <div className="adj-mini-sub">{sub}</div>
      <div className="adj-mini-label">{label}</div>
    </div>
  )
}

function BigSeries({ meses, importe, numero }: { meses: string[], importe: number[], numero: number[] }) {
  const w = 800, h = 220, padL = 40, padR = 40, padT = 14, padB = 26
  const maxImp = Math.max(...importe) * 1.1
  const maxNum = Math.max(...numero) * 1.1
  const xs = meses.map((_, i) => padL + (i / (meses.length - 1)) * (w - padL - padR))
  const ysImp = importe.map(v => h - padB - (v / maxImp) * (h - padT - padB))
  const ysNum = numero.map(v => h - padB - (v / maxNum) * (h - padT - padB))
  const lineImp = ysImp.map((y, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${y}`).join(' ')
  const areaImp = `M ${xs[0]} ${h - padB} L ${xs[0]} ${ysImp[0]} ` + ysImp.map((y, i) => `L ${xs[i]} ${y}`).join(' ') + ` L ${xs[xs.length-1]} ${h - padB} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="adj-series-svg" style={{ height:h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="g-adj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.32"/>
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={padL} y1={(h-padB) - p * (h - padT - padB)} x2={w - padR} y2={(h-padB) - p * (h - padT - padB)} stroke="#ECECEF" strokeDasharray="2 4" strokeWidth="1"/>
      ))}
      <path d={areaImp} fill="url(#g-adj)"/>
      <path d={lineImp} fill="none" stroke="#0F766E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
      {numero.map((v, i) => {
        const yTop = h - padB - (v / maxNum) * (h - padT - padB) * 0.5
        const bw = 8
        return <rect key={i} x={xs[i] - bw/2} y={yTop} width={bw} height={h - padB - yTop} fill="#5B21B6" opacity="0.4" rx="2"/>
      })}
      {ysImp.map((y, i) => <circle key={i} cx={xs[i]} cy={y} r="3" fill="#0F766E"/>)}
      {meses.map((m, i) => (
        <text key={m} x={xs[i]} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="#6e6e73">{m}</text>
      ))}
      <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="9" fill="#0F766E" fontWeight="700">mil M€</text>
      <text x={padL - 6} y={h - padB + 3} textAnchor="end" fontSize="9" fill="#6e6e73">0</text>
      <text x={padL - 6} y={padT + 12} textAnchor="end" fontSize="10" fill="#0F766E" fontWeight="700">{maxImp.toFixed(0)}</text>
      <text x={w - padR + 6} y={padT + 4} textAnchor="start" fontSize="9" fill="#5B21B6" fontWeight="700">nº exp.</text>
      <text x={w - padR + 6} y={padT + 12} textAnchor="start" fontSize="10" fill="#5B21B6" fontWeight="700">{maxNum.toFixed(0)}</text>
    </svg>
  )
}

// dd/mm/yyyy → Date
function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
