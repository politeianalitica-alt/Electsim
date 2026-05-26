/**
 * Event classifier · Sprint G14 FASE 1
 *
 * Limpia texto de feeds (boilerplate de navegación, footers, CTAs) y clasifica
 * eventos a nuestra taxonomía interna `GeoEventType` + un nivel de amenaza.
 *
 * Portado de `globalthreatmap-main/lib/event-classifier.ts` (MIT) con:
 *  - Patrones boilerplate ES añadidos (no solo EN)
 *  - Categorías mapeadas a nuestro `GeoEventType` (no a la taxonomía origen)
 *  - Sin dependencias externas (puro string ops, server+client safe)
 *
 * Uso típico antes de NLP sobre títulos/cuerpos RSS:
 *   const clean = cleanText(article.title + ' ' + article.summary)
 *   const event_type = classifyGeoEventType(clean)
 *   const threat = classifyThreatLevel(clean)
 *   const keywords = extractKeywords(clean)
 */
import type { GeoEventType } from './geo-methodology'

/* ──────────────────────────── boilerplate ───────────────────────────── */

/**
 * Patrones de basura repetida en feeds (menús, footers, CTAs). Mezcla EN+ES
 * porque nuestros feeds combinan medios anglosajones (Reuters, AP, BBC) y
 * hispanos/oficiales (MAEC, Moncloa, BOE, RT en español, Sputnik mundo).
 */
const BOILERPLATE_PATTERNS: RegExp[] = [
  // Navegación EN
  /skip to (?:main |primary )?content/gi,
  /toggle navigation/gi,
  /keyboard shortcuts?(?: for audio player)?/gi,
  /search(?:\s+the site)?/gi,
  /sign (?:in|up|out)/gi,
  /log (?:in|out)/gi,
  /subscribe(?:\s+now)?/gi,
  /newsletter/gi,
  /privacy policy/gi,
  /terms (?:of (?:service|use)|and conditions)/gi,
  /cookie (?:policy|settings|preferences)/gi,
  /about us/gi,
  /contact us/gi,
  /advertise (?:with us)?/gi,
  /careers/gi,
  /weather (?:today|forecast)?/gi,
  /all rights reserved/gi,
  /copyright \d{4}/gi,
  /follow us on/gi,
  /share (?:this|on)/gi,
  /related (?:articles|stories|posts)/gi,
  /recommended (?:for you|articles)/gi,
  /trending (?:now|stories)/gi,
  /most (?:read|popular|viewed)/gi,
  /read more/gi,
  /continue reading/gi,
  /load(?:ing)? more/gi,
  /view (?:all|more)/gi,
  /see (?:all|more)/gi,
  /advertisement/gi,
  /sponsored (?:content|by)/gi,
  /click here/gi,
  /tap (?:here|to)/gi,
  /download (?:our )?app/gi,
  /get the app/gi,
  /breaking news alert/gi,
  /live updates?/gi,

  // Navegación ES
  /(?:saltar|ir) (?:al |a )?(?:contenido|navegaci[óo]n)/gi,
  /iniciar sesi[óo]n/gi,
  /cerrar sesi[óo]n/gi,
  /reg[íi]strate/gi,
  /(?:bolet[íi]n|newsletter|suscr[íi]bete)/gi,
  /pol[íi]tica de (?:privacidad|cookies)/gi,
  /aviso legal/gi,
  /t[ée]rminos (?:y condiciones|de uso)/gi,
  /sobre nosotros/gi,
  /contacta(?:r|nos)?/gi,
  /publicidad/gi,
  /trabaja con nosotros/gi,
  /todos los derechos reservados/gi,
  /derechos reservados \d{4}/gi,
  /s[íi]guenos en/gi,
  /compart(?:ir|e) (?:en|esto)/gi,
  /(?:art[íi]culos|noticias) relacionad(?:os|as)/gi,
  /recomendad(?:o|a)s? para ti/gi,
  /m[áa]s (?:le[íi]d(?:o|a)s|popular(?:es)?|visto)/gi,
  /leer m[áa]s/gi,
  /continuar leyendo/gi,
  /cargar m[áa]s/gi,
  /ver (?:m[áa]s|todo)/gi,
  /haz clic aqu[íi]/gi,
  /descarga(?:r)? (?:la )?app/gi,
  /[úu]ltima hora/gi,
  /actualizaci[óo]n en directo/gi,
  /noticia en desarrollo/gi,

  // Menús a sola palabra (multilínea)
  /^\s*menu\s*$/gim,
  /^\s*home\s*$/gim,
  /^\s*news\s*$/gim,
  /^\s*sports?\s*$/gim,
  /^\s*entertainment\s*$/gim,
  /^\s*business\s*$/gim,
  /^\s*tech(?:nology)?\s*$/gim,
  /^\s*opinion\s*$/gim,
  /^\s*video\s*$/gim,
  /^\s*photos?\s*$/gim,
  /^\s*men[úu]\s*$/gim,
  /^\s*inicio\s*$/gim,
  /^\s*noticias\s*$/gim,
  /^\s*deportes\s*$/gim,
  /^\s*econom[íi]a\s*$/gim,
  /^\s*pol[íi]tica\s*$/gim,
  /^\s*opini[óo]n\s*$/gim,
  /^\s*v[íi]deo\s*$/gim,
  /^\s*fotos?\s*$/gim,
]

