'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Indice = {
  abbr: string
  name: string
  value: number          // 0-100
  delta: number          // pp vs mes anterior
  c: string              // color principal
  desc: string
  // Lectura cualitativa: cuanto más alto, ¿mejor o peor?
  goodHigh: boolean      // true: alto = positivo (gobernabilidad, confianza); false: alto = negativo (polarización, volatilidad)
  // Componentes con peso
  components: { label: string; value: number; weight?: number }[]
  // Serie de los últimos 12 meses
  serie: number[]
}

const INDICES: Indice[] = [
  {
    abbr:'IPol', name:'Polarización', value:72.4, delta:+1.8, c:'#DC2626', goodHigh:false,
    desc:'Distancia ideológica media entre partidos ponderada por escaños. Mide la polarización afectiva y programática del sistema.',
    components: [
      { label:'Distancia PP–VOX',     value:28 },
      { label:'Distancia PSOE–Sumar', value:22 },
      { label:'Distancia bloque D–I', value:68 },
      { label:'Fragmentación',        value:61 },
    ],
    serie:[64.2,65.1,66.0,67.4,68.2,68.9,69.5,70.1,70.6,71.2,71.8,72.4],
  },
  {
    abbr:'IVol', name:'Volatilidad', value:18.3, delta:-0.4, c:'#F97316', goodHigh:false,
    desc:'Pedersen index — transferencia neta de votos entre comicios consecutivos. Indica la inestabilidad del sistema.',
    components: [
      { label:'Volatilidad PP',    value:12 },
      { label:'Volatilidad PSOE',  value: 9 },
      { label:'Volatilidad VOX',   value:31 },
      { label:'Volatilidad Sumar', value:24 },
    ],
    serie:[20.1,19.8,19.4,19.1,18.9,18.7,18.6,18.5,18.4,18.4,18.3,18.3],
  },
  {
    abbr:'IGob', name:'Gobernabilidad', value:44.1, delta:-3.2, c:'#1F4E8C', goodHigh:true,
    desc:'Probabilidad compuesta de gobierno estable durante 365 días. Combina viabilidad de mayoría, presupuestos y cohesión.',
    components: [
      { label:'Viabilidad mayoría',     value:38 },
      { label:'Acuerdo presupuestario', value:31 },
      { label:'Cohesión coalición',     value:54 },
      { label:'Apoyo externo',          value:49 },
    ],
    serie:[58.2,56.8,55.4,53.1,51.8,50.2,49.0,48.1,47.0,46.2,45.0,44.1],
  },
  {
    abbr:'IMed', name:'Impacto mediático', value:61.7, delta:+2.1, c:'#7C3AED', goodHigh:true,
    desc:'Presencia y sentimiento agregado del Gobierno y oposición en medios y redes sociales.',
    components: [
      { label:'Cobertura TV',      value:74 },
      { label:'Prensa escrita',    value:58 },
      { label:'Redes sociales',    value:63 },
      { label:'Sentimiento neto',  value:51 },
    ],
    serie:[55.4,55.9,56.6,57.2,57.8,58.4,59.0,59.6,60.2,60.8,61.3,61.7],
  },
  {
    abbr:'ICI', name:'Confianza institucional', value:31.2, delta:-1.4, c:'#16A34A', goodHigh:true,
    desc:'Confianza ciudadana en instituciones políticas (CIS + panel propio Politeia).',
    components: [
      { label:'Congreso',  value:22 },
      { label:'Gobierno',  value:28 },
      { label:'Partidos',  value:14 },
      { label:'Justicia',  value:38 },
    ],
    serie:[35.8,35.2,34.6,34.0,33.5,33.0,32.7,32.4,32.0,31.8,31.5,31.2],
  },
  {
    abbr:'IEC', name:'Índice Electoral Compuesto', value:53.8, delta:+0.6, c:'#0F766E', goodHigh:true,
    desc:'Índice sintético Politeia — media ponderada de los cinco anteriores. Mide la salud agregada del sistema.',
    components: [
      { label:'Peso gobernabilidad', value:30, weight:30 },
      { label:'Peso confianza',      value:30, weight:30 },
      { label:'Peso polarización',   value:20, weight:20 },
      { label:'Peso volatilidad',    value:20, weight:20 },
    ],
    serie:[51.0,51.4,51.9,52.3,52.6,52.9,53.1,53.3,53.5,53.6,53.7,53.8],
  },
]

