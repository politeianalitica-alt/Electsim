/**
 * Matriz de fuentes utilizadas por cada tab de /prensa (Medios).
 *
 * Sprint G15 · refactor: dashboard de inteligencia mediática real,
 * no colección de módulos apilados. 6 tabs como flujo analítico:
 *
 *   1. Pulso de prensa             · qué está dominando AHORA la agenda
 *   2. Búsqueda                    · qué se ha publicado sobre X
 *   3. Narrativas & framing        · qué narrativas se forman y cómo se encuadran
 *   4. Tendencias e impacto        · qué figuras/partidos/empresas/sectores/países salen más impactados (NO sólo sentimiento)
 *   5. Mapas de impacto            · dónde impacta la agenda · España+provincias+mundo
 *   6. Mapa de medios              · catálogo + territorio + grupo + ideología + RSS
 *
 * El antiguo tab "Observatorio de Información" se eliminó de /prensa: su función
 * (verificaciones, bulos, fact-check) vive en la entrada de menú
 * Desinformación → /desinformacion. Los aliases legacy se remapean a 'pulso'.
 *
 * Cambios vs Sprint M3:
 *   - Actores → Tendencias (con beneficial/harmful/neutral/uncertain por actor, no solo sentimiento)
 *   - Desinformación → Observatorio de Información (verificaciones + operaciones + conexión narrativas)
 *   - Informes & monitores → Mapa de medios (catálogo filtrable + concentración + ficha medio)
 *   - Narrativas se rehace como workbench único · no más apilamiento de 7 módulos
 *
 * Capas transversales (sin tab propia):
 *   - <ViralidadStrip />        · slice "historias que aceleran" donde tenga sentido
 *   - <LecturaPoliteiaPanel />  · panel IA reusable
 *
 * Compatibilidad URLs antiguas: `migrateLegacyTab()` mantiene los aliases
 * para que enlaces guardados sigan funcionando (actores→tendencias, etc.).
 */

export type MediosTabId =
  | 'pulso'
  | 'busqueda'
  | 'narrativas'
  | 'tendencias'                // Sprint G15 · reemplaza 'actores'
  | 'mapas'
  | 'mapa-medios'               // Sprint G15 · reemplaza 'informes'

// IDs históricos · mantenemos para mapeo de URLs antiguas
export type LegacyMediosTabId =
  | 'pulso'
  | 'busqueda'
  | 'mapa-global'
  | 'actores'                   // Sprint M3
  | 'actores-sentimiento'       // pre-M3
  | 'cobertura-ideologica'
  | 'viralidad'
  | 'analisis-ia'
  | 'desinformacion'            // Sprint M3
  | 'observatorio-informacion'  // Sprint G15 · tab eliminado · legacy → pulso
  | 'regional'
  | 'informes'                  // Sprint M3

const LEGACY_TO_NEW: Record<LegacyMediosTabId, MediosTabId> = {
  // mantienen ID
  pulso: 'pulso',
  busqueda: 'busqueda',
  // Sprint G15 · renames
  actores: 'tendencias',
  'actores-sentimiento': 'tendencias',
  // Observatorio de Información eliminado de /prensa · su función vive en la
  // entrada de menú Desinformación → /desinformacion. Aliases → pulso.
  desinformacion: 'pulso',
  'observatorio-informacion': 'pulso',
  informes: 'mapa-medios',
  // fusiones Sprint M3 mantenidas
  viralidad: 'narrativas',              // capa transversal · home en narrativas
  'analisis-ia': 'pulso',               // capa transversal · home en pulso
  'cobertura-ideologica': 'narrativas', // dentro de narrativas
  'mapa-global': 'mapas',
  regional: 'mapas',
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
    label: 'Prensa',
    shortLabel: 'Prensa',
    question: '¿Qué está dominando ahora mismo la agenda?',
    description: 'Primera lectura · gráfico de importancia temática (tags reales + heurística), feed por tiers, KPIs y señales emergentes. Lectura IA opcional.',
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
    question: '¿Qué narrativas se están formando y cómo se encuadran?',
    description: 'Workbench único · cada narrativa es topic + frame + mensaje repetido + actores + medios/canales + ventana temporal + evidencia suficiente. NO un tema, NO un frame suelto. Mínimo 3 artículos en ≥2 medios y al menos una señal fuerte (actor / institución / partido / empresa / territorio).',
    themeAccent: '#7C3AED',
    sources: [
      { key: 'narratives', name: 'NarrativeClusters (M2)',           status: 'live', endpoint: '/api/medios/intel' },
      { key: 'rss',        name: 'RSS · story clusters por ideología', status: 'live' },
      { key: 'newsapi',    name: 'NewsAPI · domains filter',          status: 'live', endpoint: '/api/medios/search' },
      { key: 'brain',      name: 'Lectura Politeia · IA',             status: 'live', endpoint: '/api/medios/lectura' },
    ],
  },
  {
    id: 'tendencias',
    number: 4,
    label: 'Tendencias e impacto',
    shortLabel: 'Tendencias',
    question: '¿Qué figuras, partidos, empresas, sectores o países salen más impactados y cómo?',
    description: 'NO sólo sentimiento · impacto político/comunicativo con beneficial/harmful/neutral/uncertain por figura, partido, empresa, sector y país. Frames asociados, temas que arrastran y medios que más los mencionan. Cada actor con botón "Crear dossier".',
    themeAccent: '#0891B2',
    sources: [
      { key: 'figures_v2',   name: 'figuresFromReadings (M2) · impact HACIA actor', status: 'live', endpoint: '/api/medios/intel' },
      { key: 'actor_impacts',name: 'actor_impacts · benef/harm/neutral/uncertain',  status: 'live' },
      { key: 'companies',    name: 'companies · empresas tracked',                  status: 'live' },
      { key: 'sectors',      name: 'sectors · sectores en tensión',                 status: 'live' },
      { key: 'wikidata',     name: 'Wikidata · alias + cargos',                     status: 'live', endpoint: '/api/wikidata/search' },
      { key: 'gdelt',        name: 'GDELT · cobertura internacional países',        status: 'live' },
      { key: 'dossier',      name: 'Dossier export por actor',                      status: 'live', endpoint: '/api/medios/dossier' },
    ],
  },
  {
    id: 'mapas',
    number: 5,
    label: 'Mapas de impacto',
    shortLabel: 'Mapas',
    question: '¿Dónde impacta la agenda mediática?',
    description: 'España por CCAA + provincias + mundo. Tres lentes separadas: territorio del medio · territorio mencionado · territorio afectado. Cuota local en el agregador para que los grandes nacionales no tapen la realidad provincial.',
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
    id: 'mapa-medios',
    number: 6,
    label: 'Mapa de medios',
    shortLabel: 'Mapa medios',
    question: '¿Qué medios componen el ecosistema informativo y dónde están?',
    description: 'Catálogo filtrable por tipo, ámbito, CCAA, provincia, grupo, ideología, RSS, credibilidad y audiencia. Mapa España + concentración por grupo editorial + gaps de cobertura provincial + ficha de cada medio.',
    themeAccent: '#475569',
    sources: [
      { key: 'catalog',   name: 'Catálogo medios.json (219 ES) + medios-europeos.json (16)', status: 'live', endpoint: '/api/medios' },
      { key: 'overlay',   name: 'medios-locales.json overlay · provincia + scope_level',     status: 'live' },
      { key: 'rss-health',name: 'RSS health-check por medio',                                status: 'planned' },
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
