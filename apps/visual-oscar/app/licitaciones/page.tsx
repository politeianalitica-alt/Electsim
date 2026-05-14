'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'
import LicitacionesBuscador from '@/components/LicitacionesBuscador'
import { useLicitaciones } from '@/hooks/contratacion/useLicitaciones'
import type {
  SectorContratacion, EstadoLicitacion, MatchContrato,
  TipoContrato, ProcedimientoLic, FuenteContratacion,
} from '@/types/contratacion'

const SECTOR_COLOR: Record<SectorContratacion, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
  'Servicios sociales':'#D43F8D', 'Cultura':'#7C3AED', 'Otros':'#6e6e73',
}
const TIPO_COLOR: Record<TipoContrato, string> = {
  'Servicios':'#1F4E8C', 'Suministro':'#16A34A', 'Obras':'#F97316',
  'Concesión':'#7C3AED', 'Mixto':'#525258',
}
const ESTADO_COLOR: Record<EstadoLicitacion, string> = {
  'Anuncio previo':'#0EA5E9', 'En plazo':'#16A34A', 'En estudio':'#F97316',
  'Adjudicación':'#5B21B6', 'Cerrado':'#525258',
}
const MATCH_COLOR: Record<MatchContrato, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const FUENTE_COLOR: Record<FuenteContratacion, string> = {
  'PLACSP':'#1F4E8C', 'BOE':'#5B21B6', 'TED (UE)':'#0EA5E9', 'BOCG':'#7C3AED',
  'Generalitat':'#F97316', 'Junta Andalucía':'#16A34A', 'C. Madrid':'#DC2626',
  'Ayto. Madrid':'#0F766E', 'Ayto. Barcelona':'#525258', 'Otros':'#6e6e73',
}

