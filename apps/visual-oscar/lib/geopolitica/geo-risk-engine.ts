/**
 * `geo-risk-engine.ts` · Sprint G13 FASE 10
 *
 * Motor unificado de perfil de riesgo país. Producir UN solo perfil por país
 * con dimensiones separadas para que los 4-5 endpoints (/riesgo,
 * /world-risk, /risk-index, /convergence, /spain-watchlist) dejen de
 * inventar su propia versión de "riesgo".
 *
 * No reemplaza los endpoints. Provee la lógica común para que cada uno
 * exponga una VISTA distinta del mismo motor:
 *   - /riesgo expone country_risk_score + interes_espana del catálogo
 *   - /world-risk expone structural_risk + current_event_risk + heatmap
 *   - /risk-index agrega a nivel España (Spain Composite)
 *   - /convergence usa hard_event + humanitarian + consular del perfil
 *   - /spain-watchlist consume urgency_for_spain + spain_exposure
 *
 * Reglas duras:
 *   - Cada dimensión se calcula SOLO de su fuente declarada (no dobles)
 *   - Cada dimensión declara su own source_mode y confidence
 *   - urgency_for_spain combina dimensiones · NO suma "riesgo"
 *   - confidence global es ponderado por dimensiones con datos reales
 *
 * Sin LLM. Sin red. Puro determinista sobre datos externos pre-cargados.
 */
import type { GeoSourceMode, GeoLayer, GeoTemporalScope } from './geo-methodology'

// ════════════════════════════════════════════════════════════════════════
// Tipos públicos
// ════════════════════════════════════════════════════════════════════════

/**
 * Una dimensión de riesgo · score normalizado 0..100 + procedencia
 * + caveat. La unidad atómica del motor.
 */
export interface GeoRiskDimension {
  key: string
  label: string
  score: number                   // 0..100 · 0=benigno, 100=peor
  source_mode: GeoSourceMode
  geo_layer: GeoLayer
  temporal_scope: GeoTemporalScope
  source_name: string
  confidence: number              // 0..1
  caveat: string                  // qué NO debe inferirse
  raw?: number | null             // valor crudo (eventos, reports, etc.)
  available: boolean              // false si no tenemos datos
}

/**
 * Perfil completo de un país con 9 dimensiones separadas.
 * NO se debe agregar a un único "score". Cada dimensión vive por sí sola.
 */
export interface GeoCountryRiskProfile {
  iso3: string
  country: string
  region?: string

  // 9 dimensiones · cada una independiente
  structural_risk: GeoRiskDimension          // UCDP conflicto histórico
  current_event_risk: GeoRiskDimension       // ACLED 30d eventos+fatalities
  humanitarian_pressure: GeoRiskDimension    // ReliefWeb reports OCHA 30d
  consular_risk: GeoRiskDimension            // Travel Advisory (MAEC, FCDO)
  military_diplomatic_risk: GeoRiskDimension // NATO press + EEAS + UN SC
  sanctions_pressure: GeoRiskDimension       // OFAC + EU + UN sanctions
  media_attention: GeoRiskDimension          // GDELT volumen cobertura
  narrative_pressure: GeoRiskDimension       // GDELT tone invertido
  spain_exposure: GeoRiskDimension           // Catálogo presencia ES + vecindad

  // Derivado combinado · prioridad de seguimiento, no score de riesgo
  urgency_for_spain: number       // 0..100 · combinación spain_exposure + current + humanitarian
  urgency_band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'

  // Auditoría
  confidence: number              // 0..1 · ponderado por dimensiones con datos
  evidence: string[]              // frases / cifras concretas
  sources_used: string[]          // qué endpoints/APIs dieron datos
  warnings: string[]              // limitaciones globales del perfil
}

/**
 * Inputs para construir el perfil · datos pre-cargados por los endpoints
 * que ya los tienen. Cada campo es opcional · una dimensión sin datos
 * queda con available=false.
 */
export interface GeoRiskInputs {
  iso3: string
  country: string
  region?: string

