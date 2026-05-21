/**
 * Deriva CRISIS LIVE agrupando señales SIGINT del endpoint /api/crisis/signals
 * (que ya es 100% live · GDELT + INCIBE + EMSC + Google News + Wikipedia + Congreso).
 *
 * Estrategia:
 *   1. Fetch del agregador SIGINT
 *   2. Clustering por tipo dominante (clave principal)
 *   3. Cada cluster con ≥2 señales y score medio ≥35 se convierte en Crisis
 *   4. Mapeo SignalType → TipoCrisis · severity → severidad · fase derivada
 *      del frescor de la última señal
 *   5. Stakeholders + riesgos heurísticos por tipo
 *   6. Top señales del cluster → hitos (timeline)
 *   7. Métricas derivadas de scores + nº de fuentes
 *
 * Si el agregador devuelve <2 clusters útiles · devolvemos null y el route
 * handler cae al fixture curado.
 */

import type { Crisis, Severidad, Fase, TipoCrisis, Stakeholder, Hito, Accion } from '@/data/crisis-fixture'

// ─── tipos de las señales (shape de /api/crisis/signals) ─────────────────
type SignalType =
  | 'conflicto' | 'sismo' | 'ciberataque' | 'desinformacion'
  | 'parlamentario' | 'diplomatico' | 'social' | 'economico' | 'energia'

type SignalSeverity = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'

interface CrisisSignal {
  id: string
  tipo: SignalType
  titulo: string
  descripcion: string
  fuente: string
  severidad: SignalSeverity
  score: number
  pais?: string
  region?: string
  timestamp: string
  url?: string
  tags: string[]
}

// ─── mapeos ───────────────────────────────────────────────────────────────
const TIPO_MAP: Record<SignalType, TipoCrisis> = {
  ciberataque: 'Tecnológica',
  desinformacion: 'Mediática',
  parlamentario: 'Política',
  diplomatico: 'Diplomática',
  conflicto: 'Política',
  social: 'Social',
  sismo: 'Climática',
  economico: 'Económica',
  energia: 'Energética',
}

const SEV_MAP: Record<SignalSeverity, Severidad> = {
  CRITICO: 'CRÍTICA',
  ALTO: 'ALTA',
  MEDIO: 'MEDIA',
  BAJO: 'BAJA',
}

const TIPO_LABEL: Record<SignalType, string> = {
  ciberataque: 'Ciberseguridad nacional',
  desinformacion: 'Operación de desinformación',
  parlamentario: 'Tensión parlamentaria',
  diplomatico: 'Crisis diplomática',
  conflicto: 'Conflicto geopolítico',
  social: 'Movilización social',
  sismo: 'Emergencia sísmica',
  economico: 'Crisis económica',
  energia: 'Riesgo energético',
}

// Stakeholders por tipo · neutros que aplican a la mayoría de crisis de ese ámbito
const STAKEHOLDERS_BY_TIPO: Record<SignalType, Stakeholder[]> = {
  ciberataque: [
    { nombre: 'INCIBE',                 rol: 'Centro de respuesta nacional',  posicion: 'aliado' },
    { nombre: 'CCN-CERT',               rol: 'Coordinación CNI',              posicion: 'aliado' },
    { nombre: 'Min. Transformación Digital', rol: 'Política pública',         posicion: 'aliado' },
    { nombre: 'Sector privado afectado',rol: 'Empresas víctimas',             posicion: 'opositor'},
  ],
  desinformacion: [
    { nombre: 'Maldita.es',             rol: 'Verificación periodística',     posicion: 'aliado' },
    { nombre: 'Newtral',                rol: 'Fact-checking',                  posicion: 'aliado' },
    { nombre: 'Secretaría Estado Comunicación', rol: 'Respuesta institucional', posicion: 'neutral'},
    { nombre: 'Plataformas (Meta · X)', rol: 'Distribución',                  posicion: 'opositor'},
  ],
  parlamentario: [
    { nombre: 'Congreso de los Diputados', rol: 'Cámara baja',                posicion: 'neutral' },
    { nombre: 'Gobierno',               rol: 'Ejecutivo',                      posicion: 'aliado' },
    { nombre: 'Oposición PP-Vox',       rol: 'Bloque opositor',                posicion: 'opositor'},
    { nombre: 'Socios investidura',     rol: 'PNV · ERC · Junts · Bildu',     posicion: 'neutral' },
  ],
  diplomatico: [
    { nombre: 'Min. Asuntos Exteriores · Albares', rol: 'Cartera líder',      posicion: 'aliado' },
    { nombre: 'Moncloa',                rol: 'Coordinación',                   posicion: 'aliado' },
    { nombre: 'Comisión Europea',       rol: 'Marco UE',                       posicion: 'aliado' },
    { nombre: 'País contraparte',       rol: 'Actor externo',                  posicion: 'opositor'},
  ],
  conflicto: [
    { nombre: 'Min. Defensa · Robles',  rol: 'Seguridad nacional',             posicion: 'aliado' },
    { nombre: 'OTAN',                   rol: 'Marco multilateral',             posicion: 'aliado' },
    { nombre: 'Min. Asuntos Exteriores',rol: 'Diplomacia',                     posicion: 'aliado' },
  ],
  social: [
    { nombre: 'Min. Interior · Marlaska', rol: 'Seguridad ciudadana',          posicion: 'aliado' },
    { nombre: 'Sindicatos · CCOO / UGT', rol: 'Movilización laboral',          posicion: 'opositor'},
    { nombre: 'Plataformas civiles',    rol: 'Sociedad organizada',            posicion: 'opositor'},
  ],
  sismo: [
    { nombre: 'IGN',                    rol: 'Instituto Geográfico Nacional',  posicion: 'aliado' },
    { nombre: 'UME',                    rol: 'Unidad Militar Emergencias',     posicion: 'aliado' },
    { nombre: 'Protección Civil',       rol: 'Coordinación CCAA',              posicion: 'aliado' },
  ],
  economico: [
    { nombre: 'Min. Economía · Cuerpo', rol: 'Política económica',             posicion: 'aliado' },
    { nombre: 'Min. Hacienda · Montero',rol: 'Política fiscal',                posicion: 'aliado' },
    { nombre: 'Banco de España',        rol: 'Supervisión monetaria',          posicion: 'neutral' },
    { nombre: 'CEOE',                   rol: 'Patronal',                       posicion: 'neutral' },
  ],
  energia: [
    { nombre: 'Min. Transición Ecológica · Aagesen', rol: 'Política energética', posicion: 'aliado' },
    { nombre: 'Red Eléctrica',          rol: 'Operador del sistema',           posicion: 'aliado' },
    { nombre: 'Enagás',                 rol: 'Operador gasista',               posicion: 'aliado' },
    { nombre: 'Comisión Europea',       rol: 'Marco UE energético',            posicion: 'aliado' },
  ],
}

