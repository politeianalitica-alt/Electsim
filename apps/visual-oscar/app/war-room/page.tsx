'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useWarRoom, useWarRoomCrisis, useWarRoomTareas, useCountdown } from '@/hooks/war-room'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { CDNum } from './_components/CDNum'
import { HeroKPI } from './_components/HeroKPI'
import { SKpi } from './_components/SKpi'
import type { RolEquipo, EstadoMiembro, TipoActo, PrioridadTerritorio, SeveridadCrisis, EstadoTarea } from '@/types/war-room'

// ─── Presentation-only colour maps ────────────────────────
const ROL_COLOR: Record<RolEquipo, string> = {
  'Director':'#1F4E8C', 'Estrategia':'#5B21B6', 'Comunicación':'#7C3AED',
  'Datos':'#0EA5E9', 'Digital':'#DC2626', 'Ground game':'#16A34A',
  'Finanzas':'#B45309', 'Legal':'#0F766E', 'Crisis':'#F97316',
}
const ESTADO_META: Record<EstadoMiembro, { color: string }> = {
  'En war room': { color: '#16A34A' }, 'En terreno': { color: '#0EA5E9' },
  'Remoto': { color: '#6e6e73' }, 'En reunión': { color: '#F97316' }, 'Reunión': { color: '#F97316' },
}
const TIPO_COLOR: Record<TipoActo, string> = {
  'Mitin':'#DC2626', 'Acto territorial':'#1F4E8C', 'Debate':'#5B21B6',
  'Rueda de prensa':'#0EA5E9', 'Entrevista':'#7C3AED',
  'Reunión interna':'#525258', 'Visita':'#16A34A',
}
const ESTADO_ACTO: Record<string, string> = { 'Confirmado':'#16A34A', 'Pendiente':'#F97316', 'Cancelado':'#DC2626' }
const PRIO_COLOR: Record<PrioridadTerritorio, string> = {
  'Crítica':'#DC2626', 'Alta':'#F97316', 'Media':'#EAB308', 'Mantener':'#16A34A',
}
const SEV_CRI: Record<SeveridadCrisis, string> = { 'CRÍTICA':'#DC2626', 'ALTA':'#F97316', 'MEDIA':'#EAB308' }
const TAR_COLOR: Record<EstadoTarea, string> = { 'Pendiente':'#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' }

// ─── Mock data nuevo (en cliente) · datos sintéticos realistas ────

