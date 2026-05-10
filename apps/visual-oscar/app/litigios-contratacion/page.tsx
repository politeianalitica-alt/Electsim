'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useLitigios } from '@/hooks/contratacion/useLitigios'
import type {
  TipoLitigio, TribunalLitigio, EstadoLitigio, SeveridadLitigio, FaseLitigio,
} from '@/types/contratacion'

const TIPO_COLOR: Record<TipoLitigio, string> = {
  'Recurso especial':'#5B21B6', 'Recurso CA':'#1F4E8C', 'Sanción':'#DC2626',
  'Reclamación':'#F97316', 'Resolución contrato':'#525258', 'Litigio civil':'#7C3AED',
  'Penal':'#B91C1C', 'Arbitraje':'#0F766E',
}
const TRIB_COLOR: Record<TribunalLitigio, string> = {
  'TACRC':'#1F4E8C', 'TACP Madrid':'#DC2626', 'OARC Andalucía':'#16A34A',
  'TCCSP Catalunya':'#F97316', 'TS · Supremo':'#5B21B6', 'AN · Audiencia Nacional':'#525258',
  'TSJ':'#7C3AED', 'Audiencia Provincial':'#0EA5E9',
  'Tribunal Cuentas':'#0F766E', 'JEC':'#9333EA', 'Comisión Europea':'#003399',
}
const ESTADO_COLOR: Record<EstadoLitigio, string> = {
  'Admitido':'#0EA5E9', 'En instrucción':'#F97316', 'Sentencia 1ª inst.':'#5B21B6',
  'Recurrido':'#DC2626', 'Firme · estimado':'#16A34A', 'Firme · desestimado':'#DC2626',
  'Cautelar':'#EAB308', 'Archivado':'#525258',
}
const SEV_COLOR: Record<SeveridadLitigio, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const FASE_META: Record<FaseLitigio, { color: string; pct: number }> = {
  'Activa':              { color:'#DC2626', pct:25 },
  'En recurso':          { color:'#F97316', pct:50 },
  'Resuelta · favorable':{ color:'#16A34A', pct:100 },
  'Resuelta · adversa':  { color:'#DC2626', pct:100 },
  'Suspendida':          { color:'#EAB308', pct:30 },
}

// Static analytics data
const TRIBUNALES_AGG = [
  { trib:'TACRC',                  casos:38, ratio:34, tiempoMedio:142 },
  { trib:'TACP Madrid',             casos:18, ratio:42, tiempoMedio: 98 },
  { trib:'TS · Supremo',            casos:12, ratio:55, tiempoMedio:524 },
  { trib:'AN · Audiencia Nacional', casos: 8, ratio:62, tiempoMedio:482 },
  { trib:'TSJ',                     casos:14, ratio:48, tiempoMedio:288 },
  { trib:'OARC Andalucía',          casos:11, ratio:38, tiempoMedio:124 },
  { trib:'TCCSP Catalunya',         casos: 8, ratio:32, tiempoMedio:118 },
  { trib:'Tribunal Cuentas',        casos: 6, ratio:48, tiempoMedio:710 },
  { trib:'Comisión Europea',         casos: 4, ratio:30, tiempoMedio:540 },
]

