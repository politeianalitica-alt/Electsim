/**
 * Corpus de crisis geopolíticas históricas · Sprint G4.
 *
 * Catálogo curado de 30 crisis del periodo 1962-2024 con:
 *  - id, año, título
 *  - regiones afectadas
 *  - tipo de crisis (energy, military, migration, financial, narrative, etc.)
 *  - tags semánticos
 *  - outcome resumido + impact España estimado
 *  - duration_months
 *
 * Usado por `findAnalogs()` para pattern matching: dado un contexto
 * actual (tipos crisis + regiones + tags), devuelve las 5 crisis pasadas
 * más similares con score 0-100 + outcomes para forecasting.
 *
 * No requiere embeddings/ChromaDB: similarity basada en intersección de
 * tags + regiones + tipos · suficiente para 30 crisis. Para escalar a
 * miles, migrar a ChromaDB + nomic-embed-text en backend Python.
 */

export type CrisisType =
  | 'military'      // guerra abierta
  | 'cold_war'      // tensión militar sin guerra
  | 'energy'        // shock energético
  | 'financial'     // crisis financiera
  | 'migration'     // crisis migratoria
  | 'sanctions'     // régimen sanciones
  | 'narrative'     // crisis narrativa/influencia
  | 'terrorism'     // ataque terrorista
  | 'sovereignty'   // disputa soberanía
  | 'pandemic'      // sanitaria

export interface HistoricalCrisis {
  id: string
  year: number
  title: string
  regions: string[]
  type: CrisisType
  tags: string[]
  duration_months: number
  outcome: string
  spain_impact: 'none' | 'low' | 'medium' | 'high' | 'critical'
  fatalities_estimate?: string
  url?: string
}

