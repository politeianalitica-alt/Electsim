/**
 * Framework de Narrativas v3 · análisis multidimensional avanzado.
 *
 * BASE TEÓRICA — qué es una narrativa mediática
 * ================================================
 * Una narrativa es un patrón estructural de información mediática que combina
 * 8 dimensiones interdependientes derivadas de la teoría clásica de la comunicación:
 *
 *   1. TEMA       — el asunto principal sobre el que se construye
 *                   (taxonomía: 14 categorías curadas)
 *
 *   2. ACTORES    — quién protagoniza la historia (modelo dramatúrgico Burke):
 *                   protagonista · antagonista · víctima · héroe · observador
 *                   Cada actor con tipo + sentimiento medio asociado
 *
 *   3. FRAME      — marco interpretativo dominante (Entman 1993 + Iyengar):
 *                   conflicto · responsabilidad · consec. económicas ·
 *                   moralidad · interés humano · estratégico · episódico vs temático
 *
 *   4. EMOCIÓN    — registro afectivo (Plutchik 8 emociones básicas):
 *                   alegría · confianza · miedo · sorpresa · tristeza ·
 *                   asco · ira · anticipación + 4 emociones políticas:
 *                   indignación · esperanza · desprecio · orgullo
 *
 *   5. EVIDENCIA  — tipo de soporte argumental (Aristóteles ethos/pathos/logos):
 *                   datos cuantitativos · declaraciones · opinión experta ·
 *                   testimonio personal · documentos · sin evidencia
 *
 *   6. AUDIENCIA  — a quién se dirige (Habermas + segmentación clásica):
 *                   ideología (izq/centro/dcha) · edad · contexto urbano/rural
 *
 *   7. OBJETIVO   — qué busca conseguir esta narrativa (Lasswell):
 *                   informar · persuadir · movilizar · desacreditar · normalizar ·
 *                   distraer · cohesionar
 *
 *   8. CICLO DE VIDA — fase de la narrativa (Downs issue-attention cycle):
 *                   emergencia · crecimiento · pico · meseta · declive · resurgencia
 *                   + métricas: días activa · crescendo · polarización ·
 *                   medios cubriendo · regeneración
 *
 * Para extraer una narrativa:
 *   a) Clustering greedy TF-IDF + bigramas (Jaccard 0.20)
 *   b) Por cada cluster: aplicar las 8 detectores
 *   c) Identificar BENEFICIARIOS y PERJUDICADOS implícitos
 *   d) Calcular alineación ideológica de medios cubriendo
 *   e) Detectar mensajes clave (frases recurrentes en titulares)
 */

import type { AggregatedArticle } from '../news-aggregator'

// ─── TIPOS DIMENSIONES ──────────────────────────────────────────────────

export type Frame =
  | 'conflicto'              // enfrentamiento entre partes
  | 'responsabilidad'        // atribución de culpa
  | 'consecuencias_econ'     // impacto monetario
  | 'moralidad'              // bien vs mal
  | 'interés_humano'         // personalización emocional
  | 'estratégico'            // tácticas, juego político
  | 'episódico'              // caso individual aislado
  | 'temático'               // contexto sistémico

export type Emocion =
  // Plutchik 8 básicas
  | 'alegría' | 'confianza' | 'miedo' | 'sorpresa'
  | 'tristeza' | 'asco' | 'ira' | 'anticipación'
  // 4 emociones políticas adicionales
  | 'indignación' | 'esperanza' | 'desprecio' | 'orgullo'
  | 'neutral'

export type TipoActor =
  | 'protagonista' | 'antagonista' | 'víctima' | 'héroe'
  | 'observador' | 'institución' | 'colectivo' | 'experto'

export type TipoEvidencia =
  | 'datos_cuantitativos' | 'declaración' | 'opinión_experta'
  | 'testimonio_personal' | 'documento_oficial' | 'sin_evidencia'

export type Objetivo =
  | 'informar' | 'persuadir' | 'movilizar' | 'desacreditar'
  | 'normalizar' | 'distraer' | 'cohesionar'

export type FaseCiclo =
  | 'emergencia' | 'crecimiento' | 'pico' | 'meseta'
  | 'declive' | 'resurgencia'

export type Ideologia = 'izquierda' | 'centro_izq' | 'centro' | 'centro_der' | 'derecha'

// ─── INTERFACES PRINCIPALES ─────────────────────────────────────────────

export interface ActorDetectado {
  nombre: string
  tipo: TipoActor
  menciones: number
  sentimientoMedio: number   // -1 a +1
  alineacion?: Ideologia      // si es político/institución
}

export interface BeneficioPerjuicio {
  actor: string
  intensidad: 'alta' | 'media' | 'baja'
  evidenciaCount: number
}

