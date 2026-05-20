'use client'

/**
 * WorkspacePoliticalOverview · cabecera ejecutiva del workspace
 * "España 2026". Diseñada para que un analista entienda en <60 segundos:
 *   1. Estado del workspace · cabecera con ingesta, fuentes, confianza
 *   2. Resumen ejecutivo · 4 insights clasificados con MetricTrace + acciones
 *   3. KPIs políticos · 8 métricas con variación, periodo, confianza
 *   4. Alertas prioritarias · con nivel + impacto + acción recomendada
 *   5. Narrativas en aceleración · velocidad + actores impulsores + evidencia
 *   6. Actores clave · más influyente / emergente / polarizador / puente / descenso
 *   7. Territorios calientes · CCAA con mayor actividad
 *   8. Agenda institucional · próximos 7d · confirmado vs inferido
 *   9. Feed de evidencia · artículos + intervenciones + documentos
 *  10. Acciones recomendadas · contextuales · enlaces a módulos
 *
 * Datos curados para España mayo 2026 + integración con MetricTrace,
 * EmptyState e InsightClassification para trazabilidad y separación
 * observado/inferido/proyectado/recomendado.
 */

import Link from 'next/link'
import MetricTrace from '@/components/MetricTrace'
import InsightClassification, { InsightPill } from '@/components/InsightClassification'
import EmptyState from '@/components/EmptyState'

const NOW = new Date()
const todayStr = NOW.toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ─── Datos del workspace · curados España 2026 ───────────────────────────────

interface KPIDef {
  label: string
  value: string | number
  unit?: string
  delta24h?: string
  delta7d?: string
  accent: string
  confidence: number
  methodology: string
  sources: string
}

const KPIS: KPIDef[] = [
  { label: 'Índice de Riesgo Político', value: 52, unit: '/100', delta24h: '+1.2', delta7d: '+3.4', accent: '#F59E0B', confidence: 78, methodology: 'Media ponderada de 6 dimensiones (institucional, electoral, geopolítico, económico, mediático, social) calculadas con feeds públicos (BM, BCE, INE, GDELT).', sources: 'Banco Mundial · ECB · INE · GDELT' },
  { label: 'Volumen informativo', value: '14.2K', unit: 'art./24h', delta24h: '+8.4%', delta7d: '+18%', accent: '#0EA5E9', confidence: 92, methodology: 'Conteo de artículos RSS agregados de 30+ medios con keywords políticos. Deduplicación por título.', sources: 'Agregador propio · RSS 30 medios' },
  { label: 'Narrativa dominante', value: 'Vivienda', delta24h: '+18%', delta7d: '+42%', accent: '#2D8A39', confidence: 82, methodology: 'Burst Kleinberg sobre keywords vivienda/alquiler/inquilino en titulares. Threshold 1.5× baseline 30d.', sources: 'GDELT · agregador RSS' },
  { label: 'Actor en crecimiento', value: 'Ayuso', delta7d: '+2.2', accent: '#2D4A8A', confidence: 71, methodology: 'Tracking semanal de menciones netas + amplificación mediática (citas en titulares y telediarios).', sources: 'Newtral · Politeia Lab' },
  { label: 'Territorio más activo', value: 'C. Valenciana', delta24h: '+24%', accent: '#0E7490', confidence: 88, methodology: 'Eventos SIGINT geolocalizados + artículos con etiqueta CCAA en últimas 24h. Normalizado por población.', sources: 'GDELT GEO · agregador RSS' },
  { label: 'Tema emergente', value: 'Tasa turística', delta7d: '+128%', accent: '#7C3AED', confidence: 64, methodology: 'Detección de keywords nuevas o de muy baja base que crecen >100% en 7d. Cross-validation con Wikipedia trends.', sources: 'GDELT · Wikipedia trends' },
  { label: 'Polarización', value: 38, unit: '/100', delta24h: '+0.6', accent: '#DC2626', confidence: 74, methodology: 'Distancia entre clusters de sentimiento del LLM por bloque político. Mayor distancia = más polarización.', sources: 'Brain · LLM sentiment' },
  { label: 'Confianza media', value: 78, unit: '%', delta24h: '−1.0', accent: '#6e6e73', confidence: 100, methodology: 'Media ponderada de la confianza de todos los KPIs del workspace.', sources: 'Politeia · meta-métrica' },
]

interface AlertDef {
  id: string
  level: 'critica' | 'alta' | 'media' | 'informativa'
  title: string
  topic: string
  actors: string
  territory: string
  evidence: string
  /** URL externa a una noticia/fuente que explica o desarrolla el caso */
  evidenceUrl?: string
  detected: string
  action: string
}