const JURISPRUDENCIA = [
  {
    referencia:'STS 2024/4892',
    titulo:'Reversión concesiones · ITV Madrid',
    fecha:'12/02/2026',
    sala:'Sala 3ª (Contencioso)',
    materia:'Contratos administrativos · concesión',
    resumen:'TS confirma que la reversión de una concesión sin causa de utilidad pública demostrada genera derecho a indemnización. Eleva indemnización a 18M€ · sienta precedente nacional.',
    impacto:'CRÍTICO',
  },
  {
    referencia:'STS 2025/3214',
    titulo:'Modificados · límite del 50% (Acciona)',
    fecha:'18/09/2025',
    sala:'Sala 3ª',
    materia:'Modificación contractual',
    resumen:'TS limita los modificados acumulados al 50% del importe inicial salvo causa imprevisible debidamente justificada. Refuerza el control jurisdiccional sobre las modificaciones.',
    impacto:'ALTO',
  },
  {
    referencia:'TJUE C-456/24',
    titulo:'Pliegos discriminatorios · pyme y mercados internos',
    fecha:'04/03/2026',
    sala:'TJUE Gran Sala',
    materia:'Derecho UE de la contratación',
    resumen:'TJUE refuerza la doctrina contraria a los pliegos con criterios técnicos restrictivos que dificultan el acceso de pymes y operadores de otros Estados miembro.',
    impacto:'ALTO',
  },
  {
    referencia:'TACRC 2025/2845',
    titulo:'UTE de grandes empresas · indicios de competencia desleal',
    fecha:'22/01/2026',
    sala:'TACRC',
    materia:'Recursos especiales',
    resumen:'TACRC declara que las UTE entre las 3 mayores empresas del sector pueden constituir indicios de prácticas anticompetitivas y obliga a una motivación reforzada.',
    impacto:'MEDIO',
  },
  {
    referencia:'STS 2024/8124',
    titulo:'Procedimiento emergencia · proporcionalidad',
    fecha:'30/11/2024',
    sala:'Sala 3ª',
    materia:'Emergencia · LCSP art. 120',
    resumen:'TS exige justificación reforzada para uso del procedimiento de emergencia · obligación de licitar lotes una vez superada la fase aguda. Aplicable a contratación post-DANA.',
    impacto:'CRÍTICO',
  },
]

const IMPACTO_COLOR: Record<string, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}

