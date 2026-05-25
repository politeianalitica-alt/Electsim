/**
 * Matriz de fuentes utilizadas por cada tab de /prensa (Medios).
 *
 * Sprint M3 · refactor 10→7 tabs · estructura como flujo analítico
 * coherente en lugar de colección de módulos sueltos:
 *
 *   1. Pulso                  · qué pasa AHORA
 *   2. Búsqueda               · qué se publicó sobre X
 *   3. Narrativas & framing   · qué narrativas se forman + cómo, por quién
 *   4. Actores e impacto      · a quién afecta y cómo (no solo sentimiento)
 *   5. Mapas de impacto       · dónde impacta (España/CCAA + Global)
 *   6. Desinformación         · qué es falso o dudoso
 *   7. Informes & monitores   · qué guardo/exporto/monitorizo
 *
 * Viralidad y Análisis IA · Groq pasan a ser CAPAS TRANSVERSALES:
 *   - <ViralidadStrip />        · slice "historias que aceleran" en Pulso/Narrativas/Búsqueda/Informes
 *   - <LecturaPoliteiaPanel />  · panel IA reusable en cualquier tab con contexto estructurado
 *
 * Cobertura ideológica se funde dentro de Narrativas (la barra
 * left/center/right por narrativa + StoryClusters).
 *
 * Compatibilidad URLs antiguas: `migrateLegacyTab()` mapea ?tab=viralidad
 * a ?tab=narrativas, ?tab=analisis-ia a ?tab=pulso, etc.
 */

export type MediosTabId =
  | 'pulso'
  | 'busqueda'
  | 'narrativas'
  | 'actores'
  | 'mapas'
  | 'desinformacion'
  | 'informes'

// IDs históricos (10 tabs) · mantenemos para mapeo de URLs antiguas
export type LegacyMediosTabId =
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

const LEGACY_TO_NEW: Record<LegacyMediosTabId, MediosTabId> = {
  // mantienen ID parecido
  pulso: 'pulso',
  busqueda: 'busqueda',
  desinformacion: 'desinformacion',
  informes: 'informes',
  // fusiones según spec usuario
  viralidad: 'narrativas',              // capa transversal · home en narrativas
  'analisis-ia': 'pulso',               // capa transversal · home en pulso
  'cobertura-ideologica': 'narrativas', // dentro de narrativas
  'mapa-global': 'mapas',
  regional: 'mapas',
  'actores-sentimiento': 'actores',
}

export function migrateLegacyTab(id: string | null | undefined): MediosTabId {
  if (!id) return 'pulso'
  if ((MEDIOS_TAB_IDS as readonly string[]).includes(id)) return id as MediosTabId
  if (id in LEGACY_TO_NEW) return LEGACY_TO_NEW[id as LegacyMediosTabId]
  return 'pulso'
}

export interface MediosTab {
  id: MediosTabId
  number: number
  label: string
  shortLabel: string
  question: string                                          // pregunta que responde
  description: string
  themeAccent: string
  sources: { key: string; name: string; status: 'live' | 'planned' | 'optional'; endpoint?: string }[]
  icon?: string
}