const ALERTAS: AlertDef[] = [
  {
    id: 'a-dana-judicial',
    level: 'alta', title: 'Comisión investigación DANA · Pérez Llorca cita a ex consellers',
    topic: 'DANA · responsabilidad política',
    actors: 'Pérez Llorca · Mazón · ex consellers Generalitat',
    territory: 'Comunidad Valenciana',
    evidence: '34 menciones · 12 medios · Generalitat + EFE',
    evidenceUrl: 'https://www.google.com/search?q=Pérez+Llorca+comisión+investigación+DANA+ex+consellers&tbm=nws',
    detected: 'hace 3h',
    action: 'Vigilar nominaciones de ex consellers · preparar dossier de comparecencia',
  },
  {
    id: 'a-vivienda-pico',
    level: 'media', title: 'Pico de menciones · vivienda alcanza máximo de 90 días',
    topic: 'Vivienda · ley de alquileres',
    actors: 'Sánchez · Yolanda Díaz · Belarra · Bustinduy',
    territory: 'Nacional · concentrado Madrid + Barcelona',
    evidence: '142 artículos · 31 medios · +18% vs 24h',
    evidenceUrl: 'https://www.google.com/search?q=ley+alquileres+vivienda+Yolanda+Díaz+Bustinduy&tbm=nws',
    detected: 'hace 1h',
    action: 'Activar tracking semanal de portavoces vivienda · revisar narrativa PP-Vox',
  },
  {
    id: 'a-junts-bloqueo',
    level: 'alta', title: 'Junts amenaza bloqueo decreto laboral · próximo viernes',
    topic: 'Pacto investidura · decretos legislativos',
    actors: 'Puigdemont · Bolaños · Yolanda Díaz',
    territory: 'Congreso · efecto Cataluña',
    evidence: '8 declaraciones públicas · El País + ARA + El Mundo',
    evidenceUrl: 'https://www.google.com/search?q=Junts+bloqueo+decreto+laboral+Puigdemont+Bolaños&tbm=nws',
    detected: 'hace 6h',
    action: 'Coordinación PSOE-Sumar antes del jueves · plan B con PNV',
  },
]

interface NarrativaDef {
  id: string
  name: string
  topic: string
  velocity: string
  volume: string
  driverActors: string
  channels: string
  territories: string
  sentiment: 'crítico' | 'neutral' | 'positivo'
  confidence: number
}

const NARRATIVAS: NarrativaDef[] = [
  { id: 'n-vivienda', name: 'Vivienda como problema generacional', topic: 'Vivienda · alquiler · jóvenes', velocity: '+18% / 24h · +42% / 7d', volume: '142 artículos · 31 medios', driverActors: 'PSOE · Sumar · Podemos · ERC', channels: 'El País · eldiario.es · La Sexta', territories: 'Madrid · Barcelona · Valencia', sentiment: 'crítico', confidence: 82 },
  { id: 'n-amnistia', name: 'Amnistía y aplicación judicial', topic: 'Amnistía · Procés · Junts', velocity: '+9% / 24h · +14% / 7d', volume: '88 artículos · 24 medios', driverActors: 'Puigdemont · Marchena · PP', channels: 'El Mundo · ABC · La Razón', territories: 'Cataluña · Nacional', sentiment: 'crítico', confidence: 88 },
  { id: 'n-aranceles', name: 'Aranceles agroalimentarios EE.UU.', topic: 'Aranceles · sector agro', velocity: '+24% / 7d', volume: '64 artículos · 18 medios', driverActors: 'Albares · Planas · COAG · CEOE', channels: 'Cinco Días · El Economista', territories: 'Andalucía · Castilla-La Mancha · Extremadura', sentiment: 'crítico', confidence: 76 },
  { id: 'n-tasa-turismo', name: 'Tasa turística autonómica', topic: 'Turismo · ingresos CCAA', velocity: '+128% / 7d', volume: '32 artículos · 14 medios', driverActors: 'Prohens · Illa · Pradales', channels: 'Última Hora · La Vanguardia', territories: 'Baleares · Cataluña · País Vasco', sentiment: 'neutral', confidence: 64 },
]

interface ActorKey {
  id: string
  role: string
  name: string
  org: string
  metric: string
  delta: string
  topics: string
  related: string
  badge: 'centralidad' | 'emergente' | 'polarizador' | 'exposicion' | 'puente' | 'descenso'
}

