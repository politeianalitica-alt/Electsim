'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCompetidores } from '@/hooks/useCompetidores'
import type { Sector, Amenaza, TipoInforme, Competidor } from '@/data/competidores-fixture'
import './competidores.css'

// Helpers · enlaces a fuentes oficiales
const linkPlacsp = (exp: string) => `https://contrataciondelestado.es/wps/portal/lacasilla?expediente=${encodeURIComponent(exp)}`
const linkBOE    = (ref: string) => `https://www.boe.es/buscar/doc.php?id=${encodeURIComponent(ref)}`
const linkCNMV   = (cif: string) => `https://www.cnmv.es/portal/Consultas/EE/RegistrosOficiales.aspx?nif=${encodeURIComponent(cif)}`
const linkBORME  = (cif: string) => `https://www.borme.es/?empresa=${encodeURIComponent(cif)}`

// ─────────────────────────────────────────────────────────────────────────
// UI maps (colores / metadatos visuales)
// ─────────────────────────────────────────────────────────────────────────
const AMENAZA_C: Record<Amenaza, string> = {
  'CRÍTICA':'#DC2626', 'ALTA':'#F97316', 'MEDIA':'#EAB308', 'BAJA':'#0EA5E9',
}
const SECTOR_COLOR: Record<Sector, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C', 'Servicios sociales':'#D43F8D',
}