export const MEDIOS_TABS: MediosTab[] = [
  {
    id: 'pulso',
    number: 1,
    label: 'Pulso',
    shortLabel: 'Pulso',
    question: '¿Qué está dominando ahora mismo la agenda?',
    description: 'Narrativas emergentes, feed por tiers, agenda topic × partido, historias que aceleran y Lectura IA del estado actual.',
    themeAccent: '#1F4E8C',
    sources: [
      { key: 'rss',     name: 'RSS · 219 medios ES+UE',  status: 'live', endpoint: '/api/medios/intel' },
      { key: 'narratives', name: 'NarrativeClusters (M2)', status: 'live' },
      { key: 'gdelt',   name: 'GDELT · global context',    status: 'live', endpoint: '/api/gdelt/articles' },
      { key: 'brain',   name: 'Lectura Politeia · IA',     status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'busqueda',
    number: 2,
    label: 'Búsqueda',
    shortLabel: 'Búsqueda',
    question: '¿Qué se ha publicado sobre X?',
    description: 'Investigación libre · NewsAPI everything con filtros ideológicos + dominios + fechas · timeline + picos · actores + narrativas + dossier export + Lectura IA.',
    themeAccent: '#DC2626',
    sources: [
      { key: 'newsapi',    name: 'NewsAPI · everything',           status: 'live', endpoint: '/api/medios/search' },
      { key: 'rss',        name: 'RSS · 219 medios',               status: 'live' },
      { key: 'gdelt',      name: 'GDELT · multilingüe global',     status: 'live' },
      { key: 'brain',      name: 'Lectura Politeia · IA',          status: 'live', endpoint: '/api/medios/lectura' },
    ],
    icon: '⊕',
  },
  {
    id: 'narrativas',
    number: 3,
    label: 'Narrativas & framing',
    shortLabel: 'Narrativas',
    question: '¿Qué narrativas existen, qué frame usan, qué bloque las amplifica?',
    description: 'NarrativeClusters auditables · barra ideológica izq/centro/der por narrativa · StoryClusters comparados · gaps de cobertura · velocity + acceleration · Lectura IA por narrativa.',
    themeAccent: '#7C3AED',
    sources: [
      { key: 'narratives', name: 'NarrativeClusters (M2)',           status: 'live', endpoint: '/api/medios/intel' },
      { key: 'rss',        name: 'RSS · story clusters por ideología', status: 'live' },
      { key: 'newsapi',    name: 'NewsAPI · domains filter',          status: 'live', endpoint: '/api/medios/search' },
      { key: 'brain',      name: 'Lectura Politeia · IA',             status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'actores',
    number: 4,
    label: 'Actores e impacto',
    shortLabel: 'Actores',
    question: '¿A quién afecta y cómo? menciones, sentimiento hacia actor, impacto político, rol narrativo, medios que amplifican.',
    description: 'No es sólo sentimiento · separa menciones · sentimiento HACIA actor · impacto político (beneficial/harmful/neutral/uncertain) con confianza y razón · rol narrativo · medios que amplifican · temas asociados.',
    themeAccent: '#0891B2',
    sources: [
      { key: 'figures_v2', name: 'figuresFromReadings (M2) · sentiment HACIA actor', status: 'live', endpoint: '/api/medios/intel' },
      { key: 'rss',        name: 'RSS · taxonomía actores',                          status: 'live' },
      { key: 'wikidata',   name: 'Wikidata · alias + cargos',                        status: 'live', endpoint: '/api/wikidata/search' },
      { key: 'gdelt',      name: 'GDELT · cobertura internacional',                  status: 'live' },
      { key: 'brain',      name: 'Lectura Politeia · IA',                            status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'mapas',
    number: 5,
    label: 'Mapas de impacto',
    shortLabel: 'Mapas',
    question: '¿Dónde impacta? España/CCAA + Global con narrative attribution.',
    description: 'Dos modos · ESPAÑA/CCAA separa CCAA del medio vs mencionada vs afectada con regional_signal_score · GLOBAL muestra país/evento con severidad + narrativa + relevancia ES + fuente + confianza.',
    themeAccent: '#10B981',
    sources: [
      { key: 'acled',  name: 'ACLED · eventos conflicto 30d',     status: 'live', endpoint: '/api/acled/by-country' },
      { key: 'gdelt',  name: 'GDELT · país 24h',                  status: 'live', endpoint: '/api/gdelt/articles' },
      { key: 'rss-regional', name: 'RSS · medios regionales CCAA', status: 'live', endpoint: '/api/medios/ccaa' },
      { key: 'eurostat', name: 'Eurostat · NUTS2 ES',             status: 'live', endpoint: '/api/eurostat/regions-nuts2' },
      { key: 'brain',  name: 'Lectura Politeia · IA por país/CCAA', status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'desinformacion',
    number: 6,
    label: 'Desinformación',
    shortLabel: 'Verificación',
    question: '¿Qué claims están verificados o son sospechosos?',
    description: 'Maldita + Newtral + EFE Verifica + Google Fact Check · cada claim con narrativa afectada + actores beneficiados/perjudicados + Lectura IA.',
    themeAccent: '#B91C1C',
    sources: [
      { key: 'rss-fc', name: 'RSS · Maldita, Newtral, EFE Verifica', status: 'live', endpoint: '/api/news/desinformacion' },
      { key: 'gfact',  name: 'Google Fact Check Tools API',          status: 'live', endpoint: '/api/factcheck/search' },
      { key: 'brain',  name: 'Lectura Politeia · IA',                status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'informes',
    number: 7,
    label: 'Informes & monitores',
    shortLabel: 'Informes',
    question: '¿Cómo exportar y monitorizar esta inteligencia?',
    description: 'Búsquedas guardadas · monitores · dossiers MD/HTML con metodología y advertencias · plantillas alertas · alertas por aceleración (viralidad transversal).',
    themeAccent: '#475569',
    sources: [
      { key: 'internal-saves', name: 'Monitores guardados (localStorage)',         status: 'live' },
      { key: 'dossier',        name: 'Dossier export · Markdown + HTML print',     status: 'live', endpoint: '/api/medios/dossier' },
      { key: 'brain',          name: 'Lectura Politeia · IA ejecutiva',            status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
]

export function getMediosTab(id: string | null | undefined): MediosTab {
  const migrated = migrateLegacyTab(id)
  return MEDIOS_TABS.find((t) => t.id === migrated) || MEDIOS_TABS[0]
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
