'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// Niveles de alerta — orden ascendente de gravedad
type Level = 'amarillo' | 'naranja' | 'rojo' | 'rojo-parpadeante'

const LEVEL_META: Record<Level, { label: string; color: string; bg: string; ring: string; pulse?: boolean }> = {
  'amarillo':         { label:'BAJA',     color:'#EAB308', bg:'rgba(234,179,8,0.10)',   ring:'rgba(234,179,8,0.45)'   },
  'naranja':          { label:'MEDIA',    color:'#F97316', bg:'rgba(249,115,22,0.10)',  ring:'rgba(249,115,22,0.50)'  },
  'rojo':             { label:'ALTA',     color:'#DC2626', bg:'rgba(220,38,38,0.10)',   ring:'rgba(220,38,38,0.50)'   },
  'rojo-parpadeante': { label:'CRÍTICA',  color:'#7F1D1D', bg:'rgba(127,29,29,0.16)',   ring:'rgba(127,29,29,0.7)', pulse:true },
}

const LEVELS: Level[] = ['rojo-parpadeante','rojo','naranja','amarillo']

type Alerta = {
  id: string
  level: Level
  category: 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'
  title: string
  description: string
  source: string
  ts: string
}

const ALERTAS: Alerta[] = [
  { id:'a01', level:'rojo-parpadeante', category:'Riesgo',      title:'Prima de riesgo supera 110 pb',
    description:'El diferencial con el Bund alcanza 112 pb tras tercera sesión consecutiva al alza. Tesoro convoca reunión extraordinaria.',
    source:'Tesoro Público', ts:'18:42 · hoy' },
  { id:'a02', level:'rojo-parpadeante', category:'Gobierno',    title:'Junts retira apoyo a la legislatura',
    description:'Comunicado oficial: condicionan reincorporación a transferencia integral del IRPF antes del 30 jun.',
    source:'Junts per Catalunya', ts:'17:15 · hoy' },
  { id:'a03', level:'rojo',             category:'Parlamento',  title:'Decreto-ley convalidación al límite',
    description:'Mañana 11:00h se vota convalidación del decreto-ley 4/2026. Margen estimado: ±2 escaños.',
    source:'Congreso · Pleno', ts:'16:30 · hoy' },
  { id:'a04', level:'rojo',             category:'Mercados',    title:'IBEX 35 cae −1,8% en sesión',
    description:'El selectivo cierra en 11.040 puntos arrastrado por bancos (-2,4%) e inmobiliario (-3,1%).',
    source:'BME · cierre 17:35', ts:'17:35 · hoy' },
  { id:'a05', level:'naranja',          category:'Encuestas',   title:'PP supera 33% en sondeo Sigma Dos',
    description:'Tracking diario: PP 33,2% (+0,4) · PSOE 26,1% (-0,3) · VOX 12,8% (+0,2). Trabajo de campo 24-26 abr.',
    source:'Sigma Dos / El Mundo', ts:'14:00 · hoy' },
  { id:'a06', level:'naranja',          category:'Geopolítica', title:'Aranceles EE.UU. al sector agroalimentario',
    description:'Anuncio aranceles 12% sobre aceite de oliva y vino tinto. Impacto estimado: 380 M€ exportaciones.',
    source:'USTR · Washington', ts:'13:20 · hoy' },
  { id:'a07', level:'naranja',          category:'Parlamento',  title:'PNV exige reunión bilateral antes 15 mayo',
    description:'Ortuzar advierte que sin avances en transferencia ferroviaria revisará apoyos.',
    source:'EAJ-PNV · prensa', ts:'17:45 · ayer' },
  { id:'a08', level:'amarillo',         category:'Medios',      title:'#MociónCensura trending top 1 nacional',
    description:'56k tweets en 4 horas tras intervención de Feijóo. Sentimiento neto: -0,42 (negativo).',
    source:'Politeia · Monitor RRSS', ts:'12:30 · hoy' },
  { id:'a09', level:'amarillo',         category:'Encuestas',   title:'Sumar pierde 0,8 pp en franja 25-44',
    description:'Tracking sociológico interno: el desgaste se concentra en clase media urbana.',
    source:'Politeia Lab', ts:'10:50 · hoy' },
  { id:'a10', level:'amarillo',         category:'Gobierno',    title:'Sánchez recibe a presidentes autonómicos',
    description:'Reunión informal con CCAA del PSOE el viernes para coordinar narrativa presupuestaria.',
    source:'Moncloa', ts:'09:15 · hoy' },
  { id:'a11', level:'rojo',             category:'Riesgo',      title:'Riesgo político sube a 38/100 (MEDIO-ALTO)',
    description:'El Termómetro de Riesgo Político salta 12 puntos en 48h por confluencia de factores.',
    source:'Politeia · Termómetro', ts:'08:00 · hoy' },
]

