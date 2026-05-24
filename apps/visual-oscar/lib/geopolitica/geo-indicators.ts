/**
 * Catálogo de indicadores geo-OSINT estructurados · Sprint G1.
 *
 * Replica el patrón de `lib/macro/pulso-indicators.ts` para la tab OSINT
 * de `/geopolitica`. Cada indicador declara:
 *   - id estable (kebab-case)
 *   - familia (seguridad · osint · sanciones · presencia · riesgo · sentimiento)
 *   - métrica + unidad + frecuencia + fuente
 *   - methodologyNote · releaseSchedule · confidenceLevel · relatedIndicatorIds
 *   - endpoint local que devuelve el snapshot/serie
 *   - parser para extraer el valor del JSON variable
 *
 * Diseñado para mostrarse en `<GeoKpiGrid>` con MethodologyTooltip
 * reutilizado de la parte de Economía (mismo componente lightweight).
 */

export type GeoFamily =
  | 'seguridad'
  | 'osint'
  | 'sanciones'
  | 'presencia'
  | 'riesgo'
  | 'sentimiento'
  | 'narrativa'

export interface GeoIndicatorMeta {
  id: string
  family: GeoFamily
  label: string
  shortLabel?: string
  unit: string
  decimals: number
  source: string
  sourceCode: string
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'snapshot'
  description: string
  endpoint: string
  /**
   * Estrategia de extracción del valor del JSON del endpoint:
   *  - 'geo-stats-field' · campo del JSON /api/geopolitica/stats (parserKey = nombre del campo)
   *  - 'geo-list-count'  · cuenta de elementos en data[] del endpoint
   *  - 'geo-list-mean'   · media de un campo numérico en data[] (parserKey = nombre campo)
   *  - 'acled-count'     · cuenta de eventos ACLED del último periodo (parserKey opcional: country)
   *  - 'gdelt-tone'      · valor `tone` del último snapshot GDELT
   *  - 'static-snapshot' · valor curado (parserKey = clave del objeto snapshot)
   */
  parser:
    | 'geo-stats-field'
    | 'geo-list-count'
    | 'geo-list-mean'
    | 'acled-count'
    | 'gdelt-tone'
    | 'static-snapshot'
  parserKey?: string
  threshold?: {
    amber?: number
    red?: number
    goodAbove?: boolean
  }
  accent: string
  /** Nota metodológica analista — 1-3 frases, sale en tooltip + drill. */
  methodologyNote?: string
  /** Cadencia legible del release ("Diario · T+6h", "Semanal · lunes"). */
  releaseSchedule?: string
  confidenceLevel?: 'high' | 'medium' | 'low'
  relatedIndicatorIds?: string[]
}

