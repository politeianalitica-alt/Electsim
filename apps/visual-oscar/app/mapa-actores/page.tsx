'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { CATS, CAT_LABEL, initials, type Categoria } from '@/lib/actor-utils'
import { useActores } from '@/hooks/useActores'
import { useApi } from '@/lib/useApi'
import RelacionesGrafo from '@/components/RelacionesGrafo'
import IdeologicalScatter from '@/components/IdeologicalScatter'

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
  const [dossierId, setDossierId] = useState<string | null>(null)

  // Fuente única para actores: route handler /api/actores que prefiere
  // el backend FastAPI /api/actors. Si no responde, sirve el fixture local.
  const { actores: ACTORES } = useActores({ limit: 500 })

  // Live API: fetch personas from Politeia Intelligence
  const { data: apiPersonas } = useApi<ApiPersona[]>('/api/intelligence/personas?limit=100&order_by=score_influencia', { refreshInterval: 0 })
  const personas: ApiPersona[] = Array.isArray(apiPersonas) ? apiPersonas : []
  const isLiveData = personas.length > 0

  // Build a unified list mapping API personas to existing actor IDs by name match
  const liveByName = useMemo(() => {
    const m: Record<string, ApiPersona> = {}
    for (const p of personas) if (p.nombre_completo) m[p.nombre_completo.toLowerCase()] = p
    return m
  }, [personas])
  const focused = pinned ?? hovered
  const focusedActor = focused ? ACTORES.find(a => a.id === focused) : null

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACTORES
      .filter(a => filterCat === 'Todos' || a.cat === filterCat)
      .filter(a => !q || a.nombre.toLowerCase().includes(q) || a.partido.toLowerCase().includes(q) || a.cargo.toLowerCase().includes(q))
  }, [ACTORES, filterCat, query])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const a of ACTORES) out[a.cat] = (out[a.cat] || 0) + 1
    return out
  }, [ACTORES])

  // Cuadrante
  const W = 1100, H = 620
  const xToPx = (x: number) => 30 + ((x + 100) / 200) * (W - 60)
  const yToPx = (y: number) => H - 30 - ((y + 100) / 200) * (H - 60)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background:'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)',
          borderRadius:22, padding:'30px 38px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, margin:'0 0 8px' }}>
              INTELIGENCIA POLÍTICA · MAPA DE ACTORES
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:30, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {ACTORES.length} actores políticos, <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.75)' }}>económicos y sociales</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0 }}>
              Cuadrante ideológico · busca por nombre, partido o cargo · pulsa cualquier burbuja para ver el detalle
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
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
        <div style={{ display: 'flex', gap: 4, padding: 5, background: '#fff', border: '1px solid #e8e8ed', borderRadius: 999, marginBottom: 16, width: 'fit-content' }}>
          {([
            { v: 'mapa' as ActorView, l: 'Mapa de actores' },
            { v: 'grafo' as ActorView, l: 'Grafo de relaciones' },
            { v: 'dossier' as ActorView, l: 'Dossier' },
          ]).map(t => (
            <button key={t.v} onClick={() => setView(t.v)} style={{
              padding: '7px 16px', borderRadius: 999, border: 'none',
              background: view === t.v ? '#1d1d1f' : 'transparent',
              color: view === t.v ? '#fff' : '#6e6e73',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.l}</button>
          ))}
          {isLiveData && (
            <span style={{ padding: '7px 14px', borderRadius: 999, background: 'rgba(45,138,57,0.10)', color: '#2d8a39', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'center' }}>
              {personas.length} live
            </span>
          )}
        </div>

      {view === 'grafo' && (
        <RelacionesGrafo
          actors={(personas.length > 0 ? personas : ACTORES.slice(0, 30)).map(p => ({
            id: 'id' in p ? p.id : (p as {id: string}).id,
            nombre: 'nombre_completo' in p ? p.nombre_completo : (p as {nombre: string}).nombre,
            partido: p.partido,
            cargo: 'cargo_actual' in p ? p.cargo_actual : (p as {cargo: string}).cargo,
            score_influencia: 'score_influencia' in p ? p.score_influencia : (p as {inf: number}).inf,
          }))}
        />
      )}

      {view === 'dossier' && ACTORES.length > 0 && (
        <DossierView
          actors={ACTORES}
          liveByName={liveByName}
          selectedId={dossierId ?? ACTORES[0].id}
          onSelect={setDossierId}
          onOpenGraph={() => setView('grafo')}
        />
      )}

      {view === 'mapa' && (<>

        {/* Filtros + Buscador */}
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Buscar entre ${ACTORES.length} actores…`}
            style={{
              flex: '1 1 280px', maxWidth:380,
              padding:'9px 14px', borderRadius:10,
              border:'1px solid #ECECEF', background:'#fff',
              fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
            }}
          />
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginLeft:6 }}>Tipo:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, flexWrap:'wrap' }}>
            {CATS.map(c => {
              const active = filterCat === c
              const col = c === 'Todos' ? '#1d1d1f' : TIPO_COLOR[c as Categoria]
              return (
                <button key={c} onClick={() => setFilterCat(c)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 10px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{c === 'Todos' ? 'Todos' : CAT_LABEL[c as Categoria]}</button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{visible.length} actores visibles · burbuja = influencia</span>
        </div>

        {/* Cuadrante + panel detalle */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14, marginBottom:14 }}>
          <div style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:14,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
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
                  <g key={a.id} style={{ cursor:'pointer' }}
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
          <aside style={{
            background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:14,
            padding:'18px 18px 14px', position:'sticky', top:60,
            maxHeight:'calc(100vh - 80px)', overflowY:'auto',
          }}>
            {focusedActor ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{
                    width:54, height:54, borderRadius:'50%', background:focusedActor.color, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, flexShrink:0,
                  }}>{initials(focusedActor.nombre)}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:9.5, color:focusedActor.color, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                      {focusedActor.partido} · {CAT_LABEL[focusedActor.cat]}
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f', lineHeight:1.15 }}>{focusedActor.nombre}</div>
                  </div>
                </div>

                <p style={{ fontSize:12, color:'#3a3a3d', lineHeight:1.5, margin:'0 0 12px' }}>{focusedActor.cargo}</p>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>Valoración</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:focusedActor.color }}>{focusedActor.val}</span>
                      <span style={{ fontSize:11, color:'#6e6e73' }}>/10</span>
                    </div>
                    <div style={{ fontSize:10, color: focusedActor.delta >= 0 ? '#16A34A' : '#DC2626', fontWeight:700, marginTop:1 }}>
                      {focusedActor.delta >= 0 ? '▲' : '▼'} {Math.abs(focusedActor.delta)} vs mes
                    </div>
                  </div>
                  <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>Influencia</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:focusedActor.color }}>{focusedActor.inf}</span>
                      <span style={{ fontSize:11, color:'#6e6e73' }}>/100</span>
                    </div>
                    <div style={{ marginTop:5, height:4, background:'#F5F5F7', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${focusedActor.inf}%`, height:'100%', background:focusedActor.color }}/>
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  <Coord label="Eje H" value={focusedActor.ejeX} pos={focusedActor.ejeX < 0 ? 'IZQ' : focusedActor.ejeX > 0 ? 'DCHA' : '—'} color={focusedActor.color}/>
                  <Coord label="Eje V" value={focusedActor.ejeY} pos={focusedActor.ejeY < 0 ? 'DESCENT.' : focusedActor.ejeY > 0 ? 'CENT.' : '—'} color={focusedActor.color}/>
                </div>

                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#16A34A', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Fortalezas</div>
                  {focusedActor.forts.map(f => (
                    <div key={f} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
                      <span style={{ color:'#16A34A', flexShrink:0, fontWeight:700 }}>+</span>{f}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#DC2626', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Debilidades</div>
                  {focusedActor.debs.map(d => (
                    <div key={d} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
                      <span style={{ color:'#DC2626', flexShrink:0, fontWeight:700 }}>−</span>{d}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Eventos recientes</div>
                  {focusedActor.evs.map(e => (
                    <div key={e} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
                      <span style={{ color:focusedActor.color, flexShrink:0, fontWeight:700 }}>→</span>{e}
                    </div>
                  ))}
                </div>

                <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'10px 12px', marginBottom:6 }}>
                  <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Redes sociales</div>
                  {[
                    { l:'Seguidores',  v:focusedActor.seg.f, c:focusedActor.color },
                    { l:'Engagement',  v:focusedActor.seg.eng, c:focusedActor.color },
                    { l:'Sentim. neto',v:`${focusedActor.seg.tono >= 0 ? '+' : ''}${focusedActor.seg.tono}`, c: focusedActor.seg.tono >= 0 ? '#16A34A' : '#DC2626' },
                  ].map(x => (
                    <div key={x.l} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'#6e6e73' }}>{x.l}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:x.c }}>{x.v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize:10.5, color:'#86868b', textAlign:'right', marginTop:6 }}>
                  {pinned ? 'Fijado · pulsa otra vez para soltar' : 'Pulsa para fijar'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Selecciona un actor</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'#1d1d1f', marginBottom:10 }}>Mapa de actores</div>
                <p style={{ fontSize:12.5, color:'#3a3a3d', lineHeight:1.5, margin:'0 0 14px' }}>
                  Pasa el cursor sobre cualquier burbuja para ver el detalle, o pulsa para fijarlo. El tamaño indica la influencia estimada.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:11.5 }}>
                  {(Object.keys(CAT_LABEL) as Categoria[]).map(t => (
                    <div key={t} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:TIPO_COLOR[t] }}/>
                      <span style={{ color:'#3a3a3d' }}>{CAT_LABEL[t]}</span>
                      <span style={{ marginLeft:'auto', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{counts[t] || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </section>

        {/* Ranking */}
        {(() => {
          const sorted = [...visible].sort((a,b) => b.inf - a.inf)
          const rq = rankQuery.trim().toLowerCase()
          const filtered = rq
            ? sorted.filter(a => a.nombre.toLowerCase().includes(rq) || a.partido.toLowerCase().includes(rq) || a.cargo.toLowerCase().includes(rq))
            : sorted
          const limit = (rq || showAllRank) ? filtered.length : 60
          const slice = filtered.slice(0, limit)
          return (
            <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
                  Ranking · {filtered.length} {filtered.length === 1 ? 'actor' : 'actores'}
                </h2>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <input
                    type="text"
                    value={rankQuery}
                    onChange={e => setRankQuery(e.target.value)}
                    placeholder="Buscar persona en ranking…"
                    style={{
                      width: 280,
                      padding:'8px 13px', borderRadius:10,
                      border:'1px solid #ECECEF', background:'#FAFAFB',
                      fontSize:12.5, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
                    }}
                  />
                  {rankQuery && (
                    <button onClick={() => setRankQuery('')} style={{
                      background:'transparent', border:'1px solid #ECECEF', borderRadius:8,
                      padding:'5px 10px', fontSize:11, color:'#6e6e73', cursor:'pointer', fontFamily:'inherit',
                    }}>Limpiar</button>
                  )}
                  <span style={{ fontSize:11, color:'#6e6e73' }}>Orden por influencia</span>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:8 }}>
                {slice.map(a => {
                  const matchHL = rq && a.nombre.toLowerCase().includes(rq)
                  return (
                    <div key={a.id} style={{
                      display:'grid', gridTemplateColumns:'auto 1fr 50px', gap:10, alignItems:'center',
                      padding:'9px 12px',
                      background: matchHL ? '#FFFBEA' : '#FAFAFB',
                      border:`1px solid ${matchHL ? '#F2C43A' : '#ECECEF'}`,
                      borderRadius:10, cursor:'pointer',
                    }}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setPinned(pinned === a.id ? null : a.id)}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%', background:a.color, color:'#fff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, flexShrink:0,
                      }}>{initials(a.nombre)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</div>
                        <div style={{ fontSize:10.5, color:'#6e6e73', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {CAT_LABEL[a.cat]} · <span style={{ color:a.color, fontWeight:600 }}>{a.partido}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:a.color, lineHeight:1 }}>{a.inf}</div>
                        <div style={{ fontSize:9, color:'#86868b', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700, marginTop:2 }}>infl.</div>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div style={{ gridColumn:'1/-1', padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>
                    {rq ? <>Sin coincidencias para «<strong>{rankQuery}</strong>».</> : 'Sin resultados.'}
                  </div>
                )}
              </div>
              {!rq && filtered.length > 60 && (
                <div style={{ textAlign:'center', marginTop:14 }}>
                  <button onClick={() => setShowAllRank(s => !s)} style={{
                    background:'#1d1d1f', color:'#fff', border:'none', borderRadius:999,
                    padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    {showAllRank ? `Mostrar solo top 60` : `Mostrar los ${filtered.length}`}
                  </button>
                </div>
              )}
            </section>
          )
        })()}
      </>)}
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Inteligencia Política · Mapa de Actores · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function MiniK({ label, n }: { label:string, n:number }) {
  return (
    <div style={{ textAlign:'center', padding:'9px 4px', borderRadius:9, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color:'#fff' }}>{n}</div>
      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', opacity:0.7, marginTop:3, color:'#fff' }}>{label}</div>
    </div>
  )
}
function Coord({ label, value, pos, color }: { label:string, value:number, pos:string, color:string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 10px' }}>
      <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color, letterSpacing:'-0.018em' }}>{value > 0 ? `+${value}` : value}</span>
        <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.04em' }}>{pos}</span>
      </div>
    </div>
  )
}

// ── Dossier types (mirror the API response) ───────────────────────────────────

interface DossierNewsItem {
  id: string; titulo: string; fuente: string; url: string
  fecha: string; sentimiento: number; resumen: string | null
}
interface DossierActividad {
  tipo: 'intervencion' | 'iniciativa' | 'votacion' | 'comparecencia'
  titulo: string; fecha: string; url?: string; organo?: string
}
interface DossierRelacion {
  nombre: string; tipo: 'aliado' | 'rival' | 'neutral'
  partido?: string; n_coocurrencias: number
}
interface DossierRelacionEstructural {
  tipo: string; etiqueta: string
  categoria: 'organica' | 'parlamentaria' | 'poder_informal' | 'dependencia' | 'mediatica' | 'economica' | 'co_mencion'
  destino: string
  signo: 'positivo' | 'negativo' | 'neutro' | 'ambivalente'
  fuerza: number; descripcion: string; desde: string
  fuente_tipo: 'estructural' | 'parlamentaria' | 'co_mencion'
}
interface DossierDafo {
  fortalezas: Array<{ titulo: string; descripcion: string; evidencia: string }>
  debilidades: Array<{ titulo: string; descripcion: string; evidencia: string }>
  oportunidades: Array<{ titulo: string; descripcion: string; horizonte: string }>
  amenazas: Array<{ titulo: string; descripcion: string; probabilidad: string; horizonte: string }>
  riesgo_judicial: { nivel: string; causas: string[]; descripcion: string }
  riesgo_interno_partido: { nivel: string; descripcion: string; actores_internos_criticos: string[] }
  riesgo_coalicion: { nivel: string; descripcion: string; socios_en_tension: string[] }
  riesgo_electoral: { nivel: string; intencion_voto_actual: number | null; tendencia: string; descripcion: string }
  sintesis_riesgo: string
}
interface DossierCargo {
  cargo: string; organismo: string; tipo: string
  fecha_inicio: string; fecha_fin: string | null
  descripcion: string; relevancia: number
}
interface DossierData {
  slug: string; nombre: string; cargo: string; partido: string; partido_color: string
  foto_url: string | null
  score_influencia: number; score_riesgo: number; score_mediacion: number
  score_influencia_desc: string; score_riesgo_desc: string
  scores_fuente: 'real' | 'estimado'
  bio: string; bio_fuente: string; bio_url: string
  eje_izq_dcha: number; eje_autoritario: number
  posicionamiento_fuente: 'ches_2024' | 'estimado'
  actividad: DossierActividad[]; actividad_score: number
  noticias: DossierNewsItem[]; n_noticias_24h: number
  sentimiento_media: number; tono_predominante: 'positivo' | 'negativo' | 'neutro'
  relaciones: DossierRelacion[]
  relaciones_estructurales: DossierRelacionEstructural[]
  dafo: DossierDafo | null
  cargos: DossierCargo[] | null
  agenda: Array<{ titulo: string; fecha: string; tipo: string; url?: string }>
  riesgo_narrativo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  señales_riesgo: string[]
  timestamp: string
}

type DossierTab = 'resumen' | 'actividad' | 'medios' | 'relaciones' | 'agenda' | 'posicion' | 'riesgo'

const DOSSIER_TABS: Array<{ id: DossierTab; label: string }> = [
  { id: 'resumen',   label: 'Resumen' },
  { id: 'actividad', label: 'Actividad' },
  { id: 'medios',    label: 'Medios' },
  { id: 'relaciones',label: 'Red' },
  { id: 'agenda',    label: 'Agenda' },
  { id: 'posicion',  label: 'Posicion' },
  { id: 'riesgo',    label: 'Riesgo' },
]

const RIESGO_COLOR = { BAJO: '#16A34A', MEDIO: '#D97706', ALTO: '#EA580C', CRITICO: '#DC2626' } as const
const TONO_COLOR = { positivo: '#16A34A', negativo: '#DC2626', neutro: '#6e6e73' } as const
const NIVEL_COLOR: Record<string, string> = { bajo: '#16A34A', medio: '#D97706', alto: '#EA580C', critico: '#DC2626' }
const SIGNO_COLOR: Record<string, string> = {
  positivo: 'rgba(34,197,94,0.85)',
  negativo: 'rgba(239,68,68,0.85)',
  ambivalente: 'rgba(245,158,11,0.85)',
  neutro: 'rgba(100,116,139,0.5)',
}
const CAT_FILTER_LABEL: Record<string, string> = {
  todas: 'Todas',
  organica: 'Poder',
  parlamentaria: 'Parlamentarias',
  poder_informal: 'Rivalidad',
  mediatica: 'Mediáticas',
  dependencia: 'Dependencias',
  economica: 'Económicas',
}

function DossierView({ actors, liveByName, selectedId, onSelect, onOpenGraph }: {
  actors: import('@/lib/actor-utils').ActorVO[]
  liveByName: Record<string, ApiPersona>
  selectedId: string
  onSelect: (id: string) => void
  onOpenGraph: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<DossierTab>('resumen')

  const filtered = actors.filter(a =>
    !search || a.nombre.toLowerCase().includes(search.toLowerCase()) || a.partido.toLowerCase().includes(search.toLowerCase())
  )
  const a = actors.find(x => x.id === selectedId) ?? actors[0]
  const live = a ? liveByName[a.nombre.toLowerCase()] : undefined

  const slug = encodeURIComponent(
    (a?.nombre ?? '').toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u')
      .replace(/ñ/g,'n').replace(/ç/g,'c').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
  )

  const { data: dossier, loading: loadingDossier } = useApi<DossierData>(
    a ? `/api/actores/${slug}/dossier?partido=${encodeURIComponent(a.partido)}&cargo=${encodeURIComponent(a.cargo)}&color=${encodeURIComponent(a.color)}` : '',
    { refreshInterval: 0 }
  )

  useEffect(() => { setActiveTab('resumen') }, [selectedId])

  void live

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
      {/* Actor list sidebar */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: 14 }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar actor…"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e8e8ed', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} />
        <div style={{ maxHeight: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.slice(0, 80).map(x => {
            const active = x.id === selectedId
            return (
              <button key={x.id} onClick={() => onSelect(x.id)} style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 10,
                border: '1px solid ' + (active ? x.color : '#f0f0f3'),
                background: active ? `${x.color}10` : '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{x.nombre}</div>
                <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{x.partido} · {x.cargo}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dossier panel */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '20px 24px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          {dossier?.foto_url ? (
            <img src={dossier.foto_url} alt={a.nombre} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${a.color}` }}/>
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: a.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, flexShrink: 0,
            }}>{initials(a.nombre)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, letterSpacing: '-0.015em' }}>{a.nombre}</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', borderRadius: 999, background: `${a.color}15`, color: a.color, fontSize: 11, fontWeight: 700 }}>{a.partido}</span>
              <span style={{ fontSize: 11.5, color: '#6e6e73' }}>{a.cargo}</span>
              {dossier && (
                <span style={{ fontSize: 9, color: dossier.scores_fuente === 'real' ? '#16A34A' : '#D97706', fontWeight: 700, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 999, background: dossier.scores_fuente === 'real' ? '#16A34A15' : '#D9770615' }}>
                  {dossier.scores_fuente === 'real' ? 'DATOS REALES' : 'ESTIMADO'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onOpenGraph} style={{
            padding: '7px 13px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>Grafo →</button>
        </div>

        {/* Score strip */}
        {loadingDossier ? (
          <div style={{ height: 56, background: '#f5f5f7', borderRadius: 10, marginBottom: 14 }}/>
        ) : dossier ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <div>
              <ScoreBar label="Influencia" value={dossier.score_influencia} max={100} color="#1F4E8C"/>
              {dossier.score_influencia_desc && (
                <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3, lineHeight: 1.3 }}>{dossier.score_influencia_desc}</div>
              )}
            </div>
            <div>
              <ScoreBar label="Riesgo" value={dossier.score_riesgo} max={100} color="#b25000"/>
              {dossier.score_riesgo_desc && (
                <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3, lineHeight: 1.3 }}>{dossier.score_riesgo_desc}</div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                <span>Tono media</span>
                <span style={{ color: TONO_COLOR[dossier.tono_predominante], fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 11 }}>
                  {dossier.tono_predominante.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${TONO_COLOR[dossier.tono_predominante]}15`, color: TONO_COLOR[dossier.tono_predominante] }}>
                {dossier.sentimiento_media >= 0 ? '+' : ''}{dossier.sentimiento_media.toFixed(2)} · {dossier.n_noticias_24h} noticias 24h
              </span>
            </div>
          </div>
        ) : null}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e8e8ed', marginBottom: 18 }}>
          {DOSSIER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: 'none', border: 'none', padding: '7px 12px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#1d1d1f' : '#6e6e73',
              borderBottom: activeTab === tab.id ? '2px solid #1d1d1f' : '2px solid transparent',
              transition: 'all 120ms', marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {loadingDossier && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 36, background: '#f5f5f7', borderRadius: 8 }}/>)}
          </div>
        )}

        {!loadingDossier && dossier && (
          <>
            {/* RESUMEN */}
            {activeTab === 'resumen' && (
              <div>
                <p style={{ fontSize: 13, color: '#424245', lineHeight: 1.7, margin: '0 0 18px' }}>
                  {dossier.bio}
                </p>
                {dossier.bio_url && (
                  <div style={{ marginBottom: 16 }}>
                    <a href={dossier.bio_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1F4E8C', textDecoration: 'none', fontWeight: 600 }}>
                      Fuente: {dossier.bio_fuente} →
                    </a>
                  </div>
                )}
                {/* Last activity snippet */}
                {dossier.actividad.length > 0 && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f5f5f7', borderRadius: 10, borderLeft: '3px solid #1F4E8C' }}>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ultima actividad</div>
                    <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{dossier.actividad[0].titulo}</div>
                  </div>
                )}
                {/* Relations summary */}
                {(dossier.relaciones_estructurales.length > 0 || dossier.relaciones.length > 0) && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f5f5f7', borderRadius: 10, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Red política</div>
                      <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: '#DC2626', lineHeight: 1 }}>
                        {dossier.relaciones_estructurales.length + dossier.relaciones.length}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.4 }}>
                      {dossier.relaciones_estructurales.length} relaciones estructurales · {dossier.relaciones.length} co-menciones recientes
                    </div>
                  </div>
                )}
                {/* Ideology quick view */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                  <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Eje Izq-Dcha</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: dossier.eje_izq_dcha < 0 ? '#C53030' : '#2D4A8A' }}>
                      {dossier.eje_izq_dcha > 0 ? `+${dossier.eje_izq_dcha.toFixed(1)}` : dossier.eje_izq_dcha.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', marginTop: 3 }}>{dossier.posicionamiento_fuente === 'ches_2024' ? 'CHES 2024' : 'Estimado'}</div>
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Eje Libertario</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: dossier.eje_autoritario > 0 ? '#7C3AED' : '#0F766E' }}>
                      {dossier.eje_autoritario > 0 ? `+${dossier.eje_autoritario.toFixed(1)}` : dossier.eje_autoritario.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', marginTop: 3 }}>{dossier.eje_autoritario > 0 ? 'Tendencia autoritaria' : 'Tendencia libertaria'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVIDAD PARLAMENTARIA */}
            {activeTab === 'actividad' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>
                    {dossier.actividad.length} iniciativas
                  </span>
                  <ScoreBar label="Score de actividad" value={dossier.actividad_score} max={100} color="#0F766E"/>
                </div>
                <div style={{ fontSize: 11, color: '#86868b', marginBottom: 12 }}>
                  Intensidad de actividad parlamentaria registrada · 0-100
                </div>
                {dossier.actividad.length === 0 ? (
                  <div style={{ padding: '20px 16px', background: '#f5f5f7', borderRadius: 12, borderLeft: '3px solid #D97706' }}>
                    <div style={{ fontSize: 12.5, color: '#1d1d1f', fontWeight: 600, marginBottom: 6 }}>Sin iniciativas parlamentarias recientes</div>
                    <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
                      Sin iniciativas parlamentarias registradas en los últimos 30 días. Para {dossier.cargo}, la actividad se mide por comparecencias, decretos y declaraciones oficiales.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dossier.actividad.map((act, i) => {
                      const leftColor = act.tipo === 'intervencion' ? '#7C3AED' : act.tipo === 'comparecencia' ? '#0E7490' : act.tipo === 'votacion' ? '#D97706' : '#1F4E8C'
                      return (
                        <a key={i} href={act.url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <div style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #e8e8ed', background: '#fafafa', borderLeft: `3px solid ${leftColor}`, transition: 'background 120ms' }}
                               onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f5')}
                               onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${leftColor}15`, color: leftColor, flexShrink: 0, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{act.tipo}</span>
                              <span style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{act.titulo}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 4 }}>
                              {new Date(act.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {act.organo && ` · ${act.organo}`}
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MEDIOS */}
            {activeTab === 'medios' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ background: '#f5f5f7', borderRadius: 9, padding: '8px 14px' }}>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Noticias 72h</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{dossier.noticias.length}</div>
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: 9, padding: '8px 14px' }}>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ultimas 24h</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{dossier.n_noticias_24h}</div>
                  </div>
                  <div style={{ background: `${TONO_COLOR[dossier.tono_predominante]}12`, borderRadius: 9, padding: '8px 14px' }}>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tono</div>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 20, fontWeight: 700, color: TONO_COLOR[dossier.tono_predominante] }}>
                      {dossier.sentimiento_media >= 0 ? '+' : ''}{dossier.sentimiento_media.toFixed(2)}
                    </div>
                  </div>
                </div>
                {dossier.noticias.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#6e6e73', fontSize: 12 }}>Sin noticias recientes encontradas</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dossier.noticias.map(n => {
                      const sc = n.sentimiento
                      const sc_color = sc > 0.1 ? '#16A34A' : sc < -0.1 ? '#DC2626' : '#6e6e73'
                      return (
                        <a key={n.id} href={n.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <div style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #e8e8ed', background: '#fafafa', display: 'grid', gridTemplateColumns: '1fr 40px', gap: 10, alignItems: 'center', transition: 'background 120ms' }}
                               onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f5')}
                               onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.35, marginBottom: 3 }}>{n.titulo}</div>
                              <div style={{ fontSize: 10, color: '#6e6e73', display: 'flex', gap: 6 }}>
                                <span style={{ fontWeight: 600 }}>{n.fuente}</span>
                                <span>· {new Date(n.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sc_color }}>{sc >= 0 ? '+' : ''}{sc.toFixed(2)}</span>
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RED DE RELACIONES — redesigned */}
            {activeTab === 'relaciones' && (
              <RedTab dossier={dossier} actorColor={a.color} />
            )}

            {/* AGENDA */}
            {activeTab === 'agenda' && (
              <div>
                {/* Future events */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Proximos eventos</div>
                  {(() => {
                    const futureEvents = dossier.agenda.filter(ev => ev.tipo === 'agenda_futura')
                    const newsEvents = dossier.agenda.filter(ev => ev.tipo !== 'agenda_futura')
                    if (dossier.agenda.length === 0) {
                      return (
                        <div style={{ padding: '16px', background: '#f5f5f7', borderRadius: 10, fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
                          Sin eventos futuros confirmados — conectar agenda oficial para datos en tiempo real
                        </div>
                      )
                    }
                    return (
                      <>
                        {futureEvents.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                            {futureEvents.map((ev, i) => (
                              <a key={i} href={ev.url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <div style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid #16A34A40', background: '#16A34A08', transition: 'background 120ms' }}
                                     onMouseEnter={e => (e.currentTarget.style.background = '#16A34A15')}
                                     onMouseLeave={e => (e.currentTarget.style.background = '#16A34A08')}>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#16A34A20', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CONFIRMADO</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#0F766E15', color: '#0F766E', textTransform: 'uppercase' }}>{ev.tipo}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{ev.titulo}</div>
                                  <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 4 }}>
                                    {new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {newsEvents.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: futureEvents.length > 0 ? 16 : 0 }}>Ultimas apariciones</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {newsEvents.map((ev, i) => (
                                <a key={i} href={ev.url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <div style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid #e8e8ed', background: '#fafafa', transition: 'background 120ms' }}
                                       onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f5')}
                                       onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D9770620', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>PROBABLE ~70%</span>
                                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#0F766E15', color: '#0F766E', textTransform: 'uppercase' }}>{ev.tipo}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{ev.titulo}</div>
                                    <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 4 }}>
                                      {new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* POSICIONAMIENTO — redesigned */}
            {activeTab === 'posicion' && (
              <PosicionTab dossier={dossier} actorColor={a.color} partido={a.partido} />
            )}

            {/* RIESGO — redesigned */}
            {activeTab === 'riesgo' && (
              <RiesgoTab dossier={dossier} />
            )}
          </>
        )}

        {!loadingDossier && !dossier && (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
            No se pudieron cargar los datos del dossier para {a.nombre}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Red Tab ───────────────────────────────────────────────────────────────────

function RedTab({ dossier, actorColor }: { dossier: DossierData; actorColor: string }) {
  const [viewMode, setViewMode] = useState<'grafo' | 'tabla'>('grafo')
  const [catFilter, setCatFilter] = useState('todas')
  const [tooltip, setTooltip] = useState<{ rel: DossierRelacionEstructural; x: number; y: number } | null>(null)

  // Merge structural + co-mention relations
  const coMentionRels: DossierRelacionEstructural[] = dossier.relaciones.map(r => ({
    tipo: r.tipo === 'aliado' ? 'aliado' : r.tipo === 'rival' ? 'rival_directo' : 'neutral',
    etiqueta: r.tipo === 'aliado' ? 'Aliado' : r.tipo === 'rival' ? 'Rival' : 'Neutral',
    categoria: 'co_mencion' as const,
    destino: r.nombre,
    signo: r.tipo === 'aliado' ? 'positivo' : r.tipo === 'rival' ? 'negativo' : 'neutro',
    fuerza: Math.min(1, r.n_coocurrencias / 10),
    descripcion: `${r.n_coocurrencias} co-menciones en noticias recientes`,
    desde: '',
    fuente_tipo: 'co_mencion' as const,
  }))

  const allRels = [...dossier.relaciones_estructurales, ...coMentionRels]

  const catOptions = ['todas', ...Array.from(new Set(allRels.map(r => r.categoria)))]

  const filteredRels = catFilter === 'todas'
    ? allRels
    : allRels.filter(r => r.categoria === catFilter)

  // SVG layout
  const CX = 260, CY = 180, R = 140
  const visible = filteredRels.slice(0, 8)

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f5f5f7', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setViewMode('grafo')} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none', fontFamily: 'inherit',
            background: viewMode === 'grafo' ? '#fff' : 'transparent',
            color: viewMode === 'grafo' ? '#1d1d1f' : '#6e6e73',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            boxShadow: viewMode === 'grafo' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>Red</button>
          <button onClick={() => setViewMode('tabla')} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none', fontFamily: 'inherit',
            background: viewMode === 'tabla' ? '#fff' : 'transparent',
            color: viewMode === 'tabla' ? '#1d1d1f' : '#6e6e73',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            boxShadow: viewMode === 'tabla' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>Tabla</button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {catOptions.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '4px 10px', borderRadius: 999, border: '1px solid',
              borderColor: catFilter === cat ? '#1d1d1f' : '#e8e8ed',
              background: catFilter === cat ? '#1d1d1f' : 'transparent',
              color: catFilter === cat ? '#fff' : '#6e6e73',
              fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{CAT_FILTER_LABEL[cat] ?? cat}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#86868b' }}>
          {allRels.length} relaciones · {dossier.relaciones_estructurales.length} estructurales
        </span>
      </div>

      {filteredRels.length === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: '#6e6e73', fontSize: 12 }}>
          Sin relaciones en esta categoría
        </div>
      )}

      {filteredRels.length > 0 && viewMode === 'grafo' && (
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 520 360" style={{ width: '100%', height: 'auto', display: 'block', background: '#fafafa', borderRadius: 12, border: '1px solid #e8e8ed' }}>
            {/* Edges */}
            {visible.map((rel, i) => {
              const angle = (2 * Math.PI * i) / visible.length - Math.PI / 2
              const nx = CX + R * Math.cos(angle)
              const ny = CY + R * Math.sin(angle)
              const strokeColor = SIGNO_COLOR[rel.signo] ?? 'rgba(100,116,139,0.5)'
              const strokeW = rel.fuerza * 4 + 1
              const midX = (CX + nx) / 2
              const midY = (CY + ny) / 2
              return (
                <g key={i}>
                  <line x1={CX} y1={CY} x2={nx} y2={ny}
                    stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" opacity="0.75"/>
                  <text x={midX} y={midY - 4} textAnchor="middle" fontSize="8" fill="#6e6e73" fontWeight="600">
                    {rel.etiqueta.length > 16 ? rel.etiqueta.slice(0, 14) + '…' : rel.etiqueta}
                  </text>
                </g>
              )
            })}
            {/* Surrounding nodes */}
            {visible.map((rel, i) => {
              const angle = (2 * Math.PI * i) / visible.length - Math.PI / 2
              const nx = CX + R * Math.cos(angle)
              const ny = CY + R * Math.sin(angle)
              const nodeColor = SIGNO_COLOR[rel.signo] ?? '#6e6e73'
              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => setTooltip({ rel, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}>
                  <circle cx={nx} cy={ny} r={22} fill={nodeColor} opacity="0.15" stroke={nodeColor} strokeWidth="1.5"/>
                  <text x={nx} y={ny + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontWeight="700" fill="#1d1d1f">
                    {rel.destino.split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
                  </text>
                  <text x={nx} y={ny + 30} textAnchor="middle" fontSize="7.5" fill="#6e6e73" fontWeight="600">
                    {rel.destino.split(' ')[0]}
                  </text>
                  {/* Categoria badge */}
                  <text x={nx} y={ny + 40} textAnchor="middle" fontSize="6.5" fill={nodeColor.replace('0.85', '1').replace('0.5', '0.8')}>
                    {rel.categoria === 'organica' ? 'ORG' : rel.categoria === 'parlamentaria' ? 'PARL' : rel.categoria === 'poder_informal' ? 'POD' : rel.categoria === 'co_mencion' ? 'MED' : rel.categoria.slice(0, 4).toUpperCase()}
                  </text>
                </g>
              )
            })}
            {/* Central node */}
            <circle cx={CX} cy={CY} r={32} fill={actorColor} opacity="0.9"/>
            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="#fff">
              ACTOR
            </text>
          </svg>
          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed', top: tooltip.y + 12, left: tooltip.x + 8,
              background: '#1d1d1f', color: '#fff', padding: '10px 14px', borderRadius: 10,
              fontSize: 11.5, maxWidth: 260, zIndex: 9999, lineHeight: 1.5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.rel.destino}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{tooltip.rel.etiqueta} · {tooltip.rel.categoria}</div>
              <div>{tooltip.rel.descripcion}</div>
              {tooltip.rel.desde && <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Desde {tooltip.rel.desde}</div>}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 10, color: '#6e6e73', flexWrap: 'wrap' }}>
            {Object.entries(SIGNO_COLOR).map(([signo, color]) => (
              <span key={signo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 16, height: 3, background: color, display: 'inline-block', borderRadius: 2 }}/>
                {signo}
              </span>
            ))}
          </div>
        </div>
      )}

      {filteredRels.length > 0 && viewMode === 'tabla' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 60px 80px', gap: 8, padding: '6px 12px', background: '#f5f5f7', borderRadius: '8px 8px 0 0', fontSize: 9.5, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Actor</span><span>Tipo</span><span>Descripcion</span><span>Fuerza</span><span>Desde</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredRels.map((rel, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 60px 80px', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f0f0f3', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{rel.destino}</div>
                  <div style={{ fontSize: 9.5, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{rel.categoria}</div>
                </div>
                <div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${SIGNO_COLOR[rel.signo]}20`, color: SIGNO_COLOR[rel.signo].replace('0.85', '1').replace('0.5', '0.7'), textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {rel.etiqueta}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6e6e73', lineHeight: 1.4 }}>{rel.descripcion}</div>
                <div>
                  <div style={{ height: 4, background: '#f0f0f3', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${rel.fuerza * 100}%`, height: '100%', background: SIGNO_COLOR[rel.signo] }}/>
                  </div>
                  <div style={{ fontSize: 9, color: '#86868b', marginTop: 2 }}>{(rel.fuerza * 100).toFixed(0)}%</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{rel.desde || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Posicion Tab ──────────────────────────────────────────────────────────────

function PosicionTab({ dossier, actorColor, partido }: { dossier: DossierData; actorColor: string; partido: string }) {
  const dependencias = dossier.relaciones_estructurales.filter(r =>
    ['depende_electoralmente_de', 'depende_presupuestariamente_de', 'controla_a', 'patron_de', 'cliente_de'].includes(r.tipo)
  )

  return (
    <div>
      {/* SECTION A: Career trajectory */}
      {dossier.cargos && dossier.cargos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Trayectoria profesional</div>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: '#e8e8ed' }}/>
            {dossier.cargos.map((c, i) => {
              const isCurrent = c.fecha_fin === null
              const tipColor = isCurrent ? actorColor : '#9ca3af'
              const tipoLabel: Record<string, string> = { ejecutivo: 'EJE', partido: 'PAR', legislativo: 'LEG' }
              return (
                <div key={i} style={{ position: 'relative', marginBottom: 16, paddingLeft: 22 }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: -1, top: 4, width: 16, height: 16, borderRadius: '50%',
                    background: isCurrent ? actorColor : '#e8e8ed',
                    border: `2px solid ${tipColor}`,
                    boxShadow: isCurrent ? `0 0 0 3px ${actorColor}25` : 'none',
                  }}/>
                  <div style={{ padding: '10px 14px', background: isCurrent ? `${actorColor}08` : '#fafafa', borderRadius: 10, border: `1px solid ${isCurrent ? actorColor + '30' : '#e8e8ed'}` }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      {isCurrent && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${actorColor}20`, color: actorColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTUAL</span>
                      )}
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#f0f0f3', color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {tipoLabel[c.tipo] ?? c.tipo.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 2 }}>{c.cargo}</div>
                    <div style={{ fontSize: 11, color: actorColor, fontWeight: 600, marginBottom: 4 }}>{c.organismo}</div>
                    <div style={{ fontSize: 10.5, color: '#6e6e73', marginBottom: 6 }}>
                      {c.fecha_inicio} — {c.fecha_fin ?? 'Actualidad'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#424245', lineHeight: 1.5 }}>{c.descripcion}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION B: Ideological position */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Posicion ideologica</div>
        <div style={{ marginBottom: 14 }}>
          <IdeologicalScatter partido={partido} size={320}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#86868b', marginTop: 6, paddingTop: 4, borderTop: '1px solid #f0f0f3' }}>
            <span>Izquierda ←</span>
            <span style={{ color: '#6e6e73', fontWeight: 600 }}>{dossier.posicionamiento_fuente === 'ches_2024' ? 'CHES 2024' : 'Estimado'}</span>
            <span>→ Derecha</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>Izquierda — Derecha</div>
            <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 24, fontWeight: 700, color: dossier.eje_izq_dcha < 0 ? '#C53030' : '#2D4A8A' }}>
              {dossier.eje_izq_dcha > 0 ? `+${dossier.eje_izq_dcha.toFixed(1)}` : dossier.eje_izq_dcha.toFixed(1)}
            </div>
            <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 3 }}>
              {dossier.eje_izq_dcha < -3 ? 'Izquierda' : dossier.eje_izq_dcha < 0 ? 'Centroizquierda' : dossier.eje_izq_dcha < 3 ? 'Centro' : dossier.eje_izq_dcha < 6 ? 'Centroderecha' : 'Derecha'}
            </div>
          </div>
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>Libertario — Autoritario</div>
            <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 24, fontWeight: 700, color: dossier.eje_autoritario > 2 ? '#7C3AED' : '#0F766E' }}>
              {dossier.eje_autoritario > 0 ? `+${dossier.eje_autoritario.toFixed(1)}` : dossier.eje_autoritario.toFixed(1)}
            </div>
            <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 3 }}>
              {dossier.eje_autoritario > 2 ? 'Tendencia autoritaria' : dossier.eje_autoritario < -2 ? 'Tendencia libertaria' : 'Posicion moderada'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: Dependencies */}
      {dependencias.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Dependencias clave</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>De quien depende</div>
              {dependencias.filter(r => ['depende_electoralmente_de', 'depende_presupuestariamente_de', 'cliente_de'].includes(r.tipo)).map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{r.destino}</div>
                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.etiqueta}</div>
                  <div style={{ fontSize: 11, color: '#6e6e73', lineHeight: 1.4 }}>{r.descripcion}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>A quien necesita</div>
              {dependencias.filter(r => ['controla_a', 'patron_de'].includes(r.tipo)).map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{r.destino}</div>
                  <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.etiqueta}</div>
                  <div style={{ fontSize: 11, color: '#6e6e73', lineHeight: 1.4 }}>{r.descripcion}</div>
                </div>
              ))}
              {dependencias.filter(r => ['controla_a', 'patron_de'].includes(r.tipo)).length === 0 && (
                <div style={{ fontSize: 11.5, color: '#86868b', padding: '8px 0' }}>Sin dependencias activas registradas</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Riesgo Tab ────────────────────────────────────────────────────────────────

function RiesgoTab({ dossier }: { dossier: DossierData }) {
  const [expandedDafo, setExpandedDafo] = useState<string | null>(null)

  const dafoColor = { fortalezas: '#16A34A', debilidades: '#DC2626', oportunidades: '#1F4E8C', amenazas: '#D97706' }

  return (
    <div>
      {/* SECTION A: Risk dimensions */}
      {dossier.dafo ? (
        <>
          <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Dimensiones de riesgo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {([
              { key: 'riesgo_judicial', label: 'Judicial', data: dossier.dafo.riesgo_judicial },
              { key: 'riesgo_interno_partido', label: 'Interno partido', data: dossier.dafo.riesgo_interno_partido },
              { key: 'riesgo_coalicion', label: 'Coalicion', data: dossier.dafo.riesgo_coalicion },
              { key: 'riesgo_electoral', label: 'Electoral', data: dossier.dafo.riesgo_electoral },
            ] as const).map(({ key, label, data }) => {
              const nivel = data.nivel.toLowerCase()
              const nivelColor = NIVEL_COLOR[nivel] ?? '#6e6e73'
              const nivelPct = nivel === 'critico' ? 95 : nivel === 'alto' ? 75 : nivel === 'medio' ? 45 : 15
              return (
                <div key={key} style={{ padding: '12px 14px', background: `${nivelColor}08`, borderRadius: 10, border: `1px solid ${nivelColor}25` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${nivelColor}20`, color: nivelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {data.nivel}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f' }}>{label}</span>
                    <div style={{ flex: 1, height: 4, background: '#e8e8ed', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${nivelPct}%`, height: '100%', background: nivelColor, borderRadius: 2 }}/>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.5 }}>{data.descripcion}</div>
                </div>
              )
            })}
          </div>

          {/* SECTION B: DAFO 2x2 grid */}
          <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Analisis DAFO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            {([
              { key: 'fortalezas', label: 'Fortalezas', items: dossier.dafo.fortalezas, color: dafoColor.fortalezas },
              { key: 'debilidades', label: 'Debilidades', items: dossier.dafo.debilidades, color: dafoColor.debilidades },
              { key: 'oportunidades', label: 'Oportunidades', items: dossier.dafo.oportunidades, color: dafoColor.oportunidades },
              { key: 'amenazas', label: 'Amenazas', items: dossier.dafo.amenazas, color: dafoColor.amenazas },
            ] as const).map(({ key, label, items, color }) => (
              <div key={key} style={{ background: `${color}06`, border: `1px solid ${color}25`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((item: { titulo: string; descripcion: string; evidencia?: string; horizonte?: string; probabilidad?: string }, ii: number) => {
                    const itemKey = `${key}-${ii}`
                    const isExpanded = expandedDafo === itemKey
                    return (
                      <div key={ii} style={{ cursor: 'pointer' }} onClick={() => setExpandedDafo(isExpanded ? null : itemKey)}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ color, fontWeight: 700, fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                            {key === 'fortalezas' ? '+' : key === 'debilidades' ? '-' : key === 'oportunidades' ? '→' : '!'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>{item.titulo}</div>
                            {'horizonte' in item && (item as {horizonte: string}).horizonte && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2, display: 'inline-block' }}>
                                {(item as {horizonte: string}).horizonte}
                              </span>
                            )}
                            {'probabilidad' in item && (item as {probabilidad: string}).probabilidad && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2, display: 'inline-block' }}>
                                Prob. {(item as {probabilidad: string}).probabilidad}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 6, marginLeft: 14, padding: '8px 10px', background: '#fff', borderRadius: 7, border: '1px solid #f0f0f3' }}>
                            <div style={{ fontSize: 11, color: '#6e6e73', lineHeight: 1.5, marginBottom: item.evidencia ? 6 : 0 }}>{item.descripcion}</div>
                            {item.evidencia && (
                              <div style={{ fontSize: 10, color: '#86868b', fontStyle: 'italic', lineHeight: 1.4 }}>Evidencia: {item.evidencia}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* SECTION C: Strategic synthesis */}
          {dossier.dafo.sintesis_riesgo && (() => {
            const overallRiesgo = dossier.score_riesgo
            const synthColor = overallRiesgo >= 75 ? '#DC2626' : overallRiesgo >= 55 ? '#EA580C' : overallRiesgo >= 35 ? '#D97706' : '#16A34A'
            return (
              <div style={{ marginBottom: 22, padding: '16px 18px', background: `${synthColor}08`, borderRadius: 12, borderLeft: `4px solid ${synthColor}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: synthColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sintesis estrategica de riesgo</div>
                <p style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.7, margin: 0 }}>{dossier.dafo.sintesis_riesgo}</p>
              </div>
            )
          })()}
        </>
      ) : (
        /* No DAFO: show narrative risk */
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', border: `4px solid ${RIESGO_COLOR[dossier.riesgo_narrativo]}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: `${RIESGO_COLOR[dossier.riesgo_narrativo]}10`,
          }}>
            <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 11, fontWeight: 700, color: RIESGO_COLOR[dossier.riesgo_narrativo], letterSpacing: '0.06em' }}>{dossier.riesgo_narrativo}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>Riesgo narrativo: {dossier.riesgo_narrativo}</div>
            <div style={{ fontSize: 11.5, color: '#6e6e73' }}>Score de riesgo algoritmico: {dossier.score_riesgo}/100</div>
            <div style={{ fontSize: 11.5, color: '#6e6e73' }}>Score de mediacion: {dossier.score_mediacion}/100 (presencia en medios)</div>
          </div>
        </div>
      )}

      {/* SECTION D: Risk signals (always shown) */}
      <div>
        <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Señales de riesgo detectadas
          {!dossier.dafo && ` · ${dossier.riesgo_narrativo}`}
        </div>
        {dossier.señales_riesgo.length === 0 ? (
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>Sin señales de riesgo narrativo activas en las ultimas 72h</div>
        ) : (
          dossier.señales_riesgo.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12.5, color: '#1d1d1f', alignItems: 'flex-start' }}>
              <span style={{ color: RIESGO_COLOR[dossier.riesgo_narrativo], fontWeight: 700, flexShrink: 0, marginTop: 1 }}>!</span>
              {s}
            </div>
          ))
        )}
        {/* Negative news as signals */}
        {dossier.noticias.filter(n => n.sentimiento < -0.2).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Noticias con señal negativa</div>
            {dossier.noticias.filter(n => n.sentimiento < -0.2).slice(0, 5).map(n => (
              <a key={n.id} href={n.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>{n.sentimiento.toFixed(2)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.3 }}>{n.titulo}</div>
                    <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2 }}>{n.fuente} · {new Date(n.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#f5f5f7', borderRadius: 10, fontSize: 11.5, color: '#6e6e73', lineHeight: 1.6 }}>
          <strong style={{ color: '#1d1d1f', display: 'block', marginBottom: 4 }}>Metodologia</strong>
          El riesgo narrativo se calcula a partir del volumen de noticias negativas en las ultimas 72h,
          la velocidad de aparicion de nuevas menciones, y la deteccion de patrones de escalada
          (corrupcion, crisis de liderazgo, dimision) en los titulares. Fuente: Google News ES.
          {dossier.dafo && ' El score se enriquece con analisis DAFO estructural curado.'}
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: '#1d1d1f', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 13 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, background: '#e8e8ed', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}