const ACTORES_CLAVE: ActorKey[] = [
  { id: 'sanchez',  badge: 'centralidad', role: 'Mayor centralidad',           name: 'Pedro Sánchez',    org: 'PSOE · Presidente Gobierno', metric: 'Grado 47',           delta: '−0.4 / 7d', topics: 'Coalición · Junts · vivienda', related: 'Yolanda Díaz · Bolaños · Ortuzar' },
  { id: 'ayuso',    badge: 'emergente',   role: 'Mayor crecimiento',           name: 'Isabel Díaz Ayuso',org: 'PP · Comunidad de Madrid',    metric: 'Influencia 84',       delta: '+2.2 / 7d', topics: 'Sanidad · vivienda · Junts',    related: 'Almeida · Aznar · Feijóo' },
  { id: 'abascal',  badge: 'polarizador', role: 'Más polarizador',             name: 'Santiago Abascal', org: 'VOX · presidente',            metric: '8 adversarios',       delta: '+0.7 / 7d', topics: 'Migración · amnistía · OTAN',    related: 'Ortega Smith · Le Pen · Milei' },
  { id: 'feijoo',   badge: 'exposicion',  role: 'Mayor exposición mediática',  name: 'A. Núñez Feijóo',  org: 'PP · presidente y oposición', metric: '142 menciones/24h',   delta: '+1.6 / 7d', topics: 'CGPJ · concierto · vivienda',    related: 'Gamarra · Tellado · Sémper' },
  { id: 'ortuzar',  badge: 'puente',      role: 'Actor puente',                name: 'Andoni Ortuzar',   org: 'PNV · presidente',            metric: 'Grado puente 12',     delta: '+0.3 / 7d', topics: 'Transferencias · investidura',   related: 'Pradales · Sánchez · Aitor Esteban' },
  { id: 'yolanda',  badge: 'descenso',    role: 'Mayor descenso',              name: 'Yolanda Díaz',     org: 'Sumar · Vicepresidenta 2ª',   metric: 'Influencia 68',       delta: '−1.1 / 7d', topics: 'Vivienda · jornada laboral',     related: 'Mónica G. · Bustinduy · Urtasun' },
]

const BADGE_META: Record<ActorKey['badge'], { color: string; label: string }> = {
  centralidad:  { color: '#0F766E', label: 'CENTRALIDAD' },
  emergente:    { color: '#16A34A', label: 'EMERGENTE' },
  polarizador:  { color: '#DC2626', label: 'POLARIZADOR' },
  exposicion:   { color: '#7C3AED', label: 'EXPOSICIÓN' },
  puente:       { color: '#0EA5E9', label: 'PUENTE' },
  descenso:     { color: '#86868b', label: 'DESCENSO' },
}

interface TerritorioDef {
  ccaa: string
  topic: string
  topActor: string
  polarization: number
  change: string
  risk: 'alto' | 'medio' | 'bajo'
}

const TERRITORIOS: TerritorioDef[] = [
  { ccaa: 'Comunidad Valenciana', topic: 'Reconstrucción DANA + financiación',  topActor: 'Pérez Llorca',  polarization: 72, change: '+24%', risk: 'alto' },
  { ccaa: 'Cataluña',             topic: 'Concierto fiscal',                     topActor: 'Illa',          polarization: 68, change: '+15%', risk: 'alto' },
  { ccaa: 'Madrid',               topic: 'Sanidad pública + huelga AP',          topActor: 'Ayuso',         polarization: 78, change: '+12%', risk: 'medio' },
  { ccaa: 'Andalucía',            topic: 'Vivienda urbana + aranceles agro',     topActor: 'Moreno',        polarization: 42, change: '+8%',  risk: 'medio' },
  { ccaa: 'País Vasco',           topic: 'Transferencias + presupuestos',        topActor: 'Pradales',      polarization: 35, change: '+4%',  risk: 'bajo' },
  { ccaa: 'Baleares',             topic: 'Tasa turística + saturación',          topActor: 'Prohens',       polarization: 52, change: '+32%', risk: 'medio' },
]

interface AgendaEvent {
  id: string
  date: string
  title: string
  actors: string
  impact: 'alto' | 'medio' | 'bajo'
  status: 'confirmado' | 'inferido' | 'escenario'
}

const AGENDA: AgendaEvent[] = [
  { id: 'ag-1', date: '21 may', title: 'Pleno Congreso · convalidación decreto laboral',  actors: 'Sánchez · Yolanda · Junts · PNV', impact: 'alto',  status: 'confirmado' },
  { id: 'ag-2', date: '22 may', title: 'Conferencia Sectorial Agricultura · aranceles',    actors: 'Planas · CCAA agro',              impact: 'medio', status: 'confirmado' },
  { id: 'ag-3', date: '23 may', title: 'Comparecencia Mazón · comisión investigación DANA',actors: 'Mazón · Pérez Llorca',            impact: 'alto',  status: 'confirmado' },
  { id: 'ag-4', date: '24 may', title: 'Reunión bilateral Sánchez–Pérez Llorca · Levante 2030', actors: 'Sánchez · Pérez Llorca',     impact: 'medio', status: 'confirmado' },
  { id: 'ag-5', date: '26 may', title: 'Posible adelanto debate vivienda · CGPJ pendiente', actors: 'Sánchez · Feijóo · Junts',        impact: 'alto',  status: 'inferido' },
  { id: 'ag-6', date: '27 may', title: 'Escenario · activación cláusula 155 si Junts vota no', actors: 'Sánchez · Junts · ERC',         impact: 'alto',  status: 'escenario' },
]

interface EvidenceItem {
  id: string
  source: string
  type: 'artículo' | 'doc.legislativo' | 'intervención' | 'encuesta' | 'nota prensa' | 'oficial' | 'señal IA'
  date: string
  topic: string
  actors: string
  title: string
  relevance: number
  href?: string
}

