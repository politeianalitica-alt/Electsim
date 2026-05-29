'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import EntityBacklinks from '@/components/EntityBacklinks'
import { PARTIDOS, GRUPOS, partyKey, REPS_BY_PARTY, BLOC_GOB, MEDIOS_PRO_GOB, MEDIOS_ANTI_GOB, type Partido, type Familia, type AmbitoFamilia, type GrupoParlamentario } from '@/lib/partidos-data'
import './partidos.css'

// Tipos del proxy /api/market/parties
type BackendParty = {
  slug: string; name: string; color_hex: string
  ideology_axes: { economic: number; social: number }
}
type BackendPartiesResponse = { parties: BackendParty[]; count: number }

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function PartidosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Verificación contra backend ElectSim · refresh 5min
  const { data: backendData, source, updatedAt, refresh } = useApi<BackendPartiesResponse>(
    '/api/market/parties',
    { refreshInterval: 300_000 }
  )
  const backendParties = backendData?.parties || []
  // Mapa slug → BackendParty para lookups rápidos
  const backendBySlug: Record<string, BackendParty> = useMemo(() => {
    const m: Record<string, BackendParty> = {}
    for (const p of backendParties) m[p.slug] = p
    return m
  }, [backendParties])

  const [filterFamilia, setFilterFamilia] = useState<Familia | 'Todas'>('Todas')
  const [query, setQuery] = useState('')
  const [orderBy, setOrderBy] = useState<'congreso' | 'intencion' | 'fundacion'>('congreso')
  const [tab, setTab] = useState<'partidos' | 'grupos' | 'tabla'>('partidos')

  const FAMILIAS: Array<Familia | 'Todas'> = ['Todas','Socialdemocracia','Conservador','Derecha radical','Izquierda alternativa','Independentista','Nacionalista','Regionalista']

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PARTIDOS
      .filter(p => filterFamilia === 'Todas' || p.familia === filterFamilia)
      .filter(p => !q || p.siglas.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.presidente.toLowerCase().includes(q))
      .sort((a,b) => orderBy === 'fundacion' ? a.fundacion - b.fundacion : (b[orderBy] - a[orderBy]))
  }, [filterFamilia, query, orderBy])

  const totals = useMemo(() => {
    const c = PARTIDOS.reduce((s,p) => s + p.congreso, 0)
    const ccaa = PARTIDOS.reduce((s,p) => s + p.ccaa, 0)
    const europa = PARTIDOS.reduce((s,p) => s + p.europa, 0)
    return { partidos: PARTIDOS.length, congreso: c, ccaa, europa }
  }, [])

  return (
    <div className="pt-root">
      <AppHeader/>
      <main className="pt-main">

        {/* ───── Hero ───── */}
        <section className="pt-hero">
          <div>
            <p className="pt-hero-eyebrow">
              <span>INTELIGENCIA POLÍTICA · PARTIDOS Y GRUPOS</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 className="pt-hero-title">
              Quién es quién en el sistema español <em className="pt-hero-title-em">de partidos</em>
            </h1>
            <p className="pt-hero-subtitle">
              {totals.partidos} partidos · {GRUPOS.length} grupos parlamentarios · {backendParties.length > 0 ? <><strong className="pt-hero-subtitle-verified">{backendParties.length} verificados contra backend ElectSim</strong> · </> : null}seguimiento de líderes, escaños, sondeos y posición ideológica.
            </p>
          </div>
          <div className="pt-hero-kpis">
            <HeroKPI label="Partidos" value={String(totals.partidos)}/>
            <HeroKPI label="Σ Congreso" value={String(totals.congreso)}/>
            <HeroKPI label="Govs. CCAA" value={String(totals.ccaa)}/>
            <HeroKPI label="Eurodip." value={String(totals.europa)}/>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            CUADRANTE 2D · POSICIONAMIENTO IDEOLÓGICO VERIFICADO
            Datos del backend ElectSim FastAPI · /market/parties
            Eje X: política económica (-1 izq · +1 dcha)
            Eje Y: política social    (-1 progre · +1 conserv)
            ═════════════════════════════════════════════════════════════════ */}
        {backendParties.length > 0 && (
          <section className="pt-cuad-section">
            <div className="pt-cuad-head">
              <div>
                <p className="pt-cuad-eyebrow">
                  CUADRANTE 2D · BACKEND ELECTSIM <span className="pt-cuad-eyebrow-sub">· {backendParties.length} partidos verificados</span>
                </p>
                <h2 className="pt-cuad-title">
                  Posición ideológica oficial · datos del backend
                </h2>
                <p className="pt-cuad-desc">
                  Eje X: economía (izquierda ←→ derecha) · Eje Y: social (progresista ↑↓ conservador) ·
                  los partidos cuyo slug coincide muestran un punto verde de verificación
                </p>
              </div>
            </div>

            <div className="pt-cuad-canvas">
              {/* Ejes */}
              <div className="pt-cuad-axis-v"/>
              <div className="pt-cuad-axis-h"/>

              {/* Etiquetas de cuadrantes */}
              <span className="pt-cuad-label pt-cuad-label--tl">↑ CONSERV. — IZQ. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--tr">↑ CONSERV. — DCHA. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--bl">↓ PROGRES. — IZQ. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--br">↓ PROGRES. — DCHA. ECON.</span>

              {/* Puntos · convertimos -1..+1 a 0..100% */}
              {backendParties.map(p => {
                const x = (p.ideology_axes.economic + 1) / 2 * 100  // 0-100%
                const y = (p.ideology_axes.social + 1) / 2 * 100    // 0-100% (invertido: +1 social = arriba)
                return (
                  <div key={p.slug} className="pt-cuad-point" style={{ left:`${x}%`, top:`${100-y}%` }}>
                    <span className="pt-cuad-dot" style={{ background:p.color_hex }}/>
                    <span className="pt-cuad-tag" style={{ color:p.color_hex, border:`1px solid ${p.color_hex}30` }}>{p.slug.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>

            {/* Tabla resumen al lado */}
            <div className="pt-cuad-summary">
              {backendParties.map(p => {
                const localMatch = PARTIDOS.find(lp => lp.id === p.slug || lp.siglas.toLowerCase() === p.slug)
                const verified = !!localMatch
                return (
                  <div key={p.slug} className="pt-cuad-card" style={{ borderLeft:`3px solid ${p.color_hex}` }}>
                    <div className="pt-cuad-card-info">
                      <div className="pt-cuad-card-slug">{p.slug.toUpperCase()}</div>
                      <div className="pt-cuad-card-name">{p.name}</div>
                    </div>
                    <div className="pt-cuad-card-axes">
                      <span className="pt-cuad-axis">eco {p.ideology_axes.economic > 0 ? '+' : ''}{p.ideology_axes.economic.toFixed(2)}</span>
                      <span className="pt-cuad-axis">soc {p.ideology_axes.social > 0 ? '+' : ''}{p.ideology_axes.social.toFixed(2)}</span>
                      {verified && <span className="pt-cuad-match">✓ MATCH</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── Tabs ───── */}
        <div className="pt-tabs-row">
          <div className="pt-tabs-wrap">
            {([
              { k:'partidos', label:'Partidos',                 count: PARTIDOS.length },
              { k:'grupos',   label:'Grupos parlamentarios',   count: GRUPOS.length },
              { k:'tabla',    label:'Tabla comparativa',       count: PARTIDOS.length },
            ] as const).map(t => {
              const active = tab === t.k
              return (
                <button key={t.k} onClick={() => setTab(t.k)} className={`pt-tab-btn ${active ? 'pt-tab-btn--active' : ''}`}>
                  {t.label} <span className="pt-tab-count">{t.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ───── Tab Partidos ───── */}
        {tab === 'partidos' && (
          <>
            {/* Filtros */}
            <div className="pt-filters">
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Buscar entre ${PARTIDOS.length} partidos…`}
                className="pt-filters-input"
              />
              <span className="pt-filters-label">Familia:</span>
              <div className="pt-familias-wrap">
                {FAMILIAS.map(f => {
                  const active = filterFamilia === f
                  return (
                    <button key={f} onClick={() => setFilterFamilia(f)} className={`pt-familia-btn ${active ? 'pt-familia-btn--active' : ''}`}>{f}</button>
                  )
                })}
              </div>
              <span className="pt-filters-label pt-filters-label--ml">Orden:</span>
              <select value={orderBy} onChange={e => setOrderBy(e.target.value as typeof orderBy)} className="pt-orden-select">
                <option value="congreso">Escaños Congreso</option>
                <option value="intencion">Intención de voto</option>
                <option value="fundacion">Fundación</option>
              </select>
              <span className="pt-filters-counter">{filtered.length} partidos visibles</span>
            </div>

            {/* Cards de partidos */}
            <div className="pt-cards-grid">
              {filtered.map(p => <PartidoCard key={p.id} p={p}/>)}
              {filtered.length === 0 && (
                <div className="pt-empty">
                  Sin coincidencias.
                </div>
              )}
            </div>
          </>
        )}

        {/* ───── Tab Grupos parlamentarios ───── */}
        {tab === 'grupos' && (
          <>
            <div className="pt-barra-card">
              <h3 className="pt-barra-title">Composición del Congreso · 350 escaños</h3>
              <p className="pt-barra-desc">Distribución de los 8 grupos parlamentarios. Mayoría absoluta = 176 · investidura efectiva 23J: 179 SÍ.</p>
              <BarraComposicion grupos={GRUPOS}/>
            </div>
            <div className="pt-grupos-grid">
              {GRUPOS.map(g => <GrupoCard key={g.id} g={g}/>)}
            </div>
          </>
        )}

        {/* ───── Tab Tabla comparativa ───── */}
        {tab === 'tabla' && (
          <div className="pt-tabla-card">
            <div className="pt-tabla-scroll">
              <table className="pt-tabla">
                <thead>
                  <tr className="pt-tabla-head-row">
                    {[
                      { l:'Partido',     a:'left'  },
                      { l:'Familia',     a:'left'  },
                      { l:'Fundac.',     a:'right' },
                      { l:'Líder',       a:'left'  },
                      { l:'Congreso',    a:'right' },
                      { l:'Senado',      a:'right' },
                      { l:'Europa',      a:'right' },
                      { l:'CCAA',        a:'right' },
                      { l:'%2023',       a:'right' },
                      { l:'Intenc.',     a:'right' },
                      { l:'Δ30d',        a:'right' },
                      { l:'Tendencia',   a:'left'  },
                    ].map(h => (
                      <th key={h.l} className={`pt-tabla-th pt-tabla-th--${h.a}`}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...PARTIDOS].sort((a,b) => b.congreso - a.congreso).map((p, i) => (
                    <tr key={p.id} className={`pt-tabla-row ${i%2 ? 'pt-tabla-row--odd' : 'pt-tabla-row--even'}`}>
                      <td className="pt-tabla-td">
                        <div className="pt-tabla-partido-cell">
                          <span className="pt-tabla-swatch" style={{ background:p.color }}/>
                          <div className="pt-tabla-min-wrap">
                            <div className="pt-tabla-siglas">{p.siglas}</div>
                            <div className="pt-tabla-nombre">{p.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="pt-tabla-td pt-tabla-familia">{p.familia}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-fundacion">{p.fundacion}</td>
                      <td className="pt-tabla-td pt-tabla-lider">{p.presidente}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num" style={{ color:p.color }}>{p.congreso}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.senado}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.europa}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.ccaa}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-pct">{p.voto2023}%</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-pct" style={{ color:p.color }}>{p.intencion}%</td>
                      <td className={`pt-tabla-td pt-tabla-td--right pt-tabla-delta ${p.delta30d > 0 ? 'pt-tabla-delta--up' : p.delta30d < 0 ? 'pt-tabla-delta--down' : 'pt-tabla-delta--flat'}`}>
                        {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)}
                      </td>
                      <td className="pt-tabla-td pt-tabla-spark">
                        <Sparkline data={p.votoSerie} color={p.color} h={26}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
      <footer className="pt-footer">
        Partidos y Grupos · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PartidoCard
// ─────────────────────────────────────────────────────────────────────────

function RepChips({ items, color, max = 12 }: { items: Array<{ slug: string; nombre_completo?: string; nombre?: string }>; color: string; max?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {items.slice(0, max).map((d) => (
        <Link key={d.slug} href={`/dosieres/${d.slug}`}
          style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: `${color}12`, color: '#3a3a3d', textDecoration: 'none', border: `1px solid ${color}33` }}>
          {d.nombre_completo || d.nombre || d.slug}
        </Link>
      ))}
      {items.length > max && (
        <Link href="/dosieres" style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, color, textDecoration: 'none', fontWeight: 700 }}>
          +{items.length - max} más →
        </Link>
      )}
    </div>
  )
}

function PartidoCard({ p }: { p: Partido }) {
  const pk = partyKey(p.siglas)
  const reps = REPS_BY_PARTY[pk] || { diputados: [], senadores: [] }
  const totalReps = reps.diputados.length + reps.senadores.length
  const medios = BLOC_GOB.has(pk) ? MEDIOS_PRO_GOB : MEDIOS_ANTI_GOB
  const [openReps, setOpenReps] = useState(false)
  const repLbl = { fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' as const, color: '#86868b', marginTop: 10 }
  return (
    <article className="pt-card">
      <header className="pt-card-header" style={{
        background: `linear-gradient(135deg, ${p.color}10, ${p.color}03)`,
        borderBottom: `2px solid ${p.color}`,
      }}>
        <div className="pt-card-logo" style={{ background: p.color, boxShadow: `0 2px 6px ${p.color}50` }}>{p.siglas.length <= 4 ? p.siglas : p.siglas.slice(0,4)}</div>
        <div className="pt-card-info">
          <div className="pt-card-meta-row">
            <span className="pt-card-familia" style={{ background: p.color }}>{p.familia.toUpperCase()}</span>
            <span className="pt-card-ambito">· {p.ambito.toUpperCase()} · DESDE {p.fundacion}</span>
          </div>
          <h3 className="pt-card-name">
            <Link href={`/partidos/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.nombre}</Link>
          </h3>
          <p className="pt-card-lideres">
            <strong>{p.presidente}</strong> · {p.secretario}
          </p>
        </div>
        <div className="pt-card-intencion">
          <div className="pt-card-intencion-num" style={{ color: p.color }}>{p.intencion}<span className="pt-card-intencion-pct">%</span></div>
          <div className={`pt-card-delta ${p.delta30d > 0 ? 'pt-card-delta--up' : p.delta30d < 0 ? 'pt-card-delta--down' : 'pt-card-delta--flat'}`}>
            {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)} · 30d
          </div>
        </div>
      </header>

      <div className="pt-card-body">
        {/* Representación */}
        <div className="pt-rep-grid">
          {[
            { l:'Congreso',  v:p.congreso,   c:p.color },
            { l:'Senado',    v:p.senado,     c:'#3a3a3d' },
            { l:'Europa',    v:p.europa,     c:'#3a3a3d' },
            { l:'Govs CCAA', v:p.ccaa,       c:'#3a3a3d' },
            { l:'Alc. >100k',v:p.alcaldias,  c:'#3a3a3d' },
          ].map(k => (
            <div key={k.l} className="pt-rep-cell">
              <div className="pt-rep-value" style={{ color: k.c }}>{k.v}</div>
              <div className="pt-rep-label">{k.l}</div>
            </div>
          ))}
        </div>

        {/* Eje ideológico */}
        <div className="pt-eje-wrap">
          <div className="pt-eje-head">
            <span className="pt-eje-label">Eje izquierda · derecha</span>
            <span className="pt-eje-value" style={{ color: p.color }}>{p.ideologia > 0 ? `+${p.ideologia}` : p.ideologia}</span>
          </div>
          <EjePosicion value={p.ideologia} color={p.color}/>
        </div>

        {/* Tendencia + grupo UE */}
        <div className="pt-trend-grid">
          <div className="pt-trend-cell">
            <div className="pt-trend-label">Voto generales (últimas 6)</div>
            <Sparkline data={p.votoSerie} color={p.color} h={28}/>
            <div className="pt-trend-range">
              <span>2008</span><span>2023</span>
            </div>
          </div>
          <div className="pt-trend-cell">
            <div className="pt-trend-label">Grupo UE</div>
            <div className="pt-grupo-ue">{p.grupoUE}</div>
            <div className="pt-grupo-ue-extra">
              <span>{p.afiliados}K afiliados</span>
            </div>
          </div>
        </div>

        {/* Fortalezas y debilidades */}
        <div className="pt-fd-grid">
          <div>
            <div className="pt-fd-label pt-fd-label--fort">Fortalezas</div>
            {p.fortalezas.map(f => (
              <div key={f} className="pt-fd-item">
                <span className="pt-fd-glyph pt-fd-glyph--fort">+</span>{f}
              </div>
            ))}
          </div>
          <div>
            <div className="pt-fd-label pt-fd-label--debi">Debilidades</div>
            {p.debilidades.map(d => (
              <div key={d} className="pt-fd-item">
                <span className="pt-fd-glyph pt-fd-glyph--debi">−</span>{d}
              </div>
            ))}
          </div>
        </div>

        {/* Backlinks · memoria institucional propia (Pilar 1+2) */}
        <div className="pt-backlinks-wrap">
          <EntityBacklinks
            kind="party"
            slug={p.id}
            fallbackName={p.nombre}
          />
        </div>

        {/* Representantes y medios · conexión con los dossiers */}
        {(totalReps > 0 || medios.length > 0) && (
          <div style={{ marginTop: 14, borderTop: '1px solid #ececec', paddingTop: 10 }}>
            <button onClick={() => setOpenReps(o => !o)}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: p.color, padding: 0 }}>
              {openReps ? '▾' : '▸'} Representantes y medios en fichas
              <span style={{ color: '#86868b', fontWeight: 500 }}>
                {totalReps > 0 ? ` · ${reps.diputados.length} dip. · ${reps.senadores.length} sen.` : ''}
              </span>
            </button>
            {openReps && (
              <div style={{ marginTop: 4 }}>
                {reps.diputados.length > 0 && (<><div style={repLbl}>Diputados · Congreso ({reps.diputados.length})</div><RepChips items={reps.diputados} color={p.color} /></>)}
                {reps.senadores.length > 0 && (<><div style={repLbl}>Senadores ({reps.senadores.length})</div><RepChips items={reps.senadores} color={p.color} /></>)}
                {medios.length > 0 && (<><div style={repLbl}>Medios afines a su bloque ({medios.length})</div><RepChips items={medios} color={p.color} max={8} /></>)}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="pt-card-footer">
        <span><strong className="pt-card-footer-strong">{p.web}</strong></span>
        <Link href={`/partidos/${p.id}`} style={{ color: p.color, textDecoration: 'none', fontWeight: 700 }}>Ficha completa →</Link>
      </footer>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// GrupoCard
// ─────────────────────────────────────────────────────────────────────────
function GrupoCard({ g }: { g: GrupoParlamentario }) {
  const POS_META = {
    gobierno:    { label:'GOBIERNO',     color:'#16A34A' },
    investidura: { label:'INVESTIDURA',  color:'#5B21B6' },
    oposicion:   { label:'OPOSICIÓN',    color:'#DC2626' },
  }
  const pm = POS_META[g.posicion]
  return (
    <article className="pt-grupo-card">
      <div className="pt-grupo-head" style={{ borderBottom: `2px solid ${g.color}` }}>
        <div className="pt-grupo-circle" style={{ background: g.color, boxShadow: `0 2px 6px ${g.color}50` }}>{g.escanos}</div>
        <div className="pt-grupo-info">
          <div className="pt-grupo-tags">
            <span className="pt-grupo-pos" style={{ background: pm.color }}>{pm.label}</span>
          </div>
          <h3 className="pt-grupo-name">{g.nombre}</h3>
          <p className="pt-grupo-escanos">{g.escanos} escaños · {Math.round((g.escanos/350)*100)}% del Congreso</p>
        </div>
      </div>
      <div className="pt-grupo-body">
        <div className="pt-grupo-row-grid">
          <div>
            <div className="pt-grupo-row-label">Presidente del grupo</div>
            <div className="pt-grupo-row-value">{g.presidente}</div>
          </div>
          <div>
            <div className="pt-grupo-row-label">Portavoz</div>
            <div className="pt-grupo-row-value">{g.portavoz}</div>
          </div>
        </div>
        <div className="pt-grupo-disc-block">
          <div className="pt-grupo-disc-label">Disciplina de voto</div>
          <div className="pt-grupo-disc-row">
            <div className="pt-grupo-disc-track">
              <div className="pt-grupo-disc-fill" style={{ width: `${g.disciplina}%`, background: g.color }}/>
            </div>
            <span className="pt-grupo-disc-num" style={{ color: g.color }}>{g.disciplina}%</span>
          </div>
        </div>
        <div>
          <div className="pt-grupo-partidos-label">Partidos integrantes</div>
          <div className="pt-grupo-partidos-wrap">
            {g.partidos.map(p => (
              <span key={p} className="pt-grupo-partido-pill" style={{
                background: `${g.color}15`,
                color: g.color,
                border: `1px solid ${g.color}40`,
              }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// BarraComposicion · barra horizontal con todos los grupos
// ─────────────────────────────────────────────────────────────────────────
function BarraComposicion({ grupos }: { grupos: GrupoParlamentario[] }) {
  const total = grupos.reduce((s, g) => s + g.escanos, 0)
  const ORDEN = ['mixto','sumar','psoe','erc','junts','pnv','pp','vox']
  const sorted = [...grupos].sort((a,b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id))
  const segments = sorted.map(g => ({ ...g, pctW: (g.escanos / total) * 100 }))
  const majX = (176 / total) * 100
  return (
    <div>
      <div className="pt-barra-track">
        {segments.map((g, i) => (
          <div key={g.id}
            className={`pt-barra-seg ${i < segments.length - 1 ? 'pt-barra-seg--divider' : ''}`}
            style={{ width: `${g.pctW}%`, background: g.color }}
            title={`${g.nombre} · ${g.escanos}`}
          >
            {g.pctW > 6 ? g.escanos : ''}
          </div>
        ))}
        <div className="pt-barra-mark" style={{ left: `${majX}%` }}/>
        <div className="pt-barra-mark-label" style={{ left: `${majX}%` }}>176 · MAYORÍA</div>
      </div>
      <div className="pt-barra-legend">
        {sorted.map(g => (
          <div key={g.id} className="pt-barra-legend-row">
            <span className="pt-barra-legend-swatch" style={{ background: g.color }}/>
            <span className="pt-barra-legend-name">{g.nombre.replace('GP ', '')}</span>
            <span className="pt-barra-legend-num">{g.escanos}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div className="pt-kpi">
      <div className="pt-kpi-value">{value}</div>
      <div className="pt-kpi-label">{label}</div>
    </div>
  )
}

function EjePosicion({ value, color }: { value: number, color: string }) {
  const pct = ((value + 100) / 200) * 100
  return (
    <div className="pt-eje-bar">
      <div className="pt-eje-marker" style={{
        left: `${pct}%`,
        background: color,
        boxShadow: `0 0 0 2px ${color}50, 0 1px 3px rgba(0,0,0,0.1)`,
      }}/>
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
    <svg viewBox={`0 0 ${w} ${h}`} className="pt-spark-svg" style={{ height: h }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}