const HIST = [
  { p:'2011',     etiqueta:'PP mayoría abs.',   IPol:58, IVol:14, IGob:88, ICI:41 },
  { p:'2015',     etiqueta:'Fragmentación',     IPol:64, IVol:22, IGob:32, ICI:29 },
  { p:'2016',     etiqueta:'Repetición',        IPol:66, IVol:11, IGob:38, ICI:27 },
  { p:'2019-A',   etiqueta:'PSOE+Cs (fallida)', IPol:68, IVol:19, IGob:29, ICI:26 },
  { p:'2019-N',   etiqueta:'PSOE+Unidas',       IPol:70, IVol: 8, IGob:52, ICI:25 },
  { p:'2023',     etiqueta:'PP sin mayoría',    IPol:71, IVol:15, IGob:46, ICI:28 },
  { p:'2026',     etiqueta:'Actual',            IPol:72, IVol:18, IGob:44, ICI:31 },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers visuales
// ─────────────────────────────────────────────────────────────────────────

// Gauge semi-circular (arco superior 180°)
function Gauge({ value, color, size=140 }: { value:number, color:string, size?:number }) {
  const w = size
  const h = Math.round(size * 0.78)         // altura suficiente para el número y la base
  const r = size * 0.38                      // radio del arco
  const cx = w / 2
  const cy = h - 18                          // base del semicírculo (deja sitio abajo)
  const t = Math.max(0, Math.min(100, value)) / 100

  // Punto inicial (izquierda) y final (en función de t).
  // En SVG Y crece hacia abajo, así el arco superior tiene Y menores que cy.
  // Para que el ángulo barra de izquierda (180º) → arriba (90º) → derecha (0º) por ENCIMA:
  //   xEnd = cx − r · cos(t · π)        (cos(0)=1 → cx−r al inicio · cos(π)=−1 → cx+r al final)
  //   yEnd = cy − r · sin(t · π)        (sin(0)=0 · sin(π/2)=1 → arriba)
  const xStart = cx - r
  const yStart = cy
  const xEnd   = cx - r * Math.cos(t * Math.PI)
  const yEnd   = cy - r * Math.sin(t * Math.PI)

  // Aguja (al ángulo t·π)
  const needleX = cx - r * 0.92 * Math.cos(t * Math.PI)
  const needleY = cy - r * 0.92 * Math.sin(t * Math.PI)

  return (
 <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Fondo (arco superior completo) */}
 <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="#ECECEF" strokeWidth="10" strokeLinecap="round"/>
      {/* Valor */}
      {t > 0 && (
 <path d={`M ${xStart} ${yStart} A ${r} ${r} 0 0 1 ${xEnd} ${yEnd}`}
              fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
      )}
      {/* Aguja */}
 <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1d1d1f" strokeWidth="1.6" strokeLinecap="round"/>
 <circle cx={cx} cy={cy} r="4" fill="#1d1d1f"/>
      {/* Marcas extremos */}
 <text x={cx - r} y={cy + 14} textAnchor="middle" fontSize={size * 0.075} fill="#86868b" fontWeight="600">0</text>
 <text x={cx + r} y={cy + 14} textAnchor="middle" fontSize={size * 0.075} fill="#86868b" fontWeight="600">100</text>
      {/* Valor numérico (sobre el arco, no sobre la aguja) */}
 <text x={cx} y={cy - r - 6} textAnchor="middle"
            fontFamily="var(--font-display)" fontSize={size * 0.26} fontWeight="700" fill={color}>
        {value.toFixed(1)}
 </text>
 </svg>
  )
}

