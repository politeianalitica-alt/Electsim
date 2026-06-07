/**
 * lib/tercer-sector/informes-catalog.ts · Biblioteca curada de informes y
 * evidencia del tercer sector · Sprint TS-Cockpit W1d.
 *
 * Responde a la 4ª pregunta del analista ("¿qué informe/dataset cito para
 * justificar un proyecto?"). Es un catálogo CURADO + DATADO + con FUENTE y URL
 * REAL (regla CLAUDE.md: nada sin cita; no se inventan URLs). Cada entrada
 * apunta a la página de referencia conocida de su entidad (portal de informes,
 * landing de la publicación o sección de datos), no a un PDF concreto efímero,
 * para que el enlace siga vivo. Donde el documento es anual y recurrente, la URL
 * apunta a la sección estable de la entidad (p. ej. la página AROPE de EAPN).
 *
 * Tipos planos (sin dependencias) para usarse en route handlers Next.js y en
 * tests Node (--experimental-strip-types). El endpoint
 * `/api/tercer-sector/informes` sirve este catálogo con filtros + facetas; al
 * ser estático OMITE `maxDuration` (config `{}`, LEY VERCEL HOBBY del spec).
 *
 * Datado: 2026-06-07.
 */

/** Ámbito geográfico del informe. */
export type InformeAmbito = 'espana' | 'ccaa' | 'ue' | 'global'

/** Naturaleza del recurso. */
export type InformeTipo =
  | 'informe'
  | 'dataset'
  | 'memoria'
  | 'estadistica'
  | 'normativa'

/**
 * Una pieza de evidencia (informe, dataset, memoria, estadística o normativa)
 * curada para el analista del tercer sector.
 */
export interface InformeTS {
  /** Id estable (slug) del recurso. */
  id: string
  titulo: string
  /** Entidad/organismo que publica. */
  entidad: string
  /** Año de la edición citada (o de la última edición estable conocida). */
  anio: number
  ambito: InformeAmbito
  /** Temas/etiquetas (claves de búsqueda) para filtrar la biblioteca. */
  temas: string[]
  /** URL pública REAL de la fuente (página estable de la publicación). */
  url: string
  tipo: InformeTipo
  /** Resumen breve de qué contiene. */
  resumen: string
  /** Para qué le sirve al analista (qué afirmación permite justificar). */
  utilidad_analista: string
}

/**
 * Catálogo curado. Orden = relevancia editorial aproximada (estado del sector,
 * pobreza/exclusión, financiación pública, datos estadísticos, marco UE/OCDE).
 * Todas las entradas tienen `url` + `entidad` + `anio` (verificado por el test).
 */
