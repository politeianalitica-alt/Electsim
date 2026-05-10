'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useWarRoom, useWarRoomCrisis, useWarRoomTareas, useCountdown } from '@/hooks/war-room'
import { CDNum } from './_components/CDNum'
import { HeroKPI } from './_components/HeroKPI'
import { SKpi } from './_components/SKpi'
import type { RolEquipo, EstadoMiembro, TipoActo, PrioridadTerritorio, SeveridadCrisis, EstadoTarea } from '@/types/war-room'

// ─── Presentation-only colour maps (not analytical data) ────────────────────
const ROL_COLOR: Record<RolEquipo, string> = {
  'Director':'#1F4E8C', 'Estrategia':'#5B21B6', 'Comunicación':'#7C3AED',
  'Datos':'#0EA5E9', 'Digital':'#DC2626', 'Ground game':'#16A34A',
  'Finanzas':'#B45309', 'Legal':'#0F766E', 'Crisis':'#F97316',
}
const ESTADO_META: Record<EstadoMiembro, { color: string }> = {
  'En war room': { color: '#16A34A' }, 'En terreno': { color: '#0EA5E9' },
  'Remoto': { color: '#6e6e73' }, 'En reunión': { color: '#F97316' }, 'Reunión': { color: '#F97316' },
}
const TIPO_COLOR: Record<TipoActo, string> = {
  'Mitin':'#DC2626', 'Acto territorial':'#1F4E8C', 'Debate':'#5B21B6',
  'Rueda de prensa':'#0EA5E9', 'Entrevista':'#7C3AED',
  'Reunión interna':'#525258', 'Visita':'#16A34A',
}
const ESTADO_ACTO: Record<string, string> = { 'Confirmado':'#16A34A', 'Pendiente':'#F97316', 'Cancelado':'#DC2626' }
const PRIO_COLOR: Record<PrioridadTerritorio, string> = {
  'Crítica':'#DC2626', 'Alta':'#F97316', 'Media':'#EAB308', 'Mantener':'#16A34A',
}
const SEV_CRI: Record<SeveridadCrisis, string> = { 'CRÍTICA':'#DC2626', 'ALTA':'#F97316', 'MEDIA':'#EAB308' }
const TAR_COLOR: Record<EstadoTarea, string> = { 'Pendiente':'#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' }

