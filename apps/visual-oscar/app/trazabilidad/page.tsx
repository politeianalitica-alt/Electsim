'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useTrazabilidad } from '@/hooks/contratacion/useTrazabilidad'
import type { HitoTraz, FaseHitoTraz, Expediente } from '@/types/contratacion'

const FASE_META: Record<FaseHitoTraz, { label: string; color: string; orden: number }> = {
  'registro':   { label:'Registro de entrada',          color:'#6e6e73', orden: 1 },
  'mesa':       { label:'Calificación · Mesa',          color:'#0E7490', orden: 2 },
  'totalidad':  { label:'Debate de totalidad',          color:'#1F4E8C', orden: 3 },
  'enmiendas':  { label:'Plazo de enmiendas',           color:'#5B21B6', orden: 4 },
  'ponencia':   { label:'Ponencia · informe',           color:'#7C3AED', orden: 5 },
  'comision':   { label:'Dictamen Comisión',            color:'#F97316', orden: 6 },
  'pleno-c':    { label:'Pleno · Congreso',             color:'#1F4E8C', orden: 7 },
  'senado':     { label:'Tramitación Senado',           color:'#5B21B6', orden: 8 },
  'devuelto':   { label:'Devuelto al Congreso',         color:'#EAB308', orden: 9 },
  'aprobado':   { label:'Aprobación final',             color:'#16A34A', orden: 10 },
  'boe':        { label:'Publicación BOE',              color:'#0F766E', orden: 11 },
}

const ESTADO_ENMI: Record<'Aceptada' | 'Rechazada' | 'Transaccionada' | 'Retirada' | 'Pendiente', string> = {
  'Aceptada':       '#16A34A',
  'Rechazada':      '#DC2626',
  'Transaccionada': '#F97316',
  'Retirada':       '#6e6e73',
  'Pendiente':      '#5B21B6',
}

