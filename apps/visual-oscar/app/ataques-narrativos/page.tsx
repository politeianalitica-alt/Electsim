'use client'
import './ataques-narrativos.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useAtaquesNarrativos } from '@/hooks/narrativa/useAtaquesNarrativos'
import { Sparkline } from './_components/Sparkline'
import { BigSparkline } from './_components/BigSparkline'
import { MiniKPI } from './_components/MiniKPI'
import type { Severidad, FaseAtaque, TipoAtaque, Plataforma, PosicionAmplificador } from '@/types/narrativa'

const SEV_META: Record<Severidad, { color: string }> = {
  'CRÍTICA': { color: '#DC2626' }, 'ALTA': { color: '#F97316' },
  'MEDIA':   { color: '#EAB308' }, 'BAJA': { color: '#0EA5E9' },
}
const TIPO_META: Record<TipoAtaque, { color: string }> = {
  'Desinformación':        { color: '#7C3AED' },
  'Bulo viral':            { color: '#DC2626' },
  'Hashtag coordinado':    { color: '#F97316' },
  'Fake video / deepfake': { color: '#9333EA' },
  'Astroturfing':          { color: '#0EA5E9' },
  'Doxing':                { color: '#525258' },
  'Smear campaign':        { color: '#B45309' },
}
const FASE_META: Record<FaseAtaque, { color: string; pct: number }> = {
  'Detectado': { color: '#0EA5E9', pct: 15 },
  'Escalando': { color: '#F97316', pct: 40 },
  'Pico':      { color: '#DC2626', pct: 65 },
  'Decayendo': { color: '#16A34A', pct: 85 },
  'Cerrado':   { color: '#525258', pct: 100 },
}
const PLAT_COLOR: Record<Plataforma, string> = {
  'X (Twitter)': '#000000', 'Facebook': '#1877F2', 'TikTok': '#FF0050',
  'Telegram': '#0088CC', 'Instagram': '#E4405F', 'YouTube': '#FF0000',
  'Foros': '#525258', 'WhatsApp': '#25D366',
}
const POS_COLOR: Record<PosicionAmplificador, string> = {
  'A favor': '#16A34A', 'En contra': '#DC2626', 'Neutral': '#6e6e73',
}
const ACC_COLOR: Record<string, string> = {
  'Pendiente': '#6e6e73', 'En curso': '#5B21B6', 'Completada': '#16A34A',
}
const AMP_TIPO_COLOR: Record<string, string> = {
  'Bot detectado': '#DC2626', 'Político': '#1F4E8C', 'Medio': '#7C3AED', 'Influencer': '#F97316',
}