export const GEO_INDICATORS: GeoIndicatorMeta[] = [
  // ─── Familia OSINT (volumen + cobertura) ─────────────────────────────
  {
    id: 'geo-osint-volume-24h',
    family: 'osint',
    label: 'Volumen items OSINT últimas 24h',
    shortLabel: 'OSINT 24h',
    unit: ' items',
    decimals: 0,
    source: 'Politeia · feeds RSS agregados (40 fuentes)',
    sourceCode: 'GEO_STATS_OSINT_24H',
    frequency: 'realtime',
    description:
      'Número de noticias OSINT geo-relevantes detectadas en las últimas 24 horas. Pico sostenido >40 items suele coincidir con crisis activa.',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'osint_24h',
    threshold: { amber: 40, red: 70, goodAbove: false },
    accent: '#0EA5E9',
    methodologyNote:
      'Items extraídos vía news-aggregator: RSS de 40 medios ES/UE/global con scoring NLP geo-relevancia. Falsos positivos posibles en titulares ambiguos (deportes, gastronomía con keywords geo). Cache 5 min.',
    releaseSchedule: 'Tiempo real · refresh 5 min',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['geo-alertas-activas', 'geo-articulos-24h', 'geo-gdelt-tone'],
  },
  {
    id: 'geo-articulos-24h',
    family: 'osint',
    label: 'Artículos totales agregados 24h',
    shortLabel: 'Artículos 24h',
    unit: '',
    decimals: 0,
    source: 'Politeia · news-aggregator',
    sourceCode: 'GEO_STATS_TOTAL_24H',
    frequency: 'realtime',
    description:
      'Pool total de artículos RSS agregados (antes de filtrar por geo-relevancia). Indicador de cobertura mediática general.',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'total_articulos',
    accent: '#0EA5E9',
    methodologyNote:
      'Pool RSS sin filtro temático. Sirve como denominador: ratio osint_24h/total_articulos da intensidad geo del news cycle.',
    releaseSchedule: 'Tiempo real · refresh 5 min',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['geo-osint-volume-24h'],
  },

  // ─── Familia Alertas (criticidad + breakdown) ────────────────────────
  {
    id: 'geo-alertas-activas',
    family: 'seguridad',
    label: 'Alertas geopolíticas activas',
    shortLabel: 'Alertas',
    unit: '',
    decimals: 0,
    source: 'Politeia geo-signals · backend + RSS',
    sourceCode: 'GEO_STATS_ALERTAS',
    frequency: 'realtime',
    description:
      'Total alertas geopolíticas activas (CRITICO+ALTO+MEDIO+BAJO) en backend Politeia + derivadas del news-aggregator últimas 72h.',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'alertas_activas',
    threshold: { amber: 8, red: 15, goodAbove: false },
    accent: '#dc2626',
    methodologyNote:
      'Combinación de alertas reglas geo-signal-engine (10 reglas críticas: migración, energía, sanciones, conflicto, etc.) + alertas derivadas RSS via geoAlertasFromArticles. Counter agregado de los 4 niveles.',
    releaseSchedule: 'Tiempo real · refresh 5 min',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['geo-alertas-criticas', 'geo-osint-volume-24h'],
  },
  {
    id: 'geo-alertas-criticas',
    family: 'seguridad',
    label: 'Alertas CRITICO últimas 72h',
    shortLabel: 'Críticas',
    unit: '',
    decimals: 0,
    source: 'Politeia geo-signals · nivel CRITICO',
    sourceCode: 'GEO_STATS_ALERTAS_CRITICO',
    frequency: 'realtime',
    description:
      'Subset de alertas con nivel CRITICO. Driver inmediato de atención analista — cada una con potencial impacto España >100k personas o >1.000M€.',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'alertas_count.CRITICO',
    threshold: { amber: 1, red: 3, goodAbove: false },
    accent: '#dc2626',
    methodologyNote:
      'Reglas escalado CRITICO: crisis migratoria masiva (>500 llegadas/día), shock energético (>20% precio TTF semanal), sanciones nuevas contra socios top-10, conflicto armado nuevo o escalado en países con embajada ES, ataque ciber DDoS infraestructura crítica.',
    releaseSchedule: 'Tiempo real · refresh 5 min',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['geo-alertas-activas'],
  },

  // ─── Familia ACLED (conflict events) ─────────────────────────────────
  {
    id: 'geo-acled-events-30d',
    family: 'seguridad',
    label: 'Eventos ACLED relevantes para España 30d',
    shortLabel: 'ACLED 30d',
    unit: '',
    decimals: 0,
    source: 'ACLED · spain-context',
    sourceCode: 'ACLED_SPAIN_CTX_30D',
    frequency: 'weekly',
    description:
      'Eventos violentos (battles + violence against civilians + protests + riots) en países de relevancia directa para España (Marruecos, Argelia, Mali, Senegal, Ucrania, Venezuela). Refleja entorno security regional.',
    endpoint: '/api/acled/spain-context',
    parser: 'geo-list-count',
    parserKey: 'data',
    threshold: { amber: 200, red: 400, goodAbove: false },
    accent: '#7c3aed',
    methodologyNote:
      'Cobertura ACLED desde Sahel + Mediterráneo + LatAm + Ucrania (~12 países). Sub-evento types: battles, protests, riots, violence against civilians, strategic developments. Cache 24h por coste API. Excluye reportes duplicados.',
    releaseSchedule: 'Semanal · ACLED publica viernes (cache 24h)',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['geo-osint-volume-24h', 'geo-alertas-criticas'],
  },

  // ─── Familia Riesgo (scoring agregado) ────────────────────────────────
  {
    id: 'geo-riesgo-paises',
    family: 'riesgo',
    label: 'Países con riesgo monitorizado',
    shortLabel: 'Países',
    unit: '',
    decimals: 0,
    source: 'Politeia geo-risk · agregado',
    sourceCode: 'GEO_STATS_PAISES',
    frequency: 'daily',
    description:
      'Número de países con riesgo geopolítico activamente monitorizado por Politeia. Cobertura típica ~50 países (UE-27 + LatAm + Sahel + Oriente Medio + USA + China).',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'paises_monitorizados',
    accent: '#0F766E',
    methodologyNote:
      'Países donde Politeia mantiene scoring riesgo activo (combo ACLED + GDELT + UCDP + WorldBank + sanciones). Coverage definida por interés España: socios comerciales, países de origen migración, conflicto activo cerca, miembros OTAN/UE.',
    releaseSchedule: 'Daily · refresh nocturno',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['geo-presencia-activa'],
  },
  {
    id: 'geo-presencia-activa',
    family: 'presencia',
    label: 'Presencia diplomática España activa',
    shortLabel: 'Presencia',
    unit: '',
    decimals: 0,
    source: 'Politeia · presencia estructural',
    sourceCode: 'GEO_STATS_PRESENCIA',
    frequency: 'monthly',
    description:
      'Países donde España mantiene presencia diplomática + AECID + militar activa. Estructural ~12 países top (Marruecos, Mali, Líbano, Senegal, Mauritania, Honduras, México, Colombia, Argentina, Filipinas, Cuba, Italia).',
    endpoint: '/api/geopolitica/stats',
    parser: 'geo-stats-field',
    parserKey: 'presencia_activa',
    accent: '#0F766E',
    methodologyNote:
      'Valor estructural · refleja presencia diplomática + militar + AECID + Cervantes top-12. Para listado completo embajadas: 119 países con embajada residente. Aquí solo "activos" relevantes monitor crisis.',
    releaseSchedule: 'Mensual · revisión MAUC',
    confidenceLevel: 'low',
    relatedIndicatorIds: ['geo-riesgo-paises'],
  },

  // ─── Familia GDELT (tone + signals) ───────────────────────────────────
  {
    id: 'geo-gdelt-tone',
    family: 'sentimiento',
    label: 'GDELT tone España últimos 7d',
    shortLabel: 'GDELT tone',
    unit: '',
    decimals: 2,
    source: 'GDELT v2 · doc tone',
    sourceCode: 'GDELT_TONE_ES',
    frequency: 'daily',
    description:
      'Tone medio (-10 a +10) de noticias en GDELT sobre España últimos 7 días. Valores negativos sostenidos coinciden con cobertura crisis. Tone -3 o menor = pico medios alarma.',
    endpoint: '/api/gdelt/tone?query=Spain&days=7',
    parser: 'gdelt-tone',
    threshold: { amber: -1, red: -3, goodAbove: true },
    accent: '#8b5cf6',
    methodologyNote:
      'GDELT 2.0 DOC v2 API. Tone = (positive_score - negative_score) por documento agregado. Sesgo: GDELT pondera fuentes anglosajonas — tone España puede no reflejar percepción doméstica. Útil para soft power exterior.',
    releaseSchedule: 'Daily · GDELT actualiza cada 15 min, cache 1h',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['geo-osint-volume-24h', 'geo-articulos-24h'],
  },
];