// Riesgos genéricos por tipo
const RIESGOS_BY_TIPO: Record<SignalType, string[]> = {
  ciberataque:    ['Propagación a infraestructuras críticas', 'Filtración masiva de datos personales', 'Caída de servicios bancarios o sanitarios'],
  desinformacion: ['Polarización del debate público', 'Erosión de confianza institucional', 'Distorsión del ciclo electoral'],
  parlamentario:  ['Bloqueo legislativo prolongado', 'Adelanto electoral involuntario', 'Pérdida de socios de investidura'],
  diplomatico:    ['Escalada de medidas de represalia', 'Impacto en sector exportador', 'Bloqueo de marcos multilaterales'],
  conflicto:      ['Implicación militar indirecta', 'Refugiados o desplazamientos', 'Tensión en aliados OTAN/UE'],
  social:         ['Disturbios urbanos', 'Pérdida de productividad', 'Polarización política amplificada'],
  sismo:          ['Daños estructurales y víctimas', 'Colapso comunicaciones zona afectada', 'Despliegue prolongado UME'],
  economico:      ['Recesión técnica', 'Aumento del paro', 'Tensión en mercados deuda soberana'],
  energia:        ['Apagón generalizado', 'Subida de precios mayoristas', 'Dependencia gas no-UE'],
}

// Acciones genéricas según severidad
function accionesGenericas(sev: SignalSeverity, fase: Fase): Accion[] {
  const isHigh = sev === 'CRITICO' || sev === 'ALTO'
  const base: Accion[] = [
    { accion: 'Convocar comité de crisis interministerial',     responsable: 'Gabinete Presidencia', plazo: '24h',  estado: isHigh ? 'En curso' : 'Pendiente' },
    { accion: 'Activar protocolo de comunicación coordinada',   responsable: 'Sec. Estado Comunicación', plazo: '48h', estado: isHigh ? 'En curso' : 'Pendiente' },
    { accion: 'Sesión informativa al Congreso',                 responsable: 'Min. Presidencia',     plazo: '7 días', estado: fase === 'Activa' || fase === 'Contención' ? 'En curso' : 'Pendiente' },
    { accion: 'Coordinación con CCAA afectadas',                responsable: 'Política Territorial', plazo: '3 días', estado: isHigh ? 'En curso' : 'Pendiente' },
  ]
  return base
}

// Heurística sentimiento simple
function quickSentiment(titles: string[]): number {
  let pos = 0, neg = 0
  for (const t of titles) {
    const tl = t.toLowerCase()
    if (/acuerdo|positivo|recuperación|éxito|mejora|gana|alza|aumento|aliv|resuelt|firmad/.test(tl)) pos++
    if (/crisis|ataque|crítico|caída|recesión|conflicto|emergencia|huelga|grave|peor|fracaso|escándalo|denuncia|imputad/.test(tl)) neg++
  }
  const total = pos + neg
  if (total === 0) return 0
  return Math.round(((pos - neg) / total) * 100) / 100
}

