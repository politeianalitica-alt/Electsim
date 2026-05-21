'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Estado = 'planificacion' | 'ejecucion' | 'revision' | 'completado' | 'paralizado'
type Horizonte = 'corto' | 'medio' | 'largo'
type Impacto = 'transformador' | 'alto' | 'medio' | 'bajo'
type Tipo = 'Reforma estructural' | 'Plan plurianual' | 'Iniciativa específica' | 'Negociación'

const ESTADO_META: Record<Estado, { label: string; color: string }> = {
 'planificacion': { label:'Planificación', color:'#6e6e73' },
 'ejecucion':     { label:'En ejecución',  color:'#5B21B6' },
 'revision':      { label:'En revisión',   color:'#F97316' },
 'completado':    { label:'Completado',    color:'#16A34A' },
 'paralizado':    { label:'Paralizado',    color:'#DC2626' },
}

const HORIZ_META: Record<Horizonte, { label: string }> = {
 'corto':  { label:'< 1 año' },
 'medio':  { label:'1-3 años' },
 'largo':  { label:'> 3 años' },
}

const IMPACTO_META: Record<Impacto, { label: string; color: string }> = {
 'transformador': { label:'Transformador', color:'#7C3AED' },
 'alto':          { label:'Alto',          color:'#DC2626' },
 'medio':         { label:'Medio',         color:'#F97316' },
 'bajo':          { label:'Bajo',          color:'#EAB308' },
}

type Proyecto = {
  id: string
  title: string
  description: string
  tipo: Tipo
  promotor: string
  ministerio: string
  estado: Estado
  horizonte: Horizonte
  impacto: Impacto
  presupuesto: string  // p.ej. "12.400 M€" o "—"
  inicio: string       // mm/yyyy
  fin: string          // mm/yyyy o "indef."
  progreso: number     // 0-100
  stakeholders: string[]
  hito: string         // próximo hito
  hitoFecha: string    // dd/mm/yyyy
}

