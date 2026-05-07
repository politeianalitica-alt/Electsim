'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Datos · campaña electoral mockup
// ─────────────────────────────────────────────────────────────────────────
const ELECCIONES_FECHA = new Date(2026, 7, 10) // 10 agosto 2026 (mes index 7)

const CANDIDATO = {
  nombre: 'Alberto Núñez Feijóo',
  partido: 'Partido Popular',
  color: '#1F4E8C',
  iniciales: 'AF',
  cargo: 'Candidato a la Presidencia del Gobierno',
}

// Estado actual de encuestas (tracker)
const ENCUESTAS = [
  { fecha:'05/05/2026', casa:'Sigma Dos',     cliente:'El Mundo',  pp:33.2, psoe:26.4, vox:12.8, sumar:10.1, otros:17.5 },
  { fecha:'02/05/2026', casa:'GAD3',          cliente:'ABC',        pp:33.0, psoe:26.7, vox:12.5, sumar:10.5, otros:17.3 },
  { fecha:'29/04/2026', casa:'CIS',           cliente:'Gobierno',   pp:30.5, psoe:28.2, vox:11.8, sumar:11.2, otros:18.3 },
  { fecha:'25/04/2026', casa:'Metroscopia',   cliente:'El País',    pp:32.3, psoe:27.1, vox:12.6, sumar: 9.8, otros:18.2 },
  { fecha:'20/04/2026', casa:'40dB',          cliente:'SER · Prisa',pp:31.8, psoe:27.5, vox:12.2, sumar:10.4, otros:18.1 },
  { fecha:'15/04/2026', casa:'NC Report',     cliente:'La Razón',   pp:33.5, psoe:25.8, vox:13.2, sumar: 9.8, otros:17.7 },
]

// KPIs del estado actual
const ESTADO = {
  intencionPP: 32.1,
  diferencialPSOE: +5.3,   // pp - psoe
  intencionPSOE: 26.8,
  participacionPrev: 71.5,
  conocimiento: 92,         // %
  valoracion: 4.2,          // /10
  imagenLider: 4.4,
  voluntarios: 8420,
  localesAbiertos: 142,
  socios: 38,               // potenciales socios alcanzados
}

// Equipo central (war room)
type Rol = 'Director' | 'Estrategia' | 'Comunicación' | 'Datos' | 'Digital' | 'Ground game' | 'Finanzas' | 'Legal' | 'Crisis'
type Miembro = { rol: Rol; nombre: string; estado: 'En war room' | 'En terreno' | 'Remoto' | 'Reunión'; ult: string }
const EQUIPO: Miembro[] = [
  { rol:'Director',     nombre:'Miguel Tellado',           estado:'En war room', ult:'Hace 3 min' },
  { rol:'Estrategia',   nombre:'Elías Bendodo',            estado:'En reunión' as any, ult:'Hace 12 min' } as Miembro,
  { rol:'Comunicación', nombre:'Borja Sémper',             estado:'En terreno',  ult:'En Pamplona, evento territorial' },
  { rol:'Datos',        nombre:'Ana Beltrán',              estado:'En war room', ult:'Hace 5 min' },
  { rol:'Digital',      nombre:'Pablo Hispán',             estado:'Remoto',      ult:'Vídeo TikTok 17h' },
  { rol:'Ground game',  nombre:'Carmen Fúnez',             estado:'En terreno',  ult:'Coordinación voluntarios Madrid' },
  { rol:'Finanzas',     nombre:'Juan Bravo',               estado:'En war room', ult:'Cierre semanal' },
  { rol:'Legal',        nombre:'Esteban González Pons',    estado:'Remoto',      ult:'Briefing JEC' },
  { rol:'Crisis',       nombre:'Cuca Gamarra',             estado:'En war room', ult:'Reunión 09:00' },
]

const ROL_COLOR: Record<Rol, string> = {
  'Director':'#1F4E8C', 'Estrategia':'#5B21B6', 'Comunicación':'#7C3AED',
  'Datos':'#0EA5E9', 'Digital':'#DC2626', 'Ground game':'#16A34A',
  'Finanzas':'#B45309', 'Legal':'#0F766E', 'Crisis':'#F97316',
}