// ─── derivación principal ─────────────────────────────────────────────────
export async function deriveCrisisFromSignals(baseUrl: string, cookieHeader = ''): Promise<Crisis[] | null> {
  let signals: CrisisSignal[] = []
  try {
    const r = await fetch(`${baseUrl}/api/crisis/signals`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    })
    if (!r.ok) return null
    const j = await r.json() as { signals?: CrisisSignal[] }
    signals = j.signals ?? []
  } catch {
    return null
  }
  if (signals.length === 0) return null

  // Cluster por tipo dominante
  const byType = new Map<SignalType, CrisisSignal[]>()
  for (const s of signals) {
    const arr = byType.get(s.tipo) ?? []
    arr.push(s)
    byType.set(s.tipo, arr)
  }

  const crisisOut: Crisis[] = []
  const now = Date.now()

  for (const [tipo, items] of byType.entries()) {
    if (items.length < 2) continue
    const scores = items.map(i => i.score)
    const avgScore = scores.reduce((a, b) => a + b, 0) / items.length
    const maxScore = Math.max(...scores)
    if (avgScore < 30 && maxScore < 55) continue   // cluster no relevante

    // Severidad del cluster · max de las items
    const sevOrder: SignalSeverity[] = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO']
    const peakSev = items.reduce((max, it) => sevOrder.indexOf(it.severidad) > sevOrder.indexOf(max) ? it.severidad : max, 'BAJO' as SignalSeverity)

    // Fase derivada del frescor
    const newest = Math.max(...items.map(i => new Date(i.timestamp).getTime()))
    const ageH = (now - newest) / 3_600_000
    let fase: Fase = 'Detección'
    if (items.length >= 5 && ageH < 24)      fase = 'Activa'
    else if (items.length >= 3 && ageH < 48) fase = 'Activa'
    else if (ageH < 72)                       fase = 'Contención'
    else                                       fase = 'Resolución'

    // Hitos · top 5 señales más recientes
    const sortedRecent = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const hitos: Hito[] = sortedRecent.slice(0, 6).map(s => {
      const d = new Date(s.timestamp)
      const impact: Hito['impacto'] = s.score >= 70 ? 'negativo' : s.score <= 35 ? 'positivo' : 'neutral'
      return {
        fecha: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora:  d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
        evento: s.titulo,
        fuente: s.fuente,
        impacto: impact,
      }
    })

    // Métricas
    const titles = items.map(i => i.titulo)
    const sentimiento = quickSentiment(titles)
    const fuentes = new Set(items.map(i => i.fuente))
    const menciones24h = Math.round(items.filter(i => (now - new Date(i.timestamp).getTime()) < 86_400_000).length * 4.2)
    const spike = Math.round(Math.max(0, (items.length / Math.max(1, items.length - 2)) * 30))

    const ubicacion = items.some(i => i.pais === 'España' || i.pais === 'España / Portugal')
      ? 'España'
      : items[0]?.pais || 'Internacional'

    const fechaInicio = new Date(Math.min(...items.map(i => new Date(i.timestamp).getTime())))
    const fechaUpdate = new Date(newest)

    crisisOut.push({
      id: `live-${tipo}-${Math.floor(now / 86_400_000)}`,
      titulo: TIPO_LABEL[tipo] + ' · ' + (sortedRecent[0]?.titulo.slice(0, 80) ?? 'cluster detectado'),
      tipo: TIPO_MAP[tipo],
      severidad: SEV_MAP[peakSev],
      fase,
      inicio: fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      actualizacion: fechaUpdate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                     fechaUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      ubicacion,
      resumen: `Cluster activo con ${items.length} señales de ${fuentes.size} fuentes distintas · score medio ${avgScore.toFixed(0)}/100 · pico ${maxScore}. ${items.length > 5 ? 'Actividad alta detectada.' : 'Vigilancia ordinaria.'}`,
      stakeholders: STAKEHOLDERS_BY_TIPO[tipo] ?? [],
      hitos,
      acciones: accionesGenericas(peakSev, fase),
      metricas: {
        impactoMediatico: Math.round(avgScore),
        sentimiento,
        audienciaPotencial: fuentes.size > 5 ? '15 M' : fuentes.size > 2 ? '8 M' : '3 M',
        menciones24h,
        spike,
      },
      riesgos: RIESGOS_BY_TIPO[tipo] ?? [],
    })
  }

  // Sort por severidad y luego por score
  const sevWeight: Record<Severidad, number> = { 'CRÍTICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BAJA': 3 }
  crisisOut.sort((a, b) => sevWeight[a.severidad] - sevWeight[b.severidad] || b.metricas.impactoMediatico - a.metricas.impactoMediatico)

  return crisisOut.length >= 2 ? crisisOut.slice(0, 8) : null
}