const PROYECTOS: Proyecto[] = [
  { id:'p01', title:'Plan España Digital 2030',
    description:'Hoja de ruta para la transformación digital de la administración, empresas y formación. Incluye 5G, IA pública, ciberseguridad y datos abiertos.',
    tipo:'Plan plurianual', promotor:'Gobierno', ministerio:'Transformación Digital',
    estado:'ejecucion', horizonte:'largo', impacto:'transformador',
    presupuesto:'20.000 M€', inicio:'01/2023', fin:'12/2030',
    progreso:42, stakeholders:['CCAA','UE','Patronal','CCOO','UGT'],
    hito:'Convocatoria PERTE Chip · 2ª fase', hitoFecha:'15/05/2026' },

  { id:'p02', title:'Reforma fiscal · IRPF y rentas del capital',
    description:'Revisión del IRPF, rentas del capital y consolidación del impuesto a grandes patrimonios. Eliminación de bonificaciones autonómicas en sucesiones.',
    tipo:'Reforma estructural', promotor:'PSOE', ministerio:'Hacienda',
    estado:'ejecucion', horizonte:'medio', impacto:'alto',
    presupuesto:'+3.200 M€/año (recaud.)', inicio:'09/2025', fin:'12/2026',
    progreso:60, stakeholders:['CCAA','PP','Junts','Sumar','BdE','CEOE'],
    hito:'Votación enmiendas · Pleno', hitoFecha:'06/05/2026' },

  { id:'p03', title:'Transferencia ferroviaria a País Vasco',
    description:'Negociación con PNV para transferir competencias de Cercanías Bizkaia y Renfe Mercancías. Comisión bilateral activa.',
    tipo:'Negociación', promotor:'Gobierno + EAJ-PNV', ministerio:'Transportes · Hacienda',
    estado:'paralizado', horizonte:'corto', impacto:'medio',
    presupuesto:'480 M€', inicio:'02/2024', fin:'06/2026',
    progreso:55, stakeholders:['PNV','PSE','CCAA Euskadi','Adif'],
    hito:'Reunión técnica · mesa bilateral', hitoFecha:'09/05/2026' },

  { id:'p04', title:'Ley Orgánica de Universidades · revisión LOSU',
    description:'Reforma del marco LOSU para reducir carga administrativa, ampliar autonomía universitaria y revisar la carrera del PDI.',
    tipo:'Iniciativa específica', promotor:'Gobierno', ministerio:'Universidades',
    estado:'revision', horizonte:'medio', impacto:'alto',
    presupuesto:'180 M€/año', inicio:'04/2026', fin:'12/2027',
    progreso:25, stakeholders:['CCAA','CRUE','Sindicatos','PP','Sumar'],
    hito:'Cierre plazo enmiendas · Comisión', hitoFecha:'10/05/2026' },

  { id:'p05', title:'Plan Nacional de Vivienda 2026-2030',
    description:'Construcción de 184.000 viviendas asequibles, ampliación de zonas tensionadas y refuerzo del régimen de protección.',
    tipo:'Plan plurianual', promotor:'PSOE + Sumar', ministerio:'Vivienda',
    estado:'ejecucion', horizonte:'largo', impacto:'transformador',
    presupuesto:'12.400 M€', inicio:'01/2026', fin:'12/2030',
    progreso:18, stakeholders:['CCAA','Ayuntamientos','SEPES','Promotores','UE'],
    hito:'Senado · dictamen Comisión General CCAA', hitoFecha:'15/05/2026' },

  { id:'p06', title:'Reforma del CGPJ · sistema de elección',
    description:'Modificación del modelo de designación de vocales del Consejo General del Poder Judicial. Requiere mayoría 3/5.',
    tipo:'Reforma estructural', promotor:'PP (PPL)', ministerio:'—',
    estado:'planificacion', horizonte:'medio', impacto:'transformador',
    presupuesto:'—', inicio:'04/2026', fin:'12/2027',
    progreso:8, stakeholders:['PSOE','PP','UE','CGPJ','Asociaciones jueces'],
    hito:'Debate enmiendas a la totalidad', hitoFecha:'08/05/2026' },

  { id:'p07', title:'PERTE Vehículo Eléctrico Conectado · fase III',
    description:'Tercera fase del Proyecto Estratégico VEC con foco en baterías, fábricas e infraestructura de recarga. Cofinanciado por NextGenerationEU.',
    tipo:'Plan plurianual', promotor:'Gobierno', ministerio:'Industria',
    estado:'ejecucion', horizonte:'medio', impacto:'alto',
    presupuesto:'4.300 M€', inicio:'06/2024', fin:'12/2027',
    progreso:48, stakeholders:['SEAT','Volkswagen','Stellantis','UE','CCAA'],
    hito:'Adjudicación 2ª convocatoria celdas', hitoFecha:'30/06/2026' },

  { id:'p08', title:'Ley de Movilidad Sostenible',
    description:'Actualiza el marco de transporte público, incentivos a la movilidad activa y descarbonización del sector.',
    tipo:'Iniciativa específica', promotor:'Gobierno', ministerio:'Transportes',
    estado:'completado', horizonte:'corto', impacto:'medio',
    presupuesto:'620 M€/año', inicio:'01/2026', fin:'04/2026',
    progreso:100, stakeholders:['CCAA','Ayuntamientos','UE'],
    hito:'Publicado en BOE · entrada en vigor 01/06', hitoFecha:'28/04/2026' },

  { id:'p09', title:'Reforma de la financiación autonómica',
    description:'Revisión del modelo de financiación de las CCAA de régimen común. Negociación bloqueada por desacuerdo territorial.',
    tipo:'Reforma estructural', promotor:'Gobierno + CCAA', ministerio:'Hacienda',
    estado:'paralizado', horizonte:'largo', impacto:'transformador',
    presupuesto:'+15.000 M€/año (redist.)', inicio:'06/2024', fin:'06/2027',
    progreso:30, stakeholders:['CCAA','PP','Junts','PSOE','BdE','AIReF'],
    hito:'Conferencia Sectorial Hacienda', hitoFecha:'25/05/2026' },

  { id:'p10', title:'Plan Energético Nacional 2030 · revisión PNIEC',
    description:'Actualización del Plan Nacional Integrado de Energía y Clima con nuevos objetivos de renovables y eficiencia energética.',
    tipo:'Plan plurianual', promotor:'Gobierno', ministerio:'Transición Ecológica',
    estado:'ejecucion', horizonte:'largo', impacto:'transformador',
    presupuesto:'241.000 M€ (público + privado)', inicio:'01/2024', fin:'12/2030',
    progreso:35, stakeholders:['UE','CCAA','REE','Endesa','Iberdrola','Repsol'],
    hito:'Subasta renovables · Q2', hitoFecha:'20/06/2026' },
]

