'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Resultado = 'aprobada' | 'rechazada'
type Mayoria = 'simple' | 'absoluta' | 'tres-quintos' | 'dos-tercios'
type TipoVot = 'Pleno' | 'Comisión' | 'Investidura' | 'Decreto-ley' | 'Moción'

const MAY_META: Record<Mayoria, { label: string; threshold: number }> = {
  'simple':       { label:'Mayoría simple',  threshold: 0   },
  'absoluta':     { label:'Mayoría absoluta', threshold: 176 },
  'tres-quintos': { label:'3/5',              threshold: 210 },
  'dos-tercios':  { label:'2/3',              threshold: 234 },
}

type GrupoVoto = {
  grupo: string
  color: string
  si: number
  no: number
  abs: number
}

type Votacion = {
  id: string
  fecha: string  // dd/mm/yyyy
  hora: string   // HH:MM
  tipo: TipoVot
  title: string
  norma: string
  mayoria: Mayoria
  resultado: Resultado
  totales: { si: number, no: number, abs: number }
  grupos: GrupoVoto[]
}

const VOTS: Votacion[] = [
  { id:'v01', fecha:'02/05/2026', hora:'18:30', tipo:'Pleno', title:'Convalidación decreto-ley 4/2026 · ayudas agroalimentarias', norma:'RDL 4/2026', mayoria:'simple', resultado:'aprobada',
    totales:{si:178,no:171,abs:1},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0,   abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0,   abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:5,   no:0,   abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0,   abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:1,   no:0,   abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0,   abs:0},
      {grupo:'ERC',   color:'#E8A030', si:7,   no:0,   abs:0},
      {grupo:'Junts', color:'#1FA89B', si:6,   no:0,   abs:1},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:137, abs:0},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33,  abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,   abs:0},
    ]},
  { id:'v02', fecha:'29/04/2026', hora:'12:15', tipo:'Pleno', title:'Ley de Movilidad Sostenible y Transporte', norma:'PL 121/000027', mayoria:'simple', resultado:'aprobada',
    totales:{si:184,no:160,abs:6},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0, abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0, abs:0},
      {grupo:'ERC',   color:'#E8A030', si:7,   no:0, abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0, abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:5,   no:0, abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:1,   no:0, abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0, abs:0},
      {grupo:'Junts', color:'#1FA89B', si:6,   no:0, abs:1},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:131,abs:6},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33, abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,  abs:0},
    ]},
  { id:'v03', fecha:'24/04/2026', hora:'17:45', tipo:'Pleno', title:'Convalidación decreto-ley 3/2026 · medidas energéticas', norma:'RDL 3/2026', mayoria:'simple', resultado:'aprobada',
    totales:{si:177,no:170,abs:3},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0,   abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0,   abs:0},
      {grupo:'ERC',   color:'#E8A030', si:7,   no:0,   abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0,   abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:5,   no:0,   abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:1,   no:0,   abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0,   abs:0},
      {grupo:'Junts', color:'#1FA89B', si:5,   no:0,   abs:2},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:135, abs:1},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33,  abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,   abs:0},
    ]},
  { id:'v04', fecha:'18/04/2026', hora:'19:20', tipo:'Pleno', title:'Reforma Constitucional · supresión aforamientos', norma:'PPL 122/000019', mayoria:'tres-quintos', resultado:'rechazada',
    totales:{si:159,no:188,abs:3},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0, abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0, abs:0},
      {grupo:'ERC',   color:'#E8A030', si:0,   no:7, abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:0,   no:1, abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0, abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:0,   no:5, abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0, abs:0},
      {grupo:'Junts', color:'#1FA89B', si:0,   no:4, abs:3},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:137,abs:0},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33, abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,  abs:0},
    ]},
  { id:'v05', fecha:'15/04/2026', hora:'11:00', tipo:'Comisión', title:'Dictamen Comisión Hacienda · IRPF reforma', norma:'PL 121/000034', mayoria:'simple', resultado:'aprobada',
    totales:{si:21,no:18,abs:0},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:14, no:0,  abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:4,  no:0,  abs:0},
      {grupo:'ERC',   color:'#E8A030', si:1,  no:0,  abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:1, no:0,  abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:1,  no:0,  abs:0},
      {grupo:'PP',    color:'#1F4E8C', si:0,  no:14, abs:0},
      {grupo:'VOX',   color:'#5BA02E', si:0,  no:4,  abs:0},
    ]},
  { id:'v06', fecha:'09/04/2026', hora:'16:50', tipo:'Pleno', title:'Investidura · 2ª votación · cuestión de confianza', norma:'Cuestión confianza', mayoria:'simple', resultado:'aprobada',
    totales:{si:178,no:171,abs:1},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0,   abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0,   abs:0},
      {grupo:'ERC',   color:'#E8A030', si:7,   no:0,   abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0,   abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:5,   no:0,   abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:1,   no:0,   abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0,   abs:0},
      {grupo:'Junts', color:'#1FA89B', si:6,   no:0,   abs:1},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:137, abs:0},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33,  abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,   abs:0},
    ]},
  { id:'v07', fecha:'02/04/2026', hora:'15:30', tipo:'Moción', title:'Moción VOX · derogación Memoria Democrática', norma:'Moción consec.', mayoria:'simple', resultado:'rechazada',
    totales:{si:170,no:178,abs:2},
    grupos:[
      {grupo:'PP',    color:'#1F4E8C', si:137, no:0,   abs:0},
      {grupo:'VOX',   color:'#5BA02E', si:33,  no:0,   abs:0},
      {grupo:'PSOE',  color:'#E1322D', si:0,   no:121, abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:0,   no:31,  abs:0},
      {grupo:'ERC',   color:'#E8A030', si:0,   no:7,   abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:0,  no:6,   abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:0,   no:5,   abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:0,   no:1,   abs:0},
      {grupo:'CC',    color:'#F2C43A', si:0,   no:1,   abs:0},
      {grupo:'Junts', color:'#1FA89B', si:0,   no:5,   abs:2},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,   abs:0},
    ]},
  { id:'v08', fecha:'27/03/2026', hora:'13:10', tipo:'Pleno', title:'Senado · veto Ley de Vivienda', norma:'PL 121/000041', mayoria:'absoluta', resultado:'aprobada',
    totales:{si:177,no:170,abs:3},
    grupos:[
      {grupo:'PSOE',  color:'#E1322D', si:121, no:0,   abs:0},
      {grupo:'Sumar', color:'#D43F8D', si:31,  no:0,   abs:0},
      {grupo:'ERC',   color:'#E8A030', si:7,   no:0,   abs:0},
      {grupo:'EH Bildu',color:'#3F7A3A',si:6,  no:0,   abs:0},
      {grupo:'PNV',   color:'#7DB94B', si:5,   no:0,   abs:0},
      {grupo:'BNG',   color:'#5BB3D9', si:1,   no:0,   abs:0},
      {grupo:'CC',    color:'#F2C43A', si:1,   no:0,   abs:0},
      {grupo:'Junts', color:'#1FA89B', si:5,   no:0,   abs:2},
      {grupo:'PP',    color:'#1F4E8C', si:0,   no:135, abs:1},
      {grupo:'VOX',   color:'#5BA02E', si:0,   no:33,  abs:0},
      {grupo:'UPN',   color:'#0E7D8C', si:0,   no:1,   abs:0},
    ]},
]