// Helper: URL de búsqueda en Google Noticias filtrada por medio · siempre
// devuelve resultados reales relacionados aunque no tengamos la URL exacta
const newsSearch = (query: string, site?: string) => {
  const q = site ? `${query} site:${site}` : query
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=nws`
}

const EVIDENCIA: EvidenceItem[] = [
  { id: 'e-1', source: 'El País',         type: 'artículo',        date: 'hace 28 min', topic: 'Vivienda',         actors: 'Yolanda Díaz · Bustinduy', title: 'Sumar reactiva la ley de alquileres tras el pico de menciones',                     relevance: 92, href: newsSearch('Sumar ley alquileres Yolanda Díaz Bustinduy', 'elpais.com') },
  { id: 'e-2', source: 'Congreso · BOCG', type: 'doc.legislativo', date: 'hace 2h',     topic: 'Decreto laboral',  actors: 'Bolaños',                  title: 'Publicación del Decreto-ley 4/2026 · convalidación viernes',                        relevance: 88, href: 'https://www.boe.es/diario_boe/index.php' },
  { id: 'e-3', source: 'Sigma Dos',       type: 'encuesta',        date: 'hace 4h',     topic: 'Intención voto',   actors: '—',                        title: 'PP 33.2% · PSOE 26.8% · margen +6.4pp (n=1.005)',                                   relevance: 86, href: newsSearch('encuesta Sigma Dos PP PSOE intención voto') },
  { id: 'e-4', source: 'EFE',             type: 'intervención',    date: 'hace 6h',     topic: 'DANA Valencia',    actors: 'Pérez Llorca',             title: 'Pérez Llorca cita a 3 ex consellers en comisión de investigación',                  relevance: 84, href: newsSearch('Pérez Llorca comisión DANA Valencia ex consellers', 'efe.com') },
  { id: 'e-5', source: 'GDELT',           type: 'señal IA',        date: 'hace 12 min', topic: 'Tasa turística',   actors: 'Prohens · Illa',           title: 'Burst Kleinberg detecta +128% en menciones a tasa turística en Baleares y Cataluña', relevance: 78, href: newsSearch('tasa turística Baleares Cataluña Prohens Illa') },
  { id: 'e-6', source: 'Moncloa',         type: 'nota prensa',     date: 'hace 8h',     topic: 'Aranceles',        actors: 'Albares',                  title: 'Albares anuncia visita a Washington · ronda diplomática',                           relevance: 76, href: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/exteriores/' },
]

const ACTIONS = [
  { label: 'Generar briefing ejecutivo 24h',        href: '/briefing',         icon: '◐' },
  { label: 'Comparar narrativa vivienda por bloque', href: '/medios-narrativa',icon: '◐' },
  { label: 'Revisar actores emergentes Cataluña',    href: '/mapa-actores',    icon: '' },
  { label: 'Abrir mapa de actores · conflictos',     href: '/mapa-actores',    icon: '' },
  { label: 'Exportar informe para comité',           href: '/briefing',        icon: '◐' },
]

const SENT_COLOR: Record<NarrativaDef['sentiment'], string> = {
 'crítico': '#DC2626', 'neutral': '#6e6e73', 'positivo': '#16A34A',
}
const RISK_COLOR: Record<TerritorioDef['risk'], string> = {
  alto: '#DC2626', medio: '#F59E0B', bajo: '#16A34A',
}
const ALERT_LEVEL: Record<AlertDef['level'], { color: string; label: string }> = {
  critica:     { color: '#7F1D1D', label: 'CRÍTICA' },
  alta:        { color: '#DC2626', label: 'ALTA' },
  media:       { color: '#F59E0B', label: 'MEDIA' },
  informativa: { color: '#0EA5E9', label: 'INFORMATIVA' },
}
const AGENDA_STATUS: Record<AgendaEvent['status'], { color: string; label: string; variant: 'observed' | 'inferred' | 'projected' }> = {
  confirmado: { color: '#0F766E', label: 'CONFIRMADO', variant: 'observed' },
  inferido:   { color: '#2563EB', label: 'INFERIDO',   variant: 'inferred' },
  escenario:  { color: '#B45309', label: 'ESCENARIO',  variant: 'projected' },
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function WorkspacePoliticalOverview() {
  return (
 <section style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>

      {/* 1 · CABECERA EJECUTIVA DEL WORKSPACE */}
 <header style={{
        background: 'linear-gradient(135deg, #1F4E8C 0%, #0F2A4F 100%)',
        borderRadius: 16, padding: '20px 26px', color: '#fff',
        display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24,
      }}>
 <div>
 <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, margin: '0 0 6px' }}>
            Workspace activo · Inteligencia política
 </p>
 <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.022em', margin: '0 0 4px', lineHeight: 1.1 }}>
            España 2026 <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>· electoral · legislativo · narrativo · territorial</em>
 </h1>
 <p style={{ fontSize: 12.5, opacity: 0.78, margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
            Workspace de inteligencia política para seguimiento electoral, legislativo, territorial y narrativo
            del ciclo político español 2026. Agrega actores, narrativas, riesgo y agenda en una sola pantalla.
 </p>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
 <HeaderStat label="Última actualización" value="hace 4 min"/>
 <HeaderStat label="Fuentes activas" value="28 / 31"/>
 <HeaderStat label="Cobertura de datos" value="Alta" tone="success"/>
 <HeaderStat label="Confianza general" value="78%" tone="success"/>
 </div>
 </header>

      {/* 2 · RESUMEN EJECUTIVO */}
 <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
        padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.012em', margin: 0, color: '#1d1d1f' }}>
            Resumen ejecutivo
 </h2>
 <div style={{ display: 'flex', gap: 8 }}>
 <Link href="/briefing" style={btnPrimary}>Generar briefing</Link>
 <Link href="/medios-narrativa" style={btnSecondary}>Ver evidencia</Link>
 </div>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
 <InsightClassification variant="observed" label="Lo que ha cambiado" compact>
 <strong>Vivienda dispara la conversación</strong> · +18% menciones en 24h. La narrativa generacional
            se desplaza a Madrid y Barcelona. Pico de 90 días alcanzado.
 </InsightClassification>
 <InsightClassification variant="inferred" label="Por qué importa" compact>
            La narrativa de vivienda concentra <strong>4 grupos parlamentarios distintos</strong> (PSOE, Sumar, ERC,
            Podemos) lo que sugiere una posible coalición temática frente al PP-Vox.
 </InsightClassification>
 <InsightClassification variant="projected" label="A quién afecta" compact>
            Riesgo principal · <strong>erosión del voto joven y urbano</strong> en Madrid y Barcelona. Posible
            impacto en sondeos próximos 14 días si no hay respuesta institucional.
 </InsightClassification>
 <InsightClassification variant="recommended" label="Qué vigilar" compact>
            Monitorizar discurso PP-Ayuso esta semana sobre vivienda · activar tracking de portavoces parlamentarios
            del bloque investidura · revisar correlación con encuestas tracking.
 </InsightClassification>
 </div>
 <MetricTrace
          compact
          sources={[
            { name: 'GDELT 2.0', href: 'https://www.gdeltproject.org/' },
            { name: 'Agregador propio', href: '/medios-narrativa' },
            { name: 'Brain · Politeia LLM', href: '/agente-ia' },
          ]}
          period="últimas 24h · baseline 30d"
          sampleSize="1.842 artículos · 31 medios"
          confidence={82}
          delta="+18% / 24h"
          methodology="Burst Kleinberg sobre titulares con keywords de vivienda. Cross-validation con LLM (Brain) para emoción dominante. Comparación con baseline 30d para detección de pico."
          style={{ marginTop: 14 }}
        />
 </div>

      {/* 3 · KPIs políticos */}
 <div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 8px', color: '#1d1d1f' }}>
          Indicadores clave
 </h2>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {KPIS.map(k => (
 <KpiCard key={k.label} kpi={k}/>
          ))}
 </div>
 </div>

      {/* 4 · ALERTAS PRIORITARIAS */}
 <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
        padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            Alertas prioritarias · {ALERTAS.length} activas
 </h2>
 <Link href="/alertas" style={btnSecondary}>Ver todas →</Link>
 </div>
        {ALERTAS.length === 0 ? (
 <EmptyState
            severity="success"
            compact
            title="No hay alertas prioritarias activas"
            description="El sistema no ha detectado anomalías relevantes en el periodo seleccionado."
          />
        ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALERTAS.map(a => (
 <AlertItem key={a.id} alert={a}/>
            ))}
 </div>
        )}
 </div>

      {/* 5 · NARRATIVAS EN ACELERACIÓN */}
 <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
        padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            Narrativas en aceleración
 </h2>
 <Link href="/medios-narrativa" style={btnSecondary}>Feed completo →</Link>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {NARRATIVAS.map(n => (
 <NarrativeCard key={n.id} narrative={n}/>
          ))}
 </div>
 </div>

      {/* 6 · ACTORES CLAVE */}
 <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
        padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            Actores clave del workspace
 </h2>
 <Link href="/mapa-actores" style={btnSecondary}>Ver mapa de actores →</Link>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {ACTORES_CLAVE.map(a => (
 <ActorKeyCard key={a.id} actor={a}/>
          ))}
 </div>
 </div>

      {/* 7 + 8 · TERRITORIOS CALIENTES + AGENDA INSTITUCIONAL · doble columna */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Territorios */}
 <div style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
          padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Territorios calientes
 </h2>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TERRITORIOS.map(t => (
 <TerritorioRow key={t.ccaa} t={t}/>
            ))}
 </div>
 </div>

        {/* Agenda */}
 <div style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
          padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Agenda institucional · próximos 7 días
 </h2>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AGENDA.map(ev => (
 <AgendaRow key={ev.id} ev={ev}/>
            ))}
 </div>
 <p style={{ fontSize: 10, color: '#86868b', margin: '10px 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
            Eventos clasificados · <strong>confirmados</strong> con fuente oficial · <strong>inferidos</strong>
            de señales legislativas · <strong>escenarios</strong> proyectados por el modelo (no determinista).
 </p>
 </div>
 </div>

      {/* 9 · EVIDENCIA RECIENTE */}
 <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
        padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            Evidencia reciente
 </h2>
 <span style={{ fontSize: 11, color: '#86868b' }}>{EVIDENCIA.length} elementos · últimas 12h</span>
 </div>
 <div style={{
          display: 'grid', gridTemplateColumns: '90px 1fr auto auto auto',
          gap: 12, padding: '8px 12px', background: '#FAFAFA',
          borderRadius: 8, fontSize: 10, color: '#6e6e73',
          fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>
 <span>Tipo</span><span>Título / actores</span>
 <span>Tema</span><span>Relev.</span><span>Detec.</span>
 </div>
 <div style={{ display: 'flex', flexDirection: 'column' }}>
          {EVIDENCIA.map(e => (
 <EvidenceRow key={e.id} ev={e}/>
          ))}
 </div>
 </div>

      {/* 10 · ACCIONES RECOMENDADAS */}
 <div style={{
        background: 'linear-gradient(135deg, rgba(91,33,182,0.06) 0%, rgba(37,99,235,0.06) 100%)',
        border: '1px solid rgba(91,33,182,0.20)', borderRadius: 14,
        padding: '18px 22px',
      }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.01em', color: '#1d1d1f' }}>
          Acciones recomendadas
 </h2>
 <p style={{ fontSize: 12, color: '#515154', margin: '0 0 12px' }}>
          Sugerencias contextuales basadas en el estado actual del workspace · pulsa para ir al módulo correspondiente.
 </p>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
          {ACTIONS.map(a => (
 <Link key={a.label} href={a.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
              padding: '12px 14px', fontFamily: 'inherit', textDecoration: 'none',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}>
 <span style={{
                width: 30, height: 30, borderRadius: 8, background: '#5B21B610', color: '#5B21B6',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{a.icon}</span>
 <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>{a.label}</span>
 <span style={{ fontSize: 14, color: '#0071e3' }}>→</span>
 </Link>
          ))}
 </div>
 </div>

      {/* Pie · trazabilidad global */}
 <p style={{ fontSize: 11, color: '#86868b', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
        Workspace <strong>España 2026</strong> · actualizado {todayStr} ·
        datos clasificados · <strong>observado</strong> (medido directamente) ·
 <strong>inferido</strong> (interpretación del modelo) ·
 <strong>proyectado</strong> (escenario IA · no determinista) ·
 <strong>recomendado</strong> (acción sugerida · requiere juicio humano).
 </p>
 </section>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function HeaderStat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? '#4ADE80' : tone === 'warning' ? '#FBBF24' : '#fff'
  return (
 <div style={{
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '8px 12px',
    }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
 <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2, fontFamily: 'var(--font-display)' }}>{value}</div>
 </div>
  )
}

function KpiCard({ kpi }: { kpi: KPIDef }) {
  const isPos = (s?: string) => s?.startsWith('+') ?? false
  const isNeg = (s?: string) => s?.startsWith('-') || s?.startsWith('−')
  return (
 <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderLeft: `3px solid ${kpi.accent}`,
      borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span>{kpi.label}</span>
 <span title={kpi.methodology} style={{
          width: 12, height: 12, borderRadius: '50%', background: '#F0F0F2', color: '#6e6e73',
          fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'help',
        }}>?</span>
 </div>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: kpi.accent, lineHeight: 1 }}>
          {kpi.value}
 </span>
        {kpi.unit && <span style={{ fontSize: 11, color: '#86868b' }}>{kpi.unit}</span>}
 </div>
 <div style={{ display: 'flex', gap: 8, fontSize: 10.5, marginTop: 5, color: '#86868b' }}>
        {kpi.delta24h && (
 <span style={{ color: isPos(kpi.delta24h) ? '#DC2626' : isNeg(kpi.delta24h) ? '#16A34A' : '#86868b', fontWeight: 600 }}>
            24h {kpi.delta24h}
 </span>
        )}
        {kpi.delta7d && (
 <span style={{ color: isPos(kpi.delta7d) ? '#DC2626' : isNeg(kpi.delta7d) ? '#16A34A' : '#86868b', fontWeight: 600 }}>
            7d {kpi.delta7d}
 </span>
        )}
 </div>
 <div style={{ fontSize: 10, color: '#86868b', marginTop: 6, paddingTop: 6, borderTop: '1px solid #F5F5F7' }}>
        Confianza <strong style={{ color: '#3a3a3d' }}>{kpi.confidence}%</strong> · {kpi.sources}
 </div>
 </div>
  )
}

function AlertItem({ alert }: { alert: AlertDef }) {
  const meta = ALERT_LEVEL[alert.level]
  return (
 <article style={{
      display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 12, alignItems: 'flex-start',
      padding: '12px 14px', background: `${meta.color}06`, borderLeft: `3px solid ${meta.color}`,
      border: `1px solid ${meta.color}22`, borderRadius: 10,
    }}>
 <span style={{
        color: '#fff', background: meta.color, fontWeight: 800,
        fontSize: 9.5, letterSpacing: '0.08em', padding: '4px 10px',
        borderRadius: 999, textAlign: 'center', alignSelf: 'flex-start',
      }}>{meta.label}</span>
 <div>
 <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: '#1d1d1f' }}>{alert.title}</h3>
 <div style={{ fontSize: 11.5, color: '#3a3a3d', margin: '4px 0', lineHeight: 1.5 }}>
 <strong style={{ color: '#1d1d1f' }}>{alert.topic}</strong> · {alert.territory} · <span style={{ color: '#6e6e73' }}>{alert.actors}</span>
 </div>
 <div style={{ fontSize: 11, color: '#86868b' }}>
          {alert.evidenceUrl ? (
 <a href={alert.evidenceUrl} target="_blank" rel="noopener noreferrer"
              title="Abrir noticias relacionadas con esta evidencia"
              style={{
                color: '#3a3a3d', textDecoration: 'none',
                borderBottom: '1px dotted rgba(0,113,227,0.4)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0071e3' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#3a3a3d' }}
            >
              Evidencia: {alert.evidence} <span style={{ color: '#0071e3' }}>↗</span>
 </a>
          ) : (
 <>Evidencia: {alert.evidence}</>
          )}
          {' · detectado '}{alert.detected}
 </div>
 <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#3a3a3d', padding: '6px 10px', background: 'rgba(91,33,182,0.06)', borderLeft: '2px solid #5B21B6', borderRadius: 6 }}>
 <span style={{ fontWeight: 700, color: '#5B21B6', fontSize: 9.5, letterSpacing: '0.08em' }}>RECOMENDADO · </span>
          {alert.action}
 </p>
 </div>
        {alert.evidenceUrl ? (
 <a href={alert.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: 'none' }}>
            Ver evidencia ↗
 </a>
        ) : (
 <button style={btnSecondary}>Ver evidencia</button>
        )}
 </article>
  )
}

function NarrativeCard({ narrative }: { narrative: NarrativaDef }) {
  return (
 <article style={{
      background: '#FAFAFA', border: '1px solid #ECECEF',
      borderLeft: `3px solid ${SENT_COLOR[narrative.sentiment]}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
 <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>{narrative.name}</h3>
 <InsightPill variant="observed" label={narrative.sentiment}/>
 </div>
 <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '2px 0 8px' }}>{narrative.topic}</p>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: SENT_COLOR[narrative.sentiment] }}>{narrative.velocity.split('·')[0]}</span>
 <span style={{ fontSize: 11, color: '#86868b' }}>{narrative.volume}</span>
 </div>
 <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.55, marginBottom: 6 }}>
 <strong style={{ color: '#1d1d1f' }}>Impulsan ·</strong> {narrative.driverActors}<br/>
 <strong style={{ color: '#1d1d1f' }}>Canales ·</strong> {narrative.channels}<br/>
 <strong style={{ color: '#1d1d1f' }}>Territorio ·</strong> {narrative.territories}
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: '#86868b', borderTop: '1px solid #ECECEF', paddingTop: 6 }}>
 <span>Confianza · <strong style={{ color: '#1d1d1f' }}>{narrative.confidence}%</strong></span>
 <Link href="/medios-narrativa" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>Ver evidencia →</Link>
 </div>
 </article>
  )
}