export interface NarrativaV3 {
  id: string

  // 1. TEMA
  tema: string
  subtemas: string[]
  taxonomia: string         // categoría macro
  color: string

  // 2. ACTORES
  actores: ActorDetectado[]
  beneficia: BeneficioPerjuicio[]
  perjudica: BeneficioPerjuicio[]

  // 3. FRAME
  frameDominante: Frame
  framesSecundarios: Frame[]
  esEpisodico: boolean                // vs temático
  pesoFrame: Record<Frame, number>    // intensidad relativa de cada frame

  // 4. EMOCIÓN
  emocionDominante: Emocion
  emocionesSecundarias: Emocion[]
  intensidadEmocional: number          // 0-100
  pesoEmocion: Record<string, number>

  // 5. EVIDENCIA
  tipoEvidenciaDominante: TipoEvidencia
  fuentesCitadas: string[]
  calidadEvidencia: 'alta' | 'media' | 'baja'

  // 6. AUDIENCIA + ALINEACIÓN MEDIOS
  ideologiaMediaMedios: Ideologia
  distribucionIdeologica: Record<Ideologia, number>
  cobertura: 'transversal' | 'sesgada_izq' | 'sesgada_der' | 'periferia'

  // 7. OBJETIVO INFERIDO
  objetivoInferido: Objetivo
  objetivosSecundarios: Objetivo[]
  mensajesClave: string[]               // frases dominantes extraídas

  // 8. CICLO DE VIDA
  faseCiclo: FaseCiclo
  fuerza: number                        // n artículos
  diasActiva: number
  crescendo: number                     // ratio últimos 3d vs anteriores
  polarizacion: number                  // 0-1
  velocidadDifusion: number             // artículos / hora
  reincidencia: number                  // n veces resurgida (estimado)

  // VISUALIZACIÓN
  sentimientoMedio: number
  tono: 'positivo' | 'negativo' | 'neutral' | 'polarizado'
  ejemplos: Array<{ titulo: string; medio: string; url: string; fecha: string | null }>
  mediosCubriendo: string[]
}

// ─── PATRONES DE CLASIFICACIÓN ──────────────────────────────────────────

const FRAME_PATTERNS: Record<Frame, RegExp[]> = {
  'conflicto':            [/enfrentamiento|choque|guerra|combate|disput|tensión|crisis|polémica|amenaza|ataque/i],
  'responsabilidad':      [/responsabl|culpa|debe|deber[íi]a|tiene que|exige|reclama|pide|reproche/i],
  'consecuencias_econ':   [/precio|coste|millones|pib|impuesto|paro|empleo|inversi[óo]n|presupuesto|déficit|deuda/i],
  'moralidad':            [/justo|injusto|ético|moral|valor|principio|democrac|libertad|derecho|dignidad|abuso|corrupci/i],
  'interés_humano':       [/familia|persona|víctima|sufre|histor[íi]a|testimonio|emoción|fallece|drama/i],
  'estratégico':          [/estrateg|táctic|maniobra|cálculo|interés|posici[óo]n|votos|encuestas|elector/i],
  'episódico':            [/caso|incidente|episodio|anécdota|hoy|ayer|esta semana/i],
  'temático':             [/sistemic|estructural|persiste|crónic|histórico|generaci/i],
}

const EMOCION_PATTERNS: Record<Emocion, RegExp[]> = {
  'alegría':      [/alegr[íi]a|jubil|celebra|festeja|júbilo/i],
  'confianza':    [/confian|garantiza|cumple|protege|asegura/i],
  'miedo':        [/temor|miedo|alarma|preocupaci[óo]n|amenaza|peligro|riesgo|incertidumbre/i],
  'sorpresa':     [/sorprend|inesperad|impactant|insólito/i],
  'tristeza':     [/tristeza|dolor|luto|tragedia|pérdida|fallece|muerte/i],
  'asco':         [/repugnan|abominabl|asqueroso|náusea/i],
  'ira':          [/furiosa?|rabi[ae]|enfurece|enojo/i],
  'anticipación': [/expectativa|pendient|previsión|aguarda/i],
  // Políticas
  'indignación':  [/indignaci[óo]n|escándalo|bochornoso|inadmisible/i],
  'esperanza':    [/esperanza|optimism|oportunidad|mejor|avanc|logro|éxito/i],
  'desprecio':    [/desprecio|incompetenc|inepto|absurdo|ridícul|patético/i],
  'orgullo':      [/orgullo|patriotism|liderazgo|valent[íi]a|hero[íi]/i],
  'neutral':      [/según|informa|según fuentes|declar[óa]/i],
}