const TIPOS_FIL = ['Todos','Pleno','Comisión','Investidura','Decreto-ley','Moción'] as const

export default function VotacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterRes, setFilterRes]   = useState<Resultado | 'todos'>('todos')
  const [filterMay, setFilterMay]   = useState<Mayoria | 'todas'>('todas')
  const [filterTipo, setFilterTipo] = useState<typeof TIPOS_FIL[number]>('Todos')

  const counts = useMemo(() => {
    return {
      total: VOTS.length,
      aprobadas: VOTS.filter(v => v.resultado === 'aprobada').length,
      rechazadas: VOTS.filter(v => v.resultado === 'rechazada').length,
      tasa: Math.round((VOTS.filter(v => v.resultado === 'aprobada').length / VOTS.length) * 100),
    }
  }, [])

  const filtered = useMemo(() => {
    return VOTS.filter(v =>
      (filterRes === 'todos' || v.resultado === filterRes) &&
      (filterMay === 'todas' || v.mayoria === filterMay) &&
      (filterTipo === 'Todos' || v.tipo === filterTipo)
    )
  }, [filterRes, filterMay, filterTipo])

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
              RADAR LEGISLATIVO · VOTACIONES PARLAMENTARIAS
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:28, letterSpacing:'-0.022em', margin:'0 0 6px', lineHeight:1.1 }}>
              {counts.tasa}% de votaciones <em style={{ fontWeight:300, fontStyle:'italic', color:'#16A34A' }}>aprobadas</em>
            </h1>
            <p style={{ fontSize:13, color:'#6e6e73', margin:0 }}>
              {counts.total} votaciones registradas · {counts.aprobadas} aprobadas · {counts.rechazadas} rechazadas · datos del Congreso de los Diputados
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <KPI label="APROBADAS" value={String(counts.aprobadas)} color="#16A34A"/>
            <KPI label="RECHAZADAS" value={String(counts.rechazadas)} color="#DC2626"/>
            <KPI label="TASA ÉXITO" value={`${counts.tasa}%`} color="#5B21B6"/>
          </div>
        </section>

        {/* Filtros */}
        <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
          <FilterGroup label="Resultado">
            {(['todos','aprobada','rechazada'] as const).map(r => {
              const active = filterRes === r
              const c = r === 'aprobada' ? '#16A34A' : r === 'rechazada' ? '#DC2626' : undefined
              return (
                <Pill key={r} active={active} onClick={()=>setFilterRes(r)} color={c}>
                  {r === 'todos' ? 'Todos' : r === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}
                </Pill>
              )
            })}
          </FilterGroup>
          <Sep/>
          <FilterGroup label="Mayoría">
            {(['todas','simple','absoluta','tres-quintos','dos-tercios'] as const).map(m => {
              const active = filterMay === m
              const meta = m !== 'todas' ? MAY_META[m as Mayoria] : null
              return (
                <Pill key={m} active={active} onClick={()=>setFilterMay(m)}>
                  {m === 'todas' ? 'Todas' : meta?.label}
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
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} votaciones</span>
        </div>

        {/* Lista de votaciones */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.length === 0 && (
            <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
              Sin votaciones que coincidan con el filtro.
            </div>
          )}
          {filtered.map(v => {
            const aprob = v.resultado === 'aprobada'
            const c = aprob ? '#16A34A' : '#DC2626'
            const tot = v.totales.si + v.totales.no + v.totales.abs
            const may = MAY_META[v.mayoria]
            return (
              <article key={v.id} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'16px 20px',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
                display:'grid', gridTemplateColumns:'1fr auto', gap:18, alignItems:'flex-start',
              }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 9px', borderRadius:999,
                      background:c, color:'#fff',
                    }}>{aprob ? 'APROBADA' : 'RECHAZADA'}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:'#F5F5F7', color:'#3a3a3d', border:'1px solid #ECECEF',
                    }}>{v.tipo.toUpperCase()}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:'rgba(91,33,182,0.1)', color:'#5B21B6', border:'1px solid rgba(91,33,182,0.3)',
                    }}>{may.label.toUpperCase()}{may.threshold ? ` · ${may.threshold}` : ''}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, marginLeft:'auto' }}>
                      {v.fecha} · {v.hora}
                    </span>
                  </div>
                  <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f' }}>{v.title}</h3>
                  <p style={{ margin:'3px 0 10px', fontSize:11.5, color:'#6e6e73' }}>{v.norma}</p>

                  {/* Barra agregada SÍ / Abs / NO */}
                  <div style={{ position:'relative', height:18, background:'#F5F5F7', borderRadius:5, overflow:'visible', marginBottom:8 }}>
                    <div style={{ display:'flex', height:'100%', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ width:`${(v.totales.si/tot)*100}%`, background:'#16A34A' }}/>
                      <div style={{ width:`${(v.totales.abs/tot)*100}%`, background:'#9CA3AF' }}/>
                      <div style={{ width:`${(v.totales.no/tot)*100}%`, background:'#DC2626' }}/>
                    </div>
                    {may.threshold > 0 && (
                      <>
                        <div style={{ position:'absolute', left:`${(may.threshold/350)*100}%`, top:-2, bottom:-2, width:2, background:'#1d1d1f', transform:'translateX(-50%)' }}/>
                        <div style={{ position:'absolute', left:`${(may.threshold/350)*100}%`, top:22, transform:'translateX(-50%)', fontSize:9.5, color:'#1d1d1f', fontWeight:600, whiteSpace:'nowrap' }}>↑ {may.threshold}</div>
                      </>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:14, fontSize:11.5, marginTop:may.threshold ? 18 : 4 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:2, background:'#16A34A' }}/><strong>SÍ {v.totales.si}</strong></span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:2, background:'#9CA3AF' }}/>Abst. {v.totales.abs}</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:2, background:'#DC2626' }}/><strong>NO {v.totales.no}</strong></span>
                  </div>

                  {/* Voto por grupo */}
                  <details style={{ marginTop:10 }}>
                    <summary style={{ fontSize:11, color:'#5B21B6', fontWeight:600, cursor:'pointer', listStyle:'none' }}>Ver voto por grupo →</summary>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:6, marginTop:10 }}>
                      {v.grupos.map(g => (
                        <div key={g.grupo} style={{ display:'grid', gridTemplateColumns:'12px 60px 1fr', gap:6, alignItems:'center', fontSize:11 }}>
                          <span style={{ width:9, height:9, borderRadius:2, background:g.color }}/>
                          <span style={{ fontWeight:600 }}>{g.grupo}</span>
                          <span style={{ color:'#3a3a3d' }}>
                            {g.si > 0 && <span style={{ color:'#16A34A', fontWeight:700 }}>SÍ {g.si}</span>}
                            {g.si > 0 && (g.no > 0 || g.abs > 0) && ' · '}
                            {g.no > 0 && <span style={{ color:'#DC2626', fontWeight:700 }}>NO {g.no}</span>}
                            {g.no > 0 && g.abs > 0 && ' · '}
                            {g.abs > 0 && <span style={{ color:'#9CA3AF', fontWeight:700 }}>ABS {g.abs}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                {/* Marcador resultado */}
                <div style={{ textAlign:'center', flexShrink:0, paddingLeft:18, borderLeft:'1px solid #ECECEF' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, color:c, lineHeight:1, letterSpacing:'-0.024em' }}>{v.totales.si}</div>
                  <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>SÍ / 350</div>
                </div>
              </article>
            )
          })}
        </div>
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Radar Legislativo · Votaciones · Politeia Analítica · {new Date().getFullYear()}
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
