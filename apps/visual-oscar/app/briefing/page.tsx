'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import BriefingArchive from '@/components/BriefingArchive'
import type { MorningBriefing } from '@/lib/api-types'

// Mapeo del nivel del backend al estilo visual
const LEVEL_STYLE: Record<string, { label: string; color: string }> = {
  critical: { label: 'CRÍTICA', color: '#DC2626' },
  high:     { label: 'ALTA',    color: '#F97316' },
  medium:   { label: 'MEDIA',   color: '#EAB308' },
  low:      { label: 'INFO',    color: '#0EA5E9' },
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · alertas críticas
// ─────────────────────────────────────────────────────────────────────────
const ALERTS = [
  { level:'CRÍTICA', c:'#DC2626', tit:'Prima de riesgo supera los 100 pb por tercer día consecutivo', detail:'Tesoro convoca reunión técnica · spread con bono alemán amplía 4 pb en sesión', src:'Bloomberg · 09:42' },
  { level:'ALTA',    c:'#F97316', tit:'Junts condiciona apoyo a Presupuestos a transferencia fiscal antes de junio', detail:'Reunión bilateral con Moncloa este jueves · Nogueras endurece tono en RAC1', src:'EFE · 11:18' },
  { level:'MEDIA',   c:'#EAB308', tit:'INE adelanta publicación de la EPA al viernes 10:00', detail:'Estimación interna del Gabinete Económico: paro 11.1% (–0.3 pp)', src:'Moncloa · 12:30' },
  { level:'INFO',    c:'#0EA5E9', tit:'BCE publica actas de abril con tono moderadamente hawkish', detail:'Mercados descuentan recorte tipos solo en septiembre · prob. 38% (era 54%)', src:'Reuters · 14:00' },
]

// KPIs ejecutivos del día
const KPIS = [
  { l:'Índice del día',  v:'56', d:'/100', delta:'+2', dpos:true,  c:'#0071e3', sub:'Atención política media-alta' },
  { l:'Tensión política', v:'42', d:'/100', delta:'+5', dpos:false, c:'#DC2626', sub:'Subida por crisis presupuestaria' },
  { l:'IBEX 35',         v:'11.240', d:'pts', delta:'+1.2%', dpos:true,  c:'#16A34A', sub:'8 sesiones en verde' },
  { l:'Prima de riesgo', v:'102', d:'pb',  delta:'+3', dpos:false, c:'#F97316', sub:'Tercer día por encima de 100' },
  { l:'Bono 10Y',        v:'3.24', d:'%',  delta:'+0.04', dpos:false, c:'#5B21B6', sub:'Última subasta sin tensiones' },
  { l:'Sentim. CIS',     v:'3.8', d:'/10', delta:'-0.2', dpos:false, c:'#7C3AED', sub:'Valoración Sánchez en mínimos' },
]

// Sparklines mini (11 puntos · 10 días)
const SPARKS = {
  ibex:    [10900,11050,10980,11100,11080,11150,11200,11180,11220,11240,11240],
  prima:   [94,96,95,97,98,99,98,100,101,102,102],
  paro:    [12.0,11.9,11.8,11.7,11.7,11.6,11.5,11.5,11.4,11.4,11.4],
  ipc:     [3.5,3.4,3.3,3.2,3.1,3.1,3.0,3.0,2.9,2.9,2.9],
  bono:    [3.18,3.20,3.19,3.22,3.21,3.23,3.20,3.22,3.24,3.23,3.24],
  sentim:  [4.2,4.1,4.0,4.0,3.9,3.9,3.9,3.8,3.8,3.8,3.8],
}

// Módulos temáticos enriquecidos
type SeccionKey = 'electoral' | 'gobierno' | 'economia' | 'opinion'
const SECTIONS: Record<SeccionKey, {
  title: string; tag: string; c: string;
  score: number; delta: number;
  hl: string;
  pts: { txt: string; tag: 'positivo'|'neutro'|'negativo' }[];
  metrics: { l: string; v: string; d?: string }[];
}> = {
  electoral: {
    title:'Situación electoral', tag:'INTENCIÓN DE VOTO · NOWCASTING', c:'#0071e3',
    score:62, delta:+2,
    hl:'PP mantiene ventaja sólida (+5.3 pp) sobre PSOE. La derecha suma mayoría absoluta en 38% de las simulaciones.',
    pts:[
      { txt:'PP: 32.1% (+0.4 pp 7d) · 132 escaños estimados',          tag:'positivo' },
      { txt:'PSOE: 26.8% (–0.2 pp) · 110 escaños estimados',           tag:'neutro'   },
      { txt:'VOX: 12.4% (–0.8 pp tras debate sobre inmigración)',      tag:'negativo' },
      { txt:'Sumar: 10.2% (–1.2 pp en media semanal)',                 tag:'negativo' },
      { txt:'Abstención estimada +1.2 pp en jóvenes 18–24',            tag:'neutro'   },
      { txt:'P(Mayoría derecha) = 38% · P(bloqueo) = 22%',             tag:'positivo' },
    ],
    metrics:[
      { l:'Distancia a 176',  v:'18',   d:'esc.' },
      { l:'Encuestas 30d',    v:'14' },
      { l:'Coaliciones via.', v:'2/6' },
    ],
  },
  gobierno: {
    title:'Estabilidad gubernamental', tag:'CONGRESO · MAYORÍA · SOCIOS', c:'#DC2626',
    score:44, delta:-3,
    hl:'Caída del Índice por el bloqueo presupuestario y tensión con Junts. Investidura no peligra a corto plazo, pero el desgaste se acumula.',
    pts:[
      { txt:'Gobierno tras fracaso de la negociación presupuestaria',  tag:'negativo' },
      { txt:'PNV reclama reunión bilateral antes del 15 mayo',         tag:'negativo' },
      { txt:'Sánchez descarta elecciones anticipadas en Moncloa',      tag:'neutro'   },
      { txt:'Junts amenaza con tumbar 3 RDL si no hay cesión fiscal',  tag:'negativo' },
      { txt:'BNG y Bildu mantienen apoyo a Presupuestos',              tag:'positivo' },
    ],
    metrics:[
      { l:'Apoyo investidura',   v:'179', d:'/350' },
      { l:'Margen mayoría',      v:'+3' },
      { l:'Dependencia Junts',   v:'7',   d:'esc.' },
    ],
  },
  economia: {
    title:'Economía y mercados', tag:'IBEX · PRIMA · MACROECONOMÍA', c:'#16A34A',
    score:58, delta:+1,
    hl:'PIB Q1 2026 crece +2.7% pero la prima de riesgo se tensa por el ruido político. BCE mantiene tipos al 2.50%.',
    pts:[
      { txt:'PIB Q1 2026: +2.7% (flash INE) — mejor de lo esperado',   tag:'positivo' },
      { txt:'BCE mantiene tipos al 2.50% — reunión junio clave',       tag:'neutro'   },
      { txt:'Exportaciones +3.1% · turismo +8.4% · industria –0.5%',   tag:'neutro'   },
      { txt:'Prima de riesgo: 102 pb (3 días seguidos > 100)',         tag:'negativo' },
      { txt:'Euríbor 12m baja a 2.84% (–6 pb mensual)',                tag:'positivo' },
    ],
    metrics:[
      { l:'IBEX hoy',     v:'+1.2', d:'%' },
      { l:'IPC abril',    v:'2.9',  d:'%' },
      { l:'Paro EPA',     v:'11.4', d:'%' },
    ],
  },
  opinion: {
    title:'Opinión pública', tag:'CIS · MEDIA DE ENCUESTAS', c:'#7C3AED',
    score:51, delta:0,
    hl:'Polarización estable. La valoración de Sánchez cede 0.2 pp, mientras Feijóo se mantiene plano. Sumar pierde notoriedad.',
    pts:[
      { txt:'CIS: 52% considera "mala" la situación política',         tag:'negativo' },
      { txt:'Valoración Sánchez 3.8/10 (–0.2 vs mes)',                 tag:'negativo' },
      { txt:'Valoración Feijóo 4.2/10 (estable)',                      tag:'neutro'   },
      { txt:'Abascal sube a 3.9/10 (+0.3) tras debate inmigración',    tag:'neutro'   },
      { txt:'Yolanda Díaz cae a 3.5/10 (–0.4)',                        tag:'negativo' },
      { txt:'Tema más preocupante: vivienda 38% (+2 pp mensual)',      tag:'negativo' },
    ],
    metrics:[
      { l:'CIS · panel',     v:'52',   d:'%' },
      { l:'Σ encuestas 7d',  v:'9' },
      { l:'Diferencial pp',  v:'+5.3' },
    ],
  },
}

// Cronología del día
const TIMELINE = [
  { t:'07:30', a:'Moncloa',    cat:'GOBIERNO',  c:'#0071e3', e:'Consejo de Ministros aprueba decreto-ley de medidas energéticas',                 imp:'media' },
  { t:'08:15', a:'INE',        cat:'MACRO',     c:'#16A34A', e:'IPC abril 2026 — general 2.9% (+0.1 pp) · subyacente 2.7%',                         imp:'media' },
  { t:'09:30', a:'BCE',        cat:'MERCADOS',  c:'#5B21B6', e:'Publicación de actas de abril con tono moderadamente hawkish',                      imp:'alta'  },
  { t:'10:00', a:'Congreso',   cat:'PARLAMENTO',c:'#5B21B6', e:'Pleno · debate de la convalidación del Decreto-ley 4/2026 (sector agroalimentario)',imp:'alta'  },
  { t:'11:00', a:'Moncloa',    cat:'GOBIERNO',  c:'#0071e3', e:'Portavoz descarta elecciones anticipadas en rueda de prensa',                       imp:'media' },
  { t:'12:30', a:'PP',         cat:'OPOSICIÓN', c:'#1F4E8C', e:'Feijóo pide moción de censura en redes — #MociónCensura es trending nacional',      imp:'alta'  },
  { t:'14:00', a:'Junts',      cat:'NEGOCIACIÓN',c:'#1FA89B', e:'Nogueras (Junts) endurece el tono en RAC1: «sin transferencia fiscal no hay PGE»', imp:'crítica'},
  { t:'15:00', a:'Mercados',   cat:'MERCADOS',  c:'#5B21B6', e:'Prima de riesgo cierra en 102 pb · IBEX 35 termina +1.2% impulsado por banca',      imp:'media' },
  { t:'16:30', a:'CIS',        cat:'OPINIÓN',   c:'#7C3AED', e:'Avance CIS mayo: PSOE recorta diferencia con PP a 5.3 pp (era 6.1 pp)',             imp:'alta'  },
  { t:'17:45', a:'PNV',        cat:'NEGOCIACIÓN',c:'#1FA89B', e:'Ortuzar exige reunión bilateral antes del 15 mayo · agenda económica fiscal',      imp:'media' },
  { t:'19:00', a:'TVE',        cat:'MEDIOS',    c:'#525258', e:'Cara a cara Cuerpo (PSOE) – Bravo (PP) en La Hora de La 1',                          imp:'alta'  },
  { t:'21:30', a:'UE',         cat:'GEOPOLÍTICA',c:'#0E7490', e:'Consejo Asuntos Exteriores · Borrell informará sobre Sahel y Ucrania',              imp:'media' },
]

const IMP_META = { 'crítica':'#DC2626', 'alta':'#F97316', 'media':'#0EA5E9', 'baja':'#6e6e73' } as const

// Próximos hitos de la semana
const HITOS = [
  { fecha:'Mié 7 may',  e:'Convalidación Decreto-ley energético en Pleno',          tipo:'congreso',  c:'#5B21B6' },
  { fecha:'Jue 8 may',  e:'Reunión bilateral Moncloa-Junts (Presupuestos)',         tipo:'gobierno',  c:'#0071e3' },
  { fecha:'Vie 9 may',  e:'INE publica EPA T1 2026 (10:00)',                        tipo:'macro',     c:'#16A34A' },
  { fecha:'Vie 9 may',  e:'Cumbre informal UE (Día de Europa) en Estrasburgo',      tipo:'europa',    c:'#0E7490' },
  { fecha:'Lun 12 may', e:'Conferencia Sectorial de Vivienda con CCAA',             tipo:'territorial',c:'#F97316' },
  { fecha:'Mar 13 may', e:'Comparecencia de Cuerpo en Comisión de Economía',        tipo:'congreso',  c:'#5B21B6' },
  { fecha:'Mié 14 may', e:'Avance CIS · panel mensual de mayo',                     tipo:'opinion',   c:'#7C3AED' },
  { fecha:'Jue 15 may', e:'BdE · proyecciones macroeconómicas trimestrales',        tipo:'macro',     c:'#16A34A' },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function BriefingPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const today = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const [section, setSection] = useState<SeccionKey>('electoral')

  // Briefing del backend ElectSim · refresh cada 5 min
  const { data: briefing, source, updatedAt, refresh } = useApi<MorningBriefing>(
    '/api/briefings/morning?workspace_id=default',
    { refreshInterval: 300_000 }
  )
  const liveAlerts = briefing?.key_alerts || []
  const liveStories = briefing?.top_stories || []
  const liveNarratives = briefing?.active_narratives || []
  const electoralSnapshot = briefing?.electoral_snapshot
  const briefingMode = briefing?.mode

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'#1d1d1f', fontFamily:'var(--font-text)' }}>
      <AppHeader/>
      <main style={{ maxWidth:1400, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Reproductor de audio (briefing en formato podcast) ───── */}
        <AudioPlayer today={today}/>

        {/* ═════════════════════════════════════════════════════════════════
            BRIEFING EN VIVO · generado por el backend ElectSim FastAPI
            Solo visible cuando hay datos reales (briefing.executive_summary)
            ═════════════════════════════════════════════════════════════════ */}
        {briefing?.executive_summary && (
          <section style={{ marginTop:18, marginBottom:22 }}>
            <div style={{
              background:'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)',
              borderRadius:18, padding:'24px 28px', color:'#fff',
              border:'1px solid rgba(99,102,241,0.30)',
              boxShadow:'0 4px 24px -8px rgba(99,102,241,0.30)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.14em', color:'#a78bfa', textTransform:'uppercase' }}>
                  Briefing del día · backend ElectSim
                </span>
                {briefingMode === 'real' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#10b981', color:'#fff' }}>LIVE</span>}
                {briefingMode === 'demo' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#fbbf24', color:'#0F172A' }}>DEMO</span>}
                <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
                <button onClick={async () => {
                  try {
                    const id = (briefing as any)?.id ?? 'today'
                    const r = await fetch(`/api/briefings/${id}/pdf`)
                    if (r.ok) {
                      const ct = r.headers.get('content-type') || ''
                      if (ct.includes('application/pdf')) {
                        const blob = await r.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = `briefing-${id}.pdf`; a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 5000)
                        return
                      }
                      const j = await r.json()
                      if (j.bytes_b64) {
                        const bytes = Uint8Array.from(atob(j.bytes_b64), c => c.charCodeAt(0))
                        const blob = new Blob([bytes], { type: 'application/pdf' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = `briefing-${id}.pdf`; a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 5000)
                        return
                      }
                    }
                    // demo fallback
                    const txt = `%PDF-1.4\n%Politeia briefing demo ${id}\n%EOF`
                    const blob = new Blob([txt], { type: 'application/pdf' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `briefing-${id}-demo.pdf`; a.click()
                    setTimeout(() => URL.revokeObjectURL(url), 5000)
                  } catch (e) {
                    console.error(e)
                  }
                }} style={{
                  marginLeft: 'auto', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.10)', color: '#fff',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>↓ Descargar PDF</button>
              </div>

              {/* Executive summary */}
              <p style={{ margin:'0 0 18px', fontSize:14, lineHeight:1.65, color:'rgba(255,255,255,0.85)', maxWidth:1100 }}>
                {briefing.executive_summary}
              </p>

              {/* Electoral snapshot · ITPE + top partidos */}
              {electoralSnapshot && (electoralSnapshot.itpe !== undefined || electoralSnapshot.top_parties) && (
                <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap', padding:'12px 16px', background:'rgba(255,255,255,0.05)', borderRadius:10, marginBottom:16, border:'1px solid rgba(255,255,255,0.08)' }}>
                  {electoralSnapshot.itpe !== undefined && (
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase' }}>ITPE</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#a78bfa', lineHeight:1 }}>
                        {electoralSnapshot.itpe.toFixed(1)}<span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>/100</span>
                      </div>
                    </div>
                  )}
                  {electoralSnapshot.top_parties && Object.entries(electoralSnapshot.top_parties).slice(0, 5).map(([party, pct]) => (
                    <div key={party}>
                      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase' }}>{party}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#fff', lineHeight:1 }}>
                        {pct}<span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>%</span>
                      </div>
                    </div>
                  ))}
                  {electoralSnapshot.trend && (
                    <div style={{ marginLeft:'auto', fontSize:11, color:'rgba(255,255,255,0.6)' }}>
                      Tendencia: <strong style={{ color: electoralSnapshot.trend === 'up' ? '#10b981' : electoralSnapshot.trend === 'down' ? '#ef4444' : '#a78bfa' }}>
                        {electoralSnapshot.trend === 'up' ? '↗ alcista' : electoralSnapshot.trend === 'down' ? '↘ bajista' : '→ estable'}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Grid de 3 columnas: alertas · top stories · narrativas */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
                {/* Key alerts */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:8 }}>
                    Alertas clave ({liveAlerts.length})
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {liveAlerts.slice(0, 4).map((a, i) => {
                      const lv = LEVEL_STYLE[a.level] || LEVEL_STYLE.medium
                      return (
                        <div key={i} style={{ padding:'9px 11px', background:'rgba(0,0,0,0.20)', borderRadius:8, borderLeft:`3px solid ${lv.color}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', color:lv.color, padding:'1px 5px', borderRadius:3, background:`${lv.color}25` }}>{lv.label}</span>
                          </div>
                          <p style={{ margin:'0 0 3px', fontSize:11.5, fontWeight:600, color:'#fff', lineHeight:1.3 }}>{a.title}</p>
                          <p style={{ margin:0, fontSize:10.5, color:'rgba(255,255,255,0.6)', lineHeight:1.4 }}>{a.body}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top stories */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:8 }}>
                    Top stories ({liveStories.length})
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {liveStories.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ padding:'9px 11px', background:'rgba(0,0,0,0.20)', borderRadius:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:9.5, color:'#a78bfa', fontWeight:600 }}>{s.source}</span>
                          <span style={{ fontSize:9, fontWeight:700, color:'#fbbf24' }}>{Math.round(s.relevance * 100)}</span>
                        </div>
                        <p style={{ margin:0, fontSize:11.5, fontWeight:500, color:'#fff', lineHeight:1.35 }}>{s.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active narratives */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:8 }}>
                    Narrativas activas ({liveNarratives.length})
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {liveNarratives.slice(0, 4).map((n, i) => (
                      <div key={i} style={{ padding:'9px 11px', background:'rgba(0,0,0,0.20)', borderRadius:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:11, color: n.velocity === 'up' ? '#ef4444' : n.velocity === 'down' ? '#10b981' : '#a78bfa' }}>
                            {n.velocity === 'up' ? '↗' : n.velocity === 'down' ? '↘' : '→'}
                          </span>
                          <span style={{ fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.75)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                            {n.velocity}
                          </span>
                        </div>
                        <p style={{ margin:'0 0 3px', fontSize:11.5, fontWeight:500, color:'#fff', lineHeight:1.35 }}>{n.frame_label}</p>
                        {n.recommended_action && (
                          <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.5)', lineHeight:1.35, fontStyle:'italic' }}>
                            → {n.recommended_action}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───── Alertas críticas (visuales) ───── */}
        <section style={{ marginTop:18, marginBottom:18 }}>
          <SectionHeader label="Alertas del día" count={`${ALERTS.length} avisos`} accent="#DC2626"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:10 }}>
            {ALERTS.map(a => (
              <div key={a.tit} style={{
                position:'relative', padding:'14px 16px 14px 20px',
                background:'#fff', border:`1px solid ${a.c}40`, borderRadius:14,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ position:'absolute', left:0, top:14, bottom:14, width:4, background:a.c, borderRadius:'0 4px 4px 0' }}/>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                    color:a.c, padding:'2px 7px', borderRadius:4,
                    background:`${a.c}15`, border:`1px solid ${a.c}40`,
                  }}>{a.level}</span>
                  <span style={{ fontSize:10, color:'#6e6e73', marginLeft:'auto' }}>{a.src}</span>
                </div>
                <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, lineHeight:1.35, color:'#1d1d1f' }}>{a.tit}</p>
                <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', lineHeight:1.45 }}>{a.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── KPIs ejecutivos del día (6 indicadores) ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot ejecutivo" count={today.charAt(0).toUpperCase()+today.slice(1)} accent="#0071e3"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
            {KPIS.map((k, i) => {
              const sparkSeries = [SPARKS.sentim, SPARKS.prima, SPARKS.ibex, SPARKS.prima, SPARKS.bono, SPARKS.sentim]
              const sparkData = sparkSeries[i]
              return (
                <div key={k.l} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 14px 10px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <p style={{ margin:'0 0 6px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{k.l}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:k.c, letterSpacing:'-0.022em', lineHeight:1 }}>{k.v}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{k.d}</span>
                    <span style={{
                      marginLeft:'auto',
                      fontSize:11, fontWeight:700,
                      color: k.dpos ? '#16A34A' : '#DC2626',
                    }}>{k.dpos ? '▲' : '▼'} {k.delta}</span>
                  </div>
                  <Sparkline data={sparkData} color={k.c} h={26}/>
                  <div style={{ fontSize:10, color:'#86868b', marginTop:5, lineHeight:1.3 }}>{k.sub}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ───── Tabs de módulos temáticos ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Análisis por dimensión" count="4 módulos" accent="#5B21B6"/>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:12 }}>
            {(Object.keys(SECTIONS) as SeccionKey[]).map(k => {
              const active = section === k
              const c = SECTIONS[k].c
              return (
                <button key={k} onClick={() => setSection(k)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? c : '#6e6e73',
                  border:'none', borderRadius:999, padding:'7px 16px',
                  fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{SECTIONS[k].title}</button>
              )
            })}
          </div>
          <SeccionCard data={SECTIONS[section]}/>
        </section>

        {/* ───── Cronología del día (timeline visual) ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Cronología del día" count={`${TIMELINE.length} eventos`} accent="#1d1d1f"/>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:46, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
              {TIMELINE.map((ev, i) => {
                const impColor = IMP_META[ev.imp as keyof typeof IMP_META] || '#6e6e73'
                return (
                  <div key={ev.e} style={{
                    display:'grid', gridTemplateColumns:'40px 18px 1fr',
                    gap:8, alignItems:'flex-start',
                    padding: i === 0 ? '0 0 14px 0' : '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                  }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{ev.t}</span>
                    <div style={{ position:'relative', width:18, height:18 }}>
                      <div style={{
                        width:14, height:14, borderRadius:'50%', background:'#fff',
                        border:`3px solid ${impColor}`,
                        boxShadow:`0 0 0 3px ${impColor}22`,
                        position:'absolute', top:3, left:2, zIndex:1,
                      }}/>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                          padding:'2px 7px', borderRadius:4,
                          background:ev.c, color:'#fff',
                        }}>{ev.cat}</span>
                        <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {ev.a}</span>
                        <span style={{
                          fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${impColor}15`, color:impColor, border:`1px solid ${impColor}40`,
                          marginLeft:'auto',
                        }}>{ev.imp.toUpperCase()}</span>
                      </div>
                      <p style={{ margin:0, fontSize:12.5, color:'#1d1d1f', lineHeight:1.4 }}>{ev.e}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Próximos hitos (cards de 2 columnas) ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Próximos hitos · 7 días" count={`${HITOS.length} eventos`} accent="#16A34A"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
            {HITOS.map(h => (
              <div key={h.e} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                padding:'12px 14px', boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
                display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
              }}>
                <div style={{
                  background:`${h.c}15`, color:h.c,
                  borderRadius:9, padding:'6px 10px', textAlign:'center',
                  fontFamily:'var(--font-display)', fontSize:11, fontWeight:700,
                  letterSpacing:'0.04em', minWidth:64,
                }}>{h.fecha.toUpperCase()}</div>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:'0 0 3px', fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.35 }}>{h.e}</p>
                  <span style={{ fontSize:9.5, fontWeight:700, color:h.c, letterSpacing:'0.08em', textTransform:'uppercase' }}>{h.tipo}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── Tarjetas de recomendaciones (cierre del briefing) ───── */}
        <section>
          <SectionHeader label="Recomendaciones del analista" count="3 acciones" accent="#0071e3"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { t:'Reforzar comunicación con socios prioritarios', d:'Anticipar la reunión bilateral con Junts y desactivar la narrativa del bloqueo presupuestario antes del jueves.', col:'#0071e3', n:'01' },
              { t:'Vigilar la prima de riesgo durante toda la semana', d:'Tercer día por encima de 100 pb. Si supera los 110 pb la próxima sesión, activar el protocolo de crisis económica.', col:'#DC2626', n:'02' },
              { t:'Capitalizar mensaje sobre PIB Q1', d:'+2.7% es la mejor cifra desde 2022. Aprovechar para mensaje de fortaleza económica antes de la EPA del viernes.', col:'#16A34A', n:'03' },
            ].map(r => (
              <div key={r.n} style={{
                background:'#fff', border:`1px solid ${r.col}30`, borderRadius:14,
                padding:'18px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', position:'relative',
              }}>
                <div style={{ position:'absolute', top:14, right:14,
                  fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, color:`${r.col}25`, letterSpacing:'-0.02em', lineHeight:1 }}>{r.n}</div>
                <p style={{ margin:'0 0 8px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:r.col, lineHeight:1.3, letterSpacing:'-0.012em' }}>{r.t}</p>
                <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', lineHeight:1.5 }}>{r.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Archivo de briefings con descarga PDF */}
        <BriefingArchive/>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Briefing diario · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// AudioPlayer · briefing en formato podcast (mock con animación)
// ─────────────────────────────────────────────────────────────────────────
function AudioPlayer({ today }: { today: string }) {
  // Duración del briefing: 1 / 5 / 10 minutos
  const DURATIONS = [
    { k: 1,  totalSec: 60,        label: '1 min',  badge: 'EXPRESS', desc: 'Solo los titulares y la alerta más urgente del día.' },
    { k: 5,  totalSec: 5 * 60,    label: '5 min',  badge: 'ESTÁNDAR',desc: 'Alertas, snapshot económico y agenda parlamentaria del día.' },
    { k: 10, totalSec: 10 * 60,   label: '10 min', badge: 'EXTENSO', desc: 'Resumen completo: alertas, mercados, parlamento, opinión y agenda semanal.' },
  ] as const
  const [duration, setDuration] = useState<typeof DURATIONS[number]['k']>(5)
  const cur = DURATIONS.find(d => d.k === duration)!
  const totalSec = cur.totalSec

  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-100
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Al cambiar de duración: reset del progreso y pausa
  useEffect(() => {
    setProgress(0)
    setPlaying(false)
  }, [duration])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          const np = p + (100 / totalSec) * speed
          if (np >= 100) { setPlaying(false); return 100 }
          return np
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current); intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed, totalSec])

  const elapsedSec = Math.floor((progress / 100) * totalSec)
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  return (
    <section style={{
      background:'linear-gradient(135deg,#1F4E8C 0%,#0d1b2e 100%)',
      borderRadius:18, padding:'22px 26px', color:'#fff', position:'relative', overflow:'hidden',
      boxShadow:'0 4px 20px rgba(31,78,140,0.25)',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position:'absolute', inset:0, opacity:0.07, pointerEvents:'none',
        background:'radial-gradient(circle at 80% 30%, #fff 0%, transparent 50%)',
      }}/>
      <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:20, alignItems:'center' }}>
        {/* Botón play grande */}
        <button onClick={() => setPlaying(p => !p)} style={{
          width:62, height:62, borderRadius:'50%',
          background:'#fff', color:'#1F4E8C', border:'none',
          cursor:'pointer', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 12px rgba(0,0,0,0.2)',
          transition:'transform 160ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="5" y="3" width="4" height="16" rx="1" fill="#1F4E8C"/>
              <rect x="13" y="3" width="4" height="16" rx="1" fill="#1F4E8C"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M6 3l13 8-13 8V3z" fill="#1F4E8C"/>
            </svg>
          )}
        </button>

        {/* Info + waveform */}
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'#FFD700' }}>
              AUDIO · Briefing diario
            </span>
            <span style={{ fontSize:10.5, opacity:0.7, fontWeight:600 }}>· {today}</span>
            <span style={{ fontSize:10.5, opacity:0.7, fontWeight:600 }}>· Voz IA: Claudia</span>
          </div>
          <h2 style={{
            margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:19, fontWeight:600,
            letterSpacing:'-0.018em', lineHeight:1.2,
          }}>Tu resumen ejecutivo en <span style={{ color:'#FFD700' }}>{cur.k} {cur.k === 1 ? 'minuto' : 'minutos'}</span></h2>
          <p style={{ margin:'0 0 10px', fontSize:11.5, opacity:0.7, lineHeight:1.4 }}>
            {cur.desc}
          </p>
          {/* Selector de duración 1 / 5 / 10 min */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.65 }}>Duración:</span>
            <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.12)', borderRadius:999, padding:3 }}>
              {DURATIONS.map(d => {
                const active = duration === d.k
                return (
                  <button key={d.k} onClick={() => setDuration(d.k)} style={{
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#1F4E8C' : '#fff',
                    border:'none', borderRadius:999, padding:'5px 12px',
                    fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                    fontFamily:'inherit',
                    display:'inline-flex', alignItems:'center', gap:6,
                  }}>
                    {d.label}
                    <span style={{
                      fontSize:8, fontWeight:800, letterSpacing:'0.06em',
                      padding:'1px 5px', borderRadius:4,
                      background: active ? '#1F4E8C' : 'rgba(255,255,255,0.18)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                    }}>{d.badge}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {/* Waveform animado */}
          <Waveform playing={playing} progress={progress}/>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10.5, opacity:0.7, fontWeight:600, fontFamily:'var(--font-display)' }}>
            <span>{fmt(elapsedSec)}</span>
            <span>{fmt(totalSec)}</span>
          </div>
        </div>

        {/* Controles */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
          {/* Velocidad */}
          <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.12)', borderRadius:999, padding:2 }}>
            {[0.75, 1, 1.25, 1.5].map(s => {
              const active = speed === s
              return (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1F4E8C' : '#fff',
                  border:'none', borderRadius:999, padding:'3px 9px',
                  fontSize:10.5, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit',
                }}>{s}x</button>
              )
            })}
          </div>
          {/* Botones */}
          <div style={{ display:'flex', gap:6 }}>
            <button title="Descargar MP3" style={{
              background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              display:'inline-flex', alignItems:'center', gap:5,
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v6m0 0L3 4.5M5.5 7L8 4.5M2 9h7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              MP3
            </button>
            <button title="Compartir" style={{
              background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              display:'inline-flex', alignItems:'center', gap:5,
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 5.5L8 3v5L3 5.5zM8 3v5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Compartir
            </button>
          </div>
          {/* Capítulos */}
          <div style={{ fontSize:10, opacity:0.7, fontWeight:600 }}>5 capítulos · ⓘ transcripción</div>
        </div>
      </div>
    </section>
  )
}

// Waveform animado (barras con altura aleatoria pero estable)
function Waveform({ playing, progress }: { playing: boolean, progress: number }) {
  const bars = useMemo(() => {
    // 60 barras con alturas pseudo-aleatorias deterministas
    return Array.from({ length: 60 }, (_, i) => {
      const a = Math.sin(i * 0.6) * 0.4 + Math.cos(i * 0.3) * 0.3 + 0.5
      return Math.max(0.18, Math.min(1, a + Math.sin(i * 1.7) * 0.15))
    })
  }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, height:34, position:'relative' }}>
      {bars.map((h, i) => {
        const pct = (i / bars.length) * 100
        const past = pct < progress
        const animH = playing && Math.abs(pct - progress) < 3 ? h * 1.18 : h
        return (
          <div key={i} style={{
            width:3, height:`${animH * 100}%`, borderRadius:2,
            background: past ? '#FFD700' : 'rgba(255,255,255,0.3)',
            transition:'height 240ms cubic-bezier(.4,0,.2,1), background 280ms',
          }}/>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SeccionCard · módulo temático rico
// ─────────────────────────────────────────────────────────────────────────
function SeccionCard({ data }: { data: typeof SECTIONS[SeccionKey] }) {
  const tagColor = { 'positivo':'#16A34A', 'neutro':'#6e6e73', 'negativo':'#DC2626' }
  return (
    <div style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
      display:'grid', gridTemplateColumns:'1fr 280px', gap:20,
    }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <span style={{
            fontSize:9.5, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase',
            color:data.c, padding:'3px 9px', borderRadius:999,
            background:`${data.c}15`, border:`1px solid ${data.c}40`,
          }}>{data.tag}</span>
        </div>
        <h2 style={{ margin:'0 0 10px', fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, letterSpacing:'-0.02em', color:'#1d1d1f', lineHeight:1.15 }}>{data.title}</h2>
        <p style={{
          margin:'0 0 16px', padding:'12px 14px', borderRadius:10, fontSize:13, lineHeight:1.5,
          background:`${data.c}08`, color:'#3a3a3d', border:`1px solid ${data.c}25`,
        }}>{data.hl}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {data.pts.map((p, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'8px 10px', background:'#FAFAFB', borderRadius:8, border:'1px solid #ECECEF' }}>
              <span style={{
                width:6, height:6, borderRadius:'50%',
                background: tagColor[p.tag],
                flexShrink:0, marginTop:6,
              }}/>
              <span style={{ fontSize:12.5, color:'#3a3a3d', lineHeight:1.45, flex:1 }}>{p.txt}</span>
              <span style={{
                fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                color: tagColor[p.tag],
                padding:'2px 7px', borderRadius:4,
                background: `${tagColor[p.tag]}15`,
                flexShrink:0, marginLeft:'auto',
              }}>{p.tag.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel lateral: gauge + métricas */}
      <aside style={{
        background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:12, padding:'16px 16px',
        display:'flex', flexDirection:'column', gap:12,
      }}>
        <Gauge value={data.score} delta={data.delta} color={data.c}/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
          {data.metrics.map(m => (
            <div key={m.l} style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:8, padding:'8px 8px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:data.c, letterSpacing:'-0.014em', lineHeight:1 }}>{m.v}{m.d ? <span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>{m.d}</span> : null}</div>
              <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.05em', textTransform:'uppercase', marginTop:3, lineHeight:1.2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

// Gauge semicircular para el score 0-100
function Gauge({ value, delta, color }: { value: number, delta: number, color: string }) {
  const cx = 90, cy = 80, r = 60
  const t = Math.max(0, Math.min(1, value / 100))
  const angleEnd = Math.PI * t
  const xEnd = cx - r * Math.cos(angleEnd)
  const yEnd = cy - r * Math.sin(angleEnd)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${xEnd} ${yEnd}`
  const arcBg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const deltaColor = delta > 0 ? '#16A34A' : delta < 0 ? '#DC2626' : '#6e6e73'
  return (
    <div style={{ textAlign:'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={arcBg} fill="none" stroke="#ECECEF" strokeWidth="10" strokeLinecap="round"/>
        <path d={arc} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
        <circle cx={xEnd} cy={yEnd} r="6" fill={color}/>
      </svg>
      <div style={{ marginTop:-8 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:color, letterSpacing:'-0.024em', lineHeight:1 }}>{value}<span style={{ fontSize:14, color:'#86868b', fontWeight:500 }}>/100</span></div>
        <div style={{ fontSize:10.5, fontWeight:700, color:deltaColor, marginTop:3 }}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'} {Math.abs(delta)} pp vs ayer
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI compartidos
// ─────────────────────────────────────────────────────────────────────────
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

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  // Área bajo la línea
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}
