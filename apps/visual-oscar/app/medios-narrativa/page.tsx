'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import NarrativeLifecycle from '@/components/NarrativeLifecycle'
import SourceHealthDetail from '@/components/SourceHealthDetail'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type TipoMedio = 'Prensa' | 'Digital' | 'TV' | 'Radio' | 'Agencias' | 'Revista'

type Medio = {
  id: string
  nombre: string
  grupo: string
  tipo: TipoMedio
  ejeX: number      // -100 izquierda · +100 derecha
  alcance: number   // millones de lectores/oyentes/espectadores únicos
  tono: number      // -1 .. +1 (sentimiento medio sobre el Gobierno)
  share: number     // % de cuota en su segmento
  color?: string
  ambito?: string
  ccaa?: string | null
  credibilidad?: number
}

// Shape de la respuesta de /api/medios
type MediosResponse = {
  medios: Array<{
    id: string; nombre: string; grupo: string; tipo: string; ambito: string
    ccaa: string | null; ideologia: number; audiencia_M: number; credibilidad: number
    rss: string | null; web: string; color?: string
  }>
  stats: {
    total: number; con_rss: number; audiencia_total_M: number;
    por_tipo: Record<string, number>; por_ambito: Record<string, number>
  }
}

// Datos iniciales · 27 mocks usados como fallback hasta que llegue la respuesta de la API
const INITIAL_MEDIOS: Medio[] = [
  // Prensa
  { id:'el-pais',     nombre:'El País',         grupo:'PRISA',         tipo:'Prensa',  ejeX:-25, alcance:1.6, tono:+0.08, share:18.4 },
  { id:'el-mundo',    nombre:'El Mundo',        grupo:'Unidad Edit.',  tipo:'Prensa',  ejeX: 32, alcance:1.1, tono:-0.18, share:12.6 },
  { id:'abc',         nombre:'ABC',             grupo:'Vocento',       tipo:'Prensa',  ejeX: 50, alcance:0.7, tono:-0.32, share: 8.2 },
  { id:'la-razon',    nombre:'La Razón',        grupo:'Planeta',       tipo:'Prensa',  ejeX: 55, alcance:0.5, tono:-0.36, share: 6.4 },
  { id:'la-vanguardia',nombre:'La Vanguardia',  grupo:'Godó',          tipo:'Prensa',  ejeX:  -8, alcance:0.6, tono:-0.04, share: 7.1 },
  { id:'publico',     nombre:'Público',         grupo:'Display',       tipo:'Prensa',  ejeX:-58, alcance:0.3, tono:+0.22, share: 3.4 },

  // Digital
  { id:'eldiario',    nombre:'eldiario.es',     grupo:'Independiente', tipo:'Digital', ejeX:-48, alcance:1.4, tono:+0.18, share:14.8 },
  { id:'okdiario',    nombre:'OK Diario',       grupo:'Independiente', tipo:'Digital', ejeX: 65, alcance:1.5, tono:-0.42, share:15.6 },
  { id:'el-espanol',  nombre:'El Español',      grupo:'Independiente', tipo:'Digital', ejeX: 35, alcance:1.2, tono:-0.20, share:12.7 },
  { id:'el-confidencial',nombre:'El Confidencial',grupo:'Titania',     tipo:'Digital', ejeX:  8, alcance:1.3, tono:-0.06, share:13.7 },
  { id:'voz-populi',  nombre:'Vozpópuli',       grupo:'Independiente', tipo:'Digital', ejeX: 48, alcance:0.6, tono:-0.28, share: 6.4 },
  { id:'infolibre',   nombre:'infoLibre',       grupo:'Independiente', tipo:'Digital', ejeX:-35, alcance:0.4, tono:+0.12, share: 4.5 },
  { id:'huffington',  nombre:'HuffPost',        grupo:'PRISA',         tipo:'Digital', ejeX:-25, alcance:0.5, tono:+0.10, share: 5.4 },

  // TV
  { id:'la1',         nombre:'La 1 (TVE)',      grupo:'RTVE',          tipo:'TV',      ejeX:-12, alcance:9.8, tono:+0.04, share:16.5 },
  { id:'antena3',     nombre:'Antena 3',        grupo:'Atresmedia',    tipo:'TV',      ejeX: 12, alcance:8.4, tono:-0.08, share:14.1 },
  { id:'telecinco',   nombre:'Telecinco',       grupo:'Mediaset',      tipo:'TV',      ejeX: 22, alcance:7.5, tono:-0.18, share:12.6 },
  { id:'la-sexta',    nombre:'La Sexta',        grupo:'Atresmedia',    tipo:'TV',      ejeX:-32, alcance:5.6, tono:+0.16, share: 9.4 },
  { id:'cuatro',      nombre:'Cuatro',          grupo:'Mediaset',      tipo:'TV',      ejeX:  5, alcance:3.2, tono:-0.06, share: 5.4 },
  { id:'tv3',         nombre:'TV3 (CCMA)',      grupo:'CCMA',          tipo:'TV',      ejeX:-18, alcance:1.8, tono:-0.02, share: 3.0 },
  { id:'13tv',        nombre:'13TV',            grupo:'COPE',          tipo:'TV',      ejeX: 62, alcance:1.2, tono:-0.40, share: 2.0 },

  // Radio
  { id:'cope',        nombre:'COPE',            grupo:'COPE',          tipo:'Radio',   ejeX: 42, alcance:3.2, tono:-0.34, share:24.5 },
  { id:'cadena-ser',  nombre:'Cadena SER',      grupo:'PRISA',         tipo:'Radio',   ejeX:-22, alcance:4.8, tono:+0.12, share:36.7 },
  { id:'onda-cero',   nombre:'Onda Cero',       grupo:'Atresmedia',    tipo:'Radio',   ejeX: 15, alcance:2.1, tono:-0.10, share:16.0 },
  { id:'rne',         nombre:'RNE',             grupo:'RTVE',          tipo:'Radio',   ejeX:-10, alcance:1.5, tono:+0.04, share:11.5 },
  { id:'esradio',     nombre:'esRadio',         grupo:'Libertad Digital',tipo:'Radio', ejeX: 70, alcance:0.6, tono:-0.46, share: 4.6 },

  // Agencias
  { id:'efe',         nombre:'Agencia EFE',     grupo:'Pública',       tipo:'Agencias',ejeX:-5,  alcance:0.0, tono:+0.02, share:55.0 },
  { id:'europa-press',nombre:'Europa Press',    grupo:'Privada',       tipo:'Agencias',ejeX: 8,  alcance:0.0, tono:-0.04, share:35.0 },
]

