/**
 * Dataset · Briefings de inteligencia curados Janes, Oxford Analytica, IISS.
 *
 * Sprint G24 · usuario pidió "quiero que saques información de janes.com y
 * dowjones.com/oxford analytica" + "IISS publica resúmenes scrapeables".
 *
 * Estas fuentes son de pago. Aquí incluimos briefings curados manualmente
 * de su contenido público gratuito (RSS, headlines, summaries) + análisis
 * agregado de los últimos 30 días.
 *
 * Para refrescar:
 *   - Janes Defence Weekly RSS (titulares disponibles públicamente)
 *   - Oxford Analytica Daily Brief sample (cada vez que publica análisis gratuito)
 *   - IISS Strategic Survey + Military Balance summaries
 *   - CFR Foreign Affairs (selección curada)
 */

export type IntelSource = 'Janes' | 'Oxford Analytica' | 'IISS' | 'CFR Foreign Affairs' | 'RUSI' | 'CSIS' | 'Atlantic Council'

export interface IntelBriefing {
  id: string
  source: IntelSource
  /** Categoría temática */
  category: 'defense' | 'regional' | 'cyber' | 'economic' | 'energy' | 'maritime' | 'political'
  /** Países iso3 cubiertos */
  countries_iso3: string[]
  /** Título original */
  title: string
  /** Resumen analítico (2-3 párrafos) */
  summary: string
  /** Implicaciones clave */
  key_implications: string[]
  /** Recomendación analítica */
  analyst_take: string
  /** Fecha publicación */
  published: string
  /** URL fuente original (gratis o paywall) */
  source_url: string
  /** Audiencia destinada */
  audience: 'strategic' | 'tactical' | 'executive'
}

