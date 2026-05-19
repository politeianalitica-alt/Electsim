'use client'
import './mapa-actores.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { ACTORES, CATS, CAT_LABEL, initials, type Categoria } from '@/lib/actores'
import { useApi } from '@/lib/useApi'
import RelacionesGrafo from '@/components/RelacionesGrafo'
import IdeologicalScatter from '@/components/IdeologicalScatter'
import FigureDossierModal from '@/components/FigureDossierModal'

type ActorView = 'mapa' | 'grafo' | 'dossier'

interface ApiPersona {
  id: string
  nombre_completo?: string
  partido?: string
  cargo_actual?: string
  score_influencia?: number
  score_riesgo?: number
  sentimiento_actual?: number
  tendencia_sentimiento?: string
  ambito?: string
  bio?: string
}

interface LiveDossierPanel {
  figure: { nombre: string; cargo: string; organizacion: string; color: string; influencia: number; twitter?: string | null }
  bio: { extract: string; sourceUrl: string | null }
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number }>
  intervenciones: Array<{ fecha: string; organo: string }>
  comisiones: Array<{ nombre: string; cargo: string }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  tagsCobertura: string[]
  error?: string
}

const TIPO_COLOR: Record<Categoria, string> = {
  gobierno: '#E1322D', oposicion: '#1F4E8C', parlamento: '#5B21B6',
  autonomico: '#0E7490', municipal: '#0F766E', institucion: '#7C3AED',
  patronal: '#0E7490', sindicato: '#A02525', mediatico: '#525258', europa: '#1F4E8C',
}