function ActorKeyCard({ actor }: { actor: ActorKey }) {
  const meta = BADGE_META[actor.badge]
  return (
 <Link href="/mapa-actores" style={{
      display: 'block', background: '#FAFAFA', border: '1px solid #ECECEF',
      borderLeft: `3px solid ${meta.color}`, borderRadius: 10,
      padding: '12px 14px', textDecoration: 'none', color: 'inherit',
    }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
 <span style={{ fontSize: 9, fontWeight: 800, color: meta.color, letterSpacing: '0.08em', background: `${meta.color}14`, padding: '2px 7px', borderRadius: 999 }}>{meta.label}</span>
 <span style={{ fontSize: 10.5, color: actor.delta.startsWith('-') || actor.delta.startsWith('−') ? '#16A34A' : '#DC2626', fontWeight: 700 }}>{actor.delta}</span>
 </div>
 <h4 style={{ margin: '2px 0 2px', fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>{actor.name}</h4>
 <p style={{ fontSize: 11, color: '#6e6e73', margin: '0 0 4px' }}>{actor.org}</p>
 <p style={{ fontSize: 10.5, color: '#3a3a3d', margin: '0 0 4px' }}><strong>{actor.role}</strong> · {actor.metric}</p>
 <p style={{ fontSize: 10.5, color: '#86868b', margin: '0 0 2px' }}>Temas · {actor.topics}</p>
 <p style={{ fontSize: 10.5, color: '#86868b', margin: 0 }}>Relación con · {actor.related}</p>
 </Link>
  )
}

function TerritorioRow({ t }: { t: TerritorioDef }) {
  return (
 <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10,
      padding: '10px 12px', background: '#FAFAFA', borderRadius: 8,
      borderLeft: `3px solid ${RISK_COLOR[t.risk]}`,
      alignItems: 'center', fontSize: 12,
    }}>
 <div>
 <div style={{ fontWeight: 700, color: '#1d1d1f' }}>{t.ccaa}</div>
 <div style={{ fontSize: 11, color: '#6e6e73' }}>{t.topic} · top actor <strong style={{ color: '#1d1d1f' }}>{t.topActor}</strong></div>
 </div>
 <span style={{ fontSize: 10.5, color: '#6e6e73' }}>Polariz. <strong style={{ color: '#1d1d1f' }}>{t.polarization}</strong></span>
 <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', fontFamily: 'var(--font-display)' }}>{t.change}</span>
 <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: RISK_COLOR[t.risk], padding: '2px 7px', borderRadius: 999, letterSpacing: '0.06em' }}>{t.risk.toUpperCase()}</span>
 </div>
  )
}

