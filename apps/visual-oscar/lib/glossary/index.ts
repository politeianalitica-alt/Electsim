/**
 * Glosario único de Politeia Analítica · Sprint Quality-Q-B.
 *
 * Fuente de verdad para los términos técnicos que aparecen en la UI.
 *
 * Diseño:
 *   - Cada entrada tiene una definición CORTA (para tooltip · ≤140 chars)
 *     y una EXTENDIDA (para la página /glosario · explica contexto + fuente).
 *   - `category` permite agrupar en la página de glosario.
 *   - `source` cita la institución/dataset oficial cuando aplica.
 *   - `aliases` cubre variantes que el usuario podría buscar (p. ej. PVPC
 *     y "tarifa regulada", BERD y "I+D empresarial").
 *
 * Para añadir un término nuevo: insertarlo aquí. El componente <Glosa />
 * y la página /glosario lo recogen automáticamente.
 *
 * Auditoría 2026-05-31 (docs/audits/2026-05-31_content_audit_top5_modulos.md)
 * identificó 50+ acrónimos sin glosa en la UI. Esta es la base para resolverlo.
 */

export type GlossaryCategory =
  | 'macro'        // indicadores macroeconómicos
  | 'energia'      // sector eléctrico / energía
  | 'geopolitica'  // riesgo país / sanciones / defensa
  | 'medios'       // intel mediático / narrativas
  | 'finanzas'     // mercados / instrumentos
  | 'institucional' // instituciones ES / UE
  | 'estadistica'  // métricas estadísticas (MAPE, p10/p50/p90...)

export interface GlossaryEntry {
  /** Forma canónica del término · es lo que aparece en `<Glosa term="..."/>`. */
  term: string
  /** Definición ≤140 chars · cabe en tooltip sin scroll. */
  short: string
  /** Definición extendida · contexto + matiz · para /glosario. */
  long: string
  category: GlossaryCategory
  /** Fuente oficial cuando aplica (institución, dataset, normativa). */
  source?: string
  /** URL oficial cuando aplica · enlazada desde /glosario. */
  url?: string
  /** Otros nombres con los que el usuario podría buscarlo. */
  aliases?: string[]
}

// ────────────────────────────────────────────────────────────────────────────
// MACRO
// ────────────────────────────────────────────────────────────────────────────

