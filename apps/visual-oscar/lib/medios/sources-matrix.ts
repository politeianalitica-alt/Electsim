/**
 * Matriz de fuentes utilizadas por cada tab de /prensa (Medios).
 *
 * Estructura final 10 tabs (post-iteración usuario):
 *
 *   1. Pulso de medios       · feed RSS multi-tier + agenda + topics (ex-Radar)
 *   2. Búsqueda puntual      · investigación libre NewsAPI · DEEP
 *   3. Mapa global narrativas · NEW · world map ACLED+GDELT por categoría
 *   4. Actores & sentimiento · figuras + empresas + sentimiento dual (merge)
 *   5. Cobertura ideológica  · misma historia, distinto framing izq vs der
 *   6. Viralidad & difusión  · first-movers + replicación + popularity
 *   7. Análisis IA · Groq    · LLM reasoning sobre contexto live
 *   8. Desinformación & verif · Google Fact Check + RSS fact-checkers
 *   9. Inteligencia regional · CCAA + Eurostat regional (NUTS2)
 *   10. Informes & alertas   · monitores + dossier + alertas cron
 */

export type MediosTabId =
  | 'pulso'
  | 'busqueda'
  | 'mapa-global'
  | 'actores-sentimiento'
  | 'cobertura-ideologica'
  | 'viralidad'
  | 'analisis-ia'
  | 'desinformacion'
  | 'regional'
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
    id: 'pulso',
    number: 1,
    label: 'Pulso de medios',
    shortLabel: 'Pulso',
    description: 'Feed RSS 219 medios + topics emergentes + agenda mediática · pulso en vivo.',
    sources: [
      { key: 'rss',     name: 'RSS · 219 medios ES + UE',  status: 'live', endpoint: '/api/medios/intel' },
      { key: 'newsapi', name: 'NewsAPI · top-headlines ES', status: 'live', endpoint: '/api/newsapi/top-spain' },
      { key: 'gdelt',   name: 'GDELT · cobertura global ES', status: 'live', endpoint: '/api/gdelt/articles' },
    ],
    themeAccent: '#1F4E8C',
  },
  {
    id: 'busqueda',
    number: 2,
    label: 'Búsqueda puntual',
    shortLabel: 'Búsqueda',
    description: 'Investigación libre · NewsAPI everything + filtros ideológicos + Lectura IA + dossier export.',
    sources: [
      { key: 'newsapi',    name: 'NewsAPI · everything (booleans+dominios+fechas)', status: 'live', endpoint: '/api/medios/search' },
      { key: 'rss',        name: 'RSS · 219 medios ES + UE',                         status: 'live' },
      { key: 'gdelt',      name: 'GDELT · multilingüe global',                       status: 'live' },
      { key: 'brain',      name: 'Brain LLM · Lectura Politeia (Groq)',              status: 'live', endpoint: '/api/medios/lectura' },
    ],
    themeAccent: '#DC2626',
    icon: '⊕',
  },
  {
    id: 'mapa-global',
    number: 3,
    label: 'Mapa global de narrativas',
    shortLabel: 'Mapa global',
    description: 'World map con eventos coloreados por categoría · ACLED + GDELT · filtros región/relevancia · ficha evento + IA.',
    sources: [
      { key: 'acled',  name: 'ACLED · eventos conflicto 30d', status: 'live', endpoint: '/api/acled/by-country' },
      { key: 'gdelt',  name: 'GDELT · artículos por país 24h', status: 'live', endpoint: '/api/gdelt/articles' },
      { key: 'brain',  name: 'Brain LLM · lectura evento',     status: 'live', endpoint: '/api/medios/lectura' },
    ],
    themeAccent: '#0891B2',
  },
  {
    id: 'actores-sentimiento',
    number: 4,
    label: 'Actores & sentimiento',
    shortLabel: 'Actores',
    description: 'Figuras + partidos + empresas + sectores · menciones, tono y co-menciones · merge sentimiento dual.',
    sources: [
      { key: 'rss',     name: 'RSS · taxonomía actores',          status: 'live', endpoint: '/api/medios/intel' },
      { key: 'wikidata', name: 'Wikidata · alias + cargos',        status: 'live', endpoint: '/api/wikidata/search' },
      { key: 'gdelt',   name: 'GDELT · cobertura internacional',   status: 'live' },
    ],
    themeAccent: '#7C3AED',
  },
  {
    id: 'cobertura-ideologica',
    number: 5,
    label: 'Cobertura ideológica',
    shortLabel: 'Cobertura',
    description: 'Misma historia, distintos framings · izquierda vs centro vs derecha · story clusters comparados.',
    sources: [
      { key: 'rss',     name: 'RSS · story clusters por ideología', status: 'live', endpoint: '/api/medios/intel' },
      { key: 'newsapi', name: 'NewsAPI · domains filter por bloque', status: 'live', endpoint: '/api/medios/search' },
    ],
    themeAccent: '#8B5CF6',
  },
  {
    id: 'viralidad',
    number: 6,
    label: 'Viralidad & difusión',
    shortLabel: 'Viralidad',
    description: 'Temas que aceleran · first-movers · replicación entre medios · sortBy popularity.',
    sources: [
      { key: 'newsapi-pop', name: 'NewsAPI · sortBy=popularity',          status: 'live', endpoint: '/api/medios/search' },
      { key: 'rss-velocity', name: 'RSS · velocidad propagación interna', status: 'live' },
    ],
    themeAccent: '#EAB308',
  },
  {
    id: 'analisis-ia',
    number: 7,
    label: 'Análisis IA · Groq',
    shortLabel: 'IA',
    description: 'Razonamiento LLM sobre todo el contexto live · briefing ejecutivo + hallazgos + framing risk + qué vigilar.',
    sources: [
      { key: 'brain',  name: 'Brain LLM · Groq llama-3.3-70b',  status: 'live', endpoint: '/api/medios/lectura' },
      { key: 'rss',    name: 'RSS · contexto general',           status: 'live' },
      { key: 'gdelt',  name: 'GDELT · contexto global',          status: 'live' },
    ],
    themeAccent: '#A855F7',
  },
  {
    id: 'desinformacion',
    number: 8,
    label: 'Desinformación & verificación',
    shortLabel: 'Verificación',
    description: 'Claims verificados + bulos + narrativas falsas · Maldita, Newtral, EFE Verifica · Google Fact Check.',
    sources: [
      { key: 'rss-fc',         name: 'RSS · Maldita, Newtral, EFE Verifica', status: 'live', endpoint: '/api/news/desinformacion' },
      { key: 'gfact',          name: 'Google Fact Check Tools API',          status: 'live', endpoint: '/api/factcheck/search' },
    ],
    themeAccent: '#B91C1C',
  },
  {
    id: 'regional',
    number: 9,
    label: 'Inteligencia regional',
    shortLabel: 'CCAA',
    description: 'Sentimiento por CCAA + medios regionales + topics regionales · mapa coroplético España.',
    sources: [
      { key: 'rss-regional', name: 'RSS · medios regionales por CCAA',  status: 'live', endpoint: '/api/medios/ccaa' },
      { key: 'eurostat',     name: 'Eurostat · regiones NUTS2 ES',       status: 'live', endpoint: '/api/eurostat/regions-nuts2' },
    ],
    themeAccent: '#16A34A',
  },
  {
    id: 'informes',
    number: 10,
    label: 'Informes, alertas & dossiers',
    shortLabel: 'Informes',
    description: 'Búsquedas guardadas · monitores · dossier MD/HTML export · plantillas alertas.',
    sources: [
      { key: 'internal-saves', name: 'Monitores guardados (localStorage)',         status: 'live' },
      { key: 'dossier',        name: 'Dossier export · Markdown + HTML print',     status: 'live', endpoint: '/api/medios/dossier' },
      { key: 'brain',          name: 'Brain LLM · Lectura ejecutiva',              status: 'live', endpoint: '/api/medios/lectura' },
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