const ESTADO_META = {
  'En war room':{color:'#16A34A'}, 'En terreno':{color:'#0EA5E9'},
  'Remoto':{color:'#6e6e73'}, 'En reunión':{color:'#F97316'},
  'Reunión':{color:'#F97316'},
} as Record<string, { color: string }>

// Calendario de actos próximos
type Acto = {
  fecha: string; hora: string; tipo: 'Mitin' | 'Acto territorial' | 'Debate' | 'Rueda de prensa' | 'Entrevista' | 'Reunión interna' | 'Visita';
  titulo: string; ubicacion: string; aforo?: number; coverage: 'TV nacional' | 'Prensa nacional' | 'Solo regional' | 'Streaming'; estado: 'Confirmado' | 'Pendiente' | 'Cancelado'
}

const TIPO_COLOR = {
  'Mitin':'#DC2626', 'Acto territorial':'#1F4E8C', 'Debate':'#5B21B6',
  'Rueda de prensa':'#0EA5E9', 'Entrevista':'#7C3AED',
  'Reunión interna':'#525258', 'Visita':'#16A34A',
} as Record<string, string>

const AGENDA: Acto[] = [
  { fecha:'06/05/2026', hora:'09:00', tipo:'Reunión interna', titulo:'Comité de Campaña · briefing diario',                        ubicacion:'Génova 13, Madrid',           coverage:'Solo regional',  estado:'Confirmado' },
  { fecha:'06/05/2026', hora:'13:00', tipo:'Rueda de prensa', titulo:'Comparecencia post-Junta Directiva',                          ubicacion:'Génova 13, Madrid',           coverage:'TV nacional',    estado:'Confirmado' },
  { fecha:'06/05/2026', hora:'19:00', tipo:'Acto territorial',titulo:'Encuentro con autónomos del comercio',                        ubicacion:'Sevilla · Hotel Alfonso XIII',aforo:280,  coverage:'Prensa nacional',estado:'Confirmado' },
  { fecha:'07/05/2026', hora:'10:30', tipo:'Visita',          titulo:'Visita al puerto de Algeciras · sector logístico',           ubicacion:'Algeciras, Cádiz',            coverage:'Solo regional',  estado:'Confirmado' },
  { fecha:'07/05/2026', hora:'21:00', tipo:'Entrevista',      titulo:'Entrevista en exclusiva · Carlos Alsina (Onda Cero)',         ubicacion:'Estudios Atresmedia',         coverage:'Prensa nacional',estado:'Confirmado' },
  { fecha:'08/05/2026', hora:'12:00', tipo:'Mitin',           titulo:'Gran mitin de campaña · Plaza de toros',                      ubicacion:'Valencia',                    aforo:8500, coverage:'TV nacional',    estado:'Confirmado' },
  { fecha:'09/05/2026', hora:'19:30', tipo:'Acto territorial',titulo:'Día de Europa · acto con eurodiputados',                       ubicacion:'Madrid · Auditorio Mutua',    aforo:1200, coverage:'Prensa nacional',estado:'Confirmado' },
  { fecha:'12/05/2026', hora:'21:30', tipo:'Debate',          titulo:'Debate televisado · TVE',                                      ubicacion:'TVE Prado del Rey',           coverage:'TV nacional',    estado:'Pendiente'  },
  { fecha:'14/05/2026', hora:'19:00', tipo:'Mitin',           titulo:'Mitin de cierre regional · Andalucía',                         ubicacion:'Málaga · Cortijo de Torres',  aforo:6500, coverage:'TV nacional',    estado:'Confirmado' },
]

const ESTADO_ACTO = { 'Confirmado':'#16A34A', 'Pendiente':'#F97316', 'Cancelado':'#DC2626' } as Record<string, string>