const MACRO: GlossaryEntry[] = [
  {
    term: 'PIB',
    short: 'Producto Interior Bruto · valor de toda la producción de un país en un periodo.',
    long: 'Producto Interior Bruto. Suma del valor añadido de todas las actividades productivas residentes. El crecimiento del PIB se mide en variación interanual real (descontada inflación). España publica Contabilidad Nacional Trimestral (CNTR) cada trimestre.',
    category: 'macro',
    source: 'INE — Contabilidad Nacional Trimestral',
    url: 'https://www.ine.es',
  },
  {
    term: 'IPC',
    short: 'Índice de Precios al Consumo · inflación de cesta de bienes y servicios.',
    long: 'Índice de Precios de Consumo. Mide la variación de precios de una cesta representativa del gasto de los hogares. El IPC subyacente excluye alimentos no elaborados y energía (más volátiles). Es la métrica de referencia para evaluar inflación.',
    category: 'macro',
    source: 'INE',
    url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802',
  },
  {
    term: 'IPI',
    short: 'Índice de Producción Industrial · actividad mensual del sector industrial.',
    long: 'Índice de Producción Industrial. Indicador adelantado del ciclo industrial — capta la actividad fabril antes que el PIB trimestral.',
    category: 'macro',
    source: 'INE',
  },
  {
    term: 'BERD',
    short: 'Gasto privado empresarial en I+D, en % del PIB.',
    long: 'Business Enterprise Expenditure on R&D. Mide la inversión en I+D financiada y ejecutada por empresas. La media UE-27 ronda 1,5% PIB; España está históricamente por debajo. NO debe confundirse con el gasto total en I+D (que incluye administraciones y universidades).',
    category: 'macro',
    source: 'Eurostat',
    aliases: ['I+D empresarial', 'gasto privado en I+D'],
  },
  {
    term: 'NAIRU',
    short: 'Tasa de paro compatible con inflación estable según un marco económico.',
    long: 'Non-Accelerating Inflation Rate of Unemployment. Tasa de paro estimada por debajo de la cual la inflación tendería a acelerarse. Es un parámetro estimado (no observable directamente), sensible al modelo elegido. La OCDE y AIReF publican estimaciones distintas para España.',
    category: 'macro',
    source: 'AIReF / OCDE',
    aliases: ['paro estructural', 'NAWRU'],
  },
  {
    term: 'ULC',
    short: 'Coste laboral por unidad producida · proxy de competitividad-coste.',
    long: 'Unit Labour Cost (Coste Laboral Unitario). Salarios + cotizaciones por unidad de producto. Subidas de ULC superiores a la zona euro indican pérdida de competitividad-coste relativa; subidas inferiores, ganancia.',
    category: 'macro',
    source: 'BCE / Eurostat',
    aliases: ['coste laboral unitario'],
  },
  {
    term: 'REER',
    short: 'Tipo de cambio efectivo real · competitividad ponderada por comercio.',
    long: 'Real Effective Exchange Rate. Ponderación del tipo de cambio nominal frente a los socios comerciales, ajustada por inflación relativa. Base = 100. Por encima de 100 implica encarecimiento relativo de las exportaciones (pérdida de competitividad-precio). Por debajo, ganancia.',
    category: 'macro',
    source: 'BIS',
    url: 'https://www.bis.org/statistics/eer.htm',
    aliases: ['tipo de cambio efectivo real'],
  },
  {
    term: 'FCI',
    short: 'Financial Conditions Index · termómetro de condiciones financieras.',
    long: 'Financial Conditions Index. Agregado de tipos de interés, diferenciales de crédito, bolsa y dólar para capturar el estado general de las condiciones financieras. Sube cuando las condiciones se relajan; baja cuando se endurecen.',
    category: 'macro',
    source: 'BCE / Goldman Sachs / Bloomberg',
  },
  {
    term: 'Maastricht',
    short: 'Criterios de convergencia UE · deuda ≤60% PIB y déficit ≤3% PIB.',
    long: 'Criterios fijados en el Tratado de Maastricht (1992) para la unión monetaria: deuda pública ≤60% PIB y déficit público ≤3% PIB. Son criterios DE REFERENCIA, no techos exigibles desde la crisis 2010 — la Comisión Europea acepta planes plurianuales con sendas de ajuste.',
    category: 'macro',
    aliases: ['criterio Maastricht', 'umbral 60%'],
  },
  {
    term: 'AIReF',
    short: 'Autoridad Independiente de Responsabilidad Fiscal · evaluador presupuestario ES.',
    long: 'Autoridad Independiente de Responsabilidad Fiscal. Organismo público independiente que evalúa las proyecciones presupuestarias del Gobierno, la sostenibilidad de la deuda y los riesgos fiscales.',
    category: 'institucional',
    source: 'AIReF',
    url: 'https://www.airef.es',
  },
  {
    term: 'BdE',
    short: 'Banco de España.',
    long: 'Banco de España. Banco central nacional integrado en el Eurosistema. Publica el Boletín Estadístico, la Encuesta de Préstamos Bancarios (BLS-ES), tipos hipotecarios y de préstamo a PYMEs, y previsiones macroeconómicas.',
    category: 'institucional',
    source: 'Banco de España',
    url: 'https://www.bde.es',
  },
  {
    term: 'BCE',
    short: 'Banco Central Europeo · política monetaria zona euro.',
    long: 'Banco Central Europeo. Fija los tipos de referencia de la zona euro (depo, refi, marginal). Publica las previsiones macroeconómicas (BMPE), el Bank Lending Survey y series del balance.',
    category: 'institucional',
    source: 'BCE',
    url: 'https://www.ecb.europa.eu',
  },
  {
    term: 'FRED',
    short: 'Federal Reserve Economic Data · base de series macro de St. Louis Fed.',
    long: 'Federal Reserve Economic Data (FRED). Repositorio público de series macroeconómicas mantenido por el Federal Reserve Bank of St. Louis. Politeia lo usa como agregador para FRED, BdE, BCE, Eurostat, IMF, OECD.',
    category: 'macro',
    source: 'Federal Reserve Bank of St. Louis',
    url: 'https://fred.stlouisfed.org',
  },
  {
    term: 'pb',
    short: 'Punto básico · 1 pb = 0,01% (100 pb = 1 punto porcentual).',
    long: 'Punto básico (basis point). Centésima parte de un punto porcentual. Se usa para evitar ambigüedades en spreads pequeños (un spread de "0,5" es ambiguo: ¿0,5% o 50 pb?).',
    category: 'finanzas',
    aliases: ['basis point', 'puntos básicos'],
  },
  {
    term: 'IBEX',
    short: 'IBEX 35 · principal índice bursátil español.',
    long: 'Índice bursátil de la Bolsa de Madrid que agrupa los 35 valores más líquidos. Ponderado por capitalización ajustada por free float.',
    category: 'finanzas',
    source: 'BME',
    aliases: ['IBEX 35', 'IBEX35'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// ENERGÍA
// ────────────────────────────────────────────────────────────────────────────

const ENERGIA: GlossaryEntry[] = [
  {
    term: 'PVPC',
    short: 'Precio Voluntario para el Pequeño Consumidor · tarifa eléctrica regulada para hogares.',
    long: 'Precio Voluntario para el Pequeño Consumidor. Tarifa eléctrica REGULADA por el Gobierno aplicable a hogares con potencia contratada ≤10 kW. Se calcula horariamente a partir del precio mayorista (OMIE) más componentes regulados. Publicado por REE.',
    category: 'energia',
    source: 'REE / ESIOS',
    url: 'https://www.esios.ree.es',
    aliases: ['tarifa regulada', 'tarifa hogar'],
  },
  {
    term: 'ESIOS',
    short: 'Sistema de Información del Operador del Sistema · datos eléctricos REE.',
    long: 'Sistema de Información del Operador del Sistema. Plataforma de Red Eléctrica de España (REE) que publica datos horarios oficiales del sistema eléctrico: PVPC, demanda, mix de generación, intercambios, emisiones.',
    category: 'energia',
    source: 'REE',
    url: 'https://www.esios.ree.es',
  },
  {
    term: 'REE',
    short: 'Red Eléctrica de España · operador del sistema eléctrico.',
    long: 'Red Eléctrica de España (Redeia). Operador del sistema eléctrico español (TSO). Gestiona la red de transporte de alta tensión y publica los datos operativos vía ESIOS.',
    category: 'energia',
    source: 'Redeia',
    url: 'https://www.ree.es',
  },
  {
    term: 'OMIE',
    short: 'Operador del Mercado Ibérico de Electricidad · casa el mercado spot diario.',
    long: 'Operador del Mercado Ibérico de Electricidad (OMIE). Mercado mayorista de electricidad para España y Portugal (MIBEL). Casa diariamente las ofertas de compra y venta para fijar el precio spot horario.',
    category: 'energia',
    source: 'OMIE',
    url: 'https://www.omie.es',
    aliases: ['spot OMIE', 'mercado mayorista'],
  },
  {
    term: 'MIBEL',
    short: 'Mercado Ibérico de Electricidad · integra los mercados ES y PT.',
    long: 'Mercado Ibérico de Electricidad. Mercado conjunto España-Portugal operado por OMIE (mercado diario) y OMIP (mercado a plazo).',
    category: 'energia',
  },
  {
    term: 'D+1',
    short: 'Sesión del día siguiente · publicada cada día a las 20:15 por OMIE/REE.',
    long: 'Sesión del Mercado Diario para entregar electricidad al día siguiente. Las ofertas se cierran a las 12:00 CET y los precios horarios se publican a las 13:00 CET; el PVPC final se publica a las 20:15 CET.',
    category: 'energia',
    aliases: ['day-ahead', 'mercado diario'],
  },
  {
    term: 'ENTSO-E',
    short: 'Red europea de operadores eléctricos · datos UE-27 (mix, precios, flujos).',
    long: 'European Network of Transmission System Operators for Electricity. Asociación de los TSO europeos. Publica precios mayoristas, mix de generación y flujos transfronterizos UE-27 a través de la Transparency Platform.',
    category: 'energia',
    source: 'ENTSO-E',
    url: 'https://transparency.entsoe.eu',
  },
  {
    term: 'CNMC',
    short: 'Comisión Nacional de los Mercados y la Competencia · regulador energético/telecom ES.',
    long: 'Comisión Nacional de los Mercados y la Competencia. Regulador independiente de los mercados energéticos, telecomunicaciones y sector audiovisual en España.',
    category: 'institucional',
    source: 'CNMC',
    url: 'https://www.cnmc.es',
  },
  {
    term: 'EUA',
    short: 'European Union Allowance · derecho de emisión CO₂ del EU-ETS.',
    long: 'European Union Allowance. Derecho a emitir una tonelada de CO₂ equivalente bajo el Sistema Europeo de Comercio de Emisiones (EU-ETS). Su precio (€/tCO₂) es un coste relevante para generadores térmicos.',
    category: 'energia',
    aliases: ['precio CO2', 'EU-ETS'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// GEOPOLÍTICA
// ────────────────────────────────────────────────────────────────────────────

const GEO: GlossaryEntry[] = [
  {
    term: 'V-Dem',
    short: 'Varieties of Democracy · índice de calidad democrática por país.',
    long: 'Varieties of Democracy. Proyecto académico (Universidad de Gotemburgo) que mide la calidad democrática en 200+ países desde 1789 a través de cientos de indicadores codificados por expertos. Politeia usa V-Dem para la dimensión "democracia" del IRC.',
    category: 'geopolitica',
    source: 'V-Dem Institute',
    url: 'https://www.v-dem.net',
  },
  {
    term: 'SIPRI',
    short: 'Stockholm Int. Peace Research Institute · gasto militar y armamento.',
    long: 'Stockholm International Peace Research Institute. Instituto de referencia mundial en datos de gasto militar, transferencias de armas y proliferación. Politeia usa SIPRI para la dimensión "militarización" del IRC.',
    category: 'geopolitica',
    source: 'SIPRI',
    url: 'https://www.sipri.org',
  },
  {
    term: 'ACLED',
    short: 'Armed Conflict Location & Event Data · eventos violentos georreferenciados.',
    long: 'Armed Conflict Location & Event Data Project. Base de datos de eventos políticos violentos (conflictos, protestas, ataques) con fecha, ubicación y víctimas. Actualización semanal.',
    category: 'geopolitica',
    source: 'ACLED',
    url: 'https://acleddata.com',
  },
  {
    term: 'GDELT',
    short: 'Global Database of Events, Language & Tone · monitoreo de medios mundial.',
    long: 'Global Database of Events, Language, and Tone. Proyecto que monitoriza noticias de todo el mundo en tiempo real, codifica eventos políticos y mide el "tono" mediático. Politeia lo usa para la dimensión "tono mediático" del IRC y para el panel global de prensa.',
    category: 'geopolitica',
    source: 'GDELT Project',
    url: 'https://www.gdeltproject.org',
  },
  {
    term: 'IRC',
    short: 'Índice de Riesgo Compuesto Politeia · 0-100 · combina 4 dimensiones.',
    long: 'Índice de Riesgo Compuesto Politeia (0-100). Agrega 4 dimensiones: democracia (V-Dem), militarización (SIPRI), tono mediático (GDELT) y volumen de conflicto (GDELT/ACLED). NO es un rating soberano tipo Moody\'s/S&P; es un indicador de riesgo geopolítico operativo.',
    category: 'geopolitica',
    source: 'Politeia Analítica',
    aliases: ['Índice Riesgo Compuesto'],
  },
  {
    term: 'IRPC',
    short: 'Índice de Riesgo Político de País · variante del IRC enfocada en gobernanza.',
    long: 'Índice de Riesgo Político de País. Variante del IRC enfocada en estabilidad institucional, libertades públicas y calidad de gobierno (Gobernanza V-Dem + indicadores Banco Mundial WGI).',
    category: 'geopolitica',
    source: 'Politeia Analítica',
  },
  {
    term: 'AGNU',
    short: 'Asamblea General de las Naciones Unidas · órgano deliberativo de la ONU.',
    long: 'Asamblea General de las Naciones Unidas. Foro deliberativo principal de la ONU donde votan los 193 Estados miembros. Las votaciones son una métrica clave de alineamiento diplomático.',
    category: 'geopolitica',
    aliases: ['UNGA', 'Asamblea General ONU'],
  },
  {
    term: 'AOD',
    short: 'Ayuda Oficial al Desarrollo · fondos públicos a países en desarrollo (criterio CAD-OCDE).',
    long: 'Ayuda Oficial al Desarrollo. Fondos públicos de un país donante a países en desarrollo según el criterio del Comité de Ayuda al Desarrollo (CAD) de la OCDE. España la gestiona vía AECID.',
    category: 'geopolitica',
    source: 'CAD-OCDE',
  },
  {
    term: 'NATO',
    short: 'Organización del Tratado del Atlántico Norte · alianza militar (OTAN).',
    long: 'North Atlantic Treaty Organization (OTAN en español). Alianza militar fundada en 1949 con 32 miembros (2024). El compromiso de gasto militar es ≥2% del PIB anual.',
    category: 'geopolitica',
    aliases: ['OTAN'],
  },
  {
    term: 'EDA',
    short: 'European Defence Agency · agencia europea de defensa.',
    long: 'European Defence Agency. Agencia de la UE para coordinar capacidades de defensa, programas conjuntos y compras agrupadas.',
    category: 'geopolitica',
    url: 'https://eda.europa.eu',
  },
  {
    term: 'OFAC',
    short: 'Office of Foreign Assets Control · sanciones de EE. UU.',
    long: 'Office of Foreign Assets Control (Tesoro EE. UU.). Administra y aplica las sanciones económicas de Estados Unidos. La lista SDN (Specially Designated Nationals) es la más conocida. APLICA solo a personas y entidades US-touched.',
    category: 'geopolitica',
    source: 'US Treasury',
    url: 'https://ofac.treasury.gov',
    aliases: ['OFAC SDN', 'lista SDN'],
  },
  {
    term: 'FSF',
    short: 'EU Financial Sanctions Files · sanciones financieras de la UE.',
    long: 'Financial Sanctions Files de la Comisión Europea. Lista consolidada de sanciones financieras aprobadas por la UE bajo el régimen de la PESC.',
    category: 'geopolitica',
    source: 'Comisión Europea',
    aliases: ['EU FSF', 'Sanciones EU'],
  },
  {
    term: 'UNSC',
    short: 'Consejo de Seguridad ONU · sanciones aprobadas por el órgano ejecutivo de la ONU.',
    long: 'United Nations Security Council. Las resoluciones de sanciones del UNSC son vinculantes para los 193 Estados miembros bajo el capítulo VII de la Carta.',
    category: 'geopolitica',
    aliases: ['Consejo Seguridad ONU'],
  },
  {
    term: 'OFSI',
    short: 'Office of Financial Sanctions Implementation · sanciones financieras del Reino Unido.',
    long: 'Office of Financial Sanctions Implementation (HM Treasury). Administra las sanciones financieras del Reino Unido. Tras el Brexit, el régimen UK es independiente del europeo.',
    category: 'geopolitica',
    source: 'HM Treasury',
  },
  {
    term: 'OpenSanctions',
    short: 'Base agregada de listas de sanciones, PEPs y vigilancia (datos abiertos).',
    long: 'OpenSanctions. Iniciativa open data que agrega 300+ listas de sanciones, PEPs (Personas Políticamente Expuestas) y vigilancia de múltiples jurisdicciones en un dataset normalizado.',
    category: 'geopolitica',
    url: 'https://www.opensanctions.org',
  },
  {
    term: 'RSF',
    short: 'Reporteros Sin Fronteras · índice anual de libertad de prensa.',
    long: 'Reporteros Sin Fronteras (Reporters Without Borders). ONG que publica el Índice Mundial de Libertad de Prensa anual con 180 países.',
    category: 'geopolitica',
    url: 'https://rsf.org/es',
  },
  {
    term: 'PERE',
    short: 'Padrón de Españoles Residentes en el Extranjero · españoles inscritos por consulado.',
    long: 'Padrón de Españoles Residentes en el Extranjero. Registro del INE de españoles residentes fuera de España con derecho a voto, vinculado a su consulado de inscripción.',
    category: 'institucional',
    source: 'INE',
  },
  {
    term: 'AECID',
    short: 'Agencia Española de Cooperación Internacional para el Desarrollo.',
    long: 'Agencia Española de Cooperación Internacional para el Desarrollo. Agencia del Ministerio de Asuntos Exteriores que ejecuta la política de cooperación de España.',
    category: 'institucional',
    url: 'https://www.aecid.es',
  },
  {
    term: 'FONPRODE',
    short: 'Fondo para la Promoción del Desarrollo · instrumento financiero AECID.',
    long: 'Fondo para la Promoción del Desarrollo. Instrumento financiero reembolsable gestionado por AECID para inversiones en países socios.',
    category: 'institucional',
  },
  {
    term: 'CESCE',
    short: 'Compañía Española de Seguros de Crédito a la Exportación · cubre riesgo de impago en exportaciones ES.',
    long: 'Compañía Española de Seguros de Crédito a la Exportación. Sociedad mercantil estatal que cubre el riesgo comercial y político del impago en exportaciones e inversiones españolas en el exterior.',
    category: 'institucional',
    url: 'https://www.cesce.es',
  },
  {
    term: 'KYC',
    short: 'Know Your Customer · obligación de identificar contraparte (AML/CTF).',
    long: 'Know Your Customer. Obligación regulatoria de identificar y verificar la identidad de la contraparte en operaciones financieras, parte del marco AML (Anti-Money Laundering) y CTF (Counter-Terrorism Financing).',
    category: 'finanzas',
  },
  {
    term: 'IISS',
    short: 'International Institute for Strategic Studies · publica Military Balance anual.',
    long: 'International Institute for Strategic Studies. Think tank británico que publica The Military Balance, referencia anual sobre capacidades militares mundiales.',
    category: 'geopolitica',
    url: 'https://www.iiss.org',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// MEDIOS / PRENSA
// ────────────────────────────────────────────────────────────────────────────

const MEDIOS: GlossaryEntry[] = [
  {
    term: 'Narrativa',
    short: 'Tema + frame + mensaje repetido + actores + medios + ventana temporal + evidencia.',
    long: 'Una narrativa NO es un tema ni un frame suelto. Se requiere: topic + frame + mensaje repetido por varios actores en varios medios dentro de una ventana temporal, con evidencia suficiente. Politeia exige mínimo 3 artículos en ≥2 medios distintos y al menos una señal fuerte para considerarlo narrativa.',
    category: 'medios',
  },
  {
    term: 'Framing',
    short: 'Encuadre con el que un medio presenta una noticia (héroes, víctimas, causas).',
    long: 'Framing (encuadre). Selección de aspectos de una realidad para hacerlos salientes en el texto comunicativo, promoviendo una definición particular del problema, una interpretación causal y una recomendación de tratamiento (Entman, 1993).',
    category: 'medios',
    aliases: ['encuadre'],
  },
  {
    term: 'Señales emergentes',
    short: 'Clusters con menos de 3 artículos · pre-narrativa · pueden o no consolidarse.',
    long: 'Clusters que muestran indicios de una posible narrativa pero NO cumplen aún el umbral de masa crítica (≥3 artículos en ≥2 medios). Son señales tempranas: pueden consolidarse en narrativa o disolverse.',
    category: 'medios',
    aliases: ['early warning narrativas'],
  },
  {
    term: 'EFE',
    short: 'Agencia EFE · principal agencia de noticias en español.',
    long: 'Agencia EFE. Agencia internacional de noticias en español con estatuto de sociedad estatal. Fuente primaria para política nacional, internacional y económica en España.',
    category: 'medios',
    url: 'https://www.efe.com',
  },
  {
    term: 'Newtral',
    short: 'Plataforma española de fact-checking certificada por IFCN.',
    long: 'Newtral. Plataforma española de verificación de información política certificada por la International Fact-Checking Network (IFCN). Sus verdictos están firmados y son trazables.',
    category: 'medios',
    url: 'https://www.newtral.es',
  },
  {
    term: 'Maldita',
    short: 'Plataforma española de fact-checking certificada por IFCN (Maldita.es).',
    long: 'Maldita.es. Organización sin ánimo de lucro especializada en verificación, periodismo de datos y alfabetización mediática. Certificada por la IFCN.',
    category: 'medios',
    url: 'https://maldita.es',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICA
// ────────────────────────────────────────────────────────────────────────────

const ESTADISTICA: GlossaryEntry[] = [
  {
    term: 'MAPE',
    short: 'Error medio porcentual absoluto · <5% excelente · 5-15% razonable · >15% mal.',
    long: 'Mean Absolute Percentage Error. Promedio de los errores porcentuales absolutos de un modelo. Insensible a la escala. Regla de bolsillo: <5% excelente, 5-15% razonable, >15% mal — depende del contexto.',
    category: 'estadistica',
  },
  {
    term: 'Sesgo',
    short: 'Diferencia media entre predicción y realidad · positivo = sobreestima sistemáticamente.',
    long: 'Bias. Diferencia media entre el valor predicho y el real. Un sesgo cercano a 0 no implica buen modelo (puede tener errores grandes que se compensan); un sesgo no-cero indica que el modelo sobreestima o infraestima de forma sistemática.',
    category: 'estadistica',
    aliases: ['bias'],
  },
  {
    term: 'p10',
    short: 'Percentil 10 · el 10% más bajo de los valores está por debajo.',
    long: 'Percentil 10. El valor por debajo del cual cae el 10% de los datos. Junto a p50 (mediana) y p90 forman una caracterización robusta de una distribución.',
    category: 'estadistica',
  },
  {
    term: 'p50',
    short: 'Mediana · valor central · 50% por encima y 50% por debajo.',
    long: 'Mediana. Valor que divide la distribución en dos mitades iguales. Más robusto que la media frente a outliers.',
    category: 'estadistica',
    aliases: ['mediana'],
  },
  {
    term: 'p90',
    short: 'Percentil 90 · el 10% más alto de los valores está por encima.',
    long: 'Percentil 90. El valor por debajo del cual cae el 90% de los datos. Útil para caracterizar la cola superior de una distribución (riesgos extremos).',
    category: 'estadistica',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────────────────────

export const GLOSSARY: GlossaryEntry[] = [
  ...MACRO,
  ...ENERGIA,
  ...GEO,
  ...MEDIOS,
  ...ESTADISTICA,
]

const INDEX = (() => {
  const idx = new Map<string, GlossaryEntry>()
  for (const e of GLOSSARY) {
    idx.set(e.term.toLowerCase(), e)
    e.aliases?.forEach((a) => idx.set(a.toLowerCase(), e))
  }
  return idx
})()

/**
 * Busca una entrada por término canónico o alias (case-insensitive).
 * Devuelve `undefined` si no hay match.
 */
export function findGlossaryEntry(term: string): GlossaryEntry | undefined {
  return INDEX.get(term.toLowerCase())
}

/** Devuelve todas las entradas de una categoría. */
export function byCategory(cat: GlossaryCategory): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.category === cat).sort((a, b) =>
    a.term.localeCompare(b.term, 'es'),
  )
}

/** Devuelve todas las categorías con su label en ES. */
export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  macro: 'Macroeconomía',
  energia: 'Energía',
  geopolitica: 'Geopolítica',
  medios: 'Medios y narrativas',
  finanzas: 'Mercados y finanzas',
  institucional: 'Instituciones',
  estadistica: 'Métricas estadísticas',
}