const TIPO_EVIDENCIA_PATTERNS: Array<{ pattern: RegExp; tipo: TipoEvidencia; calidad: 'alta' | 'media' | 'baja' }> = [
  { pattern: /\b\d+(?:[.,]\d+)?%|\d+\s*M€|\d+\s*millones|estad[íi]stic|cifras|datos|porcentaje|encuesta/i, tipo: 'datos_cuantitativos', calidad: 'alta' },
  { pattern: /informe|documento|sentencia|auto judicial|resoluci[óo]n|directiva/i,                          tipo: 'documento_oficial',   calidad: 'alta' },
  { pattern: /declar[óa]|afirma|asegura|dijo|aseguró|según|manifest[óa]|sostiene/i,                          tipo: 'declaración',          calidad: 'media' },
  { pattern: /experto|catedrátic|profesor|analista|consultor/i,                                             tipo: 'opinión_experta',      calidad: 'media' },
  { pattern: /testimonio|relata|cuenta|narra|víctima|familiar/i,                                            tipo: 'testimonio_personal',  calidad: 'media' },
]

const OBJETIVO_PATTERNS: Record<Objetivo, RegExp[]> = {
  'informar':     [/según fuentes|datos del|informe|estudio|publica|confirma/i],
  'persuadir':    [/debe|necesita|conviene|debería|es necesario/i],
  'movilizar':    [/manifesta|protesta|llama a|moviliza|huelga|concentraci[óo]n|exige/i],
  'desacreditar': [/escándalo|bochorno|incompetenc|fraude|engaño|mentira/i],
  'normalizar':   [/habitual|normal|frecuente|generalizado|extiende/i],
  'distraer':     [/mientras|también|al mismo tiempo|en otro orden/i],
  'cohesionar':   [/unidad|conjunto|todos|solidaridad|comunidad/i],
}

const ACTORES_NER: Array<{ pattern: RegExp; nombre: string; tipo: TipoActor; alineacion?: Ideologia }> = [
  // Políticos individuales
  { pattern: /pedro\s+s[áa]nchez|presidente del gobierno/i,        nombre: 'Pedro Sánchez',     tipo: 'protagonista', alineacion: 'centro_izq' },
  { pattern: /feij[óo]o|n[úu][ñn]ez feij[óo]o/i,                   nombre: 'Núñez Feijóo',      tipo: 'antagonista',  alineacion: 'centro_der' },
  { pattern: /yolanda\s+d[íi]az/i,                                 nombre: 'Yolanda Díaz',      tipo: 'protagonista', alineacion: 'izquierda' },
  { pattern: /santiago\s+abascal|abascal/i,                        nombre: 'Santiago Abascal',  tipo: 'antagonista',  alineacion: 'derecha' },
  { pattern: /ayuso|isabel d[íi]az ayuso/i,                        nombre: 'Isabel Díaz Ayuso', tipo: 'protagonista', alineacion: 'derecha' },
  { pattern: /illa|salvador illa/i,                                nombre: 'Salvador Illa',     tipo: 'protagonista', alineacion: 'centro_izq' },
  { pattern: /puigdemont/i,                                        nombre: 'Carles Puigdemont', tipo: 'antagonista',  alineacion: 'centro' },
  { pattern: /belarra|ione belarra/i,                              nombre: 'Ione Belarra',      tipo: 'observador',   alineacion: 'izquierda' },
  // Partidos
  { pattern: /\bpsoe\b/i,                                          nombre: 'PSOE',              tipo: 'institución',  alineacion: 'centro_izq' },
  { pattern: /partido popular|\bpp\b/i,                            nombre: 'PP',                tipo: 'institución',  alineacion: 'centro_der' },
  { pattern: /\bvox\b/i,                                           nombre: 'Vox',               tipo: 'institución',  alineacion: 'derecha' },
  { pattern: /\bsumar\b/i,                                         nombre: 'Sumar',             tipo: 'institución',  alineacion: 'izquierda' },
  { pattern: /\bjunts\b/i,                                         nombre: 'Junts',             tipo: 'institución',  alineacion: 'centro' },
  { pattern: /\berc\b|esquerra republicana/i,                      nombre: 'ERC',               tipo: 'institución',  alineacion: 'izquierda' },
  { pattern: /\bpnv\b/i,                                           nombre: 'PNV',               tipo: 'institución',  alineacion: 'centro' },
  { pattern: /\beh bildu\b|bildu/i,                                nombre: 'EH Bildu',          tipo: 'institución',  alineacion: 'izquierda' },
  // Instituciones
  { pattern: /\btribunal supremo\b|\bts\b/i,                       nombre: 'Tribunal Supremo',  tipo: 'institución' },
  { pattern: /tribunal constitucional|\btc\b/i,                    nombre: 'Tribunal Constitucional', tipo: 'institución' },
  { pattern: /audiencia nacional/i,                                nombre: 'Audiencia Nacional', tipo: 'institución' },
  { pattern: /comisi[óo]n europea|bruselas/i,                      nombre: 'Comisión Europea',  tipo: 'institución' },
  { pattern: /banco de españa|\bbde\b/i,                           nombre: 'Banco de España',   tipo: 'institución' },
  { pattern: /\botan\b/i,                                           nombre: 'OTAN',              tipo: 'institución' },
  { pattern: /unión europea|\bue\b/i,                              nombre: 'Unión Europea',     tipo: 'institución' },
  // Colectivos
  { pattern: /inmigra(?:ci[óo]n|ntes?)/i,                          nombre: 'Inmigrantes',       tipo: 'víctima' },
  { pattern: /menas/i,                                              nombre: 'MENAS',             tipo: 'víctima' },
  { pattern: /agricultor|ganader/i,                                 nombre: 'Agricultores',      tipo: 'colectivo' },
  { pattern: /sindicat|ccoo|\bugt\b/i,                             nombre: 'Sindicatos',        tipo: 'colectivo' },
  { pattern: /pensionist/i,                                         nombre: 'Pensionistas',      tipo: 'colectivo' },
  { pattern: /j[óo]venes|juventud/i,                                nombre: 'Juventud',          tipo: 'colectivo' },
  { pattern: /periodista|prensa libre/i,                            nombre: 'Periodistas',       tipo: 'colectivo' },
  { pattern: /mujeres|feminism|trans/i,                             nombre: 'Mujeres',           tipo: 'colectivo' },
  { pattern: /agricultor|ganader/i,                                 nombre: 'Sector agrario',    tipo: 'colectivo' },
  // Expertos
  { pattern: /experto|catedrátic|investigad|científico/i,          nombre: 'Expertos académicos', tipo: 'experto' },
  { pattern: /think tank|funcas|elcano|cidob/i,                    nombre: 'Think tanks',         tipo: 'experto' },
]