export const HISTORICAL_CRISES: HistoricalCrisis[] = [
  {
    id: 'cuba-1962',
    year: 1962,
    title: 'Crisis de los misiles de Cuba',
    regions: ['Caribe', 'USA', 'URSS'],
    type: 'cold_war',
    tags: ['nuclear', 'naval-blockade', 'bilateral', 'caribbean'],
    duration_months: 1,
    outcome: 'Retirada misiles soviéticos Cuba + retirada USA Jupiter Türkiye. Hotline establecido. Sin guerra.',
    spain_impact: 'low',
    fatalities_estimate: '0',
    url: 'https://www.britannica.com/event/Cuban-missile-crisis',
  },
  {
    id: 'yom-kippur-1973',
    year: 1973,
    title: 'Guerra del Yom Kippur + shock petróleo OPEP',
    regions: ['Oriente Medio', 'Israel', 'Egipto', 'Siria'],
    type: 'energy',
    tags: ['oil-embargo', 'arab-israeli', 'opec', 'stagflation'],
    duration_months: 6,
    outcome: 'Embargo OPEP 1973-74 cuadruplicó precio crudo. Recesión global + inflación. Iberoamérica sufrió moderado.',
    spain_impact: 'high',
    fatalities_estimate: '20.000+',
  },
  {
    id: 'iran-1979',
    year: 1979,
    title: 'Revolución islámica Irán + crisis rehenes',
    regions: ['Oriente Medio', 'Irán', 'USA'],
    type: 'sovereignty',
    tags: ['regime-change', 'hostages', 'oil', 'sanctions'],
    duration_months: 14,
    outcome: 'Caída del Shah. Embargo USA. Iran-Iraq war 1980-88. Segundo shock petróleo.',
    spain_impact: 'medium',
    fatalities_estimate: '500+',
  },
  {
    id: 'falklands-1982',
    year: 1982,
    title: 'Guerra de Malvinas Argentina-UK',
    regions: ['Atlántico Sur', 'Argentina', 'Reino Unido'],
    type: 'sovereignty',
    tags: ['naval', 'islands', 'colonial', 'south-atlantic'],
    duration_months: 3,
    outcome: 'Victoria UK. Caída junta militar argentina → transición democrática. Refuerzo Thatcher.',
    spain_impact: 'low',
    fatalities_estimate: '900+',
  },
  {
    id: 'gulf-1990',
    year: 1990,
    title: 'Invasión Iraq de Kuwait + Operación Tormenta del Desierto',
    regions: ['Oriente Medio', 'Iraq', 'Kuwait', 'USA', 'Coalición ONU'],
    type: 'military',
    tags: ['oil', 'invasion', 'un-mandate', 'coalition'],
    duration_months: 7,
    outcome: 'Coalición ONU liberó Kuwait. Sanciones Iraq 1990-2003. España envió tropas (~hospital militar).',
    spain_impact: 'medium',
    fatalities_estimate: '50.000+',
  },
  {
    id: 'kosovo-1999',
    year: 1999,
    title: 'Guerra de Kosovo + bombardeos OTAN Serbia',
    regions: ['Balcanes', 'Serbia', 'Kosovo', 'OTAN'],
    type: 'military',
    tags: ['ethnic-cleansing', 'nato-intervention', 'balkans', 'humanitarian'],
    duration_months: 3,
    outcome: 'Retirada serbia. Protectorado UN Kosovo. Independencia 2008 (reconocida por ~100 países, no España).',
    spain_impact: 'medium',
    fatalities_estimate: '13.000+',
  },
  {
    id: '9-11-2001',
    year: 2001,
    title: 'Ataques 11-S + invasión Afganistán',
    regions: ['USA', 'Afganistán', 'OTAN'],
    type: 'terrorism',
    tags: ['terrorism', 'al-qaeda', 'invasion', 'global-war-on-terror'],
    duration_months: 240,
    outcome: '20 años guerra Afganistán. Patriot Act. Cambio paradigma seguridad. España envió tropas (ISAF).',
    spain_impact: 'high',
    fatalities_estimate: '170.000+',
  },
  {
    id: 'iraq-2003',
    year: 2003,
    title: 'Invasión Iraq por coalición USA-UK (España incluida)',
    regions: ['Iraq', 'USA', 'UK', 'España'],
    type: 'military',
    tags: ['invasion', 'wmd', 'aznar', 'foto-azores', 'controversia'],
    duration_months: 100,
    outcome: 'Caída Hussein. Insurgencia + ISIS. España retiró tropas en 2004 tras 11-M y triunfo PSOE.',
    spain_impact: 'critical',
    fatalities_estimate: '500.000+',
  },
  {
    id: 'madrid-2004',
    year: 2004,
    title: '11-M atentados Atocha',
    regions: ['España', 'Madrid'],
    type: 'terrorism',
    tags: ['terrorism', 'al-qaeda', 'jihadism', 'national'],
    duration_months: 1,
    outcome: '192 muertos · cambio gobierno PP→PSOE · retirada Iraq. Pacto antiterrorista 2004.',
    spain_impact: 'critical',
    fatalities_estimate: '192',
  },
  {
    id: 'georgia-2008',
    year: 2008,
    title: 'Guerra Georgia-Rusia (Osetia del Sur)',
    regions: ['Cáucaso', 'Georgia', 'Rusia'],
    type: 'military',
    tags: ['frozen-conflict', 'putin', 'breakaway-republic', 'nato-expansion'],
    duration_months: 1,
    outcome: 'Rusia reconoció Osetia del Sur + Abjasia. Señal expansionismo ruso. Preludio Crimea.',
    spain_impact: 'low',
    fatalities_estimate: '850+',
  },
  {
    id: 'gfc-2008',
    year: 2008,
    title: 'Crisis financiera global (Lehman) + Gran Recesión',
    regions: ['Global', 'USA', 'UE'],
    type: 'financial',
    tags: ['banking', 'sovereign-debt', 'austerity', 'eurozone'],
    duration_months: 60,
    outcome: 'Rescate Sareb España 2012. Memorando UE-FMI España junio 2012. Paro España 26% pico 2013.',
    spain_impact: 'critical',
    fatalities_estimate: '0',
  },
  {
    id: 'arab-spring-2011',
    year: 2011,
    title: 'Primavera Árabe (Túnez, Egipto, Libia, Siria, Yemen)',
    regions: ['Norte de África', 'Oriente Medio'],
    type: 'sovereignty',
    tags: ['revolution', 'regime-change', 'civil-war', 'migration-trigger'],
    duration_months: 60,
    outcome: 'Caídas Ben Ali Mubarak Gaddafi. Guerra civil Siria + Libia + Yemen. Crisis migratoria UE 2015.',
    spain_impact: 'high',
    fatalities_estimate: '600.000+',
  },
  {
    id: 'crimea-2014',
    year: 2014,
    title: 'Anexión Crimea + guerra Donbás',
    regions: ['Ucrania', 'Rusia', 'UE', 'OTAN'],
    type: 'military',
    tags: ['annexation', 'putin', 'sanctions', 'hybrid-warfare'],
    duration_months: 100,
    outcome: 'Sanciones UE+USA contra Rusia. Acuerdos Minsk fallidos. Preludio invasión 2022.',
    spain_impact: 'medium',
    fatalities_estimate: '14.000+',
  },
  {
    id: 'migration-2015',
    year: 2015,
    title: 'Crisis migratoria europea (ruta balcánica)',
    regions: ['UE', 'Siria', 'Turquía', 'Balcanes'],
    type: 'migration',
    tags: ['refugees', 'syria-war', 'schengen', 'merkel', 'frontex'],
    duration_months: 18,
    outcome: '1.3M solicitantes asilo UE 2015. Acuerdo UE-Turquía 2016. Brexit catalyst. Vox+populismo subida.',
    spain_impact: 'medium',
    fatalities_estimate: '3.700+ (Mediterráneo)',
  },
  {
    id: 'brexit-2016',
    year: 2016,
    title: 'Referéndum Brexit + Trump',
    regions: ['Reino Unido', 'UE', 'USA'],
    type: 'narrative',
    tags: ['populism', 'misinformation', 'social-media', 'election'],
    duration_months: 48,
    outcome: 'UK abandonó UE en 2020. Trump 2017-21. Auge populismo. Fragmentación occidental.',
    spain_impact: 'high',
    fatalities_estimate: '0',
  },
  {
    id: 'cataluna-2017',
    year: 2017,
    title: 'Crisis Cataluña 1-O + DUI',
    regions: ['España', 'Cataluña'],
    type: 'sovereignty',
    tags: ['secession', 'constitutional-crisis', '155', 'national'],
    duration_months: 6,
    outcome: 'Aplicación 155. Elecciones autonómicas. Líderes en prisión o exilio. Impacto turismo + economía.',
    spain_impact: 'critical',
    fatalities_estimate: '0',
  },
  {
    id: 'covid-2020',
    year: 2020,
    title: 'Pandemia COVID-19',
    regions: ['Global'],
    type: 'pandemic',
    tags: ['health', 'lockdown', 'supply-chain', 'fiscal-stimulus'],
    duration_months: 36,
    outcome: 'NextGenerationEU 750B€. 120k muertes España. PIB -10.8% 2020. Cambio modelo trabajo + supply chains.',
    spain_impact: 'critical',
    fatalities_estimate: '7M+ globalmente',
  },
  {
    id: 'afghan-2021',
    year: 2021,
    title: 'Caída Kabul + retorno talibán',
    regions: ['Afganistán', 'USA', 'OTAN'],
    type: 'military',
    tags: ['withdrawal', 'taliban', 'evacuation', 'failure'],
    duration_months: 1,
    outcome: 'OTAN retiró tropas. España evacuó ~2.000 personas. Imagen OTAN dañada. Preludio confianza.',
    spain_impact: 'medium',
    fatalities_estimate: '180+ (Kabul airport)',
  },
  {
    id: 'ukraine-2022',
    year: 2022,
    title: 'Invasión Rusia a Ucrania + shock energético',
    regions: ['Ucrania', 'Rusia', 'UE', 'OTAN'],
    type: 'military',
    tags: ['invasion', 'sanctions', 'energy-crisis', 'gas-cutoff', 'nato'],
    duration_months: 48,
    outcome: 'En curso. Sanciones masivas Rusia. Gas TTF pico 350€/MWh. España = principal hub LNG europeo.',
    spain_impact: 'high',
    fatalities_estimate: '500.000+',
  },
  {
    id: 'hamas-oct7-2023',
    year: 2023,
    title: 'Ataque Hamas 7-O + guerra Gaza',
    regions: ['Israel', 'Palestina', 'Líbano'],
    type: 'military',
    tags: ['hamas', 'gaza', 'humanitarian', 'red-sea-houthis'],
    duration_months: 24,
    outcome: 'En curso. 1.200 muertos israelíes 7-O + 50.000+ palestinos. Houthis Mar Rojo. Suez interrumpido.',
    spain_impact: 'medium',
    fatalities_estimate: '50.000+',
  },
  {
    id: 'canarias-2024',
    year: 2024,
    title: 'Crisis migratoria atlántica Canarias récord',
    regions: ['España', 'Canarias', 'Mauritania', 'Senegal', 'Mali'],
    type: 'migration',
    tags: ['canarias', 'mauritania', 'senegal', 'cayucos', 'minors'],
    duration_months: 18,
    outcome: 'En curso. 46.000+ llegadas 2024 (récord histórico). Tensión Mauritania. Plan reparto CCAA.',
    spain_impact: 'critical',
    fatalities_estimate: '6.000+ desaparecidos',
  },
  {
    id: 'trump2-2025',
    year: 2025,
    title: 'Trump 2.0 aranceles UE + retirada compromisos OTAN',
    regions: ['USA', 'UE', 'OTAN'],
    type: 'sanctions',
    tags: ['tariffs', 'trump', 'transatlantic', 'rearmament'],
    duration_months: 12,
    outcome: 'En curso. Aranceles 10-25% UE. UE plan rearme 800B€. España target 2% PIB defensa.',
    spain_impact: 'high',
    fatalities_estimate: '0',
  },
]