export default function LicitacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useLicitaciones()

  const licitaciones  = data?.licitaciones   ?? []
  const alertasPlazos = data?.alertas_plazos ?? []
  const watchlist     = data?.watchlist       ?? []
  const topOrg        = data?.top_org         ?? []

  const [tab, setTab] = useState<'feed' | 'watchlist' | 'alertas' | 'fuentes'>('feed')
  const [filterSector, setFilterSector] = useState<SectorContratacion | 'Todos'>('Todos')
  const [filterEstado, setFilterEstado] = useState<EstadoLicitacion | 'Todos'>('Todos')
  const [filterMatch,  setFilterMatch]  = useState<MatchContrato | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const importe = licitaciones.reduce((s, l) => s + l.importeBase, 0) / 1_000_000
    const enPlazo = licitaciones.filter(l => l.estado === 'En plazo' || l.estado === 'Anuncio previo').length
    const criticos = licitaciones.filter(l => l.match === 'CRÍTICO').length
    const cerrandoSemana = licitaciones.filter(l => l.diasRestantes >= 0 && l.diasRestantes <= 7).length
    return { total: licitaciones.length, importe, enPlazo, criticos, cerrandoSemana }
  }, [licitaciones])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return licitaciones
      .filter(l => filterSector === 'Todos' || l.sector === filterSector)
      .filter(l => filterEstado === 'Todos' || l.estado === filterEstado)
      .filter(l => filterMatch  === 'Todos' || l.match  === filterMatch)
      .filter(l => !q || l.titulo.toLowerCase().includes(q) || l.organismo.toLowerCase().includes(q) || l.exp.toLowerCase().includes(q) || l.keywords.some(k => k.toLowerCase().includes(q)))
      .sort((a,b) => b.matchScore - a.matchScore)
  }, [licitaciones, filterSector, filterEstado, filterMatch, query])

  if (loading) return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px', textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:13, color:'#6e6e73' }}>Cargando licitaciones…</div>
      </main>
    </div>
  )

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#1F4E8C 0%,#0d1b2e 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · AGREGADOR EN TIEMPO REAL
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.total} licitaciones activas · {totals.importe >= 1000 ? (totals.importe/1000).toFixed(1) + ' mil M€' : totals.importe.toFixed(0) + ' M€'} <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en juego</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Feed unificado PLACSP · BOE · TED · BOCG · 17 portales autonómicos y locales. Matching automático con keywords del cliente · alertas por plazo · CPV · regiones · presupuestos.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Activas"   value={String(totals.enPlazo)}        accent="#86EFAC"/>
            <HeroKPI label="Críticas"  value={String(totals.criticos)}       accent="#FCA5A5"/>
            <HeroKPI label="Cierran 7d" value={String(totals.cerrandoSemana)} accent="#FCD34D"/>
            <HeroKPI label="∑ Importe"  value={`${(totals.importe/1000).toFixed(1)}B€`} accent="#7DD3FC"/>
          </div>
        </section>

        {/* ═══ Buscador en vivo · Catalunya Socrata + PLACSP ═══ */}
        <LicitacionesBuscador/>

        {/* ═══ PLACSP en vivo · datos reales del estado ═══ */}
        <ContratosLiveFeed
          tipo="licitacion"
          limit={12}
          titulo="LICITACIONES PLACSP · ÚLTIMAS PUBLICADAS"
        />

        {/* ───── Snapshot del feed ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot del agregador" count="Datos en tiempo real · 17 fuentes" accent="#1F4E8C"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <SKpi label="Nuevas hoy"             value="18" sub="últimas 24 h"   delta="+6 vs ayer"    pos color="#1F4E8C"/>
            <SKpi label="Nuevas esta semana"     value="84" sub="lun-dom"         delta="+22%"          pos color="#5B21B6"/>
            <SKpi label="Pendientes de revisar"  value="12" sub="match alto+"     delta="3 sin abrir"  color="#F97316"/>
            <SKpi label="Match medio del feed"   value="68" sub="/100 score"      delta="+4 pp"        pos color="#0F766E"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'feed',      label:'Feed unificado',      count: licitaciones.length },
            { k:'watchlist', label:'Watchlist por sector', count: watchlist.length },
            { k:'alertas',   label:'Próximos cierres',     count: alertasPlazos.length },
            { k:'fuentes',   label:'Fuentes y orígenes',   count: 17 },
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
                {t.label} <span style={{ marginLeft:5, color: active ? '#1F4E8C' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Feed unificado ───── */}
        {tab === 'feed' && (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, expediente o palabra clave…"
                style={{ flex:'1 1 260px', maxWidth:360, padding:'9px 14px', borderRadius:10, border:'1px solid #ECECEF', background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f' }}/>
              <Selector label="Sector" value={filterSector} options={['Todos','Sanidad','Defensa','Infraestructuras','TIC','Energía','Educación','Servicios sociales','Cultura','Otros']} onChange={v => setFilterSector(v as SectorContratacion | 'Todos')}/>
              <Selector label="Estado" value={filterEstado} options={['Todos','Anuncio previo','En plazo','En estudio','Adjudicación','Cerrado']} onChange={v => setFilterEstado(v as EstadoLicitacion | 'Todos')}/>
              <Selector label="Match"  value={filterMatch}  options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterMatch(v as MatchContrato | 'Todos')}/>
              <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} licitaciones · ordenadas por match</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(l => {
                const cierreColor = l.diasRestantes < 0 ? '#525258' : l.diasRestantes <= 7 ? '#DC2626' : l.diasRestantes <= 21 ? '#F97316' : '#16A34A'
                return (
                  <article key={l.id} style={{
                    background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                    borderLeft:`4px solid ${MATCH_COLOR[l.match]}`,
                  }}>
                    <header style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:10, borderBottom:'1px solid #F5F5F7' }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:MATCH_COLOR[l.match], color:'#fff' }}>MATCH {l.match}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${SECTOR_COLOR[l.sector]}15`, color:SECTOR_COLOR[l.sector], border:`1px solid ${SECTOR_COLOR[l.sector]}40` }}>{l.sector.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${TIPO_COLOR[l.tipo]}15`, color:TIPO_COLOR[l.tipo], border:`1px solid ${TIPO_COLOR[l.tipo]}40` }}>{l.tipo.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_COLOR[l.estado]}15`, color:ESTADO_COLOR[l.estado], border:`1px solid ${ESTADO_COLOR[l.estado]}40` }}>{l.estado.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${FUENTE_COLOR[l.fuente]}15`, color:FUENTE_COLOR[l.fuente], border:`1px solid ${FUENTE_COLOR[l.fuente]}40` }}>{l.fuente.toUpperCase()}</span>
                          <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· EXP. {l.exp} · CPV {l.cpv}</span>
                        </div>
                        <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{l.titulo}</h3>
                        <div style={{ fontSize:11.5, color:'#3a3a3d' }}>{l.organismo} · <span style={{ color:'#6e6e73' }}>{l.region}</span></div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, minWidth:140 }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#1F4E8C', letterSpacing:'-0.018em', lineHeight:1 }}>
                          {(l.importeBase / 1_000_000).toFixed(1)}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span>
                        </div>
                        <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>importe base · {l.duracion}</div>
                      </div>
                    </header>
                    <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', gap:14, alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Keywords detectadas</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {l.keywords.map(k => (
                            <span key={k} style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:'#F5F5F7', color:'#3a3a3d', fontWeight:600 }}>{k}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Match score</div>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${l.matchScore}%`, height:'100%', background:MATCH_COLOR[l.match] }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:MATCH_COLOR[l.match] }}>{l.matchScore}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Plazo</div>
                        <div style={{ fontSize:12.5, fontWeight:700, color:cierreColor }}>
                          {l.diasRestantes < 0 ? `Cerrada hace ${Math.abs(l.diasRestantes)}d` : `${l.diasRestantes} días restantes`}
                        </div>
                        <div style={{ fontSize:10, color:'#86868b' }}>fin: {l.fechaLimite}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Procedimiento</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f' }}>{l.procedimiento}</div>
                        <div style={{ fontSize:10, color:'#86868b' }}>{l.pliegos} documentos</div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {/* ───── TAB · Watchlist ───── */}
        {tab === 'watchlist' && (
          <>
            <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10, marginBottom:14 }}>
              {watchlist.map(w => (
                <article key={w.sector} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${w.color}`,
                  display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
                }}>
                  <div>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:w.color, color:'#fff',
                    }}>{w.sector.toUpperCase()}</span>
                    <h4 style={{ margin:'6px 0 2px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.013em' }}>{w.activos} licitaciones activas</h4>
                    <p style={{ margin:0, fontSize:11, color:'#6e6e73' }}>importe en juego: {w.importe}M€</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:w.color, letterSpacing:'-0.018em', lineHeight:1 }}>{w.activos}</div>
                  </div>
                </article>
              ))}
            </section>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Configuración de la watchlist</h3>
              <p style={{ margin:'0 0 12px', fontSize:11.5, color:'#6e6e73' }}>Palabras clave, sectores y umbrales que dispararan alertas automáticas</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Keywords activas</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {['hidrógeno verde','ciberdefensa','SOC','vivienda asequible','AVE','radioterapia','cloud soberano','eólica marina','plan estatal'].map(k => (
                      <span key={k} style={{ fontSize:11, padding:'3px 9px', borderRadius:999, background:'#FAFAFB', border:'1px solid #ECECEF', color:'#1d1d1f', fontWeight:600 }}>{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Umbrales</div>
                  <ul style={{ margin:0, paddingLeft:18, fontSize:11.5, color:'#3a3a3d', lineHeight:1.7 }}>
                    <li>Importe mínimo: <strong>5 M€</strong></li>
                    <li>Plazo máximo cierre: <strong>60 días</strong></li>
                    <li>Match score mínimo: <strong>50</strong></li>
                    <li>CPV objetivo: <strong>33xxxx, 45xxxx, 72xxxx, 09xxxx</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ───── TAB · Próximos cierres ───── */}
        {tab === 'alertas' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Calendario de cierre · próximos 30 días</h3>
            <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Licitaciones con mayor urgencia · {alertasPlazos.length} expedientes ordenados por días restantes</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {alertasPlazos.map((a) => {
                const c = a.dias <= 7 ? '#DC2626' : a.dias <= 14 ? '#F97316' : '#EAB308'
                return (
                  <div key={a.exp} style={{
                    display:'grid', gridTemplateColumns:'70px 1fr auto auto', gap:12, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                    borderLeft:`3px solid ${c}`,
                  }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:c, lineHeight:1 }}>{a.dias}</div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:2 }}>días</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>EXP. {a.exp}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginTop:1 }}>{a.titulo}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1F4E8C' }}>{a.importe.toFixed(1)}M€</div>
                    </div>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 9px', borderRadius:999, textAlign:'center',
                      background:`${c}15`, color:c, border:`1px solid ${c}40`,
                    }}>{a.dias <= 7 ? 'URGENTE' : a.dias <= 14 ? 'PRÓXIMO' : 'PROGRAMADO'}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Fuentes ───── */}
        {tab === 'fuentes' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Top 5 organismos por volumen</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Importe total publicado en últimas 6 semanas</p>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {topOrg.map((o, i) => (
                  <div key={o.org} style={{ display:'grid', gridTemplateColumns:'24px 1fr 70px', gap:10, alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:800, color:'#1d1d1f' }}>{i+1}</span>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{o.org}</div>
                      <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden', marginTop:3 }}>
                        <div style={{ width:`${(o.importe / 4000) * 100}%`, height:'100%', background:'#1F4E8C', borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:10, color:'#86868b', marginTop:3 }}>{o.n} licitaciones</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1F4E8C' }}>{o.importe.toLocaleString('es-ES')}M€</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Fuentes de datos integradas</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>17 portales sincronizados · actualización cada 30 minutos</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { f:'PLACSP',           cat:'Estatal',     ok:true },
                  { f:'BOE',               cat:'Estatal',     ok:true },
                  { f:'TED · DOUE',        cat:'UE',          ok:true },
                  { f:'BOCG (Cortes)',     cat:'Estatal',     ok:true },
                  { f:'Generalitat Cat.',  cat:'CCAA',        ok:true },
                  { f:'Junta Andalucía',   cat:'CCAA',        ok:true },
                  { f:'C. Madrid',         cat:'CCAA',        ok:true },
                  { f:'Govern Valencià',   cat:'CCAA',        ok:true },
                  { f:'Xunta de Galicia',   cat:'CCAA',        ok:true },
                  { f:'Gob. Vasco',        cat:'CCAA',        ok:true },
                  { f:'Junta CyL',         cat:'CCAA',        ok:true },
                  { f:'Gob. Canarias',     cat:'CCAA',        ok:true },
                  { f:'Ayto. Madrid',      cat:'Local',       ok:true },
                  { f:'Ayto. Barcelona',   cat:'Local',       ok:true },
                  { f:'Ayto. València',    cat:'Local',       ok:true },
                  { f:'Diputaciones',      cat:'Local',       ok:true },
                  { f:'EU Funding & Tenders',cat:'UE',         ok:true },
                ].map(s => (
                  <div key={s.f} style={{
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:6, alignItems:'center',
                    padding:'6px 9px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8,
                  }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background: s.ok ? '#16A34A' : '#DC2626' }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'#1d1d1f' }}>{s.f}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>{s.cat.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Agregador de Licitaciones · Politeia Analítica · {new Date().getFullYear()}
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
        <span style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
      </div>
      {delta && (
        <div style={{ fontSize:10, fontWeight:700, color: pos ? '#16A34A' : '#DC2626', marginTop:5 }}>
          {pos ? '▲' : '▼'} {delta}
        </div>
      )}
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