const TEMA_KEYWORDS: Array<{ tema: string; taxonomia: string; subtemas: string[]; keywords: RegExp[]; color: string }> = [
  { tema: 'Justicia y corrupción', taxonomia: 'política_judicial', subtemas: ['Caso Koldo', 'Caso Cerdán', 'Lawfare', 'Imputaciones'], keywords: [/audiencia nacional|tribunal supremo|juez|fiscal|corrupci[óo]n|imputaci|sentencia/i], color: '#7F1D1D' },
  { tema: 'Vivienda', taxonomia: 'social', subtemas: ['Alquiler', 'Precio', 'Stress', 'Ley vivienda'], keywords: [/vivienda|alquiler|hipoteca|inmobiliaria|squat|okupa/i], color: '#F97316' },
  { tema: 'Política territorial', taxonomia: 'institucional', subtemas: ['Cataluña', 'País Vasco', 'Financiación', 'Amnistía'], keywords: [/catalu[ñn]a|generalitat|junts|erc|euskadi|financiaci[óo]n autonómica|amnistía/i], color: '#5B21B6' },
  { tema: 'Coalición de gobierno', taxonomia: 'política_interna', subtemas: ['PSOE-Sumar', 'Junts', 'Pactos', 'Tensiones'], keywords: [/coalici[óo]n|psoe|sumar|gobierno|pacto/i], color: '#1F4E8C' },
  { tema: 'Economía y empleo', taxonomia: 'economía', subtemas: ['Inflación', 'Empleo', 'SMI', 'PIB'], keywords: [/inflaci[óo]n|paro|empleo|smi|pib|impuesto|deuda|déficit/i], color: '#0F766E' },
  { tema: 'Migración', taxonomia: 'social', subtemas: ['Llegadas', 'MENAS', 'Frontera', 'Reparto'], keywords: [/migra(?:ci[óo]n|ntes?)|inmigra|cayuco|patera|frontera|mena/i], color: '#DC2626' },
  { tema: 'Guerra Ucrania', taxonomia: 'internacional', subtemas: ['Ayuda', 'OTAN', 'Rusia', 'Apoyo militar'], keywords: [/ucrania|rusia|zelensky|putin|otan/i], color: '#3B82F6' },
  { tema: 'Israel-Palestina', taxonomia: 'internacional', subtemas: ['Gaza', 'Líbano', 'Hutíes', 'Genocidio'], keywords: [/gaza|israel|hamas|palest|hezbol|genocid/i], color: '#5D4037' },
  { tema: 'Sanidad', taxonomia: 'social', subtemas: ['Atención primaria', 'Listas espera', 'Plantilla'], keywords: [/sanidad|hospital|listas? de espera|m[ée]dic|enfermer/i], color: '#16A34A' },
  { tema: 'Educación', taxonomia: 'social', subtemas: ['Universidad', 'Concertada', 'EBAU'], keywords: [/educaci[óo]n|escuela|profesor|universidad|concertad|ebau/i], color: '#0EA5E9' },
  { tema: 'Cambio climático', taxonomia: 'medio_ambiente', subtemas: ['Sequía', 'Incendios', 'Energía'], keywords: [/clima|sequ[íi]a|incendi|cambio clim|energ[íi]a renovable/i], color: '#84CC16' },
  { tema: 'Feminismo y derechos', taxonomia: 'social', subtemas: ['Sólo sí', 'Trans', 'Igualdad'], keywords: [/feminism|igualdad|lgtbi|trans|machist|violencia g[ée]nero/i], color: '#D946EF' },
  { tema: 'Seguridad', taxonomia: 'social', subtemas: ['Crimen', 'Bandas', 'Terrorismo'], keywords: [/seguridad|crimen|robo|bandas|terror/i], color: '#7F1D1D' },
  { tema: 'Defensa', taxonomia: 'institucional', subtemas: ['Gasto 2%', 'OTAN', 'Industria'], keywords: [/defensa|otan|gasto militar|ejército|armada|fuerza aérea/i], color: '#1d1d1f' },
]

