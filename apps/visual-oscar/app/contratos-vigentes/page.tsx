'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'
import { useContratosVigentes } from '@/hooks/contratacion/useContratosVigentes'
import type {
  SectorContratacion, RiesgoContrato, EstadoContrato,
} from '@/types/contratacion'

const SECTOR_COLOR: Record<SectorContratacion, string> = {
 'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
 'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
 'Servicios sociales':'#D43F8D', 'Cultura':'#7C3AED', 'Otros':'#6e6e73',
}
const ESTADO_COLOR: Record<EstadoContrato, string> = {
 'En ejecución':'#16A34A', 'En curso · prórroga':'#0EA5E9', 'Suspendido':'#DC2626',
 'En modificación':'#F97316', 'Próximo a vencer':'#EAB308', 'Pendiente recepción':'#5B21B6',
}
const RIESGO_C: Record<RiesgoContrato, string> = {
 'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}

export default function ContratosVigentesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useContratosVigentes()
  const contratos = data?.contratos ?? []

  const [tab, setTab] = useState<'cartera' | 'vencimientos' | 'modificaciones' | 'incidencias' | 'organismos'>('cartera')
  const [filterEstado, setFilterEstado] = useState<EstadoContrato | 'Todos'>('Todos')
  const [filterRiesgo, setFilterRiesgo] = useState<RiesgoContrato | 'Todos'>('Todos')
  const [filterSector, setFilterSector] = useState<SectorContratacion | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const original  = contratos.reduce((s, c) => s + c.importeOriginal, 0)
    const actual    = contratos.reduce((s, c) => s + c.importeActual, 0)
    const ejecutado = contratos.reduce((s, c) => s + c.importeEjecutado, 0)
    const totalMod  = contratos.reduce((s, c) => s + c.modificaciones.length, 0)
    const importeMod = actual - original
    const totalInc  = contratos.reduce((s, c) => s + c.incidencias.length, 0)
    const incAbiertas = contratos.reduce((s, c) => s + c.incidencias.filter(i => i.estado !== 'Resuelta').length, 0)
    const totalPenal  = contratos.reduce((s, c) => s + c.incidencias.filter(i => i.tipo === 'Penalización').reduce((sum, i) => sum + (i.importe || 0), 0), 0)
    const criticos = contratos.filter(c => c.riesgo === 'CRÍTICO').length
    const venc90   = contratos.filter(c => c.diasParaFin >= 0 && c.diasParaFin <= 90).length
    return { total: contratos.length, original, actual, ejecutado, totalMod, importeMod, totalInc, incAbiertas, totalPenal, criticos, venc90 }
  }, [contratos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contratos
      .filter(c => filterEstado === 'Todos' || c.estado === filterEstado)
      .filter(c => filterRiesgo === 'Todos' || c.riesgo === filterRiesgo)
      .filter(c => filterSector === 'Todos' || c.sector === filterSector)
      .filter(c => !q || c.titulo.toLowerCase().includes(q) || c.organismo.toLowerCase().includes(q) || c.adjudicatario.toLowerCase().includes(q) || c.exp.toLowerCase().includes(q))
      .sort((a,b) => {
        const order: Record<RiesgoContrato, number> = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 }
        return order[a.riesgo] - order[b.riesgo]
      })
  }, [contratos, filterEstado, filterRiesgo, filterSector, query])

  const vencimientosTop = useMemo(() =>
    contratos
      .filter(c => c.diasParaFin >= 0 && c.diasParaFin <= 365)
      .sort((a,b) => a.diasParaFin - b.diasParaFin)
      .slice(0, 8),
  [contratos])

  const porOrganismo = useMemo(() => {
    const map = new Map<string, { num: number; importe: number; ejecutado: number; criticos: number }>()
    for (const c of contratos) {
      const cur = map.get(c.organismo) || { num:0, importe:0, ejecutado:0, criticos:0 }
      cur.num += 1; cur.importe += c.importeActual; cur.ejecutado += c.importeEjecutado
      if (c.riesgo === 'CRÍTICO' || c.riesgo === 'ALTO') cur.criticos += 1
      map.set(c.organismo, cur)
    }
    return Array.from(map.entries()).map(([org, v]) => ({ org, ...v })).sort((a,b) => b.importe - a.importe)
  }, [contratos])

  if (loading) return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px', textAlign:'center', paddingTop:80 }}>
 <div style={{ fontSize:13, color:'#6e6e73' }}>Cargando contratos…</div>
 </main>
 </div>
  )

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#0F766E 0%,#0E2A1F 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · MONITOR DE CONTRATOS VIGENTES
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.total} contratos vigentes · {(totals.actual / 1_000_000_000).toFixed(2)} mil M€ <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en ejecución</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.actual ? Math.round((totals.ejecutado / totals.actual) * 100) : 0}% de ejecución agregada · {totals.totalMod} modificaciones por valor de {(totals.importeMod / 1_000_000).toFixed(0)} M€ ({totals.original ? Math.round((totals.importeMod/totals.original)*100) : 0}% sobre el importe original) · {totals.incAbiertas} incidencias abiertas · {totals.venc90} contratos vencen en próximos 90 días.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
 <HeroKPI label="Vigentes" value={String(totals.total)}      accent="#86EFAC"/>
 <HeroKPI label="Críticos" value={String(totals.criticos)}   accent="#FCA5A5"/>
 <HeroKPI label="Cierre 90d" value={String(totals.venc90)}     accent="#FCD34D"/>
 <HeroKPI label="Modific." value={String(totals.totalMod)}   accent="#A5B4FC"/>
 </div>
 </section>

        {/* ═══ PLACSP · contratos formalizados (en vigor) ═══ */}
 <ContratosLiveFeed
          tipo="both"
          estado="FORM"
          minImporte={500_000}
          limit={10}
          titulo="CONTRATOS FORMALIZADOS · CARTERA EN VIGOR (>500k€)"
        />

        {/* ───── Snapshot · KPIs financieros ───── */}
 <section style={{ marginBottom:18 }}>
 <SectionHeader label="Snapshot financiero de la cartera" count={`Datos consolidados · mayo 2026`} accent="#0F766E"/>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
 <SKpi label="Importe original total" value={`${(totals.original / 1_000_000_000).toFixed(2)}`} sub="mil M€" color="#1F4E8C"/>
 <SKpi label="Importe vigente actual" value={`${(totals.actual / 1_000_000_000).toFixed(2)}`}   sub="mil M€" delta={`+${totals.original ? ((totals.importeMod / totals.original) * 100).toFixed(1) : '0'}% vs original`} color="#0F766E"/>
 <SKpi label="Ejecutado a fecha" value={`${(totals.ejecutado / 1_000_000_000).toFixed(2)}`} sub="mil M€" delta={`${totals.actual ? Math.round((totals.ejecutado / totals.actual) * 100) : 0}% del actual`} pos color="#16A34A"/>
 <SKpi label="Penalizaciones aplicadas" value={`${(totals.totalPenal / 1000).toFixed(0)}K€`} sub="acum. 12 meses" color="#DC2626"/>
 <SKpi label="Modific. acumuladas" value={`${(totals.importeMod / 1_000_000).toFixed(0)}M€`}   sub="sobre original" color="#F97316"/>
 <SKpi label="Incidencias abiertas" value={String(totals.incAbiertas)} sub={`${totals.totalInc} totales`} color="#EAB308"/>
 <SKpi label="Adjudicatarios distintos" value={String(new Set(contratos.map(c => c.adjudicatario)).size)} sub="diversificación" color="#5B21B6"/>
 <SKpi label="Organismos" value={String(porOrganismo.length)} sub="contratantes" color="#0EA5E9"/>
 </div>
 </section>

        {/* ───── Tabs ───── */}
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'cartera',         label:'Cartera de contratos',       count: contratos.length },
            { k:'vencimientos',    label:'Vencimientos próximos',      count: vencimientosTop.length },
            { k:'modificaciones', label:'Modificaciones y prórrogas',  count: totals.totalMod },
            { k:'incidencias',     label:'Incidencias y litigios',      count: totals.totalInc },
            { k:'organismos',      label:'Por organismo',              count: porOrganismo.length },
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
                {t.label} <span style={{ marginLeft:5, color: active ? '#0F766E' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
 </button>
            )
          })}
 </div>

        {/* ───── TAB · Cartera ───── */}
        {tab === 'cartera' && (
 <>
 <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
 <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, adjudicatario o expediente…"
                style={{ flex:'1 1 260px', maxWidth:340, padding:'9px 14px', borderRadius:10, border:'1px solid #ECECEF', background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f' }}/>
 <Selector label="Estado" value={filterEstado} options={['Todos','En ejecución','En curso · prórroga','Suspendido','En modificación','Próximo a vencer','Pendiente recepción']} onChange={v => setFilterEstado(v as EstadoContrato | 'Todos')}/>
 <Selector label="Riesgo" value={filterRiesgo} options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterRiesgo(v as RiesgoContrato | 'Todos')}/>
 <Selector label="Sector" value={filterSector} options={['Todos','Sanidad','Defensa','Infraestructuras','TIC','Energía','Educación','Servicios sociales','Otros']} onChange={v => setFilterSector(v as SectorContratacion | 'Todos')}/>
 <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} contratos · ordenados por riesgo</span>
 </div>

 <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(c => {
                const pctEj  = (c.importeEjecutado / c.importeActual) * 100
                const pctMod = ((c.importeActual - c.importeOriginal) / c.importeOriginal) * 100
                const cierreColor = c.diasParaFin < 0 ? '#525258' : c.diasParaFin <= 30 ? '#DC2626' : c.diasParaFin <= 90 ? '#F97316' : c.diasParaFin <= 365 ? '#EAB308' : '#16A34A'
                return (
 <article key={c.id} style={{
                    background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                    borderLeft:`4px solid ${RIESGO_C[c.riesgo]}`,
                  }}>
 <header style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:10, borderBottom:'1px solid #F5F5F7' }}>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:RIESGO_C[c.riesgo], color:'#fff' }}>RIESGO {c.riesgo}</span>
 <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${SECTOR_COLOR[c.sector]}15`, color:SECTOR_COLOR[c.sector], border:`1px solid ${SECTOR_COLOR[c.sector]}40` }}>{c.sector.toUpperCase()}</span>
 <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_COLOR[c.estado]}15`, color:ESTADO_COLOR[c.estado], border:`1px solid ${ESTADO_COLOR[c.estado]}40` }}>{c.estado.toUpperCase()}</span>
 <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· EXP. {c.exp}</span>
 </div>
 <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</h3>
 <div style={{ fontSize:11.5, color:'#3a3a3d' }}>{c.organismo} · <span style={{ color:'#6e6e73' }}>adj. {c.adjudicatario}</span></div>
 </div>
 <div style={{ textAlign:'right', flexShrink:0, minWidth:160 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0F766E', letterSpacing:'-0.018em', lineHeight:1 }}>
                          {(c.importeActual / 1_000_000).toFixed(1)}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span>
 </div>
 <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>orig. {(c.importeOriginal / 1_000_000).toFixed(1)}M€</div>
 <div style={{ fontSize:10.5, fontWeight:700, color: pctMod > 10 ? '#DC2626' : pctMod > 0 ? '#F97316' : '#16A34A', marginTop:3 }}>
                          {pctMod > 0 ? '▲' : '→'} {pctMod.toFixed(1)}% modificado
 </div>
 </div>
 </header>
 <div style={{ padding:'14px 16px' }}>
 <div style={{ marginBottom:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:10.5 }}>
 <span style={{ fontWeight:700, color:'#3a3a3d', letterSpacing:'0.06em', textTransform:'uppercase', fontSize:9 }}>Ejecución actual</span>
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#0F766E', fontSize:11.5 }}>
                            {(c.importeEjecutado / 1_000_000).toFixed(1)}M€ · {pctEj.toFixed(1)}%
 </span>
 </div>
 <div style={{ height:10, background:'#F5F5F7', borderRadius:5, overflow:'hidden', position:'relative' }}>
 <div style={{ width:`${Math.min(100, pctEj)}%`, height:'100%', background:'#0F766E', borderRadius:5 }}/>
 </div>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
 <Mini label="Inicio" value={c.fechaInicio}                              color="#3a3a3d"/>
 <Mini label="Fin previsto" value={c.fechaFinPrev}                              color={cierreColor}/>
 <Mini label="Días para fin" value={c.diasParaFin < 0 ? `+${Math.abs(c.diasParaFin)}d vencido` : `${c.diasParaFin}d`} color={cierreColor}/>
 <Mini label="Prórrogas" value={`${c.prorrogasUsadas}/${c.prorrogasMax}`}    color="#5B21B6"/>
 </div>
 <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9 }}>
 <div>
 <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Próximo hito</div>
 <div style={{ fontSize:12, color:'#1d1d1f', fontWeight:600 }}>
                            {c.proxHito.descripcion}
 <span style={{ marginLeft:8, fontSize:9.5, fontWeight:800, color: c.proxHito.estado === 'Retrasado' ? '#DC2626' : c.proxHito.estado === 'Completado' ? '#16A34A' : '#F97316', letterSpacing:'0.08em' }}>· {c.proxHito.estado.toUpperCase()}</span>
 </div>
 <div style={{ fontSize:10.5, color:'#86868b', marginTop:2 }}>fecha: {c.proxHito.fecha}</div>
 </div>
 <div>
 <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Responsable</div>
 <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600 }}>{c.responsable}</div>
 </div>
 </div>
                      {(c.modificaciones.length > 0 || c.incidencias.length > 0) && (
 <div style={{ marginTop:10, display:'flex', gap:10, flexWrap:'wrap' }}>
                          {c.modificaciones.length > 0 && (
 <span style={{ fontSize:10.5, padding:'4px 10px', borderRadius:999, background:'#FFF7ED', border:'1px solid #FED7AA', color:'#9A3412', fontWeight:600 }}>
                              {c.modificaciones.length} modificación(es) · +{((c.importeActual - c.importeOriginal) / 1_000_000).toFixed(1)}M€
 </span>
                          )}
                          {c.incidencias.filter(i => i.estado !== 'Resuelta').length > 0 && (
 <span style={{ fontSize:10.5, padding:'4px 10px', borderRadius:999, background:'#FEF2F2', border:'1px solid #FECACA', color:'#7F1D1D', fontWeight:600 }}>
                              {c.incidencias.filter(i => i.estado !== 'Resuelta').length} incidencia(s) abiertas
 </span>
                          )}
                          {c.prorrogasUsadas > 0 && (
 <span style={{ fontSize:10.5, padding:'4px 10px', borderRadius:999, background:'#EFF6FF', border:'1px solid #BFDBFE', color:'#1E3A8A', fontWeight:600 }}>
                              {c.prorrogasUsadas} prórroga(s) usadas
 </span>
                          )}
 </div>
                      )}
 </div>
 </article>
                )
              })}
 </div>
 </>
        )}

        {/* ───── TAB · Vencimientos ───── */}
        {tab === 'vencimientos' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Calendario de vencimientos · próximos 12 meses</h3>
 <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Contratos con fin de ejecución previsto · ordenados por urgencia</p>
 <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {vencimientosTop.map(c => {
                const cc = c.diasParaFin <= 30 ? '#DC2626' : c.diasParaFin <= 90 ? '#F97316' : c.diasParaFin <= 180 ? '#EAB308' : '#16A34A'
                return (
 <div key={c.id} style={{
                    display:'grid', gridTemplateColumns:'70px 1fr auto auto', gap:14, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                    borderLeft:`3px solid ${cc}`,
                  }}>
 <div style={{ textAlign:'center' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:cc, lineHeight:1 }}>{c.diasParaFin}</div>
 <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:2 }}>días</div>
 </div>
 <div>
 <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>{c.fechaFinPrev} · EXP. {c.exp}</div>
 <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginTop:1 }}>{c.titulo}</div>
 <div style={{ fontSize:10.5, color:'#86868b', marginTop:2 }}>{c.adjudicatario} · {c.prorrogasUsadas}/{c.prorrogasMax} prórrogas usadas</div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#0F766E' }}>{(c.importeActual / 1_000_000).toFixed(1)}M€</div>
 <div style={{ fontSize:10, color:'#86868b', marginTop:2 }}>{Math.round((c.importeEjecutado / c.importeActual) * 100)}% ejecutado</div>
 </div>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 9px', borderRadius:999, textAlign:'center',
                      background:`${cc}15`, color:cc, border:`1px solid ${cc}40`,
                    }}>{c.diasParaFin <= 30 ? 'CRÍTICO' : c.diasParaFin <= 90 ? 'PRÓXIMO' : 'PROGRAMADO'}</span>
 </div>
                )
              })}
 </div>
 </section>
        )}

        {/* ───── TAB · Modificaciones ───── */}
        {tab === 'modificaciones' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Modificaciones, prórrogas y adendas · histórico</h3>
 <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>{totals.totalMod} modificaciones registradas · sobrecoste agregado {(totals.importeMod / 1_000_000).toFixed(0)}M€ ({totals.original ? Math.round((totals.importeMod/totals.original)*100) : 0}% sobre original)</p>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Fecha','Tipo','Contrato','Adjudicatario','Importe','Motivo'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {contratos.flatMap(c => c.modificaciones.map(m => ({ c, m })))
                    .sort((a, b) => parseDate(b.m.fecha).getTime() - parseDate(a.m.fecha).getTime())
                    .map(({ c, m }, i) => {
                      const tColor = m.tipo === 'Modificado' ? '#F97316' : m.tipo === 'Prórroga' ? '#0EA5E9' : m.tipo === 'Adenda' ? '#7C3AED' : '#525258'
                      return (
 <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{m.fecha}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:4, background:tColor, color:'#fff' }}>{m.tipo.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f', maxWidth:280 }}>
 <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.titulo}</div>
 <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>EXP. {c.exp}</div>
 </td>
 <td style={{ padding:'9px 12px', color:'#3a3a3d', fontSize:11 }}>{c.adjudicatario}</td>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:tColor }}>+{(m.importe / 1_000_000).toFixed(1)}M€</td>
 <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d', maxWidth:340 }}>{m.motivo}</td>
 </tr>
                      )
                    })}
 </tbody>
 </table>
 </div>
 </section>
        )}

        {/* ───── TAB · Incidencias ───── */}
        {tab === 'incidencias' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Incidencias, penalizaciones y litigios</h3>
 <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>{totals.totalInc} incidencias registradas · {totals.incAbiertas} abiertas · {(totals.totalPenal / 1000).toFixed(0)}K€ en penalizaciones aplicadas</p>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Fecha','Tipo','Contrato','Adjudicatario','Descripción','Importe','Estado'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {contratos.flatMap(c => c.incidencias.map(i => ({ c, i })))
                    .sort((a, b) => parseDate(b.i.fecha).getTime() - parseDate(a.i.fecha).getTime())
                    .map(({ c, i }, idx) => {
                      const tColor = i.tipo === 'Litigio' ? '#DC2626' : i.tipo === 'Penalización' ? '#F97316' : i.tipo === 'Reclamación' ? '#EAB308' : i.tipo === 'Aviso' ? '#0EA5E9' : '#5B21B6'
                      const eColor = i.estado === 'Abierta' ? '#DC2626' : i.estado === 'En curso' ? '#F97316' : '#16A34A'
                      return (
 <tr key={idx} style={{ borderBottom:'1px solid #ECECEF', background: idx%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{i.fecha}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:4, background:tColor, color:'#fff' }}>{i.tipo.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f', maxWidth:240 }}>
 <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.titulo}</div>
 <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>EXP. {c.exp}</div>
 </td>
 <td style={{ padding:'9px 12px', color:'#3a3a3d', fontSize:11 }}>{c.adjudicatario}</td>
 <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d', maxWidth:300 }}>{i.descripcion}</td>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:tColor }}>{i.importe ? `${(i.importe / 1000).toFixed(0)}K€` : '—'}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:999, background:`${eColor}15`, color:eColor, border:`1px solid ${eColor}40` }}>{i.estado.toUpperCase()}</span>
 </td>
 </tr>
                      )
                    })}
 </tbody>
 </table>
 </div>
 </section>
        )}

        {/* ───── TAB · Por organismo ───── */}
        {tab === 'organismos' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Organismo','Contratos','Importe vigente','Ejecutado','% Ejec.','Críticos+Altos'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {porOrganismo.map((o, i) => {
                    const pctEj = (o.ejecutado / o.importe) * 100
                    return (
 <tr key={o.org} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
 <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{o.org}</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#5B21B6' }}>{o.num}</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#0F766E' }}>{(o.importe / 1_000_000).toFixed(1)}M€</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#16A34A' }}>{(o.ejecutado / 1_000_000).toFixed(1)}M€</td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
 <div style={{ width:`${Math.min(100, pctEj)}%`, height:'100%', background:'#0F766E' }}/>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#0F766E', minWidth:36, textAlign:'right' }}>{pctEj.toFixed(0)}%</span>
 </div>
 </td>
 <td style={{ padding:'10px 12px' }}>
                          {o.criticos > 0 ? (
 <span style={{
                              fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                              padding:'3px 9px', borderRadius:999,
                              background:'#DC262615', color:'#DC2626', border:'1px solid #DC262640',
                            }}>{o.criticos}</span>
                          ) : (
 <span style={{ fontSize:11, color:'#86868b' }}>—</span>
                          )}
 </td>
 </tr>
                    )
                  })}
 </tbody>
 </table>
 </div>
 </section>
        )}

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Monitor de Contratos Vigentes · Politeia Analítica · {new Date().getFullYear()}
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

function Mini({ label, value, color }: { label:string, value:string, color:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 10px' }}>
 <div style={{ fontSize:8.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1, marginTop:3 }}>{value}</div>
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

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