// Mini-sparkline
function Sparkline({ data, color, w=120, h=28 }: { data:number[], color:string, w?:number, h?:number }) {
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - ((v-min)/rng)*(h-4) - 2}`).join(' ')
  return (
 <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block' }}>
 <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx={w} cy={h - ((data[data.length-1]-min)/rng)*(h-4) - 2} r="2.5" fill={color}/>
 </svg>
  )
}

// Lectura cualitativa
function leerValor(idx: Indice): { etiqueta: string, color: string } {
  const v = idx.value
  if (idx.goodHigh) {
    if (v >= 65) return { etiqueta:'ALTO', color:'#16A34A' }
    if (v >= 40) return { etiqueta:'MEDIO', color:'#F97316' }
    return { etiqueta:'BAJO', color:'#DC2626' }
  } else {
    if (v >= 65) return { etiqueta:'ELEVADO', color:'#DC2626' }
    if (v >= 40) return { etiqueta:'MEDIO', color:'#F97316' }
    return { etiqueta:'BAJO', color:'#16A34A' }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function IndicesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [openIdx, setOpenIdx] = useState<string | null>(null)

  const iec = INDICES.find(i => i.abbr === 'IEC')!
  const lect = leerValor(iec)

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#059669 0%,#022C22 100%)',
          borderRadius:22, padding:'34px 40px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, margin:'0 0 8px' }}>
              ÍNDICES ELECTORALES · MÉTRICAS COMPUESTAS
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:32, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              IEC: {iec.value}/100 · <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.75)' }}>salud agregada {lect.etiqueta.toLowerCase()}</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0 }}>
              6 índices · IPol · IVol · IGob · IMed · ICI · IEC — actualización mensual sobre 6 dimensiones del sistema político
 </p>
 </div>
 <div style={{ borderLeft:'1px solid rgba(255,255,255,0.18)', paddingLeft:32 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:60, fontWeight:700, letterSpacing:'-0.04em', lineHeight:0.95 }}>
              {iec.value}<span style={{ fontSize:28, opacity:0.6 }}>/100</span>
 </div>
 <div style={{ fontSize:12, marginTop:6, color:'rgba(255,255,255,0.7)' }}>
              Índice Electoral Compuesto · {iec.delta > 0 ? '▲' : '▼'} {Math.abs(iec.delta)} pp vs mes anterior
 </div>
 </div>
 </section>

        {/* ───── Grid de los 6 índices ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))', gap:14, marginBottom:18 }}>
          {INDICES.map(idx => {
            const lect = leerValor(idx)
            const open = openIdx === idx.abbr
            const deltaUp = idx.delta > 0
            // ¿el cambio es positivo o negativo dado el carácter del índice?
            const positivo = idx.goodHigh ? deltaUp : !deltaUp
            return (
 <article key={idx.abbr} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:18, padding:'20px 24px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                display:'flex', flexDirection:'column', gap:14,
                position:'relative', overflow:'hidden',
              }}>
 <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:idx.c }}/>

                {/* Header con gauge + título + delta */}
 <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:18, alignItems:'center' }}>
 <Gauge value={idx.value} color={idx.c} size={120}/>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
 <span style={{ fontSize:11, fontWeight:800, color:idx.c, letterSpacing:'0.1em' }}>{idx.abbr}</span>
 <span style={{
                        fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:999,
                        background:`${lect.color}15`, color:lect.color, border:`1px solid ${lect.color}40`,
                      }}>{lect.etiqueta}</span>
 </div>
 <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f' }}>{idx.name}</h3>
 <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: positivo ? '#16A34A' : '#DC2626' }}>
                        {deltaUp ? '▲' : '▼'} {Math.abs(idx.delta)} pp
 </span>
 <span style={{ fontSize:10.5, color:'#6e6e73' }}>vs mes anterior</span>
 </div>
 <div style={{ marginTop:6 }}>
 <Sparkline data={idx.serie} color={idx.c} w={180} h={26}/>
 </div>
 </div>
 </div>

                {/* Descripción */}
 <p style={{ fontSize:12, color:'#3a3a3d', margin:0, lineHeight:1.5 }}>{idx.desc}</p>

                {/* Componentes */}
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
 <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>
                    Componentes
 </div>
                  {idx.components.map(comp => (
 <div key={comp.label} style={{ display:'grid', gridTemplateColumns:'1fr 90px 36px', gap:10, alignItems:'center' }}>
 <span style={{ fontSize:11.5, color:'#3a3a3d' }}>{comp.label}</span>
 <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${comp.value}%`, height:'100%', background:idx.c, borderRadius:3 }}/>
 </div>
 <span style={{ fontSize:11.5, fontWeight:700, color:idx.c, textAlign:'right' }}>{comp.value}{comp.weight ? '%' : ''}</span>
 </div>
                  ))}
 </div>
 </article>
            )
          })}
 </div>

        {/* ───── Serie histórica ───── */}
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:18, padding:'22px 26px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
 <h2 style={{ margin:0, fontSize:14, fontWeight:600, fontFamily:'var(--font-display)' }}>Serie histórica · contexto electoral</h2>
 <span style={{ padding:'4px 10px', borderRadius:999, background:'#F5F5F7', fontSize:11, fontWeight:600, color:'#6e6e73', letterSpacing:'0.04em' }}>{HIST.length} períodos</span>
 </div>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
 <thead>
 <tr style={{ borderBottom:'1px solid #ECECEF' }}>
                {[
                  { l:'Período',          a:'left' },
                  { l:'Etiqueta',         a:'left' },
                  { l:'IPol',             a:'center', c:'#DC2626' },
                  { l:'IVol',             a:'center', c:'#F97316' },
                  { l:'IGob',             a:'center', c:'#1F4E8C' },
                  { l:'ICI',              a:'center', c:'#16A34A' },
                ].map(h => (
 <th key={h.l} style={{ textAlign:h.a as any, padding:'10px 12px', color: h.c || '#6e6e73', fontWeight:700, fontSize:10.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                    {h.l}
 </th>
                ))}
 </tr>
 </thead>
 <tbody>
              {HIST.map((r, i) => {
                const isCurrent = i === HIST.length - 1
                return (
 <tr key={r.p} style={{
                    background: isCurrent ? 'rgba(5,150,105,0.06)' : 'transparent',
                    borderBottom:'1px solid #F5F5F7',
                  }}>
 <td style={{ padding:'12px 12px', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? '#059669' : '#1d1d1f' }}>
                      {r.p}
                      {isCurrent && <span style={{ marginLeft:6, fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:999, background:'#059669', color:'#fff', letterSpacing:'0.06em' }}>ACTUAL</span>}
 </td>
 <td style={{ padding:'12px 12px', color:'#6e6e73', fontStyle: isCurrent ? 'normal' : 'italic' }}>{r.etiqueta}</td>
                    {[
                      { v:r.IPol, c:'#DC2626' },
                      { v:r.IVol, c:'#F97316' },
                      { v:r.IGob, c:'#1F4E8C' },
                      { v:r.ICI,  c:'#16A34A' },
                    ].map((x, j) => (
 <td key={j} style={{ padding:'12px 12px', textAlign:'center' }}>
 <div style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          minWidth:36, padding:'3px 8px', borderRadius:999,
                          background:`${x.c}12`, border:`1px solid ${x.c}30`,
                          fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:x.c,
                        }}>{x.v}</div>
 </td>
                    ))}
 </tr>
                )
              })}
 </tbody>
 </table>
 <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #ECECEF', fontSize:10.5, color:'#86868b' }}>
            IPol = polarización (más alto, peor) · IVol = volatilidad (más alto, peor) · IGob = gobernabilidad (más alto, mejor) · ICI = confianza institucional (más alto, mejor)
 </div>
 </section>

        {/* ───── Lectura agregada ───── */}
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:18, padding:'22px 26px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h2 style={{ margin:'0 0 12px', fontSize:14, fontWeight:600, fontFamily:'var(--font-display)' }}>Lectura sintética</h2>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
 <div style={{ padding:'14px 16px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:12 }}>
 <div style={{ fontSize:10.5, color:'#DC2626', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Señales de alarma</div>
 <ul style={{ margin:0, paddingLeft:18, fontSize:12.5, color:'#3a3a3d', lineHeight:1.55 }}>
 <li>Polarización en máximos históricos (72,4 · ↑)</li>
 <li>Gobernabilidad en deterioro continuo desde nov-2024 (44,1 · ↓)</li>
 <li>Confianza institucional bajo umbral del 35% (31,2 · ↓)</li>
 </ul>
 </div>
 <div style={{ padding:'14px 16px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:12 }}>
 <div style={{ fontSize:10.5, color:'#16A34A', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Señales positivas</div>
 <ul style={{ margin:0, paddingLeft:18, fontSize:12.5, color:'#3a3a3d', lineHeight:1.55 }}>
 <li>Volatilidad en niveles bajos (18,3 · ↓ −0,4)</li>
 <li>Impacto mediático del Gobierno se recupera (61,7 · ↑)</li>
 <li>IEC global ligeramente al alza (+0,6 pp en 30 días)</li>
 </ul>
 </div>
 <div style={{ padding:'14px 16px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:12 }}>
 <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Comparativa</div>
 <ul style={{ margin:0, paddingLeft:18, fontSize:12.5, color:'#3a3a3d', lineHeight:1.55 }}>
 <li>Peor IGob desde 2019-A (29) tras la legislatura fallida</li>
 <li>Mejor IPol que en 2019-N (70) por +2 pp</li>
 <li>ICI por debajo de cualquier período desde 2011</li>
 </ul>
 </div>
 </div>
 </section>
 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Inteligencia de Datos · Índices · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}