// Mapa estratégico territorial · provincias prioritarias
type Prioridad = 'Crítica' | 'Alta' | 'Media' | 'Mantener'
type ProvinciaCampaña = { prov: string; ccaa: string; prioridad: Prioridad; intencion: number; gap: number; recursos: number; voluntarios: number }
const TERRITORIO: ProvinciaCampaña[] = [
  { prov:'Madrid',            ccaa:'Madrid',          prioridad:'Mantener', intencion:38.2, gap:+11.4, recursos: 22, voluntarios: 1820 },
  { prov:'Barcelona',          ccaa:'Cataluña',        prioridad:'Alta',     intencion:18.4, gap:-8.2,  recursos: 18, voluntarios: 920  },
  { prov:'Valencia',           ccaa:'C. Valenciana',   prioridad:'Crítica',  intencion:31.8, gap:+2.4,  recursos: 16, voluntarios: 740  },
  { prov:'Sevilla',            ccaa:'Andalucía',       prioridad:'Crítica',  intencion:30.5, gap:+1.8,  recursos: 14, voluntarios: 680  },
  { prov:'Málaga',             ccaa:'Andalucía',       prioridad:'Alta',     intencion:34.1, gap:+6.2,  recursos:  8, voluntarios: 510  },
  { prov:'Zaragoza',           ccaa:'Aragón',          prioridad:'Crítica',  intencion:30.2, gap:+1.2,  recursos: 10, voluntarios: 420  },
  { prov:'Bizkaia',            ccaa:'País Vasco',      prioridad:'Mantener', intencion:14.8, gap:-12.5, recursos:  3, voluntarios: 220  },
  { prov:'A Coruña',           ccaa:'Galicia',         prioridad:'Mantener', intencion:36.4, gap:+9.8,  recursos:  5, voluntarios: 380  },
  { prov:'Murcia',             ccaa:'Murcia',          prioridad:'Mantener', intencion:40.2, gap:+13.5, recursos:  4, voluntarios: 290  },
  { prov:'Las Palmas',         ccaa:'Canarias',        prioridad:'Alta',     intencion:28.4, gap:+0.8,  recursos:  6, voluntarios: 240  },
  { prov:'Pontevedra',         ccaa:'Galicia',         prioridad:'Media',    intencion:32.5, gap:+5.4,  recursos:  4, voluntarios: 240  },
  { prov:'Alicante',           ccaa:'C. Valenciana',   prioridad:'Alta',     intencion:33.8, gap:+5.2,  recursos:  7, voluntarios: 360  },
]

const PRIO_COLOR: Record<Prioridad, string> = {
  'Crítica':'#DC2626', 'Alta':'#F97316', 'Media':'#EAB308', 'Mantener':'#16A34A',
}

// Mensaje del día · narrativa
const MENSAJE = {
  titular: 'Cada día con el Gobierno es un día más de bloqueo y deterioro institucional.',
  subtitular: 'Los españoles merecen la posibilidad de elegir un cambio que recupere la sensatez económica y la unidad del país.',
  pilares: [
    { p:'Recuperar la sensatez económica', detalle:'Bajada del IRPF, simplificación fiscal, plan choque para autónomos' },
    { p:'Restaurar la unidad y la igualdad', detalle:'Derogar la amnistía, recuperar el Estado de derecho' },
    { p:'Estabilidad institucional',          detalle:'Pactos de Estado para CGPJ, RTVE, financiación autonómica' },
  ],
  contraste:'PSOE depende de Junts y Bildu para sobrevivir; nosotros gobernaremos con todos los españoles.',
  evitar:[
    'Detalles del pacto con VOX en CCAA',
    'Conflictos internos del partido',
    'Polémica con la Iglesia sobre IRPF',
  ],
  hashtag: '#TiempoDeCambio',
}

// Presupuesto de campaña
const PRESUP_TOTAL = 12500     // K€
const PRESUP_GASTADO = 4280    // K€
const PRESUPUESTO = [
  { concepto:'Publicidad TV',              gastado:1450, presupuestado:3200, color:'#1F4E8C' },
  { concepto:'Publicidad digital y redes', gastado:1180, presupuestado:2500, color:'#DC2626' },
  { concepto:'Mítines y actos',            gastado: 720, presupuestado:1800, color:'#F97316' },
  { concepto:'Material y merchandising',   gastado: 360, presupuestado: 850, color:'#16A34A' },
  { concepto:'Equipo y consultoras',       gastado: 380, presupuestado:1200, color:'#5B21B6' },
  { concepto:'Logística y desplazamientos',gastado: 190, presupuestado: 950, color:'#0EA5E9' },
]