const TIPO_COLOR: Record<TipoMedio, string> = {
  'Prensa':   '#5B21B6',
  'Digital':  '#0F766E',
  'TV':       '#DC2626',
  'Radio':    '#F97316',
  'Agencias': '#6e6e73',
  'Revista':  '#0EA5E9',
}

// ─────────────────────────────────────────────────────────────────────────
// Narrativas dominantes
// ─────────────────────────────────────────────────────────────────────────
type Narrativa = {
  tema: string
  menciones: number     // miles
  variacion: number     // % vs semana anterior
  tono: number          // -1 .. +1
  topMedios: string[]
  topPartido: string
  tag: string
}

const NARRATIVAS: Narrativa[] = [
  { tema:'Prima de riesgo y Tesoro',          menciones:18.4, variacion:+42, tono:-0.38, topMedios:['ABC','OK Diario','La Razón'], topPartido:'PP',  tag:'MERCADOS' },
  { tema:'Ruptura Junts con la legislatura',  menciones:24.1, variacion:+185,tono:-0.18, topMedios:['El Mundo','El País','La Sexta'], topPartido:'Junts', tag:'GOBIERNO' },
  { tema:'Aranceles EE.UU. al aceite y vino', menciones:12.6, variacion:+78, tono:-0.22, topMedios:['El Confidencial','El País','Antena 3'], topPartido:'Gobierno', tag:'EXTERIOR' },
  { tema:'Reforma del CGPJ',                  menciones: 9.8, variacion:+18, tono:-0.10, topMedios:['ABC','El Mundo','La Razón'], topPartido:'PP',  tag:'JUSTICIA' },
  { tema:'Ley de Vivienda · zonas tensionadas',menciones:8.2, variacion: -8, tono:+0.08, topMedios:['La Sexta','El País','eldiario.es'], topPartido:'Sumar', tag:'SOCIAL' },
  { tema:'#MociónCensura',                    menciones:11.2, variacion:+220,tono:-0.42, topMedios:['OK Diario','13TV','esRadio'], topPartido:'PP',   tag:'OPOSICIÓN' },
  { tema:'Decreto agroalimentario',           menciones: 6.4, variacion:+34, tono:+0.12, topMedios:['EFE','La 1','Cadena SER'], topPartido:'Gobierno', tag:'AGRARIA' },
  { tema:'Negociación PNV · transferencia ferroviaria', menciones:5.1, variacion:+12, tono:-0.04, topMedios:['El País','Onda Cero'], topPartido:'PNV', tag:'TERRITORIAL' },
]

