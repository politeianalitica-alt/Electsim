'use client'
/**
 * /war-room · Command Center electoral con sidebar de 20 secciones
 * organizadas en 7 grupos (estilo config-cliente · Linear Settings).
 */
import './war-room.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useWarRoom, useWarRoomCrisis, useWarRoomTareas, useCountdown } from '@/hooks/war-room'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { CDNum } from './_components/CDNum'
import { HeroKPI } from './_components/HeroKPI'
import { SKpi } from './_components/SKpi'
import type { RolEquipo, EstadoMiembro, TipoActo, PrioridadTerritorio, SeveridadCrisis, EstadoTarea } from '@/types/war-room'

// ─── Colour maps ──────────────────────────────────────────
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

// ─── Sidebar sections ────────────────────────────────────
type SectionId =
  | 'dashboard' | 'decisiones' | 'crisis' | 'wargames'
  | 'snapshot' | 'encuestas' | 'territorio'
  | 'mensaje' | 'talking' | 'sentimiento'
  | 'adversario' | 'opp'
  | 'media' | 'endorsements'
  | 'agenda' | 'equipo' | 'tareas'
  | 'voluntarios' | 'fundraising' | 'presupuesto'

const SECTIONS: Array<{ id: SectionId; label: string; group: string; icon: string }> = [
  { id: 'dashboard',     label: 'Dashboard general',     group: 'Comando',           icon: '' },
  { id: 'decisiones',    label: 'Cola de decisiones',    group: 'Comando',           icon: '◆' },
  { id: 'crisis',        label: 'Crisis radar',          group: 'Comando',           icon: '⚠' },
  { id: 'wargames',      label: 'War games',             group: 'Comando',           icon: '⊠' },
  { id: 'snapshot',      label: 'Snapshot electoral',    group: 'Electoral',         icon: '⌘' },
  { id: 'encuestas',     label: 'Encuestas tracker',     group: 'Electoral',         icon: '' },
  { id: 'territorio',    label: 'Mapa territorial',      group: 'Electoral',         icon: '⌖' },
  { id: 'mensaje',       label: 'Mensaje del día',       group: 'Mensaje',           icon: '◈' },
  { id: 'talking',       label: 'Talking points',        group: 'Mensaje',           icon: '⊙' },
  { id: 'sentimiento',   label: 'Sentimiento online',    group: 'Mensaje',           icon: '↗' },
  { id: 'adversario',    label: 'Adversario feed',       group: 'Inteligencia',      icon: '◐' },
  { id: 'opp',           label: 'Opp research',          group: 'Inteligencia',      icon: '⊡' },
  { id: 'media',         label: 'Media monitor',         group: 'Cobertura',         icon: '◊' },
  { id: 'endorsements',  label: 'Endorsements',          group: 'Cobertura',         icon: '★' },
  { id: 'agenda',        label: 'Agenda · 10 días',      group: 'Operaciones',       icon: '◷' },
  { id: 'equipo',        label: 'Equipo central',        group: 'Operaciones',       icon: '◍' },
  { id: 'tareas',        label: 'Tareas críticas',       group: 'Operaciones',       icon: '✓' },
  { id: 'voluntarios',   label: 'Voluntarios',           group: 'Campaña',           icon: '⌂' },
  { id: 'fundraising',   label: 'Fundraising',           group: 'Campaña',           icon: '€' },
  { id: 'presupuesto',   label: 'Presupuesto',           group: 'Campaña',           icon: '☰' },
]

// ─── Mock data extra ─────────────────────────────────────
const OPS_ALERTS = [
  { label: 'Decisiones pendientes', value: '7', sub: '2 críticas · 5 altas', color: '#F97316' },
  { label: 'Crisis activas',        value: '3', sub: '1 crítica · narrativa', color: '#DC2626' },
  { label: 'War games preparados',  value: '4', sub: 'Listos para ejecutar', color: '#5B21B6' },
  { label: 'Voluntarios hoy',       value: '1.247', sub: 'En 38 provincias', color: '#16A34A' },
  { label: 'Donaciones 24h',        value: '€42.380', sub: '218 donantes nuevos', color: '#0EA5E9' },
]

interface Decision { id: string; titulo: string; resp: string; deadline: string; prioridad: 'CRÍTICA' | 'ALTA' | 'MEDIA'; tipo: string; descripcion?: string }
const DECISIONES: Decision[] = [
  { id: 'd-001', titulo: 'Aprobación contenido spot televisivo nacional · 30s', resp: 'Comunicación', deadline: '2h 15m', prioridad: 'CRÍTICA', tipo: 'Comunicación', descripcion: 'Tres versiones presentadas · pilares servicios públicos + acceso vivienda. Aprobar 1 para emisión esta semana.' },
  { id: 'd-002', titulo: 'Confirmar asistencia a debate TVE 18 mayo', resp: 'Director', deadline: '4h', prioridad: 'CRÍTICA', tipo: 'Agenda', descripcion: 'Formato 4 candidatos · cierre lista TVE 18:00 hoy.' },
  { id: 'd-003', titulo: 'Refuerzo seguridad mitin Andalucía 16 mayo', resp: 'Crisis', deadline: 'Hoy', prioridad: 'ALTA', tipo: 'Operativa', descripcion: 'Aforo 8.000 personas · solicitud Policía Nacional + UIP local.' },
  { id: 'd-004', titulo: 'Selección portavoces para entrevistas radio mañana', resp: 'Comunicación', deadline: 'Hoy 18:00', prioridad: 'ALTA', tipo: 'Comunicación', descripcion: '6 entrevistas en cadenas nacionales 06:00-09:00 · proponer 3 perfiles.' },
  { id: 'd-005', titulo: 'Activación campaña digital adversaria · 80k€ presupuesto', resp: 'Digital', deadline: 'Mañana', prioridad: 'ALTA', tipo: 'Digital', descripcion: 'Targeting Meta + Google · 80k€ · creatividad lista · falta GO/NO-GO.' },
  { id: 'd-006', titulo: 'Aprobar pagos proveedores semana 19', resp: 'Finanzas', deadline: '24h', prioridad: 'ALTA', tipo: 'Finanzas', descripcion: '12 facturas · €138.420 total · 4 con prioridad.' },
  { id: 'd-007', titulo: 'Plan de contingencia mitin Madrid Las Ventas', resp: 'Ground game', deadline: '48h', prioridad: 'MEDIA', tipo: 'Operativa', descripcion: 'Aforo previsto 20.000 · evaluación riesgos · plan B en caso lluvia.' },
]