interface OpsAlert { label: string; value: string; sub: string; color: string }
interface Decision { id: string; titulo: string; resp: string; deadline: string; prioridad: 'CRÍTICA' | 'ALTA' | 'MEDIA'; tipo: string }
interface Adversario { partido: string; color: string; declaracion: string; quien: string; cuando: string; sentimiento: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO' }
interface MediaItem { medio: string; tipo: 'TV' | 'RADIO' | 'PRENSA' | 'DIGITAL'; titular: string; alcance: number; sentiment: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO'; hora: string }
interface WarGame { titulo: string; tipo: string; probabilidad: number; respuesta: string; color: string; tiempo_max: string }
interface TalkingPoint { tema: string; mencs: number; sent: number; tendencia: 'subiendo' | 'estable' | 'bajando' }
interface Endorsement { quien: string; rol: string; donde: string; cuando: string; impacto: 'ALTO' | 'MEDIO' }
interface Donacion { donante: string; cantidad: number; tipo: 'pequeño' | 'grande' | 'PAC'; cuando: string }
interface VolActivity { accion: string; voluntario: string; localidad: string; cantidad: number; cuando: string; tipo: 'puerta' | 'llamada' | 'evento' | 'redes' }
interface OppAlert { titulo: string; fuente: string; gravedad: 'ALTA' | 'MEDIA' | 'BAJA'; cuando: string }

const OPS_ALERTS: OpsAlert[] = [
  { label: 'Decisiones pendientes', value: '7', sub: '2 críticas · 5 altas', color: '#F97316' },
  { label: 'Crisis activas', value: '3', sub: '1 crítica · narrativa', color: '#DC2626' },
  { label: 'War games preparados', value: '4', sub: 'Listos para ejecutar', color: '#5B21B6' },
  { label: 'Voluntarios hoy', value: '1.247', sub: 'En 38 provincias', color: '#16A34A' },
  { label: 'Donaciones 24h', value: '€42.380', sub: '218 donantes nuevos', color: '#0EA5E9' },
]

const DECISIONES: Decision[] = [
  { id: 'd-001', titulo: 'Aprobación contenido spot televisivo nacional · 30s', resp: 'Comunicación', deadline: '2h 15m', prioridad: 'CRÍTICA', tipo: 'Comunicación' },
  { id: 'd-002', titulo: 'Confirmar asistencia a debate TVE 18 mayo', resp: 'Director', deadline: '4h', prioridad: 'CRÍTICA', tipo: 'Agenda' },
  { id: 'd-003', titulo: 'Refuerzo de seguridad en mitin Andalucía 16 mayo', resp: 'Crisis', deadline: 'Hoy', prioridad: 'ALTA', tipo: 'Operativa' },
  { id: 'd-004', titulo: 'Selección portavoces para entrevistas radio mañana', resp: 'Comunicación', deadline: 'Hoy 18:00', prioridad: 'ALTA', tipo: 'Comunicación' },
  { id: 'd-005', titulo: 'Activación campaña digital adversaria · 80k€ presupuesto', resp: 'Digital', deadline: 'Mañana', prioridad: 'ALTA', tipo: 'Digital' },
  { id: 'd-006', titulo: 'Aprobar pagos proveedores semana 19', resp: 'Finanzas', deadline: '24h', prioridad: 'ALTA', tipo: 'Finanzas' },
  { id: 'd-007', titulo: 'Plan de contingencia mitin Madrid Las Ventas', resp: 'Ground game', deadline: '48h', prioridad: 'MEDIA', tipo: 'Operativa' },
]

const ADVERSARIO_FEED: Adversario[] = [
  { partido: 'PSOE', color: '#E1322D', declaracion: 'Sánchez asegura que «el Gobierno tiene mayoría suficiente para los Presupuestos 2027»', quien: 'P. Sánchez · presidente Gobierno', cuando: 'hace 47 min', sentimiento: 'POSITIVO' },
  { partido: 'PSOE', color: '#E1322D', declaracion: '«No habrá adelanto electoral en 2026, agotaremos la legislatura»', quien: 'Pilar Alegría · ministra portavoz', cuando: 'hace 2h', sentimiento: 'POSITIVO' },
  { partido: 'PSOE', color: '#E1322D', declaracion: 'María Jesús Montero anuncia subida del 4% del SMI para 2027', quien: 'María J. Montero · vicepresidenta', cuando: 'hace 4h', sentimiento: 'POSITIVO' },
  { partido: 'VOX', color: '#5BA02E', declaracion: 'Abascal pide «cárcel para los responsables de la corrupción gubernamental»', quien: 'S. Abascal · presidente VOX', cuando: 'hace 1h', sentimiento: 'NEGATIVO' },
  { partido: 'VOX', color: '#5BA02E', declaracion: 'VOX presentará querella contra el fiscal general por presuntas filtraciones', quien: 'Iván Espinosa · portavoz', cuando: 'hace 3h', sentimiento: 'NEGATIVO' },
  { partido: 'SUMAR', color: '#D43F8D', declaracion: 'Yolanda Díaz exige «cumplimiento íntegro» del acuerdo de coalición', quien: 'Y. Díaz · vicepresidenta 2ª', cuando: 'hace 35 min', sentimiento: 'NEUTRO' },
  { partido: 'SUMAR', color: '#D43F8D', declaracion: 'Sumar votará en contra del decreto si no incluye reducción jornada laboral', quien: 'Ernest Urtasun · portavoz', cuando: 'hace 5h', sentimiento: 'NEGATIVO' },
]

const MEDIA_MONITOR: MediaItem[] = [
  { medio: 'TVE La 1 · Telediario', tipo: 'TV', titular: 'Cobertura sondeo CIS · empate técnico PSOE-PP', alcance: 1820000, sentiment: 'NEUTRO', hora: '21:05' },
  { medio: 'Antena 3 · Espejo Público', tipo: 'TV', titular: 'Entrevista Cuca Gamarra · «el Gobierno está acabado»', alcance: 720000, sentiment: 'NEGATIVO', hora: '09:30' },
  { medio: 'Cadena SER · Hora 25', tipo: 'RADIO', titular: 'Análisis editorial · campaña en marcha', alcance: 1340000, sentiment: 'NEUTRO', hora: '20:00' },
  { medio: 'COPE · Herrera en COPE', tipo: 'RADIO', titular: 'Editorial crítico contra el adelanto electoral', alcance: 1850000, sentiment: 'NEGATIVO', hora: '07:00' },
  { medio: 'El País · Portada', tipo: 'PRENSA', titular: 'El Gobierno acelera la negociación de los PGE 2027', alcance: 540000, sentiment: 'POSITIVO', hora: '06:00' },
  { medio: 'El Mundo · Portada', tipo: 'PRENSA', titular: '«Sánchez en el alambre» · análisis Lucía Méndez', alcance: 480000, sentiment: 'NEGATIVO', hora: '06:00' },
  { medio: 'ABC · Portada', tipo: 'PRENSA', titular: 'Feijóo plantea moción de censura constructiva', alcance: 320000, sentiment: 'NEGATIVO', hora: '06:00' },
  { medio: 'elDiario.es · Trending', tipo: 'DIGITAL', titular: 'La realidad detrás de la encuesta del CIS', alcance: 290000, sentiment: 'POSITIVO', hora: '18:30' },
]

const WAR_GAMES: WarGame[] = [
  { titulo: 'Moción de censura PP', tipo: 'Político · Parlamentario', probabilidad: 18, respuesta: 'Activación protocolo defensa parlamentaria + agenda mediática contraataque · 72h', color: '#DC2626', tiempo_max: '48h' },
  { titulo: 'Adelanto electoral inesperado', tipo: 'Estratégico · Calendario', probabilidad: 28, respuesta: 'Comprimir agenda 60 días · maquinaria territorial · gasto acelerado 30%', color: '#F97316', tiempo_max: '24h' },
  { titulo: 'Escándalo personal de líder', tipo: 'Reputacional · Crisis', probabilidad: 12, respuesta: 'Activar protocolo crisis L1 · contención mediática 4h · respuesta rueda prensa', color: '#7C3AED', tiempo_max: '4h' },
  { titulo: 'Ataque cibernético coordinado', tipo: 'Digital · Seguridad', probabilidad: 8, respuesta: 'Aislamiento sistemas · backup activo · INCIBE notificación · forensic team', color: '#0EA5E9', tiempo_max: '1h' },
]

const TALKING_POINTS: TalkingPoint[] = [
  { tema: 'Defensa servicios públicos · sanidad', mencs: 24800, sent: 72, tendencia: 'subiendo' },
  { tema: 'Acceso vivienda joven · alquiler social', mencs: 18200, sent: 78, tendencia: 'subiendo' },
  { tema: 'Subida SMI 2027 · cobertura amplia', mencs: 15900, sent: 65, tendencia: 'subiendo' },
  { tema: 'Pensiones · revalorización IPC', mencs: 14300, sent: 71, tendencia: 'estable' },
  { tema: 'Empleo juvenil · contratos formación', mencs: 9800, sent: 58, tendencia: 'estable' },
  { tema: 'Transición energética · emisiones', mencs: 8400, sent: 54, tendencia: 'bajando' },
  { tema: 'Reforma fiscal · grandes patrimonios', mencs: 12100, sent: 38, tendencia: 'bajando' },
  { tema: 'Inmigración · gestión fronteras', mencs: 19400, sent: 32, tendencia: 'bajando' },
]

const ENDORSEMENTS: Endorsement[] = [
  { quien: 'Manuel Valls', rol: 'Ex-PM Francia', donde: 'X · 12k retweets', cuando: 'hace 3h', impacto: 'ALTO' },
  { quien: 'Antonio Banderas', rol: 'Actor · embajador cultural', donde: 'Mitin Málaga', cuando: 'hace 5h', impacto: 'ALTO' },
  { quien: 'CCOO Andalucía', rol: 'Sindicato', donde: 'Comunicado oficial', cuando: 'hace 1d', impacto: 'ALTO' },
  { quien: 'Asoc. Empresarios Sevilla', rol: 'CEO Group', donde: 'Cena empresarial', cuando: 'hace 1d', impacto: 'MEDIO' },
  { quien: 'Mikel Erentxun', rol: 'Músico', donde: 'X · 4.2k likes', cuando: 'hace 2d', impacto: 'MEDIO' },
  { quien: 'Asociación Vecinal Vallecas', rol: 'Sociedad civil', donde: 'Acto territorial', cuando: 'hace 2d', impacto: 'MEDIO' },
]

const DONACIONES: Donacion[] = [
  { donante: 'M.Á.G. (Madrid)', cantidad: 50, tipo: 'pequeño', cuando: 'hace 8 min' },
  { donante: 'C.R.M. (Sevilla)', cantidad: 25, tipo: 'pequeño', cuando: 'hace 14 min' },
  { donante: 'Asoc. Profesionales Toledo', cantidad: 800, tipo: 'PAC', cuando: 'hace 22 min' },
  { donante: 'Anónimo', cantidad: 20, tipo: 'pequeño', cuando: 'hace 31 min' },
  { donante: 'J.L.P. (Barcelona)', cantidad: 1200, tipo: 'grande', cuando: 'hace 45 min' },
  { donante: 'P.A.G. (Valencia)', cantidad: 100, tipo: 'pequeño', cuando: 'hace 1h' },
  { donante: 'Empresarios Centro', cantidad: 2400, tipo: 'PAC', cuando: 'hace 1h' },
  { donante: 'M.J.S. (Málaga)', cantidad: 75, tipo: 'pequeño', cuando: 'hace 1h 15m' },
]

const VOL_ACTIVITY: VolActivity[] = [
  { accion: 'Puerta a puerta · 47 viviendas', voluntario: 'Equipo Carabanchel', localidad: 'Madrid', cantidad: 47, cuando: 'hace 12 min', tipo: 'puerta' },
  { accion: 'Llamadas · 142 contactos', voluntario: 'Equipo Triana', localidad: 'Sevilla', cantidad: 142, cuando: 'hace 18 min', tipo: 'llamada' },
  { accion: 'Reparto folletos mercado', voluntario: 'Equipo Mestalla', localidad: 'Valencia', cantidad: 320, cuando: 'hace 35 min', tipo: 'evento' },
  { accion: 'Reposteo coordinado X', voluntario: 'Equipo Digital BCN', localidad: 'Barcelona', cantidad: 890, cuando: 'hace 42 min', tipo: 'redes' },
  { accion: 'Recogida firmas plaza Cataluña', voluntario: 'Voluntarios L\'Hospitalet', localidad: 'Cataluña', cantidad: 184, cuando: 'hace 1h', tipo: 'evento' },
  { accion: 'Llamadas · 89 contactos', voluntario: 'Equipo Indautxu', localidad: 'Bilbao', cantidad: 89, cuando: 'hace 1h 10m', tipo: 'llamada' },
  { accion: 'Puerta a puerta · 34 viviendas', voluntario: 'Equipo Vegueta', localidad: 'Las Palmas', cantidad: 34, cuando: 'hace 1h 25m', tipo: 'puerta' },
  { accion: 'Charla informal · feria local', voluntario: 'Equipo Plaza Mayor', localidad: 'Salamanca', cantidad: 120, cuando: 'hace 2h', tipo: 'evento' },
]

const OPP_ALERTS: OppAlert[] = [
  { titulo: 'Filtración borrador interno PP · estrategia mediática mayo', fuente: 'OSINT interno', gravedad: 'ALTA', cuando: 'hace 27 min' },
  { titulo: 'VOX coordina campaña digital con cuentas de Patriotas (UE)', fuente: 'Análisis OSINT', gravedad: 'ALTA', cuando: 'hace 3h' },
  { titulo: 'PSOE prepara ofensiva sobre desigualdad rural', fuente: 'Fuente abierta', gravedad: 'MEDIA', cuando: 'hace 5h' },
  { titulo: 'Encuesta interna Sumar · perdiendo voto urbano joven', fuente: 'Filtración', gravedad: 'MEDIA', cuando: 'hace 8h' },
  { titulo: 'Movimientos en CCOO sobre apoyo electoral', fuente: 'Sindical', gravedad: 'BAJA', cuando: 'hace 1d' },
]

const TIPO_VOL_COLOR: Record<VolActivity['tipo'], string> = {
  puerta: '#16A34A', llamada: '#0EA5E9', evento: '#F97316', redes: '#5B21B6',
}

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVO: '#16A34A', NEUTRO: '#6e6e73', NEGATIVO: '#DC2626',
}

const PRIO_DEC_COLOR: Record<Decision['prioridad'], string> = {
  CRÍTICA: '#DC2626', ALTA: '#F97316', MEDIA: '#EAB308',
}

// Sentiment 24h (24 puntos)
const SENTIMENT_24H = [42, 45, 47, 48, 51, 53, 54, 56, 58, 60, 61, 62, 60, 58, 57, 54, 52, 51, 53, 55, 58, 60, 62, 64]

export default function WarRoomPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useWarRoom()
  const { crisis, updateEstado: updateCrisisEstado } = useWarRoomCrisis()
  const { tareas, cycleEstado: cycleTareaEstado } = useWarRoomTareas()