const CATS = ['Todas','Mercados','Gobierno','Parlamento','Encuestas','Geopolítica','Medios','Riesgo'] as const

export default function AlertasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterLevel, setFilterLevel] = useState<Level | 'todas'>('todas')
  const [filterCat, setFilterCat] = useState<typeof CATS[number]>('Todas')

  const counts = useMemo(() => {
    const out: Record<Level, number> = { 'amarillo':0, 'naranja':0, 'rojo':0, 'rojo-parpadeante':0 }
    for (const a of ALERTAS) out[a.level]++
    return out
  }, [])

  const filtered = useMemo(() => {
    return ALERTAS.filter(a =>
      (filterLevel === 'todas' || a.level === filterLevel) &&
      (filterCat === 'Todas' || a.category === filterCat)
    ).sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
  }, [filterLevel, filterCat])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg,#1d1d1f 0%,#0a0a0a 100%)',
          borderRadius: 22, padding: '32px 40px', marginBottom: 22, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55, margin: '0 0 8px' }}>
              SALA DE CONTROL · ALERTAS EN TIEMPO REAL
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {counts['rojo-parpadeante']} alertas <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#ef4444' }}>críticas activas</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>{ALERTAS.length} alertas en seguimiento · clasificación de gravedad por color · actualización continua</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {LEVELS.map(lv => {
              const m = LEVEL_META[lv]
              return (
                <div key={lv} style={{
                  textAlign: 'center', padding: '14px 8px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${m.ring}`,
                }}>
                  <span style={{
                    display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                    background: m.color, marginBottom: 6,
                    animation: m.pulse ? 'alertPulse 1.4s ease-in-out infinite' : undefined,
                    boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                  }}/>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1, color: m.color }}>{counts[lv]}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.7, marginTop: 4 }}>{m.label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Nivel:</span>
          <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
            {(['todas',...LEVELS] as const).map(lv => {
              const active = filterLevel === lv
              const m = lv !== 'todas' ? LEVEL_META[lv as Level] : null
              return (
                <button key={lv} onClick={() => setFilterLevel(lv)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? (m?.color || '#1d1d1f') : '#6e6e73',
                  border: 'none', borderRadius: 999, padding: '5px 12px',
                  fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  letterSpacing: lv === 'todas' ? '-0.005em' : '0.06em',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {m && <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }}/>}
                  {lv === 'todas' ? 'Todas' : m?.label}
                </button>
              )
            })}
          </div>
          <span style={{ width: 1, height: 22, background: '#ECECEF', margin: '0 4px' }}/>
          <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Categoría:</span>
          <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {CATS.map(c => {
              const active = filterCat === c
              return (
                <button key={c} onClick={() => setFilterCat(c)} style={{
                  background: active ? '#1F4E8C' : '#fff',
                  color: active ? '#fff' : '#3a3a3d',
                  border: '1px solid ' + (active ? '#1F4E8C' : '#ECECEF'),
                  borderRadius: 8, padding: '4px 10px',
                  fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 140ms',
                }}>{c}</button>
              )
            })}
          </div>
        </div>

        {/* Lista de alertas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
              Sin alertas que coincidan con el filtro.
            </div>
          )}
          {filtered.map(a => {
            const m = LEVEL_META[a.level]
            return (
              <article key={a.id} style={{
                display: 'grid', gridTemplateColumns: '6px 110px 1fr auto', gap: 14, alignItems: 'center',
                padding: '14px 18px 14px 0', borderRadius: 14,
                background: m.bg, border: `1px solid ${m.ring}`,
                position: 'relative', overflow: 'hidden',
                animation: m.pulse ? 'alertCard 1.6s ease-in-out infinite' : undefined,
              }}>
                <div style={{
                  background: m.color, height: '100%',
                  boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                }}/>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
                    color: '#fff', background: m.color,
                    padding: '3px 8px', borderRadius: 999,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    animation: m.pulse ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
                    boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
                  }}>
                    {m.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'alertDot 1s ease-in-out infinite' }}/>}
                    {m.label}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em' }}>{a.category.toUpperCase()}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f' }}>{a.title}</h3>
                  <p style={{ margin: '3px 0 6px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>{a.description}</p>
                  <span style={{ fontSize: 11, color: '#6e6e73' }}>{a.source} · <span style={{ fontWeight: 600 }}>{a.ts}</span></span>
                </div>
                <button style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                  padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}>Detalle →</button>
              </article>
            )
          })}
        </div>

        <style>{`
          @keyframes alertPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.92); } }
          @keyframes alertDot   { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes alertCard  { 0%, 100% { box-shadow: 0 0 0 0 rgba(185,28,28,0); } 50% { box-shadow: 0 0 22px -2px rgba(185,28,28,0.45); } }
        `}</style>
      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Sala de Control · Alertas · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
