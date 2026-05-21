/**
 * Matriz de fuentes utilizadas por cada tab de /prensa (Medios).
 *
 * Diseño analítico inspirado en NewsWhip · Media Cloud · GDELT · Pulsar.
 * Mantenemos lo existente (RSS agregador 219 medios ES + UE) y añadimos
 * NewsAPI como fuente de búsqueda profunda + Google Fact Check planned +
 * GDELT planned.
 */

export type MediosTabId =
  | 'radar'
  | 'busqueda'
  | 'agenda'
  | 'narrativas'
  | 'actores'
  | 'sentimiento'
  | 'cobertura'
  | 'viralidad'
  | 'desinformacion'
  | 'informes'

export interface MediosTab {
  id: MediosTabId
  number: number
  label: string
  shortLabel: string
  description: string
  sources: {
    key: string
    name: string
    status: 'live' | 'planned' | 'optional'
    endpoint?: string
  }[]
  themeAccent: string
  icon?: string
}

export const MEDIOS_TABS: MediosTab[] = [
  {
    id: 'radar',
    number: 1,
    label: 'Radar en vivo',
    shortLabel: 'Radar',
    description: 'Qué está pasando ahora · titulares, volumen, temas emergentes, medios más activos.',
    sources: [
      { key: 'rss',     name: 'RSS · 219 medios ES + UE', status: 'live',    endpoint: '/api/medios/intel' },
      { key: 'newsapi', name: 'NewsAPI · top-headlines',  status: 'live',    endpoint: '/api/newsapi/top-spain' },
      { key: 'gdelt',   name: 'GDELT · DOC API',          status: 'planned', endpoint: '/api/gdelt/doc' },
    ],
    themeAccent: '#1F4E8C',
  },
  {
    id: 'busqueda',
    number: 2,
    label: 'Búsqueda puntual',
    shortLabel: 'Búsqueda',
    description: 'Investigación libre del analista · cualquier tema · timeline + actores + narrativas + comparación ideológica.',
    sources: [
      { key: 'newsapi',    name: 'NewsAPI · everything (q + booleans + dominios)', status: 'live', endpoint: '/api/medios/search' },
      { key: 'rss',        name: 'RSS · 219 medios ES + UE',                       status: 'live', endpoint: '/api/medios/intel' },
      { key: 'gdelt',      name: 'GDELT · multilingüe global',                     status: 'planned' },
      { key: 'mediacloud', name: 'Media Cloud · framing histórico',                status: 'planned' },
    ],
    themeAccent: '#DC2626',
    icon: '⊕',
  },
  {
    id: 'agenda',
    number: 3,
    label: 'Agenda mediática',
    shortLabel: 'Agenda',
    description: 'Ranking de temas que dominan la cobertura · evolución 24h/7d/30d + topic mining.',
    sources: [
      { key: 'rss',      name: 'RSS · clustering interno (TF-IDF + n-gramas)', status: 'live', endpoint: '/api/medios/intel' },
      { key: 'newsapi',  name: 'NewsAPI · everything',                          status: 'live' },
      { key: 'gdelt',    name: 'GDELT · TVnews + themes',                       status: 'planned' },
    ],
    themeAccent: '#F97316',
  },
  {
    id: 'narrativas',
    number: 4,
    label: 'Narrativas & frames',
    shortLabel: 'Narrativas',
    description: 'Cómo se interpreta cada tema · crisis, amenaza, recuperación, polarización · marcos por ideología.',
    sources: [
      { key: 'rss',     name: 'RSS · narrativas V3 internas',  status: 'live', endpoint: '/api/medios/intel' },
      { key: 'gdelt',   name: 'GDELT · emociones (GKG)',       status: 'planned' },
      { key: 'pulsar',  name: 'Pulsar-like clustering',         status: 'planned' },
    ],
    themeAccent: '#7C3AED',
  },
  {
    id: 'actores',
    number: 5,
    label: 'Actores & menciones',
    shortLabel: 'Actores',
    description: 'Personas, partidos, instituciones, empresas, países · menciones, temas asociados, tono.',
    sources: [
      { key: 'rss',      name: 'RSS · taxonomía actores interna',   status: 'live', endpoint: '/api/medios/intel' },
      { key: 'wikidata', name: 'Wikidata · alias + cargos',          status: 'planned' },
      { key: 'gdelt',    name: 'GDELT · cobertura internacional',    status: 'planned' },
    ],
    themeAccent: '#0891B2',
  },
  {
    id: 'sentimiento',
    number: 6,
    label: 'Sentimiento & reputación',
    shortLabel: 'Sentimiento',
    description: 'Tono mediático · positivo/negativo/neutral por actor, partido, empresa, tema y medio.',
    sources: [
      { key: 'heuristic',  name: 'Heurística interna (keywords)',     status: 'live', endpoint: '/api/medios/intel' },
      { key: 'transformer', name: 'Multilingual transformer NLP',     status: 'planned' },
      { key: 'llm',         name: 'LLM scoring (gpt-4o-mini)',        status: 'optional' },
    ],
    themeAccent: '#16A34A',
  },
  {
    id: 'cobertura',
    number: 7,
    label: 'Cobertura comparada',
    shortLabel: 'Cobertura',
    description: 'Cómo cuentan el mismo evento distintos bloques · izquierda vs derecha · nacional vs internacional.',
    sources: [
      { key: 'rss',         name: 'RSS · story clusters internos',         status: 'live', endpoint: '/api/medios/intel' },
      { key: 'newsapi',     name: 'NewsAPI · domains filter',                status: 'live', endpoint: '/api/medios/search' },
      { key: 'mediacloud',  name: 'Media Cloud · framing histórico',         status: 'planned' },
    ],
    themeAccent: '#8B5CF6',
  },
  {
    id: 'viralidad',
    number: 8,
    label: 'Viralidad & difusión',
    shortLabel: 'Viralidad',
    description: 'Temas que aceleran · titulares replicados · medios que inician historia · picos anómalos.',
    sources: [
      { key: 'newsapi-pop', name: 'NewsAPI · sortBy=popularity',           status: 'live',    endpoint: '/api/medios/search' },
      { key: 'rss-velocity', name: 'RSS · velocidad propagación interna',  status: 'live' },
      { key: 'newswhip',     name: 'NewsWhip · engagement social',          status: 'planned' },
      { key: 'gdelt-volume', name: 'GDELT · TVnews volumen',                status: 'planned' },
    ],
    themeAccent: '#EAB308',
  },
  {
    id: 'desinformacion',
    number: 9,
    label: 'Desinformación & verificación',
    shortLabel: 'Verificación',
    description: 'Claims dudosos · bulos · verificaciones · narrativas falsas · fact-checkers ES.',
    sources: [
      { key: 'rss-fc',         name: 'RSS · Maldita, Newtral, EFE Verifica', status: 'live', endpoint: '/api/medios/intel' },
      { key: 'gfact',          name: 'Google Fact Check Tools API',           status: 'planned' },
      { key: 'newsapi-disinfo', name: 'NewsAPI · queries de desinformación',  status: 'live' },
    ],
    themeAccent: '#B91C1C',
  },
  {
    id: 'informes',
    number: 10,
    label: 'Informes, alertas & dossiers',
    shortLabel: 'Informes',
    description: 'Búsquedas guardadas · monitores · alertas por pico · dossier PDF · resumen ejecutivo IA.',
    sources: [
      { key: 'internal-saves', name: 'Búsquedas y monitores guardados',       status: 'live' },
      { key: 'pdf-export',     name: 'PDF dossier · WeasyPrint',              status: 'planned' },
      { key: 'brain',          name: 'Brain LLM · resumen ejecutivo',         status: 'planned' },
      { key: 'alerts-cron',    name: 'Alertas cron · webhook + email',        status: 'planned' },
    ],
    themeAccent: '#475569',
  },
]