/**
 * Elimina boilerplate y normaliza espacios. Conserva mayúsculas/puntuación
 * (necesario para NER posterior).
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) cleaned = cleaned.replace(pattern, '')
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim()
  return cleaned
}

/* ─────────────────────── clasificación a GeoEventType ────────────────────── */

/**
 * Cada GeoEventType tiene su set de keywords EN+ES. Detectamos por suma de
 * matches (no exclusión mutua: ganador = más matches).
 */
const TYPE_KEYWORDS: Record<GeoEventType, string[]> = {
  armed_conflict: [
    // EN
    'war', 'battle', 'fighting', 'combat', 'clash', 'strike', 'attack',
    'offensive', 'invasion', 'troops', 'airstrike', 'bombardment', 'shelling',
    'shelled', 'killed', 'killing', 'wounded', 'casualties', 'rebels',
    // ES
    'guerra', 'batalla', 'combate', 'enfrentamiento', 'choque', 'ataque',
    'ofensiva', 'invasi[óo]n', 'tropas', 'bombardeo', 'muertos', 'heridos',
    'bajas', 'asalto', 'rebeldes',
  ],
  protest_unrest: [
    'protest', 'demonstration', 'rally', 'march', 'riot', 'unrest',
    'uprising', 'dissent', 'activist',
    'protesta', 'manifestaci[óo]n', 'marcha', 'disturbios', 'revuelta',
    'levantamiento', 'huelga', 'paro general', 'activista',
  ],
  diplomatic_warning: [
    'summit', 'treaty', 'agreement', 'diplomatic', 'embassy', 'ambassador',
    'negotiation', 'talks', 'bilateral', 'condemns', 'denounces', 'expels',
    'recalls ambassador', 'warns',
    'cumbre', 'tratado', 'acuerdo', 'diplom[áa]tic[oa]', 'embajada',
    'embajador', 'negociaci[óo]n', 'di[áa]logos', 'bilateral', 'condena',
    'denuncia', 'expulsa', 'llama a consultas', 'advierte',
  ],
  sanction: [
    'sanction', 'sanctioned', 'embargo', 'asset freeze', 'export control',
    'ofac', 'sdn list', 'designated',
    'sanci[óo]n', 'sancionad', 'embargo', 'congelaci[óo]n de activos',
    'lista de sancionados', 'designad',
  ],
  humanitarian_crisis: [
    'famine', 'starvation', 'displacement', 'refugee', 'displaced',
    'epidemic', 'pandemic', 'outbreak', 'cholera', 'malnutrition',
    'humanitarian',
    'hambruna', 'hambre', 'desplazamiento', 'refugiad', 'desplazad',
    'epidemia', 'pandemia', 'brote', 'c[óo]lera', 'desnutrici[óo]n',
    'humanitari',
  ],
  military_deployment: [
    'deployment', 'deploy', 'nato exercise', 'reinforcement', 'troops sent',
    'naval exercise', 'air patrol',
    'despliegue', 'despliega', 'ejercicio militar', 'refuerzo', 'env[íi]o de tropas',
    'maniobras', 'patrulla',
  ],
  consular_warning: [
    'travel advisory', 'travel warning', 'do not travel', 'avoid travel',
    'consular alert', 'level 4', 'level 3',
    'recomendaci[óo]n de viaje', 'desaconseja viajar', 'no viajar',
    'alerta consular', 'aviso consular', 'maec recomienda',
  ],
  migration_pressure: [
    'migration', 'migrants', 'border crossing', 'asylum', 'boat',
    'mediterranean crossing', 'frontex',
    'migraci[óo]n', 'migrantes', 'cruce fronterizo', 'frontera', 'asilo',
    'patera', 'cayuco', 'cruce del estrecho', 'canarias', 'ceuta', 'melilla',
  ],
  energy_disruption: [
    'pipeline', 'gas supply', 'lng', 'oil export', 'opec', 'price cap',
    'crude', 'energy crisis', 'blackout', 'power outage',
    'gasoducto', 'oleoducto', 'gnl', 'suministro de gas', 'crisis energ[ée]tica',
    'apag[óo]n', 'corte de luz', 'opec', 'crudo', 'petr[óo]leo',
  ],
  cyber: [
    'cyber', 'hack', 'breach', 'malware', 'ransomware', 'ddos', 'phishing',
    'data leak', 'apt', 'vulnerability',
    'ciber', 'ciberataque', 'hackeo', 'brecha', 'malware', 'ransomware',
    'phishing', 'fuga de datos', 'vulnerabilidad',
  ],
  spain_action: [
    'spain announces', 'spain sends', 'sanchez', 'albares', 'maec',
    'moncloa', 'cooperaci[óo]n espa[ñn]ola',
    'espa[ñn]a anuncia', 'espa[ñn]a env[íi]a', 'gobierno espa[ñn]ol',
    's[áa]nchez', 'albares', 'maec', 'moncloa', 'aecid', 'cooperaci[óo]n espa[ñn]ola',
  ],
  media_narrative: [
    // Genérico: cuando no hay materia, sólo cobertura
    'analysis', 'opinion piece', 'editorial', 'commentary', 'analiza',
    'opini[óo]n', 'editorial', 'columna',
  ],
}

