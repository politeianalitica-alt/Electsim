/**
 * Dataset · CFR Global Conflict Tracker.
 *
 * Sprint G24 · usuario pidió "CFR Global Conflict Tracker — scrapeable con
 * BeautifulSoup". Curado manual desde cfr.org/global-conflict-tracker (HTML
 * estático). Para refrescar: scraping mensual o consultar API alternativa.
 *
 * Categorías CFR:
 *   - Worsening · empeoramiento últimos 90d
 *   - Critical · pérdida control + escalada
 *   - Unchanging · status quo
 *   - Improving · diálogo/cesefuego activo
 */

export type CfrCategory = 'critical' | 'worsening' | 'unchanging' | 'improving'
export type CfrImpactUS = 'critical' | 'significant' | 'limited'

export interface CfrConflict {
  id: string
  name: string
  region: string
  category: CfrCategory
  /** Impacto sobre intereses EE.UU. (proxy para Europa) */
  us_impact: CfrImpactUS
  /** Fecha inicio conflicto */
  since: string
  /** ISO3 países implicados */
  countries_iso3: string[]
  /** Resumen ejecutivo */
  summary: string
  /** Desarrollos recientes */
  recent_developments: string
  /** Implicaciones para Europa/España */
  europe_implications: string
  /** Actores armados clave */
  key_actors: string[]
  /** Fatalidades estimadas total */
  estimated_fatalities: string
  /** URL CFR */
  cfr_url: string
}