const ESTADO_REP_COLOR = {
  'Compartido':'#16A34A', 'Generado':'#5B21B6', 'En revisión':'#F97316', 'Borrador':'#6e6e73',
} as Record<string, string>

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function CompetidoresPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { competidores: COMPETIDORES, winLoss: WIN_LOSS, informes: INFORMES_HISTORICO } = useCompetidores()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'perfil' | 'winloss' | 'pricing' | 'historico'>('perfil')

  useEffect(() => {
    if (!selectedId && COMPETIDORES.length > 0) setSelectedId(COMPETIDORES[0].id)
  }, [selectedId, COMPETIDORES])

  const selected = useMemo(
    () => COMPETIDORES.find(c => c.id === selectedId) ?? COMPETIDORES[0],
    [COMPETIDORES, selectedId],
  )

  // Estado del generador de informes
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>('Strategic Profile')
  const [longitud, setLongitud] = useState<'nota' | 'informe'>('nota')   // nota=2pg · informe=10pg
  const [generando, setGenerando] = useState(false)
  const [generado, setGenerado] = useState(false)
  const numPaginas = longitud === 'nota' ? 2 : 10

  function handleGenerar() {
    setGenerando(true)
    setGenerado(false)
    setTimeout(() => { setGenerando(false); setGenerado(true) }, 1400)
  }

  // Cambia competidor → resetea generación
  function handleSelect(id: string) {
    setSelectedId(id)
    setGenerado(false)
  }

  const totals = useMemo(() => {
    const totalAdj = COMPETIDORES.reduce((s, c) => s + c.totalAdj12m, 0)
    const numCriticos = COMPETIDORES.filter(c => c.amenaza === 'CRÍTICA').length
    const numAltos = COMPETIDORES.filter(c => c.amenaza === 'ALTA').length
    const ourWins = WIN_LOSS.filter(w => w.nuestro.includes('GANADOR')).length
    const ourPart = WIN_LOSS.length
    return {
      total: COMPETIDORES.length,
      totalAdj,
      numCriticos,
      numAltos,
      winRate: ourPart > 0 ? Math.round((ourWins / ourPart) * 100) : 0,
      reports: INFORMES_HISTORICO.length,
    }
  }, [COMPETIDORES, WIN_LOSS, INFORMES_HISTORICO])

  if (!selected) {
    return (
      <div className="cm-root">
        <AppHeader/>
        <main className="cm-main">
          <p className="cm-loading-text">Cargando competidores…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="cm-root">
      <AppHeader/>
      <main className="cm-main">

        {/* ───── Hero ───── */}
        <section className="cm-hero">
          <div>
            <p className="cm-hero-eyebrow">
              LICITACIONES Y CONTRATACIÓN PÚBLICA · INTELIGENCIA COMPETITIVA
            </p>
            <h1 className="cm-hero-title">
              {totals.total} competidores · {totals.totalAdj.toLocaleString('es-ES')} M€ <em>en juego</em>
            </h1>
            <p className="cm-hero-subtitle">
              {totals.numCriticos} amenazas críticas · {totals.numAltos} altas · win rate propio <strong className="cm-hero-winrate">{totals.winRate}%</strong>. Generador de informes inteligentes Politeia · perfiles · win/loss · pricing · histórico.
            </p>
          </div>
          <div className="cm-hero-kpis">
            <HeroKPI label="Compet."  value={String(totals.total)}      accent="#A5B4FC"/>
            <HeroKPI label="Críticos" value={String(totals.numCriticos)} accent="#FCA5A5"/>
            <HeroKPI label="Win rate" value={`${totals.winRate}%`}        accent="#86EFAC"/>
            <HeroKPI label="Informes" value={String(totals.reports)}       accent="#FDE68A"/>
          </div>
        </section>

        {/* ───── Selector de competidores ───── */}
        <section className="cm-selector-grid">
          {COMPETIDORES.map(c => {
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`cm-selector-card ${active ? 'cm-selector-card--active' : ''}`}
                style={{
                  // dynamic · color del competidor (data-driven)
                  borderLeft: `4px solid ${c.color}`,
                  borderColor: active ? c.color : undefined,
                  boxShadow: active ? `0 0 0 3px ${c.color}22` : undefined,
                }}
              >
                <div className="cm-selector-icon" style={{ background: c.color /* dynamic */ }}>
                  {c.iniciales}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="cm-selector-name">{c.nombre}</div>
                  <div className="cm-selector-meta">{c.totalAdj12m}M€ · 12m</div>
                </div>
                <span className="cm-selector-amenaza" style={{ background: AMENAZA_C[c.amenaza] /* dynamic */ }}>
                  {c.amenaza}
                </span>
              </button>
            )
          })}
        </section>

        {/* ───── Enlaces a fuentes oficiales del competidor seleccionado ───── */}
        <section
          className="cm-sources-bar"
          style={{ border: `1px solid ${selected.color}30` /* dynamic · matiz del color del competidor */ }}
        >
          <span className="cm-sources-label">Fuentes oficiales · {selected.nombre}:</span>
          <SourceLink href={selected.web}                        label="Web corporativa"     color={selected.color}/>
          {selected.cnmv     && <SourceLink href={selected.cnmv}     label="Ficha CNMV"          color="#1F4E8C"/>}
          <SourceLink href={linkBORME(selected.cif)}              label={`BORME · ${selected.cif}`} color="#5B21B6"/>
          <SourceLink href={`https://contrataciondelestado.es/wps/portal/lacasilla?proveedor=${encodeURIComponent(selected.cif)}`} label="PLACSP · histórico"   color="#0F766E"/>
          {selected.linkedin && <SourceLink href={selected.linkedin} label="LinkedIn"            color="#0EA5E9"/>}
          <SourceLink href={`https://www.google.com/search?q=${encodeURIComponent(selected.nombre + ' adjudicaciones')}&tbm=nws`} label="Prensa · Google News" color="#525258"/>
        </section>

        {/* ───── Generador de informes Politeia (módulo principal) ───── */}
        <section className="cm-generator">
          <div className="cm-generator-glow" />
          <div className="cm-generator-inner">
            <div className="cm-generator-header">
              <div>
                <p className="cm-generator-eyebrow">
                  GENERADOR POLITEIA · INFORMES DE 2 PÁGINAS
                </p>
                <h2 className="cm-generator-title">
                  Inteligencia automatizada sobre <span className="cm-generator-title-accent">{selected.nombre}</span>
                </h2>
                <p className="cm-generator-subtitle">Briefing táctico generado en menos de 30 segundos · listo para imprimir o compartir</p>
              </div>
              <div className="cm-generator-modelo-block">
                <span className="cm-generator-modelo-label">Modelo activo</span>
                <span className="cm-generator-modelo-value">Politeia AI · v3.2</span>
              </div>
            </div>

            {/* Selector longitud · NOTA vs INFORME */}
            <div className="cm-generator-row">
              <span className="cm-generator-row-label">Longitud:</span>
              <div className="cm-generator-segment">
                {[
                  { k: 'nota'    as const, label: 'NOTA',    pages: '2 páginas',  desc: 'Briefing táctico' },
                  { k: 'informe' as const, label: 'INFORME', pages: '10 páginas', desc: 'Análisis completo' },
                ].map(o => {
                  const active = longitud === o.k
                  return (
                    <button
                      key={o.k}
                      onClick={() => { setLongitud(o.k); setGenerado(false) }}
                      className={`cm-generator-segment-btn ${active ? 'cm-generator-segment-btn--active' : ''}`}
                    >
                      <span>{o.label}</span>
                      <span className="cm-generator-segment-btn-meta">· {o.pages}</span>
                    </button>
                  )
                })}
              </div>
              <span className="cm-generator-row-hint">
                {longitud === 'nota'
                  ? 'Resumen ejecutivo en 2 páginas — listo para imprimir'
                  : 'Análisis profundo en 10 páginas — financiero, equipo, riesgos y estrategia'}
              </span>
            </div>

            {/* Selector tipo + botón */}
            <div className="cm-generator-row">
              <span className="cm-generator-row-label">Tipo:</span>
              <div className="cm-generator-segment">
                {(['Strategic Profile', 'Due Diligence', 'Win/Loss Analysis', 'Bid Intelligence', 'Executive Briefing'] as TipoInforme[]).map(t => {
                  const active = tipoInforme === t
                  return (
                    <button
                      key={t}
                      onClick={() => { setTipoInforme(t); setGenerado(false) }}
                      className={`cm-generator-segment-btn ${active ? 'cm-generator-segment-btn--active' : ''}`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleGenerar}
                disabled={generando}
                className="cm-btn-cta"
              >
                {generando ? 'GENERANDO…' : generado ? 'REGENERAR' : `GENERAR ${longitud === 'nota' ? 'NOTA' : 'INFORME'}`}
              </button>
              <button className="cm-btn-secondary">Descargar PDF · {numPaginas}p</button>
            </div>
          </div>
        </section>

        {/* ───── Preview del informe (2 o 10 páginas) ───── */}
        {(generado || generando) && (
          <section style={{ marginBottom: 18 /* preview wrapper · sin estilo más */ }}>
            <SectionHeader
              label={`Preview · ${numPaginas} páginas`}
              count={`${tipoInforme} · ${selected.nombre}`}
              accent="#5B21B6"
            />
            <div className="cm-preview-grid">
              {generando ? (
                Array.from({ length: numPaginas }).map((_, i) => <SkeletonPage key={i} num={i+1} total={numPaginas}/>)
              ) : longitud === 'nota' ? (
                <>
                  <ReportPage1 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage2 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                </>
              ) : (
                <>
                  <ReportPage1 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage2 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage3 selected={selected}/>
                  <ReportPage4 selected={selected}/>
                  <ReportPage5 selected={selected}/>
                  <ReportPage6 selected={selected}/>
                  <ReportPage7 selected={selected}/>
                  <ReportPage8 selected={selected}/>
                  <ReportPage9 selected={selected}/>
                  <ReportPage10 selected={selected}/>
                </>
              )}
            </div>
          </section>
        )}

        {/* ───── Tabs analíticas ───── */}
        <div className="cm-tabs">
          {([
            { k: 'perfil',    label: 'Perfil completo',       count: 0 },
            { k: 'winloss',   label: 'Win/Loss tracker',      count: WIN_LOSS.length },
            { k: 'pricing',   label: 'Pricing intelligence',  count: COMPETIDORES.length },
            { k: 'historico', label: 'Histórico de informes', count: INFORMES_HISTORICO.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`cm-tab-btn ${active ? 'cm-tab-btn--active' : ''}`}
              >
                {t.label}
                {t.count > 0 && <span className="cm-tab-count">{t.count}</span>}
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Perfil completo ───── */}
        {tab === 'perfil' && (
          <section className="cm-section-card">
            <div className="cm-perfil-grid">
              <div>
                <h3 className="cm-perfil-h3 cm-perfil-h3--fortalezas">Fortalezas</h3>
                <ul className="cm-perfil-ul">
                  {selected.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <h3 className="cm-perfil-h3 cm-perfil-h3--debilidades">Debilidades</h3>
                <ul className="cm-perfil-ul cm-perfil-ul--last">
                  {selected.debilidades.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="cm-perfil-h3 cm-perfil-h3--oportunidades">Oportunidades para nosotros</h3>
                <ul className="cm-perfil-ul">
                  {selected.oportunidadesNos.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <h3 className="cm-perfil-h3 cm-perfil-h3--amenazas">Amenazas que plantean</h3>
                <ul className="cm-perfil-ul cm-perfil-ul--last">
                  {selected.amenazasNos.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </div>
            <div className="cm-recent-block">
              <h3 className="cm-recent-h3">Adjudicaciones recientes</h3>
              <table className="cm-table">
                <thead>
                  <tr>
                    {['Fecha', 'Expediente', 'Título', 'Importe', 'Fuente'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.recientesAdj.map((r, i) => (
                    <tr key={i}>
                      <td className="cm-table-mono">{r.fecha}</td>
                      <td className="cm-table-mono--muted">{r.exp}</td>
                      <td className="cm-table-title">{r.titulo}</td>
                      <td className="cm-table-mono cm-table-amount" style={{ color: selected.color /* dynamic */ }}>
                        {r.importe.toFixed(1)}M€
                      </td>
                      <td>
                        <SourceIcon href={linkPlacsp(r.exp)} label="PLACSP" color={selected.color}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Win/Loss ───── */}
        {tab === 'winloss' && (
          <section className="cm-section-card cm-section-card--clip">
            <div className="cm-section-header">
              <h3>Histórico head-to-head · últimas 8 licitaciones</h3>
              <span className="cm-section-header-meta">
                Win rate propio: <strong style={{ color: 'var(--color-success)' }}>{totals.winRate}%</strong>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="cm-table" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    {['Expediente', 'Licitación', 'Ganador', 'Posición nuestra', 'Baja ganador', 'Baja nuestra', 'Diff', 'Fuente'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WIN_LOSS.map((w, i) => {
                    const won = w.nuestro.includes('GANADOR')
                    const diff = w.bajaNuestra - w.bajaGanador
                    return (
                      <tr key={i} className={won ? 'cm-table-row--won' : (i % 2 ? 'cm-table-row--alt' : undefined)}>
                        <td className="cm-table-mono--muted">{w.exp}</td>
                        <td className="cm-table-title">{w.titulo}</td>
                        <td className="cm-table-title" style={{ color: won ? 'var(--color-success)' : undefined }}>{w.ganador}</td>
                        <td>
                          <span className={`cm-wl-badge ${won ? 'cm-wl-badge--won' : ''}`}>
                            {w.nuestro.toUpperCase()}
                          </span>
                        </td>
                        <td className="cm-table-mono">{w.bajaGanador.toFixed(2)}%</td>
                        <td className="cm-table-mono">{w.bajaNuestra > 0 ? `${w.bajaNuestra.toFixed(2)}%` : '—'}</td>
                        <td
                          className="cm-table-mono"
                          style={{
                            color: diff > 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-danger)' : 'var(--color-ink-4)',
                          }}
                        >
                          {w.bajaNuestra > 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} pp` : '—'}
                        </td>
                        <td>
                          <SourceIcon href={linkPlacsp(w.exp)} label="PLACSP" color="#5B21B6"/>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Pricing intelligence ───── */}
        {tab === 'pricing' && (
          <section className="cm-section-card cm-section-card--clip">
            <div className="cm-section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <h3>Pricing intelligence · estrategia de bajas y modificados</h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>
                Comportamiento histórico de cada competidor para anticipar su oferta
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="cm-table" style={{ minWidth: 880 }}>
                <thead>
                  <tr>
                    {['#', 'Competidor', 'Win rate', 'Baja media', '% Modificados', 'Estrategia detectada'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...COMPETIDORES].sort((a, b) => b.winRate - a.winRate).map((c, i) => {
                    const estrategia =
                      c.bajaMedia > 7 ? 'Agresiva en precio'
                      : c.bajaMedia > 4 ? 'Moderada'
                      : 'Defensiva precio · alta especialización'
                    const estCol =
                      c.bajaMedia > 7 ? '#16A34A'
                      : c.bajaMedia > 4 ? '#F97316'
                      : '#DC2626'
                    const wrCol =
                      c.winRate >= 35 ? 'var(--color-danger)'
                      : c.winRate >= 25 ? 'var(--color-warn)'
                      : 'var(--color-success)'
                    return (
                      <tr key={c.id} className={i % 2 ? 'cm-table-row--alt' : undefined}>
                        <td className="cm-table-mono" style={{ fontWeight: 800 }}>{i + 1}</td>
                        <td>
                          <div className="cm-pricing-row-flex" style={{ gap: 9 }}>
                            <span style={{ width: 3, height: 18, background: c.color /* dynamic */, borderRadius: 1 }}/>
                            <span className="cm-table-title">{c.nombre}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cm-pricing-row-flex">
                            <div className="cm-pricing-bar-track">
                              <div
                                className="cm-pricing-bar-fill"
                                style={{ width: `${c.winRate * 2}%` /* dynamic */, background: wrCol }}
                              />
                            </div>
                            <span className="cm-pricing-row-value" style={{ color: wrCol }}>
                              {c.winRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="cm-table-mono" style={{ color: estCol /* dynamic · estrategia */ }}>
                          {c.bajaMedia.toFixed(1)}%
                        </td>
                        <td
                          className="cm-table-mono"
                          style={{ color: c.modificadosPct > 12 ? 'var(--color-danger)' : 'var(--color-ink-2)' }}
                        >
                          {c.modificadosPct}%
                        </td>
                        <td>
                          <span
                            className="cm-estrategia-pill"
                            style={{
                              background: `${estCol}15`,
                              color: estCol,
                              border: `1px solid ${estCol}40`,
                            }}
                          >
                            {estrategia.toUpperCase()}
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

        {/* ───── TAB · Histórico de informes ───── */}
        {tab === 'historico' && (
          <section className="cm-section-card cm-section-card--tight">
            <div className="cm-section-header" style={{ padding: 0, borderBottom: 'none', marginBottom: 14 }}>
              <h3>Informes generados · biblioteca</h3>
              <span className="cm-section-header-meta">{INFORMES_HISTORICO.length} informes generados con Politeia AI v3.2</span>
            </div>
            <div className="cm-historico-grid">
              {INFORMES_HISTORICO.map(r => {
                const c = COMPETIDORES.find(x => x.nombre === r.competidor)
                const cColor = c?.color || '#5B21B6'  // dynamic · color del competidor
                return (
                  <article
                    key={r.id}
                    className="cm-historico-card"
                    style={{ borderLeft: `3px solid ${cColor}` /* dynamic */ }}
                  >
                    <div
                      className="cm-historico-pages"
                      style={{
                        background: `${cColor}10`,
                        color: cColor,
                        border: `1px solid ${cColor}40`,
                      }}
                    >
                      {r.paginas}p
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="cm-historico-tipo">{r.tipo.toUpperCase()}</span>
                      </div>
                      <div className="cm-historico-name">{r.competidor}</div>
                      <div className="cm-historico-meta">{r.fecha} · {r.autor}</div>
                    </div>
                    <div className="cm-historico-actions">
                      <span
                        className="cm-historico-status"
                        style={{
                          background: `${ESTADO_REP_COLOR[r.estado]}15`,
                          color: ESTADO_REP_COLOR[r.estado],
                          border: `1px solid ${ESTADO_REP_COLOR[r.estado]}40`,
                        }}
                      >
                        {r.estado.toUpperCase()}
                      </span>
                      <a
                        href={`#download-${r.id}`}
                        title="Descargar PDF"
                        className="cm-historico-download"
                        style={{
                          background: `${cColor}10`,
                          color: cColor,
                          border: `1px solid ${cColor}40`,
                        }}
                      >
                        Descargar
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M4.5 1v5m0 0L2 4M4.5 6L7 4M1.5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

      </main>
      <footer className="cm-footer">
        Inteligencia Competitiva · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componentes del informe (simulación visual de páginas A4)
// ─────────────────────────────────────────────────────────────────────────
function SkeletonPage({ num, total }: { num: number, total: number }) {
  return (
    <div className="cm-rep-page cm-rep-page--wide-pad cm-rep-page--no-flex">
      <div className="cm-rep-skeleton-shine"/>
      <div className="cm-rep-skeleton-bar" style={{ height: 14, width: '70%', marginBottom: 18 }}/>
      <div className="cm-rep-skeleton-bar" style={{ height: 24, width: '90%', marginBottom: 18 }}/>
      <div className="cm-rep-skeleton-bar--sm" style={{ height: 6, width: '100%', marginBottom: 7 }}/>
      <div className="cm-rep-skeleton-bar--sm" style={{ height: 6, width: '95%', marginBottom: 7 }}/>
      <div className="cm-rep-skeleton-bar--sm" style={{ height: 6, width: '80%', marginBottom: 18 }}/>
      <div className="cm-rep-skeleton-bar" style={{ height: 120, width: '100%', borderRadius: 8, marginBottom: 14 }}/>
      <div className="cm-rep-skeleton-bar--sm" style={{ height: 6, width: '70%' }}/>
      <div style={{ position: 'absolute', bottom: 14, right: 18, fontSize: 9, fontWeight: 700, color: 'var(--color-ink-4)' }}>Página {num}/{total}</div>
    </div>
  )
}

function ReportPage1({ selected, tipo, total }: { selected: Competidor, tipo: TipoInforme, total: number }) {
  return (
    <div className="cm-rep-page">
      {/* Cabecera */}
      <div className="cm-rep-header" style={{ borderBottom: `2px solid ${selected.color}` }}>
        <div>
          <div className="cm-rep-eyebrow" style={{ color: selected.color }}>POLITEIA · {tipo.toUpperCase()}</div>
          <div className="cm-rep-title-main">{selected.nombre}</div>
          <div className="cm-rep-meta">CIF {selected.cif} · {selected.paisMatriz} · {selected.empleados} empleados</div>
        </div>
        <div className="cm-rep-iconbox" style={{ background: selected.color }}>{selected.iniciales}</div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="cm-rep-section">
        <div className="cm-rep-section-label" style={{ color: selected.color }}>Executive summary</div>
        <p className="cm-rep-text-p">
          {selected.nombre} ({selected.paisMatriz}) facturó {selected.facturacion} en el último ejercicio con una capitalización de {selected.capitalizacion}. En los últimos 12 meses ha logrado {selected.numAdj12m} adjudicaciones por {selected.totalAdj12m}M€ con un win rate del {selected.winRate}% y una baja media del {selected.bajaMedia}%. Nivel de amenaza estimado: <strong style={{ color: AMENAZA_C[selected.amenaza] }}>{selected.amenaza}</strong>.
        </p>
      </div>

      {/* KPIs */}
      <div className="cm-rep-kpi-grid-4">
        <ReportKpi label="Adjudicado 12m" value={`${selected.totalAdj12m}M€`} color={selected.color}/>
        <ReportKpi label="Win rate"        value={`${selected.winRate}%`}     color="#16A34A"/>
        <ReportKpi label="Baja media"      value={`${selected.bajaMedia}%`}    color="#F97316"/>
        <ReportKpi label="% Modificados"   value={`${selected.modificadosPct}%`} color={selected.modificadosPct >= 12 ? '#DC2626' : '#0EA5E9'}/>
      </div>

      {/* Sectores */}
      <div className="cm-rep-section">
        <div className="cm-rep-section-label" style={{ color: selected.color }}>Presencia sectorial</div>
        <div className="cm-rep-tags-row">
          {selected.sectores.map(s => (
            <span key={s} className="cm-rep-tag"
              style={{ background: `${SECTOR_COLOR[s]}15`, color: SECTOR_COLOR[s], border: `1px solid ${SECTOR_COLOR[s]}40` }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Equipo directivo y operativo */}
      <div className="cm-rep-section">
        <div className="cm-rep-section-label" style={{ color: selected.color }}>Equipo clave</div>
        <table className="cm-rep-team-table">
          <tbody>
            <tr><td>Presidente</td><td>{selected.presidente}</td></tr>
            <tr><td>{selected.ceoCargo}</td><td>{selected.ceo}</td></tr>
            <tr><td>Captura de Negocio</td><td className="cm-rep-team-td-sm">{selected.jefeCBD}</td></tr>
            <tr><td>Equipo licitaciones</td><td className="cm-rep-team-td-sm">{selected.equipoLicitaciones}</td></tr>
            <tr><td>Bids activos</td><td>{selected.bidsActivos} licitaciones</td></tr>
          </tbody>
        </table>
      </div>

      {/* Adjudicaciones recientes */}
      <div className="cm-rep-spread">
        <div className="cm-rep-section-label" style={{ color: selected.color }}>Adjudicaciones recientes</div>
        {selected.recientesAdj.map((r, i) => (
          <div key={i} className="cm-rep-adj-row">
            <span className="cm-rep-adj-title">{r.titulo}</span>
            <span className="cm-rep-adj-mono" style={{ color: selected.color }}>{r.importe.toFixed(1)}M€ · {r.fecha}</span>
            <a href={linkPlacsp(r.exp)} target="_blank" rel="noopener noreferrer" title={`PLACSP ${r.exp}`}
               className="cm-rep-source-pill"
               style={{ background: `${selected.color}15`, color: selected.color, border: `1px solid ${selected.color}40` }}>↗ PLACSP</a>
          </div>
        ))}
      </div>
      <div className="cm-rep-tags-footer">
        <SourceTag href={selected.web}                    label="web"      color={selected.color}/>
        {selected.cnmv && <SourceTag href={selected.cnmv} label="CNMV"      color="#1F4E8C"/>}
        <SourceTag href={linkBORME(selected.cif)}          label="BORME"    color="#5B21B6"/>
      </div>

      <div className="cm-rep-footer">
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página 1/{total}</span>
      </div>
    </div>
  )
}

function ReportPage2({ selected, tipo, total }: { selected: Competidor, tipo: TipoInforme, total: number }) {
  return (
    <div className="cm-rep-page cm-rep-page--no-flex">
      <div className="cm-rep-header--tight" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${selected.color}40` }}>
        <div className="cm-rep-header-trim" style={{ color: selected.color }}>{selected.nombre} · {tipo}</div>
        <div className="cm-rep-meta-sm">cont. página 2</div>
      </div>

      {/* DAFO 2x2 */}
      <div className="cm-rep-dafo-grid">
        <DAFOBlock label="Fortalezas"   items={selected.fortalezas}        color="#16A34A"/>
        <DAFOBlock label="Debilidades"  items={selected.debilidades}       color="#DC2626"/>
        <DAFOBlock label="Oport. NS"    items={selected.oportunidadesNos}  color="#5B21B6"/>
        <DAFOBlock label="Amenazas"     items={selected.amenazasNos}       color="#F97316"/>
      </div>

      {/* Recomendaciones tácticas */}
      <div className="cm-rep-tip-box" style={{ background: `${selected.color}08`, border: `1px solid ${selected.color}30` }}>
        <div className="cm-rep-tip-label" style={{ color: selected.color }}>Recomendaciones tácticas Politeia</div>
        <ol className="cm-rep-tip-ol">
          <li>Enfocar bajas agresivas (&gt;{(selected.bajaMedia + 2).toFixed(1)}%) en lotes donde {selected.iniciales} compite habitualmente.</li>
          <li>Aprovechar su {selected.modificadosPct >= 12 ? 'alto índice de modificados' : 'rigidez en ofertas'} para diferenciar nuestra oferta técnica.</li>
          <li>Posicionar nuestras capacidades sectoriales fuera de su zona de hegemonía: {selected.sectores.join(', ')}.</li>
          <li>Vigilar movimientos de su equipo de licitaciones · {selected.bidsActivos} bids activos detectados.</li>
        </ol>
      </div>

      {/* Pricing matrix */}
      <div className="cm-rep-section--tight">
        <div className="cm-rep-section-label" style={{ color: selected.color }}>Análisis de pricing</div>
        <table className="cm-rep-mtable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Métrica</th>
              <th className="cm-rep-mtable-right">{selected.iniciales}</th>
              <th className="cm-rep-mtable-right">Mercado</th>
              <th className="cm-rep-mtable-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Win rate</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>{selected.winRate}%</td><td className="cm-rep-mtable-right">30%</td><td className="cm-rep-mtable-right" style={{ color: selected.winRate > 30 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{selected.winRate > 30 ? '+' : ''}{(selected.winRate - 30).toFixed(1)}</td></tr>
            <tr><td>Baja media</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>{selected.bajaMedia}%</td><td className="cm-rep-mtable-right">5.8%</td><td className="cm-rep-mtable-right" style={{ color: selected.bajaMedia < 5.8 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{(selected.bajaMedia - 5.8).toFixed(1)}</td></tr>
            <tr><td>% Modificados</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>{selected.modificadosPct}%</td><td className="cm-rep-mtable-right">11.2%</td><td className="cm-rep-mtable-right" style={{ color: selected.modificadosPct > 11.2 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{(selected.modificadosPct - 11.2).toFixed(1)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="cm-rep-note-box">
        <strong style={{ color: selected.color }}>Nota Politeia:</strong> este informe se ha generado a partir de fuentes públicas (PLACSP, BOE, TED, registros mercantiles, prensa especializada) cruzadas con histórico interno. Recomendamos validar puntos críticos con el equipo de Captura de Negocio antes de tomar decisiones estratégicas.
      </div>

      <div className="cm-rep-footer">
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página 2/{total}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Páginas 3-10 · solo se renderizan en modo INFORME (10 páginas)
// ─────────────────────────────────────────────────────────────────────────
function ReportShell({ selected, num, title, children }: { selected: Competidor, num: number, title: string, children: React.ReactNode }) {
  return (
    <div className="cm-rep-page">
      <div className="cm-rep-header--tight" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${selected.color}40` }}>
        <div>
          <div className="cm-rep-eyebrow" style={{ color: selected.color }}>POLITEIA · {selected.iniciales} · INFORME EXTENDIDO</div>
          <div className="cm-rep-title-sub">{title}</div>
        </div>
        <div className="cm-rep-iconbox--sm cm-rep-iconbox"
             style={{ background: `${selected.color}10`, color: selected.color, border: `1px solid ${selected.color}40` }}>{num}</div>
      </div>
      <div style={{ flex: 1, fontSize: 9.5, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>{children}</div>
      <div className="cm-rep-footer">
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página {num}/10</span>
      </div>
    </div>
  )
}

function ReportPage3({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={3} title="Análisis financiero detallado">
      <div className="cm-rep-kpi-grid-2">
        <ReportKpi label="Facturación"        value={selected.facturacion}      color={selected.color}/>
        <ReportKpi label="Capitalización"      value={selected.capitalizacion}  color={selected.color}/>
        <ReportKpi label="Empleados"           value={selected.empleados}        color="#5B21B6"/>
        <ReportKpi label="País matriz"         value={selected.paisMatriz}       color="#0EA5E9"/>
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Estructura de ingresos</div>
      <table className="cm-rep-mtable" style={{ marginBottom: 10 }}>
        <thead><tr style={{ borderBottom: `1px solid ${selected.color}30` }}><th style={{ textAlign: 'left' }}>Concepto</th><th className="cm-rep-mtable-right">%</th><th className="cm-rep-mtable-right">Tendencia</th></tr></thead>
        <tbody>
          <tr><td>Adjudicaciones públicas España</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>42%</td><td className="cm-rep-mtable-right" style={{ color: '#16A34A', fontWeight: 700 }}>▲ +4 pp</td></tr>
          <tr><td>Mercados internacionales</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>32%</td><td className="cm-rep-mtable-right" style={{ color: '#16A34A', fontWeight: 700 }}>▲ +2 pp</td></tr>
          <tr><td>Sector privado nacional</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>18%</td><td className="cm-rep-mtable-right" style={{ color: '#DC2626', fontWeight: 700 }}>▼ −3 pp</td></tr>
          <tr><td>Concesiones largo plazo</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700, color: selected.color }}>8%</td><td className="cm-rep-mtable-right" style={{ color: 'var(--color-ink-4)', fontWeight: 700 }}>→ estable</td></tr>
        </tbody>
      </table>
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Indicadores financieros clave</div>
      <ul className="cm-rep-ul">
        <li>Margen EBITDA estimado · 8.4% (mediana sector: 7.2%)</li>
        <li>ROE consolidado · 12.6%</li>
        <li>Ratio deuda/EBITDA · 2.1x (zona conservadora)</li>
        <li>Liquidez (cash &amp; equivalentes) · 1.8 mil M€</li>
        <li>Calificación crediticia · BBB+ estable (S&amp;P)</li>
        <li>Dividendo último ejercicio · 0.85 €/acción</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage4({ selected }: { selected: Competidor }) {
  const fakeAdj = [
    ...selected.recientesAdj,
    { exp:'2025/MIN-INF-002', titulo:'Conservación A-2 Madrid-Zaragoza', importe: 84.4, fecha:'12/12/2025' },
    { exp:'2025/AYT-VAL-EDU', titulo:'Modernización colegios Valencia',  importe: 28.6, fecha:'04/11/2025' },
    { exp:'2025/MIN-DEF-LOG', titulo:'Logística operativa militar',       importe: 42.1, fecha:'18/10/2025' },
    { exp:'2025/AND-AGUA',   titulo:'Plan agua reuse Andalucía',          importe: 56.0, fecha:'30/09/2025' },
  ]
  return (
    <ReportShell selected={selected} num={4} title="Histórico de adjudicaciones · 12 meses">
      <table className="cm-rep-adjt">
        <thead><tr style={{ borderBottom: `1px solid ${selected.color}30` }}>
          <th style={{ textAlign: 'left' }}>Fecha</th>
          <th style={{ textAlign: 'left' }}>Expediente</th>
          <th style={{ textAlign: 'left' }}>Adjudicación</th>
          <th className="cm-rep-mtable-right">Importe</th>
          <th className="cm-rep-mtable-center">Fuente</th>
        </tr></thead>
        <tbody>
          {fakeAdj.map((r, i) => (
            <tr key={i}>
              <td className="cm-rep-adjt-fecha">{r.fecha}</td>
              <td className="cm-rep-adjt-exp">{r.exp}</td>
              <td className="cm-rep-adjt-titulo">{r.titulo}</td>
              <td className="cm-rep-mtable-right cm-rep-adjt-importe" style={{ color: selected.color }}>{r.importe.toFixed(1)}M€</td>
              <td className="cm-rep-mtable-center">
                <a href={linkPlacsp(r.exp)} target="_blank" rel="noopener noreferrer"
                   className="cm-rep-source-pill--sm"
                   style={{ background: `${selected.color}15`, color: selected.color, border: `1px solid ${selected.color}40` }}>↗</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cm-rep-tip-box" style={{ marginTop: 10, background: `${selected.color}08`, border: `1px solid ${selected.color}30`, padding: '8px 10px', fontSize: 8.5 }}>
        <strong style={{ color: selected.color }}>Análisis Politeia:</strong> {selected.numAdj12m} adjudicaciones en 12 meses por valor de {selected.totalAdj12m}M€. Win rate del {selected.winRate}% confirma posicionamiento top-3 en sus sectores principales. Estrategia agresiva de baja media · {selected.bajaMedia}%.
      </div>
    </ReportShell>
  )
}

function ReportPage5({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={5} title="Mapa de proyectos en ejecución">
      <div className="cm-rep-section-label" style={{ color: selected.color, marginBottom: 6 }}>{selected.bidsActivos} proyectos en ejecución · distribución geográfica</div>
      <div className="cm-rep-mapgrid">
        {[
          { region:'Madrid',       n:Math.round(selected.bidsActivos * 0.32), col:'#1F4E8C' },
          { region:'Cataluña',      n:Math.round(selected.bidsActivos * 0.18), col:'#FBBF24' },
          { region:'Andalucía',     n:Math.round(selected.bidsActivos * 0.16), col:'#16A34A' },
          { region:'C. Valenciana', n:Math.round(selected.bidsActivos * 0.12), col:'#F97316' },
          { region:'País Vasco',    n:Math.round(selected.bidsActivos * 0.08), col:'#525258' },
          { region:'Resto España',  n:Math.round(selected.bidsActivos * 0.14), col:'#7C3AED' },
        ].map(r => (
          <div key={r.region} className="cm-rep-maprow">
            <span className="cm-rep-mapdot" style={{ background: r.col }}/>
            <span className="cm-rep-maplabel">{r.region}</span>
            <span className="cm-rep-mapnum" style={{ color: r.col }}>{r.n}</span>
          </div>
        ))}
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Por sector</div>
      <div className="cm-rep-bar-stack">
        {selected.sectores.map((s, i) => {
          const w = 100 / selected.sectores.length
          const colors = ['#1F4E8C','#16A34A','#F97316','#5B21B6','#0EA5E9']
          return <div key={s} title={s} className="cm-rep-bar-stack-segment" style={{ width: `${w}%`, background: colors[i % colors.length] }}>{s.slice(0, 4)}</div>
        })}
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color, marginTop: 10 }}>Top 5 mayores contratos en ejecución</div>
      <ul className="cm-rep-ul">
        <li>AVE Madrid-Sevilla mantenimiento · 387.9M€ (48 meses)</li>
        <li>Plataforma ciberdefensa nacional · 268.0M€ (24 meses)</li>
        <li>Concesión M40 norte ampliación · 215.6M€ (180 meses)</li>
        <li>Hospital universitario Vallecas · 319.2M€ (42 meses)</li>
        <li>Hidrógeno verde subasta capacidad · 215.2M€ (60 meses)</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage6({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={6} title="Equipo directivo y operativo">
      <div className="cm-rep-section-label" style={{ color: selected.color, marginBottom: 6 }}>Top management</div>
      <div className="cm-rep-team-list">
        {[
          { rol:'Presidente / Chairman',     nombre:selected.presidente,     desde:'2018' },
          { rol:selected.ceoCargo,            nombre:selected.ceo,           desde:'2022' },
          { rol:'CFO',                        nombre:'Pedro Esteban (sim.)', desde:'2021' },
          { rol:'COO',                        nombre:'María González (sim.)',desde:'2023' },
          { rol:'Director de Comunicación',   nombre:'Borja Sánchez (sim.)', desde:'2024' },
        ].map((m, i) => (
          <div key={i} className="cm-rep-team-row">
            <span className="cm-rep-team-role" style={{ background: selected.color }}>{m.rol.toUpperCase().slice(0, 18)}</span>
            <span className="cm-rep-team-nombre">{m.nombre}</span>
            <span className="cm-rep-team-desde">desde {m.desde}</span>
          </div>
        ))}
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color, marginBottom: 6 }}>Captura de Negocio (Bid &amp; Capture)</div>
      <div className="cm-rep-cbd-box" style={{ background: `${selected.color}08`, border: `1px solid ${selected.color}30` }}>
        <div className="cm-rep-cbd-jefe">{selected.jefeCBD}</div>
        <div className="cm-rep-cbd-meta">{selected.equipoLicitaciones}</div>
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Movimientos recientes (M&amp;A · cambios directivos)</div>
      <ul className="cm-rep-ul--sm">
        <li>Mar 2026 · Refuerzo del comité de licitaciones internacionales (+12 personas)</li>
        <li>Ene 2026 · Apertura oficina captación México DF</li>
        <li>Nov 2025 · Cambio de director financiero · transición ordenada</li>
        <li>Sep 2025 · Acuerdo estratégico con grupo Mitsubishi para joint ventures</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage7({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={7} title="Análisis de riesgos">
      <div className="cm-rep-risk-grid">
        {[
          { tipo:'Operacional',   nivel:'MEDIO',   color:'#F97316', det:'Concentración de proyectos en Madrid (32%) puede crear cuellos de botella en pico.' },
          { tipo:'Reputacional',  nivel:selected.modificadosPct >= 12 ? 'ALTO' : 'BAJO', color:selected.modificadosPct >= 12 ? '#DC2626' : '#16A34A', det:`${selected.modificadosPct}% de modificados sobre adjudicaciones · vigilancia política activa.` },
          { tipo:'Financiero',    nivel:'BAJO',    color:'#16A34A', det:'Ratios saneados, liquidez por encima de la mediana del sector.' },
          { tipo:'Regulatorio',   nivel:'MEDIO',   color:'#F97316', det:'Nueva LCSP · aumento de transparencia y requisitos ESG en pliegos.' },
          { tipo:'Geopolítico',   nivel:'ALTO',    color:'#DC2626', det:'Aranceles EEUU-UE · riesgo en cartera latinoamericana y exportación tecnológica.' },
          { tipo:'Cibernético',   nivel:'MEDIO',   color:'#F97316', det:'Aumento de incidentes en sector defensa y AAPP · necesidad de hardening.' },
        ].map((r, i) => (
          <div key={i} className="cm-rep-risk-box" style={{ borderLeft: `3px solid ${r.color}` }}>
            <div className="cm-rep-risk-row">
              <span className="cm-rep-risk-tipo">{r.tipo}</span>
              <span className="cm-rep-risk-nivel" style={{ background: r.color }}>{r.nivel}</span>
            </div>
            <p className="cm-rep-risk-det">{r.det}</p>
          </div>
        ))}
      </div>
      <div className="cm-rep-redflag">
        <div className="cm-rep-redflag-label">Bandera roja Politeia</div>
        <p className="cm-rep-redflag-p">
          Vigilar especialmente la evolución del riesgo geopolítico (aranceles) y reputacional. La combinación de un % de modificados elevado con tensión política puede afectar a la imagen del grupo en próximas convocatorias.
        </p>
      </div>
    </ReportShell>
  )
}

function ReportPage8({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={8} title="Sectores objetivo y oportunidades">
      <div className="cm-rep-section-label" style={{ color: selected.color, marginBottom: 6 }}>Sectores donde {selected.iniciales} es fuerte</div>
      <div className="cm-rep-tags-row" style={{ marginBottom: 10, gap: 5 }}>
        {selected.sectores.map(s => (
          <span key={s} className="cm-rep-tag cm-rep-tag--lg" style={{ background: selected.color, color: '#fff' }}>{s}</span>
        ))}
      </div>
      <div className="cm-rep-section-label cm-rep-section-label--green" style={{ marginBottom: 6 }}>Sectores con baja presencia (oportunidad)</div>
      <div className="cm-rep-tags-row" style={{ marginBottom: 12, gap: 5 }}>
        {['Sanidad','Defensa','Educación','TIC','Servicios sociales'].filter(s => !selected.sectores.includes(s as any)).map(s => (
          <span key={s} className="cm-rep-tag cm-rep-tag--lg cm-rep-tag--ghost-green">{s}</span>
        ))}
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Próximas oportunidades específicas</div>
      <ul className="cm-rep-ul--sm">
        <li>Junio 2026 · 5ª subasta de hidrógeno verde · 480 M€</li>
        <li>Julio 2026 · Plan vivienda asequible · 1ª convocatoria · 680 M€</li>
        <li>Septiembre 2026 · PERTE Microelectrónica fase 3 · 1.240 M€</li>
        <li>Octubre 2026 · Renovación carreteras N · 380 M€</li>
        <li>Noviembre 2026 · Servicios cloud sovereign UE · 1.240 M€</li>
      </ul>
      <div className="cm-rep-tip-box" style={{ marginTop: 10, background: `${selected.color}08`, border: `1px solid ${selected.color}30`, padding: '8px 10px', marginBottom: 0 }}>
        <strong style={{ color: selected.color, fontSize: 8.5 }}>Recomendación Politeia:</strong> <span style={{ fontSize: 8.5, color: 'var(--color-ink-2)' }}>posicionar oferta diferenciada en los sectores donde {selected.iniciales} no tiene hegemonía. Priorizar lotes pequeños y medianos donde la agilidad operativa es ventaja competitiva.</span>
      </div>
    </ReportShell>
  )
}

function ReportPage9({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={9} title="Estrategia recomendada · próximos 12 meses">
      <div className="cm-rep-section-label" style={{ color: selected.color, marginBottom: 6 }}>Plan táctico · 4 ejes</div>
      <div className="cm-rep-strat-list">
        {[
          { num:'1', titulo:'Diferenciación por agilidad', det:'Posicionarnos como alternativa ágil frente a la lentitud de procesos de competidores grandes. Ciclo de oferta < 30 días.', color:'#16A34A' },
          { num:'2', titulo:'Pricing inteligente',         det:`Mantener bajas en torno al ${(selected.bajaMedia + 1.5).toFixed(1)}% en lotes prioritarios · ${(selected.bajaMedia + 0.5).toFixed(1)}% baja media objetivo.`, color:'#5B21B6' },
          { num:'3', titulo:'Alianzas estratégicas',       det:'Buscar UTE con players regionales para ampliar cobertura territorial sin sobrecostes.', color:'#0EA5E9' },
          { num:'4', titulo:'Especialización sectorial',   det:`Reforzar capacidades técnicas en ${['TIC','Sanidad','Educación'].filter(s => !selected.sectores.includes(s as any))[0] || 'TIC'} · espacio infraexplotado por ${selected.iniciales}.`, color:'#F97316' },
        ].map(e => (
          <div key={e.num} className="cm-rep-strat-row" style={{ borderLeft: `3px solid ${e.color}` }}>
            <div className="cm-rep-strat-num" style={{ background: e.color }}>{e.num}</div>
            <div>
              <div className="cm-rep-strat-titulo">{e.titulo}</div>
              <div className="cm-rep-strat-det">{e.det}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="cm-rep-section-label" style={{ color: selected.color, marginTop: 10 }}>KPIs objetivo · 12 meses</div>
      <table className="cm-rep-mtable" style={{ fontSize: 8.5 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Indicador</th><th className="cm-rep-mtable-right">Hoy</th><th className="cm-rep-mtable-right">Objetivo</th></tr></thead>
        <tbody>
          <tr><td>Win rate</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700 }}>22%</td><td className="cm-rep-mtable-right" style={{ color: '#16A34A', fontWeight: 700 }}>30%</td></tr>
          <tr><td>Total adjudicado anual</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700 }}>520M€</td><td className="cm-rep-mtable-right" style={{ color: '#16A34A', fontWeight: 700 }}>720M€</td></tr>
          <tr><td>Bids activos</td><td className="cm-rep-mtable-right" style={{ fontWeight: 700 }}>18</td><td className="cm-rep-mtable-right" style={{ color: '#16A34A', fontWeight: 700 }}>32</td></tr>
        </tbody>
      </table>
    </ReportShell>
  )
}

function ReportPage10({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={10} title="Anexos · metodología y fuentes">
      <div className="cm-rep-section-label" style={{ color: selected.color }}>Fuentes consultadas (clicables)</div>
      <div className="cm-rep-fuentes-list">
        {[
          { txt:'PLACSP · Plataforma de Contratación del Sector Público',  url:'https://contrataciondelestado.es/' },
          { txt:'BOE · Boletín Oficial del Estado',                          url:'https://www.boe.es/' },
          { txt:'BOCG · Boletín Oficial Cortes Generales',                   url:'https://www.congreso.es/es/cem/diariobocg' },
          { txt:'TED · Tenders Electronic Daily (UE)',                       url:'https://ted.europa.eu/' },
          { txt:'Registro Mercantil · cuentas anuales · BORME',             url:linkBORME(selected.cif) },
          { txt:'CNMV · información financiera regulatoria',                  url:selected.cnmv || 'https://www.cnmv.es/' },
          { txt:`Sitio corporativo · ${selected.nombre.toLowerCase()}`,      url:selected.web },
          { txt:'Histórico interno Politeia · 12 meses de inteligencia',    url:'#' },
        ].map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="cm-rep-fuente-row">
            <span className="cm-rep-fuente-txt">
              <span className="cm-rep-fuente-dot" style={{ background: selected.color }}/>
              {f.txt}
            </span>
            <span className="cm-rep-fuente-cta" style={{ color: selected.color }}>↗ visitar</span>
          </a>
        ))}
      </div>

      <div className="cm-rep-section-label" style={{ color: selected.color }}>Metodología</div>
      <p className="cm-rep-text-sm" style={{ margin: '0 0 10px' }}>
        Este informe ha sido generado por <strong>Politeia AI v3.2</strong>. Se cruzan datos públicos con histórico interno y análisis cualitativo de equipo. El sistema aplica algoritmos de NLP sobre pliegos, prensa y comunicaciones oficiales para identificar patrones de comportamiento competitivo.
      </p>
      <p className="cm-rep-text-sm" style={{ margin: '0 0 10px' }}>
        Los KPIs financieros y de win rate son <strong>estimaciones basadas en fuentes públicas</strong>. Para datos no publicados (márgenes, desglose por contrato), Politeia aplica modelos estadísticos sobre comparables.
      </p>

      <div className="cm-rep-section-label" style={{ color: selected.color }}>Disclaimer</div>
      <p className="cm-rep-disclaimer">
        Este documento es confidencial y de uso exclusivo del cliente. La información que contiene se basa en fuentes públicas y modelos analíticos · puede no reflejar la totalidad de la realidad operativa de la entidad analizada. Politeia Analítica no se hace responsable del uso indebido de esta información para fines no autorizados.
        Validación interna por equipo de Captura de Negocio antes de tomar decisiones críticas. © Politeia Analítica · Todos los derechos reservados.
      </p>
    </ReportShell>
  )
}

function ReportKpi({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div className="cm-rep-kpi">
      <div className="cm-rep-kpi-value" style={{ color }}>{value}</div>
      <div className="cm-rep-kpi-label">{label}</div>
    </div>
  )
}

function DAFOBlock({ label, items, color }: { label: string, items: string[], color: string }) {
  return (
    <div className="cm-rep-dafo-block" style={{ borderTop: `2px solid ${color}` }}>
      <div className="cm-rep-dafo-label" style={{ color }}>{label}</div>
      <ul className="cm-rep-dafo-ul">
        {items.slice(0, 3).map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div className="cm-hero-kpi" style={{ borderColor: `${accent}55` }}>
      <div className="cm-hero-kpi-value">{value}</div>
      <div className="cm-hero-kpi-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="cm-section-h2">
      <h2 className="cm-section-h2-title">
        <span className="cm-section-h2-bar" style={{ background: accent }}/>
        {label}
      </h2>
      <span className="cm-section-h2-count">{count}</span>
    </div>
  )
}

// Pill de enlace a fuente (para la fila de fuentes oficiales)
function SourceLink({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cm-source-link"
       style={{ background: `${color}10`, border: `1px solid ${color}40`, color }}
       onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = color; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
       onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}10`; (e.currentTarget as HTMLAnchorElement).style.color = color }}>
      {label}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M2 2h5v5M2 7L7 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}

// Icono pequeño para tablas (botón cuadrado con label corto)
function SourceIcon({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label} className="cm-source-icon"
       style={{ background: `${color}12`, border: `1px solid ${color}40`, color }}>
      {label}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M2 2h4v4M2 6L6 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}

// Tag minúsculo para informes (footer de página 1)
function SourceTag({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cm-source-tag"
       style={{ background: `${color}12`, color, border: `1px solid ${color}40` }}>↗ {label}</a>
  )
}