export function classifyGeoEventType(text: string): GeoEventType {
  if (!text) return 'media_narrative'
  const lower = text.toLowerCase()
  let best: GeoEventType = 'media_narrative'
  let bestScore = 0
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS) as Array<[GeoEventType, string[]]>) {
    let score = 0
    for (const kw of kws) {
      // Algunos keywords son regex-flavored (con [áa] etc) — usamos test
      try {
        const rx = new RegExp(`\\b${kw}`, 'i')
        if (rx.test(lower)) score++
      } catch {
        if (lower.includes(kw.toLowerCase())) score++
      }
    }
    if (score > bestScore) { bestScore = score; best = type }
  }
  return best
}

/* ─────────────────────── nivel de amenaza ───────────────────── */

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

const THREAT_LEVEL_KEYWORDS: Record<ThreatLevel, string[]> = {
  critical: [
    'emergency', 'imminent', 'catastrophic', 'mass casualty', 'nuclear', 'wmd',
    'urgent', 'crisis', 'immediate threat',
    'emergencia', 'inminente', 'catastr[óo]fic', 'v[íi]ctimas masivas',
    'urgente', 'crisis', 'amenaza inminente',
  ],
  high: [
    'severe', 'major', 'significant', 'escalating', 'dangerous', 'critical',
    'serious', 'alarming', 'warning', 'casualties', 'heavy combat', 'mass casualty',
    'grave', 'severo', 'importante', 'significativ', 'escalada', 'peligros',
    'cr[íi]tic', 'serio', 'alarmante', 'advertencia', 'v[íi]ctimas', 'fuerte combate',
  ],
  medium: [
    'moderate', 'developing', 'ongoing', 'tensions', 'concern', 'elevated',
    'increasing', 'notable',
    'moderad', 'en desarrollo', 'en curso', 'tensiones', 'preocupaci[óo]n',
    'elevad', 'crecient', 'notable',
  ],
  low: [
    'minor', 'limited', 'contained', 'isolated', 'localized', 'manageable', 'stable',
    'menor', 'limitad', 'contenid', 'aislad', 'localizad', 'manejable', 'estable',
  ],
  info: [
    'update', 'report', 'announcement', 'statement', 'analysis', 'brief',
    'summary', 'overview',
    'actualizaci[óo]n', 'informe', 'anuncio', 'declaraci[óo]n', 'an[áa]lisis',
    'resumen', 'panorama',
  ],
}

