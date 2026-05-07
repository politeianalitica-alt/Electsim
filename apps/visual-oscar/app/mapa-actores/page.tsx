'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { ACTORES, CATS, CAT_LABEL, initials, type Categoria } from '@/lib/actores'

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
  const focused = pinned ?? hovered
  const focusedActor = focused ? ACTORES.find(a => a.id === focused) : null

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