interface Adversario { partido: string; color: string; declaracion: string; quien: string; cuando: string; sentimiento: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO' }
const ADVERSARIO_FEED: Adversario[] = [
  { partido: 'PSOE',  color: '#E1322D', declaracion: 'Sánchez asegura que «el Gobierno tiene mayoría suficiente para los Presupuestos 2027»', quien: 'P. Sánchez · presidente', cuando: 'hace 47 min', sentimiento: 'POSITIVO' },
  { partido: 'PSOE',  color: '#E1322D', declaracion: '«No habrá adelanto electoral en 2026, agotaremos la legislatura»', quien: 'Pilar Alegría · m. portavoz', cuando: 'hace 2h',     sentimiento: 'POSITIVO' },
  { partido: 'PSOE',  color: '#E1322D', declaracion: 'María Jesús Montero anuncia subida del 4% del SMI para 2027',                            quien: 'María J. Montero',          cuando: 'hace 4h',     sentimiento: 'POSITIVO' },
  { partido: 'VOX',   color: '#5BA02E', declaracion: 'Abascal pide «cárcel para los responsables de la corrupción gubernamental»',             quien: 'S. Abascal',                 cuando: 'hace 1h',     sentimiento: 'NEGATIVO' },
  { partido: 'VOX',   color: '#5BA02E', declaracion: 'VOX presentará querella contra el fiscal general por presuntas filtraciones',             quien: 'Iván Espinosa',              cuando: 'hace 3h',     sentimiento: 'NEGATIVO' },
  { partido: 'SUMAR', color: '#D43F8D', declaracion: 'Yolanda Díaz exige «cumplimiento íntegro» del acuerdo de coalición',                       quien: 'Y. Díaz',                    cuando: 'hace 35 min', sentimiento: 'NEUTRO' },
  { partido: 'SUMAR', color: '#D43F8D', declaracion: 'Sumar votará en contra del decreto si no incluye reducción jornada laboral',               quien: 'Ernest Urtasun',             cuando: 'hace 5h',     sentimiento: 'NEGATIVO' },
]

interface MediaItem { medio: string; tipo: 'TV' | 'RADIO' | 'PRENSA' | 'DIGITAL'; titular: string; alcance: number; sentiment: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO'; hora: string }
const MEDIA_MONITOR: MediaItem[] = [
  { medio: 'TVE La 1 · Telediario',     tipo: 'TV',     titular: 'Cobertura sondeo CIS · empate técnico PSOE-PP',     alcance: 1820000, sentiment: 'NEUTRO',   hora: '21:05' },
  { medio: 'Antena 3 · Espejo Público', tipo: 'TV',     titular: 'Entrevista Cuca Gamarra · «el Gobierno está acabado»', alcance: 720000,  sentiment: 'NEGATIVO', hora: '09:30' },
  { medio: 'Cadena SER · Hora 25',      tipo: 'RADIO',  titular: 'Análisis editorial · campaña en marcha',                alcance: 1340000, sentiment: 'NEUTRO',   hora: '20:00' },
  { medio: 'COPE · Herrera en COPE',    tipo: 'RADIO',  titular: 'Editorial crítico contra el adelanto electoral',        alcance: 1850000, sentiment: 'NEGATIVO', hora: '07:00' },
  { medio: 'El País · Portada',         tipo: 'PRENSA', titular: 'El Gobierno acelera la negociación de los PGE 2027',     alcance: 540000,  sentiment: 'POSITIVO', hora: '06:00' },
  { medio: 'El Mundo · Portada',        tipo: 'PRENSA', titular: '«Sánchez en el alambre» · análisis Lucía Méndez',         alcance: 480000,  sentiment: 'NEGATIVO', hora: '06:00' },
  { medio: 'ABC · Portada',             tipo: 'PRENSA', titular: 'Feijóo plantea moción de censura constructiva',           alcance: 320000,  sentiment: 'NEGATIVO', hora: '06:00' },
  { medio: 'elDiario.es · Trending',    tipo: 'DIGITAL',titular: 'La realidad detrás de la encuesta del CIS',                alcance: 290000,  sentiment: 'POSITIVO', hora: '18:30' },
]

interface WarGame { titulo: string; tipo: string; probabilidad: number; respuesta: string; color: string; tiempo_max: string; pasos: string[] }
const WAR_GAMES: WarGame[] = [
  { titulo: 'Moción de censura PP', tipo: 'Político · Parlamentario', probabilidad: 18, respuesta: 'Activación protocolo defensa parlamentaria + agenda mediática contraataque · 72h', color: '#DC2626', tiempo_max: '48h',
    pasos: ['1. Comité ejecutivo en 30 min', '2. Activar grupo parlamentario', '3. Reunión con coalición', '4. Respuesta mediática 4h', '5. Cierre filas con socios PNV/JxCat'] },
  { titulo: 'Adelanto electoral inesperado', tipo: 'Estratégico · Calendario', probabilidad: 28, respuesta: 'Comprimir agenda 60 días · maquinaria territorial · gasto acelerado 30%', color: '#F97316', tiempo_max: '24h',
    pasos: ['1. Activar plan B campaña', '2. Confirmar candidaturas', '3. Lanzar fundraising emergency', '4. Mítines compactados', '5. Ad spend acelerado'] },
  { titulo: 'Escándalo personal de líder', tipo: 'Reputacional · Crisis', probabilidad: 12, respuesta: 'Activar protocolo crisis L1 · contención mediática 4h · respuesta rueda prensa', color: '#7C3AED', tiempo_max: '4h',
    pasos: ['1. Comité crisis · 30 min', '2. Briefing legal', '3. Statement pre-acordado', '4. Rueda prensa 4h', '5. Plan media siguiente 48h'] },
  { titulo: 'Ataque cibernético coordinado', tipo: 'Digital · Seguridad', probabilidad: 8, respuesta: 'Aislamiento sistemas · backup activo · INCIBE notificación · forensic team', color: '#0EA5E9', tiempo_max: '1h',
    pasos: ['1. Aislar sistemas comprometidos', '2. Backup activo', '3. Notificar INCIBE', '4. Forensic team external', '5. Statement transparencia'] },
]

interface TalkingPoint { tema: string; mencs: number; sent: number; tendencia: 'subiendo' | 'estable' | 'bajando' }
const TALKING_POINTS: TalkingPoint[] = [
  { tema: 'Defensa servicios públicos · sanidad',   mencs: 24800, sent: 72, tendencia: 'subiendo' },
  { tema: 'Acceso vivienda joven · alquiler social', mencs: 18200, sent: 78, tendencia: 'subiendo' },
  { tema: 'Subida SMI 2027 · cobertura amplia',      mencs: 15900, sent: 65, tendencia: 'subiendo' },
  { tema: 'Pensiones · revalorización IPC',          mencs: 14300, sent: 71, tendencia: 'estable' },
  { tema: 'Empleo juvenil · contratos formación',    mencs: 9800,  sent: 58, tendencia: 'estable' },
  { tema: 'Transición energética · emisiones',       mencs: 8400,  sent: 54, tendencia: 'bajando' },
  { tema: 'Reforma fiscal · grandes patrimonios',    mencs: 12100, sent: 38, tendencia: 'bajando' },
  { tema: 'Inmigración · gestión fronteras',         mencs: 19400, sent: 32, tendencia: 'bajando' },
]

interface Endorsement { quien: string; rol: string; donde: string; cuando: string; impacto: 'ALTO' | 'MEDIO' }
const ENDORSEMENTS: Endorsement[] = [
  { quien: 'Manuel Valls',                rol: 'Ex-PM Francia',                  donde: 'X · 12k retweets',     cuando: 'hace 3h', impacto: 'ALTO' },
  { quien: 'Antonio Banderas',            rol: 'Actor · embajador cultural',     donde: 'Mitin Málaga',         cuando: 'hace 5h', impacto: 'ALTO' },
  { quien: 'CCOO Andalucía',              rol: 'Sindicato',                      donde: 'Comunicado oficial',   cuando: 'hace 1d', impacto: 'ALTO' },
  { quien: 'Asoc. Empresarios Sevilla',   rol: 'CEO Group',                      donde: 'Cena empresarial',     cuando: 'hace 1d', impacto: 'MEDIO' },
  { quien: 'Mikel Erentxun',              rol: 'Músico',                         donde: 'X · 4.2k likes',       cuando: 'hace 2d', impacto: 'MEDIO' },
  { quien: 'Asociación Vecinal Vallecas', rol: 'Sociedad civil',                 donde: 'Acto territorial',     cuando: 'hace 2d', impacto: 'MEDIO' },
]

interface Donacion { donante: string; cantidad: number; tipo: 'pequeño' | 'grande' | 'PAC'; cuando: string }
const DONACIONES: Donacion[] = [
  { donante: 'M.Á.G. (Madrid)',            cantidad: 50,    tipo: 'pequeño', cuando: 'hace 8 min' },
  { donante: 'C.R.M. (Sevilla)',           cantidad: 25,    tipo: 'pequeño', cuando: 'hace 14 min' },
  { donante: 'Asoc. Profesionales Toledo', cantidad: 800,   tipo: 'PAC',     cuando: 'hace 22 min' },
  { donante: 'Anónimo',                    cantidad: 20,    tipo: 'pequeño', cuando: 'hace 31 min' },
  { donante: 'J.L.P. (Barcelona)',         cantidad: 1200,  tipo: 'grande',  cuando: 'hace 45 min' },
  { donante: 'P.A.G. (Valencia)',          cantidad: 100,   tipo: 'pequeño', cuando: 'hace 1h' },
  { donante: 'Empresarios Centro',         cantidad: 2400,  tipo: 'PAC',     cuando: 'hace 1h' },
  { donante: 'M.J.S. (Málaga)',            cantidad: 75,    tipo: 'pequeño', cuando: 'hace 1h 15m' },
  { donante: 'L.F.R. (Bilbao)',            cantidad: 200,   tipo: 'pequeño', cuando: 'hace 1h 38m' },
  { donante: 'Anónimo',                    cantidad: 35,    tipo: 'pequeño', cuando: 'hace 2h' },
]

interface VolActivity { accion: string; voluntario: string; localidad: string; cantidad: number; cuando: string; tipo: 'puerta' | 'llamada' | 'evento' | 'redes' }
const VOL_ACTIVITY: VolActivity[] = [
  { accion: 'Puerta a puerta · 47 viviendas',      voluntario: 'Equipo Carabanchel',     localidad: 'Madrid',     cantidad: 47,  cuando: 'hace 12 min',  tipo: 'puerta' },
  { accion: 'Llamadas · 142 contactos',            voluntario: 'Equipo Triana',          localidad: 'Sevilla',    cantidad: 142, cuando: 'hace 18 min',  tipo: 'llamada' },
  { accion: 'Reparto folletos mercado',            voluntario: 'Equipo Mestalla',        localidad: 'Valencia',   cantidad: 320, cuando: 'hace 35 min',  tipo: 'evento' },
  { accion: 'Reposteo coordinado X',                voluntario: 'Equipo Digital BCN',     localidad: 'Barcelona',  cantidad: 890, cuando: 'hace 42 min',  tipo: 'redes' },
  { accion: 'Recogida firmas plaza Cataluña',      voluntario: 'Voluntarios L\'Hospitalet', localidad: 'Cataluña', cantidad: 184, cuando: 'hace 1h',     tipo: 'evento' },
  { accion: 'Llamadas · 89 contactos',             voluntario: 'Equipo Indautxu',        localidad: 'Bilbao',     cantidad: 89,  cuando: 'hace 1h 10m',  tipo: 'llamada' },
  { accion: 'Puerta a puerta · 34 viviendas',      voluntario: 'Equipo Vegueta',         localidad: 'Las Palmas', cantidad: 34,  cuando: 'hace 1h 25m',  tipo: 'puerta' },
  { accion: 'Charla informal · feria local',       voluntario: 'Equipo Plaza Mayor',     localidad: 'Salamanca',  cantidad: 120, cuando: 'hace 2h',      tipo: 'evento' },
]

interface OppAlert { titulo: string; fuente: string; gravedad: 'ALTA' | 'MEDIA' | 'BAJA'; cuando: string; descripcion: string }
const OPP_ALERTS: OppAlert[] = [
  { titulo: 'Filtración borrador interno PP · estrategia mediática mayo',           fuente: 'OSINT interno',  gravedad: 'ALTA',  cuando: 'hace 27 min', descripcion: 'Documento de 14 páginas con calendario completo de apariciones, mensajes clave por semana y target audiences. Confirma campaña de 6 semanas centrada en gestión económica y corrupción.' },
  { titulo: 'VOX coordina campaña digital con cuentas de Patriotas (UE)',           fuente: 'Análisis OSINT', gravedad: 'ALTA',  cuando: 'hace 3h',     descripcion: 'Detectados 142 cuentas de Italia, Alemania y Francia replicando contenido VOX en X y TikTok con hashtags coordinados. Crecimiento 480% últimas 72h.' },
  { titulo: 'PSOE prepara ofensiva sobre desigualdad rural',                        fuente: 'Fuente abierta', gravedad: 'MEDIA', cuando: 'hace 5h',     descripcion: 'Filtración Moncloa: nuevo paquete €2.4b para zonas despobladas a anunciar 20 mayo · busca recuperar voto rural en Castilla y León y Aragón.' },
  { titulo: 'Encuesta interna Sumar · perdiendo voto urbano joven',                 fuente: 'Filtración',     gravedad: 'MEDIA', cuando: 'hace 8h',     descripcion: 'Cae del 18% al 11% entre 18-29 años · trasvase a abstención y voto blanco · Sumar evalúa cambio de portavoces.' },
  { titulo: 'Movimientos en CCOO sobre apoyo electoral',                            fuente: 'Sindical',       gravedad: 'BAJA',  cuando: 'hace 1d',     descripcion: 'Comité confederal valora endorse condicional al PSOE si se aprueba reducción jornada · pendiente reunión 18 mayo.' },
]

const SENTIMENT_24H = [42, 45, 47, 48, 51, 53, 54, 56, 58, 60, 61, 62, 60, 58, 57, 54, 52, 51, 53, 55, 58, 60, 62, 64]
const SENTIMENT_DRIVERS = [
  { hora: '14:00', evento: 'Anuncio subida SMI 2027', delta: '+8 pts',  color: '#16A34A' },
  { hora: '11:30', evento: 'Editorial favorable El País',           delta: '+3 pts',  color: '#16A34A' },
  { hora: '09:30', evento: 'Entrevista hostil Antena 3',            delta: '−5 pts',  color: '#DC2626' },
  { hora: '07:00', evento: 'Editorial COPE adverso',                delta: '−4 pts',  color: '#DC2626' },
  { hora: '06:00', evento: 'Hashtag #DimisionSanchez trending',     delta: '−2 pts',  color: '#DC2626' },
]

const SENTIMENT_COLOR: Record<string, string> = { POSITIVO: '#16A34A', NEUTRO: '#6e6e73', NEGATIVO: '#DC2626' }
const PRIO_DEC_COLOR: Record<Decision['prioridad'], string> = { CRÍTICA: '#DC2626', ALTA: '#F97316', MEDIA: '#EAB308' }
const TIPO_VOL_COLOR: Record<VolActivity['tipo'], string> = { puerta: '#16A34A', llamada: '#0EA5E9', evento: '#F97316', redes: '#5B21B6' }

// ─── Componente principal ────────────────────────────────
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