export const CFR_CONFLICTS: CfrConflict[] = [
  {
    id: 'war-ukraine',
    name: 'War in Ukraine',
    region: 'Europe',
    category: 'critical',
    us_impact: 'critical',
    since: '2022-02-24',
    countries_iso3: ['UKR', 'RUS', 'BLR'],
    summary: 'Invasión rusa a gran escala contra Ucrania. Mayor conflicto interestatal en Europa desde WWII.',
    recent_developments: 'Trump 2.0 condiciona apoyo Ucrania · negociaciones Riad EE.UU-Rusia · Putin rechaza alto el fuego incondicional · ofensiva Kursk · ataques drones intensificados a infraestructura crítica.',
    europe_implications: 'OTAN refuerza flanco oriental. España aporta misión EUMAM + Patriot Eslovaquia + €1.3bn ayuda anual. Presión EU para autonomía estratégica defensa post-Trump.',
    key_actors: ['Russia (Putin)', 'Ukraine (Zelensky)', 'NATO', 'Belarus (Lukashenko)'],
    estimated_fatalities: '500K+ bajas militares acumuladas · 12K+ civiles · 3.7M desplazados internos · 6.5M refugiados externos',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/war-ukraine',
  },
  {
    id: 'israel-palestinian-conflict',
    name: 'Israeli-Palestinian Conflict',
    region: 'Middle East',
    category: 'critical',
    us_impact: 'critical',
    since: '2023-10-07',
    countries_iso3: ['ISR', 'PSE'],
    summary: 'Guerra Gaza tras ataque Hamás 7-O · operación Israel "Espadas de Hierro" + escalada West Bank settlers.',
    recent_developments: 'CPI orden detención Netanyahu nov-2024 · operación militar Líbano contra Hezbolá oct-2024 · alto el fuego frágil ene-2025 fase 1.',
    europe_implications: 'UE dividida: España, Irlanda, Noruega reconocen Estado palestino mayo-2024. Misión EU NAVFOR Aspides protege flota vs Houthi. CPI ICC vs Netanyahu.',
    key_actors: ['Israel (Netanyahu)', 'Hamas', 'Palestinian Authority', 'Hezbollah', 'USA', 'CPI'],
    estimated_fatalities: '45K+ palestinos Gaza · 1.2K+ israelíes · 4K+ Líbano · 1.9M desplazados Gaza',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/israeli-palestinian-conflict',
  },
  {
    id: 'civil-war-sudan',
    name: 'Civil War in Sudan',
    region: 'Africa',
    category: 'critical',
    us_impact: 'limited',
    since: '2023-04-15',
    countries_iso3: ['SDN', 'TCD', 'EGY'],
    summary: 'Guerra civil entre SAF (Burhan) y RSF (Hemedti) · mayor crisis humanitaria mundial 2024-25.',
    recent_developments: 'RSF intensifica ofensiva Darfur · ONU alerta riesgo genocidio · USA sanciona Hemedti ene-2025 · UE adopta paquete sanciones · 25M+ requieren ayuda humanitaria.',
    europe_implications: 'Refugiados hacia Chad y Egipto · presión migratoria Mediterráneo central futuro. España: AECID + ECHO ayuda emergencia €40M.',
    key_actors: ['SAF (Burhan)', 'RSF (Hemedti)', 'JEM', 'SPLM-N', 'Wagner/Africa Corps'],
    estimated_fatalities: '150K+ víctimas · 11M desplazados internos · 3.2M refugiados externos · genocidio Darfur en curso',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/civil-war-sudan',
  },
  {
    id: 'conflict-yemen',
    name: 'War in Yemen + Red Sea Crisis',
    region: 'Middle East',
    category: 'worsening',
    us_impact: 'significant',
    since: '2014-09-21',
    countries_iso3: ['YEM', 'SAU', 'ARE', 'IRN'],
    summary: 'Guerra civil Houthi (apoyo Irán) vs gobierno reconocido + coalición saudita. Crisis Mar Rojo desde 2023.',
    recent_developments: 'Ataques Houthi shipping intensificados post-7-O · Aspides UE + Prosperity Guardian USA escoltan · cesarse el fuego frágil Yemen norte · 70%+ tráfico Mar Rojo redirigido al Cabo.',
    europe_implications: 'España fragata permanente Aspides UE Mar Rojo. Suez tráfico -67% YoY · costes shipping a Europa +250%. Riesgo industria exportadora EU.',
    key_actors: ['Houthi (Abdul-Malik al-Houthi)', 'Yemeni Gov', 'Saudi-led coalition', 'Iran (IRGC)', 'USA', 'UK'],
    estimated_fatalities: '380K+ víctimas guerra (mayoría indirectas) · 4.5M desplazados',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/war-yemen',
  },
  {
    id: 'instability-haiti',
    name: 'State Collapse in Haiti',
    region: 'Americas',
    category: 'critical',
    us_impact: 'significant',
    since: '2021-07-07',
    countries_iso3: ['HTI'],
    summary: 'Colapso estatal post-asesinato Moïse 2021 · gangs (Cherizier/Barbecue) controlan 80% Port-au-Prince.',
    recent_developments: 'Misión MSS liderada por Kenia desplegada jun-2024 · 600 efectivos · operaciones limitadas · gobierno transición frágil · cólera resurgida.',
    europe_implications: 'Europa observador · UE €15M ayuda. España no presencia directa pero diáspora haitiana RD/USA preocupa hispanos.',
    key_actors: ['G9 Family (Cherizier)', 'G-Pep coalition', 'Kenya MSS', 'Haitian Police'],
    estimated_fatalities: '5K+ violencia gangs 2024 · 700K+ desplazados internos',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/violence-haiti',
  },
  {
    id: 'civil-war-myanmar',
    name: 'Civil War in Myanmar',
    region: 'Asia',
    category: 'worsening',
    us_impact: 'limited',
    since: '2021-02-01',
    countries_iso3: ['MMR', 'BGD'],
    summary: 'Guerra civil tras golpe junta Tatmadaw 2021 · NUG + EAOs vs ejército regular.',
    recent_developments: 'Operación 1027 colapsa controles junta · ALA toma Rakhine norte · MNDAA Shan · sanctions reforzadas USA/UE. Bangladesh: 1M Rohingyas en Cox\'s Bazar.',
    europe_implications: 'UE sanciones contra junta · embargo armas. España no presencia. Crisis Rohingya proxy para EU policy migración.',
    key_actors: ['Tatmadaw junta (Min Aung Hlaing)', 'NUG', 'PDF', 'ALA', 'KIA', 'TNLA', 'MNDAA'],
    estimated_fatalities: '50K+ víctimas total · 3.4M desplazados internos · 1M Rohingya refugiados',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/civil-war-myanmar',
  },
  {
    id: 'tensions-taiwan',
    name: 'China-Taiwan Tensions',
    region: 'Asia',
    category: 'worsening',
    us_impact: 'critical',
    since: '1949-10-01',
    countries_iso3: ['TWN', 'CHN', 'USA'],
    summary: 'Tensiones estructurales · China reivindica reunificación · USA Taiwan Relations Act garantiza autodefensa.',
    recent_developments: 'PLA viola ZIB Taiwán mensualmente con récord 35+ aviones. Taiwan recibió drones MQ-9B SeaGuardian USA dic-2024. AUKUS submarinos nucleares · Pacífico militarización.',
    europe_implications: 'TSMC fab Dresden + Magdeburg · UE Chips Act €43bn. España: dependencia chips Taiwán semiconductores avanzados. Riesgo cadenas globales si invasión.',
    key_actors: ['China (Xi)', 'Taiwan (Lai)', 'USA', 'Japan', 'Australia', 'Philippines'],
    estimated_fatalities: 'Sin víctimas militares activas · estimación escenario invasión: 1M+ víctimas, $10T impacto global',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/tensions-east-china-sea',
  },
  {
    id: 'tensions-south-china-sea',
    name: 'Territorial Disputes South China Sea',
    region: 'Asia',
    category: 'worsening',
    us_impact: 'significant',
    since: '1947-01-01',
    countries_iso3: ['CHN', 'PHL', 'VNM', 'MYS', 'BRN'],
    summary: 'China reclama 9-Dash Line vs ASEAN. La Haya 2016 falló a favor Filipinas · China ignora.',
    recent_developments: 'Incidentes Scarborough Shoal y Second Thomas Shoal · cañones de agua contra Filipinas. Filipinas-EE.UU. cooperación seguridad reforzada (EDCA bases).',
    europe_implications: 'Francia, UK envían fragatas Freedom of Navigation. España: no operativo pero apoyo doctrinal Indo-Pacific EU Strategy.',
    key_actors: ['China (PLA Navy)', 'Philippines (Marcos)', 'Vietnam', 'Malaysia', 'USA', 'UK', 'France'],
    estimated_fatalities: 'Sin víctimas pero múltiples incidentes anuales no-letales',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/territorial-disputes-south-china-sea',
  },
  {
    id: 'tensions-korean-peninsula',
    name: 'North Korea Crisis',
    region: 'Asia',
    category: 'worsening',
    us_impact: 'critical',
    since: '1953-07-27',
    countries_iso3: ['PRK', 'KOR'],
    summary: 'Tensiones Corea del Norte · programa nuclear/misiles + cooperación militar Rusia.',
    recent_developments: 'Hwasong-19 ICBM oct-2024 alcance 13K km · tropas PRK desplegadas Kursk Ucrania · misiles RPDC a Rusia · Kim cambia constitución designando RoK como "Estado hostil".',
    europe_implications: 'UE sanciona RPDC · Corea del Sur firma KF-21/K2 export Polonia. España no presencia directa.',
    key_actors: ['North Korea (Kim Jong-un)', 'South Korea (Yoon)', 'USA', 'China', 'Japan'],
    estimated_fatalities: 'Status quo · escenario escalada 100K+ proyectado',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/north-korea-crisis',
  },
  {
    id: 'conflict-sahel',
    name: 'Violence in the Sahel',
    region: 'Africa',
    category: 'worsening',
    us_impact: 'limited',
    since: '2012-01-01',
    countries_iso3: ['MLI', 'BFA', 'NER', 'TCD'],
    summary: 'Jihadismo JNIM (al-Qaeda) + ISGS (ISIS) en Mali, Burkina Faso, Níger · juntas militares post-golpes.',
    recent_developments: 'AES coalition (Mali/Burkina/Níger) sale ECOWAS · expulsa Francia · invita Wagner/Africa Corps. JNIM control 50%+ Burkina rural · masacres civiles intensificadas.',
    europe_implications: 'España: Operación MINUSMA cerrada 2023 · EUMAM Niger cerrada 2023. UE pierde influencia Sahel · Rusia Wagner gana terreno. Migración Canarias presión.',
    key_actors: ['JNIM', 'ISGS', 'Burkina junta (Traoré)', 'Mali junta (Goïta)', 'Wagner/Africa Corps', 'France (legacy)'],
    estimated_fatalities: '40K+ víctimas región 2024 · 3M+ desplazados internos · 2M refugiados',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/violence-sahel',
  },
  {
    id: 'instability-libya',
    name: 'Civil War in Libya',
    region: 'Africa',
    category: 'unchanging',
    us_impact: 'limited',
    since: '2011-02-15',
    countries_iso3: ['LBY'],
    summary: 'División estructural GNU Tripoli (Dbeibah) vs LNA Tobruk/Cyrenaica (Haftar).',
    recent_developments: 'Elecciones pospuestas 2024 · estancamiento UN · campos migrantes Libia origen trata personas Med central.',
    europe_implications: 'España: presencia naval CNDH consular · operaciones rescate. Migración Lampedusa/Tunisia presión. Petróleo Libia 1.2M bd impacto Europa.',
    key_actors: ['GNU Dbeibah', 'LNA Haftar', 'Wagner', 'Turkey', 'Egypt', 'UAE'],
    estimated_fatalities: '25K+ post-2011 · 700K desplazados internos · 100K muertos travesía Mediterráneo',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/civil-war-libya',
  },
  {
    id: 'instability-venezuela',
    name: 'Political Instability in Venezuela',
    region: 'Americas',
    category: 'worsening',
    us_impact: 'significant',
    since: '2013-04-19',
    countries_iso3: ['VEN', 'COL'],
    summary: 'Crisis Maduro post-elecciones 2024 robadas · oposición (Machado, González) reconocida internacionalmente.',
    recent_developments: 'Maduro 3er mandato fraudulento ene-2025 · USA reanuda sanciones petroleras · 7M+ migrantes (mayoría Colombia/Brasil/Perú/España). España: ESP migrantes 500K+.',
    europe_implications: 'UE no reconoce Maduro · sanciones individuales. España segunda diáspora venezolana mundial. Repsol activos congelados pero negociaciones por crudo.',
    key_actors: ['Maduro (de facto)', 'González (recognized)', 'María Corina Machado', 'PSUV', 'USA', 'Cuba'],
    estimated_fatalities: '15K+ víctimas violencia política · 7.7M emigrantes',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/instability-venezuela',
  },
  {
    id: 'opioid-epidemic-mexico',
    name: 'Cartels & Drug Violence in Mexico',
    region: 'Americas',
    category: 'unchanging',
    us_impact: 'significant',
    since: '2006-12-11',
    countries_iso3: ['MEX', 'USA'],
    summary: 'Cárteles Sinaloa/CJNG/Familia Michoacana controlan territorios rurales · 30K víctimas/año.',
    recent_developments: 'Sheinbaum continúa estrategia "abrazos no balazos" · presión Trump 2.0 contra cárteles · designación FTO discutida · fentanilo crisis USA.',
    europe_implications: 'España: cocaína cárteles vía Galicia · Mafias mexicanas Costa del Sol. Repsol y BBVA exposición México.',
    key_actors: ['Cartel Sinaloa', 'CJNG', 'Familia Michoacana', 'Mexican Gov', 'USA DEA'],
    estimated_fatalities: '450K+ víctimas total · 35K/año desaparecidos · 40K+/año homicidios',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/criminal-violence-mexico',
  },
  {
    id: 'instability-iraq',
    name: 'Conflict between Turkey and Armed Kurdish Groups',
    region: 'Middle East',
    category: 'unchanging',
    us_impact: 'limited',
    since: '1984-08-15',
    countries_iso3: ['TUR', 'IRQ', 'SYR'],
    summary: 'Insurgencia PKK contra Turquía · cross-border operaciones Iraq norte (Sinjar/Qandil) + Siria (YPG).',
    recent_developments: 'Erdogan oferta diálogo histórico oct-2024 · Bahçeli MHP propone autorizar Öcalan a hablar. Sirian DAA territorial post-caída Assad. Negociación HTS - Ankara - YPG.',
    europe_implications: 'España: misión OTAN Patriot Turquía concluida 2015. Migración refugiados kurdos a EU. UE designación PKK terrorista.',
    key_actors: ['PKK (Öcalan)', 'Turkey (Erdogan)', 'YPG/SDF (Syrian Kurds)', 'KRG Iraq', 'HTS Syria'],
    estimated_fatalities: '40K+ acumulados 1984-presente · 5K+ desplazados 2024',
    cfr_url: 'https://www.cfr.org/global-conflict-tracker/conflict/conflict-between-turkey-and-armed-kurdish-groups',
  },
]

export function getConflictsByRegion(region?: string): CfrConflict[] {
  if (!region) return CFR_CONFLICTS
  return CFR_CONFLICTS.filter((c) => c.region === region)
}

export function getConflictsByCountry(iso3: string): CfrConflict[] {
  return CFR_CONFLICTS.filter((c) => c.countries_iso3.includes(iso3.toUpperCase()))
}

export function getCriticalConflicts(): CfrConflict[] {
  return CFR_CONFLICTS.filter((c) => c.category === 'critical')
}