export const GEO_FAMILY_META: Record<GeoFamily, { label: string; description: string; color: string }> = {
  osint: { label: 'OSINT cobertura', description: 'Volumen + agregación de fuentes abiertas', color: '#0EA5E9' },
  seguridad: { label: 'Alertas + seguridad', description: 'Alertas geopolíticas + eventos ACLED', color: '#dc2626' },
  sanciones: { label: 'Sanciones', description: 'OFAC + EU + UN designations', color: '#f59e0b' },
  presencia: { label: 'Presencia España', description: 'Diplomacia + militar + cultural', color: '#0F766E' },
  riesgo: { label: 'Riesgo agregado', description: 'Scoring país-nivel cross-source', color: '#7c3aed' },
  sentimiento: { label: 'Sentimiento medios', description: 'GDELT tone + sentiment', color: '#8b5cf6' },
  narrativa: { label: 'Narrativas activas', description: 'Tracking narrativas anti/pro España', color: '#a855f7' },
}

export function getGeoIndicator(id: string): GeoIndicatorMeta | undefined {
  return GEO_INDICATORS.find((i) => i.id === id)
}

export function geoIndicatorsByFamily(): Record<GeoFamily, GeoIndicatorMeta[]> {
  const acc: Partial<Record<GeoFamily, GeoIndicatorMeta[]>> = {}
  for (const ind of GEO_INDICATORS) {
    if (!acc[ind.family]) acc[ind.family] = []
    acc[ind.family]!.push(ind)
  }
  return acc as Record<GeoFamily, GeoIndicatorMeta[]>
}