interface SimilarityContext {
  types?: CrisisType[]
  regions?: string[]
  tags?: string[]
}

/**
 * Score 0-100 de similitud entre una crisis pasada y un contexto actual.
 * Algoritmo: Jaccard intersection sobre regions+tags + 30 pts si type match.
 * No requiere embeddings · suficiente para 30 crisis curadas.
 */
export function scoreSimilarity(crisis: HistoricalCrisis, ctx: SimilarityContext): number {
  let score = 0
  // Tipo de crisis match → +30 pts
  if (ctx.types && ctx.types.includes(crisis.type)) score += 30
  // Region overlap → +5 pts por región coincidente, max +30
  if (ctx.regions && ctx.regions.length > 0) {
    const regionLower = crisis.regions.map((r) => r.toLowerCase())
    const matches = ctx.regions.filter((r) => regionLower.some((cr) => cr.includes(r.toLowerCase()) || r.toLowerCase().includes(cr))).length
    score += Math.min(30, matches * 8)
  }
  // Tag overlap (Jaccard) → +5 pts por tag coincidente, max +40
  if (ctx.tags && ctx.tags.length > 0) {
    const tagsLower = crisis.tags.map((t) => t.toLowerCase())
    const matches = ctx.tags.filter((t) => tagsLower.includes(t.toLowerCase())).length
    score += Math.min(40, matches * 8)
  }
  return Math.min(100, score)
}

export function findAnalogs(ctx: SimilarityContext, topN = 5): Array<HistoricalCrisis & { similarity: number }> {
  return HISTORICAL_CRISES
    .map((c) => ({ ...c, similarity: scoreSimilarity(c, ctx) }))
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
}