export default function WarRoomPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useWarRoom()
  const { crisis, updateEstado: updateCrisisEstado } = useWarRoomCrisis()
  const { tareas, cycleEstado: cycleTareaEstado } = useWarRoomTareas()

  const eleccionesFecha = useMemo(() => {
    if (data?.elecciones_fecha) return new Date(data.elecciones_fecha)
    return new Date(2026, 7, 10)
  }, [data])

  const tiempo = useCountdown(eleccionesFecha)

  if (loading || !data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6e6e73', fontSize: 14 }}>Cargando War Room...</div>
        </main>
      </div>
    )
  }

  const { candidato, kpis, encuestas, equipo, agenda, territorio, mensaje, presupuesto } = data
  const crisisActivas = crisis.filter(c => c.estado === 'Activa').length
  const tareasAbiertas = tareas.filter(t => t.estado !== 'Completada').length
  const presupRestante = presupuesto.total - presupuesto.gastado

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero / Command Center ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0F172A 0%,#020617 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:0, opacity:0.12, pointerEvents:'none',
            background:'radial-gradient(circle at 80% 20%, #DC2626 0%, transparent 55%), radial-gradient(circle at 20% 80%, #1F4E8C 0%, transparent 55%)' }}/>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:24, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:64, height:64, borderRadius:12, background:candidato.color, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.02em',
                boxShadow:`0 4px 16px ${candidato.color}80`,
              }}>{candidato.iniciales}</div>
              <div>
                <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 3px' }}>
                  WAR ROOM · CAMPAÑA EN CURSO
                </p>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, letterSpacing:'-0.014em' }}>{candidato.nombre}</div>
                <div style={{ fontSize:11.5, opacity:0.7, marginTop:1 }}>{candidato.partido} · {candidato.cargo}</div>
              </div>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.6, textTransform:'uppercase', margin:'0 0 8px' }}>
                Cuenta atrás · Generales 10 ago 2026
              </p>
              <div style={{ display:'flex', justifyContent:'center', alignItems:'baseline', gap:8 }}>
                <CDNum n={tiempo.dias}  label="DÍAS"  big/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.horas} label="HORAS"/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.min}   label="MIN"/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, minWidth:240 }}>
              <HeroKPI label="Tareas abiertas"  value={String(tareasAbiertas)} accent="#FCA5A5"/>
              <HeroKPI label="Crisis activas"   value={String(crisisActivas)}  accent="#F97316"/>
              <HeroKPI label="Presup. restante" value={`${(presupRestante/1000).toFixed(1)}M€`} accent="#7DD3FC"/>
              <HeroKPI label="Voluntarios"      value={`${(kpis.voluntarios/1000).toFixed(1)}K`} accent="#86EFAC"/>
            </div>
          </div>
        </section>

        {/* ───── Snapshot electoral ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Snapshot electoral · {candidato.partido}</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>Actualizado {encuestas[0]?.fecha}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <SKpi big label="Intención de voto" value={`${kpis.intencionPP}%`}  delta="+0.4 pp · 7d" deltaPos color={candidato.color}/>
              <SKpi label="Diferencial PSOE"      value={`+${kpis.diferencialPSOE}`} sub="puntos"      delta="+0.6 pp · 7d" deltaPos color={candidato.color}/>
              <SKpi label="Conocimiento"          value={`${kpis.conocimiento}%`}  sub="población adulta" color="#5B21B6"/>
              <SKpi label="Valoración líder"      value={`${kpis.valoracion}`}     sub="/10 · CIS"    delta="+0.1 vs mes" deltaPos color="#16A34A"/>
              <SKpi label="Imagen líder"          value={`${kpis.imagenLider}`}    sub="/10 · 40dB"   delta="estable" color="#0EA5E9"/>
              <SKpi label="Particip. prevista"    value={`${kpis.participacionPrev}%`} sub="estimación" color="#F97316"/>
              <SKpi label="Locales abiertos"      value={`${kpis.localesAbiertos}`} sub="48 provincias" color="#16A34A"/>
              <SKpi label="Voluntarios activos"   value={`${kpis.voluntarios.toLocaleString('es-ES')}`} sub="reg. esta semana" color={candidato.color}/>
            </div>
          </div>
          <div style={{ background:`linear-gradient(135deg, ${candidato.color}10, ${candidato.color}03)`, border:`1px solid ${candidato.color}40`, borderRadius:14, padding:'18px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 8px', borderRadius:4, background:candidato.color, color:'#fff' }}>MENSAJE DEL DÍA</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:candidato.color }}>{mensaje.hashtag}</span>
            </div>
            <h3 style={{ margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, letterSpacing:'-0.012em' }}>
              «{mensaje.titular}»
            </h3>
            <p style={{ margin:'0 0 10px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.5 }}>{mensaje.subtitular}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
              {mensaje.pilares.map((p, i) => (
                <div key={i} style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.45, display:'flex', gap:6 }}>
                  <span style={{ color:candidato.color, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span><strong style={{ color:'#1d1d1f' }}>{p.p}.</strong> {p.detalle}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 11px', marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Contraste</div>
              <div style={{ fontSize:11, color:'#3a3a3d', fontStyle:'italic' }}>{mensaje.contraste}</div>
            </div>
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, padding:'8px 11px' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Evitar comentar</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {mensaje.evitar.map(e => (
                  <span key={e} style={{ fontSize:10.5, padding:'2px 7px', borderRadius:999, background:'#fff', border:'1px solid #FECACA', color:'#7F1D1D' }}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───── Calendario de actos · Equipo ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Agenda · próximos 10 días</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{agenda.length} actos</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {agenda.map((a, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'62px 6px 1fr auto', gap:10, alignItems:'center', padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{a.fecha.slice(0,5)}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, marginTop:2 }}>{a.hora}</div>
                  </div>
                  <div style={{ width:6, height:34, background:TIPO_COLOR[a.tipo], borderRadius:3 }}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'1px 6px', borderRadius:4, background:TIPO_COLOR[a.tipo], color:'#fff' }}>{a.tipo.toUpperCase()}</span>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>· {a.coverage.toUpperCase()}</span>
                      {a.aforo && <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73' }}>· {a.aforo.toLocaleString('es-ES')} aforo</span>}
                    </div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{a.titulo}</div>
                    <div style={{ fontSize:11, color:'#6e6e73', marginTop:1 }}>{a.ubicacion}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:999, background:`${ESTADO_ACTO[a.estado]}15`, color:ESTADO_ACTO[a.estado], border:`1px solid ${ESTADO_ACTO[a.estado]}40` }}>{a.estado.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Equipo central</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {equipo.map(m => (
                  <div key={m.rol} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:9, alignItems:'center', padding:'7px 9px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:ROL_COLOR[m.rol], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:10, flexShrink:0 }}>
                      {m.nombre.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:1 }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 5px', borderRadius:3, background:`${ROL_COLOR[m.rol]}15`, color:ROL_COLOR[m.rol] }}>{m.rol.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.nombre}</div>
                      <div style={{ fontSize:9.5, color:'#86868b' }}>{m.ult}</div>
                    </div>
                    <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.06em', padding:'2px 6px', borderRadius:4, background:`${ESTADO_META[m.estado]?.color || '#6e6e73'}15`, color:ESTADO_META[m.estado]?.color || '#6e6e73', border:`1px solid ${ESTADO_META[m.estado]?.color || '#6e6e73'}40`, whiteSpace:'nowrap' }}>{m.estado.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───── Tareas críticas + Crisis radar ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Tareas críticas del día</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{tareas.filter(t => t.estado === 'Completada').length}/{tareas.length} completadas</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Tarea','Responsable','Plazo','Estado'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 10px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tareas.map(t => (
                  <tr key={t.id} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'9px 10px', fontWeight:600, color:'#1d1d1f' }}>{t.tarea}</td>
                    <td style={{ padding:'9px 10px', color:'#3a3a3d', fontSize:11.5 }}>{t.resp}</td>
                    <td style={{ padding:'9px 10px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{t.plazo}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span
                        onClick={() => cycleTareaEstado(t.id)}
                        style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:999, background:`${TAR_COLOR[t.estado]}15`, color:TAR_COLOR[t.estado], border:`1px solid ${TAR_COLOR[t.estado]}40`, cursor:'pointer' }}
                      >{t.estado.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#DC2626' }}>Crisis radar</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{crisisActivas} activa(s)</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {crisis.map(c => (
                <div key={c.id} style={{ padding:'10px 12px', borderRadius:9, background:`${SEV_CRI[c.severidad]}10`, border:`1px solid ${SEV_CRI[c.severidad]}40`, borderLeft:`3px solid ${SEV_CRI[c.severidad]}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 6px', borderRadius:4, background:SEV_CRI[c.severidad], color:'#fff' }}>{c.severidad}</span>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>· {c.tipo.toUpperCase()}</span>
                    <span
                      onClick={() => updateCrisisEstado(c.id, c.estado === 'Activa' ? 'Contenida' : 'Activa')}
                      style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:999, background: c.estado === 'Activa' ? '#DC2626' : '#16A34A', color:'#fff', letterSpacing:'0.06em', cursor:'pointer' }}
                    >{c.estado.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Mapa territorial estratégico ───── */}
        <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Mapa territorial · prioridad de campaña</h3>
            <div style={{ display:'flex', gap:10, fontSize:10.5 }}>
              {(['Crítica','Alta','Media','Mantener'] as PrioridadTerritorio[]).map(p => (
                <span key={p} style={{ display:'inline-flex', alignItems:'center', gap:5, color:'#3a3a3d' }}>
                  <span style={{ width:9, height:9, borderRadius:2, background:PRIO_COLOR[p] }}/>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Provincia','CCAA','Prioridad','Intención','Gap PSOE','% recursos','Voluntarios'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...territorio].sort((a,b) => {
                  const order: Record<PrioridadTerritorio, number> = { 'Crítica':0, 'Alta':1, 'Media':2, 'Mantener':3 }
                  return order[a.prioridad] - order[b.prioridad]
                }).map((t, i) => {
                  const gapColor = t.gap > 0 ? '#16A34A' : '#DC2626'
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#1d1d1f' }}>{t.prov}</td>
                      <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{t.ccaa}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:PRIO_COLOR[t.prioridad], color:'#fff' }}>{t.prioridad.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:candidato.color }}>{t.intencion.toFixed(1)}%</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:gapColor }}>{t.gap > 0 ? `+${t.gap}` : t.gap} pp</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${(t.recursos / 22) * 100}%`, height:'100%', background:candidato.color }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:candidato.color, minWidth:24, textAlign:'right' }}>{t.recursos}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f', textAlign:'right' }}>{t.voluntarios.toLocaleString('es-ES')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───── Encuestas tracker + Presupuesto ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:14 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Encuestas · últimas 6 olas</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>Tracker semanal</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Fecha','Casa','Cliente','PP','PSOE','VOX','Sumar','Otros'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encuestas.map((e, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{e.fecha}</td>
                    <td style={{ padding:'8px 8px', fontWeight:600, color:'#1d1d1f' }}>{e.casa}</td>
                    <td style={{ padding:'8px 8px', color:'#6e6e73', fontSize:11 }}>{e.cliente}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1F4E8C' }}>{e.pp}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#E1322D' }}>{e.psoe}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#5BA02E' }}>{e.vox}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#D43F8D' }}>{e.sumar}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#9E9E9E' }}>{e.otros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Presupuesto de campaña</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{(presupuesto.gastado/1000).toFixed(2)}M€ / {(presupuesto.total/1000).toFixed(2)}M€</span>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ height:10, background:'#F5F5F7', borderRadius:5, overflow:'hidden', marginBottom:5 }}>
                <div style={{ width:`${(presupuesto.gastado / presupuesto.total) * 100}%`, height:'100%', background:`linear-gradient(90deg, ${candidato.color}, ${candidato.color}aa)`, borderRadius:5 }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>
                <span>{Math.round((presupuesto.gastado / presupuesto.total) * 100)}% ejecutado</span>
                <span>Restante: {((presupuesto.total - presupuesto.gastado)/1000).toFixed(2)}M€</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {presupuesto.lineas.map(p => {
                const pct = (p.gastado / p.presupuestado) * 100
                return (
                  <div key={p.concepto}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11.5 }}>
                      <span style={{ color:'#1d1d1f', fontWeight:600 }}>{p.concepto}</span>
                      <span style={{ fontFamily:'var(--font-display)', color:p.color, fontWeight:700 }}>{p.gastado}K€<span style={{ color:'#86868b', fontWeight:500 }}> / {p.presupuestado}K€</span></span>
                    </div>
                    <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:p.color, borderRadius:3 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        War Room de Campaña · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