  // P5 · Pilar 5 · estado en URL para bookmarkear secciones
  const [section, setSection] = useUrlState<SectionId>('section', 'dashboard')

  const sectionsByGroup = useMemo(() => {
    const out: Record<string, typeof SECTIONS> = {}
    for (const s of SECTIONS) { (out[s.group] ||= []).push(s) }
    return out
  }, [])

  if (loading || !data) {
    return (
      <div className="wr-root">
        <AppHeader />
        <main className="wr-loading-wrap">
          <div className="wr-loading-text">Cargando War Room...</div>
        </main>
      </div>
    )
  }

  const { candidato, kpis, encuestas, equipo, agenda, territorio, mensaje, presupuesto } = data
  const crisisActivas = crisis.filter(c => c.estado === 'Activa').length
  const tareasAbiertas = tareas.filter(t => t.estado !== 'Completada').length
  const presupRestante = presupuesto.total - presupuesto.gastado

  return (
    <div className="wr-root">
      <AppHeader/>

      {/* HERO compacto · Command Center con countdown + KPIs principales */}
      <section className="wr-hero">
        <div className="wr-hero-glow"/>
        <div className="wr-hero-inner">
          <div className="wr-hero-left">
            <div
              className="wr-hero-iniciales"
              style={{ background: candidato.color, boxShadow: `0 4px 16px ${candidato.color}80` }}
            >{candidato.iniciales}</div>
            <div>
              <p className="wr-hero-eyebrow">
                <span>WAR ROOM · COMMAND CENTER · LIVE</span>
                <LiveStatusBadge updatedAt={snapUpdated} source={snapSource} refreshIntervalSec={60} onRefresh={snapRefresh}/>
              </p>
              <div className="wr-hero-name">{candidato.nombre}</div>
              <div className="wr-hero-sub">{candidato.partido} · {candidato.cargo}</div>
            </div>
          </div>
          <div className="wr-hero-countdown">
            <p className="wr-hero-countdown-label">
              Cuenta atrás · Generales 10 ago 2026
            </p>
            <div className="wr-hero-countdown-row">
              <CDNum n={tiempo.dias}  label="DÍAS"  big/>
              <span className="wr-hero-countdown-sep">:</span>
              <CDNum n={tiempo.horas} label="HORAS"/>
              <span className="wr-hero-countdown-sep">:</span>
              <CDNum n={tiempo.min}   label="MIN"/>
            </div>
          </div>
          <div className="wr-hero-kpis">
            <HeroKPI label="Tareas abiertas"  value={String(tareasAbiertas)}  accent="#FCA5A5"/>
            <HeroKPI label="Crisis activas"   value={String(crisisActivas)}   accent="#F97316"/>
            <HeroKPI label="Presup. restante" value={`${(presupRestante/1000).toFixed(1)}M€`} accent="#7DD3FC"/>
            <HeroKPI label="Voluntarios"      value={`${(kpis.voluntarios/1000).toFixed(1)}K`} accent="#86EFAC"/>
          </div>
        </div>
      </section>

      <main className="wr-main">

        {/* SIDEBAR */}
        <aside className="wr-sidebar">
          {Object.entries(sectionsByGroup).map(([group, items]) => (
            <div key={group} className="wr-sidebar-group">
              <div className="wr-sidebar-group-label">{group}</div>
              <ul className="wr-sidebar-list">
                {items.map(s => {
                  const active = section === s.id
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setSection(s.id)}
                        className={active ? 'wr-sidebar-btn wr-sidebar-btn--active' : 'wr-sidebar-btn'}
                      >
                        <span className="wr-sidebar-icon">{s.icon}</span>
                        {s.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* CONTENIDO */}
        <div>
          {section === 'dashboard'    && <SecDashboard kpis={kpis} candidato={candidato}/>}
          {section === 'decisiones'   && <SecDecisiones/>}
          {section === 'crisis'       && <SecCrisis crisis={crisis} update={updateCrisisEstado}/>}
          {section === 'wargames'     && <SecWargames/>}
          {section === 'snapshot'     && <SecSnapshot kpis={kpis} candidato={candidato}/>}
          {section === 'encuestas'    && <SecEncuestas encuestas={encuestas}/>}
          {section === 'territorio'   && <SecTerritorio territorio={territorio} candidato={candidato}/>}
          {section === 'mensaje'      && <SecMensaje mensaje={mensaje} candidato={candidato}/>}
          {section === 'talking'      && <SecTalking/>}
          {section === 'sentimiento'  && <SecSentimiento/>}
          {section === 'adversario'   && <SecAdversario/>}
          {section === 'opp'          && <SecOpp/>}
          {section === 'media'        && <SecMedia/>}
          {section === 'endorsements' && <SecEndorsements/>}
          {section === 'agenda'       && <SecAgenda agenda={agenda}/>}
          {section === 'equipo'       && <SecEquipo equipo={equipo}/>}
          {section === 'tareas'       && <SecTareas tareas={tareas} cycle={cycleTareaEstado}/>}
          {section === 'voluntarios'  && <SecVoluntarios kpis={kpis}/>}
          {section === 'fundraising'  && <SecFundraising/>}
          {section === 'presupuesto'  && <SecPresupuesto presupuesto={presupuesto} candidato={candidato}/>}
        </div>
      </main>
    </div>
  )
}

// ═════════════ AUXILIARES ═════════════

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="wr-card" style={style}>
      {children}
    </div>
  )
}

function CardHeader({ title, sub, right, accent }: { title: string; sub?: string; right?: React.ReactNode; accent?: string }) {
  return (
    <div className="wr-card-head">
      <div className="wr-card-head-left">
        {accent && <span className="wr-card-accent" style={{ background: accent }}/>}
        <div>
          <h3 className="wr-card-title">{title}</h3>
          {sub && <p className="wr-card-sub">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

function Badge({ label, color, outline = false }: { label: string; color: string; outline?: boolean }) {
  return (
    <span className="wr-badge" style={{
      background: outline ? `${color}15` : color,
      color: outline ? color : '#fff',
      border: outline ? `1px solid ${color}40` : 'none',
    }}>{label.toUpperCase()}</span>
  )
}

function Button({ children, variant = 'primary', size = 'md', onClick }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md'; onClick?: () => void
}) {
  const variantCls = variant === 'primary' ? 'wr-btn--primary'
    : variant === 'secondary' ? 'wr-btn--secondary' : 'wr-btn--danger'
  const sizeCls = size === 'sm' ? 'wr-btn--sm' : 'wr-btn--md'
  return (
    <button onClick={onClick} className={`wr-btn ${sizeCls} ${variantCls}`}>{children}</button>
  )
}

// ═════════════ SECCIONES ═════════════

function SecDashboard({ kpis, candidato }: any) {
  return (
    <>
      <Card>
        <CardHeader title="Estado operativo · 5 indicadores live" accent="#1F4E8C"/>
        <div className="wr-ops-grid">
          {OPS_ALERTS.map(o => (
            <div key={o.label} className="wr-ops-alert" style={{
              background: `${o.color}08`,
              border: `1px solid ${o.color}30`,
              borderLeft: `3px solid ${o.color}`,
            }}>
              <div className="wr-ops-alert-label">{o.label}</div>
              <div className="wr-ops-alert-value" style={{ color: o.color }}>{o.value}</div>
              <div className="wr-ops-alert-sub">{o.sub}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Snapshot rápido del candidato" sub={`${candidato.partido} · ${candidato.cargo}`} accent={candidato.color}/>
        <div className="wr-kpi-grid-4">
          <SKpi big label="Intención de voto" value={`${kpis.intencionPP}%`}  delta="+0.4 pp · 7d" deltaPos color={candidato.color}/>
          <SKpi label="Diferencial PSOE"      value={`+${kpis.diferencialPSOE}`} sub="puntos"      delta="+0.6 pp · 7d" deltaPos color={candidato.color}/>
          <SKpi label="Conocimiento"          value={`${kpis.conocimiento}%`}  sub="población" color="#5B21B6"/>
          <SKpi label="Valoración líder"      value={`${kpis.valoracion}`}     sub="/10 · CIS"  delta="+0.1" deltaPos color="#16A34A"/>
        </div>
      </Card>
      <Card>
        <CardHeader title="Sentimiento online · 24h" sub="NSI score · evolución horaria" accent="#16A34A"/>
        <div className="wr-sent-summary">
          <span className="wr-sent-big">{SENTIMENT_24H[SENTIMENT_24H.length-1]}</span>
          <span className="wr-sent-meta">/100 · NSI</span>
          <span className="wr-sent-delta">▲ +{SENTIMENT_24H[SENTIMENT_24H.length-1] - SENTIMENT_24H[0]} pts</span>
          <span className="wr-sent-aux">· últimas 24h</span>
        </div>
        <SentimentChart points={SENTIMENT_24H}/>
      </Card>
    </>
  )
}

function SecDecisiones() {
  return (
    <Card>
      <CardHeader title="Cola de decisiones" sub={`${DECISIONES.length} pendientes · 2 críticas requieren tu atención`} accent="#DC2626" right={<Button>Marcar todas</Button>}/>
      <div className="wr-list-col">
        {DECISIONES.map(d => {
          const urgent = d.deadline.includes('h') && parseInt(d.deadline) < 5
          return (
            <div key={d.id} className="wr-dec-card" style={{ borderLeft: `3px solid ${PRIO_DEC_COLOR[d.prioridad]}` }}>
              <div className="wr-dec-head">
                <div className="wr-dec-head-left">
                  <Badge label={d.prioridad} color={PRIO_DEC_COLOR[d.prioridad]}/>
                  <span className="wr-dec-tipo">{d.tipo} · {d.resp}</span>
                </div>
                <span className={urgent ? 'wr-dec-deadline wr-dec-deadline--urgent' : 'wr-dec-deadline wr-dec-deadline--norm'}>{d.deadline}</span>
              </div>
              <div className="wr-dec-titulo">{d.titulo}</div>
              {d.descripcion && <div className="wr-dec-desc">{d.descripcion}</div>}
              <div className="wr-dec-actions">
                <Button size="sm">Aprobar</Button>
                <Button size="sm" variant="secondary">Posponer</Button>
                <Button size="sm" variant="danger">Rechazar</Button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecCrisis({ crisis, update }: any) {
  const activas = crisis.filter((c: any) => c.estado === 'Activa').length
  return (
    <Card>
      <CardHeader title="Crisis radar" sub={`${activas} crisis activa(s) de ${crisis.length} totales · monitoreo 24/7`} accent="#DC2626"/>
      <div className="wr-list-col--gap-10">
        {crisis.map((c: any) => {
          const sev = SEV_CRI[c.severidad as SeveridadCrisis]
          return (
            <div key={c.id} className="wr-crisis-card" style={{
              background: `${sev}10`,
              border: `1px solid ${sev}40`,
              borderLeft: `4px solid ${sev}`,
            }}>
              <div className="wr-crisis-head">
                <Badge label={c.severidad} color={sev}/>
                <span className="wr-crisis-tipo">· {c.tipo}</span>
                <span
                  onClick={() => update(c.id, c.estado === 'Activa' ? 'Contenida' : 'Activa')}
                  className={`wr-crisis-estado ${c.estado === 'Activa' ? 'wr-crisis-estado--activa' : 'wr-crisis-estado--contenida'}`}
                >
                  {c.estado.toUpperCase()}
                </span>
              </div>
              <div className="wr-crisis-titulo">{c.titulo}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecWargames() {
  return (
    <Card>
      <CardHeader title="War games · 4 escenarios pre-cargados" sub="Protocolos listos para ejecución inmediata" accent="#5B21B6"/>
      <div className="wr-wargames-grid">
        {WAR_GAMES.map(w => (
          <div key={w.titulo} className="wr-wargame-card" style={{
            background: `${w.color}06`,
            border: `1px solid ${w.color}30`,
            borderLeft: `3px solid ${w.color}`,
          }}>
            <div className="wr-wargame-head">
              <span className="wr-wargame-titulo">{w.titulo}</span>
              <span className="wr-wargame-prob" style={{ color: w.color }}>{w.probabilidad}%</span>
            </div>
            <div className="wr-wargame-tipo">
              {w.tipo} · respuesta máx {w.tiempo_max}
            </div>
            <div className="wr-wargame-resp">{w.respuesta}</div>
            <div className="wr-wargame-pasos" style={{ border: `1px solid ${w.color}25` }}>
              <div className="wr-wargame-pasos-label">Pasos protocolo</div>
              <ul className="wr-wargame-pasos-ul">
                {w.pasos.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="wr-wargame-cta">
              <Button size="sm">▶ Activar protocolo</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SecSnapshot({ kpis, candidato }: any) {
  return (
    <Card>
      <CardHeader title="Snapshot electoral · 8 indicadores" sub={`${candidato.partido} · ${candidato.cargo}`} accent={candidato.color}/>
      <div className="wr-kpi-grid-4">
        <SKpi big label="Intención de voto" value={`${kpis.intencionPP}%`}  delta="+0.4 pp · 7d" deltaPos color={candidato.color}/>
        <SKpi label="Diferencial PSOE"      value={`+${kpis.diferencialPSOE}`} sub="puntos"      delta="+0.6 pp · 7d" deltaPos color={candidato.color}/>
        <SKpi label="Conocimiento"          value={`${kpis.conocimiento}%`}  sub="población adulta" color="#5B21B6"/>
        <SKpi label="Valoración líder"      value={`${kpis.valoracion}`}     sub="/10 · CIS"        delta="+0.1 vs mes" deltaPos color="#16A34A"/>
        <SKpi label="Imagen líder"          value={`${kpis.imagenLider}`}    sub="/10 · 40dB"       delta="estable" color="#0EA5E9"/>
        <SKpi label="Particip. prevista"    value={`${kpis.participacionPrev}%`} sub="estimación"    color="#F97316"/>
        <SKpi label="Locales abiertos"      value={`${kpis.localesAbiertos}`} sub="48 provincias"   color="#16A34A"/>
        <SKpi label="Voluntarios activos"   value={`${kpis.voluntarios.toLocaleString('es-ES')}`} sub="reg. esta semana" color={candidato.color}/>
      </div>
    </Card>
  )
}

function SecEncuestas({ encuestas }: any) {
  return (
    <Card>
      <CardHeader title="Encuestas · últimas 6 olas" sub="Tracker semanal · todas las casas demoscópicas" accent="#1F4E8C"/>
      <table className="wr-table">
        <thead>
          <tr>
            {['Fecha','Casa','Cliente','PP','PSOE','VOX','Sumar','Otros'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {encuestas.map((e: any, i: number) => (
            <tr key={i}>
              <td className="wr-table-fecha">{e.fecha}</td>
              <td className="wr-table-casa">{e.casa}</td>
              <td className="wr-table-cliente">{e.cliente}</td>
              <td className="wr-table-num wr-table-num--pp">{e.pp}</td>
              <td className="wr-table-num wr-table-num--psoe">{e.psoe}</td>
              <td className="wr-table-num wr-table-num--vox">{e.vox}</td>
              <td className="wr-table-num wr-table-num--sumar">{e.sumar}</td>
              <td className="wr-table-num wr-table-num--otros">{e.otros}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SecTerritorio({ territorio, candidato }: any) {
  const sorted = [...territorio].sort((a: any, b: any) => {
    const order: any = { 'Crítica':0, 'Alta':1, 'Media':2, 'Mantener':3 }
    return order[a.prioridad] - order[b.prioridad]
  })
  return (
    <Card>
      <CardHeader
        title="Mapa territorial · prioridad de campaña"
        sub={`${territorio.length} provincias · 17 CCAA`}
        accent="#F97316"
        right={<div className="wr-leyenda">
          {(['Crítica','Alta','Media','Mantener'] as PrioridadTerritorio[]).map(p => (
            <span key={p} className="wr-leyenda-item">
              <span className="wr-leyenda-dot" style={{ background: PRIO_COLOR[p] }}/>
              {p}
            </span>
          ))}
        </div>}
      />
      <div className="wr-territorio-wrap">
        <table className="wr-table-territorio">
          <thead>
            <tr>
              {['Provincia','CCAA','Prioridad','Intención','Gap PSOE','% recursos','Voluntarios'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t: any, i: number) => (
              <tr key={i} className={i%2 ? 'wr-row-alt' : undefined}>
                <td className="wr-terr-prov">{t.prov}</td>
                <td className="wr-terr-ccaa">{t.ccaa}</td>
                <td><Badge label={t.prioridad} color={PRIO_COLOR[t.prioridad as PrioridadTerritorio]}/></td>
                <td className="wr-terr-intencion" style={{ color: candidato.color }}>{t.intencion.toFixed(1)}%</td>
                <td className={t.gap > 0 ? 'wr-terr-gap wr-terr-gap--pos' : 'wr-terr-gap wr-terr-gap--neg'}>{t.gap > 0 ? `+${t.gap}` : t.gap} pp</td>
                <td>
                  <div className="wr-terr-rec-row">
                    <div className="wr-terr-rec-track">
                      <div className="wr-terr-rec-fill" style={{ width: `${(t.recursos / 22) * 100}%`, background: candidato.color }}/>
                    </div>
                    <span className="wr-terr-rec-num" style={{ color: candidato.color }}>{t.recursos}%</span>
                  </div>
                </td>
                <td className="wr-terr-vol">{t.voluntarios.toLocaleString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SecMensaje({ mensaje, candidato }: any) {
  return (
    <Card style={{ background:`linear-gradient(135deg, ${candidato.color}05, ${candidato.color}01)`, border:`1px solid ${candidato.color}40` }}>
      <CardHeader
        title="Mensaje del día"
        sub={`Hashtag · ${mensaje.hashtag}`}
        accent={candidato.color}
        right={<Badge label="MENSAJE OFICIAL" color={candidato.color}/>}
      />
      <h2 className="wr-mensaje-titular">
        «{mensaje.titular}»
      </h2>
      <p className="wr-mensaje-sub">{mensaje.subtitular}</p>

      <div className="wr-mensaje-block">
        <div className="wr-mensaje-label">Pilares del mensaje</div>
        <div className="wr-list-col">
          {mensaje.pilares.map((p: any, i: number) => (
            <div key={i} className="wr-mensaje-pilar">
              <span className="wr-mensaje-pilar-num" style={{ color: candidato.color }}>{i+1}</span>
              <div className="wr-mensaje-pilar-txt">
                <strong>{p.p}.</strong> {p.detalle}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wr-mensaje-bottom-grid">
        <div className="wr-mensaje-contraste">
          <div className="wr-mensaje-contraste-label">Contraste</div>
          <div className="wr-mensaje-contraste-txt">{mensaje.contraste}</div>
        </div>
        <div className="wr-mensaje-evitar">
          <div className="wr-mensaje-evitar-label">Evitar comentar</div>
          <div className="wr-mensaje-evitar-pills">
            {mensaje.evitar.map((e: string) => (
              <span key={e} className="wr-mensaje-evitar-pill">{e}</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function SecTalking() {
  return (
    <Card>
      <CardHeader title="Talking points · heat map" sub="Análisis online 24h · ordenado por menciones" accent="#16A34A"/>
      <div className="wr-list-col">
        {TALKING_POINTS.map(t => {
          const sentColor = t.sent >= 60 ? '#16A34A' : t.sent >= 45 ? '#EAB308' : '#DC2626'
          const trendIcon = t.tendencia === 'subiendo' ? '▲' : t.tendencia === 'bajando' ? '▼' : '—'
          const trendColor = t.tendencia === 'subiendo' ? '#16A34A' : t.tendencia === 'bajando' ? '#DC2626' : '#6e6e73'
          return (
            <div key={t.tema} className="wr-talking-row" style={{ borderLeft: `3px solid ${sentColor}` }}>
              <div className="wr-talking-min0">
                <div className="wr-talking-tema">{t.tema}</div>
                <div className="wr-talking-bar-row">
                  <div className="wr-talking-bar-track">
                    <div className="wr-talking-bar-fill" style={{ width: `${t.sent}%`, background: sentColor }}/>
                  </div>
                  <span className="wr-talking-sent-num" style={{ color: sentColor }}>{t.sent}/100</span>
                </div>
              </div>
              <div className="wr-talking-mencs-block">
                <div className="wr-talking-mencs-val">{(t.mencs/1000).toFixed(1)}k</div>
                <div className="wr-talking-mencs-label">menciones</div>
              </div>
              <span className="wr-talking-trend" style={{ color: trendColor }}>{trendIcon}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecSentimiento() {
  return (
    <>
      <Card>
        <CardHeader title="NSI · Net Sentiment Indicator" sub="Última lectura · ventana 24h" accent="#16A34A"/>
        <div className="wr-sent-summary--lg">
          <span className="wr-sent-big--xl">{SENTIMENT_24H[SENTIMENT_24H.length-1]}</span>
          <span className="wr-sent-meta--lg">/100</span>
          <span className="wr-sent-delta--lg">▲ +{SENTIMENT_24H[SENTIMENT_24H.length-1] - SENTIMENT_24H[0]} pts vs. ayer</span>
        </div>
        <SentimentChart points={SENTIMENT_24H} large/>
      </Card>
      <Card>
        <CardHeader title="Drivers de sentimiento · últimas 24h" sub="Eventos que han movido el NSI" accent="#5B21B6"/>
        <div className="wr-list-col--gap-6">
          {SENTIMENT_DRIVERS.map((d, i) => (
            <div key={i} className="wr-sent-driver-row">
              <span className="wr-sent-driver-hora">{d.hora}</span>
              <span className="wr-sent-driver-evento">{d.evento}</span>
              <Badge label={d.delta} color={d.color}/>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function SecAdversario() {
  return (
    <Card>
      <CardHeader title="Adversarios · live feed" sub={`${ADVERSARIO_FEED.length} declaraciones tracked últimas 24h`} accent="#DC2626"/>
      <div className="wr-adv-grid">
        {(['PSOE', 'VOX', 'SUMAR'] as const).map(partido => {
          const items = ADVERSARIO_FEED.filter(a => a.partido === partido)
          const color = items[0]?.color || '#525258'
          return (
            <div key={partido} className="wr-adv-col">
              <div className="wr-adv-header" style={{ background: color }}>{partido} · {items.length}</div>
              {items.map((a, i) => (
                <div key={i} className="wr-adv-item" style={{
                  background: `${color}06`,
                  border: `1px solid ${color}25`,
                  borderLeft: `2px solid ${color}`,
                }}>
                  <div className="wr-adv-decl">{a.declaracion}</div>
                  <div className="wr-adv-meta">
                    <span className="wr-adv-meta-quien">{a.quien}</span>
                    <span>{a.cuando}</span>
                  </div>
                  <Badge label={a.sentimiento} color={SENTIMENT_COLOR[a.sentimiento]}/>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecOpp() {
  return (
    <Card>
      <CardHeader title="Opposition research · alertas" sub={`${OPP_ALERTS.length} señales activas · OSINT + fuentes internas`} accent="#7C3AED"/>
      <div className="wr-list-col--gap-10">
        {OPP_ALERTS.map((a, i) => {
          const cgrav = a.gravedad === 'ALTA' ? '#DC2626' : a.gravedad === 'MEDIA' ? '#F97316' : '#EAB308'
          return (
            <div key={i} className="wr-opp-card" style={{ borderLeft: `3px solid ${cgrav}` }}>
              <div className="wr-opp-head">
                <div className="wr-opp-head-left">
                  <Badge label={a.gravedad} color={cgrav}/>
                  <span className="wr-opp-fuente">{a.fuente}</span>
                </div>
                <span className="wr-opp-cuando">{a.cuando}</span>
              </div>
              <div className="wr-opp-titulo">{a.titulo}</div>
              <div className="wr-opp-desc">{a.descripcion}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecMedia() {
  const totalAlcance = MEDIA_MONITOR.reduce((s, m) => s + m.alcance, 0)
  return (
    <Card>
      <CardHeader title="Media monitor · cobertura últimas 24h" sub={`${MEDIA_MONITOR.length} apariciones · ${(totalAlcance/1_000_000).toFixed(1)}M alcance acumulado`} accent="#0EA5E9"/>
      <table className="wr-table">
        <thead>
          <tr>
            {['Medio','Tipo','Titular','Alcance','Sentiment','Hora'].map(h => (
              <th key={h} className="wr-media-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEDIA_MONITOR.map((m, i) => (
            <tr key={i}>
              <td className="wr-media-td wr-media-medio">{m.medio}</td>
              <td className="wr-media-td"><Badge label={m.tipo} color="#525258"/></td>
              <td className="wr-media-td wr-media-titular">{m.titular}</td>
              <td className="wr-media-td wr-media-alc">{(m.alcance/1000).toFixed(0)}k</td>
              <td className="wr-media-td"><Badge label={m.sentiment} color={SENTIMENT_COLOR[m.sentiment]}/></td>
              <td className="wr-media-td wr-media-hora">{m.hora}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SecEndorsements() {
  return (
    <Card>
      <CardHeader title="Endorsements · apoyos del mes" sub={`${ENDORSEMENTS.length} apoyos · ${ENDORSEMENTS.filter(e => e.impacto === 'ALTO').length} de impacto ALTO`} accent="#7C3AED"/>
      <div className="wr-endo-grid">
        {ENDORSEMENTS.map((e, i) => {
          const c = e.impacto === 'ALTO' ? '#7C3AED' : '#A78BFA'
          return (
            <div key={i} className="wr-endo-card" style={{ borderLeft: `3px solid ${c}` }}>
              <div className="wr-endo-head">
                <span className="wr-endo-quien">{e.quien}</span>
                <Badge label={e.impacto} color={c}/>
              </div>
              <div className="wr-endo-rol">{e.rol}</div>
              <div className="wr-endo-meta">{e.donde} · {e.cuando}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecAgenda({ agenda }: any) {
  return (
    <Card>
      <CardHeader title="Agenda · próximos 10 días" sub={`${agenda.length} actos programados`} accent="#1F4E8C" right={<Button>+ Nuevo acto</Button>}/>
      <div className="wr-list-col">
        {agenda.map((a: any, i: number) => (
          <div key={i} className="wr-agenda-row">
            <div className="wr-agenda-date">
              <div className="wr-agenda-fecha">{a.fecha.slice(0,5)}</div>
              <div className="wr-agenda-hora">{a.hora}</div>
            </div>
            <div className="wr-agenda-bar" style={{ background: TIPO_COLOR[a.tipo as TipoActo] }}/>
            <div className="wr-agenda-mid">
              <div className="wr-agenda-meta">
                <Badge label={a.tipo} color={TIPO_COLOR[a.tipo as TipoActo]}/>
                <span className="wr-agenda-coverage">· {a.coverage.toUpperCase()}</span>
                {a.aforo && <span className="wr-agenda-aforo">· {a.aforo.toLocaleString('es-ES')} aforo</span>}
              </div>
              <div className="wr-agenda-titulo">{a.titulo}</div>
              <div className="wr-agenda-ubic">{a.ubicacion}</div>
            </div>
            <Badge label={a.estado} color={ESTADO_ACTO[a.estado]}/>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SecEquipo({ equipo }: any) {
  return (
    <Card>
      <CardHeader title="Equipo central" sub={`${equipo.length} miembros · estado en directo`} accent="#5B21B6"/>
      <div className="wr-equipo-grid">
        {equipo.map((m: any) => (
          <div key={m.rol} className="wr-equipo-row">
            <div className="wr-equipo-avatar" style={{ background: ROL_COLOR[m.rol as RolEquipo] }}>
              {m.nombre.split(/\s+/).slice(0,2).map((s: string) => s[0]).join('').toUpperCase()}
            </div>
            <div className="wr-equipo-mid">
              <Badge label={m.rol} color={ROL_COLOR[m.rol as RolEquipo]} outline/>
              <div className="wr-equipo-nombre">{m.nombre}</div>
              <div className="wr-equipo-ult">{m.ult}</div>
            </div>
            <Badge label={m.estado} color={ESTADO_META[m.estado as EstadoMiembro]?.color || '#6e6e73'}/>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SecTareas({ tareas, cycle }: any) {
  return (
    <Card>
      <CardHeader title="Tareas críticas del día" sub={`${tareas.filter((t: any) => t.estado === 'Completada').length}/${tareas.length} completadas`} accent="#5B21B6" right={<Button>+ Nueva tarea</Button>}/>
      <table className="wr-tareas-table">
        <thead>
          <tr>
            {['Tarea','Responsable','Plazo','Estado'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tareas.map((t: any) => {
            const tarColor = TAR_COLOR[t.estado as EstadoTarea]
            return (
              <tr key={t.id}>
                <td className="wr-tareas-tarea">{t.tarea}</td>
                <td className="wr-tareas-resp">{t.resp}</td>
                <td className="wr-tareas-plazo">{t.plazo}</td>
                <td>
                  <span
                    onClick={() => cycle(t.id)}
                    className="wr-tareas-estado"
                    style={{
                      background: `${tarColor}15`,
                      color: tarColor,
                      border: `1px solid ${tarColor}40`,
                    }}
                  >
                    {t.estado.toUpperCase()}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function SecVoluntarios({ kpis }: any) {
  return (
    <>
      <Card>
        <CardHeader title="Voluntarios · KPIs" accent="#16A34A"/>
        <div className="wr-kpi-grid-4">
          <SKpi big label="Voluntarios totales" value={kpis.voluntarios.toLocaleString('es-ES')} delta="+184 esta semana" deltaPos color="#16A34A"/>
          <SKpi label="Activos hoy"   value="1.247" sub="38 provincias" color="#16A34A"/>
          <SKpi label="Locales"       value={`${kpis.localesAbiertos}`} sub="48 provincias" color="#0EA5E9"/>
          <SKpi label="Ratio activación" value="48%" sub="objetivo 60%" color="#F97316"/>
        </div>
      </Card>
      <Card>
        <CardHeader title="Activity feed · últimas 2 horas" sub={`${VOL_ACTIVITY.length} acciones registradas`} accent="#16A34A"/>
        <div className="wr-list-col">
          {VOL_ACTIVITY.map((v, i) => (
            <div key={i} className="wr-vol-row">
              <div className="wr-vol-icon" style={{ background: TIPO_VOL_COLOR[v.tipo] }}>
                {v.tipo === 'puerta' ? '⌂' : v.tipo === 'llamada' ? '☎' : v.tipo === 'evento' ? '★' : ''}
              </div>
              <div className="wr-vol-mid">
                <div className="wr-vol-accion">{v.accion}</div>
                <div className="wr-vol-meta">{v.voluntario} · {v.localidad} · {v.cuando}</div>
              </div>
              <span className="wr-vol-num" style={{ color: TIPO_VOL_COLOR[v.tipo] }}>{v.cantidad}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function SecFundraising() {
  const total = 1247840
  const meta = 2_000_000
  const pct = (total / meta) * 100
  return (
    <>
      <Card>
        <CardHeader title="Fundraising · acumulado de campaña" sub={`Meta €${(meta/1000).toFixed(0)}K · ${pct.toFixed(1)}% completado`} accent="#0EA5E9"/>
        <div className="wr-fund-hero">
          <div className="wr-fund-head">
            <div>
              <div className="wr-fund-label">Acumulado total</div>
              <div className="wr-fund-total">€{total.toLocaleString('es-ES')}</div>
              <div className="wr-fund-donantes">3.842 donantes · 24h: <strong>€42.380</strong> de 218 nuevos</div>
            </div>
            <div className="wr-fund-meta-block">
              <div className="wr-fund-label">Meta</div>
              <div className="wr-fund-meta-value">€{meta.toLocaleString('es-ES')}</div>
            </div>
          </div>
          <div className="wr-fund-bar">
            <div className="wr-fund-bar-fill" style={{ width: `${pct}%` }}/>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Donaciones recientes" sub={`${DONACIONES.length} últimas · live feed`} accent="#0EA5E9"/>
        <div className="wr-list-col--gap-6">
          {DONACIONES.map((d, i) => (
            <div key={i} className="wr-don-row">
              <div className="wr-don-mid">
                <div className="wr-don-donante">{d.donante}</div>
                <div className="wr-don-cuando">{d.cuando}</div>
              </div>
              <Badge label={d.tipo} color={d.tipo==='grande' ? '#0EA5E9' : d.tipo==='PAC' ? '#7C3AED' : '#16A34A'}/>
              <span className="wr-don-cantidad">€{d.cantidad}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function SecPresupuesto({ presupuesto, candidato }: any) {
  return (
    <Card>
      <CardHeader title="Presupuesto de campaña" sub={`${(presupuesto.gastado/1000).toFixed(2)}M€ ejecutados de ${(presupuesto.total/1000).toFixed(2)}M€`} accent="#B45309"/>
      <div className="wr-pres-meta-block">
        <div className="wr-pres-bar">
          <div
            className="wr-pres-bar-fill"
            style={{
              width: `${(presupuesto.gastado / presupuesto.total) * 100}%`,
              background: `linear-gradient(90deg, ${candidato.color}, ${candidato.color}aa)`,
            }}
          />
        </div>
        <div className="wr-pres-meta-row">
          <span>{Math.round((presupuesto.gastado / presupuesto.total) * 100)}% ejecutado</span>
          <span>Restante: <strong>{((presupuesto.total - presupuesto.gastado)/1000).toFixed(2)}M€</strong></span>
        </div>
      </div>
      <div className="wr-pres-label">Distribución por línea</div>
      <div className="wr-pres-list">
        {presupuesto.lineas.map((p: any) => {
          const pct = (p.gastado / p.presupuestado) * 100
          return (
            <div key={p.concepto}>
              <div className="wr-pres-row-head">
                <span className="wr-pres-row-concepto">{p.concepto}</span>
                <span className="wr-pres-row-value" style={{ color: p.color }}>{p.gastado}K€<span className="wr-pres-row-value-muted"> / {p.presupuestado}K€ · {pct.toFixed(0)}%</span></span>
              </div>
              <div className="wr-pres-row-track">
                <div className="wr-pres-row-fill" style={{ width: `${pct}%`, background: p.color }}/>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SentimentChart({ points, large }: { points: number[]; large?: boolean }) {
  const W = large ? 700 : 280
  const H = large ? 160 : 80
  const P = 8
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
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="wr-sentchart">
      <path d={area} fill="#16A34A20"/>
      <path d={path} fill="none" stroke="#16A34A" strokeWidth={2}/>
      {points.map((v, i) => {
        const x = P + (i / (points.length - 1)) * (W - 2 * P)
        const y = P + (1 - (v - min) / range) * (H - 2 * P)
        return <circle key={i} cx={x} cy={y} r={1.8} fill="#16A34A"/>
      })}
    </svg>
  )
}