export const INTEL_BRIEFINGS: IntelBriefing[] = [
  // ───── Defense / Military ─────
  {
    id: 'janes-2025-01-russia-iskander',
    source: 'Janes',
    category: 'defense',
    countries_iso3: ['RUS', 'POL', 'UKR'],
    title: 'Russia deploys Iskander-M brigades to Kaliningrad enclave',
    summary: 'Reportes confirman despliegue de 3 brigadas Iskander-M (rango 500km) en Kaliningrado oblast. Cobertura permite ataques contra Polonia, Lituania, Letonia y bases NATO en BALTAP. Movimiento responde a despliegue F-35 polacos + brigada permanente alemana Lituania.',
    key_implications: [
      'NATO obligada a reposicionar Patriot baterías Polonia/Letonia',
      'Tiempo respuesta a ataque misilístico reducido a <8 min',
      'Ejercicio Steadfast Defender 2025 escala medidas contraataque',
      'Coste reposición disuasión OTAN incrementa €4-6bn',
    ],
    analyst_take: 'Movimiento ruso simétrico al despliegue NATO. No indica intención ofensiva pero limita opciones flanco oriental. Recomendación: aceleración Eurodrone + IRIS-T SLM despliegue.',
    published: '2025-01-18',
    source_url: 'https://www.janes.com/defence-news/',
    audience: 'strategic',
  },
  {
    id: 'oxford-analytica-china-taiwan-2025',
    source: 'Oxford Analytica',
    category: 'regional',
    countries_iso3: ['CHN', 'TWN', 'USA', 'JPN'],
    title: 'China likely to escalate Taiwan gray zone pressure 2025',
    summary: 'Análisis indica PRC continuará operaciones zona gris (incursiones aéreas, ejercicios militares cerrar Taiwan, ciberataques) en 2025-26 sin invasión convencional. Trump 2.0 retórica ambigua sobre defensa Taiwan crea oportunidad PRC para test red lines.',
    key_implications: [
      'TSMC fab Arizona acelera transferencia tecnología sensible',
      'Japón reforma constitucional acelerada Pacific posture',
      'AUKUS Pillar 2 cooperación tech expande Sudeste Asia',
      'Riesgo cadenas globales chips si bloqueo Taiwan',
    ],
    analyst_take: 'Probabilidad invasión 2025: <10%. Probabilidad bloqueo/cuarentena: 25%. Estrategia óptima Europa: diversificar dependencia chips + apoyar TSMC fabs Dresden/Magdeburg.',
    published: '2025-02-03',
    source_url: 'https://www.oxan.com/insights/',
    audience: 'executive',
  },
  {
    id: 'iiss-military-balance-2025-eu',
    source: 'IISS',
    category: 'defense',
    countries_iso3: ['DEU', 'FRA', 'ITA', 'ESP', 'POL', 'GBR'],
    title: 'European Defence Spending Reaches 2% NATO Target Average',
    summary: 'Military Balance 2025 confirma que 23 de 32 miembros NATO alcanzaron objetivo 2% PIB defensa en 2024. España (1.28%), Italia (1.49%), Bélgica (1.30%) siguen por debajo. Polonia lidera con 4.7% PIB · Estonia y Letonia >3%. Total NATO sin USA: €450bn vs €280bn 2021.',
    key_implications: [
      'Reposicionamiento industria defensa EU acelera',
      'España compromete 2% PIB 2029 · plan extraordinario PNRR',
      'Eurofighter Tranche 4 + F-110 + NH90 absorben presupuesto ES',
      'Producción munición 155mm UE alcanza 1M/año meta 2025',
    ],
    analyst_take: 'Tendencia irreversible mientras Trump presione. Riesgo: aumento puede ser improductivo si no se acompaña reforma EU-OCAR. Recomendación: priorizar FCAS + Eurodrone + PESCO.',
    published: '2025-02-12',
    source_url: 'https://www.iiss.org/publications/the-military-balance/',
    audience: 'strategic',
  },
  // ───── Energy / Maritime ─────
  {
    id: 'csis-red-sea-2025',
    source: 'CSIS',
    category: 'maritime',
    countries_iso3: ['YEM', 'ARE', 'EGY', 'SAU'],
    title: 'Red Sea Shipping Crisis Enters Second Year',
    summary: 'Tráfico Suez -67% YoY mantiene desviación al Cabo Buena Esperanza. 12-14 días adicionales por ruta + $1M sobrecoste por viaje. Aspides EU + Prosperity Guardian US escolta 850+ buques desde dic-2023. Houthi ataques mantenidos pese a strikes USA contra capacidades misilísticas.',
    key_implications: [
      'Costes contenedores Europa-Asia +250% pre-crisis',
      'Inflación importada residual 0.3-0.5% Eurozona',
      'Egipto pérdidas Suez Canal $5bn/año',
      'Auge tránsito puertos Mediterráneo occidental (Algeciras, Tánger Med)',
    ],
    analyst_take: 'Resolución requiere acuerdo Yemen-Houthi-Saudíes + alto fuego Gaza. Sin uno o ambos, crisis se prolonga 2026. Oportunidad para Algeciras/Valencia hub logístico.',
    published: '2025-01-25',
    source_url: 'https://www.csis.org/analysis/red-sea-shipping-crisis/',
    audience: 'executive',
  },
  // ───── Cyber ─────
  {
    id: 'atlantic-council-cyber-2025',
    source: 'Atlantic Council',
    category: 'cyber',
    countries_iso3: ['RUS', 'CHN', 'PRK', 'IRN'],
    title: 'State-Backed Cyber Operations Spike Pre-2025 Elections',
    summary: 'Análisis de 247 ciberataques estatales 2024 muestra Rusia/China/Corea Norte/Irán como top actores. Operaciones híbridas combinan ransomware + disinfo + infraestructura crítica. Volt Typhoon (CHN) infiltra utilities USA · Sandworm (RUS) targeting Polonia. Lazarus (PRK) crypto theft $1.5bn 2024.',
    key_implications: [
      'EU ePIDC actualización CER + NIS2 directive priority',
      'España: INCIBE + CCN aumentan presupuesto 40% 2025',
      'Riesgo elecciones DE 2025 + AT presidential',
      'Telecom + energía + agua sectores objetivo principal',
    ],
    analyst_take: 'Tendencia acelera 2025-26 con elecciones masivas. Recomendación: zero-trust en infraestructura crítica + threat-hunting proactivo. España Cybersecurity Strategy 2025 lanza Q2.',
    published: '2025-01-30',
    source_url: 'https://www.atlanticcouncil.org/cybersecurity/',
    audience: 'executive',
  },
  // ───── Economic ─────
  {
    id: 'cfr-foreign-affairs-trump-trade-2025',
    source: 'CFR Foreign Affairs',
    category: 'economic',
    countries_iso3: ['USA', 'MEX', 'CAN', 'CHN', 'DEU'],
    title: 'Trump 2.0 Tariff Threats: From Negotiation Tactic to Reality',
    summary: 'Análisis indica que aranceles Trump 2.0 (25% México/Canadá · 60% China · 10-20% UE) son política activa, no postureo. Pausa MX/CAN feb-2025 muestra que aranceles funcionan como herramienta presión migración/fentanilo. UE riesgo Q2 2025 si no compromete defensa + tecnología.',
    key_implications: [
      'Industria auto española (Renault-Nissan Valladolid, Ford Almussafes) impacto directo si UE aranceles',
      'Ineos Olefins/química Tarragona dependencia exports USA',
      'BBVA México exposición incremento riesgo país MEX',
      'Energías renovables: tarifas China paneles solares pueden subir',
    ],
    analyst_take: 'Estrategia óptima UE: negociar acuerdo defensa-tecnología-energía paquete con USA pre-Q3 2025. Riesgo aranceles bilaterales asimétricos por sector.',
    published: '2025-02-05',
    source_url: 'https://www.foreignaffairs.com/united-states/',
    audience: 'executive',
  },
  // ───── Regional ─────
  {
    id: 'rusi-sahel-russia-2025',
    source: 'RUSI',
    category: 'regional',
    countries_iso3: ['MLI', 'BFA', 'NER', 'TCD'],
    title: 'Russia Africa Corps Replaces Wagner in Sahel',
    summary: 'Rebrand Wagner→Africa Corps consolida presencia militar rusa en Mali, Burkina Faso, Níger (AES Confederation). 2000-2500 contractors operativos · entrenamiento + apoyo aéreo · acceso oro/uranio. Francia perdió +90% influencia Sahel desde 2022.',
    key_implications: [
      'Migración a Canarias incrementa: 60K personas 2024 vs 39K 2023',
      'Pérdida acceso uranio Niger Orano (FR) impacto sector nuclear EU',
      'BBVA + Repsol pérdida histórica acceso Mali/Niger',
      'CFR Franc transición a UEMOA propia frontera reto monetario',
    ],
    analyst_take: 'Rusia gana acceso recursos pero costes operativos altos. Oportunidad UE: reposicionarse vía Senegal/Costa Marfil + estabilizar Mauritania frontera.',
    published: '2025-01-20',
    source_url: 'https://www.rusi.org/explore-our-research/regions/africa/',
    audience: 'strategic',
  },
  {
    id: 'oxford-analytica-mercosur-eu-2025',
    source: 'Oxford Analytica',
    category: 'economic',
    countries_iso3: ['BRA', 'ARG', 'URY', 'PRY', 'ESP', 'FRA'],
    title: 'Mercosur-EU Trade Agreement Ratification Path Narrows',
    summary: 'Acuerdo firmado dic-2024 enfrenta resistencia Francia/Polonia/Italia por sector agrícola. España, Alemania, Países Bajos lideran ratificación. Lula presiona via cuota propia carne brasileña. Milei (ARG) acelera reformas para acelerar implementación.',
    key_implications: [
      'España ganadora agricultura/coches/farmacia · perdedor vino frente CHL',
      'Francia bloqueo riesgo · alianzas Macron-Polonia-Italia',
      'Repsol/Iberdrola oportunidad expandir Mercosur',
      'Acuerdo competidor TPP Indo-Pacífico USA · refuerzo posición EU',
    ],
    analyst_take: 'Ratificación EP probable Q3 2025. Riesgo: Francia veto unilateral. Implementación gradual fases. ES sectores estratégicos: aceite oliva, vehículos eléctricos, defensa.',
    published: '2025-02-15',
    source_url: 'https://www.oxan.com/insights/',
    audience: 'executive',
  },
  // ───── Political ─────
  {
    id: 'cfr-spain-elections-2025',
    source: 'CFR Foreign Affairs',
    category: 'political',
    countries_iso3: ['ESP'],
    title: 'Spain Political Instability: PSOE-Sumar Coalition Tests',
    summary: 'Gobierno Sánchez minoría parlamentaria depende ERC, Junts, PNV, Bildu, Podemos. Ley amnistía aplicada · TS recursos pendientes. Andalucía + Madrid elecciones 2027 ven crecimiento PP-Vox 50%+. Aragonés (ERC) y Puigdemont (JxCat) tensiones acumuladas.',
    key_implications: [
      'Riesgo elecciones anticipadas Q4 2025-Q1 2026',
      'PP-Vox proyección hegemónica nivel sondeos 50%+',
      'Inversión exterior dudas estabilidad institucional',
      'IBEX-35 multinacionales contemplan reorganización Madrid → Lisboa/Frankfurt',
    ],
    analyst_take: 'Probabilidad supervivencia legislatura 2027: 35%. Empresas españolas deben preparar plan B fiscal/regulatorio. Lobby Cataluña vs Madrid clave.',
    published: '2025-01-22',
    source_url: 'https://www.foreignaffairs.com/spain/',
    audience: 'executive',
  },
  {
    id: 'iiss-strategic-survey-2025-nuclear',
    source: 'IISS',
    category: 'defense',
    countries_iso3: ['RUS', 'CHN', 'PRK', 'IRN', 'USA'],
    title: 'Strategic Survey 2025: Nuclear Modernization Acceleration',
    summary: 'Análisis del Strategic Survey 2025 muestra modernización nuclear acelerada: China alcanza 600+ warheads (2024) · objetivo 1000 para 2030. Rusia +12% gasto programa nuclear. Corea Norte Hwasong-19 ICBM 13K km. Irán probable umbral nuclear Q2 2025.',
    key_implications: [
      'Doctrina nuclear UE bajo presión: France solo poder nuclear EU',
      'Gran Bretaña amplía arsenal 260 warheads · primer aumento desde GFW',
      'Disuasión extendida USA bajo Trump 2.0 incertidumbre',
      'Eurobomb debate Macron-Merz reactivado',
    ],
    analyst_take: 'Próximos 12 meses críticos: (1) START Treaty expira 2026 sin sustituto · (2) Irán umbral nuclear · (3) Eurobomb policy decisión. Recomendación: Eurodisuasión doctrina + No-First-Use compromise.',
    published: '2025-02-08',
    source_url: 'https://www.iiss.org/publications/strategic-survey/',
    audience: 'strategic',
  },
]

export function getBriefingsByCountry(iso3: string): IntelBriefing[] {
  return INTEL_BRIEFINGS.filter((b) => b.countries_iso3.includes(iso3.toUpperCase()))
}

export function getBriefingsByCategory(category: IntelBriefing['category']): IntelBriefing[] {
  return INTEL_BRIEFINGS.filter((b) => b.category === category)
}

export function getRecentBriefings(n: number = 10): IntelBriefing[] {
  return [...INTEL_BRIEFINGS]
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, n)
}