// Mapeo de medios → ideología (curado)
const MEDIO_IDEOLOGIA: Record<string, Ideologia> = {
  'eldiario.es': 'izquierda', 'eldiario': 'izquierda', 'público': 'izquierda', 'cuartopoder': 'izquierda',
  'infolibre': 'centro_izq', 'el país': 'centro_izq', 'cadena ser': 'centro_izq', 'la sexta': 'centro_izq',
  'el periódico': 'centro_izq', 'rtve': 'centro',
  'el confidencial': 'centro', '20minutos': 'centro', 'huffpost': 'centro_izq',
  'el mundo': 'centro_der', 'abc': 'derecha', 'la razón': 'derecha', 'okdiario': 'derecha',
  'libertad digital': 'derecha', 'esdiario': 'derecha', 'la gaceta': 'derecha',
}

function detectarIdeologia(medio: string): Ideologia {
  const k = medio.toLowerCase()
  for (const [pattern, ideo] of Object.entries(MEDIO_IDEOLOGIA)) {
    if (k.includes(pattern)) return ideo
  }
  return 'centro'
}

// ─── HELPERS ────────────────────────────────────────────────────────────

const STOP = new Set(['sobre','desde','hasta','según','tras','ante','entre','durante','esta','este','estos','estas','también','aunque','mientras','porque','cuando','donde','quien','cómo','para','contra','por','con','del','que','una','uno','unos','unas','los','las','les','sus','muy','más','tras'])

