'use client'
import './macro.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useMacroDataset } from '@/hooks/useMacroDataset'
import type { Indic } from '@/data/macro-fixture'
import MacroFinanceDashboard from '@/components/MacroFinanceDashboard'
import { MarketSnapshot } from '@/components/markets/MarketSnapshot'
import { ImfWeoForecast } from '@/components/macro/ImfWeoForecast'
import { OecdMacroPanel } from '@/components/macro/OecdMacroPanel'
import { BisBankingPanel } from '@/components/macro/BisBankingPanel'
import { EurostatRegionsMap } from '@/components/macro/EurostatRegionsMap'

// ─────────────────────────────────────────────────────────────────────────
// Termómetro macro-político · score 0-100
// ─────────────────────────────────────────────────────────────────────────
function calcTermometro(kpis: Indic[]) {
  // Cada indicador suma o resta puntos según si va en buena o mala dirección
  let score = 50
  for (const k of kpis) {
    const isGood = k.dir === k.good || k.dir === 'flat'
    score += isGood ? 4 : -3
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function MacroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const {
    kpis,
    comparativa,
    ipcComp,
    vivienda,
    mercados,
    salarios,
    calendario,
    sectores,
    voterProfiles,
    histCycles,
    impactoPolitico,
    loading,
  } = useMacroDataset()

  const termometro = useMemo(() => calcTermometro(kpis), [kpis])
  const [tab, setTab] = useState<'comp' | 'mercados' | 'vivienda' | 'salarios' | 'calend' | 'votantes' | 'ciclos' | 'impacto'>('comp')

  // KPI seleccionado para mostrar serie y comentario
  const [kpiSel, setKpiSel] = useState<string | null>(null)
  const kpiActivo = useMemo(() => {
    if (kpis.length === 0) return null
    const selected = kpiSel ? kpis.find(k => k.id === kpiSel) : null
    return selected ?? kpis[0]
  }, [kpis, kpiSel])

  if (loading && kpis.length === 0) {
    return (
      <div className="mac-root">
        <AppHeader/>
        <main className="mac-main">
          <p className="mac-loading">Cargando indicadores macroeconómicos…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="mac-root">
      <AppHeader/>
      <main className="mac-main">

        {/* ───── Hero · termómetro macro-político ───── */}
        <section className="mac-hero">
          <div>
            <p className="mac-hero-eyebrow">
              MACRO-POLITICAL & ECONOMIC INTELLIGENCE
            </p>
            <h1 className="mac-hero-title">
              España crece +2.7% · prima en 102 pb <em>y déficit por debajo del 3%</em>
            </h1>
            <p className="mac-hero-subtitle">
              12 indicadores con sparklines · comparativa UE · vivienda · mercados · salarios · calendario macro · perfiles de votante · ciclos electorales históricos · impacto político por variable.
            </p>
          </div>
          <div className="mac-hero-termo">
            <Termometro value={termometro}/>
            <div className="mac-hero-termo-label">Termómetro macro-político</div>
            <div className="mac-hero-termo-status">{termometro >= 70 ? 'Coyuntura favorable' : termometro >= 55 ? 'Coyuntura mixta' : termometro >= 40 ? 'Tensiones crecientes' : 'Coyuntura adversa'}</div>
          </div>
        </section>

        {/* ───── Sprint 1 · Datos oficiales TSO ───── */}
        <section style={{ margin: '24px 0', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
          <ImfWeoForecast />
          <OecdMacroPanel />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14 }}>
            <BisBankingPanel country="ES" />
            <EurostatRegionsMap defaultMetric="gdp_per_capita" />
          </div>
        </section>

        {/* ───── KPIs principales (12) con sparklines ───── */}
        {kpis.length > 0 && (
          <section className="mac-kpi-section">
            <SectionHeader label="Indicadores clave" count={`${kpis.length} variables · datos abril-mayo 2026`} accent="#0F766E"/>
            <div className="mac-kpi-grid">
              {kpis.map(k => {
                const isGood = (k.dir === k.good)
                const deltaCol = isGood ? '#16A34A' : '#DC2626'
                const isSelected = kpiActivo?.id === k.id
                return (
                  <button
                    key={k.id}
                    onClick={() => setKpiSel(k.id)}
                    className="mac-kpi-card"
                    style={{
                      border: `1px solid ${isSelected ? k.c : '#ECECEF'}`,
                      boxShadow: isSelected ? `0 0 0 3px ${k.c}22, 0 1px 3px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.04)',
                      borderLeft: `3px solid ${k.c}`,
                    }}
                  >
                    <p className="mac-kpi-label">{k.l}</p>
                    <div className="mac-kpi-row">
                      <span className="mac-kpi-value" style={{ color: k.c }}>{k.v}</span>
                      <span className="mac-kpi-delta" style={{ color: deltaCol }}>{k.dir === 'up' ? '▲' : k.dir === 'down' ? '▼' : '→'} {k.delta}</span>
                    </div>
                    <Sparkline data={k.serie} color={k.c} h={26}/>
                    <div className="mac-kpi-foot">{k.unidad} · {k.fecha}</div>
                  </button>
                )
              })}
            </div>
            {/* Detalle del KPI seleccionado */}
            {kpiActivo && (
              <div className="mac-kpi-detail" style={{ border: `1px solid ${kpiActivo.c}40` }}>
                <span className="mac-kpi-detail-badge" style={{ background: kpiActivo.c }}>{kpiActivo.l.toUpperCase()}</span>
                <span className="mac-kpi-detail-value" style={{ color: kpiActivo.c }}>{kpiActivo.v}</span>
                <span className="mac-kpi-detail-comment">{kpiActivo.comentario}</span>
                <span className="mac-kpi-detail-source">Fuente: {kpiActivo.fuente}</span>
              </div>
            )}
          </section>
        )}

        {/* ───── Tabs ───── */}
        <div className="mac-tabs">
          {([
            { k:'comp',     label:'Comparativa UE',         count: comparativa.length },
            { k:'mercados', label:'Mercados',                count: mercados.length },
            { k:'vivienda', label:'Vivienda',                count: vivienda.length },
            { k:'salarios', label:'Salarios y poder adq.',  count: salarios.length },
            { k:'calend',   label:'Calendario macro',        count: calendario.length },
            { k:'votantes', label:'Perfiles votante',       count: voterProfiles.length },
            { k:'ciclos',   label:'Ciclos históricos',      count: histCycles.length },
            { k:'impacto',  label:'Impacto político',        count: impactoPolitico.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={active ? 'mac-tab-btn mac-tab-btn--active' : 'mac-tab-btn'}
              >
                {t.label} <span className="mac-tab-count">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── Tab · Comparativa UE ───── */}
        {tab === 'comp' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">España vs principales economías UE</h3>
            <p className="mac-section-sub">Datos comparados Q1 2026 · fuentes Eurostat e institutos nacionales</p>
            <div className="mac-table-wrap">
              <table className="mac-table">
                <thead>
                  <tr>
                    {['País','PIB %','Paro %','IPC %','Deuda/PIB','Déficit/PIB','Score relativo'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativa.map((c, i) => {
                    // score sintético: pib alto + paro bajo + ipc cerca de 2 + deuda baja + déficit cerca de 0
                    const score = Math.round(50 + c.pib * 6 - c.paro * 2 - Math.abs(c.ipc - 2) * 4 - (c.deuda - 60) * 0.2 + (c.deficit) * 4)
                    const sCol = score >= 60 ? '#16A34A' : score >= 40 ? '#F97316' : '#DC2626'
                    const rowClass = c.pais === 'España' ? 'mac-table-row--esp' : i % 2 ? 'mac-table-row--alt' : ''
                    return (
                      <tr key={c.pais} className={rowClass}>
                        <td>
                          <div className="mac-table-flagcell">
                            <span className="mac-table-flag" style={{ background: c.c }}>{c.flag}</span>
                            <strong className="mac-table-pais" style={{ fontWeight: c.pais === 'España' ? 800 : 600 }}>{c.pais}</strong>
                          </div>
                        </td>
                        <td className="mac-table-mono" style={{ color: c.pib > 1.5 ? '#16A34A' : c.pib > 0.5 ? '#F97316' : '#DC2626' }}>+{c.pib.toFixed(1)}%</td>
                        <td className="mac-table-mono" style={{ color: c.paro > 8 ? '#DC2626' : '#16A34A' }}>{c.paro.toFixed(1)}%</td>
                        <td className="mac-table-mono" style={{ color: Math.abs(c.ipc - 2) < 0.5 ? '#16A34A' : '#F97316' }}>{c.ipc.toFixed(1)}%</td>
                        <td className="mac-table-mono" style={{ color: c.deuda > 100 ? '#DC2626' : c.deuda > 80 ? '#F97316' : '#16A34A' }}>{c.deuda.toFixed(1)}%</td>
                        <td className="mac-table-mono" style={{ color: c.deficit > -3 ? '#16A34A' : '#DC2626' }}>{c.deficit.toFixed(1)}%</td>
                        <td>
                          <div className="mac-table-score-wrap">
                            <div className="mac-table-score-track">
                              <div className="mac-table-score-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: sCol }}/>
                            </div>
                            <span className="mac-table-score-num" style={{ color: sCol }}>{score}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* IPC Components + Sectores PIB */}
            <div className="mac-ipc-grid">
              <div>
                <h4 className="mac-ipc-h4">IPC por componentes · marzo 2026</h4>
                <div className="mac-ipc-list">
                  {[...ipcComp].sort((a,b) => b.val - a.val).map(c => {
                    const col = c.val >= 4 ? '#DC2626' : c.val >= 2.5 ? '#F97316' : '#16A34A'
                    return (
                      <div key={c.cat} className="mac-ipc-row">
                        <span className="mac-ipc-cat">{c.cat}</span>
                        <div className="mac-ipc-bar-track">
                          <div className="mac-ipc-bar-fill" style={{ width: `${(c.val / 7) * 100}%`, background: col }}/>
                        </div>
                        <span className="mac-ipc-val" style={{ color: col }}>{c.val.toFixed(1)}%</span>
                        <span className="mac-ipc-peso">{c.peso}</span>
                      </div>
                    )
                  })}
                  <div className="mac-ipc-footer-row">
                    <span className="mac-ipc-footer-label">Variación</span>
                    <span/>
                    <span/>
                    <span className="mac-ipc-footer-peso">peso</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mac-ipc-h4">Estructura del PIB por sectores</h4>
                <div className="mac-sec-stack">
                  {sectores.map(s => (
                    <div
                      key={s.sector}
                      title={`${s.sector}: ${s.pct}%`}
                      className="mac-sec-stack-seg"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    >{s.pct >= 8 ? `${s.pct}%` : ''}</div>
                  ))}
                </div>
                <div className="mac-sec-list">
                  {sectores.map(s => (
                    <div key={s.sector} className="mac-sec-row">
                      <span className="mac-sec-dot" style={{ background: s.color }}/>
                      <span className="mac-sec-name">{s.sector}</span>
                      <span className="mac-sec-pct" style={{ color: s.color }}>{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───── Tab · Mercados ───── */}
        {tab === 'mercados' && (
          <section className="mac-mercados-grid">
            {mercados.map(m => {
              const isPos = m.delta.startsWith('+')
              return (
                <article key={m.l} className="mac-mercado-card" style={{ borderLeft: `3px solid ${m.color}` }}>
                  <div className="mac-mercado-head">
                    <span className="mac-mercado-label">{m.l}</span>
                    <span className="mac-mercado-delta" style={{ color: isPos ? '#16A34A' : '#DC2626' }}>{isPos ? '▲' : '▼'} {m.delta}</span>
                  </div>
                  <div className="mac-mercado-value" style={{ color: m.color }}>{m.v}</div>
                  <Sparkline data={m.serie} color={m.color} h={32}/>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── Tab · Vivienda ───── */}
        {tab === 'vivienda' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Mercado de la vivienda · 2026</h3>
            <p className="mac-section-sub">Precios, esfuerzo, hipotecas y oferta · fuentes BdE, Tinsa, INE y Fotocasa</p>
            <div className="mac-v-grid">
              {vivienda.map(v => (
                <div key={v.l} className="mac-v-card">
                  <p className="mac-v-label">{v.l}</p>
                  <div className="mac-v-row">
                    <span className="mac-v-value" style={{ color: v.c }}>{v.v}</span>
                  </div>
                  <p className="mac-v-sub">{v.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Salarios ───── */}
        {tab === 'salarios' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Salarios y poder adquisitivo</h3>
            <p className="mac-section-sub">SMI, mediano, brecha de género y pérdida acumulada · fuentes INE, Hacienda y Trabajo</p>
            <div className="mac-v-grid">
              {salarios.map(s => (
                <div key={s.l} className="mac-v-card">
                  <p className="mac-v-label">{s.l}</p>
                  <div className="mac-v-value" style={{ color: s.c }}>{s.v}</div>
                  <p className="mac-v-sub">{s.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Calendario macro ───── */}
        {tab === 'calend' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Calendario macro · próximas publicaciones</h3>
            <p className="mac-section-sub">Datos económicos relevantes en los próximos 30 días</p>
            <div className="mac-cal-list">
              {calendario.map((c, i) => (
                <div key={i} className="mac-cal-row" style={{ borderLeft: `3px solid ${c.color}` }}>
                  <div className="mac-cal-fecha">{c.fecha}</div>
                  <div className="mac-cal-publi">{c.publi}</div>
                  <div className="mac-cal-org">{c.org}</div>
                  <span className="mac-cal-impacto" style={{ background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}40` }}>IMPACTO {c.impacto}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Perfiles votante ───── */}
        {tab === 'votantes' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Perfiles de votante · sensibilidad económica</h3>
            <p className="mac-section-sub">Cómo afectan las variables económicas a cada arquetipo</p>
            <div className="mac-vot-grid">
              {voterProfiles.map(p => (
                <article key={p.nombre} className="mac-vot-card" style={{ border: `1px solid ${p.c}40`, borderLeft: `3px solid ${p.c}` }}>
                  <div className="mac-vot-name" style={{ color: p.c }}>{p.nombre}</div>
                  <div className="mac-vot-grid2">
                    <span className="mac-vot-key">Renta</span>
                    <span className="mac-vot-val">{p.renta}K€</span>
                    <span className="mac-vot-key">Alquiler</span>
                    <span className="mac-vot-val">{p.alquiler}</span>
                    <span className="mac-vot-key">Hipoteca</span>
                    <span className="mac-vot-val">{p.hipoteca}</span>
                    <span className="mac-vot-key">Ahorro/mes</span>
                    <span className="mac-vot-val">{p.ahorro}€</span>
                  </div>
                  <div className="mac-vot-sens-label">Sensibilidad (1-10)</div>
                  {Object.entries(p.sens).map(([k, v]) => (
                    <div key={k} className="mac-vot-sens-row">
                      <span className="mac-vot-sens-key">{k}</span>
                      <div className="mac-vot-sens-track">
                        <div className="mac-vot-sens-fill" style={{ width: `${v * 10}%`, background: p.c }}/>
                      </div>
                      <span className="mac-vot-sens-val" style={{ color: p.c }}>{v}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Ciclos históricos ───── */}
        {tab === 'ciclos' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Ciclos electorales históricos · economía y resultado</h3>
            <p className="mac-section-sub">Lecciones empíricas de la relación entre coyuntura económica y voto</p>
            <div className="mac-table-wrap">
              <table className="mac-table mac-table-ciclo">
                <thead>
                  <tr>
                    {['Elec.','Paro %','IPC %','PIB %','Gobernante','Ganador','Esc.','Lección'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {histCycles.map((c, i) => (
                    <tr key={c.elec} className={i % 2 ? 'mac-table-row--alt' : ''}>
                      <td className="mac-table-ciclo-anyo">{c.elec}</td>
                      <td className="mac-table-mono" style={{ color: c.paro > 15 ? '#DC2626' : '#16A34A' }}>{c.paro}%</td>
                      <td className="mac-table-mono" style={{ color: c.ipc > 5 ? '#DC2626' : '#3a3a3d' }}>{c.ipc}%</td>
                      <td className="mac-table-mono" style={{ color: c.pib > 0 ? '#16A34A' : '#DC2626' }}>{c.pib > 0 ? '+' : ''}{c.pib}%</td>
                      <td className="mac-table-ciclo-gob">{c.gobernante}</td>
                      <td className="mac-table-ciclo-gan">{c.ganador}</td>
                      <td className="mac-table-ciclo-esc">{c.escanos}</td>
                      <td className="mac-table-ciclo-lec">{c.leccion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── Tab · Impacto político ───── */}
        {tab === 'impacto' && (
          <section className="mac-section-card">
            <h3 className="mac-section-h3">Impacto político por variable económica</h3>
            <p className="mac-section-sub">Variación estimada de intención de voto (pp) ante cada cambio · modelo Politeia</p>
            <table className="mac-table mac-table-impacto">
              <thead>
                <tr>
                  {['Variable','PSOE','PP','VOX','Sumar','Tendencia neta'].map(h => (
                    <th key={h} className="mac-th--center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impactoPolitico.map((row, i) => {
                  const valencia = (row.psoe + row.sumar) - (row.pp + row.vox)
                  return (
                    <tr key={i} className={i % 2 ? 'mac-table-row--alt' : ''}>
                      <td className="mac-impacto-varcell">
                        <span className="mac-impacto-var-inner">
                          <span className="mac-impacto-vardot" style={{ background: row.c }}/>
                          {row.var}
                        </span>
                      </td>
                      <DeltaCell v={row.psoe} color="#E1322D"/>
                      <DeltaCell v={row.pp}   color="#1F4E8C"/>
                      <DeltaCell v={row.vox}  color="#5BA02E"/>
                      <DeltaCell v={row.sumar}color="#D43F8D"/>
                      <td className="mac-impacto-valencia-cell">
                        <span
                          className="mac-impacto-valencia"
                          style={{
                            background: valencia > 0 ? '#16A34A15' : '#DC262615',
                            color: valencia > 0 ? '#16A34A' : '#DC2626',
                            border: `1px solid ${valencia > 0 ? '#16A34A40' : '#DC262640'}`,
                          }}
                        >{valencia > 0 ? 'FAVORECE GOBIERNO' : 'FAVORECE OPOSICIÓN'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Macro & Financial dashboard (live international data) ── */}
        <MacroFinanceDashboard/>

        {/* ── Markets snapshot · Finnhub live · ADRs IBEX + US tech + EU + crypto ── */}
        <div style={{ marginTop: 22 }}>
          <MarketSnapshot variant="dashboard" />
        </div>

      </main>
      <footer className="mac-footer">
        Macro-Political &amp; Economic · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function Termometro({ value }: { value: number }) {
  // Gauge semicircular
  const cx = 90, cy = 80, r = 60
  const t = Math.max(0, Math.min(1, value / 100))
  const angleEnd = Math.PI * t
  const xEnd = cx - r * Math.cos(angleEnd)
  const yEnd = cy - r * Math.sin(angleEnd)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${xEnd} ${yEnd}`
  const arcBg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const color = value >= 70 ? '#86EFAC' : value >= 55 ? '#FCD34D' : value >= 40 ? '#FDBA74' : '#FCA5A5'
  return (
    <div className="mac-termo-wrap">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={arcBg} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeLinecap="round"/>
        <path d={arc} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
        <circle cx={xEnd} cy={yEnd} r="6" fill={color}/>
      </svg>
      <div className="mac-termo-num" style={{ color }}>{value}<span className="mac-termo-num-100">/100</span></div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="mac-sectionheader">
      <h2 className="mac-sectionheader-h2">
        <span className="mac-sectionheader-bar" style={{ background: accent }}/>
        {label}
      </h2>
      <span className="mac-sectionheader-count">{count}</span>
    </div>
  )
}

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mac-spark" style={{ height: h }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}

function DeltaCell({ v, color }: { v: number, color: string }) {
  const pos = v >= 0
  const txtColor = pos ? '#16A34A' : '#DC2626'
  return (
    <td className="mac-delta-cell">
      <div className="mac-delta-inner">
        <span className="mac-delta-dot" style={{ background: color }}/>
        <span className="mac-delta-val" style={{ color: txtColor }}>
          {pos ? '+' : ''}{v.toFixed(1)}
        </span>
      </div>
    </td>
  )
}