  // UCDP · structural
  ucdp?: { intensity: number; conflict: string }
  // ACLED · current event 30d
  acled?: { events_30d: number; fatalities_30d: number }
  // ReliefWeb · humanitarian
  reliefweb?: { reports_30d: number }
  // Travel Advisory · consular
  travel?: { score: number; band: string }   // score 0-5
  // NATO/EEAS/UN SC menciones recientes
  diplomatic?: { mentions_7d: number }
  // Sanciones activas
  sanctions?: { active_programs: number; sources: string[] }
  // GDELT
  gdelt?: { volume_7d?: number; tone_7d?: number }
  // Catálogo presencia España
  spain_presence?: { intensity: number; category: string }
  // Vecindad geográfica ES
  spain_neighbor?: boolean
  // Bloque UE/OTAN miembro
  in_spain_blocs?: boolean
}

// ════════════════════════════════════════════════════════════════════════
// Cálculo por dimensión
// ════════════════════════════════════════════════════════════════════════

function dim(args: Omit<GeoRiskDimension, 'available'> & { available?: boolean }): GeoRiskDimension {
  return { ...args, available: args.available ?? true }
}

function emptyDim(key: string, label: string, source_mode: GeoSourceMode, geo_layer: GeoLayer, temporal_scope: GeoTemporalScope, source_name: string, caveat: string): GeoRiskDimension {
  return {
    key, label, score: 0,
    source_mode, geo_layer, temporal_scope, source_name,
    confidence: 0, caveat,
    raw: null, available: false,
  }
}

function structuralRisk(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.ucdp) {
    return emptyDim('structural_risk', 'Conflicto estructural', 'live_api', 'structural_conflict', 'annual',
      'UCDP v24.1', 'Sin datos UCDP para este país · no implica ausencia de conflicto')
  }
  // intensity 0 = bajo, 1 = HIGH, 2 = CRITICAL
  const score = i.ucdp.intensity >= 2 ? 90 : i.ucdp.intensity >= 1 ? 60 : 20
  return dim({
    key: 'structural_risk',
    label: 'Conflicto estructural',
    score,
    source_mode: 'live_api',
    geo_layer: 'structural_conflict',
    temporal_scope: 'annual',
    source_name: 'UCDP v24.1 (Uppsala)',
    confidence: 0.80,
    caveat: 'Conflicto registrado HISTÓRICO/ANUAL · NO indica deterioro de hoy · contexto multi-año',
    raw: i.ucdp.intensity,
  })
}

function currentEventRisk(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.acled) {
    return emptyDim('current_event_risk', 'Eventos recientes (30d)', 'live_api', 'hard_event', 'last_30d',
      'ACLED', 'Sin datos ACLED para este país')
  }
  const uplift = i.acled.events_30d + (i.acled.fatalities_30d * 0.5)
  const score = Math.min(100, (uplift / 4))      // 400 uplift → 100 · escala lineal
  return dim({
    key: 'current_event_risk',
    label: 'Eventos recientes (30d)',
    score,
    source_mode: 'live_api',
    geo_layer: 'hard_event',
    temporal_scope: 'last_30d',
    source_name: 'ACLED',
    confidence: 0.85,
    caveat: 'Eventos de violencia política georreferenciados · NO mide percepción ni recomendación política',
    raw: uplift,
  })
}

function humanitarianPressure(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.reliefweb) {
    return emptyDim('humanitarian_pressure', 'Presión humanitaria (30d)', 'live_api', 'humanitarian', 'last_30d',
      'ReliefWeb (OCHA)', 'Sin datos ReliefWeb para este país')
  }
  const r = i.reliefweb.reports_30d
  const score = r >= 30 ? 90 : r >= 15 ? 65 : r >= 5 ? 35 : 10
  return dim({
    key: 'humanitarian_pressure',
    label: 'Presión humanitaria (30d)',
    score,
    source_mode: 'live_api',
    geo_layer: 'humanitarian',
    temporal_scope: 'last_30d',
    source_name: 'ReliefWeb (OCHA)',
    confidence: 0.78,
    caveat: 'Reportes humanitarios · NO mide intensidad militar ni atribución',
    raw: r,
  })
}

