'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { ACTORES, CATS, CAT_LABEL, initials, type Categoria } from '@/lib/actores'
import { useApi } from '@/lib/useApi'
import RelacionesGrafo from '@/components/RelacionesGrafo'
import IdeologicalScatter from '@/components/IdeologicalScatter'
import EmptyState from '@/components/EmptyState'
import { findDossier } from '@/lib/dosieres-link'

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
  const focusedDossier = useMemo(() => focusedActor ? findDossier(focusedActor.nombre) : null, [focusedActor])

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
 <Link href="/dosieres" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              marginTop:14, padding:'9px 18px', borderRadius:999,
              background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)',
              color:'#fff', textDecoration:'none', fontSize:12, fontWeight:600, letterSpacing:'0.02em',
              transition:'background 150ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.20)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)' }}>
              ◐ Ver dosieres de personas (1.955 fichas · Congreso + Senado + 18 autonómicos) →
 </Link>
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
          maxActors={300}
        />
      )}

      {view === 'dossier' && (
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
 <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>
            {visible.length} actores visibles · tamaño de burbuja = influencia
 </span>
 </div>

        {/* Empty state cuando filtros no devuelven resultados */}
        {visible.length === 0 && (
 <EmptyState
            severity="neutral"
            title="No hay actores que cumplan estos filtros"
            description="Prueba a ampliar el universo de búsqueda · quita el filtro de categoría o reduce el término del buscador para ver más resultados."
            reason={filterCat !== 'Todos' || query ? `Filtros activos · categoría '${filterCat}'${query ? ` · búsqueda '${query}'` : ''}` : 'Sin actores en el universo actual'}
            source={`Catálogo Politeia · ${ACTORES.length} actores totales`}
            primaryAction={{ label: 'Restablecer filtros', onClick: () => { setFilterCat('Todos'); setQuery('') } }}
            secondaryAction={{ label: 'Ver dossier completo', onClick: () => setView('dossier') }}
            style={{ marginBottom: 14 }}
          />
        )}

        {/* Cuadrante + panel detalle · solo si hay actores */}
        {visible.length > 0 && (
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

                {/* Valoración + influencia */}
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

                {/* Coordenadas ideológicas */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
 <Coord label="Eje H" value={focusedActor.ejeX} pos={focusedActor.ejeX < 0 ? 'IZQ' : focusedActor.ejeX > 0 ? 'DCHA' : '—'} color={focusedActor.color}/>
 <Coord label="Eje V" value={focusedActor.ejeY} pos={focusedActor.ejeY < 0 ? 'DESCENT.' : focusedActor.ejeY > 0 ? 'CENT.' : '—'} color={focusedActor.color}/>
 </div>

                {/* Link al dossier completo · si existe en los 363 del informe */}
                {focusedDossier && (
 <Link
                    href={`/dosieres/${focusedDossier.slug}`}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      gap:8, padding:'10px 13px', borderRadius:10,
                      background:`linear-gradient(135deg, ${focusedActor.color}18, ${focusedActor.color}08)`,
                      border:`1px solid ${focusedActor.color}40`,
                      textDecoration:'none', color:'inherit', marginBottom:14,
                      transition:'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 4px 12px ${focusedActor.color}30` }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
                  >
 <div>
 <div style={{ fontSize:9.5, color:focusedActor.color, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                        Ficha completa
 </div>
 <div style={{ fontSize:11.5, color:'#3a3a3d', marginTop:2 }}>
                        Perfil · {focusedDossier.n_apartados} apartado{focusedDossier.n_apartados !== 1 ? 's' : ''} · relaciones · patrimonio
 </div>
 </div>
 <span style={{ fontSize:18, color:focusedActor.color, fontWeight:700 }}>→</span>
 </Link>
                )}

                {/* Fortalezas */}
 <div style={{ marginBottom:10 }}>
 <div style={{ fontSize:10, color:'#16A34A', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Fortalezas</div>
                  {focusedActor.forts.map(f => (
 <div key={f} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
 <span style={{ color:'#16A34A', flexShrink:0, fontWeight:700 }}>+</span>{f}
 </div>
                  ))}
 </div>

                {/* Debilidades */}
 <div style={{ marginBottom:10 }}>
 <div style={{ fontSize:10, color:'#DC2626', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Debilidades</div>
                  {focusedActor.debs.map(d => (
 <div key={d} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
 <span style={{ color:'#DC2626', flexShrink:0, fontWeight:700 }}>−</span>{d}
 </div>
                  ))}
 </div>

                {/* Eventos */}
 <div style={{ marginBottom:10 }}>
 <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Eventos recientes</div>
                  {focusedActor.evs.map(e => (
 <div key={e} style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, marginBottom:4, lineHeight:1.4 }}>
 <span style={{ color:focusedActor.color, flexShrink:0, fontWeight:700 }}>→</span>{e}
 </div>
                  ))}
 </div>

                {/* Redes */}
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
        )}

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

// Inline dossier view: scrollable list of actors on the left + full dossier on the right
function DossierView({ actors, liveByName, selectedId, onSelect, onOpenGraph }: {
  actors: typeof ACTORES
  liveByName: Record<string, ApiPersona>
  selectedId: string
  onSelect: (id: string) => void
  onOpenGraph: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = actors.filter(a =>
    !search || a.nombre.toLowerCase().includes(search.toLowerCase()) || a.partido.toLowerCase().includes(search.toLowerCase())
  )
  const a = actors.find(x => x.id === selectedId) ?? actors[0]
  const live = a ? liveByName[a.nombre.toLowerCase()] : undefined

  const sentimiento = live?.sentimiento_actual ?? (a?.seg.tono ?? 0) / 50
  const sentimientoTier = sentimiento > 0.1 ? 'mejorando' : sentimiento < -0.1 ? 'empeorando' : 'estable'
  const sentimientoColor = sentimiento > 0.1 ? '#2d8a39' : sentimiento < -0.1 ? '#c42c2c' : '#6e6e73'
  const aDossier = a ? findDossier(a.nombre) : null

  return (
 <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
 <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: 14 }}>
 <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar actor…"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e8e8ed', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', marginBottom: 10 }} />
 <div style={{ maxHeight: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.slice(0, 80).map(x => {
            const active = x.id === selectedId
            const hasFicha = !!findDossier(x.nombre)
            return (
 <button key={x.id} onClick={() => onSelect(x.id)} style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 10,
                border: '1px solid ' + (active ? x.color : '#f0f0f3'),
                background: active ? `${x.color}10` : '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
                position:'relative',
              }}>
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', flex:1 }}>{x.nombre}</div>
                  {hasFicha && (
 <span title="Ficha completa disponible" style={{
                      fontSize:9, padding:'1px 6px', borderRadius:999,
                      background:`${x.color}18`, color:x.color, fontWeight:800,
                      letterSpacing:'0.04em',
                    }}>FICHA</span>
                  )}
 </div>
 <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{x.partido} · {x.cargo}</div>
 </button>
            )
          })}
 </div>
 </div>

 <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '20px 24px' }}>
        {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
 <div style={{
            width: 64, height: 64, borderRadius: '50%', background: a.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700,
          }}>{initials(a.nombre)}</div>
 <div style={{ flex: 1 }}>
 <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, letterSpacing: '-0.015em' }}>{a.nombre}</h2>
 <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
 <span style={{ padding: '3px 10px', borderRadius: 999, background: `${a.color}15`, color: a.color, fontSize: 11, fontWeight: 700 }}>{a.partido}</span>
              {live?.ambito && <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10.5, fontWeight: 600 }}>{live.ambito}</span>}
 <span style={{ fontSize: 12, color: '#6e6e73' }}>{a.cargo}</span>
 </div>
 </div>
 <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {aDossier && (
 <Link href={`/dosieres/${aDossier.slug}`} style={{
                padding: '8px 14px', borderRadius: 999,
                background: a.color, color: '#fff', textDecoration:'none',
                fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                letterSpacing:'0.02em',
              }}>◐ Ficha completa con relaciones y patrimonio →</Link>
            )}
 <button onClick={onOpenGraph} style={{
              padding: '8px 14px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
              fontSize: 11.5, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
            }}>Ver grafo completo →</button>
 </div>
 </div>

        {/* Scores row */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
 <ScoreBar label="Influencia" value={live?.score_influencia ?? a.inf} max={100} color="#1F4E8C"/>
 <ScoreBar label="Riesgo" value={live?.score_riesgo ?? Math.round(50 + (a.ejeX ?? 0) * 0.4)} max={100} color="#b25000"/>
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
 <span>Sentimiento</span>
 <span style={{ color: sentimientoColor, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 13 }}>
                {sentimiento >= 0 ? '+' : ''}{sentimiento.toFixed(2)}
 </span>
 </div>
 <span style={{
              padding: '3px 10px', borderRadius: 999, background: `${sentimientoColor}15`, color: sentimientoColor,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{live?.tendencia_sentimiento ?? sentimientoTier}</span>
 </div>
 </div>

        {/* Two-column body: left bio + right scatter */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
 <div>
 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Biografía</div>
 <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#424245', lineHeight: 1.6 }}>
              {live?.bio ?? `${a.cargo} de ${a.partido}. Influencia ${a.inf}/100, valoración ${a.val}/10. ${a.evs?.[0] ?? ''}`}
 </p>

 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Fortalezas</div>
 <div style={{ marginBottom: 14 }}>
              {a.forts.map(f => (
 <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, color: '#1d1d1f' }}>
 <span style={{ color: '#2d8a39', fontWeight: 700 }}>+</span> {f}
 </div>
              ))}
 </div>

 <div style={{ fontSize: 10, color: '#c42c2c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Debilidades</div>
 <div>
              {a.debs.map(d => (
 <div key={d} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, color: '#1d1d1f' }}>
 <span style={{ color: '#c42c2c', fontWeight: 700 }}>−</span> {d}
 </div>
              ))}
 </div>
 </div>

 <div>
 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
              Posicionamiento ideológico
 </div>
 <IdeologicalScatter partido={a.partido} size={300}/>
 </div>
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