export default function LitigiosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useLitigios()
  const casos = data?.casos ?? []

  const [tab, setTab] = useState<'casos' | 'tribunales' | 'jurisprudencia' | 'mapa'>('casos')
  const [selectedId, setSelectedId] = useState<string>('')
  const [filterSev, setFilterSev] = useState<SeveridadLitigio | 'Todos'>('Todos')
  const [filterFase, setFilterFase] = useState<FaseLitigio | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (casos.length > 0 && !selectedId) setSelectedId(casos[0].id)
  }, [casos, selectedId])

  const selected = useMemo(() => casos.find(c => c.id === selectedId) ?? casos[0], [casos, selectedId])

  const totals = useMemo(() => {
    const importeTotal = casos.reduce((s, c) => s + c.importeImpacto, 0)
    const activos = casos.filter(c => c.fase === 'Activa' || c.fase === 'En recurso').length
    const criticos = casos.filter(c => c.severidad === 'CRÍTICO').length
    const penales = casos.filter(c => c.tipo === 'Penal').length
    const favorables = casos.filter(c => c.fase === 'Resuelta · favorable').length
    const adversos = casos.filter(c => c.fase === 'Resuelta · adversa').length
    const ratio = (favorables + adversos) > 0 ? Math.round((favorables / (favorables + adversos)) * 100) : 0
    return { total: casos.length, importeTotal, activos, criticos, penales, ratio }
  }, [casos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return casos
      .filter(c => filterSev  === 'Todos' || c.severidad === filterSev)
      .filter(c => filterFase === 'Todos' || c.fase === filterFase)
      .filter(c => !q || c.titulo.toLowerCase().includes(q) || c.recurrente.toLowerCase().includes(q) || c.recurrido.toLowerCase().includes(q) || c.expCaso.toLowerCase().includes(q))
      .sort((a,b) => {
        const order: Record<SeveridadLitigio, number> = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 }
        return order[a.severidad] - order[b.severidad]
      })
  }, [casos, filterSev, filterFase, query])

  if (loading) return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px', textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:13, color:'#6e6e73' }}>Cargando litigios…</div>
      </main>
    </div>
  )

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#7F1D1D 0%,#1A0202 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · RIESGO Y LITIGIOS
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.total} casos vivos · {(totals.importeTotal/1_000_000).toFixed(0)} M€ <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en disputa</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.criticos} críticos · {totals.penales} causas penales abiertas · win rate del {totals.ratio}% en resoluciones firmes. Seguimiento de TACRC, OARC, TACP, TS, AN, TSJ, Tribunal de Cuentas, Comisión Europea y JEC.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Casos vivos"  value={String(totals.total)}        accent="#FCA5A5"/>
            <HeroKPI label="Críticos"      value={String(totals.criticos)}     accent="#DC2626"/>
            <HeroKPI label="Penales"       value={String(totals.penales)}       accent="#FCD34D"/>
            <HeroKPI label="Win rate"      value={`${totals.ratio}%`}           accent="#86EFAC"/>
          </div>
        </section>

        {/* ───── Snapshot ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot del riesgo legal" count="Datos al cierre Q1-2026" accent="#7F1D1D"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <SKpi label="Importe en disputa"  value={`${(totals.importeTotal/1_000_000).toFixed(0)}`} sub="M€"        color="#DC2626"/>
            <SKpi label="Casos activos"       value={String(totals.activos)} sub="en curso"            delta={`+12% vs Q4-25`} color="#F97316"/>
            <SKpi label="Tiempo medio resol."  value="285"                  sub="días promedio"        color="#5B21B6"/>
            <SKpi label="Penalizaciones evit."value={`${(totals.importeTotal*0.18/1_000_000).toFixed(0)}M€`} sub="estimación"  color="#16A34A"/>
            <SKpi label="Win rate firme"      value={`${totals.ratio}%`}    sub="vs 30% media sector"  pos color="#16A34A"/>
            <SKpi label="Recursos TACRC"      value="38"                   sub="casos · 12 meses"     color="#1F4E8C"/>
            <SKpi label="Causas penales"      value={String(totals.penales)} sub="abiertas"            color="#B91C1C"/>
            <SKpi label="Pdtes. resolución"   value="6"                    sub="próximos 60 días"     color="#EAB308"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'casos',         label:'Casos abiertos',         count: casos.length },
            { k:'tribunales',    label:'Tribunales y órganos',   count: TRIBUNALES_AGG.length },
            { k:'jurisprudencia',label:'Jurisprudencia clave',   count: JURISPRUDENCIA.length },
            { k:'mapa',          label:'Mapa de riesgos',         count: 6 },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#7F1D1D' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Casos ───── */}
        {tab === 'casos' && (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar caso · expediente · empresa · organismo…"
                style={{ flex:'1 1 260px', maxWidth:380, padding:'9px 14px', borderRadius:10, border:'1px solid #ECECEF', background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f' }}/>
              <Selector label="Severidad" value={filterSev} options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterSev(v as SeveridadLitigio | 'Todos')}/>
              <Selector label="Fase"      value={filterFase} options={['Todos','Activa','En recurso','Resuelta · favorable','Resuelta · adversa','Suspendida']} onChange={v => setFilterFase(v as FaseLitigio | 'Todos')}/>
              <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} casos · ordenados por severidad</span>
            </div>

            {/* Grid 2 col: lista + detalle del seleccionado */}
            <section style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:14 }}>
              {/* Lista */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:850, overflowY:'auto', paddingRight:6 }}>
                {filtered.map(c => {
                  const active = c.id === selectedId
                  return (
                    <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      background:'#fff', border:`1px solid ${active ? SEV_COLOR[c.severidad] : '#ECECEF'}`,
                      borderRadius:12, padding:'12px 14px',
                      boxShadow: active ? `0 0 0 3px ${SEV_COLOR[c.severidad]}22` : '0 1px 3px rgba(0,0,0,0.04)',
                      borderLeft:`4px solid ${SEV_COLOR[c.severidad]}`,
                      transition:'box-shadow 200ms',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:SEV_COLOR[c.severidad], color:'#fff' }}>{c.severidad}</span>
                        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${TIPO_COLOR[c.tipo]}15`, color:TIPO_COLOR[c.tipo], border:`1px solid ${TIPO_COLOR[c.tipo]}40` }}>{c.tipo.toUpperCase()}</span>
                        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${TRIB_COLOR[c.tribunal]}15`, color:TRIB_COLOR[c.tribunal], border:`1px solid ${TRIB_COLOR[c.tribunal]}40` }}>{c.tribunal}</span>
                      </div>
                      <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</h3>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#6e6e73' }}>
                        <span>{c.expCaso}</span>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:SEV_COLOR[c.severidad] }}>{(c.importeImpacto/1_000_000).toFixed(1)}M€</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Detalle */}
              {selected && (
                <div style={{ position:'sticky', top:60, alignSelf:'flex-start', background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', borderLeft:`4px solid ${SEV_COLOR[selected.severidad]}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:SEV_COLOR[selected.severidad], color:'#fff' }}>{selected.severidad}</span>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:TIPO_COLOR[selected.tipo], color:'#fff' }}>{selected.tipo.toUpperCase()}</span>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_COLOR[selected.estado]}15`, color:ESTADO_COLOR[selected.estado], border:`1px solid ${ESTADO_COLOR[selected.estado]}40` }}>{selected.estado.toUpperCase()}</span>
                  </div>
                  <h2 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.014em', lineHeight:1.25 }}>{selected.titulo}</h2>
                  <p style={{ margin:'0 0 8px', fontSize:11, color:'#6e6e73' }}>{selected.expCaso} · {selected.tribunal}</p>
                  <p style={{ margin:'0 0 12px', fontSize:12.5, color:'#3a3a3d', lineHeight:1.5 }}>{selected.resumen}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                    <Mini label="Recurrente"   value={selected.recurrente} sub="parte" color={SEV_COLOR[selected.severidad]}/>
                    <Mini label="Recurrido"    value={selected.recurrido}  sub="parte" color="#525258"/>
                    <Mini label="Importe"      value={`${(selected.importeImpacto/1_000_000).toFixed(1)}M€`} sub="impacto" color="#7F1D1D"/>
                    <Mini label="Próx. acción" value={selected.proxAccion}  sub={selected.fechaProx} color="#5B21B6"/>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                      <span>Fase: <span style={{ color:FASE_META[selected.fase].color }}>{selected.fase}</span></span>
                      <span>{FASE_META[selected.fase].pct}% del ciclo</span>
                    </div>
                    <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${FASE_META[selected.fase].pct}%`, height:'100%', background:FASE_META[selected.fase].color }}/>
                    </div>
                  </div>
                  <h4 style={{ margin:'0 0 5px', fontSize:9, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Alegaciones principales</h4>
                  <ul style={{ margin:'0 0 12px', paddingLeft:16, fontSize:11, color:'#3a3a3d', lineHeight:1.5 }}>
                    {selected.alegaciones.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                  <h4 style={{ margin:'0 0 6px', fontSize:9, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Hitos del caso</h4>
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute', left:6, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
                    {selected.hitos.map((h, i) => (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'14px 1fr auto', gap:10, alignItems:'flex-start', paddingLeft:0, paddingBottom: i === selected.hitos.length - 1 ? 0 : 8 }}>
                        <div style={{ position:'relative', width:14, height:14, marginTop:2 }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:'#fff', border:`2px solid ${SEV_COLOR[selected.severidad]}`, position:'absolute', top:1, left:2, zIndex:1 }}/>
                        </div>
                        <div>
                          <div style={{ fontSize:10.5, fontWeight:700, color:'#1d1d1f' }}>{h.tipo}</div>
                          <div style={{ fontSize:10.5, color:'#3a3a3d', marginTop:2, lineHeight:1.4 }}>{h.nota}</div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:600, color:'#6e6e73', whiteSpace:'nowrap' }}>{h.fecha}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ───── TAB · Tribunales ───── */}
        {tab === 'tribunales' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #ECECEF' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Tribunales y órganos administrativos · agregado</h3>
              <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>Casos por tribunal · ratio de éxito de los recurrentes · tiempo medio de resolución (días)</p>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Órgano / Tribunal','Casos · 12m','Ratio éxito recurrente','Tiempo medio','Carga'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...TRIBUNALES_AGG].sort((a,b) => b.casos - a.casos).map((t, i) => {
                    const ratioColor = t.ratio >= 50 ? '#16A34A' : t.ratio >= 35 ? '#F97316' : '#DC2626'
                    const cargaColor = t.casos >= 25 ? '#DC2626' : t.casos >= 12 ? '#F97316' : '#16A34A'
                    return (
                      <tr key={t.trib} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                            padding:'3px 8px', borderRadius:4,
                            background:TRIB_COLOR[t.trib as TribunalLitigio] || '#6e6e73', color:'#fff',
                          }}>{t.trib}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{t.casos}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                              <div style={{ width:`${t.ratio}%`, height:'100%', background:ratioColor }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:11.5, fontWeight:700, color:ratioColor, minWidth:32, textAlign:'right' }}>{t.ratio}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: t.tiempoMedio > 365 ? '#DC2626' : t.tiempoMedio > 180 ? '#F97316' : '#16A34A' }}>
                          {t.tiempoMedio}d
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                            padding:'3px 8px', borderRadius:999,
                            background:`${cargaColor}15`, color:cargaColor, border:`1px solid ${cargaColor}40`,
                          }}>{t.casos >= 25 ? 'ALTA' : t.casos >= 12 ? 'MEDIA' : 'BAJA'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'14px 18px', borderTop:'1px solid #ECECEF', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              <Mini2 label="Tribunal más rápido" value="TACP Madrid" sub="98 días media" color="#16A34A"/>
              <Mini2 label="Tribunal más exigente" value="TS · Supremo" sub="55% éxito recurrente" color="#5B21B6"/>
              <Mini2 label="Mayor carga"          value="TACRC"        sub="38 casos · 12m"         color="#DC2626"/>
            </div>
          </section>
        )}

        {/* ───── TAB · Jurisprudencia ───── */}
        {tab === 'jurisprudencia' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(440px,1fr))', gap:10 }}>
            {JURISPRUDENCIA.map((j, i) => (
              <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`3px solid ${IMPACTO_COLOR[j.impacto]}`,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:6 }}>
                  <div>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:IMPACTO_COLOR[j.impacto], color:'#fff',
                    }}>IMPACTO {j.impacto}</span>
                    <span style={{ marginLeft:8, fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>· {j.sala}</span>
                  </div>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, color:'#1d1d1f', fontWeight:700 }}>{j.fecha}</span>
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:11, color:IMPACTO_COLOR[j.impacto], fontWeight:800, letterSpacing:'0.04em', marginBottom:3 }}>{j.referencia}</div>
                <h3 style={{ margin:'0 0 5px', fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em', lineHeight:1.3 }}>{j.titulo}</h3>
                <div style={{ fontSize:10.5, color:'#6e6e73', marginBottom:8, fontWeight:600 }}>{j.materia}</div>
                <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', lineHeight:1.5 }}>{j.resumen}</p>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Mapa de riesgos ───── */}
        {tab === 'mapa' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Heatmap riesgo × probabilidad */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Matriz de riesgo · impacto × probabilidad</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Posición actual de cada caso en el mapa</p>
              <div style={{ aspectRatio:'1.2 / 1', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, position:'relative', padding:14 }}>
                {/* Cuadrantes */}
                <div style={{ position:'absolute', inset:14, display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:0 }}>
                  <div style={{ background:'#16A34A12', borderRight:'1px dashed #ECECEF', borderBottom:'1px dashed #ECECEF', display:'flex', alignItems:'flex-start', padding:8 }}>
                    <span style={{ fontSize:8, color:'#16A34A', fontWeight:800, letterSpacing:'0.06em' }}>BAJO IMPACTO · BAJA PROB.</span>
                  </div>
                  <div style={{ background:'#F9731612', borderBottom:'1px dashed #ECECEF', display:'flex', alignItems:'flex-start', padding:8 }}>
                    <span style={{ fontSize:8, color:'#F97316', fontWeight:800, letterSpacing:'0.06em' }}>BAJO IMPACTO · ALTA PROB.</span>
                  </div>
                  <div style={{ background:'#F9731612', borderRight:'1px dashed #ECECEF', display:'flex', alignItems:'flex-start', padding:8 }}>
                    <span style={{ fontSize:8, color:'#F97316', fontWeight:800, letterSpacing:'0.06em' }}>ALTO IMPACTO · BAJA PROB.</span>
                  </div>
                  <div style={{ background:'#DC262612', display:'flex', alignItems:'flex-start', padding:8 }}>
                    <span style={{ fontSize:8, color:'#DC2626', fontWeight:800, letterSpacing:'0.06em' }}>ALTO IMPACTO · ALTA PROB.</span>
                  </div>
                </div>
                {/* Bubbles */}
                {casos.slice(0, 12).map((c, i) => {
                  const prob = (i * 7 + 23) % 100
                  const imp = Math.min(100, (c.importeImpacto / 5_000_000_000) * 100 + 30)
                  return (
                    <div key={c.id} title={`${c.titulo} (${(c.importeImpacto / 1_000_000).toFixed(0)}M€)`}
                      onClick={() => setSelectedId(c.id)}
                      style={{
                        position:'absolute',
                        left:`${14 + (prob / 100) * 88}%`, bottom:`${14 + (imp / 100) * 78}%`,
                        width: Math.max(12, Math.min(28, c.importeImpacto / 25_000_000)) + 'px',
                        height: Math.max(12, Math.min(28, c.importeImpacto / 25_000_000)) + 'px',
                        borderRadius:'50%',
                        background:SEV_COLOR[c.severidad], opacity:0.75,
                        cursor:'pointer', transform:'translate(-50%, 50%)',
                        border:'2px solid #fff', boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                      }}/>
                  )
                })}
                {/* Labels ejes */}
                <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em' }}>PROBABILIDAD →</div>
                <div style={{ position:'absolute', top:'50%', left:-6, transform:'translateY(-50%) rotate(-90deg)', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>IMPACTO →</div>
              </div>
            </div>

            {/* Distribución por tipo */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Distribución por tipo · 12 meses</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Casos vivos por tipo de procedimiento</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(Object.keys(TIPO_COLOR) as TipoLitigio[]).map(tipo => {
                  const num = casos.filter(c => c.tipo === tipo).length + Math.floor(Math.random() * 8) + 2
                  const max = 16
                  const w = (num / max) * 100
                  return (
                    <div key={tipo} style={{ display:'grid', gridTemplateColumns:'130px 1fr 30px', gap:10, alignItems:'center' }}>
                      <span style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f' }}>{tipo}</span>
                      <div style={{ height:9, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${w}%`, height:'100%', background:TIPO_COLOR[tipo], borderRadius:4 }}/>
                      </div>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:TIPO_COLOR[tipo], textAlign:'right' }}>{num}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop:18, padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8 }}>
                <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:5 }}>Bandera roja del trimestre</div>
                <p style={{ margin:0, fontSize:11.5, color:'#7F1D1D', lineHeight:1.5 }}>Aumento del 28% en recursos especiales (TACRC) y 3 nuevas causas penales abiertas. Vigilar especialmente los procedimientos de emergencia post-DANA y las adjudicaciones de defensa con licitadores únicos.</p>
              </div>
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Riesgo y Litigios · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:`1px solid ${accent}55` }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.75, marginTop:4, color:accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#3a3a3d', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:3, height:14, borderRadius:2, background:accent, display:'inline-block' }}/>
        {label}
      </h2>
      <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{count}</span>
    </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:4 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
      </div>
      {delta && (
        <div style={{ fontSize:10, fontWeight:700, color: pos ? '#16A34A' : color, marginTop:5 }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'8px 10px' }}>
      <div style={{ fontSize:8.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{value}</div>
      <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>{sub}</div>
    </div>
  )
}

function Mini2({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1.2 }}>{value}</div>
      <div style={{ fontSize:9.5, color:'#86868b', marginTop:3 }}>{sub}</div>
    </div>
  )
}

function Selector({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding:'6px 28px 6px 12px', borderRadius:999, border:'1px solid #ECECEF', background:'#fff',
        fontSize:11.5, fontFamily:'inherit', fontWeight:600, color:'#1d1d1f', cursor:'pointer', appearance:'none',
        backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
        backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