function consularRisk(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.travel) {
    return emptyDim('consular_risk', 'Riesgo consular', 'live_api', 'consular', 'realtime',
      'Travel Advisory', 'Sin advisory consular registrado')
  }
  const score = Math.min(100, (i.travel.score / 5) * 100)
  return dim({
    key: 'consular_risk',
    label: 'Riesgo consular',
    score,
    source_mode: 'live_api',
    geo_layer: 'consular',
    temporal_scope: 'realtime',
    source_name: 'Travel Advisory (MAEC/FCDO/US State)',
    confidence: 0.75,
    caveat: 'Recomendación CONSULAR para nacionales · NO mide violencia material · depende del país emisor',
    raw: i.travel.score,
  })
}

function militaryDiplomaticRisk(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.diplomatic) {
    return emptyDim('military_diplomatic_risk', 'Tensión militar/diplomática (7d)', 'rss_official', 'military_diplomatic', 'last_7d',
      'NATO + EEAS + UN SC', 'Sin actividad institucional registrada · no implica ausencia')
  }
  const m = i.diplomatic.mentions_7d
  const score = m >= 10 ? 75 : m >= 5 ? 50 : m >= 2 ? 30 : 10
  return dim({
    key: 'military_diplomatic_risk',
    label: 'Tensión militar/diplomática (7d)',
    score,
    source_mode: 'rss_official',
    geo_layer: 'military_diplomatic',
    temporal_scope: 'last_7d',
    source_name: 'NATO press + EEAS + UN SC',
    confidence: 0.65,
    caveat: 'Mide PRESENCIA institucional · NO mide intención de uso de la fuerza',
    raw: m,
  })
}

function sanctionsPressure(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.sanctions) {
    return emptyDim('sanctions_pressure', 'Presión sancionatoria', 'rss_official', 'sanctions', 'realtime',
      'OFAC + EU + UN', 'Sin sanciones activas registradas en feeds Politeia')
  }
  const n = i.sanctions.active_programs
  const score = n >= 5 ? 90 : n >= 3 ? 65 : n >= 1 ? 40 : 0
  return dim({
    key: 'sanctions_pressure',
    label: 'Presión sancionatoria',
    score,
    source_mode: 'rss_official',
    geo_layer: 'sanctions',
    temporal_scope: 'realtime',
    source_name: `OFAC + EU + UN (${i.sanctions.sources.join(', ')})`,
    confidence: 0.80,
    caveat: 'NÚMERO de programas activos · NO mide impacto económico real ni cumplimiento',
    raw: n,
  })
}

function mediaAttention(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.gdelt || typeof i.gdelt.volume_7d !== 'number') {
    return emptyDim('media_attention', 'Atención mediática (7d)', 'live_api', 'media_attention', 'last_7d',
      'GDELT', 'Sin datos GDELT para este país')
  }
  const v = i.gdelt.volume_7d
  // Log scale · 100 articles → 33, 1000 → 67, 10000 → 100
  const score = Math.min(100, Math.round(33 * Math.log10(Math.max(1, v))))
  return dim({
    key: 'media_attention',
    label: 'Atención mediática (7d)',
    score,
    source_mode: 'live_api',
    geo_layer: 'media_attention',
    temporal_scope: 'last_7d',
    source_name: 'GDELT volumen',
    confidence: 0.55,
    caveat: 'MIDE COBERTURA MEDIÁTICA · NO realidad material · alto volumen ≠ deterioro real',
    raw: v,
  })
}