export function getMediosTab(id: string | null | undefined): MediosTab {
  return MEDIOS_TABS.find((t) => t.id === id) || MEDIOS_TABS[0]
}

export const MEDIOS_TAB_IDS = MEDIOS_TABS.map((t) => t.id) as MediosTabId[]

/**
 * Grupos ideológicos de medios para filtrado en /api/medios/search.
 * El catalog medios.json tiene `ideologia: number` (-100 a +100).
 * Buckets definidos según rangos académicos (Allsides / MBFC).
 */
export type SourceGroup =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'economic'
  | 'international'
  | 'regional'
  | 'fact-checkers'

export function ideologyToGroup(ideologia: number): SourceGroup {
  if (ideologia <= -40) return 'left'
  if (ideologia <= -15) return 'center-left'
  if (ideologia <= 15) return 'center'
  if (ideologia <= 40) return 'center-right'
  return 'right'
}

export const IDEOLOGY_RANGES: Record<SourceGroup, { min: number; max: number; label: string; color: string }> = {
  left:          { min: -100, max: -40, label: 'Izquierda',     color: '#DC2626' },
  'center-left': { min: -40,  max: -15, label: 'Centro-izq',    color: '#F97316' },
  center:        { min: -15,  max: 15,  label: 'Centro',        color: '#94A3B8' },
  'center-right': { min: 15,   max: 40,  label: 'Centro-der',    color: '#0891B2' },
  right:         { min: 40,   max: 100, label: 'Derecha',       color: '#1E40AF' },
  economic:      { min: -100, max: 100, label: 'Económicos',    color: '#10B981' },
  international: { min: -100, max: 100, label: 'Internacional', color: '#7C3AED' },
  regional:      { min: -100, max: 100, label: 'Regional',      color: '#F59E0B' },
  'fact-checkers': { min: -100, max: 100, label: 'Verificadores', color: '#B91C1C' },
}