export const INFORMES: InformeTS[] = [
  // ─── Estado y radiografía del tercer sector (entidades cumbre) ─────────────
  {
    id: 'pts-tercer-sector-cifras',
    titulo: 'El Tercer Sector de Acción Social en España',
    entidad: 'Plataforma del Tercer Sector',
    anio: 2024,
    ambito: 'espana',
    temas: ['tercer_sector', 'sector_social', 'empleo', 'financiacion', 'voluntariado'],
    url: 'https://www.plataformatercersector.es/publicaciones/',
    tipo: 'informe',
    resumen:
      'Radiografía del Tercer Sector de Acción Social (TSAS): número de entidades, personas atendidas, empleo, voluntariado, ingresos y peso sobre el PIB.',
    utilidad_analista:
      'Cifra global del sector (entidades, empleo, % PIB) para dimensionar el ecosistema y contextualizar cualquier proyecto.',
  },
  {
    id: 'foessa-informe-exclusion',
    titulo: 'Informe sobre Exclusión y Desarrollo Social en España (FOESSA)',
    entidad: 'Fundación FOESSA / Cáritas',
    anio: 2022,
    ambito: 'espana',
    temas: ['pobreza', 'exclusion_social', 'cohesion_social', 'desigualdad'],
    url: 'https://www.foessa.es/main-files/',
    tipo: 'informe',
    resumen:
      'Análisis estructural de la exclusión social en España a partir de la Encuesta sobre Integración y Necesidades Sociales (EINSFOESSA): integración plena, precaria, exclusión moderada y severa.',
    utilidad_analista:
      'Referencia académica de cabecera para cuantificar exclusión social severa y justificar la necesidad de intervención por colectivo/territorio.',
  },
  {
    id: 'eapn-arope-estado-pobreza',
    titulo: 'El Estado de la Pobreza en España. Seguimiento del indicador AROPE',
    entidad: 'EAPN España',
    anio: 2024,
    ambito: 'espana',
    temas: ['pobreza', 'arope', 'exclusion_social', 'desigualdad'],
    url: 'https://www.eapn.es/estadodepobreza/',
    tipo: 'informe',
    resumen:
      'Informe anual con el indicador AROPE (At Risk Of Poverty or social Exclusion) por CCAA, edad y sexo, a partir de la Encuesta de Condiciones de Vida del INE.',
    utilidad_analista:
      'Tasa AROPE oficial por comunidad autónoma: dato clave para priorizar territorios y justificar el alcance geográfico de un proyecto.',
  },
  {
    id: 'eapn-arope-ccaa',
    titulo: 'El Estado de la Pobreza por Comunidad Autónoma (AROPE territorial)',
    entidad: 'EAPN España',
    anio: 2024,
    ambito: 'ccaa',
    temas: ['pobreza', 'arope', 'territorio', 'ccaa'],
    url: 'https://www.eapn.es/estadodepobreza/territorios.php',
    tipo: 'informe',
    resumen:
      'Desglose autonómico del indicador AROPE y sus tres componentes (riesgo de pobreza, privación material severa, baja intensidad de empleo) con fichas por comunidad.',
    utilidad_analista:
      'Comparativa AROPE entre CCAA para argumentar dónde concentrar recursos y detectar huecos territoriales.',
  },
  {
    id: 'pve-la-accion-voluntaria',
    titulo: 'La Acción Voluntaria en España',
    entidad: 'Plataforma del Voluntariado de España',
    anio: 2023,
    ambito: 'espana',
    temas: ['voluntariado', 'participacion', 'tercer_sector'],
    url: 'https://plataformavoluntariado.org/observatorio-del-voluntariado/',
    tipo: 'informe',
    resumen:
      'Estudio del Observatorio del Voluntariado sobre perfil, motivaciones y evolución del voluntariado en España, con series de personas voluntarias por ámbito.',
    utilidad_analista:
      'Datos de base voluntaria (número, perfil, ámbitos) para dimensionar la capacidad de movilización social de un proyecto.',
  },
  {
    id: 'fundacion-lealtad-ong-confianza',
    titulo: 'Las ONG analizadas por Fundación Lealtad · Guía de la Transparencia y las Buenas Prácticas',
    entidad: 'Fundación Lealtad',
    anio: 2024,
    ambito: 'espana',
    temas: ['transparencia', 'buenas_practicas', 'gobernanza', 'rendicion_cuentas'],
    url: 'https://www.fundacionlealtad.org/ong-acreditadas/',
    tipo: 'informe',
    resumen:
      'Listado y análisis de ONG acreditadas según los 9 Principios de Transparencia y Buenas Prácticas (gobierno, claridad de fines, planificación, comunicación, financiación, control de uso de fondos, voluntariado, cuentas, cumplimiento).',
    utilidad_analista:
      'Verificar el sello de transparencia de una entidad y citar el marco de buenas prácticas en due diligence de socios o partners.',
  },
  {
    id: 'congde-informe-sector-ongd',
    titulo: 'Informe del Sector de las ONGD',
    entidad: 'Coordinadora de ONGD (CONGDE)',
    anio: 2023,
    ambito: 'espana',
    temas: ['cooperacion_internacional', 'ongd', 'financiacion', 'aod'],
    url: 'https://informe.coordinadoraongd.org/',
    tipo: 'informe',
    resumen:
      'Datos económicos, de financiación (pública vs privada), recursos humanos y base social del conjunto de ONGD españolas asociadas a la Coordinadora.',
    utilidad_analista:
      'Benchmark del sector de cooperación (ingresos medios, mix de financiación, empleo) para situar a una ONGD frente a sus pares.',
  },
  {
    id: 'cepes-anuario-economia-social',
    titulo: 'Estadísticas y Anuario de la Economía Social en España',
    entidad: 'CEPES',
    anio: 2024,
    ambito: 'espana',
    temas: ['economia_social', 'cooperativas', 'empleo', 'empresas'],
    url: 'https://www.cepes.es/social/estadisticas',
    tipo: 'estadistica',
    resumen:
      'Estadísticas de la economía social española: número de empresas (cooperativas, sociedades laborales, mutualidades, CEE), empleo generado y facturación agregada.',
    utilidad_analista:
      'Dimensión y empleo de la economía social para proyectos de inserción laboral y empresas sociales.',
  },

  // ─── Estadística pública (INE / Eurostat) ─────────────────────────────────
  {
    id: 'ine-ecv-condiciones-vida',
    titulo: 'Encuesta de Condiciones de Vida (ECV)',
    entidad: 'INE',
    anio: 2024,
    ambito: 'espana',
    temas: ['pobreza', 'arope', 'renta', 'desigualdad', 'condiciones_vida'],
    url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176807',
    tipo: 'estadistica',
    resumen:
      'Operación estadística oficial fuente del indicador AROPE y de la renta por hogar, privación material y desigualdad (índice de Gini, ratio S80/S20) en España.',
    utilidad_analista:
      'Fuente primaria oficial para tasas de pobreza, Gini y privación material; respaldo estadístico de cualquier cifra social.',
  },
  {
    id: 'ine-gini-s80s20',
    titulo: 'Indicadores de desigualdad: Gini y ratio S80/S20',
    entidad: 'INE',
    anio: 2024,
    ambito: 'espana',
    temas: ['desigualdad', 'renta', 'gini', 'cohesion_social'],
    url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=9966',
    tipo: 'dataset',
    resumen:
      'Serie del coeficiente de Gini y de la distribución de la renta (S80/S20) por comunidad autónoma a partir de la ECV.',
    utilidad_analista:
      'Cifra de desigualdad por CCAA descargable para gráficos y comparativas territoriales.',
  },
  {
    id: 'ine-tasa-riesgo-pobreza-ccaa',
    titulo: 'Tasa de riesgo de pobreza por comunidad autónoma',
    entidad: 'INE',
    anio: 2024,
    ambito: 'ccaa',
    temas: ['pobreza', 'territorio', 'ccaa', 'renta'],
    url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=9963',
    tipo: 'dataset',
    resumen:
      'Tabla de la tasa de riesgo de pobreza (umbral del 60% de la mediana de renta) desglosada por comunidad autónoma y año.',
    utilidad_analista:
      'Dato territorial descargable para mapas de pobreza y priorización geográfica de la intervención.',
  },
  {
    id: 'eurostat-ilc-peps01-arope',
    titulo: 'People at risk of poverty or social exclusion (AROPE) — Eurostat',
    entidad: 'Eurostat',
    anio: 2024,
    ambito: 'ue',
    temas: ['pobreza', 'arope', 'comparativa_ue', 'cohesion_social'],
    url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_peps01n/default/table',
    tipo: 'dataset',
    resumen:
      'Indicador AROPE armonizado para todos los Estados miembros de la UE, base del objetivo del Pilar Europeo de Derechos Sociales (reducir en 15M las personas en riesgo para 2030).',
    utilidad_analista:
      'Comparar la posición de España con la UE-27 y anclar proyectos al objetivo europeo de pobreza 2030.',
  },
  {
    id: 'eurostat-spde-social-protection',
    titulo: 'Social protection expenditure — Eurostat (ESSPROS)',
    entidad: 'Eurostat',
    anio: 2024,
    ambito: 'ue',
    temas: ['proteccion_social', 'gasto_publico', 'comparativa_ue'],
    url: 'https://ec.europa.eu/eurostat/databrowser/view/spr_exp_sum/default/table',
    tipo: 'dataset',
    resumen:
      'Gasto en protección social como porcentaje del PIB por función (vejez, enfermedad, familia, exclusión social, vivienda, desempleo) y país.',
    utilidad_analista:
      'Contexto de gasto social ES vs UE para argumentar infrafinanciación de una política o función concreta.',
  },
  {
    id: 'eurostat-volunteering-participation',
    titulo: 'Participation in formal/informal voluntary activities — Eurostat',
    entidad: 'Eurostat',
    anio: 2022,
    ambito: 'ue',
    temas: ['voluntariado', 'participacion', 'comparativa_ue'],
    url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_scp19/default/table',
    tipo: 'dataset',
    resumen:
      'Porcentaje de población que participa en actividades de voluntariado formal e informal por país (módulo de la encuesta EU-SILC).',
    utilidad_analista:
      'Benchmark europeo de participación voluntaria para dimensionar el potencial de movilización en España.',
  },

  // ─── Financiación pública / IRPF 0,7% / Estrategia (mdsocialesa2030) ───────
  {
    id: 'mdsociales-irpf-07-fines-sociales',
    titulo: 'Convocatoria del IRPF 0,7% de fines de interés social (subvenciones)',
    entidad: 'Ministerio de Derechos Sociales, Consumo y Agenda 2030',
    anio: 2024,
    ambito: 'espana',
    temas: ['financiacion', 'irpf_07', 'subvenciones', 'tercer_sector'],
    url: 'https://www.mdsocialesa2030.gob.es/derechos-sociales/ong/irpf/home.htm',
    tipo: 'normativa',
    resumen:
      'Marco y resoluciones de la asignación tributaria del 0,7% del IRPF a fines de interés social: tramo estatal y autonómico, programas y entidades beneficiarias.',
    utilidad_analista:
      'Identificar la principal vía de financiación pública estructural del tercer sector y las líneas/programas elegibles.',
  },
  {
    id: 'mdsociales-estrategia-tercer-sector',
    titulo: 'Estrategia Estatal del Tercer Sector de Acción Social',
    entidad: 'Ministerio de Derechos Sociales, Consumo y Agenda 2030',
    anio: 2023,
    ambito: 'espana',
    temas: ['tercer_sector', 'politica_publica', 'estrategia', 'sector_social'],
    url: 'https://www.mdsocialesa2030.gob.es/derechos-sociales/tercer-sector/home.htm',
    tipo: 'normativa',
    resumen:
      'Documento de política pública que ordena las medidas de apoyo al TSAS: financiación, profesionalización, voluntariado, transparencia y participación.',
    utilidad_analista:
      'Anclar un proyecto a una línea de la estrategia estatal vigente y alinear el discurso con la prioridad pública.',
  },
  {
    id: 'mdsociales-plan-nacional-inclusion',
    titulo: 'Plan Nacional de Acción para la Inclusión Social (PNAIN)',
    entidad: 'Ministerio de Derechos Sociales, Consumo y Agenda 2030',
    anio: 2023,
    ambito: 'espana',
    temas: ['inclusion_social', 'pobreza', 'politica_publica', 'estrategia'],
    url: 'https://www.mdsocialesa2030.gob.es/derechos-sociales/inclusion/home.htm',
    tipo: 'normativa',
    resumen:
      'Plan que articula los objetivos de inclusión social de España alineados con el Pilar Europeo de Derechos Sociales y la garantía de rentas mínimas.',
    utilidad_analista:
      'Marco de política de inclusión para justificar coherencia de un proyecto con los objetivos nacionales y europeos.',
  },
  {
    id: 'imv-ingreso-minimo-vital',
    titulo: 'Ingreso Mínimo Vital · datos de gestión y cobertura',
    entidad: 'Seguridad Social / Ministerio de Inclusión',
    anio: 2024,
    ambito: 'espana',
    temas: ['rentas_minimas', 'pobreza', 'proteccion_social', 'imv'],
    url: 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/PrestacionesPensionesTrabajadores/65850d68-8d06-4645-bde7-05374ee42ac7',
    tipo: 'estadistica',
    resumen:
      'Información oficial del Ingreso Mínimo Vital: requisitos, hogares y personas beneficiarias y cuantías, principal prestación estatal de garantía de ingresos.',
    utilidad_analista:
      'Cobertura real del IMV (brecha de non take-up) para argumentar la necesidad de acompañamiento a colectivos vulnerables.',
  },

  // ─── Memorias de grandes entidades (evidencia primaria) ───────────────────
  {
    id: 'cruz-roja-memoria',
    titulo: 'Memoria anual de Cruz Roja Española',
    entidad: 'Cruz Roja Española',
    anio: 2023,
    ambito: 'espana',
    temas: ['humanitario', 'memoria', 'accion_social', 'voluntariado'],
    url: 'https://www2.cruzroja.es/web/ahora/memorias',
    tipo: 'memoria',
    resumen:
      'Memoria de actividad y cuentas anuales: personas atendidas por programa, voluntariado, ingresos por origen y despliegue territorial de la mayor entidad humanitaria de España.',
    utilidad_analista:
      'Evidencia primaria de alcance y modelo de financiación de una entidad de referencia; benchmark de escala.',
  },
  {
    id: 'caritas-memoria-confederal',
    titulo: 'Memoria de Cáritas Española (confederal)',
    entidad: 'Cáritas Española',
    anio: 2023,
    ambito: 'espana',
    temas: ['accion_social', 'pobreza', 'memoria', 'acompanamiento'],
    url: 'https://www.caritas.es/que-hacemos/transparencia/',
    tipo: 'memoria',
    resumen:
      'Memoria y cuentas de Cáritas: acompañamiento a personas, programas de empleo e inclusión, inversión social y origen de los recursos.',
    utilidad_analista:
      'Datos de acompañamiento e inversión social de la mayor red de base territorial para argumentos cualitativos y de cobertura.',
  },
  {
    id: 'oxfam-intermon-desigualdad',
    titulo: 'Informe de desigualdad de Oxfam (serie "Davos")',
    entidad: 'Oxfam Intermón',
    anio: 2024,
    ambito: 'global',
    temas: ['desigualdad', 'riqueza', 'fiscalidad', 'cooperacion_internacional'],
    url: 'https://www.oxfamintermon.org/es/publicaciones',
    tipo: 'informe',
    resumen:
      'Serie anual sobre concentración de riqueza global y española, brecha entre el 1% y el resto, y propuestas de fiscalidad redistributiva.',
    utilidad_analista:
      'Cifras de impacto mediático sobre desigualdad global/España para encuadrar la justificación social de un proyecto.',
  },
  {
    id: 'unicef-infancia-espana',
    titulo: 'Informe sobre la infancia en España',
    entidad: 'UNICEF España',
    anio: 2024,
    ambito: 'espana',
    temas: ['infancia', 'pobreza_infantil', 'derechos', 'bienestar'],
    url: 'https://www.unicef.es/publicaciones',
    tipo: 'informe',
    resumen:
      'Análisis del bienestar y la pobreza infantil en España (la tasa de pobreza infantil supera la media de la población) con recomendaciones de política.',
    utilidad_analista:
      'Pobreza infantil por CCAA y comparativa UE: respaldo directo para proyectos dirigidos a infancia.',
  },
  {
    id: 'save-children-pobreza-infantil',
    titulo: 'Pobreza infantil y exclusión social en España',
    entidad: 'Save the Children España',
    anio: 2023,
    ambito: 'espana',
    temas: ['infancia', 'pobreza_infantil', 'educacion', 'exclusion_social'],
    url: 'https://www.savethechildren.es/publicaciones',
    tipo: 'informe',
    resumen:
      'Estudios sobre pobreza infantil, transmisión intergeneracional, brecha educativa y propuestas de prestación por crianza.',
    utilidad_analista:
      'Evidencia sobre brecha educativa y pobreza infantil para diseñar y justificar intervenciones con menores.',
  },
  {
    id: 'fundacion-once-discapacidad-empleo',
    titulo: 'Datos de empleo y discapacidad (ODISMET)',
    entidad: 'Fundación ONCE',
    anio: 2024,
    ambito: 'espana',
    temas: ['discapacidad', 'empleo', 'inclusion_laboral', 'observatorio'],
    url: 'https://www.odismet.es/',
    tipo: 'estadistica',
    resumen:
      'Observatorio sobre Discapacidad y Mercado de Trabajo: tasas de actividad, empleo y paro de las personas con discapacidad, brecha frente a la población general.',
    utilidad_analista:
      'Brecha de empleo de personas con discapacidad con datos actualizados; base para proyectos de inserción laboral.',
  },
  {
    id: 'aecc-observatorio-cancer',
    titulo: 'Observatorio del Cáncer de la AECC',
    entidad: 'Asociación Española Contra el Cáncer',
    anio: 2024,
    ambito: 'espana',
    temas: ['sanitario', 'cancer', 'observatorio', 'desigualdad_salud'],
    url: 'https://observatorio.contraelcancer.es/',
    tipo: 'estadistica',
    resumen:
      'Datos de incidencia, supervivencia, impacto económico y desigualdades territoriales del cáncer en España.',
    utilidad_analista:
      'Cifras de impacto del cáncer y desigualdad en salud para proyectos sociosanitarios y de acompañamiento.',
  },

  // ─── Marco internacional (OCDE, UE) ───────────────────────────────────────
  {
    id: 'ocde-society-at-a-glance',
    titulo: 'Society at a Glance — Indicadores sociales de la OCDE',
    entidad: 'OCDE',
    anio: 2024,
    ambito: 'global',
    temas: ['indicadores_sociales', 'comparativa_internacional', 'cohesion_social', 'gasto_social'],
    url: 'https://www.oecd.org/en/publications/society-at-a-glance_19991290.html',
    tipo: 'informe',
    resumen:
      'Compendio de indicadores sociales comparados de los países OCDE: gasto social, empleo, fertilidad, desigualdad, confianza y bienestar.',
    utilidad_analista:
      'Posicionar a España en el contexto OCDE en gasto social y desigualdad para argumentos comparados.',
  },
  {
    id: 'ocde-social-economy-guide',
    titulo: 'Social Economy and Social Innovation — OCDE',
    entidad: 'OCDE',
    anio: 2023,
    ambito: 'global',
    temas: ['economia_social', 'innovacion_social', 'politica_publica', 'comparativa_internacional'],
    url: 'https://www.oecd.org/en/topics/sub-issues/social-economy-and-social-innovation.html',
    tipo: 'informe',
    resumen:
      'Recomendación de la OCDE y trabajos sobre el desarrollo de la economía social y la innovación social como motor de empleo inclusivo.',
    utilidad_analista:
      'Marco de política internacional para legitimar proyectos de economía social e innovación social.',
  },
  {
    id: 'ue-pilar-derechos-sociales',
    titulo: 'Plan de Acción del Pilar Europeo de Derechos Sociales',
    entidad: 'Comisión Europea',
    anio: 2021,
    ambito: 'ue',
    temas: ['derechos_sociales', 'pobreza', 'empleo', 'politica_publica', 'estrategia'],
    url: 'https://ec.europa.eu/social/main.jsp?catId=1607&langId=en',
    tipo: 'normativa',
    resumen:
      'Plan que fija tres objetivos UE para 2030: 78% de empleo, 60% de adultos en formación anual y reducción de al menos 15 millones de personas en riesgo de pobreza (5M niños).',
    utilidad_analista:
      'Objetivos europeos 2030 a los que anclar la teoría de cambio y la justificación de impacto de un proyecto.',
  },
  {
    id: 'fundacion-lealtad-donantes',
    titulo: 'La realidad de las ONG y de la donación en España',
    entidad: 'Fundación Lealtad',
    anio: 2023,
    ambito: 'espana',
    temas: ['donaciones', 'financiacion_privada', 'transparencia', 'base_social'],
    url: 'https://www.fundacionlealtad.org/publicaciones/',
    tipo: 'informe',
    resumen:
      'Estudios sobre el comportamiento del donante particular y empresarial, confianza en las ONG y evolución de la financiación privada del sector.',
    utilidad_analista:
      'Tendencias de financiación privada y confianza ciudadana para planes de captación de fondos.',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Índices + helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

/** Acceso O(1) por id. */
export const INFORME_BY_ID: Record<string, InformeTS> = Object.fromEntries(
  INFORMES.map((i) => [i.id, i]),
)

/** Nº total de informes del catálogo. */
export const INFORMES_COUNT = INFORMES.length

/** Lista de temas presentes (claves), ordenada y deduplicada. */
export function catalogTemas(): string[] {
  return Array.from(new Set(INFORMES.flatMap((i) => i.temas))).sort()
}

/** Lista de entidades publicadoras presentes, ordenada y deduplicada. */
export function catalogEntidades(): string[] {
  return Array.from(new Set(INFORMES.map((i) => i.entidad))).sort()
}

/** Lista de años presentes, ordenada descendente (más reciente primero). */
export function catalogAnios(): number[] {
  return Array.from(new Set(INFORMES.map((i) => i.anio))).sort((a, b) => b - a)
}

/** Lista de ámbitos presentes, en orden lógico. */
export function catalogAmbitos(): InformeAmbito[] {
  const order: InformeAmbito[] = ['espana', 'ccaa', 'ue', 'global']
  const present = new Set(INFORMES.map((i) => i.ambito))
  return order.filter((a) => present.has(a))
}

/** Lista de tipos presentes, en orden lógico. */
export function catalogTipos(): InformeTipo[] {
  const order: InformeTipo[] = ['informe', 'memoria', 'estadistica', 'dataset', 'normativa']
  const present = new Set(INFORMES.map((i) => i.tipo))
  return order.filter((t) => present.has(t))
}