/**
 * Devuelve el primer nivel cuyo keyword aparece (orden CRITICAL→INFO).
 * Default: 'medium' si no hay señal clara.
 */
export function classifyThreatLevel(text: string): ThreatLevel {
  if (!text) return 'medium'
  const lower = text.toLowerCase()
  for (const [level, kws] of Object.entries(THREAT_LEVEL_KEYWORDS) as Array<[ThreatLevel, string[]]>) {
    for (const kw of kws) {
      try {
        const rx = new RegExp(`\\b${kw}`, 'i')
        if (rx.test(lower)) return level
      } catch {
        if (lower.includes(kw.toLowerCase())) return level
      }
    }
  }
  return 'medium'
}

/* ─────────────────────── extracciones auxiliares ────────────────────── */

/**
 * Extrae menciones a organizaciones supra-nacionales y patrones "X gobierno/
 * ministro/presidente". Útil como pista NER ligera antes de pasar a pysentimiento.
 */
export function extractMentionedEntities(text: string): string[] {
  if (!text) return []
  const entities = new Set<string>()
  const patterns: RegExp[] = [
    /\b(United Nations|UN|NATO|OTAN|EU|European Union|Uni[óo]n Europea|WHO|OMS|IMF|FMI|World Bank|Banco Mundial|OPEC|OPEP|ASEAN|BRICS|G7|G20)\b/gi,
    /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s+(?:government|gobierno|military|ej[ée]rcito|ministry|ministerio|president|presidente|prime minister|primer ministro)/g,
  ]
  for (const pattern of patterns) {
    let m: RegExpExecArray | null
    // Reset lastIndex defensivo
    pattern.lastIndex = 0
    while ((m = pattern.exec(text)) !== null) {
      if (m[1]) entities.add(m[1].trim())
      if (m[0] && pattern === patterns[0]) entities.add(m[0].trim())
    }
  }
  return Array.from(entities)
}

/** Devuelve hasta 10 keywords del catálogo TYPE_KEYWORDS+THREAT que aparecen. */
export function extractKeywords(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const allKw = [
    ...Object.values(TYPE_KEYWORDS).flat(),
    ...Object.values(THREAT_LEVEL_KEYWORDS).flat(),
  ]
  const found = new Set<string>()
  for (const kw of allKw) {
    try {
      const rx = new RegExp(`\\b${kw}`, 'i')
      if (rx.test(lower)) found.add(kw)
    } catch {
      if (lower.includes(kw.toLowerCase())) found.add(kw)
    }
  }
  return Array.from(found).slice(0, 10)
}

/* ─────────────────────── helper integrado ───────────────────── */

export interface ClassifiedEvent {
  cleaned_text: string
  event_type: GeoEventType
  threat_level: ThreatLevel
  entities: string[]
  keywords: string[]
}

/**
 * Helper one-shot: limpia, clasifica y extrae. Cero side-effects.
 */
export function classifyRawText(text: string | null | undefined): ClassifiedEvent {
  const cleaned = cleanText(text)
  const full = cleaned // ya limpio
  return {
    cleaned_text: cleaned,
    event_type: classifyGeoEventType(full),
    threat_level: classifyThreatLevel(full),
    entities: extractMentionedEntities(full),
    keywords: extractKeywords(full),
  }
}

export const EVENT_CLASSIFIER_VERSION = 'event-classifier-v1'