  const { source: snapSource, updatedAt: snapUpdated, refresh: snapRefresh } =
    useApi<unknown>('/api/war-room/snapshot', { refreshInterval: 60_000 })

  const eleccionesFecha = useMemo(() => {
    if (data?.elecciones_fecha) return new Date(data.elecciones_fecha)
    return new Date(2026, 7, 10)
  }, [data])

  const tiempo = useCountdown(eleccionesFecha)

  if (loading || !data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6e6e73', fontSize: 14 }}>Cargando War Room...</div>
        </main>
      </div>
    )
  }

  const { candidato, kpis, encuestas, equipo, agenda, territorio, mensaje, presupuesto } = data
  const crisisActivas = crisis.filter(c => c.estado === 'Activa').length
  const tareasAbiertas = tareas.filter(t => t.estado !== 'Completada').length
  const presupRestante = presupuesto.total - presupuesto.gastado

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ═══════════ HERO / COMMAND CENTER ═══════════ */}
        <section style={{
          background:'linear-gradient(135deg,#0F172A 0%,#020617 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:14, color:'#fff',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:0, opacity:0.12, pointerEvents:'none',
            background:'radial-gradient(circle at 80% 20%, #DC2626 0%, transparent 55%), radial-gradient(circle at 20% 80%, #1F4E8C 0%, transparent 55%)' }}/>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:24, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:64, height:64, borderRadius:12, background:candidato.color, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.02em',
                boxShadow:`0 4px 16px ${candidato.color}80`,
              }}>{candidato.iniciales}</div>
              <div>
                <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 3px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span>WAR ROOM · COMMAND CENTER · LIVE</span>
                  <LiveStatusBadge updatedAt={snapUpdated} source={snapSource} refreshIntervalSec={60} onRefresh={snapRefresh}/>
                </p>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, letterSpacing:'-0.014em' }}>{candidato.nombre}</div>
                <div style={{ fontSize:11.5, opacity:0.7, marginTop:1 }}>{candidato.partido} · {candidato.cargo}</div>
              </div>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em', opacity:0.6, textTransform:'uppercase', margin:'0 0 8px' }}>
                Cuenta atrás · Generales 10 ago 2026
              </p>
              <div style={{ display:'flex', justifyContent:'center', alignItems:'baseline', gap:8 }}>
                <CDNum n={tiempo.dias}  label="DÍAS"  big/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.horas} label="HORAS"/>
                <span style={{ fontSize:36, color:'rgba(255,255,255,0.3)', fontWeight:200 }}>:</span>
                <CDNum n={tiempo.min}   label="MIN"/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, minWidth:240 }}>
              <HeroKPI label="Tareas abiertas"  value={String(tareasAbiertas)} accent="#FCA5A5"/>
              <HeroKPI label="Crisis activas"   value={String(crisisActivas)}  accent="#F97316"/>
              <HeroKPI label="Presup. restante" value={`${(presupRestante/1000).toFixed(1)}M€`} accent="#7DD3FC"/>
              <HeroKPI label="Voluntarios"      value={`${(kpis.voluntarios/1000).toFixed(1)}K`} accent="#86EFAC"/>
            </div>
          </div>
        </section>

        {/* ═══════════ OPS STATUS BAR ═══════════ */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'14px 18px',
          marginBottom:14, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {OPS_ALERTS.map(o => (
            <div key={o.label} style={{ display:'flex', flexDirection:'column', gap:3, padding:'8px 10px', background:`${o.color}08`, border:`1px solid ${o.color}30`, borderRadius:10, borderLeft:`3px solid ${o.color}` }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73' }}>{o.label}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: o.color, lineHeight:1, letterSpacing:'-0.02em' }}>{o.value}</div>
              <div style={{ fontSize:9.5, color:'#86868b' }}>{o.sub}</div>
            </div>
          ))}
        </section>

        {/* ═══════════ DECISION QUEUE + SENTIMENT TRACKER ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Cola de decisiones · ATENCIÓN DIRECTOR" badge={`${DECISIONES.length} pendientes`} accent="#DC2626"/>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {DECISIONES.map(d => (
                <div key={d.id} style={{
                  display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:10, alignItems:'center',
                  padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  borderLeft:`3px solid ${PRIO_DEC_COLOR[d.prioridad]}`,
                }}>
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background: PRIO_DEC_COLOR[d.prioridad], color:'#fff' }}>{d.prioridad}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{d.titulo}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:2 }}>{d.tipo} · {d.resp}</div>
                  </div>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color: d.deadline.includes('h') && parseInt(d.deadline) < 5 ? '#DC2626' : '#1d1d1f' }}>{d.deadline}</span>
                  <button style={{
                    fontSize:10, fontWeight:700, padding:'5px 11px', borderRadius:7,
                    background:'#1d1d1f', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit',
                  }}>Decidir</button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Sentimiento online · 24h" badge="CRECIENDO" accent="#16A34A"/>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, color:'#16A34A', letterSpacing:'-0.02em', lineHeight:1 }}>{SENTIMENT_24H[SENTIMENT_24H.length-1]}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#6e6e73' }}>/100 · NSI</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#16A34A' }}>▲ +{SENTIMENT_24H[SENTIMENT_24H.length-1] - SENTIMENT_24H[0]} pts</span>
            </div>
            <SentimentChart points={SENTIMENT_24H}/>
            <div style={{ marginTop:10, fontSize:11, color:'#6e6e73' }}>
              Pico crecimiento <strong style={{ color:'#16A34A' }}>+8 pts</strong> tras anuncio SMI · 14:00h
            </div>
          </Card>
        </section>

        {/* ═══════════ SNAPSHOT ELECTORAL ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title={`Snapshot electoral · ${candidato.partido}`} badge={`Actualizado ${encuestas[0]?.fecha}`} accent="#1F4E8C"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <SKpi big label="Intención de voto" value={`${kpis.intencionPP}%`}  delta="+0.4 pp · 7d" deltaPos color={candidato.color}/>
              <SKpi label="Diferencial PSOE"      value={`+${kpis.diferencialPSOE}`} sub="puntos"      delta="+0.6 pp · 7d" deltaPos color={candidato.color}/>
              <SKpi label="Conocimiento"          value={`${kpis.conocimiento}%`}  sub="población adulta" color="#5B21B6"/>
              <SKpi label="Valoración líder"      value={`${kpis.valoracion}`}     sub="/10 · CIS"    delta="+0.1 vs mes" deltaPos color="#16A34A"/>
              <SKpi label="Imagen líder"          value={`${kpis.imagenLider}`}    sub="/10 · 40dB"   delta="estable" color="#0EA5E9"/>
              <SKpi label="Particip. prevista"    value={`${kpis.participacionPrev}%`} sub="estimación" color="#F97316"/>
              <SKpi label="Locales abiertos"      value={`${kpis.localesAbiertos}`} sub="48 provincias" color="#16A34A"/>
              <SKpi label="Voluntarios activos"   value={`${kpis.voluntarios.toLocaleString('es-ES')}`} sub="reg. esta semana" color={candidato.color}/>
            </div>
          </Card>
          <div style={{ background:`linear-gradient(135deg, ${candidato.color}10, ${candidato.color}03)`, border:`1px solid ${candidato.color}40`, borderRadius:14, padding:'18px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 8px', borderRadius:4, background:candidato.color, color:'#fff' }}>MENSAJE DEL DÍA</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:candidato.color }}>{mensaje.hashtag}</span>
            </div>
            <h3 style={{ margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, letterSpacing:'-0.012em' }}>«{mensaje.titular}»</h3>
            <p style={{ margin:'0 0 10px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.5 }}>{mensaje.subtitular}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
              {mensaje.pilares.map((p, i) => (
                <div key={i} style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.45, display:'flex', gap:6 }}>
                  <span style={{ color:candidato.color, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span><strong style={{ color:'#1d1d1f' }}>{p.p}.</strong> {p.detalle}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 11px', marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Contraste</div>
              <div style={{ fontSize:11, color:'#3a3a3d', fontStyle:'italic' }}>{mensaje.contraste}</div>
            </div>
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:9, padding:'8px 11px' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Evitar comentar</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {mensaje.evitar.map(e => (
                  <span key={e} style={{ fontSize:10.5, padding:'2px 7px', borderRadius:999, background:'#fff', border:'1px solid #FECACA', color:'#7F1D1D' }}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ ADVERSARIO LIVE FEED + WAR GAMES ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Adversarios · live feed" badge={`${ADVERSARIO_FEED.length} declaraciones · 24h`} accent="#DC2626"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {(['PSOE', 'VOX', 'SUMAR'] as const).map(partido => {
                const items = ADVERSARIO_FEED.filter(a => a.partido === partido)
                const color = items[0]?.color || '#525258'
                return (
                  <div key={partido} style={{ display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
                    <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.08em', textAlign:'center', padding:'4px 8px', borderRadius:6, background:color, color:'#fff', textTransform:'uppercase' }}>{partido}</div>
                    {items.map((a, i) => (
                      <div key={i} style={{ padding:'8px 10px', background:`${color}08`, border:`1px solid ${color}25`, borderRadius:9, borderLeft:`2px solid ${color}` }}>
                        <div style={{ fontSize:11.5, color:'#1d1d1f', lineHeight:1.35, marginBottom:4 }}>{a.declaracion}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:'#86868b' }}>
                          <span style={{ fontWeight:600, color: '#3a3a3d' }}>{a.quien.split('·')[0]}</span>
                          <span>{a.cuando}</span>
                        </div>
                        <span style={{ display:'inline-block', marginTop:4, fontSize:8.5, fontWeight:800, letterSpacing:'0.06em', padding:'1px 6px', borderRadius:3, background: SENTIMENT_COLOR[a.sentimiento], color:'#fff' }}>{a.sentimiento}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="War games · escenarios listos" badge="4 protocolos" accent="#5B21B6"/>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {WAR_GAMES.map(w => (
                <div key={w.titulo} style={{
                  padding:'10px 12px', borderRadius:10,
                  background:`${w.color}08`, border:`1px solid ${w.color}30`,
                  borderLeft:`3px solid ${w.color}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{w.titulo}</span>
                    <span style={{ fontSize:11, fontWeight:800, color: w.color }}>{w.probabilidad}%</span>
                  </div>
                  <div style={{ fontSize:10, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>{w.tipo} · respuesta {w.tiempo_max}</div>
                  <div style={{ fontSize:11, color:'#3a3a3d', lineHeight:1.4 }}>{w.respuesta}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ═══════════ AGENDA + EQUIPO ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Agenda · próximos 10 días" badge={`${agenda.length} actos`} accent="#1F4E8C"/>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {agenda.map((a, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'62px 6px 1fr auto', gap:10, alignItems:'center', padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10 }}>
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
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:999, background:`${ESTADO_ACTO[a.estado]}15`, color:ESTADO_ACTO[a.estado], border:`1px solid ${ESTADO_ACTO[a.estado]}40` }}>{a.estado.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Equipo central" badge={`${equipo.length} miembros`} accent="#5B21B6"/>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {equipo.map(m => (
                <div key={m.rol} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:9, alignItems:'center', padding:'7px 9px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:ROL_COLOR[m.rol], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:10, flexShrink:0 }}>
                    {m.nombre.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:1 }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 5px', borderRadius:3, background:`${ROL_COLOR[m.rol]}15`, color:ROL_COLOR[m.rol] }}>{m.rol.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.nombre}</div>
                    <div style={{ fontSize:9.5, color:'#86868b' }}>{m.ult}</div>
                  </div>
                  <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.06em', padding:'2px 6px', borderRadius:4, background:`${ESTADO_META[m.estado]?.color || '#6e6e73'}15`, color:ESTADO_META[m.estado]?.color || '#6e6e73', border:`1px solid ${ESTADO_META[m.estado]?.color || '#6e6e73'}40`, whiteSpace:'nowrap' }}>{m.estado.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ═══════════ MEDIA MONITOR + OPP RESEARCH ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Media monitor · cobertura últimas 24h" badge={`${MEDIA_MONITOR.length} apariciones · ${(MEDIA_MONITOR.reduce((s,m)=>s+m.alcance,0)/1_000_000).toFixed(1)}M alcance`} accent="#0EA5E9"/>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Medio','Tipo','Titular','Alcance','Sent.','Hora'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEDIA_MONITOR.map((m, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'7px 8px', fontWeight:600, color:'#1d1d1f', fontSize:11 }}>{m.medio}</td>
                    <td style={{ padding:'7px 8px' }}>
                      <span style={{ fontSize:8.5, fontWeight:800, padding:'1px 5px', borderRadius:3, background:'#525258', color:'#fff' }}>{m.tipo}</span>
                    </td>
                    <td style={{ padding:'7px 8px', color:'#3a3a3d', maxWidth:300, fontSize:11 }}>{m.titular}</td>
                    <td style={{ padding:'7px 8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', fontSize:11 }}>{(m.alcance/1000).toFixed(0)}k</td>
                    <td style={{ padding:'7px 8px' }}>
                      <span style={{ fontSize:8.5, fontWeight:800, padding:'1px 5px', borderRadius:3, background: SENTIMENT_COLOR[m.sentiment], color:'#fff', letterSpacing:'0.04em' }}>{m.sentiment}</span>
                    </td>
                    <td style={{ padding:'7px 8px', fontFamily:'var(--font-display)', fontWeight:600, color:'#6e6e73', fontSize:11 }}>{m.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader title="Opposition research · alertas" badge={`${OPP_ALERTS.length} señales`} accent="#7C3AED"/>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {OPP_ALERTS.map((a, i) => {
                const cgrav = a.gravedad === 'ALTA' ? '#DC2626' : a.gravedad === 'MEDIA' ? '#F97316' : '#EAB308'
                return (
                  <div key={i} style={{
                    padding:'9px 11px', borderRadius:9,
                    background:'#FAFAFB', border:'1px solid #ECECEF',
                    borderLeft:`3px solid ${cgrav}`,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:8.5, fontWeight:800, padding:'1px 6px', borderRadius:3, background: cgrav, color:'#fff', letterSpacing:'0.06em' }}>{a.gravedad}</span>
                      <span style={{ fontSize:10, color:'#86868b' }}>{a.cuando}</span>
                    </div>
                    <div style={{ fontSize:11.5, color:'#1d1d1f', lineHeight:1.35, fontWeight:600 }}>{a.titulo}</div>
                    <div style={{ fontSize:9.5, color:'#6e6e73', marginTop:3, letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700 }}>{a.fuente}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </section>

        {/* ═══════════ TAREAS + CRISIS RADAR ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Tareas críticas del día" badge={`${tareas.filter(t => t.estado === 'Completada').length}/${tareas.length} completadas`} accent="#5B21B6"/>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Tarea','Responsable','Plazo','Estado'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 10px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tareas.map(t => (
                  <tr key={t.id} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <td style={{ padding:'9px 10px', fontWeight:600, color:'#1d1d1f' }}>{t.tarea}</td>
                    <td style={{ padding:'9px 10px', color:'#3a3a3d', fontSize:11.5 }}>{t.resp}</td>
                    <td style={{ padding:'9px 10px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{t.plazo}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span onClick={() => cycleTareaEstado(t.id)}
                        style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 8px', borderRadius:999, background:`${TAR_COLOR[t.estado]}15`, color:TAR_COLOR[t.estado], border:`1px solid ${TAR_COLOR[t.estado]}40`, cursor:'pointer' }}>
                        {t.estado.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader title="Crisis radar" badge={`${crisisActivas} activa(s)`} accent="#DC2626"/>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {crisis.map(c => (
                <div key={c.id} style={{ padding:'10px 12px', borderRadius:9, background:`${SEV_CRI[c.severidad]}10`, border:`1px solid ${SEV_CRI[c.severidad]}40`, borderLeft:`3px solid ${SEV_CRI[c.severidad]}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 6px', borderRadius:4, background:SEV_CRI[c.severidad], color:'#fff' }}>{c.severidad}</span>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>· {c.tipo.toUpperCase()}</span>
                    <span onClick={() => updateCrisisEstado(c.id, c.estado === 'Activa' ? 'Contenida' : 'Activa')}
                      style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:999, background: c.estado === 'Activa' ? '#DC2626' : '#16A34A', color:'#fff', letterSpacing:'0.06em', cursor:'pointer' }}>
                      {c.estado.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ═══════════ TALKING POINTS HEAT MAP ═══════════ */}
        <Card style={{ marginBottom:14 }}>
          <CardHeader title="Talking points · heat map de mensajes" badge="Análisis online 24h" accent="#16A34A"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {TALKING_POINTS.map(t => {
              const sentColor = t.sent >= 60 ? '#16A34A' : t.sent >= 45 ? '#EAB308' : '#DC2626'
              const trendIcon = t.tendencia === 'subiendo' ? '▲' : t.tendencia === 'bajando' ? '▼' : '—'
              const trendColor = t.tendencia === 'subiendo' ? '#16A34A' : t.tendencia === 'bajando' ? '#DC2626' : '#6e6e73'
              return (
                <div key={t.tema} style={{
                  display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'center',
                  padding:'10px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  borderLeft:`3px solid ${sentColor}`,
                }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{t.tema}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
                      <div style={{ flex:1, maxWidth:120, height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${t.sent}%`, height:'100%', background: sentColor }}/>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color: sentColor }}>{t.sent}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:60 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{(t.mencs/1000).toFixed(1)}k</div>
                    <div style={{ fontSize:9, color:'#86868b', marginTop:2 }}>menciones</div>
                  </div>
                  <span style={{ fontSize:14, color: trendColor, fontWeight:700 }}>{trendIcon}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ═══════════ MAPA TERRITORIAL ═══════════ */}
        <Card style={{ marginBottom:14 }}>
          <CardHeader title="Mapa territorial · prioridad de campaña" accent="#F97316"
            extra={
              <div style={{ display:'flex', gap:10, fontSize:10.5 }}>
                {(['Crítica','Alta','Media','Mantener'] as PrioridadTerritorio[]).map(p => (
                  <span key={p} style={{ display:'inline-flex', alignItems:'center', gap:5, color:'#3a3a3d' }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:PRIO_COLOR[p] }}/>
                    {p}
                  </span>
                ))}
              </div>
            }/>
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
                {[...territorio].sort((a,b) => {
                  const order: Record<PrioridadTerritorio, number> = { 'Crítica':0, 'Alta':1, 'Media':2, 'Mantener':3 }
                  return order[a.prioridad] - order[b.prioridad]
                }).map((t, i) => {
                  const gapColor = t.gap > 0 ? '#16A34A' : '#DC2626'
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#1d1d1f' }}>{t.prov}</td>
                      <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{t.ccaa}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:PRIO_COLOR[t.prioridad], color:'#fff' }}>{t.prioridad.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:candidato.color }}>{t.intencion.toFixed(1)}%</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:gapColor }}>{t.gap > 0 ? `+${t.gap}` : t.gap} pp</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${(t.recursos / 22) * 100}%`, height:'100%', background:candidato.color }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:candidato.color, minWidth:24, textAlign:'right' }}>{t.recursos}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f', textAlign:'right' }}>{t.voluntarios.toLocaleString('es-ES')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ═══════════ FUNDRAISING + VOLUNTARIOS + ENDORSEMENTS ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', gap:14, marginBottom:14 }}>
          <Card>
            <CardHeader title="Fundraising · live" badge="€42.380 · 24h" accent="#0EA5E9"/>
            <div style={{ marginBottom:10, padding:'12px 14px', background:'linear-gradient(135deg,#0EA5E908,#0EA5E903)', borderRadius:10, border:'1px solid #0EA5E930' }}>
              <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73' }}>Acumulado campaña</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0EA5E9', letterSpacing:'-0.02em', lineHeight:1, marginTop:4 }}>€1.247.840</div>
              <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4 }}>3.842 donantes · meta €2M (62.4%)</div>
              <div style={{ height:6, background:'#F5F5F7', borderRadius:3, marginTop:6, overflow:'hidden' }}>
                <div style={{ width:'62.4%', height:'100%', background:'#0EA5E9' }}/>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:280, overflowY:'auto' }}>
              {DONACIONES.map((d, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, alignItems:'center', padding:'7px 10px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.donante}</div>
                    <div style={{ fontSize:9.5, color:'#86868b' }}>{d.cuando}</div>
                  </div>
                  <span style={{ fontSize:8.5, fontWeight:800, padding:'1px 5px', borderRadius:3, background: d.tipo==='grande' ? '#0EA5E9' : d.tipo==='PAC' ? '#7C3AED' : '#16A34A', color:'#fff', letterSpacing:'0.04em' }}>{d.tipo.toUpperCase()}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#0EA5E9' }}>€{d.cantidad}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Voluntarios · activity feed" badge={`${VOL_ACTIVITY.length} acciones · 2h`} accent="#16A34A"/>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:380, overflowY:'auto' }}>
              {VOL_ACTIVITY.map((v, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:9, alignItems:'center', padding:'9px 11px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9 }}>
                  <div style={{ width:32, height:32, borderRadius:7, background: TIPO_VOL_COLOR[v.tipo], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, flexShrink:0 }}>
                    {v.tipo === 'puerta' ? '⌂' : v.tipo === 'llamada' ? '☎' : v.tipo === 'evento' ? '★' : '◉'}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{v.accion}</div>
                    <div style={{ fontSize:10, color:'#6e6e73', marginTop:2 }}>{v.voluntario} · {v.localidad} · {v.cuando}</div>
                  </div>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: TIPO_VOL_COLOR[v.tipo] }}>{v.cantidad}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Endorsements · apoyos" badge={`${ENDORSEMENTS.length} este mes`} accent="#7C3AED"/>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {ENDORSEMENTS.map((e, i) => (
                <div key={i} style={{ padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9, borderLeft:`3px solid ${e.impacto === 'ALTO' ? '#7C3AED' : '#A78BFA'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:12.5, fontWeight:700, color:'#1d1d1f' }}>{e.quien}</span>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'1px 5px', borderRadius:3, background: e.impacto === 'ALTO' ? '#7C3AED' : '#A78BFA', color:'#fff' }}>{e.impacto}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#3a3a3d', marginBottom:3 }}>{e.rol}</div>
                  <div style={{ fontSize:10.5, color:'#86868b' }}>{e.donde} · {e.cuando}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ═══════════ ENCUESTAS + PRESUPUESTO ═══════════ */}
        <section style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:14 }}>
          <Card>
            <CardHeader title="Encuestas · últimas 6 olas" badge="Tracker semanal" accent="#1F4E8C"/>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #ECECEF' }}>
                  {['Fecha','Casa','Cliente','PP','PSOE','VOX','Sumar','Otros'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encuestas.map((e, i) => (
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
          </Card>
          <Card>
            <CardHeader title="Presupuesto de campaña" badge={`${(presupuesto.gastado/1000).toFixed(2)}M€ / ${(presupuesto.total/1000).toFixed(2)}M€`} accent="#B45309"/>
            <div style={{ marginBottom:14 }}>
              <div style={{ height:10, background:'#F5F5F7', borderRadius:5, overflow:'hidden', marginBottom:5 }}>
                <div style={{ width:`${(presupuesto.gastado / presupuesto.total) * 100}%`, height:'100%', background:`linear-gradient(90deg, ${candidato.color}, ${candidato.color}aa)`, borderRadius:5 }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>
                <span>{Math.round((presupuesto.gastado / presupuesto.total) * 100)}% ejecutado</span>
                <span>Restante: {((presupuesto.total - presupuesto.gastado)/1000).toFixed(2)}M€</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {presupuesto.lineas.map(p => {
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
          </Card>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        War Room · Command Center · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─── Subcomponentes ──────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

function CardHeader({ title, badge, accent, extra }: { title: string; badge?: string; accent: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:10, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:3, height:14, background: accent, borderRadius:2 }}/>
        <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>{title}</h3>
      </div>
      {extra ? extra : badge && <span style={{ fontSize:11, color:'#6e6e73' }}>{badge}</span>}
    </div>
  )
}

function SentimentChart({ points }: { points: number[] }) {
  const W = 280, H = 80, P = 4
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const path = points.map((v, i) => {
    const x = P + (i / (points.length - 1)) * (W - 2 * P)
    const y = P + (1 - (v - min) / range) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const area = `${path} L${P + (W - 2 * P)},${H - P} L${P},${H - P} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
      <path d={area} fill="#16A34A20"/>
      <path d={path} fill="none" stroke="#16A34A" strokeWidth={2}/>
      {points.map((v, i) => {
        const x = P + (i / (points.length - 1)) * (W - 2 * P)
        const y = P + (1 - (v - min) / range) * (H - 2 * P)
        return <circle key={i} cx={x} cy={y} r={1.5} fill="#16A34A"/>
      })}
    </svg>
  )
}