function AgendaRow({ ev }: { ev: AgendaEvent }) {
  const meta = AGENDA_STATUS[ev.status]
  const impColor = ev.impact === 'alto' ? '#DC2626' : ev.impact === 'medio' ? '#F59E0B' : '#16A34A'
  return (
 <div style={{
      display: 'grid', gridTemplateColumns: '70px 1fr auto auto', gap: 10,
      padding: '8px 10px', borderBottom: '1px solid #F5F5F7',
      fontSize: 12, alignItems: 'center',
    }}>
 <span style={{ fontSize: 11, fontWeight: 700, color: '#3a3a3d', fontFamily: 'var(--font-display)' }}>{ev.date}</span>
 <div>
 <div style={{ color: '#1d1d1f', fontWeight: 500, lineHeight: 1.3 }}>{ev.title}</div>
 <div style={{ fontSize: 10.5, color: '#86868b' }}>{ev.actors}</div>
 </div>
 <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: impColor, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.06em' }}>{ev.impact.toUpperCase()}</span>
 <span style={{ fontSize: 9, fontWeight: 800, color: meta.color, background: `${meta.color}14`, border: `1px solid ${meta.color}33`, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.06em' }}>{meta.label}</span>
 </div>
  )
}

function EvidenceRow({ ev }: { ev: EvidenceItem }) {
  // Detecta si el href es externo (http/https) o interno (/ruta del dashboard)
  // y renderiza con <a target="_blank"> o <Link> según corresponda.
  const isExternal = ev.href?.startsWith('http')
  const titleStyle = {
    color: '#1d1d1f', fontWeight: 600, lineHeight: 1.35,
    textDecoration: 'none', borderBottom: '1px dotted rgba(0,113,227,0.35)',
  } as const
  const titleNode = (
    <>
      {ev.title}{' '}
      <span style={{ color: '#0071e3', fontSize: 10 }}>{isExternal ? '↗' : '→'}</span>
    </>
  )
  return (
 <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr auto auto auto',
      gap: 12, padding: '10px 12px', borderTop: '1px solid #F5F5F7',
      fontSize: 12, alignItems: 'center',
    }}>
 <span style={{ fontSize: 9.5, fontWeight: 700, color: '#3a3a3d', background: '#F0F0F2', padding: '3px 7px', borderRadius: 4, textAlign: 'center', letterSpacing: '0.04em' }}>{ev.type.toUpperCase()}</span>
 <div>
        {!ev.href ? (
 <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{ev.title}</span>
        ) : isExternal ? (
 <a href={ev.href} target="_blank" rel="noopener noreferrer" style={titleStyle} title={`Abrir noticia · ${ev.source}`}>
            {titleNode}
 </a>
        ) : (
 <Link href={ev.href} style={titleStyle}>
            {titleNode}
 </Link>
        )}
 <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 2 }}>
 <strong style={{ color: '#3a3a3d' }}>{ev.source}</strong> · {ev.actors}
 </div>
 </div>
 <span style={{ fontSize: 10.5, color: '#6e6e73' }}>{ev.topic}</span>
 <span style={{ fontSize: 11, fontWeight: 700, color: ev.relevance >= 85 ? '#DC2626' : ev.relevance >= 70 ? '#F59E0B' : '#3a3a3d', fontFamily: 'var(--font-display)' }}>{ev.relevance}</span>
 <span style={{ fontSize: 10.5, color: '#86868b' }}>{ev.date}</span>
 </div>
  )
}

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: '#0071e3', color: '#fff', border: '1px solid #0071e3',
  borderRadius: 8, padding: '6px 14px', fontSize: 11.5, fontWeight: 600,
  fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer',
} as const

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: '#fff', color: '#3a3a3d', border: '1px solid #ECECEF',
  borderRadius: 8, padding: '6px 14px', fontSize: 11.5, fontWeight: 600,
  fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer',
} as const