export default function AtaquesNarrativosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { ataques, loading, totals, topHashtags, topAmplificadores } = useAtaquesNarrativos()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'evolucion' | 'amplificadores' | 'patrones' | 'plan'>('evolucion')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')

  useEffect(() => {
    if (ataques.length > 0 && !selectedId) setSelectedId(ataques[0].id)
  }, [ataques, selectedId])

  const selected = useMemo(() => ataques.find(a => a.id === selectedId), [ataques, selectedId])
  const visibles = useMemo(
    () => ataques.filter(a => filterSev === 'Todas' || a.severidad === filterSev),
    [ataques, filterSev]
  )

  if (loading) {
    return (
      <div className="an-root">
        <AppHeader />
        <div className="an-empty">Cargando monitor de ataques narrativos…</div>
      </div>
    )
  }

  if (!selected) {
    return (
      <div className="an-root">
        <AppHeader />
        <div className="an-empty">Sin ataques narrativos detectados actualmente.</div>
      </div>
    )
  }

  const sevSel = SEV_META[selected.severidad].color
  const tipoSel = TIPO_META[selected.tipo].color
  const faseSel = FASE_META[selected.fase]

  return (
    <div className="an-root">
      <AppHeader />
      <main className="an-main">

        <AttackRiskContext/>

        {/* ───── Hero ───── */}
        <section className="an-hero">
          <div className="an-hero-blob" />
          <div className="an-hero-body">
            <p className="an-hero-eyebrow">
              <span className="an-hero-eyebrow-dot">●</span> RIESGO · DETECCIÓN DE ATAQUES NARRATIVOS
            </p>
            <h1 className="an-hero-title">
              {totals.activos} ataques activos <em>requieren respuesta</em>
            </h1>
            <p className="an-hero-sub">
              {totals.criticos} crítica(s) · {totals.altos} alta(s) · {totals.sospAvg}% cuentas sospechosas detectadas en media.
            </p>
          </div>
          <div className="an-hero-kpis">
            <HeroKPI label="Ataques"  value={String(totals.total)}    accent="#FCA5A5" />
            <HeroKPI label="Críticos" value={String(totals.criticos)} accent="#DC2626" />
            <HeroKPI label="Activos"  value={String(totals.activos)}  accent="#F97316" />
            <HeroKPI label="% Susp."  value={`${totals.sospAvg}%`}    accent="#EAB308" />
          </div>
        </section>

        {/* ───── Filtro ───── */}
        <div className="an-filter-row">
          <span className="an-filter-label">Severidad:</span>
          <div className="an-segmented">
            {(['Todas', 'CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
                <button
                  key={s}
                  onClick={() => setFilterSev(s)}
                  className={`an-seg-btn${active ? ' an-seg-btn--active' : ''}`}
                  style={active ? { color: col } : undefined}
                >{s}</button>
              )
            })}
          </div>
          <span className="an-filter-count">{visibles.length} ataques visibles</span>
        </div>

        {/* ───── Grid de tarjetas ───── */}
        <section className="an-cards-grid">
          {visibles.map(a => {
            const sev = SEV_META[a.severidad]
            const tm = TIPO_META[a.tipo]
            const fm = FASE_META[a.fase]
            const active = a.id === selectedId
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="an-card"
                style={{
                  border: `1px solid ${active ? sev.color : '#ECECEF'}`,
                  boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft: `4px solid ${sev.color}`,
                }}
              >
                <header className="an-card-head">
                  <div className="an-card-chips">
                    <span className="an-chip-sev" style={{ background: sev.color }}>● {a.severidad}</span>
                    <span className="an-chip-tipo" style={{ background: `${tm.color}15`, color: tm.color, border: `1px solid ${tm.color}40` }}>{a.tipo.toUpperCase()}</span>
                    <span className="an-chip-fase" style={{ background: `${fm.color}15`, color: fm.color, border: `1px solid ${fm.color}40` }}>{a.fase.toUpperCase()}</span>
                  </div>
                  <h3 className="an-card-title">{a.titulo}</h3>
                  <div className="an-card-target">Target: <strong>{a.target}</strong></div>
                </header>
                <div className="an-card-body">
                  <Sparkline data={a.evolucion} color={sev.color} h={36} />
                  <div className="an-card-kpis">
                    <MiniKPI label="Alcance" value={a.alcance.split(' ')[0]} sub="impres." color={sev.color} />
                    <MiniKPI label="% Susp." value={`${a.cuentasSospechosas}%`} sub="cuentas" color="#5B21B6" />
                    <MiniKPI label="Plataf." value={String(a.plataformas.length)} sub="afectadas" color="#0EA5E9" />
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Detalle ───── */}
        <section className="an-detail" style={{ borderLeft: `5px solid ${sevSel}` }}>
          <div className="an-detail-head">
            <div className="an-detail-body">
              <div className="an-detail-chips">
                <span className="an-chip-sev-lg" style={{ background: sevSel }}>● {selected.severidad}</span>
                <span className="an-chip-tipo-lg" style={{ background: `${tipoSel}15`, color: tipoSel, border: `1px solid ${tipoSel}40` }}>{selected.tipo.toUpperCase()}</span>
                <span className="an-detail-meta">· INICIO: {selected.inicio}</span>
              </div>
              <h2 className="an-detail-title">{selected.titulo}</h2>
              <p className="an-detail-target">Target: <strong>{selected.target}</strong></p>
              <p className="an-detail-narrative">{selected.narrativa}</p>
            </div>
            <div className="an-detail-kpis">
              <CardKPI label="Alcance"  value={selected.alcance.split(' ')[0]} sub="impres."    color={sevSel} />
              <CardKPI label="% Susp."  value={`${selected.cuentasSospechosas}`} sub="% cuentas" color="#5B21B6" />
              <CardKPI label="Plataf."  value={String(selected.plataformas.length)} sub="afectadas" color="#0EA5E9" />
              <CardKPI label="Hashtags" value={String(selected.hashtags.length)} sub="trackeados" color="#16A34A" />
            </div>
          </div>
          <div className="an-phase">
            <div className="an-phase-head">
              <span>Fase: <span style={{ color: faseSel.color }}>{selected.fase}</span></span>
              <span>{faseSel.pct}% del ciclo</span>
            </div>
            <div className="an-phase-bar">
              {(['Detectado', 'Escalando', 'Pico', 'Decayendo', 'Cerrado'] as FaseAtaque[]).map(f => {
                const isPast = FASE_META[f].pct <= faseSel.pct
                return (
                  <div
                    key={f}
                    className={`an-phase-seg${f === 'Cerrado' ? ' an-phase-seg--last' : ''}`}
                    style={{ background: isPast ? faseSel.color : 'transparent' }}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="an-tabs">
          {([
            { k: 'evolucion',      label: 'Evolución y plataformas', count: 24 },
            { k: 'amplificadores', label: 'Amplificadores',          count: selected.amplificadores.length },
            { k: 'patrones',       label: 'Patrones detectados',     count: selected.patrones.length },
            { k: 'plan',           label: 'Plan de respuesta',       count: selected.acciones.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`an-tab${active ? ' an-tab--active' : ''}`}
              >
                {t.label}
                <span className="an-tab-count" style={active ? { color: sevSel } : undefined}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB: Evolución ───── */}
        {tab === 'evolucion' && (
          <section className="an-evolucion-grid">
            <div className="an-panel">
              <div className="an-panel-head">
                <h3 className="an-panel-title">Evolución de menciones · últimas 24 h</h3>
                <span className="an-panel-sub">Resolución horaria</span>
              </div>
              <BigSparkline data={selected.evolucion} color={sevSel} />
              <div className="an-axis">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>ahora</span>
              </div>
              <div className="an-section-mt">
                <h4 className="an-section-title">Hashtags rastreados</h4>
                <div className="an-hashtag-row">
                  {selected.hashtags.map(h => (
                    <span
                      key={h.h}
                      className={`an-hashtag ${h.hostil ? 'an-hashtag--hostil' : 'an-hashtag--ok'}`}
                    >
                      {h.h} <span className="an-hashtag-vol">{h.vol}K</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="an-panel">
              <h3 className="an-panel-title-mb">Plataformas afectadas</h3>
              <div className="an-plat-list">
                {selected.plataformas.map(pl => (
                  <div key={pl.p} className="an-plat-row">
                    <div className="an-plat-head">
                      <span className="an-plat-name">
                        <span className="an-plat-dot" style={{ background: PLAT_COLOR[pl.p] }} />
                        {pl.p}
                      </span>
                      <span className="an-plat-pct" style={{ color: PLAT_COLOR[pl.p] }}>{pl.peso}%</span>
                    </div>
                    <div className="an-plat-track">
                      <div className="an-plat-fill" style={{ width: `${pl.peso}%`, background: PLAT_COLOR[pl.p] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB: Amplificadores ───── */}
        {tab === 'amplificadores' && (
          <section className="an-panel--flush">
            <div className="an-table-wrap">
              <table className="an-table an-table--amp">
                <thead>
                  <tr className="an-th-row">
                    {['#', 'Cuenta', 'Tipo', 'Seguidores', 'Posición', 'Menciones'].map(h => (
                      <th key={h} className="an-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...selected.amplificadores].sort((a, b) => b.menciones - a.menciones).map((am, i) => (
                    <tr key={i} className={`an-tr${i % 2 ? ' an-tr--alt' : ''}`}>
                      <td className="an-td an-td--num">{i + 1}</td>
                      <td className="an-td an-td--name">{am.nombre}</td>
                      <td className="an-td">
                        <span className="an-chip-tipo-amp" style={{ background: AMP_TIPO_COLOR[am.tipo] ?? '#525258' }}>
                          {am.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="an-td an-td--mono">{am.seguidores}</td>
                      <td className="an-td">
                        <span className="an-chip-pos" style={{ background: `${POS_COLOR[am.posicion]}15`, color: POS_COLOR[am.posicion], border: `1px solid ${POS_COLOR[am.posicion]}40` }}>
                          {am.posicion.toUpperCase()}
                        </span>
                      </td>
                      <td className="an-td">
                        <div className="an-mentions-cell">
                          <div className="an-mentions-track">
                            <div
                              className="an-mentions-fill"
                              style={{
                                width: `${Math.min(100, (am.menciones / (selected.amplificadores[0]?.menciones || 1)) * 100)}%`,
                                background: POS_COLOR[am.posicion],
                              }}
                            />
                          </div>
                          <span className="an-mentions-num">{am.menciones}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB: Patrones ───── */}
        {tab === 'patrones' && (
          <section className="an-patterns-grid">
            {selected.patrones.map((p, i) => (
              <article
                key={i}
                className="an-pattern"
                style={{ borderLeft: `3px solid ${SEV_META[p.severidad].color}` }}
              >
                <div className="an-pattern-head">
                  <span className="an-pattern-icon" style={{ color: SEV_META[p.severidad].color }}>!</span>
                  <span className="an-pattern-sev" style={{ background: SEV_META[p.severidad].color }}>{p.severidad}</span>
                </div>
                <h4 className="an-pattern-title">{p.tipo}</h4>
                <p className="an-pattern-body">{p.evidencia}</p>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB: Plan ───── */}
        {tab === 'plan' && (
          <section className="an-panel--flush">
            <div className="an-table-wrap">
              <table className="an-table an-table--plan">
                <thead>
                  <tr className="an-th-row">
                    {['Acción', 'Plazo', 'Estado'].map(h => (
                      <th key={h} className="an-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.acciones.map((a, i) => (
                    <tr key={i} className={`an-tr${i % 2 ? ' an-tr--alt' : ''}`}>
                      <td className="an-td an-td--name">{a.accion}</td>
                      <td className="an-td an-td--nowrap">{a.plazo}</td>
                      <td className="an-td">
                        <span className="an-chip-estado" style={{ background: `${ACC_COLOR[a.estado]}15`, color: ACC_COLOR[a.estado], border: `1px solid ${ACC_COLOR[a.estado]}40` }}>
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

        {/* ───── Sección agregada ───── */}
        <section className="an-agg-grid">
          <div className="an-panel">
            <h3 className="an-agg-title">Top hashtags hostiles · agregado</h3>
            <p className="an-agg-sub">De los {ataques.length} ataques activos</p>
            <div className="an-agg-list">
              {topHashtags.map((h, i) => (
                <div key={h.h} className="an-agg-row-hashtag">
                  <span className="an-agg-rank-hashtag">{i + 1}</span>
                  <span className="an-agg-text-hashtag">{h.h}</span>
                  <span className="an-agg-vol-hashtag">{h.v}K</span>
                </div>
              ))}
            </div>
          </div>
          <div className="an-panel">
            <h3 className="an-agg-title">Top amplificadores · agregado</h3>
            <p className="an-agg-sub">Cuentas con más menciones en campañas activas</p>
            <div className="an-agg-list an-agg-list--tight">
              {topAmplificadores.map((a, i) => (
                <div key={a.nombre} className="an-agg-row-amp">
                  <span className="an-agg-rank-amp">{i + 1}</span>
                  <span className="an-agg-name-amp">{a.nombre}</span>
                  <span className="an-agg-tipo-amp" style={{ background: AMP_TIPO_COLOR[a.tipo] ?? '#525258' }}>
                    {a.tipo.toUpperCase()}
                  </span>
                  <span
                    className="an-agg-mentions-amp"
                    style={{ color: POS_COLOR[a.pos as PosicionAmplificador] ?? '#6e6e73' }}
                  >{a.menciones}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <footer className="an-footer">
        Detección de Ataques Narrativos · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function AttackRiskContext() {
  const [media, setMedia] = useState<{ score: number; label: string; colors: { low: string; medium: string; high: string; critical: string } } | null>(null)
  const [scenario, setScenario] = useState<{ name: string; probability: number | null; horizon_days: number } | null>(null)
  useEffect(() => {
    fetch('/api/risk-v2/indices?country=ES')
      .then(r => r.json())
      .then(j => {
        const m = (j.indices ?? []).find((i: { index_id: string }) => i.index_id === 'riesgo_mediatico')
        if (m) setMedia({ score: m.score, label: m.label, colors: m.colors })
      })
      .catch(() => {})
    fetch('/api/risk-v2/scenarios?country=ES')
      .then(r => r.json())
      .then(j => {
        const s = (j.scenarios ?? []).find((x: { scenario_id: string }) => x.scenario_id === 'crisis_mediatica')
        if (s) setScenario({ name: s.name, probability: s.probability, horizon_days: s.horizon_days })
      })
      .catch(() => {})
  }, [])
  if (!media && !scenario) return null
  const colorFor = (label: string, c: { low: string; medium: string; high: string; critical: string }) => {
    if (label === 'BAJO') return c.low
    if (label === 'MEDIO') return c.medium
    if (label === 'ALTO') return c.high
    return c.critical
  }
  return (
    <section className="an-ctx">
      <div className="an-ctx-label">Contexto · Riesgo mediático estructural</div>
      {media && (
        <span
          className="an-ctx-badge"
          style={{ background: colorFor(media.label, media.colors) }}
        >
          Riesgo mediático {media.score}/100 · {media.label}
        </span>
      )}
      {scenario?.probability != null && (
        <span className="an-ctx-scenario">
          P(crisis mediática {scenario.horizon_days}d): {scenario.probability.toFixed(0)}%
        </span>
      )}
      <Link href="/riesgo" className="an-ctx-link">Ver termómetro completo →</Link>
    </section>
  )
}

function HeroKPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="an-hk" style={{ border: `1px solid ${accent}55` }}>
      <div className="an-hk-value">{value}</div>
      <div className="an-hk-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="an-ckpi">
      <div className="an-ckpi-value" style={{ color }}>{value}</div>
      <div className="an-ckpi-label">{label}</div>
      {sub && <div className="an-ckpi-sub">{sub}</div>}
    </div>
  )
}