function tokens(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOP.has(w))
}
function bigrams(t: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]} ${t[i + 1]}`)
  return out
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

function clasificarTema(textos: string): { tema: string; taxonomia: string; subtemas: string[]; color: string } {
  let best: { tema: string; taxonomia: string; subtemas: string[]; color: string; score: number } | null = null
  for (const t of TEMA_KEYWORDS) {
    let score = 0
    for (const re of t.keywords) { const m = textos.match(re); if (m) score += m.length || 1 }
    if (score > 0 && (!best || score > best.score)) {
      best = { tema: t.tema, taxonomia: t.taxonomia, subtemas: t.subtemas, color: t.color, score }
    }
  }
  return best ?? { tema: 'Política general', taxonomia: 'política_interna', subtemas: [], color: '#525258' }
}

function detectarFrame(textos: string): { dominante: Frame; secundarios: Frame[]; pesos: Record<Frame, number>; esEpisodico: boolean } {
  const scores: Record<Frame, number> = { 'conflicto': 0, 'responsabilidad': 0, 'consecuencias_econ': 0, 'moralidad': 0, 'interés_humano': 0, 'estratégico': 0, 'episódico': 0, 'temático': 0 }
  for (const [frame, patterns] of Object.entries(FRAME_PATTERNS)) {
    for (const p of patterns) { const m = textos.match(p); if (m) scores[frame as Frame] += m.length || 1 }
  }
  const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1
  const pesos: Record<Frame, number> = {} as Record<Frame, number>
  for (const [k, v] of Object.entries(scores)) pesos[k as Frame] = +(v / total).toFixed(2)
  const ordenados = Object.entries(scores).filter(([k]) => k !== 'episódico' && k !== 'temático').filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const dominante: Frame = (ordenados[0]?.[0] as Frame) || 'conflicto'
  const secundarios: Frame[] = ordenados.slice(1, 3).map(e => e[0] as Frame)
  const esEpisodico = scores.episódico > scores.temático
  return { dominante, secundarios, pesos, esEpisodico }
}

function detectarEmocion(textos: string): { dominante: Emocion; secundarias: Emocion[]; intensidad: number; pesos: Record<string, number> } {
  const scores: Record<Emocion, number> = { 'alegría': 0, 'confianza': 0, 'miedo': 0, 'sorpresa': 0, 'tristeza': 0, 'asco': 0, 'ira': 0, 'anticipación': 0, 'indignación': 0, 'esperanza': 0, 'desprecio': 0, 'orgullo': 0, 'neutral': 0 }
  for (const [emocion, patterns] of Object.entries(EMOCION_PATTERNS)) {
    for (const p of patterns) { const m = textos.match(p); if (m) scores[emocion as Emocion] += m.length || 1 }
  }
  const ordenados = Object.entries(scores).filter(([k]) => k !== 'neutral').filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const dominante: Emocion = (ordenados[0]?.[0] as Emocion) || 'neutral'
  const secundarias: Emocion[] = ordenados.slice(1, 3).map(e => e[0] as Emocion)
  // intensidad = total emociones detectadas vs palabras del texto
  const totalE = Object.values(scores).reduce((s, v) => s + v, 0)
  const intensidad = Math.min(100, totalE * 8)
  const pesos: Record<string, number> = {}
  for (const [k, v] of Object.entries(scores)) if (v > 0) pesos[k] = v
  return { dominante, secundarias, intensidad, pesos }
}

function detectarEvidencia(textos: string): { tipo: TipoEvidencia; fuentes: string[]; calidad: 'alta' | 'media' | 'baja' } {
  const scores: Record<TipoEvidencia, number> = { 'datos_cuantitativos': 0, 'declaración': 0, 'opinión_experta': 0, 'testimonio_personal': 0, 'documento_oficial': 0, 'sin_evidencia': 0 }
  const calidades: Record<TipoEvidencia, 'alta' | 'media' | 'baja'> = { 'datos_cuantitativos': 'alta', 'documento_oficial': 'alta', 'declaración': 'media', 'opinión_experta': 'media', 'testimonio_personal': 'media', 'sin_evidencia': 'baja' }
  for (const { pattern, tipo } of TIPO_EVIDENCIA_PATTERNS) {
    const m = textos.match(pattern); if (m) scores[tipo] += m.length || 1
  }
  const ordenados = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const tipo = (ordenados[0]?.[0] as TipoEvidencia) || 'sin_evidencia'
  const fuentes = new Set<string>()
  const fuenteRe = /seg[úu]n\s+([A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+){0,2})/g
  let m
  while ((m = fuenteRe.exec(textos))) fuentes.add(m[1])
  return { tipo, fuentes: Array.from(fuentes).slice(0, 5), calidad: calidades[tipo] }
}

function detectarObjetivo(textos: string): { dominante: Objetivo; secundarios: Objetivo[] } {
  const scores: Record<Objetivo, number> = { 'informar': 0, 'persuadir': 0, 'movilizar': 0, 'desacreditar': 0, 'normalizar': 0, 'distraer': 0, 'cohesionar': 0 }
  for (const [obj, patterns] of Object.entries(OBJETIVO_PATTERNS)) {
    for (const p of patterns) { const m = textos.match(p); if (m) scores[obj as Objetivo] += m.length || 1 }
  }
  const ordenados = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  return {
    dominante: (ordenados[0]?.[0] as Objetivo) || 'informar',
    secundarios: ordenados.slice(1, 2).map(e => e[0] as Objetivo),
  }
}

function detectarActores(articles: AggregatedArticle[]): ActorDetectado[] {
  const actorMap = new Map<string, { tipo: TipoActor; menciones: number; sentSum: number; alineacion?: Ideologia }>()
  for (const a of articles) {
    const txt = a.title + ' ' + (a.description || '')
    for (const { pattern, nombre, tipo, alineacion } of ACTORES_NER) {
      const matches = txt.match(pattern)
      if (matches) {
        const existing = actorMap.get(nombre)
        if (existing) { existing.menciones += matches.length; existing.sentSum += a.sentiment_score }
        else { actorMap.set(nombre, { tipo, menciones: matches.length, sentSum: a.sentiment_score, alineacion }) }
      }
    }
  }
  return Array.from(actorMap.entries()).map(([nombre, v]) => ({
    nombre, tipo: v.tipo, menciones: v.menciones,
    sentimientoMedio: +(v.sentSum / v.menciones).toFixed(2),
    alineacion: v.alineacion,
  })).sort((a, b) => b.menciones - a.menciones).slice(0, 10)
}

function inferirBeneficioPerjuicio(actores: ActorDetectado[]): { beneficia: BeneficioPerjuicio[]; perjudica: BeneficioPerjuicio[] } {
  const beneficia: BeneficioPerjuicio[] = []
  const perjudica: BeneficioPerjuicio[] = []
  for (const a of actores) {
    const intensidad: 'alta' | 'media' | 'baja' = a.menciones >= 5 ? 'alta' : a.menciones >= 2 ? 'media' : 'baja'
    if (a.sentimientoMedio > 0.15) beneficia.push({ actor: a.nombre, intensidad, evidenciaCount: a.menciones })
    else if (a.sentimientoMedio < -0.15) perjudica.push({ actor: a.nombre, intensidad, evidenciaCount: a.menciones })
  }
  return {
    beneficia: beneficia.slice(0, 4),
    perjudica: perjudica.slice(0, 4),
  }
}

function calcularPolarizacion(articles: AggregatedArticle[]): number {
  if (articles.length < 2) return 0
  const media = articles.reduce((s, a) => s + a.sentiment_score, 0) / articles.length
  const varianza = articles.reduce((s, a) => s + Math.pow(a.sentiment_score - media, 2), 0) / articles.length
  return +Math.min(1, varianza * 4).toFixed(2)
}

function calcularCrescendo(articles: AggregatedArticle[]): number {
  if (articles.length < 3) return 1
  const sorted = [...articles].sort((a, b) => (a.pub_date_iso || '').localeCompare(b.pub_date_iso || ''))
  const half = Math.floor(sorted.length / 2)
  const primera = sorted.slice(0, half).length
  const segunda = sorted.slice(half).length
  if (primera === 0) return 2
  return +(segunda / primera).toFixed(2)
}

function calcularFaseCiclo(diasActiva: number, crescendo: number): FaseCiclo {
  if (diasActiva <= 2 && crescendo > 1.5) return 'emergencia'
  if (diasActiva <= 5 && crescendo > 1.2) return 'crecimiento'
  if (crescendo >= 0.9 && crescendo <= 1.2 && diasActiva >= 3) return 'pico'
  if (diasActiva >= 5 && crescendo < 0.9 && crescendo >= 0.5) return 'declive'
  if (crescendo < 0.5) return 'declive'
  if (diasActiva >= 10) return 'meseta'
  return 'crecimiento'
}

function extraerMensajesClave(articles: AggregatedArticle[]): string[] {
  // Identificar frases cortas que aparezcan en múltiples titulares
  const frecuencias = new Map<string, number>()
  for (const a of articles) {
    const t = a.title.toLowerCase()
    // Extraer secuencias de 3-5 palabras
    const palabras = t.split(/\s+/).filter(w => w.length > 3)
    for (let len = 4; len >= 3; len--) {
      for (let i = 0; i <= palabras.length - len; i++) {
        const frase = palabras.slice(i, i + len).join(' ')
        if (frase.length > 15) frecuencias.set(frase, (frecuencias.get(frase) || 0) + 1)
      }
    }
  }
  return Array.from(frecuencias.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f]) => f.charAt(0).toUpperCase() + f.slice(1))
}

function calcularIdeologiaMedios(articles: AggregatedArticle[]): { ideologiaMedia: Ideologia; distribucion: Record<Ideologia, number>; cobertura: 'transversal' | 'sesgada_izq' | 'sesgada_der' | 'periferia' } {
  const dist: Record<Ideologia, number> = { 'izquierda': 0, 'centro_izq': 0, 'centro': 0, 'centro_der': 0, 'derecha': 0 }
  for (const a of articles) {
    const ideo = detectarIdeologia(a.medio.nombre)
    dist[ideo]++
  }
  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1
  // Mapear ideología a numérico para promedio
  const valores: Record<Ideologia, number> = { 'izquierda': -2, 'centro_izq': -1, 'centro': 0, 'centro_der': 1, 'derecha': 2 }
  let sumaPond = 0
  for (const [ideo, n] of Object.entries(dist)) sumaPond += valores[ideo as Ideologia] * n
  const media = sumaPond / total
  const ideologiaMedia: Ideologia = media < -1.2 ? 'izquierda' : media < -0.4 ? 'centro_izq' : media < 0.4 ? 'centro' : media < 1.2 ? 'centro_der' : 'derecha'
  // Cobertura
  const ideologiasNonZero = Object.values(dist).filter(v => v > 0).length
  let cobertura: 'transversal' | 'sesgada_izq' | 'sesgada_der' | 'periferia' = 'transversal'
  if (ideologiasNonZero <= 1) cobertura = 'periferia'
  else if (media < -1.0) cobertura = 'sesgada_izq'
  else if (media > 1.0) cobertura = 'sesgada_der'
  return { ideologiaMedia, distribucion: dist, cobertura }
}

// ─── EXTRACCIÓN PRINCIPAL ───────────────────────────────────────────────

export function extraerNarrativasV3(articles: AggregatedArticle[], maxNarrativas = 8): NarrativaV3[] {
  if (articles.length < 3) return []

  // 1. Clustering greedy
  const docs = articles.map(a => {
    const txt = (a.title + ' ' + (a.description || '').slice(0, 200))
    return { article: a, set: new Set([...tokens(txt), ...bigrams(tokens(txt))]) }
  })
  const clusters: Array<{ docs: typeof docs; topTerms: Set<string> }> = []
  for (const doc of docs) {
    let mejor = -1, mejorSim = 0
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccard(doc.set, clusters[i].topTerms)
      if (sim > mejorSim && sim > 0.20) { mejor = i; mejorSim = sim }
    }
    if (mejor >= 0) { clusters[mejor].docs.push(doc); for (const t of doc.set) clusters[mejor].topTerms.add(t) }
    else { clusters.push({ docs: [doc], topTerms: new Set(doc.set) }) }
  }
  const significant = clusters.filter(c => c.docs.length >= 2)
  significant.sort((a, b) => b.docs.length - a.docs.length)

  return significant.slice(0, maxNarrativas).map((c, idx) => {
    const arts = c.docs.map(d => d.article)
    const textos = arts.map(a => a.title + ' ' + (a.description || '')).join(' ')

    const tema = clasificarTema(textos)
    const actores = detectarActores(arts)
    const { beneficia, perjudica } = inferirBeneficioPerjuicio(actores)
    const { dominante: frameDominante, secundarios: framesSecundarios, pesos: pesoFrame, esEpisodico } = detectarFrame(textos)
    const { dominante: emocionDominante, secundarias: emocionesSecundarias, intensidad: intensidadEmocional, pesos: pesoEmocion } = detectarEmocion(textos)
    const { tipo: tipoEvidenciaDominante, fuentes: fuentesCitadas, calidad: calidadEvidencia } = detectarEvidencia(textos)
    const { dominante: objetivoInferido, secundarios: objetivosSecundarios } = detectarObjetivo(textos)
    const { ideologiaMedia: ideologiaMediaMedios, distribucion: distribucionIdeologica, cobertura } = calcularIdeologiaMedios(arts)
    const mensajesClave = extraerMensajesClave(arts)

    const fuerza = arts.length
    const sentimientoMedio = +(arts.reduce((s, a) => s + a.sentiment_score, 0) / arts.length).toFixed(2)
    const polarizacion = calcularPolarizacion(arts)
    const crescendo = calcularCrescendo(arts)
    const tono: 'positivo' | 'negativo' | 'neutral' | 'polarizado' =
      polarizacion > 0.4 ? 'polarizado' :
      sentimientoMedio > 0.15 ? 'positivo' :
      sentimientoMedio < -0.15 ? 'negativo' : 'neutral'

    const fechas = arts.map(a => a.pub_date_iso).filter(Boolean).map(f => new Date(f!).getTime())
    const diasActiva = fechas.length > 0 ? Math.ceil((Math.max(...fechas) - Math.min(...fechas)) / 86400000) + 1 : 1
    const velocidadDifusion = +(fuerza / Math.max(1, diasActiva * 24)).toFixed(2)
    const reincidencia = Math.floor(diasActiva / 7) // estimación simple
    const faseCiclo = calcularFaseCiclo(diasActiva, crescendo)

    const mediosSet = new Set(arts.map(a => a.medio.nombre))
    const mediosCubriendo = Array.from(mediosSet).slice(0, 12)

    const ejemplos = arts.slice(0, 3).map(a => ({
      titulo: a.title, medio: a.medio.nombre, url: a.link, fecha: a.pub_date_iso,
    }))

    return {
      id: `narr-v3-${idx + 1}`,
      tema: tema.tema, subtemas: tema.subtemas, taxonomia: tema.taxonomia, color: tema.color,
      actores, beneficia, perjudica,
      frameDominante, framesSecundarios, esEpisodico, pesoFrame,
      emocionDominante, emocionesSecundarias, intensidadEmocional, pesoEmocion,
      tipoEvidenciaDominante, fuentesCitadas, calidadEvidencia,
      ideologiaMediaMedios, distribucionIdeologica, cobertura,
      objetivoInferido, objetivosSecundarios, mensajesClave,
      faseCiclo, fuerza, diasActiva, crescendo, polarizacion, velocidadDifusion, reincidencia,
      sentimientoMedio, tono,
      ejemplos, mediosCubriendo,
    }
  })
}
