'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Estado = 'activa' | 'extraordinaria' | 'inactiva'
type Tipo = 'Permanente legislativa' | 'Permanente no legislativa' | 'No permanente' | 'Investigación'

const ESTADO_META: Record<Estado, { label: string; color: string }> = {
 'activa':         { label:'Activa',         color:'#16A34A' },
 'extraordinaria': { label:'Extraordinaria', color:'#F97316' },
 'inactiva':       { label:'Inactiva',       color:'#6e6e73' },
}

type Comision = {
  id: string
  name: string
  tipo: Tipo
  estado: Estado
  presidencia: { nombre: string; partido: string; partidoColor: string }
  composicion: { partido: string; color: string; n: number }[]
  expedientesActivos: number
  proximaReunion: string
  proximaTema: string
  ultimaReunion: string
  totalReuniones: number
}

const COMISIONES: Comision[] = [
  { id:'c01', name:'Constitucional', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Patxi López', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:14},{partido:'PP',color:'#1F4E8C',n:14},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:4},{partido:'Otros',color:'#9E9E9E',n:5}],
    expedientesActivos:6, proximaReunion:'06/05/2026 · 10:00', proximaTema:'Reforma del CGPJ · enmiendas',
    ultimaReunion:'29/04/2026', totalReuniones:48 },

  { id:'c02', name:'Hacienda y Función Pública', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'María Jesús Montero', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:14},{partido:'PP',color:'#1F4E8C',n:14},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:4},{partido:'Otros',color:'#9E9E9E',n:5}],
    expedientesActivos:9, proximaReunion:'06/05/2026 · 16:00', proximaTema:'Dictamen IRPF · cierre enmiendas',
    ultimaReunion:'30/04/2026', totalReuniones:62 },

  { id:'c03', name:'Justicia', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Francisco Lucas', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:5, proximaReunion:'08/05/2026 · 09:30', proximaTema:'Comparecencia Fiscal General',
    ultimaReunion:'25/04/2026', totalReuniones:39 },

  { id:'c04', name:'Defensa', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'José Manuel García-Margallo', partido:'PP', partidoColor:'#1F4E8C' },
    composicion:[{partido:'PP',color:'#1F4E8C',n:13},{partido:'PSOE',color:'#E1322D',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:3, proximaReunion:'14/05/2026 · 11:00', proximaTema:'Ley de Defensa · ponencia',
    ultimaReunion:'22/04/2026', totalReuniones:27 },

  { id:'c05', name:'Asuntos Exteriores', tipo:'Permanente legislativa', estado:'extraordinaria',
    presidencia:{ nombre:'Borja Sémper', partido:'PP', partidoColor:'#1F4E8C' },
    composicion:[{partido:'PP',color:'#1F4E8C',n:13},{partido:'PSOE',color:'#E1322D',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:2, proximaReunion:'05/05/2026 · 15:00', proximaTema:'Aranceles EE.UU. · comparecencia urgente Albares',
    ultimaReunion:'02/05/2026', totalReuniones:34 },

  { id:'c06', name:'Sanidad y Consumo', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Carolina Darias', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:4, proximaReunion:'13/05/2026 · 10:00', proximaTema:'Ley Sanidad Universal · comparecencias',
    ultimaReunion:'24/04/2026', totalReuniones:41 },

  { id:'c07', name:'Educación, Formación Profesional y Deportes', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Pilar Alegría', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:3, proximaReunion:'10/05/2026 · 09:00', proximaTema:'LOSU · cierre plazo enmiendas',
    ultimaReunion:'27/04/2026', totalReuniones:35 },

  { id:'c08', name:'Trabajo, Economía Social y Empleo', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Yolanda Díaz', partido:'Sumar', partidoColor:'#D43F8D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:4, proximaReunion:'11/05/2026 · 10:30', proximaTema:'Reducción jornada · ponencia',
    ultimaReunion:'28/04/2026', totalReuniones:43 },

  { id:'c09', name:'Industria y Turismo', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Jordi Hereu', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:2, proximaReunion:'12/05/2026 · 12:00', proximaTema:'PERTE VEC · seguimiento',
    ultimaReunion:'18/04/2026', totalReuniones:24 },

  { id:'c10', name:'Transición Ecológica y Reto Demográfico', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Sara Aagesen', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:5, proximaReunion:'07/05/2026 · 16:30', proximaTema:'Decreto energético · enmiendas',
    ultimaReunion:'30/04/2026', totalReuniones:38 },

  { id:'c11', name:'Vivienda y Agenda Urbana', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Isabel Rodríguez', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:3, proximaReunion:'15/05/2026 · 10:00', proximaTema:'Plan Vivienda 2026-2030',
    ultimaReunion:'22/04/2026', totalReuniones:18 },

  { id:'c12', name:'Igualdad', tipo:'Permanente legislativa', estado:'activa',
    presidencia:{ nombre:'Ana Redondo', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:13},{partido:'PP',color:'#1F4E8C',n:13},{partido:'VOX',color:'#5BA02E',n:4},{partido:'Sumar',color:'#D43F8D',n:3},{partido:'Otros',color:'#9E9E9E',n:4}],
    expedientesActivos:3, proximaReunion:'14/05/2026 · 16:00', proximaTema:'Ley LGTBI · enmiendas',
    ultimaReunion:'25/04/2026', totalReuniones:31 },

  { id:'c13', name:'Investigación · "Caso Koldo"', tipo:'Investigación', estado:'extraordinaria',
    presidencia:{ nombre:'José Mª Espejo-Saavedra', partido:'PP', partidoColor:'#1F4E8C' },
    composicion:[{partido:'PP',color:'#1F4E8C',n:9},{partido:'PSOE',color:'#E1322D',n:8},{partido:'VOX',color:'#5BA02E',n:3},{partido:'Sumar',color:'#D43F8D',n:2},{partido:'Otros',color:'#9E9E9E',n:3}],
    expedientesActivos:1, proximaReunion:'09/05/2026 · 09:00', proximaTema:'Comparecencia ex-asesor',
    ultimaReunion:'02/05/2026', totalReuniones:14 },

  { id:'c14', name:'Estatuto del Diputado', tipo:'Permanente no legislativa', estado:'inactiva',
    presidencia:{ nombre:'Alfonso Rodríguez', partido:'PSOE', partidoColor:'#E1322D' },
    composicion:[{partido:'PSOE',color:'#E1322D',n:7},{partido:'PP',color:'#1F4E8C',n:7},{partido:'VOX',color:'#5BA02E',n:2},{partido:'Sumar',color:'#D43F8D',n:2},{partido:'Otros',color:'#9E9E9E',n:3}],
    expedientesActivos:0, proximaReunion:'pendiente convocatoria', proximaTema:'—',
    ultimaReunion:'15/03/2026', totalReuniones:8 },
]

const TIPOS_FIL = ['Todas','Permanente legislativa','Permanente no legislativa','No permanente','Investigación'] as const

export default function ComisionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterEstado, setFilterEstado] = useState<Estado | 'todas'>('todas')
  const [filterTipo, setFilterTipo]     = useState<typeof TIPOS_FIL[number]>('Todas')

  const counts = useMemo(() => {
    return {
      total: COMISIONES.length,
      activas: COMISIONES.filter(c => c.estado === 'activa').length,
      extraord: COMISIONES.filter(c => c.estado === 'extraordinaria').length,
      expedientes: COMISIONES.reduce((s, c) => s + c.expedientesActivos, 0),
    }
  }, [])

  const filtered = useMemo(() => {
    return COMISIONES.filter(c =>
      (filterEstado === 'todas' || c.estado === filterEstado) &&
      (filterTipo   === 'Todas' || c.tipo === filterTipo)
    ).sort((a, b) => {
      const order: Record<Estado, number> = { 'extraordinaria':0,'activa':1,'inactiva':2 }
      if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado]
      return b.expedientesActivos - a.expedientesActivos
    })
  }, [filterEstado, filterTipo])

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
              RADAR LEGISLATIVO · COMISIONES PARLAMENTARIAS
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:28, letterSpacing:'-0.022em', margin:'0 0 6px', lineHeight:1.1 }}>
              {counts.activas} comisiones <em style={{ fontWeight:300, fontStyle:'italic', color:'#5B21B6' }}>activas</em>
 </h1>
 <p style={{ fontSize:13, color:'#6e6e73', margin:0 }}>
              {counts.total} comisiones · {counts.extraord} convocatorias extraordinarias · {counts.expedientes} expedientes activos
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
 <KPI label="ACTIVAS" value={String(counts.activas)} color="#16A34A"/>
 <KPI label="EXTRAORDINARIAS" value={String(counts.extraord)} color="#F97316"/>
 <KPI label="EXPEDIENTES" value={String(counts.expedientes)} color="#5B21B6"/>
 </div>
 </section>

        {/* Filtros */}
 <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
 <FilterGroup label="Estado">
            {(['todas','extraordinaria','activa','inactiva'] as const).map(e => {
              const active = filterEstado === e
              const m = e !== 'todas' ? ESTADO_META[e as Estado] : null
              return (
 <Pill key={e} active={active} onClick={()=>setFilterEstado(e)} color={m?.color}>
                  {m && <span style={{ width:7, height:7, borderRadius:'50%', background:m.color, display:'inline-block', marginRight:5 }}/>}
                  {e === 'todas' ? 'Todas' : m?.label}
 </Pill>
              )
            })}
 </FilterGroup>
 <Sep/>
 <FilterGroup label="Tipo">
            {TIPOS_FIL.map(t => (
 <BoxBtn key={t} active={filterTipo === t} onClick={()=>setFilterTipo(t)}>{t}</BoxBtn>
            ))}
 </FilterGroup>
 <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} comisiones</span>
 </div>

        {/* Grid de comisiones */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:14 }}>
          {filtered.length === 0 && (
 <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF', gridColumn:'1/-1' }}>
              Sin comisiones que coincidan con el filtro.
 </div>
          )}
          {filtered.map(c => {
            const m = ESTADO_META[c.estado]
            const totalMiembros = c.composicion.reduce((s, x) => s + x.n, 0)
            return (
 <article key={c.id} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:16, padding:'18px 20px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                display:'flex', flexDirection:'column', gap:12, position:'relative', overflow:'hidden',
              }}>
 <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:m.color }}/>

                {/* Header */}
 <div>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 8px', borderRadius:999,
                      background:`${m.color}15`, color:m.color, border:`1px solid ${m.color}40`,
                    }}>{m.label.toUpperCase()}</span>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, marginLeft:'auto' }}>{c.tipo}</span>
 </div>
 <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f', lineHeight:1.25 }}>{c.name}</h3>
 </div>

                {/* Presidencia */}
 <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10 }}>
 <div style={{
                    width:36, height:36, borderRadius:'50%', background:c.presidencia.partidoColor, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize:14, fontFamily:'var(--font-display)', flexShrink:0,
                  }}>{c.presidencia.nombre.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
 <div style={{ minWidth:0, flex:1 }}>
 <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Presidencia</div>
 <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{c.presidencia.nombre}</div>
 <div style={{ fontSize:11, color:c.presidencia.partidoColor, fontWeight:600 }}>{c.presidencia.partido}</div>
 </div>
 </div>

                {/* Composición */}
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Composición</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{totalMiembros} miembros</span>
 </div>
 <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden' }}>
                    {c.composicion.map((g, i) => (
 <div key={i} title={`${g.partido} ${g.n}`} style={{ width:`${(g.n/totalMiembros)*100}%`, background:g.color }}/>
                    ))}
 </div>
 <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 10px', marginTop:6 }}>
                    {c.composicion.map(g => (
 <span key={g.partido} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11 }}>
 <span style={{ width:8, height:8, borderRadius:2, background:g.color }}/>
 <span style={{ color:'#3a3a3d' }}>{g.partido}</span>
 <strong style={{ color:'#1d1d1f' }}>{g.n}</strong>
 </span>
                    ))}
 </div>
 </div>

                {/* Próxima reunión */}
 <div style={{ padding:'10px 12px', background:`${m.color}08`, border:`1px solid ${m.color}30`, borderRadius:10 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
 <span style={{ fontSize:9.5, color:m.color, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Próxima reunión</span>
 <span style={{ fontSize:10.5, color:'#6e6e73' }}>Última: {c.ultimaReunion}</span>
 </div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:m.color }}>{c.proximaReunion}</div>
 <div style={{ fontSize:11.5, color:'#3a3a3d', marginTop:2 }}>{c.proximaTema}</div>
 </div>

                {/* Métricas + CTA */}
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
 <div style={{ fontSize:11, color:'#6e6e73' }}>
 <strong style={{ color:'#1d1d1f' }}>{c.expedientesActivos}</strong> expedientes activos · <strong style={{ color:'#1d1d1f' }}>{c.totalReuniones}</strong> reuniones celebradas
 </div>
 <button style={{
                    background:'#5B21B6', color:'#fff', border:'none', borderRadius:8, padding:'6px 11px',
                    fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>Abrir →</button>
 </div>
 </article>
            )
          })}
 </div>
 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Radar Legislativo · Comisiones · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// Helpers UI
function KPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
 <div style={{ textAlign:'center', padding:'12px 8px', borderRadius:12, background:'#FAFAFB', border:`1px solid ${color}33` }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color }}>{value}</div>
 <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:4 }}>{label}</div>
 </div>
  )
}
function FilterGroup({ label, children }: { label:string, children:React.ReactNode }) {
  return (
 <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}:</span>
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>{children}</div>
 </div>
  )
}
function Pill({ active, onClick, color, children }: { active:boolean, onClick:()=>void, color?:string, children:React.ReactNode }) {
  return (
 <button onClick={onClick} style={{
      background: active ? '#fff' : 'transparent',
      color: active ? (color || '#1d1d1f') : '#6e6e73',
      border:'none', borderRadius:999, padding:'5px 11px',
      fontSize:11.5, fontWeight: active ? 700 : 500, cursor:'pointer',
      fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      whiteSpace:'nowrap',
    }}>{children}</button>
  )
}
function BoxBtn({ active, onClick, children }: { active:boolean, onClick:()=>void, children:React.ReactNode }) {
  return (
 <button onClick={onClick} style={{
      background: active ? '#1F4E8C' : '#fff',
      color: active ? '#fff' : '#3a3a3d',
      border:'1px solid '+(active ? '#1F4E8C' : '#ECECEF'),
      borderRadius:8, padding:'4px 10px',
      fontSize:11.5, fontWeight: active ? 600 : 500, cursor:'pointer',
      fontFamily:'inherit',
    }}>{children}</button>
  )
}
function Sep() {
  return <span style={{ width:1, height:22, background:'#ECECEF', margin:'0 4px' }}/>
}