const TIPOS = ['Todos','Reforma estructural','Plan plurianual','Iniciativa específica','Negociación'] as const

export default function ProyectosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterEstado, setFilterEstado] = useState<Estado | 'todos'>('todos')
  const [filterImp, setFilterImp]       = useState<Impacto | 'todos'>('todos')
  const [filterTipo, setFilterTipo]     = useState<typeof TIPOS[number]>('Todos')

  const counts = useMemo(() => {
    const out = { planificacion:0, ejecucion:0, revision:0, completado:0, paralizado:0 } as Record<Estado, number>
    for (const p of PROYECTOS) out[p.estado]++
    return out
  }, [])
  const presupuestoTotal = useMemo(() => {
    // Solo los que llevan número
    return PROYECTOS.reduce((s, p) => {
      const n = parseInt(p.presupuesto.replace(/\./g,'').replace(/[^\d]/g,''))
      return s + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [])

  const filtered = useMemo(() => {
    return PROYECTOS.filter(p =>
      (filterEstado === 'todos' || p.estado === filterEstado) &&
      (filterImp    === 'todos' || p.impacto === filterImp) &&
      (filterTipo   === 'Todos' || p.tipo === filterTipo)
    ).sort((a,b) => {
      const order: Record<Estado, number> = { 'paralizado':0,'revision':1,'ejecucion':2,'planificacion':3,'completado':4 }
      if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado]
      const ord: Record<Impacto, number> = { 'transformador':0,'alto':1,'medio':2,'bajo':3 }
      return ord[a.impacto] - ord[b.impacto]
    })
  }, [filterEstado, filterImp, filterTipo])

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
              RADAR LEGISLATIVO · PORTAFOLIO DE PROYECTOS
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:28, letterSpacing:'-0.022em', margin:'0 0 6px', lineHeight:1.1 }}>
              {counts.ejecucion + counts.revision} proyectos <em style={{ fontWeight:300, fontStyle:'italic', color:'#5B21B6' }}>en marcha</em>
 </h1>
 <p style={{ fontSize:13, color:'#6e6e73', margin:0 }}>
              {PROYECTOS.length} iniciativas estratégicas · presupuesto agregado <strong style={{color:'#1d1d1f'}}>{(presupuestoTotal/1000).toFixed(1)}k M€</strong> · {counts.paralizado} paralizados
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {(['paralizado','revision','ejecucion','planificacion','completado'] as Estado[]).map(es => {
              const m = ESTADO_META[es]
              return (
 <div key={es} style={{
                  textAlign:'center', padding:'12px 4px', borderRadius:10,
                  background:'#FAFAFB', border:`1px solid ${m.color}33`,
                }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, lineHeight:1, color:m.color }}>{counts[es]}</div>
 <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6e6e73', marginTop:4 }}>{m.label}</div>
 </div>
              )
            })}
 </div>
 </section>

        {/* Filtros */}
 <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
 <FilterGroup label="Estado">
            {(['todos','paralizado','revision','ejecucion','planificacion','completado'] as const).map(e => {
              const active = filterEstado === e
              const m = e !== 'todos' ? ESTADO_META[e as Estado] : null
              return (
 <Pill key={e} active={active} onClick={()=>setFilterEstado(e)} color={m?.color}>
                  {m && <span style={{ width:7, height:7, borderRadius:'50%', background:m.color, display:'inline-block', marginRight:5 }}/>}
                  {e === 'todos' ? 'Todos' : m?.label}
 </Pill>
              )
            })}
 </FilterGroup>
 <Sep/>
 <FilterGroup label="Impacto">
            {(['todos','transformador','alto','medio','bajo'] as const).map(i => {
              const active = filterImp === i
              const m = i !== 'todos' ? IMPACTO_META[i as Impacto] : null
              return (
 <Pill key={i} active={active} onClick={()=>setFilterImp(i)} color={m?.color}>
                  {i === 'todos' ? 'Todos' : m?.label}
 </Pill>
              )
            })}
 </FilterGroup>
 <Sep/>
 <FilterGroup label="Tipo">
            {TIPOS.map(t => (
 <BoxBtn key={t} active={filterTipo === t} onClick={()=>setFilterTipo(t)}>{t}</BoxBtn>
            ))}
 </FilterGroup>
 <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} proyectos</span>
 </div>

        {/* Grid de proyectos */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))', gap:14 }}>
          {filtered.length === 0 && (
 <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF', gridColumn:'1/-1' }}>
              Sin proyectos que coincidan con el filtro.
 </div>
          )}
          {filtered.map(p => {
            const e = ESTADO_META[p.estado]
            const i = IMPACTO_META[p.impacto]
            const final = p.estado === 'completado'
            return (
 <article key={p.id} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:16, padding:'18px 20px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                display:'flex', flexDirection:'column', gap:12,
                opacity: final ? 0.85 : 1,
                position:'relative', overflow:'hidden',
              }}>
                {/* Acento lateral del estado */}
 <div style={{
                  position:'absolute', left:0, top:0, bottom:0, width:4, background:e.color,
                }}/>
                {/* Header pills */}
 <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
 <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                    padding:'3px 8px', borderRadius:999,
                    background:`${e.color}15`, color:e.color, border:`1px solid ${e.color}40`,
                  }}>{e.label.toUpperCase()}</span>
 <span style={{
                    fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                    padding:'2px 7px', borderRadius:999,
                    background:`${i.color}15`, color:i.color, border:`1px solid ${i.color}40`,
                  }}>IMPACTO {i.label.toUpperCase()}</span>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, marginLeft:'auto' }}>{p.tipo}</span>
 </div>

                {/* Título + descripción */}
 <div>
 <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f', lineHeight:1.25 }}>{p.title}</h3>
 <p style={{ margin:'6px 0 0', fontSize:12.5, color:'#3a3a3d', lineHeight:1.5 }}>{p.description}</p>
 </div>

                {/* Promotor + ministerio + presupuesto */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11, color:'#6e6e73' }}>
 <div><strong style={{ color:'#1d1d1f', fontSize:10.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Promotor</strong><br/>{p.promotor}</div>
 <div><strong style={{ color:'#1d1d1f', fontSize:10.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Ministerio</strong><br/>{p.ministerio}</div>
 <div><strong style={{ color:'#1d1d1f', fontSize:10.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Presupuesto</strong><br/>{p.presupuesto}</div>
 <div><strong style={{ color:'#1d1d1f', fontSize:10.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Horizonte</strong><br/>{HORIZ_META[p.horizonte].label} ({p.inicio} → {p.fin})</div>
 </div>

                {/* Progreso */}
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Avance</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:e.color }}>{p.progreso}%</span>
 </div>
 <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${p.progreso}%`, height:'100%', background:e.color, borderRadius:3, transition:'width 280ms' }}/>
 </div>
 </div>

                {/* Stakeholders */}
 <div>
 <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Stakeholders</div>
 <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {p.stakeholders.map(s => (
 <span key={s} style={{
                        fontSize:10.5, fontWeight:600, padding:'2px 7px', borderRadius:6,
                        background:'#F5F5F7', color:'#3a3a3d',
                      }}>{s}</span>
                    ))}
 </div>
 </div>

                {/* Próximo hito */}
 <div style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
                  padding:'9px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
 <div style={{ minWidth:0 }}>
 <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Próximo hito</div>
 <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.hito}</div>
 </div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:e.color, flexShrink:0 }}>{p.hitoFecha}</div>
 </div>

                {/* CTA */}
 <button style={{
                  background:'#5B21B6', color:'#fff', border:'none',
                  borderRadius:8, padding:'8px 12px', marginTop:'auto',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                }}>Abrir ficha completa →</button>
 </article>
            )
          })}
 </div>
 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Radar Legislativo · Proyectos · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// Helpers UI
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
      whiteSpace:'nowrap', display:'inline-flex', alignItems:'center',
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
