/**
 * GET /api/deteccion-ataques/data
 *
 * Datos consolidados del módulo Detección de Ataques · sistema de
 * threat detection multivector para inteligencia política.
 *
 * Devuelve:
 *   - kpis           · 6 KPIs ejecutivos (ataques activos, score, etc.)
 *   - timeline       · serie de 7 días · detecciones/hora con severidad
 *   - heatmap        · matriz vectores (6) × días (7) con intensidad
 *   - ataques_activos· 12 incidentes priorizados por severidad
 *   - patrones       · 4-5 campañas coordinadas detectadas por IA
 *   - atribucion     · distribución de origen probable
 *   - playbooks      · recomendaciones de respuesta por severidad
 *
 * Calibrado para el contexto político español Q2 2026 (post elecciones,
 * tensión institucional, conflicto Cataluña/Valencia, presión UE Bruselas,
 * caso Koldo en derivada, conflictos partidistas internos PP/PSOE).
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── Tipos ──────────────────────────────────────────────────────────────
export type Vector = 'Mediático' | 'Digital' | 'Institucional' | 'Regulatorio' | 'Económico' | 'Físico'
export type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type Fase = 'Detectado' | 'Confirmado' | 'Escalando' | 'Pico' | 'Decayendo' | 'Cerrado'

export const VECTOR_META: Record<Vector, { color: string; icon: string; desc: string }> = {
 'Mediático':     { color: '#7C3AED', icon: '◧', desc: 'Cobertura coordinada negativa · editoriales · televisión' },
 'Digital':       { color: '#0EA5E9', icon: '◐', desc: 'Bots · trolls · brigading · DDoS · fake reviews' },
 'Institucional': { color: '#1F4E8C', icon: '◑', desc: 'Denuncias judiciales · expedientes · inspecciones AEAT/CNMV' },
 'Regulatorio':   { color: '#0F766E', icon: '◔', desc: 'Cambios normativos hostiles · enmiendas · directivas UE' },
 'Económico':     { color: '#D97706', icon: '◕', desc: 'Boicots · divestments · presión accionistas · proveedores' },
 'Físico':        { color: '#DC2626', icon: '●', desc: 'Protestas dirigidas · pintadas · acoso público' },
}
export const SEV_COLOR: Record<Severidad, string> = {
 'CRÍTICA': '#7C2D12', 'ALTA': '#DC2626', 'MEDIA': '#F59E0B', 'BAJA': '#0EA5E9',
}
export const FASE_META: Record<Fase, { color: string; pct: number }> = {
 'Detectado':  { color: '#0EA5E9', pct: 12 },
 'Confirmado': { color: '#3B82F6', pct: 28 },
 'Escalando':  { color: '#F97316', pct: 50 },
 'Pico':       { color: '#DC2626', pct: 70 },
 'Decayendo':  { color: '#16A34A', pct: 88 },
 'Cerrado':    { color: '#525258', pct: 100 },
}

// ─── Helpers ────────────────────────────────────────────────────────────
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString()
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400 * 1000).toISOString().slice(0, 10)
}

// ─── Datos ──────────────────────────────────────────────────────────────
const ATAQUES_ACTIVOS = [
  {
    id: 'a-001', titulo: 'Editorial coordinada presunto enriquecimiento',
    vector: 'Mediático' as Vector, severidad: 'CRÍTICA' as Severidad, fase: 'Pico' as Fase,
    target: 'Vicepresidenta del Gobierno', origen: 'Medios afines a oposición',
    primer_evento: hoursAgo(38), ultimo_evento: hoursAgo(2),
    score: 87, alcance_estimado: 4_200_000, sentimiento: -0.71,
    cobertura: ['ABC', 'OkDiario', 'El Debate', 'La Razón'],
    drivers: ['Filtración documento AEAT', 'Cita anónima alto cargo', 'Foto patrimonial'],
    beneficiarios: ['PP', 'VOX'],
    recomendacion: 'Activar comité crisis · respuesta documental ≤ 2h · briefing portavoces',
  },
  {
    id: 'a-002', titulo: 'Hashtag #DimisiónYa coordinado · 8.4k cuentas',
    vector: 'Digital' as Vector, severidad: 'ALTA' as Severidad, fase: 'Escalando' as Fase,
    target: 'Ministerio de Hacienda', origen: 'Bots + cuentas anónimas',
    primer_evento: hoursAgo(14), ultimo_evento: hoursAgo(1),
    score: 73, alcance_estimado: 1_850_000, sentimiento: -0.62,
    cobertura: ['X (Twitter)', 'Telegram'],
    drivers: ['Cuentas creadas <30d', 'Patrón temporal robotizado', 'Mismo mensaje copy-paste'],
    beneficiarios: ['VOX', 'Anónimos'],
    recomendacion: 'No amplificar · documentar para denuncia X Trust & Safety · contraprograma orgánico',
  },
  {
    id: 'a-003', titulo: 'Querella judicial caso comisiones obras públicas',
    vector: 'Institucional' as Vector, severidad: 'CRÍTICA' as Severidad, fase: 'Confirmado' as Fase,
    target: 'Exministro de Transportes', origen: 'Asociación judicial conservadora',
    primer_evento: hoursAgo(72), ultimo_evento: hoursAgo(4),
    score: 84, alcance_estimado: 980_000, sentimiento: -0.58,
    cobertura: ['Tribunales', 'Prensa nacional'],
    drivers: ['Querella admitida a trámite', 'Diligencias preliminares', 'Filtración informe UCO'],
    beneficiarios: ['PP', 'VOX'],
    recomendacion: 'Defensa jurídica reforzada · comunicación medida · monitorizar nuevas filtraciones',
  },
  {
    id: 'a-004', titulo: 'Enmienda hostil PNL competencia digital',
    vector: 'Regulatorio' as Vector, severidad: 'MEDIA' as Severidad, fase: 'Detectado' as Fase,
    target: 'Sector telecom (Telefónica, Vodafone)', origen: 'Grupo parlamentario PP',
    primer_evento: hoursAgo(20), ultimo_evento: hoursAgo(20),
    score: 52, alcance_estimado: 0, sentimiento: -0.32,
    cobertura: ['BOCG', 'Cinco Días'],
    drivers: ['Enmienda registrada', 'Postura favorable Junts', 'Apoyo PNV probable'],
    beneficiarios: ['Operadores cable independientes'],
    recomendacion: 'Lobby parlamentario ESC10 · briefing técnico ponentes · análisis impacto',
  },
  {
    id: 'a-005', titulo: 'Llamada al boicot · campaña Twitter + influencers',
    vector: 'Económico' as Vector, severidad: 'ALTA' as Severidad, fase: 'Pico' as Fase,
    target: 'Cadena retail nacional', origen: 'Activistas independencia',
    primer_evento: hoursAgo(48), ultimo_evento: hoursAgo(3),
    score: 68, alcance_estimado: 2_100_000, sentimiento: -0.69,
    cobertura: ['X', 'Instagram', 'TikTok', 'Catalan press'],
    drivers: ['Postura corporativa pública', 'Hashtag #Boicot', 'Influencers >100k seguidores'],
    beneficiarios: ['Competencia local'],
    recomendacion: 'Comunicación corporativa neutra · monitorizar ventas tienda física · datos NPS',
  },
  {
    id: 'a-006', titulo: 'Inspección AEAT a fundación vinculada',
    vector: 'Institucional' as Vector, severidad: 'ALTA' as Severidad, fase: 'Confirmado' as Fase,
    target: 'Fundación Pablo Iglesias', origen: 'AEAT (oficio)',
    primer_evento: hoursAgo(96), ultimo_evento: hoursAgo(18),
    score: 71, alcance_estimado: 540_000, sentimiento: -0.45,
    cobertura: ['Confidencial Digital', 'OkDiario', 'El Mundo'],
    drivers: ['Auto inspección notificado', 'Ejercicios 2022-2024', 'Posible filtración'],
    beneficiarios: ['Oposición'],
    recomendacion: 'Auditoría preventiva · respuesta legal · transparencia proactiva',
  },
  {
    id: 'a-007', titulo: 'Concentración convocada frente a sede',
    vector: 'Físico' as Vector, severidad: 'MEDIA' as Severidad, fase: 'Detectado' as Fase,
    target: 'Sede partido nacional', origen: 'Plataforma ciudadana',
    primer_evento: hoursAgo(8), ultimo_evento: hoursAgo(8),
    score: 47, alcance_estimado: 320_000, sentimiento: -0.51,
    cobertura: ['Telegram', 'Carteles físicos'],
    drivers: ['Convocatoria viralizada', 'Apoyos de 3 colectivos', 'Permiso Delegación'],
    beneficiarios: ['Partidos opositores', 'Imagen pública contraria'],
    recomendacion: 'Seguridad reforzada · coordinación Policía Nacional · imagen institucional',
  },
  {
    id: 'a-008', titulo: 'Carta abierta accionistas críticos',
    vector: 'Económico' as Vector, severidad: 'MEDIA' as Severidad, fase: 'Escalando' as Fase,
    target: 'IBEX35 · empresa energética', origen: 'Fondo activista nórdico',
    primer_evento: hoursAgo(120), ultimo_evento: hoursAgo(24),
    score: 58, alcance_estimado: 740_000, sentimiento: -0.41,
    cobertura: ['Expansión', 'Bloomberg', 'FT'],
    drivers: ['Carta pública 12 demandas', 'ESG metrics cuestionadas', 'Junta accionistas próxima'],
    beneficiarios: ['Fondo activista', 'ESG funds'],
    recomendacion: 'Engagement con fondo · roadshow inversores · respuesta ESG transparente',
  },
  {
    id: 'a-009', titulo: 'Filtración email interno · cobertura prensa',
    vector: 'Mediático' as Vector, severidad: 'ALTA' as Severidad, fase: 'Pico' as Fase,
    target: 'Dirección comunicación gobierno autonómico', origen: 'Filtración interna',
    primer_evento: hoursAgo(30), ultimo_evento: hoursAgo(3),
    score: 75, alcance_estimado: 1_350_000, sentimiento: -0.66,
    cobertura: ['El Confidencial', 'Cadena SER', 'eldiario.es'],
    drivers: ['Email contenido cuestionable', 'Identificado autor', 'Cobertura saturada'],
    beneficiarios: ['Oposición autonómica'],
    recomendacion: 'Investigación interna fuente · respuesta institucional · contención mediática',
  },
  {
    id: 'a-010', titulo: 'Directiva UE en negociación · perjuicio competitivo',
    vector: 'Regulatorio' as Vector, severidad: 'BAJA' as Severidad, fase: 'Detectado' as Fase,
    target: 'Sector agroalimentario español', origen: 'Lobby agro francés (FNSEA)',
    primer_evento: hoursAgo(168), ultimo_evento: hoursAgo(60),
    score: 38, alcance_estimado: 0, sentimiento: -0.21,
    cobertura: ['Politico EU', 'EFE Agro'],
    drivers: ['Texto trílogos próximo', 'Posición Francia hostil', 'Comisaría agricultura sensible'],
    beneficiarios: ['Productores franceses'],
    recomendacion: 'Lobby Bruselas · alianza España-Italia-Portugal · enmiendas técnicas',
  },
  {
    id: 'a-011', titulo: 'Doxing y acoso digital coordinado',
    vector: 'Digital' as Vector, severidad: 'ALTA' as Severidad, fase: 'Pico' as Fase,
    target: 'Diputado autonómico', origen: 'Cuentas anónimas neonazi',
    primer_evento: hoursAgo(40), ultimo_evento: hoursAgo(1),
    score: 70, alcance_estimado: 480_000, sentimiento: -0.78,
    cobertura: ['X', 'Telegram', 'Forocoches'],
    drivers: ['Datos personales filtrados', 'Coord. canal Telegram', 'Amenazas explícitas'],
    beneficiarios: ['Grupos extremistas'],
    recomendacion: 'Denuncia GDT · refuerzo seguridad personal · solicitar retirada plataformas',
  },
  {
    id: 'a-012', titulo: 'Cobertura coordinada presunta financiación irregular',
    vector: 'Mediático' as Vector, severidad: 'MEDIA' as Severidad, fase: 'Decayendo' as Fase,
    target: 'Federación regional partido', origen: 'Prensa local + agencia',
    primer_evento: hoursAgo(96), ultimo_evento: hoursAgo(36),
    score: 44, alcance_estimado: 280_000, sentimiento: -0.39,
    cobertura: ['Prensa regional', 'Europa Press'],
    drivers: ['Documento sin verificar', 'Fuente única', 'Falta evidencia complementaria'],
    beneficiarios: ['Partidos rivales locales'],
    recomendacion: 'Respuesta breve y firme · esperar decantación · sin amplificar',
  },
]

const PATRONES_COORDINADOS = [
  {
    id: 'p-001', titulo: 'Campaña sincrónica multi-canal #DimisiónYa',
    confianza: 92, n_eventos: 14, vectores: ['Digital', 'Mediático'] as Vector[],
    descripcion: '8.4k cuentas X amplificando contenido idéntico en ventana de 6h, replicado por 4 medios afines en titulares similares (cosine similarity > 0.78).',
    origen_probable: 'Operación coordinada con presupuesto profesional',
    primera_deteccion: hoursAgo(14),
  },
  {
    id: 'p-002', titulo: 'Filtración + cobertura + querella · 72h',
    confianza: 88, n_eventos: 9, vectores: ['Institucional', 'Mediático'] as Vector[],
    descripcion: 'Patrón clásico de operación: filtración documental → 6 medios cubren simultáneamente → asociación judicial presenta querella en 72h.',
    origen_probable: 'Coordinación entre actor institucional + medios',
    primera_deteccion: hoursAgo(72),
  },
  {
    id: 'p-003', titulo: 'Boicot económico + influencers + activismo callejero',
    confianza: 81, n_eventos: 11, vectores: ['Económico', 'Digital', 'Físico'] as Vector[],
    descripcion: 'Tres vectores convergentes contra mismo target: hashtag boicot, influencers movilizados y concentraciones físicas en 5 ciudades.',
    origen_probable: 'Movimiento activista organizado',
    primera_deteccion: hoursAgo(48),
  },
  {
    id: 'p-004', titulo: 'Lobby Bruselas + prensa especializada + reguladores',
    confianza: 74, n_eventos: 6, vectores: ['Regulatorio', 'Mediático'] as Vector[],
    descripcion: 'Negociación trílogo UE coincide con cobertura sostenida en prensa especializada y posicionamiento regulador competente.',
    origen_probable: 'Lobby industrial extranjero',
    primera_deteccion: hoursAgo(168),
  },
  {
    id: 'p-005', titulo: 'Doxing + amenazas + concentración pacífica',
    confianza: 86, n_eventos: 8, vectores: ['Digital', 'Físico'] as Vector[],
    descripcion: 'Filtración datos personales + escalada en canal Telegram + convocatoria física frente a domicilio personal del target.',
    origen_probable: 'Grupos extremistas organizados',
    primera_deteccion: hoursAgo(40),
  },
]

// Heatmap intensidad por vector × día (últimos 7 días)
function buildHeatmap() {
  const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
  const vectors: Vector[] = ['Mediático', 'Digital', 'Institucional', 'Regulatorio', 'Económico', 'Físico']
  // Patrones plausibles: digital pico mid-week, mediático constante, institucional al final
  const baseline: Record<Vector, number[]> = {
 'Mediático':     [3, 4, 5, 6, 8, 7, 9],
 'Digital':       [2, 5, 8, 12, 14, 11, 9],
 'Institucional': [1, 1, 2, 2, 3, 4, 6],
 'Regulatorio':   [0, 1, 1, 2, 1, 2, 3],
 'Económico':     [1, 2, 3, 4, 5, 4, 4],
 'Físico':        [0, 0, 1, 2, 1, 2, 3],
  }
  return {
    days,
    vectors,
    matrix: vectors.map(v => baseline[v]),
  }
}

// Timeline horario · 7 días (168 puntos)
function buildTimeline() {
  const points: Array<{ t: string; total: number; critica: number; alta: number; media: number; baja: number }> = []
  for (let i = 167; i >= 0; i--) {
    const t = new Date(Date.now() - i * 3600 * 1000).toISOString()
    const hour = new Date(Date.now() - i * 3600 * 1000).getHours()
    const isWorkHours = hour >= 8 && hour <= 22
    const base = isWorkHours ? 4 : 1
    const noise = Math.random() * 3
    const total = Math.round(base + noise)
    const critica = Math.random() < 0.05 ? 1 : 0
    const alta = Math.round(total * 0.2)
    const media = Math.round(total * 0.4)
    const baja = total - critica - alta - media
    points.push({ t, total, critica, alta, media, baja: Math.max(0, baja) })
  }
  return points
}

const ATRIBUCION = [
  { origen: 'Medios afines a oposición',  count: 4, pct: 33, color: '#7C3AED' },
  { origen: 'Bots / cuentas anónimas',    count: 3, pct: 25, color: '#0EA5E9' },
  { origen: 'Asociaciones judiciales',    count: 2, pct: 17, color: '#1F4E8C' },
  { origen: 'Partidos rivales',           count: 1, pct:  8, color: '#DC2626' },
  { origen: 'Lobby extranjero',           count: 1, pct:  8, color: '#0F766E' },
  { origen: 'Activismo organizado',       count: 1, pct:  8, color: '#D97706' },
]

const PLAYBOOKS = [
  {
    severidad: 'CRÍTICA' as Severidad, sla: '≤ 2h',
    pasos: [
 'Activar Comité de Crisis (CEO, COMs, Legal, Security)',
 'Cerrar canal de comunicación oficial unificado',
 'Briefing portavoces con líneas de mensajes en ≤ 60min',
 'Respuesta documental verificable en ≤ 2h',
 'Monitorización cada 15 min con escalada automática',
 'Documentar todo para post-mortem y posibles acciones legales',
    ],
  },
  {
    severidad: 'ALTA' as Severidad, sla: '≤ 6h',
    pasos: [
 'Notificar al equipo de respuesta · activar War Room',
 'Cuantificar alcance y estimar trayectoria 24h',
 'Preparar respuesta proporcional · evitar sobrerreacción',
 'Coordinación con asesoría jurídica si procede',
 'Seguimiento cada 30 min · briefings horarios al núcleo',
    ],
  },
  {
    severidad: 'MEDIA' as Severidad, sla: '≤ 24h',
    pasos: [
 'Análisis de viabilidad de escalada · decisión actuar / observar',
 'Si actuar: respuesta breve y firme · sin amplificar el ataque',
 'Si observar: monitor continuo · disparadores de escalada definidos',
 'Documentar en sistema · alimentar ML de detección futura',
    ],
  },
  {
    severidad: 'BAJA' as Severidad, sla: '24-72h',
    pasos: [
 'Monitor estándar · sin acción inmediata',
 'Revisión semanal con resto de señales',
 'Etiquetado para análisis de patrones',
    ],
  },
]

export async function GET() {
  const t0 = Date.now()

  const ataques = ATAQUES_ACTIVOS
  const activos = ataques.filter(a => a.fase !== 'Cerrado').length
  const criticos = ataques.filter(a => a.severidad === 'CRÍTICA').length
  const altos = ataques.filter(a => a.severidad === 'ALTA').length
  // Score amenaza · pondera severidad y fase
  const sevWeight: Record<Severidad, number> = { CRÍTICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 }
  const score = Math.round(
    ataques.reduce((s, a) => s + sevWeight[a.severidad] * (FASE_META[a.fase].pct / 100), 0) /
    ataques.length * 25,
  )

  return NextResponse.json({
    kpis: {
      ataques_activos: activos,
      score_amenaza: score,
      criticos,
      altos,
      delta_24h: 3,            // mock: +3 vs ayer
      proxima_ventana: 'Mañana 09:00-12:00 · Comparecencia Congreso',
    },
    ataques_activos: ataques,
    timeline: buildTimeline(),
    heatmap: buildHeatmap(),
    patrones: PATRONES_COORDINADOS,
    atribucion: ATRIBUCION,
    playbooks: PLAYBOOKS,
    fetched_at: new Date().toISOString(),
    fetch_ms: Date.now() - t0,
    fuentes: 'Brain · Politeia News Aggregator · OSINT internal',
    fuente_note: 'Demo calibrado · escenario plausible Q2 2026',
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
}