function narrativePressure(i: GeoRiskInputs): GeoRiskDimension {
  if (!i.gdelt || typeof i.gdelt.tone_7d !== 'number') {
    return emptyDim('narrative_pressure', 'Presión narrativa (tono GDELT 7d)', 'live_api', 'media_attention', 'last_7d',
      'GDELT tone', 'Sin datos GDELT tone para este país')
  }
  // tone -10 (muy negativo) → 100 score · tone +5 → 0 score
  const t = i.gdelt.tone_7d
  const score = Math.max(0, Math.min(100, Math.round(((-t + 5) / 10) * 100)))
  return dim({
    key: 'narrative_pressure',
    label: 'Presión narrativa (tono GDELT 7d)',
    score,
    source_mode: 'live_api',
    geo_layer: 'media_attention',
    temporal_scope: 'last_7d',
    source_name: 'GDELT tone (invertido)',
    confidence: 0.50,
    caveat: 'Tono mediático · NO mide gravedad material ni intención · proxy de saliencia negativa',
    raw: t,
  })
}

function spainExposure(i: GeoRiskInputs): GeoRiskDimension {
  let score = 0
  const components: string[] = []
  if (i.spain_presence) {
    score += i.spain_presence.intensity * 0.6
    components.push(`presencia ${i.spain_presence.intensity}/100 (${i.spain_presence.category})`)
  }
  if (i.spain_neighbor) { score += 20; components.push('vecindario ES') }
  if (i.in_spain_blocs) { score += 10; components.push('UE/OTAN miembro') }
  if (score === 0) {
    return emptyDim('spain_exposure', 'Exposición de España', 'curated_baseline', 'analytical_model', 'curated',
      'Catálogo Presencia ES', 'Sin exposición declarada · no implica que España no tenga intereses no registrados')
  }
  return dim({
    key: 'spain_exposure',
    label: 'Exposición de España',
    score: Math.min(100, Math.round(score)),
    source_mode: 'curated_baseline',
    geo_layer: 'analytical_model',
    temporal_scope: 'curated',
    source_name: `Catálogo Presencia ES (${components.join(' + ')})`,
    confidence: 0.65,
    caveat: 'Catálogo editorial Politeia · revisión manual · no observación primaria',
    raw: score,
  })
}

// ════════════════════════════════════════════════════════════════════════
// buildCountryRiskProfile · función principal
// ════════════════════════════════════════════════════════════════════════