const TIPOS_FIL = ['Todos','Prensa','Digital','TV','Radio','Agencias','Revista'] as const

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function MediosNarrativaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Catálogo dinámico desde /api/medios (219 medios reales) · auto-refresh 5min
  const { data, source, updatedAt, refresh } = useApi<MediosResponse>(
    '/api/medios',
    { refreshInterval: 300_000 }
  )

  // Adaptador: shape catálogo (ideologia/audiencia_M) → shape de la página (ejeX/alcance/tono)
  const MEDIOS: Medio[] = useMemo(() => {
    if (!data?.medios?.length) return INITIAL_MEDIOS
    // Cuota dentro de su tipo · suma de audiencia del tipo = 100%
    const sumaPorTipo: Record<string, number> = {}
    for (const m of data.medios) sumaPorTipo[m.tipo] = (sumaPorTipo[m.tipo] || 0) + m.audiencia_M
    return data.medios.map(m => ({
      id: m.id,
      nombre: m.nombre,
      grupo: m.grupo,
      tipo: m.tipo as TipoMedio,
      ejeX: m.ideologia,
      alcance: m.audiencia_M,
      tono: 0, // TODO: derivar de sentiment del feed; placeholder neutro
      share: sumaPorTipo[m.tipo] > 0 ? +(100 * m.audiencia_M / sumaPorTipo[m.tipo]).toFixed(1) : 0,
      ambito: m.ambito,
      ccaa: m.ccaa,
      credibilidad: m.credibilidad,
    }))
  }, [data])

  const [filterTipo, setFilterTipo] = useState<typeof TIPOS_FIL[number]>('Todos')
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned]   = useState<string | null>(null)
  const focused = pinned ?? hovered
  const focusedM = focused ? MEDIOS.find(m => m.id === focused) : null

  const visibles = useMemo(
    () => filterTipo === 'Todos' ? MEDIOS : MEDIOS.filter(m => m.tipo === filterTipo),
    [filterTipo, MEDIOS]
  )

  const counts = useMemo(() => {
    const byTipo: Record<string, number> = {}
    for (const m of MEDIOS) byTipo[m.tipo] = (byTipo[m.tipo] || 0) + 1
    const tonoMedio = MEDIOS.length > 0 ? +(MEDIOS.reduce((s, m) => s + m.tono, 0) / MEDIOS.length).toFixed(2) : 0
    return { byTipo, tonoMedio, total: MEDIOS.length }
  }, [MEDIOS])

  // Posicionamiento del cuadrante
  const W = 1000, H = 380
  const xToPx = (x: number) => ((x + 100) / 200) * W
  const yToPx = (alcance: number) => H - 30 - (Math.min(alcance, 10) / 10) * (H - 60)

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background:'linear-gradient(135deg,#7C2D92 0%,#3B0764 100%)',
          borderRadius:22, padding:'30px 38px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, margin:'0 0 8px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span>NARRATIVA PÚBLICA · {counts.total} MEDIOS DE COMUNICACIÓN</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:30, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {counts.total} medios <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.75)' }}>cubriendo prensa, TV, radio y digital</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0 }}>
              Catálogo completo · 17 CCAA + nacional · {data?.stats.con_rss || 0} con RSS para ingestión en tiempo real · {data?.stats.audiencia_total_M ? data.stats.audiencia_total_M.toFixed(1) : '…'}M usuarios mensuales agregados
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
            <MiniK label="PRENSA"   n={counts.byTipo['Prensa']   || 0}/>
            <MiniK label="DIGITAL"  n={counts.byTipo['Digital']  || 0}/>
            <MiniK label="TV"       n={counts.byTipo['TV']       || 0}/>
            <MiniK label="RADIO"    n={counts.byTipo['Radio']    || 0}/>
            <MiniK label="AGENC."   n={counts.byTipo['Agencias'] || 0}/>
            <MiniK label="REVISTA"  n={counts.byTipo['Revista']  || 0}/>
          </div>
        </section>

        {/* Filtros */}
        <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Tipo:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {TIPOS_FIL.map(t => {
              const active = filterTipo === t
              const c = t !== 'Todos' ? TIPO_COLOR[t as TipoMedio] : '#1d1d1f'
              return (
                <button key={t} onClick={()=>setFilterTipo(t)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? c : '#6e6e73',
                  border:'none', borderRadius:999, padding:'5px 12px',
                  fontSize:11.5, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display:'inline-flex', alignItems:'center', gap:5,
                }}>
                  {t !== 'Todos' && <span style={{ width:7, height:7, borderRadius:'50%', background:TIPO_COLOR[t as TipoMedio] }}/>}
                  {t}
                </button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{visibles.length} medios visibles · burbuja = alcance</span>
        </div>

        {/* Cuadrante + panel detalle */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, marginBottom:14 }}>

          {/* Cuadrante */}
          <div style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:16,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
              {/* Fondo cuadrantes */}
              <rect x={0}   y={0} width={W/2} height={H} fill="#FAFAFB"/>
              <rect x={W/2} y={0} width={W/2} height={H} fill="#F5F5F7"/>
              {/* Eje vertical (centro político) */}
              <line x1={W/2} y1={20} x2={W/2} y2={H-20} stroke="#1d1d1f" strokeWidth="1" strokeDasharray="3 4" opacity="0.4"/>
              {/* Línea base alcance 0 */}
              <line x1={20}  y1={H-30} x2={W-20} y2={H-30} stroke="#1d1d1f" strokeWidth="1" opacity="0.15"/>
              {/* Etiquetas ejes */}
              <text x={28}   y={H-12} fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em">IZQUIERDA</text>
              <text x={W-28} y={H-12} fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em" textAnchor="end">DERECHA</text>
              <text x={W-28} y={28}   fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em" textAnchor="end">+ALCANCE</text>

              {/* Burbujas */}
              {visibles.map(m => {
                const isFocus = focused === m.id
                const dim = focused && focused !== m.id
                const r = 8 + Math.min(m.alcance, 10) * 2.5  // 8..33
                const c = TIPO_COLOR[m.tipo]
                return (
                  <g key={m.id} style={{ cursor:'pointer' }}
                     onMouseEnter={()=>setHovered(m.id)}
                     onMouseLeave={()=>setHovered(null)}
                     onClick={()=>setPinned(pinned === m.id ? null : m.id)}>
                    <circle cx={xToPx(m.ejeX)} cy={yToPx(m.alcance)} r={r}
                            fill={c} opacity={dim ? 0.18 : 0.82}
                            stroke={isFocus ? '#1d1d1f' : 'rgba(255,255,255,0.5)'}
                            strokeWidth={isFocus ? 2 : 1.5}
                            style={{ transition:'opacity 200ms' }}/>
                    {(r >= 16 || isFocus) && (
                      <text x={xToPx(m.ejeX)} y={yToPx(m.alcance) - r - 4} textAnchor="middle"
                            fontSize="10.5" fontWeight="700" fill="#1d1d1f"
                            opacity={dim ? 0.5 : 1} style={{ pointerEvents:'none' }}>
                        {m.nombre}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            {/* Leyenda tipos */}
            <div style={{ display:'flex', gap:14, marginTop:8, paddingTop:8, borderTop:'1px solid #ECECEF', flexWrap:'wrap' }}>
              {(Object.keys(TIPO_COLOR) as TipoMedio[]).map(t => (
                <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'#3a3a3d' }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:TIPO_COLOR[t] }}/>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Panel detalle */}
          <aside style={{
            background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 18px 14px',
            position:'sticky', top:60,
          }}>
            {focusedM ? (
              <>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9.5, color:TIPO_COLOR[focusedM.tipo], fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{focusedM.tipo}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f', lineHeight:1.15 }}>{focusedM.nombre}</div>
                  <div style={{ fontSize:11.5, color:'#6e6e73', marginTop:2 }}>Grupo: <strong style={{color:'#1d1d1f'}}>{focusedM.grupo}</strong></div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <Box label="Alcance" value={`${focusedM.alcance.toFixed(1)} M`} color={TIPO_COLOR[focusedM.tipo]}/>
                  <Box label="Cuota tipo" value={`${focusedM.share.toFixed(1)}%`} color={TIPO_COLOR[focusedM.tipo]}/>
                </div>

                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Sesgo ideológico</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: focusedM.ejeX < 0 ? '#E1322D' : focusedM.ejeX > 0 ? '#1F4E8C' : '#6e6e73' }}>
                      {focusedM.ejeX > 0 ? '+' : ''}{focusedM.ejeX}
                    </span>
                  </div>
                  <div style={{ position:'relative', height:6, background:'#fff', borderRadius:3, border:'1px solid #ECECEF' }}>
                    <div style={{ position:'absolute', left:'50%', top:-2, bottom:-2, width:1, background:'#1d1d1f', opacity:0.4 }}/>
                    <div style={{
                      position:'absolute', top:0, bottom:0,
                      left: focusedM.ejeX < 0 ? `${50 + (focusedM.ejeX/2)}%` : '50%',
                      width: `${Math.abs(focusedM.ejeX)/2}%`,
                      background: focusedM.ejeX < 0 ? '#E1322D' : '#1F4E8C',
                      borderRadius:3,
                    }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#86868b', marginTop:3 }}>
                    <span>−100 izq</span><span>0</span><span>+100 dcha</span>
                  </div>
                </div>

                <div style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Tono sobre Gobierno</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: focusedM.tono >= 0 ? '#16A34A' : '#DC2626' }}>
                      {focusedM.tono > 0 ? '+' : ''}{focusedM.tono.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ position:'relative', height:6, background:'#fff', borderRadius:3, border:'1px solid #ECECEF' }}>
                    <div style={{ position:'absolute', left:'50%', top:-2, bottom:-2, width:1, background:'#1d1d1f', opacity:0.4 }}/>
                    <div style={{
                      position:'absolute', top:0, bottom:0,
                      left: focusedM.tono < 0 ? `${50 + (focusedM.tono * 50)}%` : '50%',
                      width: `${Math.abs(focusedM.tono) * 50}%`,
                      background: focusedM.tono >= 0 ? '#16A34A' : '#DC2626',
                      borderRadius:3,
                    }}/>
                  </div>
                </div>

                <div style={{ marginTop:12, fontSize:11, color:'#86868b', textAlign:'right' }}>
                  {pinned ? 'Fijado · pulsa otra vez para soltar' : 'Pulsa para fijar'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Mapa de medios</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f', marginBottom:10 }}>Pasa el cursor</div>
                <p style={{ fontSize:12.5, color:'#3a3a3d', lineHeight:1.5, margin:'0 0 12px' }}>
                  Cada burbuja representa un medio. Eje horizontal: sesgo ideológico estimado. Eje vertical: alcance.
                </p>
                <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Tono medio agregado</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color: counts.tonoMedio >= 0 ? '#16A34A' : '#DC2626' }}>
                    {counts.tonoMedio > 0 ? '+' : ''}{counts.tonoMedio}
                  </div>
                  <div style={{ fontSize:11, color:'#6e6e73', marginTop:2 }}>sobre el Gobierno · 27 medios</div>
                </div>
              </>
            )}
          </aside>
        </section>

        {/* Narrativas dominantes */}
        <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Narrativas dominantes esta semana</h2>
            <span style={{ fontSize:11, color:'#6e6e73' }}>{NARRATIVAS.length} temas trackeados · análisis NLP automático</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...NARRATIVAS].sort((a,b)=>b.menciones-a.menciones).map(n => {
              const tonoColor = n.tono >= 0 ? '#16A34A' : '#DC2626'
              return (
                <div key={n.tema} style={{
                  display:'grid', gridTemplateColumns:'80px 1fr 110px 100px 1fr', gap:14, alignItems:'center',
                  padding:'10px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
                  <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                    padding:'3px 7px', borderRadius:6, textAlign:'center',
                    background:'#1d1d1f', color:'#fff',
                  }}>{n.tag}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{n.tema}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:3 }}>
                      Top medios: <strong style={{ color:'#3a3a3d' }}>{n.topMedios.slice(0,3).join(' · ')}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{n.menciones.toFixed(1)}<span style={{ fontSize:11, color:'#6e6e73' }}> K</span></div>
                    <div style={{ fontSize:10, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700, marginTop:2 }}>menciones</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color: n.variacion > 0 ? '#16A34A' : '#DC2626' }}>
                      {n.variacion > 0 ? '▲' : '▼'} {Math.abs(n.variacion)}%
                    </div>
                    <div style={{ fontSize:10, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700, marginTop:2 }}>vs sem ant.</div>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Tono</span>
                      <span style={{ fontSize:11, fontWeight:700, color:tonoColor }}>{n.tono > 0 ? '+' : ''}{n.tono.toFixed(2)}</span>
                    </div>
                    <div style={{ position:'relative', height:5, background:'#fff', borderRadius:3, border:'1px solid #ECECEF' }}>
                      <div style={{ position:'absolute', left:'50%', top:-1, bottom:-1, width:1, background:'#1d1d1f', opacity:0.4 }}/>
                      <div style={{
                        position:'absolute', top:0, bottom:0,
                        left: n.tono < 0 ? `${50 + (n.tono*50)}%` : '50%',
                        width: `${Math.abs(n.tono)*50}%`,
                        background:tonoColor, borderRadius:3,
                      }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Tabla rápida de medios */}
        <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin:'0 0 14px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Listado completo · {visibles.length} medios</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:8 }}>
            {[...visibles].sort((a,b)=>b.alcance-a.alcance).map(m => (
              <div key={m.id}
                   onMouseEnter={()=>setHovered(m.id)} onMouseLeave={()=>setHovered(null)}
                   onClick={()=>setPinned(pinned === m.id ? null : m.id)}
                   style={{
                     display:'grid', gridTemplateColumns:'14px 1fr auto', gap:10, alignItems:'center',
                     padding:'9px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                     cursor:'pointer',
                   }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:TIPO_COLOR[m.tipo] }}/>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.nombre}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{m.tipo} · {m.grupo}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{m.alcance.toFixed(1)}M</div>
                  <div style={{ fontSize:10, color: m.tono >= 0 ? '#16A34A' : '#DC2626', fontWeight:700, marginTop:2 }}>tono {m.tono > 0 ? '+' : ''}{m.tono.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Source Health detalle */}
        <div style={{ marginTop: 18 }}><SourceHealthDetail/></div>

        {/* Narrativas activas con ciclo de vida 3-step */}
        <NarrativeLifecycle/>
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Narrativa Pública · Medios y Narrativa · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// Helpers
function MiniK({ label, n }: { label:string, n:number }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, lineHeight:1, color:'#fff' }}>{n}</div>
      <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:3 }}>{label}</div>
    </div>
  )
}
function Box({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 10px' }}>
      <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color, marginTop:1 }}>{value}</div>
    </div>
  )
}
