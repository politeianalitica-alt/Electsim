'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Estado = 'abierto' | 'monitoreo' | 'escalado' | 'resuelto'
type Prioridad = 'alta' | 'media' | 'baja'
type Categoria = 'Legislativo' | 'Gobierno' | 'Mercados' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Sectorial'

const ESTADO_META: Record<Estado, { label: string; color: string; dot: string }> = {
  'abierto':   { label: 'Abierto',     color: '#1F4E8C', dot: '#1F4E8C' },
  'monitoreo': { label: 'En monitoreo',color: '#0F766E', dot: '#0F766E' },
  'escalado':  { label: 'Escalado',    color: '#DC2626', dot: '#DC2626' },
  'resuelto':  { label: 'Resuelto',    color: '#16A34A', dot: '#16A34A' },
}

const PRIORIDAD_META: Record<Prioridad, { label: string; color: string }> = {
  'alta':  { label: 'Alta',  color: '#DC2626' },
  'media': { label: 'Media', color: '#F97316' },
  'baja':  { label: 'Baja',  color: '#EAB308' },
}

type Asunto = {
  id: string
  title: string
  description: string
  categoria: Categoria
  estado: Estado
  prioridad: Prioridad
  responsable: string
  apertura: string
  ultima: string
  proximoHito: string
  progreso: number
}

const ASUNTOS: Asunto[] = [
  { id:'s01', title:'Decreto-ley 4/2026 · convalidación', description:'Seguimiento de la convalidación parlamentaria, negociación con Junts y posibles enmiendas',
    categoria:'Legislativo', estado:'escalado', prioridad:'alta',
    responsable:'Equipo Parlamento', apertura:'18/04/2026', ultima:'hace 18 min', proximoHito:'Votación 03/05 · 11:00h', progreso:82 },
  { id:'s02', title:'Negociación PNV — transferencia ferroviaria', description:'Bloqueo en mesa bilateral; PNV condiciona apoyos pendientes hasta el 15 de mayo',
    categoria:'Gobierno', estado:'escalado', prioridad:'alta',
    responsable:'Análisis Político', apertura:'10/04/2026', ultima:'hace 2h',  proximoHito:'Reunión técnica 09/05', progreso:55 },
  { id:'s03', title:'Prima de riesgo — escalada >100 pb', description:'Tracking diario con alertas si supera 110 pb. Tesoro convocó reunión extraordinaria',
    categoria:'Mercados', estado:'monitoreo', prioridad:'alta',
    responsable:'Macro & Mercados', apertura:'25/04/2026', ultima:'hace 7 min', proximoHito:'Subasta bonos 06/05', progreso:40 },
  { id:'s04', title:'Aranceles EE.UU. al sector agroalimentario', description:'Anuncio del 12% sobre aceite y vino. Coordinación con sector y CCAA productoras',
    categoria:'Geopolítica', estado:'abierto', prioridad:'alta',
    responsable:'Geopolítica & RRII', apertura:'02/05/2026', ultima:'hace 1h', proximoHito:'Documento posición 05/05', progreso:15 },
  { id:'s05', title:'Encuesta Sigma Dos — anomalía VOX', description:'Subida de 0,8 pp inconsistente con tracking semanal. Pendiente cross-check con CIS',
    categoria:'Encuestas', estado:'monitoreo', prioridad:'media',
    responsable:'Sociometría', apertura:'24/04/2026', ultima:'hace 4h', proximoHito:'Boletín CIS 09/05', progreso:60 },
  { id:'s06', title:'Trending #MociónCensura', description:'Pico de 56k tweets en 4h. Análisis de sentimiento y propagación por clusters políticos',
    categoria:'Medios', estado:'monitoreo', prioridad:'media',
    responsable:'Monitor Narrativa', apertura:'02/05/2026', ultima:'hace 35 min', proximoHito:'Informe semanal 06/05', progreso:30 },
  { id:'s07', title:'Sector turismo — caída exportaciones', description:'Datos preliminares INE muestran -1,2% en pernoctaciones. Implicaciones electorales en Baleares y Canarias',
    categoria:'Sectorial', estado:'monitoreo', prioridad:'media',
    responsable:'Sectorial', apertura:'19/04/2026', ultima:'hace 1d', proximoHito:'INE definitivo 12/05', progreso:50 },
  { id:'s08', title:'Reforma Constitucional CGPJ', description:'Bloque parlamentario por mayoría 3/5. Análisis de viabilidad numérica y posiciones de cada grupo',
    categoria:'Legislativo', estado:'abierto', prioridad:'media',
    responsable:'Equipo Parlamento', apertura:'15/04/2026', ultima:'hace 3d', proximoHito:'Pleno reapertura 20/05', progreso:25 },
  { id:'s09', title:'Encuesta interna 4ª ola Politeia', description:'Trabajo de campo CAWI · 9.730 entrevistas. Procesamiento estadístico en curso',
    categoria:'Encuestas', estado:'monitoreo', prioridad:'baja',
    responsable:'Sociometría', apertura:'12/04/2026', ultima:'hace 6h', proximoHito:'Publicación interna 08/05', progreso:75 },
  { id:'s10', title:'Caso Junta Andalucía — convocatoria interna', description:'Discurso del presidente autonómico anticipa cambios en cohesión partido',
    categoria:'Gobierno', estado:'resuelto', prioridad:'baja',
    responsable:'Análisis Político', apertura:'05/04/2026', ultima:'cerrado 01/05', proximoHito:'Archivado', progreso:100 },
  { id:'s11', title:'BCE — actas reunión abril', description:'Tono moderadamente hawkish. Implicaciones para tipos hipotecarios y deuda corporativa',
    categoria:'Mercados', estado:'resuelto', prioridad:'baja',
    responsable:'Macro & Mercados', apertura:'29/04/2026', ultima:'cerrado 02/05', proximoHito:'Archivado', progreso:100 },
]