export function buildCountryRiskProfile(inputs: GeoRiskInputs): GeoCountryRiskProfile {
  const structural = structuralRisk(inputs)
  const current = currentEventRisk(inputs)
  const humanitarian = humanitarianPressure(inputs)
  const consular = consularRisk(inputs)
  const military = militaryDiplomaticRisk(inputs)
  const sanctions = sanctionsPressure(inputs)
  const media = mediaAttention(inputs)
  const narrative = narrativePressure(inputs)
  const exposure = spainExposure(inputs)

  const allDims = [structural, current, humanitarian, consular, military, sanctions, media, narrative, exposure]
  const availableDims = allDims.filter((d) => d.available)

  // urgency_for_spain · combinación priorizada:
  //   - 45% spain_exposure (sin esto, no nos preocupa España)
  //   - 25% current_event_risk (deterioro material reciente)
  //   - 15% humanitarian_pressure (canal migración indirecto)
  //   - 10% consular_risk (canal nacionales)
  //   - 5% military_diplomatic (intensidad institucional)
  //
  // Sprint G13 FASE 10 · NO renormalizar pesos cuando faltan dimensiones.
  // Suma directa de (score × peso) de las disponibles. Si faltan, el techo
  // efectivo es menor (ej: sin spain_exposure el max es 55, no 100). Esto
  // refleja lo correcto: una crisis sin canal de impacto en España NO debe
  // marcar urgencia alta para España aunque sea grave en el país.
  const weights: Array<[GeoRiskDimension, number]> = [
    [exposure, 0.45],
    [current, 0.25],
    [humanitarian, 0.15],
    [consular, 0.10],
    [military, 0.05],
  ]
  const activeWeights = weights.filter(([d]) => d.available)
  let urgency = Math.round(activeWeights.reduce((s, [d, w]) => s + (d.score * w), 0))
  // Si NO hay spain_exposure declarada, hard cap a 30 (BAJO) · sin exposición
  // explícita España no tiene "urgencia" aunque haya conflicto remoto.
  if (!exposure.available) {
    urgency = Math.min(urgency, 30)
  }
  const urgency_band: GeoCountryRiskProfile['urgency_band'] =
    urgency < 30 ? 'BAJO' : urgency < 55 ? 'MEDIO' : urgency < 75 ? 'ALTO' : 'CRITICO'

  // Confianza ponderada · dimensiones con datos pesan más
  const confidence = availableDims.length > 0
    ? +(availableDims.reduce((s, d) => s + d.confidence, 0) / availableDims.length).toFixed(2)
    : 0.3

  // Evidencia · cifras concretas de cada dimensión available
  const evidence: string[] = []
  for (const d of availableDims) {
    if (d.raw !== null && d.raw !== undefined) {
      evidence.push(`${d.label}: ${d.raw} (score ${d.score}/100)`)
    } else {
      evidence.push(`${d.label}: score ${d.score}/100`)
    }
  }

  const sources_used = Array.from(new Set(availableDims.map((d) => d.source_name)))

  const warnings: string[] = []
  if (availableDims.length < 4) {
    warnings.push(`Sólo ${availableDims.length}/9 dimensiones con datos · perfil parcial · interpretar con cautela`)
  }
  if (structural.available && !current.available) {
    warnings.push('Hay datos estructurales (UCDP) pero no de eventos recientes (ACLED) · no confundir histórico con actual')
  }
  if (media.available && !current.available && !humanitarian.available) {
    warnings.push('Alta atención mediática sin eventos materiales ni presión humanitaria · puede ser narrativa pura')
  }
  if (exposure.available && urgency >= 55) {
    warnings.push('Urgencia para España elevada · validar con monitoring_question y fuentes recomendadas antes de citar')
  }

  return {
    iso3: inputs.iso3,
    country: inputs.country,
    region: inputs.region,
    structural_risk: structural,
    current_event_risk: current,
    humanitarian_pressure: humanitarian,
    consular_risk: consular,
    military_diplomatic_risk: military,
    sanctions_pressure: sanctions,
    media_attention: media,
    narrative_pressure: narrative,
    spain_exposure: exposure,
    urgency_for_spain: urgency,
    urgency_band,
    confidence,
    evidence,
    sources_used,
    warnings,
  }
}

// ════════════════════════════════════════════════════════════════════════
// Helpers · vistas derivadas para endpoints concretos
// ════════════════════════════════════════════════════════════════════════

/**
 * Vista compacta para `/api/geopolitica/riesgo` (legacy).
 * Devuelve los campos que ya espera el front: score 0-10, interes_espana,
 * pero añade `profile` con el perfil completo.
 */
export function riskCountryView(p: GeoCountryRiskProfile, opts: { lat?: number; lon?: number; category?: string } = {}) {
  // Score 0-10 legacy = max(structural, current, humanitarian) escalado
  const legacyScore = Math.round(
    Math.max(p.structural_risk.score, p.current_event_risk.score, p.humanitarian_pressure.score) / 10
  )
  return {
    pais: p.country,
    iso: p.iso3,
    score: legacyScore,
    interes_espana: Math.round(p.spain_exposure.score / 10),
    lat: opts.lat,
    lon: opts.lon,
    categoria: opts.category,
    // Sprint G13 FASE 10 · perfil completo disponible para UI moderna
    profile: p,
  }
}

/**
 * Vista compacta para `/api/geopolitica/spain-watchlist`.
 * Toma el perfil + datos de watchlist y devuelve la entrada lista para UI.
 */
export function watchlistView(p: GeoCountryRiskProfile) {
  return {
    iso3: p.iso3,
    country: p.country,
    region: p.region,
    urgency_score: p.urgency_for_spain,
    urgency_band: p.urgency_band,
    confidence: p.confidence,
    dimensions: {
      spain_exposure: p.spain_exposure.score,
      current_event: p.current_event_risk.score,
      humanitarian: p.humanitarian_pressure.score,
      consular: p.consular_risk.score,
      military_diplomatic: p.military_diplomatic_risk.score,
    },
    warnings: p.warnings,
    evidence: p.evidence,
  }
}