export default function MapaActoresPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterCat, setFilterCat] = useState<typeof CATS[number]>('Todos')
  const [query, setQuery] = useState('')
  const [rankQuery, setRankQuery] = useState('')
  const [showAllRank, setShowAllRank] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [view, setView] = useState<ActorView>('mapa')
  /** ID de actor seleccionado dentro de la VISTA "Dossier" (catálogo ACTORES) */
  const [dossierActorId, setDossierActorId] = useState<string | null>(null)
  /** ID de figura del CATÁLOGO NUEVO (figures) — sólo para el modal lateral */
  const [dossierId, setDossierId] = useState<string | null>(null)
  /** Lookup por nombre — para abrir modal desde cualquier sitio sin tener ID */
  const [dossierByName, setDossierByName] = useState<{ name: string; cargo?: string; afiliacion?: string; color?: string } | null>(null)
  const [livePanel, setLivePanel] = useState<LiveDossierPanel | null>(null)
  const [livePanelLoading, setLivePanelLoading] = useState(false)

  // Live API: fetch personas from Politeia Intelligence
  const { data: apiPersonas } = useApi<ApiPersona[]>('/api/intelligence/personas?limit=100&order_by=score_influencia', { refreshInterval: 0 })
  const personas: ApiPersona[] = Array.isArray(apiPersonas) ? apiPersonas : []
  const isLiveData = personas.length > 0

  // Build a unified list mapping API personas to existing actor IDs by name match,
  // so live cards can display extra fields without breaking the quadrant.
  const liveByName = useMemo(() => {
    const m: Record<string, ApiPersona> = {}
    for (const p of personas) if (p.nombre_completo) m[p.nombre_completo.toLowerCase()] = p
    return m
  }, [personas])
  const focused = pinned ?? hovered
  const focusedActor = focused ? ACTORES.find(a => a.id === focused) : null

  // Cuando un actor queda FIJADO (clic), cargar dossier real
  useEffect(() => {
    if (!pinned) { setLivePanel(null); return }
    const actor = ACTORES.find(a => a.id === pinned)
    if (!actor) return
    setLivePanelLoading(true)
    setLivePanel(null)
    const params = new URLSearchParams({
      name: actor.nombre,
      cargo: actor.cargo,
      afiliacion: actor.partido,
      color: actor.color,
    })
    fetch(`/api/figures/dossier-by-name?${params}`)
      .then(r => r.json())
      .then(setLivePanel)
      .catch(e => setLivePanel({ error: String(e) } as LiveDossierPanel))
      .finally(() => setLivePanelLoading(false))
  }, [pinned])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACTORES
      .filter(a => filterCat === 'Todos' || a.cat === filterCat)
      .filter(a => !q || a.nombre.toLowerCase().includes(q) || a.partido.toLowerCase().includes(q) || a.cargo.toLowerCase().includes(q))
  }, [filterCat, query])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const a of ACTORES) out[a.cat] = (out[a.cat] || 0) + 1
    return out
  }, [])

  // Cuadrante
  const W = 1100, H = 620
  const xToPx = (x: number) => 30 + ((x + 100) / 200) * (W - 60)
  const yToPx = (y: number) => H - 30 - ((y + 100) / 200) * (H - 60)

  return (
    <div className="ma-root">
      <AppHeader/>
      <main className="ma-main">

        {/* Hero */}
        <section className="ma-hero">
          <div>
            <p className="ma-hero-eyebrow">
              INTELIGENCIA POLÍTICA · MAPA DE ACTORES
            </p>
            <h1 className="ma-hero-title">
              {ACTORES.length} actores políticos, <em>económicos y sociales</em>
            </h1>
            <p className="ma-hero-subtitle">
              Cuadrante ideológico · busca por nombre, partido o cargo · pulsa cualquier burbuja para ver el detalle
            </p>
          </div>
          <div className="ma-hero-kpis">
            <MiniK label="Gob." n={counts['gobierno']||0}/>
            <MiniK label="Opos." n={counts['oposicion']||0}/>
            <MiniK label="Parlam." n={counts['parlamento']||0}/>
            <MiniK label="CCAA" n={counts['autonomico']||0}/>
            <MiniK label="Munic." n={counts['municipal']||0}/>
            <MiniK label="Instit." n={counts['institucion']||0}/>
            <MiniK label="Patron." n={counts['patronal']||0}/>
            <MiniK label="Sindic." n={counts['sindicato']||0}/>
            <MiniK label="Medios" n={counts['mediatico']||0}/>
            <MiniK label="Europa" n={counts['europa']||0}/>
          </div>
        </section>

        {/* Tabs: Mapa | Grafo de relaciones | Dossier */}
        <div className="ma-view-tabs">
          {([
            { v: 'mapa' as ActorView, l: 'Mapa de actores' },
            { v: 'grafo' as ActorView, l: 'Grafo de relaciones' },
            { v: 'dossier' as ActorView, l: 'Dossier' },
          ]).map(t => (
            <button
              key={t.v}
              onClick={() => setView(t.v)}
              className={`ma-view-tab${view === t.v ? ' ma-view-tab--active' : ''}`}
            >{t.l}</button>
          ))}
          {isLiveData && (
            <span className="ma-live-badge">
              ● {personas.length} live
            </span>
          )}
        </div>

      {view === 'grafo' && (
        <RelacionesGrafo
          actors={(personas.length > 0 ? personas : ACTORES).map(p => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const any = p as any
            return {
              id: 'id' in p ? p.id : any.id,
              nombre: 'nombre_completo' in p ? p.nombre_completo : any.nombre,
              partido: p.partido,
              cargo: 'cargo_actual' in p ? p.cargo_actual : any.cargo,
              cat: any.cat,
              color: any.color,
              ejeX: any.ejeX,
              ejeY: any.ejeY,
              inf: any.inf,
              score_influencia: 'score_influencia' in p ? p.score_influencia : any.inf,
            }
          })}
          maxActors={60}
        />
      )}

      {view === 'dossier' && (
        <DossierView
          actors={ACTORES}
          liveByName={liveByName}
          selectedId={dossierActorId ?? ACTORES[0].id}
          onSelect={setDossierActorId}
          onOpenGraph={() => setView('grafo')}
        />
      )}

      {view === 'mapa' && (<>

        {/* Filtros + Buscador */}
        <div className="ma-filter-bar">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Buscar entre ${ACTORES.length} actores…`}
            className="ma-search-input"
          />
          <span className="ma-filter-label">Tipo:</span>
          <div className="ma-filter-segment">
            {CATS.map(c => {
              const active = filterCat === c
              const col = c === 'Todos' ? '#1d1d1f' : TIPO_COLOR[c as Categoria]
              return (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={`ma-filter-chip${active ? ' ma-filter-chip--active' : ''}`}
                  style={{ color: active ? col : undefined }}  // dynamic accent
                >{c === 'Todos' ? 'Todos' : CAT_LABEL[c as Categoria]}</button>
              )
            })}
          </div>
          <span className="ma-filter-count">{visible.length} actores visibles · burbuja = influencia</span>
        </div>

        {/* Cuadrante + panel detalle */}
        <section className="ma-quad-grid">
          <div className="ma-quad-canvas">
            <svg viewBox={`0 0 ${W} ${H}`} className="ma-quad-svg">
              {/* Cuadrantes con sombra alternada */}
              <rect x={0}   y={0}   width={W/2} height={H/2} fill="#FAFAFB"/>
              <rect x={W/2} y={0}   width={W/2} height={H/2} fill="#F5F5F7"/>
              <rect x={0}   y={H/2} width={W/2} height={H/2} fill="#F5F5F7"/>
              <rect x={W/2} y={H/2} width={W/2} height={H/2} fill="#FAFAFB"/>
              {/* Ejes */}
              <line x1={W/2} y1={20} x2={W/2} y2={H-20} stroke="#1d1d1f" strokeWidth="1" strokeDasharray="3 4" opacity="0.35"/>
              <line x1={20}  y1={H/2} x2={W-20} y2={H/2} stroke="#1d1d1f" strokeWidth="1" strokeDasharray="3 4" opacity="0.35"/>
              {/* Etiquetas */}
              <text x={28}    y={H/2 + 5}  fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em">IZQUIERDA</text>
              <text x={W-28}  y={H/2 + 5}  fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em" textAnchor="end">DERECHA</text>
              <text x={W/2 + 8} y={28}     fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em">CENTRALIZACIÓN</text>
              <text x={W/2 + 8} y={H-12}   fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em">DESCENTRALIZACIÓN</text>

              {/* Burbujas */}
              {visible.map(a => {
                const isFocus = focused === a.id
                const dim = focused && focused !== a.id
                const r = 6 + (a.inf / 100) * 18  // 6..24
                return (
                  <g key={a.id} className="ma-quad-bubble-group"
                     onMouseEnter={() => setHovered(a.id)}
                     onMouseLeave={() => setHovered(null)}
                     onClick={() => setPinned(pinned === a.id ? null : a.id)}>
                    <circle cx={xToPx(a.ejeX)} cy={yToPx(a.ejeY)} r={r}
                            fill={a.color} opacity={dim ? 0.16 : 0.85}
                            stroke={isFocus ? '#1d1d1f' : 'rgba(255,255,255,0.6)'}
                            strokeWidth={isFocus ? 2 : 1.2}
                            style={{ transition:'opacity 200ms' }}/>
                    {(r >= 14 || isFocus) && (
                      <text x={xToPx(a.ejeX)} y={yToPx(a.ejeY) + 3} textAnchor="middle"
                            fontSize={Math.max(8, r * 0.42)} fontWeight="700" fill="#fff"
                            opacity={dim ? 0.4 : 1} style={{ pointerEvents:'none' }}>
                        {initials(a.nombre)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Panel detalle (sticky) */}
          <aside className="ma-panel">
            {focusedActor ? (
              <>
                <div className="ma-panel-header">
                  <div className="ma-panel-avatar" style={{ background: focusedActor.color }}>{initials(focusedActor.nombre)}</div>
                  <div className="ma-panel-meta">
                    <div className="ma-panel-eyebrow" style={{ color: focusedActor.color }}>
                      {focusedActor.partido} · {CAT_LABEL[focusedActor.cat]}
                    </div>
                    <div className="ma-panel-name">{focusedActor.nombre}</div>
                  </div>
                </div>

                <p className="ma-panel-cargo">{focusedActor.cargo}</p>

                {/* Valoración + influencia */}
                <div className="ma-panel-2col">
                  <div className="ma-stat-card">
                    <div className="ma-stat-label">Valoración</div>
                    <div className="ma-stat-row">
                      <span className="ma-stat-value" style={{ color: focusedActor.color }}>{focusedActor.val}</span>
                      <span className="ma-stat-unit">/10</span>
                    </div>
                    <div className={`ma-stat-delta ${focusedActor.delta >= 0 ? 'ma-stat-delta--up' : 'ma-stat-delta--down'}`}>
                      {focusedActor.delta >= 0 ? '▲' : '▼'} {Math.abs(focusedActor.delta)} vs mes
                    </div>
                  </div>
                  <div className="ma-stat-card">
                    <div className="ma-stat-label">Influencia</div>
                    <div className="ma-stat-row">
                      <span className="ma-stat-value" style={{ color: focusedActor.color }}>{focusedActor.inf}</span>
                      <span className="ma-stat-unit">/100</span>
                    </div>
                    <div className="ma-stat-bar-track">
                      <div className="ma-stat-bar-fill" style={{ width: `${focusedActor.inf}%`, background: focusedActor.color }}/>
                    </div>
                  </div>
                </div>

                {/* Coordenadas ideológicas */}
                <div className="ma-panel-2col ma-panel-2col--space">
                  <Coord label="Eje H" value={focusedActor.ejeX} pos={focusedActor.ejeX < 0 ? 'IZQ' : focusedActor.ejeX > 0 ? 'DCHA' : '—'} color={focusedActor.color}/>
                  <Coord label="Eje V" value={focusedActor.ejeY} pos={focusedActor.ejeY < 0 ? 'DESCENT.' : focusedActor.ejeY > 0 ? 'CENT.' : '—'} color={focusedActor.color}/>
                </div>

                {/* DATOS REALES EN VIVO cuando el actor está fijado */}
                {pinned && (
                  <>
                    {livePanelLoading && (
                      <div className="ma-live-loading">
                        Cargando dossier en vivo · Wikipedia + 50 medios RSS + Congreso…
                      </div>
                    )}
                    {livePanel?.error && (
                      <div className="ma-live-error">
                        Error cargando dossier: {livePanel.error.slice(0, 150)}
                      </div>
                    )}
                    {livePanel && !livePanel.error && (
                      <>
                        {/* Sentimiento real desde RSS */}
                        {livePanel.sentimientoAgregado && (
                          <div className="ma-live-card">
                            <div className="ma-live-card-label">
                              Sentimiento real · {livePanel.noticias.length} noticias 7d
                            </div>
                            <div className="ma-sent-bar">
                              {livePanel.sentimientoAgregado.positivo > 0 && (
                                <div className="ma-sent-bar-positivo" style={{ flex: livePanel.sentimientoAgregado.positivo }}/>
                              )}
                              {livePanel.sentimientoAgregado.neutral > 0 && (
                                <div className="ma-sent-bar-neutral" style={{ flex: livePanel.sentimientoAgregado.neutral }}/>
                              )}
                              {livePanel.sentimientoAgregado.negativo > 0 && (
                                <div className="ma-sent-bar-negativo" style={{ flex: livePanel.sentimientoAgregado.negativo }}/>
                              )}
                            </div>
                            <div className="ma-sent-legend">
                              <span className="ma-sent-legend-pos">+{livePanel.sentimientoAgregado.positivo}</span>
                              <span className="ma-sent-legend-neu">={livePanel.sentimientoAgregado.neutral}</span>
                              <span className="ma-sent-legend-neg">−{livePanel.sentimientoAgregado.negativo}</span>
                              <span className="ma-sent-legend-score">
                                Score {livePanel.sentimientoAgregado.score > 0 ? '+' : ''}{livePanel.sentimientoAgregado.score} {livePanel.sentimientoAgregado.tendencia === 'up' ? '↑' : livePanel.sentimientoAgregado.tendencia === 'down' ? '↓' : '→'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Bio Wikipedia */}
                        {livePanel.bio.extract && (
                          <div className="ma-live-card">
                            <div className="ma-live-card-label ma-live-card-label--tight">
                              Biografía · Wikipedia
                            </div>
                            <p className="ma-bio-text">
                              {livePanel.bio.extract.slice(0, 280)}{livePanel.bio.extract.length > 280 ? '…' : ''}
                            </p>
                          </div>
                        )}

                        {/* Tags cobertura */}
                        {livePanel.tagsCobertura.length > 0 && (
                          <div className="ma-tags-wrap">
                            <div className="ma-live-card-label ma-live-card-label--tight">
                              Temas en cobertura
                            </div>
                            <div className="ma-tags-row">
                              {livePanel.tagsCobertura.slice(0, 8).map(t => (
                                <span key={t} className="ma-tag" style={{ background: `${focusedActor.color}15`, color: focusedActor.color }}>{t}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Comisiones */}
                        {livePanel.comisiones.length > 0 && (
                          <div className="ma-comisiones-block">
                            <div className="ma-live-card-label ma-live-card-label--comisiones ma-live-card-label--tight">
                              Comisiones · {livePanel.comisiones.length}
                            </div>
                            {livePanel.comisiones.slice(0, 4).map((c, i) => (
                              <div key={i} className="ma-comision-item">
                                <strong>{c.nombre}</strong> · <em>{c.cargo}</em>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Noticias recientes */}
                        {livePanel.noticias.length > 0 && (
                          <div className="ma-noticias-block">
                            <div className="ma-live-card-label ma-live-card-label--noticias ma-live-card-label--tight">
                              Últimas noticias · {livePanel.noticias.length}
                            </div>
                            <div className="ma-noticias-list">
                              {livePanel.noticias.slice(0, 8).map((n, i) => {
                                const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                                return (
                                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                                    className="ma-noticia-link"
                                    style={{ borderLeft: `2px solid ${sc}` }}>
                                    <div className="ma-noticia-meta">
                                      <span className="ma-noticia-medio" style={{ color: sc }}>{n.medio}</span>
                                      {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                                    </div>
                                    {n.titulo.slice(0, 120)}
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Intervenciones */}
                        {livePanel.intervenciones.length > 0 && (
                          <div className="ma-interv-block">
                            <div className="ma-live-card-label ma-live-card-label--intervenciones ma-live-card-label--tight">
                              Intervenciones · {livePanel.intervenciones.length}
                            </div>
                            {livePanel.intervenciones.slice(0, 5).map((iv, i) => (
                              <div key={i} className="ma-interv-item">
                                {iv.organo} {iv.fecha && <span>· {iv.fecha}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        <button onClick={() => setDossierByName({
                          name: focusedActor.nombre,
                          cargo: focusedActor.cargo,
                          afiliacion: focusedActor.partido,
                          color: focusedActor.color,
                        })}
                          className="ma-dossier-btn"
                          style={{ background: focusedActor.color }}
                        >Abrir dossier completo →</button>
                      </>
                    )}
                  </>
                )}

                <div className="ma-panel-footnote">
                  {pinned ? 'Fijado · pulsa otra vez para soltar' : 'Pulsa para fijar y cargar datos en vivo'}
                </div>
              </>
            ) : (
              <>
                <div className="ma-empty-eyebrow">Selecciona un actor</div>
                <div className="ma-empty-title">Mapa de actores</div>
                <p className="ma-empty-text">
                  Pasa el cursor sobre cualquier burbuja para ver el detalle, o pulsa para fijarlo. El tamaño indica la influencia estimada.
                </p>
                <div className="ma-legend-list">
                  {(Object.keys(CAT_LABEL) as Categoria[]).map(t => (
                    <div key={t} className="ma-legend-row">
                      <span className="ma-legend-dot" style={{ background: TIPO_COLOR[t] }}/>
                      <span className="ma-legend-label">{CAT_LABEL[t]}</span>
                      <span className="ma-legend-count">{counts[t] || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </section>

        {/* Ranking de los visibles · con buscador dedicado */}
        {(() => {
          const sorted = [...visible].sort((a,b) => b.inf - a.inf)
          const rq = rankQuery.trim().toLowerCase()
          const filtered = rq
            ? sorted.filter(a => a.nombre.toLowerCase().includes(rq) || a.partido.toLowerCase().includes(rq) || a.cargo.toLowerCase().includes(rq))
            : sorted
          const limit = (rq || showAllRank) ? filtered.length : 60
          const slice = filtered.slice(0, limit)
          return (
            <section className="ma-rank-section">
              <div className="ma-rank-header">
                <h2 className="ma-rank-title">
                  Ranking · {filtered.length} {filtered.length === 1 ? 'actor' : 'actores'}
                </h2>
                <div className="ma-rank-tools">
                  <input
                    type="text"
                    value={rankQuery}
                    onChange={e => setRankQuery(e.target.value)}
                    placeholder="Buscar persona en ranking…"
                    className="ma-rank-search"
                  />
                  {rankQuery && (
                    <button onClick={() => setRankQuery('')} className="ma-rank-clear-btn">Limpiar</button>
                  )}
                  <span className="ma-rank-hint">Orden por influencia</span>
                </div>
              </div>
              <div className="ma-rank-grid">
                {slice.map(a => {
                  const matchHL = rq && a.nombre.toLowerCase().includes(rq)
                  return (
                    <div key={a.id}
                      className={`ma-rank-card${matchHL ? ' ma-rank-card--match' : ''}`}
                      onMouseEnter={() => setHovered(a.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setPinned(pinned === a.id ? null : a.id)}>
                      <div className="ma-rank-avatar" style={{ background: a.color }}>{initials(a.nombre)}</div>
                      <div className="ma-rank-body">
                        <div className="ma-rank-name">{a.nombre}</div>
                        <div className="ma-rank-sub">
                          {CAT_LABEL[a.cat]} · <span className="ma-rank-sub-party" style={{ color: a.color }}>{a.partido}</span>
                        </div>
                      </div>
                      <div className="ma-rank-side">
                        <div className="ma-rank-infl" style={{ color: a.color }}>{a.inf}</div>
                        <div className="ma-rank-infl-label">infl.</div>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="ma-rank-empty">
                    {rq ? <>Sin coincidencias para «<strong>{rankQuery}</strong>».</> : 'Sin resultados.'}
                  </div>
                )}
              </div>
              {!rq && filtered.length > 60 && (
                <div className="ma-rank-toggle">
                  <button onClick={() => setShowAllRank(s => !s)} className="ma-rank-toggle-btn">
                    {showAllRank ? `Mostrar solo top 60` : `Mostrar los ${filtered.length}`}
                  </button>
                </div>
              )}
            </section>
          )
        })()}
      </>)}
      </main>
      <footer className="ma-footer">
        Inteligencia Política · Mapa de Actores · Politeia Analítica · {new Date().getFullYear()}
      </footer>

      {/* Modal de dossier completo · datos en vivo */}
      <FigureDossierModal
        figureId={dossierId}
        byName={dossierByName}
        onClose={() => { setDossierId(null); setDossierByName(null) }}
        onSelectFigure={id => { setDossierByName(null); setDossierId(id) }}
      />
    </div>
  )
}

function MiniK({ label, n }: { label:string, n:number }) {
  return (
    <div className="ma-mini-kpi">
      <div className="ma-mini-kpi-value">{n}</div>
      <div className="ma-mini-kpi-label">{label}</div>
    </div>
  )
}
function Coord({ label, value, pos, color }: { label:string, value:number, pos:string, color:string }) {
  return (
    <div className="ma-coord">
      <div className="ma-coord-label">{label}</div>
      <div className="ma-coord-row">
        <span className="ma-coord-value" style={{ color }}>{value > 0 ? `+${value}` : value}</span>
        <span className="ma-coord-pos">{pos}</span>
      </div>
    </div>
  )
}

// Inline dossier view: scrollable list of actors on the left + full dossier on the right
function DossierView({ actors, liveByName, selectedId, onSelect, onOpenGraph }: {
  actors: typeof ACTORES
  liveByName: Record<string, ApiPersona>
  selectedId: string
  onSelect: (id: string) => void
  onOpenGraph: () => void
}) {
  const [search, setSearch] = useState('')
  const [dossier, setDossier] = useState<LiveDossierPanel | null>(null)
  const [dossierLoading, setDossierLoading] = useState(false)

  const filtered = actors.filter(a =>
    !search || a.nombre.toLowerCase().includes(search.toLowerCase()) || a.partido.toLowerCase().includes(search.toLowerCase())
  )
  const a = actors.find(x => x.id === selectedId) ?? actors[0]
  const live = a ? liveByName[a.nombre.toLowerCase()] : undefined

  // Cargar dossier en vivo al cambiar selección
  useEffect(() => {
    if (!a) { setDossier(null); return }
    setDossierLoading(true)
    setDossier(null)
    const params = new URLSearchParams({ name: a.nombre, cargo: a.cargo, afiliacion: a.partido, color: a.color })
    fetch(`/api/figures/dossier-by-name?${params}`)
      .then(r => r.json())
      .then(setDossier)
      .catch(e => setDossier({ error: String(e) } as LiveDossierPanel))
      .finally(() => setDossierLoading(false))
  }, [a])

  return (
    <div className="ma-dv-grid">
      <div className="ma-dv-sidebar">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar actor…"
          className="ma-dv-search" />
        <div className="ma-dv-list">
          {filtered.slice(0, 120).map(x => {
            const active = x.id === selectedId
            return (
              <button key={x.id} onClick={() => onSelect(x.id)} className="ma-dv-item"
                style={{
                  border: '1px solid ' + (active ? x.color : '#f0f0f3'),  // dynamic
                  background: active ? `${x.color}10` : undefined,  // dynamic
                }}>
                <div className="ma-dv-item-name">{x.nombre}</div>
                <div className="ma-dv-item-sub">{x.partido} · {x.cargo}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="ma-dv-card">
        {/* Header */}
        <div className="ma-dv-header">
          <div className="ma-dv-avatar" style={{ background: a.color }}>{initials(a.nombre)}</div>
          <div className="ma-dv-header-body">
            <h2 className="ma-dv-h2">{a.nombre}</h2>
            <div className="ma-dv-tag-row">
              <span className="ma-dv-partido-pill" style={{ background: `${a.color}15`, color: a.color }}>{a.partido}</span>
              <span className="ma-dv-cargo-text">{a.cargo}</span>
            </div>
          </div>
          <button onClick={onOpenGraph} className="ma-dv-grafo-btn">Ver grafo completo →</button>
        </div>

        {dossierLoading && (
          <div className="ma-dv-loading">
            Cargando dossier en vivo · Wikipedia + 50 medios RSS + Congreso…
          </div>
        )}

        {dossier && !dossier.error && (
          <>
            {/* Sentimiento + bio */}
            <div className="ma-dv-grid-2">
              <div className="ma-dv-sent-block">
                <div className="ma-dv-section-label">
                  SENTIMIENTO 7D · {dossier.noticias.length} noticias
                </div>
                <div className="ma-sent-bar ma-sent-bar--lg">
                  {dossier.sentimientoAgregado.positivo > 0 && <div className="ma-sent-bar-positivo" style={{ flex: dossier.sentimientoAgregado.positivo }}/>}
                  {dossier.sentimientoAgregado.neutral > 0 && <div className="ma-sent-bar-neutral" style={{ flex: dossier.sentimientoAgregado.neutral }}/>}
                  {dossier.sentimientoAgregado.negativo > 0 && <div className="ma-sent-bar-negativo" style={{ flex: dossier.sentimientoAgregado.negativo }}/>}
                </div>
                <div className="ma-sent-legend ma-sent-legend--lg">
                  <span className="ma-sent-legend-pos ma-sent-legend-bold">+{dossier.sentimientoAgregado.positivo}</span>
                  <span className="ma-sent-legend-neu ma-sent-legend-bold">={dossier.sentimientoAgregado.neutral}</span>
                  <span className="ma-sent-legend-neg ma-sent-legend-bold">−{dossier.sentimientoAgregado.negativo}</span>
                </div>
                <div className="ma-sent-score-center">
                  Score <strong>{dossier.sentimientoAgregado.score > 0 ? '+' : ''}{dossier.sentimientoAgregado.score}</strong> · tendencia {dossier.sentimientoAgregado.tendencia === 'up' ? '↑ mejora' : dossier.sentimientoAgregado.tendencia === 'down' ? '↓ empeora' : '→ estable'}
                </div>
              </div>

              <div>
                <div className="ma-dv-section-label">
                  BIOGRAFÍA · {dossier.bio.extract ? 'Wikipedia' : '—'}
                </div>
                {dossier.bio.extract ? (
                  <p className="ma-dv-bio-text">
                    {dossier.bio.extract.slice(0, 350)}{dossier.bio.extract.length > 350 ? '…' : ''}
                  </p>
                ) : (
                  <p className="ma-dv-bio-empty">
                    Sin entrada Wikipedia detectada. {a.cargo} · {a.partido}.
                  </p>
                )}
              </div>
            </div>

            {/* Temas en cobertura */}
            {dossier.tagsCobertura.length > 0 && (
              <div className="ma-dv-tags-block">
                <div className="ma-dv-section-label">
                  TEMAS EN COBERTURA MEDIÁTICA
                </div>
                <div className="ma-tags-row">
                  {dossier.tagsCobertura.map(t => (
                    <span key={t} className="ma-tag ma-tag--lg" style={{ background: `${a.color}15`, color: a.color }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Noticias recientes */}
            {dossier.noticias.length > 0 && (
              <div className="ma-dv-tags-block">
                <div className="ma-dv-section-label ma-dv-section-label--noticias">
                  ÚLTIMAS NOTICIAS · {dossier.noticias.length}
                </div>
                <div className="ma-dv-noticias-grid">
                  {dossier.noticias.slice(0, 12).map((n, i) => {
                    const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                    return (
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                        className="ma-dv-noticia-card"
                        style={{ borderLeft: `3px solid ${sc}` }}>
                        <div className="ma-dv-noticia-meta">
                          <span className="ma-dv-noticia-medio" style={{ color: sc }}>{n.medio}</span>
                          {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                        </div>
                        {n.titulo.slice(0, 130)}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Comisiones + Intervenciones · grid 2-col */}
            <div className="ma-dv-grid-half">
              {dossier.comisiones.length > 0 && (
                <div>
                  <div className="ma-dv-section-label ma-dv-section-label--comisiones">
                    COMISIONES · {dossier.comisiones.length}
                  </div>
                  {dossier.comisiones.slice(0, 6).map((c, i) => (
                    <div key={i} className="ma-dv-item-row">
                      <strong>{c.nombre}</strong> · <em>{c.cargo}</em>
                    </div>
                  ))}
                </div>
              )}

              {dossier.intervenciones.length > 0 && (
                <div>
                  <div className="ma-dv-section-label ma-dv-section-label--intervenciones">
                    INTERVENCIONES · {dossier.intervenciones.length}
                  </div>
                  {dossier.intervenciones.slice(0, 6).map((iv, i) => (
                    <div key={i} className="ma-dv-item-row">
                      {iv.organo} {iv.fecha && <span>· {iv.fecha}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {dossier?.error && (
          <div className="ma-dv-error">
            Error: {dossier.error.slice(0, 200)}
          </div>
        )}

        {/* Ideológico siempre al final */}
        <div className="ma-dv-footer">
          <div>
            <div className="ma-dv-section-label">POSICIONAMIENTO IDEOLÓGICO</div>
            <p className="ma-dv-footer-text">
              Eje horizontal: izquierda (−) ↔ derecha (+). Eje vertical: descentralización (−) ↔ centralización (+).
              Posición estimada para {a.partido}.
            </p>
          </div>
          <IdeologicalScatter partido={a.partido} size={300}/>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="ma-scorebar-head">
        <span>{label}</span>
        <span className="ma-scorebar-val">{value}/{max}</span>
      </div>
      <div className="ma-scorebar-track">
        <div className="ma-scorebar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  )
}