const CATEGORIAS = ['Todas','Legislativo','Gobierno','Mercados','Encuestas','Geopolítica','Medios','Sectorial'] as const

export default function SeguimientoPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterEstado, setFilterEstado] = useState<Estado | 'todos'>('todos')
  const [filterPrior, setFilterPrior]   = useState<Prioridad | 'todas'>('todas')
  const [filterCat, setFilterCat]       = useState<typeof CATEGORIAS[number]>('Todas')

  const counts = useMemo(() => {
    const c = { abierto:0, monitoreo:0, escalado:0, resuelto:0 } as Record<Estado, number>
    for (const a of ASUNTOS) c[a.estado]++
    return c
  }, [])
  const total = ASUNTOS.length
  const activos = total - counts.resuelto

  const filtered = useMemo(() => {
    return ASUNTOS.filter(a =>
      (filterEstado === 'todos' || a.estado === filterEstado) &&
      (filterPrior  === 'todas' || a.prioridad === filterPrior) &&
      (filterCat    === 'Todas' || a.categoria === filterCat)
    ).sort((a, b) => {
      const orderEst: Record<Estado, number> = { 'escalado':0,'abierto':1,'monitoreo':2,'resuelto':3 }
      if (orderEst[a.estado] !== orderEst[b.estado]) return orderEst[a.estado] - orderEst[b.estado]
      const orderPri: Record<Prioridad, number> = { 'alta':0,'media':1,'baja':2 }
      return orderPri[a.prioridad] - orderPri[b.prioridad]
    })
  }, [filterEstado, filterPrior, filterCat])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'24px 32px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#6e6e73', textTransform:'uppercase', margin:'0 0 8px' }}>
              SALA DE CONTROL · SEGUIMIENTO
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:28, letterSpacing:'-0.022em', margin:'0 0 6px', lineHeight:1.1 }}>
              {activos} asuntos <em style={{ fontWeight:300, fontStyle:'italic', color:'#1F4E8C' }}>activos</em>
            </h1>
            <p style={{ fontSize:13, color:'#6e6e73', margin:0 }}>{total} expedientes en seguimiento · {counts.escalado} escalados a prioridad alta · actualización continua</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {(['escalado','abierto','monitoreo','resuelto'] as Estado[]).map(es => {
              const m = ESTADO_META[es]
              return (
                <div key={es} style={{
                  textAlign:'center', padding:'12px 8px', borderRadius:12,
                  background:'#FAFAFB', border:`1px solid ${m.color}33`,
                }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color:m.color }}>{counts[es]}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:4 }}>{m.label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Filtros */}
        <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Estado:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['todos','escalado','abierto','monitoreo','resuelto'] as const).map(e => {
              const active = filterEstado === e
              const m = e !== 'todos' ? ESTADO_META[e as Estado] : null
              return (
                <button key={e} onClick={()=>setFilterEstado(e)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? (m?.color || '#1d1d1f') : '#6e6e73',
                  border:'none', borderRadius:999, padding:'5px 12px',
                  fontSize:11.5, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display:'inline-flex', alignItems:'center', gap:5,
                }}>
                  {m && <span style={{ width:7, height:7, borderRadius:'50%', background:m.dot }}/>}
                  {e === 'todos' ? 'Todos' : m?.label}
                </button>
              )
            })}
          </div>
          <span style={{ width:1, height:22, background:'#ECECEF', margin:'0 4px' }}/>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Prioridad:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['todas','alta','media','baja'] as const).map(p => {
              const active = filterPrior === p
              const m = p !== 'todas' ? PRIORIDAD_META[p as Prioridad] : null
              return (
                <button key={p} onClick={()=>setFilterPrior(p)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? (m?.color || '#1d1d1f') : '#6e6e73',
                  border:'none', borderRadius:999, padding:'5px 12px',
                  fontSize:11.5, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{p === 'todas' ? 'Todas' : m?.label}</button>
              )
            })}
          </div>
          <span style={{ width:1, height:22, background:'#ECECEF', margin:'0 4px' }}/>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Categoría:</span>
          <div style={{ display:'inline-flex', gap:4, flexWrap:'wrap' }}>
            {CATEGORIAS.map(c => {
              const active = filterCat === c
              return (
                <button key={c} onClick={()=>setFilterCat(c)} style={{
                  background: active ? '#1F4E8C' : '#fff',
                  color: active ? '#fff' : '#3a3a3d',
                  border:'1px solid '+(active ? '#1F4E8C' : '#ECECEF'),
                  borderRadius:8, padding:'4px 10px',
                  fontSize:11.5, fontWeight: active ? 600 : 500, cursor:'pointer',
                  fontFamily:'inherit',
                }}>{c}</button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} resultados</span>
        </div>

        {/* Lista de asuntos */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.length === 0 && (
            <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
              Sin asuntos que coincidan con el filtro.
            </div>
          )}
          {filtered.map(a => {
            const e = ESTADO_META[a.estado]
            const p = PRIORIDAD_META[a.prioridad]
            return (
              <article key={a.id} style={{
                display:'grid', gridTemplateColumns:'4px 1fr 220px 180px', alignItems:'stretch',
                background:'#fff', border:'1px solid #ECECEF', borderRadius:14, overflow:'hidden',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
              }}>
                <div style={{ background:e.color, opacity: a.estado==='resuelto' ? 0.4 : 1 }}/>
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${e.color}15`, color:e.color, border:`1px solid ${e.color}40`,
                    }}>{e.label.toUpperCase()}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${p.color}15`, color:p.color, border:`1px solid ${p.color}40`,
                    }}>PRIORIDAD {p.label.toUpperCase()}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {a.categoria}</span>
                  </div>
                  <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.012em', color: a.estado==='resuelto' ? '#6e6e73' : '#1d1d1f', textDecoration: a.estado==='resuelto' ? 'line-through' : 'none' }}>{a.title}</h3>
                  <p style={{ margin:'4px 0 8px', fontSize:12.5, color:'#3a3a3d', lineHeight:1.45 }}>{a.description}</p>
                  <div style={{ display:'flex', gap:14, fontSize:11, color:'#6e6e73', flexWrap:'wrap' }}>
                    <span><strong style={{color:'#1d1d1f'}}>Resp.</strong> {a.responsable}</span>
                    <span><strong style={{color:'#1d1d1f'}}>Apertura</strong> {a.apertura}</span>
                    <span><strong style={{color:'#1d1d1f'}}>Última actualización</strong> {a.ultima}</span>
                  </div>
                </div>
                <div style={{ padding:'14px 18px', borderLeft:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Próximo hito</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:e.color }}>{a.progreso}%</span>
                  </div>
                  <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${a.progreso}%`, height:'100%', background:e.color, borderRadius:3, transition:'width 280ms' }}/>
                  </div>
                  <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:500 }}>{a.proximoHito}</div>
                </div>
                <div style={{ padding:'14px 16px', borderLeft:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
                  <button style={{
                    background:'#1F4E8C', color:'#fff', border:'none',
                    borderRadius:8, padding:'7px 12px',
                    fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>Ver expediente →</button>
                  <button style={{
                    background:'#fff', color:'#3a3a3d', border:'1px solid #ECECEF',
                    borderRadius:8, padding:'7px 12px',
                    fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                  }}>Asignar</button>
                </div>
              </article>
            )
          })}
        </div>
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Sala de Control · Seguimiento · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