// Crisis radar · alertas activas
type Crisis = { id: string; titulo: string; severidad: 'CRÍTICA' | 'ALTA' | 'MEDIA'; tipo: string; estado: 'Activa' | 'Contenida' }
const CRISIS_LIST: Crisis[] = [
  { id:'c1', titulo:'Deepfake Feijóo en TikTok · "elecciones anticipadas"',        severidad:'ALTA',    tipo:'Tecnológica', estado:'Contenida' },
  { id:'c2', titulo:'Ataque coordinado #FeijóoElecciones · 412 cuentas',           severidad:'MEDIA',   tipo:'Mediática',   estado:'Activa'    },
  { id:'c3', titulo:'Tensión interna pacto autonómico Castilla y León con VOX',    severidad:'MEDIA',   tipo:'Política',    estado:'Activa'    },
]
const SEV_CRI = { 'CRÍTICA':'#DC2626', 'ALTA':'#F97316', 'MEDIA':'#EAB308' } as Record<string, string>

// Tareas críticas del día
type Tarea = { tarea: string; resp: string; plazo: string; estado: 'Pendiente' | 'En curso' | 'Completada' }
const TAREAS: Tarea[] = [
  { tarea:'Cierre nota de prensa · medidas autónomos',     resp:'Borja Sémper',    plazo:'12:00', estado:'En curso'   },
  { tarea:'Briefing técnico para entrevista Alsina (21h)', resp:'Equipo prensa',  plazo:'18:00', estado:'Pendiente'  },
  { tarea:'Cierre del cartel del mitin de Valencia',        resp:'Carmen Fúnez',   plazo:'15:00', estado:'Completada' },
  { tarea:'Aprobar copy creatividades digitales semana',    resp:'Pablo Hispán',   plazo:'14:00', estado:'En curso'   },
  { tarea:'Reunión bilateral con Coalición Canaria',        resp:'Elías Bendodo',  plazo:'17:00', estado:'Pendiente'  },
  { tarea:'Actualizar respuestas a deepfake TikTok',         resp:'Cuca Gamarra',   plazo:'16:00', estado:'Completada' },
]
const TAR_COLOR = { 'Pendiente':'#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' } as Record<string, string>

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function WarRoomPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Countdown · cálculo en cliente para que no haya hydration mismatch
  const [tiempo, setTiempo] = useState<{ dias: number; horas: number; min: number }>({ dias: 96, horas: 8, min: 12 })
  useEffect(() => {
    const calc = () => {
      const now = Date.now()
      const diff = ELECCIONES_FECHA.getTime() - now
      const dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
      const horas = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24))
      const min = Math.max(0, Math.floor((diff / (1000 * 60)) % 60))
      setTiempo({ dias, horas, min })
    }
    calc()
    const id = setInterval(calc, 30 * 1000)  // refresca cada 30s
    return () => clearInterval(id)
  }, [])

  const presupRestante = PRESUP_TOTAL - PRESUP_GASTADO
  const tareasAbiertas = TAREAS.filter(t => t.estado !== 'Completada').length
  const crisisActivas = CRISIS_LIST.filter(c => c.estado === 'Activa').length

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero / Command Center ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0F172A 0%,#020617 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:0, opacity:0.12, pointerEvents:'none',
            background:'radial-gradient(circle at 80% 20%, #DC2626 0%, transparent 55%), radial-gradient(circle at 20% 80%, #1F4E8C 0%, transparent 55%)' }}/>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:24, alignItems:'center' }}>
            {/* Bloque candidato */}
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:64, height:64, borderRadius:12, background:CANDIDATO.color, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.02em',
                boxShadow:`0 4px 16px ${CANDIDATO.color}80`,
              }}>{CANDIDATO.iniciales}</div>
              <div>
                <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 3px' }}>
                  WAR ROOM · CAMPAÑA EN CURSO
                </p>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, letterSpacing:'-0.014em' }}>{CANDIDATO.nombre}</div>
                <div style={{ fontSize:11.5, opacity:0.7, marginTop:1 }}>{CANDIDATO.partido} · {CANDIDATO.cargo}</div>
              </div>
            </div>
            {/* Countdown */}
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.6, textTransform:'uppercase', margin:'0 0 8px' }}>
                Cuenta atrás · Generales 10 ago 2026
              </p>
              <div style={{ display:'flex', justifyContent:'center', alignItems:'baseline', gap:8 }}>
                <CDNum n={tiempo.dias}    label="DÍAS"  big/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.horas}   label="HORAS"/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.min}     label="MIN"/>
              </div>
            </div>
            {/* KPIs ejecutivos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, minWidth:240 }}>
              <HeroKPI label="Tareas abiertas"  value={String(tareasAbiertas)} accent="#FCA5A5"/>
              <HeroKPI label="Crisis activas"   value={String(crisisActivas)}  accent="#F97316"/>
              <HeroKPI label="Presup. restante" value={`${(presupRestante/1000).toFixed(1)}M€`} accent="#7DD3FC"/>
              <HeroKPI label="Voluntarios"      value={`${(ESTADO.voluntarios/1000).toFixed(1)}K`} accent="#86EFAC"/>
            </div>
          </div>
        </section>

        {/* ───── Snapshot electoral ───── */}
        <section style={{
          display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14,
        }}>
          {/* Snapshot KPIs */}
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Snapshot electoral · {CANDIDATO.partido}</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>Actualizado {ENCUESTAS[0].fecha}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <SKpi big label="Intención de voto" value={`${ESTADO.intencionPP}%`}  delta="+0.4 pp · 7d" deltaPos color={CANDIDATO.color}/>
              <SKpi label="Diferencial PSOE"      value={`+${ESTADO.diferencialPSOE}`} sub="puntos"      delta="+0.6 pp · 7d" deltaPos color={CANDIDATO.color}/>
              <SKpi label="Conocimiento"          value={`${ESTADO.conocimiento}%`}  sub="población adulta" color="#5B21B6"/>
              <SKpi label="Valoración líder"      value={`${ESTADO.valoracion}`}     sub="/10 · CIS"    delta="+0.1 vs mes" deltaPos color="#16A34A"/>
              <SKpi label="Imagen líder"          value={`${ESTADO.imagenLider}`}    sub="/10 · 40dB"   delta="estable" color="#0EA5E9"/>
              <SKpi label="Particip. prevista"    value={`${ESTADO.participacionPrev}%`} sub="estimación" color="#F97316"/>
              <SKpi label="Locales abiertos"      value={`${ESTADO.localesAbiertos}`} sub="48 provincias" color="#16A34A"/>
              <SKpi label="Voluntarios activos"   value={`${ESTADO.voluntarios.toLocaleString('es-ES')}`} sub="reg. esta semana" color={CANDIDATO.color}/>
            </div>
          </div>
          {/* Mensaje del día */}
          <div style={{ background:`linear-gradient(135deg, ${CANDIDATO.color}10, ${CANDIDATO.color}03)`, border:`1px solid ${CANDIDATO.color}40`, borderRadius:14, padding:'18px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{
                fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase',
                padding:'2px 8px', borderRadius:4,
                background:CANDIDATO.color, color:'#fff',
              }}>MENSAJE DEL DÍA</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:CANDIDATO.color }}>{MENSAJE.hashtag}</span>
            </div>
            <h3 style={{ margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, letterSpacing:'-0.012em' }}>
              «{MENSAJE.titular}»
            </h3>
            <p style={{ margin:'0 0 10px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.5 }}>{MENSAJE.subtitular}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
              {MENSAJE.pilares.map((p, i) => (
                <div key={i} style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.45, display:'flex', gap:6 }}>
                  <span style={{ color:CANDIDATO.color, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span><strong style={{ color:'#1d1d1f' }}>{p.p}.</strong> {p.detalle}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 11px', marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Contraste</div>
              <div style={{ fontSize:11, color:'#3a3a3d', fontStyle:'italic' }}>{MENSAJE.contraste}</div>
            </div>
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, padding:'8px 11px' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Evitar comentar</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {MENSAJE.evitar.map(e => (
                  <span key={e} style={{ fontSize:10.5, padding:'2px 7px', borderRadius:999, background:'#fff', border:'1px solid #FECACA', color:'#7F1D1D' }}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───── Calendario de actos · Equipo · Tareas ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
          {/* Agenda */}
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Agenda · próximos 10 días</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{AGENDA.length} actos</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {AGENDA.map((a, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'62px 6px 1fr auto', gap:10, alignItems:'center',
                  padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{a.fecha.slice(0,5)}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, marginTop:2 }}>{a.hora}</div>
                  </div>
                  <div style={{ width:6, height:34, background:TIPO_COLOR[a.tipo], borderRadius:3 }}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'1px 6px', borderRadius:4, background:TIPO_COLOR[a.tipo], color:'#fff' }}>{a.tipo.toUpperCase()}</span>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>· {a.coverage.toUpperCase()}</span>
                      {a.aforo && <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73' }}>· {a.aforo.toLocaleString('es-ES')} aforo</span>}
                    </div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{a.titulo}</div>
                    <div style={{ fontSize:11, color:'#6e6e73', marginTop:1 }}>{a.ubicacion}</div>
                  </div>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 8px', borderRadius:999,
                    background:`${ESTADO_ACTO[a.estado]}15`, color:ESTADO_ACTO[a.estado], border:`1px solid ${ESTADO_ACTO[a.estado]}40`,
                  }}>{a.estado.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipo + Tareas (panel lateral) */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Equipo central */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Equipo central</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {EQUIPO.map(m => (
                  <div key={m.rol} style={{
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:9, alignItems:'center',
                    padding:'7px 9px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9,
                  }}>
                    <div style={{
                      width:30, height:30, borderRadius:'50%', background:ROL_COLOR[m.rol], color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-display)', fontWeight:800, fontSize:10, flexShrink:0,
                    }}>{m.nombre.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:1 }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 5px', borderRadius:3, background:`${ROL_COLOR[m.rol]}15`, color:ROL_COLOR[m.rol] }}>{m.rol.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.nombre}</div>
                      <div style={{ fontSize:9.5, color:'#86868b' }}>{m.ult}</div>
                    </div>
                    <span style={{
                      fontSize:8.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 6px', borderRadius:4,
                      background:`${ESTADO_META[m.estado]?.color || '#6e6e73'}15`,
                      color:ESTADO_META[m.estado]?.color || '#6e6e73',
                      border:`1px solid ${ESTADO_META[m.estado]?.color || '#6e6e73'}40`,
                      whiteSpace:'nowrap',
                    }}>{m.estado.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───── Tareas críticas + Crisis radar ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Tareas críticas del día</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{TAREAS.filter(t => t.estado === 'Completada').length}/{TAREAS.length} completadas</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Tarea','Responsable','Plazo','Estado'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 10px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TAREAS.map((t, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'9px 10px', fontWeight:600, color:'#1d1d1f' }}>{t.tarea}</td>
                    <td style={{ padding:'9px 10px', color:'#3a3a3d', fontSize:11.5 }}>{t.resp}</td>
                    <td style={{ padding:'9px 10px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{t.plazo}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 8px', borderRadius:999,
                        background:`${TAR_COLOR[t.estado]}15`, color:TAR_COLOR[t.estado], border:`1px solid ${TAR_COLOR[t.estado]}40`,
                      }}>{t.estado.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#DC2626' }}>Crisis radar</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{crisisActivas} activa(s)</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {CRISIS_LIST.map(c => (
                <div key={c.id} style={{
                  padding:'10px 12px', borderRadius:9,
                  background:`${SEV_CRI[c.severidad]}10`, border:`1px solid ${SEV_CRI[c.severidad]}40`,
                  borderLeft:`3px solid ${SEV_CRI[c.severidad]}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 6px', borderRadius:4, background:SEV_CRI[c.severidad], color:'#fff' }}>{c.severidad}</span>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>· {c.tipo.toUpperCase()}</span>
                    <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:999, background: c.estado === 'Activa' ? '#DC2626' : '#16A34A', color:'#fff', letterSpacing:'0.06em' }}>{c.estado.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Mapa territorial estratégico ───── */}
        <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Mapa territorial · prioridad de campaña</h3>
            <div style={{ display:'flex', gap:10, fontSize:10.5 }}>
              {(Object.keys(PRIO_COLOR) as Prioridad[]).map(p => (
                <span key={p} style={{ display:'inline-flex', alignItems:'center', gap:5, color:'#3a3a3d' }}>
                  <span style={{ width:9, height:9, borderRadius:2, background:PRIO_COLOR[p] }}/>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Provincia','CCAA','Prioridad','Intención','Gap PSOE','% recursos','Voluntarios'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...TERRITORIO].sort((a,b) => {
                  const order = { 'Crítica':0, 'Alta':1, 'Media':2, 'Mantener':3 } as Record<Prioridad, number>
                  return order[a.prioridad] - order[b.prioridad]
                }).map((t, i) => {
                  const gapColor = t.gap > 0 ? '#16A34A' : '#DC2626'
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#1d1d1f' }}>{t.prov}</td>
                      <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{t.ccaa}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background:PRIO_COLOR[t.prioridad], color:'#fff',
                        }}>{t.prioridad.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:CANDIDATO.color }}>{t.intencion.toFixed(1)}%</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:gapColor }}>{t.gap > 0 ? `+${t.gap}` : t.gap} pp</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${(t.recursos / 22) * 100}%`, height:'100%', background:CANDIDATO.color }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:CANDIDATO.color, minWidth:24, textAlign:'right' }}>{t.recursos}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f', textAlign:'right' }}>{t.voluntarios.toLocaleString('es-ES')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───── Encuestas tracker + Presupuesto ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:14 }}>
          {/* Encuestas */}
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Encuestas · últimas 6 olas</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>Tracker semanal</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Fecha','Casa','Cliente','PP','PSOE','VOX','Sumar','Otros'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENCUESTAS.map((e, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{e.fecha}</td>
                    <td style={{ padding:'8px 8px', fontWeight:600, color:'#1d1d1f' }}>{e.casa}</td>
                    <td style={{ padding:'8px 8px', color:'#6e6e73', fontSize:11 }}>{e.cliente}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1F4E8C' }}>{e.pp}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#E1322D' }}>{e.psoe}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#5BA02E' }}>{e.vox}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#D43F8D' }}>{e.sumar}</td>
                    <td style={{ padding:'8px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#9E9E9E' }}>{e.otros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Presupuesto */}
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Presupuesto de campaña</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{(PRESUP_GASTADO/1000).toFixed(2)}M€ / {(PRESUP_TOTAL/1000).toFixed(2)}M€</span>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ height:10, background:'#F5F5F7', borderRadius:5, overflow:'hidden', marginBottom:5 }}>
                <div style={{ width:`${(PRESUP_GASTADO / PRESUP_TOTAL) * 100}%`, height:'100%', background:`linear-gradient(90deg, ${CANDIDATO.color}, ${CANDIDATO.color}aa)`, borderRadius:5 }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>
                <span>{Math.round((PRESUP_GASTADO / PRESUP_TOTAL) * 100)}% ejecutado</span>
                <span>Restante: {((PRESUP_TOTAL - PRESUP_GASTADO)/1000).toFixed(2)}M€</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {PRESUPUESTO.map(p => {
                const pct = (p.gastado / p.presupuestado) * 100
                return (
                  <div key={p.concepto}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11.5 }}>
                      <span style={{ color:'#1d1d1f', fontWeight:600 }}>{p.concepto}</span>
                      <span style={{ fontFamily:'var(--font-display)', color:p.color, fontWeight:700 }}>{p.gastado}K€<span style={{ color:'#86868b', fontWeight:500 }}> / {p.presupuestado}K€</span></span>
                    </div>
                    <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:p.color, borderRadius:3 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        War Room de Campaña · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function CDNum({ n, label, big = false }: { n: number, label: string, big?: boolean }) {
  return (
    <div style={{ textAlign:'center', minWidth: big ? 70 : 50 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize: big ? 48 : 28, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.04em' }}>{String(n).padStart(2,'0')}</div>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.6, marginTop:6, color:'#fff' }}>{label}</div>
    </div>
  )
}

function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div style={{ textAlign:'center', padding:'9px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:`1px solid ${accent}55` }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.75, marginTop:4, color:accent }}>{label}</div>
    </div>
  )
}

function SKpi({ label, value, sub, delta, deltaPos, color, big = false }: { label:string, value:string, sub?:string, delta?:string, deltaPos?:boolean, color:string, big?:boolean }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding: big ? '12px 14px' : '10px 12px' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:3 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize: big ? 24 : 18, fontWeight:700, color, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
      </div>
      {delta && (
        <div style={{ fontSize:10, fontWeight:700, color: deltaPos ? '#16A34A' : '#DC2626', marginTop:3 }}>
          {deltaPos ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  )
}