export default function TrazabilidadPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useTrazabilidad()
  const expedientes = data?.expedientes ?? []

  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState<'timeline' | 'enmiendas' | 'versiones' | 'actores'>('timeline')

  useEffect(() => {
    if (expedientes.length > 0 && !selectedId) setSelectedId(expedientes[0].id)
  }, [expedientes, selectedId])

  const selected = useMemo(
    () => expedientes.find(e => e.id === selectedId) ?? expedientes[0],
    [expedientes, selectedId]
  )

  const totalKPIs = useMemo(() => ({
    total: expedientes.length,
    enmiendas: expedientes.reduce((s, e) => s + e.enmiendasTotal, 0),
    aceptadas: expedientes.reduce((s, e) => s + e.enmiendasAceptadas, 0),
    diasMedio: expedientes.length > 0
      ? Math.round(expedientes.reduce((s, e) => s + e.diasTramite, 0) / expedientes.length)
      : 0,
  }), [expedientes])

  const tasaAceptacion = totalKPIs.enmiendas > 0 ? Math.round((totalKPIs.aceptadas / totalKPIs.enmiendas) * 100) : 0

  if (loading) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e6e73', fontSize: 14, fontFamily: 'var(--font-text)' }}>
      Cargando trazabilidad…
    </div>
  )

  if (!selected) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#5B21B6 0%,#2E1065 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MONITOR LEGISLATIVO · TRAZABILIDAD COMPLETA
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Recorrido íntegro de cada norma <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>desde el registro al BOE</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Hitos, enmiendas, versiones del texto, votaciones y actores intervinientes para los {expedientes.length} expedientes en seguimiento.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Expedientes" value={String(totalKPIs.total)}/>
            <HeroKPI label="Enmiendas" value={String(totalKPIs.enmiendas)}/>
            <HeroKPI label="% Aceptadas" value={`${tasaAceptacion}%`}/>
            <HeroKPI label="Días medios" value={String(totalKPIs.diasMedio)}/>
          </div>
        </section>

        {/* ───── Selector de expediente ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'14px 18px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Expediente:</span>
            <span style={{ fontSize:11.5, color:'#3a3a3d' }}>Selecciona una norma para ver su trazabilidad completa</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {expedientes.map(e => {
              const active = e.id === selectedId
              const faseColor = e.fase === 'En BOE' ? '#0F766E'
                : e.fase === 'Aprobada' ? '#16A34A'
                : e.fase === 'En Senado' ? '#5B21B6'
                : e.fase === 'Devuelta' ? '#DC2626'
                : '#F97316'
              return (
                <button key={e.id} onClick={() => setSelectedId(e.id)} style={{
                  textAlign:'left', cursor:'pointer',
                  background: active ? '#FAFAFB' : '#fff',
                  border:`1px solid ${active ? '#5B21B6' : '#ECECEF'}`,
                  borderRadius:10, padding:'10px 12px',
                  fontFamily:'inherit',
                  boxShadow: active ? '0 0 0 3px rgba(91,33,182,0.10)' : 'none',
                  transition:'box-shadow 200ms',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${faseColor}18`, color:faseColor, border:`1px solid ${faseColor}40`,
                    }}>{e.fase.toUpperCase()}</span>
                    <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>{e.exp}</span>
                  </div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, marginBottom:3 }}>{e.title}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{e.diasTramite} días · {e.enmiendasTotal} enmiendas</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap', marginBottom:12 }}>
            <div style={{ flex:'1 1 480px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:'#5B21B6', color:'#fff',
                }}>EXP. {selected.exp}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Promotor: {selected.promotor}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Registro: {selected.registro}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:0, color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.title}
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,auto)', gap:14 }}>
              <CardKPI label="Días" value={String(selected.diasTramite)} color="#5B21B6"/>
              <CardKPI label="Enmiendas" value={String(selected.enmiendasTotal)} color="#1F4E8C"/>
              <CardKPI label="Aceptadas" value={String(selected.enmiendasAceptadas)} color="#16A34A"/>
              <CardKPI label="Comparec." value={String(selected.comparecencias)} color="#F97316"/>
            </div>
          </div>

          {/* Barra de progreso por fases */}
          <div style={{ marginTop:6 }}>
            <FaseProgress hitos={selected.hitos}/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14 }}>
          {([
            { k:'timeline',  label:'Timeline',           count: selected.hitos.length },
            { k:'enmiendas', label:'Enmiendas',          count: selected.enmiendas.length },
            { k:'versiones', label:'Versiones del texto',count: selected.versiones.length },
            { k:'actores',   label:'Actores',            count: selected.actores.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 16px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#5B21B6' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Timeline ───── */}
        {tab === 'timeline' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'24px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ position:'relative' }}>
              {/* Línea vertical */}
              <div style={{
                position:'absolute', left:13, top:6, bottom:6, width:2,
                background:'linear-gradient(180deg,#5B21B6,#ECECEF)',
              }}/>
              {selected.hitos.map((h, i) => {
                const m = FASE_META[h.fase]
                const dot = h.resultado === 'ok' ? m.color
                  : h.resultado === 'rechazado' ? '#DC2626'
                  : '#ECECEF'
                const isFuture = h.fecha === '—' || h.resultado === 'pendiente'
                return (
                  <div key={i} style={{ position:'relative', paddingLeft:42, paddingBottom:18 }}>
                    {/* Punto */}
                    <div style={{
                      position:'absolute', left:7, top:4, width:14, height:14,
                      borderRadius:'50%', background: isFuture ? '#fff' : dot,
                      border:`2px solid ${dot}`, boxShadow: isFuture ? 'none' : `0 0 0 4px ${dot}22`,
                    }}/>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:'1 1 360px', minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:999,
                            background:`${m.color}15`, color:m.color, border:`1px solid ${m.color}40`,
                          }}>{m.label.toUpperCase()}</span>
                          {h.resultado === 'rechazado' && (
                            <span style={{
                              fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                              padding:'2px 7px', borderRadius:999,
                              background:'#DC262615', color:'#DC2626', border:'1px solid #DC262640',
                            }}>RECHAZADO</span>
                          )}
                        </div>
                        <h3 style={{
                          margin:'0 0 4px',
                          fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600,
                          color: isFuture ? '#86868b' : '#1d1d1f',
                          letterSpacing:'-0.012em', lineHeight:1.3,
                        }}>{h.titulo}</h3>
                        <p style={{ margin:0, fontSize:12, color: isFuture ? '#a0a0a5' : '#3a3a3d', lineHeight:1.45 }}>{h.detalle}</p>
                        {h.autores && h.autores.length > 0 && (
                          <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                            {h.autores.map(a => (
                              <span key={a} style={{ fontSize:10, color:'#6e6e73', padding:'1px 7px', background:'#F5F5F7', borderRadius:4, fontWeight:600 }}>{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink:0, fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: isFuture ? '#a0a0a5' : '#1d1d1f', minWidth:88, textAlign:'right' }}>
                        {h.fecha}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Enmiendas ───── */}
        {tab === 'enmiendas' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'18px 0 0', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
          }}>
            <div style={{ padding:'0 22px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
                Enmiendas presentadas · {selected.enmiendas.length} mostradas / {selected.enmiendasTotal} totales
              </h3>
              <div style={{ display:'flex', gap:10, fontSize:11, color:'#6e6e73' }}>
                {(['Aceptada','Transaccionada','Rechazada','Retirada','Pendiente'] as const).map(s => (
                  <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:ESTADO_ENMI[s] }}/>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {selected.enmiendas.length === 0 ? (
              <div style={{ padding:'30px 22px', textAlign:'center', color:'#6e6e73', fontSize:13, borderTop:'1px solid #ECECEF' }}>
                Esta norma no tiene enmiendas registradas todavía (o ha sido rechazada en toma en consideración).
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderTop:'1px solid #ECECEF', borderBottom:'1px solid #ECECEF' }}>
                    {['Núm.','Autor','Alcance','Artículo','Estado','Votación / detalle'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'9px 14px', fontSize:10, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.enmiendas.map((e, i) => (
                    <tr key={e.num} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 14px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{e.num}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:e.color, flexShrink:0 }}/>
                          <span style={{ fontWeight:600, color:'#1d1d1f' }}>{e.autor}</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#3a3a3d' }}>{e.alcance}</td>
                      <td style={{ padding:'9px 14px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{e.articulo}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{
                          fontSize:10, fontWeight:700, letterSpacing:'0.04em',
                          padding:'2px 8px', borderRadius:999,
                          background:`${ESTADO_ENMI[e.estado]}18`,
                          color:ESTADO_ENMI[e.estado],
                          border:`1px solid ${ESTADO_ENMI[e.estado]}40`,
                        }}>{e.estado.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#6e6e73', fontSize:11 }}>{e.votacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ───── TAB · Versiones del texto ───── */}
        {tab === 'versiones' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin:'0 0 16px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Historial de versiones · {selected.versiones.length} estadios documentados
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {selected.versiones.map((v, i) => {
                const isLast = i === selected.versiones.length - 1
                return (
                  <div key={v.v} style={{
                    border:'1px solid #ECECEF', borderRadius:12,
                    background: isLast ? '#FAFAFB' : '#fff',
                    padding:'14px 18px',
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:18, alignItems:'center',
                  }}>
                    <div style={{
                      width:38, height:38, borderRadius:10,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background:'#5B21B6', color:'#fff',
                      fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
                    }}>{v.v.split(' ')[0]}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{v.v}</span>
                        <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {v.fecha}</span>
                        <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:'#5B21B618', color:'#5B21B6', border:'1px solid #5B21B640',
                        }}>{v.fuente}</span>
                      </div>
                      <p style={{ margin:0, fontSize:12, color:'#3a3a3d', lineHeight:1.45 }}>{v.cambios}</p>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <DiffPill label="+" value={v.diff.add} color="#16A34A"/>
                      <DiffPill label="~" value={v.diff.mod} color="#F97316"/>
                      <DiffPill label="−" value={v.diff.del} color="#DC2626"/>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Actores ───── */}
        {tab === 'actores' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin:'0 0 16px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Actores intervinientes · {selected.actores.length}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
              {selected.actores.map(a => (
                <div key={a.nombre} style={{
                  display:'grid', gridTemplateColumns:'auto 1fr', gap:11, alignItems:'center',
                  padding:'10px 12px', border:'1px solid #ECECEF', borderRadius:10, background:'#FAFAFB',
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:'50%', background:a.color, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, flexShrink:0,
                  }}>{a.nombre.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{
                        fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                        padding:'1px 6px', borderRadius:4,
                        background:a.color, color:'#fff',
                      }}>{a.rol.toUpperCase()}</span>
                      <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{a.partido}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Trazabilidad Legislativa · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ textAlign:'center', minWidth:75 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.022em' }}>{value}</div>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
    </div>
  )
}

function DiffPill({ label, value, color }: { label:string, value:number, color:string }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'4px 9px', borderRadius:8,
      background:`${color}15`, border:`1px solid ${color}40`,
      fontSize:11.5, fontWeight:700, color,
      fontFamily:'var(--font-display)',
    }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function FaseProgress({ hitos }: { hitos: HitoTraz[] }) {
  // Construye una barra de fases ordenada por orden canónico
  const allFases: FaseHitoTraz[] = ['registro','mesa','totalidad','enmiendas','ponencia','comision','pleno-c','senado','aprobado','boe']
  const completed = new Set(hitos.filter(h => h.resultado === 'ok').map(h => h.fase))
  const rejected = hitos.find(h => h.resultado === 'rechazado')

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, position:'relative' }}>
      {allFases.map((f, i) => {
        const m = FASE_META[f]
        const done = completed.has(f)
        const isReject = rejected && i === allFases.indexOf(rejected.fase)
        const dotColor = done ? m.color : isReject ? '#DC2626' : '#ECECEF'
        return (
          <div key={f} style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
            {/* Línea hacia el siguiente */}
            {i < allFases.length - 1 && (
              <div style={{
                position:'absolute', left:'50%', right:'-50%', top:11, height:2,
                background: done ? m.color : '#ECECEF',
                zIndex:0,
              }}/>
            )}
            {/* Punto */}
            <div style={{
              width:14, height:14, borderRadius:'50%',
              background: done || isReject ? dotColor : '#fff',
              border:`2px solid ${dotColor}`, zIndex:1,
              boxShadow: done ? `0 0 0 3px ${dotColor}22` : 'none',
            }}/>
            <span style={{
              fontSize:9, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase',
              color: done ? m.color : isReject ? '#DC2626' : '#a0a0a5',
              marginTop:5, textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
            }}>{m.label.split(' ').slice(0,2).join(' ')}</span>
          </div>
        )
      })}
    </div>
  )
}
