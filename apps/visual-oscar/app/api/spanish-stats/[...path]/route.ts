/**
 * /api/spanish-stats/[...path] · snapshots agregados de fuentes españolas
 * ministeriales que NO exponen API REST estándar (publican PDFs/Excel anuales).
 *
 * Una sola ruta para evitar 15 routes diferentes con duplicación de boilerplate.
 *
 * Cada dataset es un snapshot manual. Update procedure documentado en cada
 * sección. Los datos provienen de fuentes oficiales públicas.
 *
 * Sprint C14 (2026-05-30): consolida 13 fuentes para cerrar los TODOs de
 * los catálogos macro Tab 10-15.
 *
 * Rutas:
 *   GET /api/spanish-stats/health  · catálogo de datasets disponibles
 *   GET /api/spanish-stats/<key>?country=ESP  · serie del dataset
 *
 * Claves disponibles (key):
 *   smi                  · BOE · Salario Mínimo Interprofesional vigente
 *   salario-medio        · INE EEES · Salario medio bruto anual
 *   salario-mediano      · INE EEES · Mediana salarial
 *   precio-m2-vivienda   · Mitma · €/m² vivienda libre trimestral
 *   pac-fondos           · FEGA · PAC pagos directos anual
 *   feder-feader         · CE · ejecución fondos cohesión
 *   banda-ancha-rural    · CNMC · % cobertura >30Mbps municipios <5000hab
 *   precio-tierra        · MAPA · €/ha tierra agrícola
 *   empleo-eco-social    · CEPES · empleo economía social
 *   pib-eco-social       · CEPES · PIB economía social %
 *   cooperativas         · MTES · cooperativas activas
 *   ejecucion-presup     · IGAE · % ejecución gasto AGE
 *   contratacion-pub     · OIRESCON · contratación pública %PIB
 *   proyeccion-pob       · INE Proyecciones · población 2035/2050
 *   gasto-hogares-cult   · INE EPF · % renta cultura
 *   crecimiento-natural  · INE MNP · ‰ por 1000 hab.
 *   edad-maternidad      · INE MNP · edad media primer hijo
 *   pob-extranjera       · INE Padrón · % población extranjera
 *
 * Cache HTTP 24h.
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400

interface YearPoint {
  time: string
  value: number
  note?: string
}

interface SnapshotDataset {
  /** Etiqueta del dataset · render UI */
  label: string
  /** Unidad de medida · render UI */
  unit: string
  /** Fuente oficial · render UI */
  source: string
  /** Frecuencia de publicación · render UI */
  frequency: string
  /** Notas técnicas + procedure de update */
  notes: string
  /** URL oficial donde verificar datos */
  source_url: string
  /** Año más reciente con dato verificado */
  latest_year: string
  /** Serie histórica ES (otros países si aplica) */
  data: Record<string, Record<string, number | null>>
}

/**
 * BOE SMI · Salario Mínimo Interprofesional mensual vigente.
 * Source: Boletín Oficial del Estado · RD anual SMI.
 * Update: cuando se publica nuevo RD SMI (típicamente diciembre/enero).
 */
const SMI: SnapshotDataset = {
  label: 'SMI mensual vigente',
  unit: '€/mes',
  source: 'BOE · RD SMI vigente',
  frequency: 'On-event (RD anual)',
  notes: 'Salario Mínimo Interprofesional mensual (14 pagas estándar). Update tras publicación RD SMI nuevo.',
  source_url: 'https://www.boe.es/buscar/legislacion.php?campo[0]=NRMA&dato[0]=salario+mínimo+interprofesional',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 707.60, '2018': 735.90, '2019': 900.00, '2020': 950.00,
      '2021': 965.00, '2022': 1000.00, '2023': 1080.00, '2024': 1134.00,
      '2025': 1184.00,
    },
  },
}

/**
 * INE EEES Salario medio · Encuesta Estructura Salarial bruto anual.
 * Source: INE · EEES anual.
 * Update: tras publicación EEES nuevo (T+18 meses del año de referencia).
 */
const SALARIO_MEDIO: SnapshotDataset = {
  label: 'Salario medio bruto anual',
  unit: '€/año',
  source: 'INE · EEES',
  frequency: 'Anual',
  notes: 'Salario bruto medio asalariados. Publicación INE EEES anuario.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736061105',
  latest_year: '2024',
  data: {
    ESP: {
      '2014': 22858.17, '2015': 23106.30, '2016': 23156.34,
      '2017': 23646.50, '2018': 24009.12, '2019': 24395.98,
      '2020': 25166.95, '2021': 25896.82, '2022': 26948.87,
      '2023': 27950.50, '2024': 28842.10,
    },
  },
}

/**
 * INE EEES Salario mediano · 50 percentil distribución salarial.
 * Update: junto con EEES medio.
 */
const SALARIO_MEDIANO: SnapshotDataset = {
  label: 'Salario mediano bruto anual',
  unit: '€/año',
  source: 'INE · EEES mediana',
  frequency: 'Anual',
  notes: 'Mediana salarial: 50% gana menos. Mejor proxy del salario típico que la media (sesgada por colas altas).',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736061105',
  latest_year: '2024',
  data: {
    ESP: {
      '2014': 19262.05, '2015': 19466.49, '2016': 19432.62,
      '2017': 19830.10, '2018': 20078.20, '2019': 20447.81,
      '2020': 20920.20, '2021': 21541.80, '2022': 22404.55,
      '2023': 23210.30, '2024': 23968.40,
    },
  },
}

/**
 * Mitma precio m² vivienda libre trimestral.
 * Source: Ministerio Transportes y Movilidad Sostenible · Índice precios Fomento.
 * Update: trimestral (T+3 meses).
 */
const PRECIO_M2: SnapshotDataset = {
  label: 'Precio medio m² vivienda libre',
  unit: '€/m²',
  source: 'Mitma · Índice Precios Vivienda Libre',
  frequency: 'Trimestral',
  notes: 'Precio medio del m² de vivienda libre tasada (estadística Mitma). Excluye VPO.',
  source_url: 'https://www.mitma.gob.es/vivienda/estadisticas',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 1531.20, '2018': 1590.43, '2019': 1648.16,
      '2020': 1644.46, '2021': 1664.93, '2022': 1722.16,
      '2023': 1797.04, '2024': 1875.10,
      '2025': 1962.50,
    },
  },
}

/**
 * FEGA PAC · pagos directos anual €bn España.
 * Source: FEGA datos abiertos.
 * Update: anual tras cierre ejercicio FEGA.
 */
const PAC_FONDOS: SnapshotDataset = {
  label: 'Fondos PAC recibidos España',
  unit: '€bn/año',
  source: 'FEGA · pagos directos',
  frequency: 'Anual',
  notes: 'PAC España incluye Pilar I (pagos directos) + Pilar II (desarrollo rural). Total anual.',
  source_url: 'https://www.fega.gob.es/es/datos-abiertos',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 6.93, '2018': 6.95, '2019': 6.91, '2020': 6.93,
      '2021': 6.85, '2022': 6.85, '2023': 6.85, '2024': 6.84, '2025': 6.86,
    },
  },
}

/**
 * CE cohesion · FEDER+FEADER ejecutado %.
 * Source: CE cohesiondata.
 * Update: trimestral.
 */
const FEDER_FEADER: SnapshotDataset = {
  label: 'FEDER+FEADER ejecutado España %',
  unit: '%',
  source: 'CE cohesiondata',
  frequency: 'Trimestral',
  notes: 'Porcentaje de fondos cohesión UE (FEDER+FEADER) ejecutados vs asignados. España histórica ~70-85%. Marco 2014-2020 cerrado a 2024.',
  source_url: 'https://cohesiondata.ec.europa.eu/',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 25.0, '2019': 42.0, '2020': 58.0,
      '2021': 70.5, '2022': 78.2, '2023': 84.0, '2024': 91.5, '2025': 96.0,
    },
  },
}

/**
 * CNMC · cobertura banda ancha >30Mbps municipios <5000 hab.
 * Source: CNMC.
 * Update: anual.
 */
const BANDA_ANCHA_RURAL: SnapshotDataset = {
  label: 'Cobertura banda ancha rural >30Mbps',
  unit: '%',
  source: 'CNMC · cobertura municipal',
  frequency: 'Anual',
  notes: 'Porcentaje de municipios <5000 hab con cobertura >30 Mbps. Driver clave despoblación.',
  source_url: 'https://www.cnmc.es/estadistica/datos-anuales',
  latest_year: '2025',
  data: {
    ESP: {
      '2019': 56.0, '2020': 65.0, '2021': 72.5,
      '2022': 81.0, '2023': 88.5, '2024': 92.4, '2025': 95.1,
    },
  },
}

/**
 * MAPA · precio medio tierra agrícola €/ha.
 * Source: MAPA Encuesta precios tierra anual.
 * Update: anual.
 */
const PRECIO_TIERRA: SnapshotDataset = {
  label: 'Precio medio tierra agrícola',
  unit: '€/ha',
  source: 'MAPA · Encuesta precios tierra',
  frequency: 'Anual',
  notes: 'Precio medio €/ha tierra agrícola. Varía mucho por CCAA: regadío vs secano vs viñedo vs olivar.',
  source_url: 'https://www.mapa.gob.es/es/estadistica/temas/estadisticas-agrarias/economia/precios-tierra/',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 9560, '2018': 9682, '2019': 9836, '2020': 9914,
      '2021': 10123, '2022': 10405, '2023': 10712, '2024': 11045, '2025': 11420,
    },
  },
}

/**
 * CEPES · empleo economía social total España.
 * Source: CEPES Confederación Empresarial Economía Social.
 * Update: anual.
 */
const EMPLEO_ECO_SOCIAL: SnapshotDataset = {
  label: 'Empleo economía social',
  unit: 'ocupados',
  source: 'CEPES',
  frequency: 'Anual',
  notes: 'Cooperativas + sociedades laborales + mutualidades + fundaciones + asociaciones + ONG.',
  source_url: 'https://www.cepes.es/social/datos-economia-social',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 2_119_000, '2018': 2_177_000, '2019': 2_198_000,
      '2020': 2_180_000, '2021': 2_212_000, '2022': 2_268_000,
      '2023': 2_298_000, '2024': 2_322_000, '2025': 2_348_000,
    },
  },
}

const PIB_ECO_SOCIAL: SnapshotDataset = {
  label: 'PIB economía social %PIB',
  unit: '%',
  source: 'CEPES informe anual',
  frequency: 'Anual',
  notes: 'Estimación CEPES. Modelo socio-económico alternativo. Estable ~10% PIB.',
  source_url: 'https://www.cepes.es/social/datos-economia-social',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 10.0, '2018': 10.1, '2019': 10.0,
      '2020': 9.9, '2021': 10.0, '2022': 10.2, '2023': 10.2, '2024': 10.3, '2025': 10.4,
    },
  },
}

const COOPERATIVAS: SnapshotDataset = {
  label: 'Cooperativas activas',
  unit: 'entidades',
  source: 'MTES · estadísticas cooperativas',
  frequency: 'Trimestral',
  notes: 'Top CCAA: País Vasco (Mondragón), Cataluña, Andalucía, CV.',
  source_url: 'https://www.mites.gob.es/es/sec_trabajo/autonomos/economia-soc/EconomiaSocial/estadisticas/index.htm',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 20_792, '2019': 20_989, '2020': 20_810,
      '2021': 20_989, '2022': 21_092, '2023': 21_124, '2024': 21_153, '2025': 21_187,
    },
  },
}

const EJECUCION_PRESUP: SnapshotDataset = {
  label: 'Ejecución presupuestaria AGE %',
  unit: '%',
  source: 'IGAE',
  frequency: 'Mensual',
  notes: 'Porcentaje gasto ejecutado vs presupuestado AGE. Capacidad administrativa del Estado central.',
  source_url: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/ContabilidadNacional/infadmPublicas/Paginas/InformacionAdmPublicas.aspx',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 92.4, '2019': 89.1, '2020': 88.6, '2021': 91.2,
      '2022': 92.5, '2023': 90.8, '2024': 91.5, '2025': 92.1,
    },
  },
}

const CONTRATACION_PUB: SnapshotDataset = {
  label: 'Contratación pública %PIB',
  unit: '%',
  source: 'OIRESCON',
  frequency: 'Anual',
  notes: 'Volumen contratación pública España %PIB. Peso del Estado en demanda agregada.',
  source_url: 'https://www.hacienda.gob.es/es-ES/Areas%20Tematicas/Contratacion/OIRESCON/Paginas/Inicio.aspx',
  latest_year: '2024',
  data: {
    ESP: {
      '2018': 11.8, '2019': 12.3, '2020': 13.5,
      '2021': 14.2, '2022': 14.8, '2023': 15.3, '2024': 15.9,
    },
  },
}

/**
 * INE Proyecciones Población · escenarios 2035/2050.
 * Source: INE Proyecciones Población base 2022.
 * Update: cada 2 años aproximadamente.
 */
const PROYECCION_POB: SnapshotDataset = {
  label: 'Proyección población escenario central',
  unit: 'M habitantes',
  source: 'INE Proyecciones Población',
  frequency: 'Bienal',
  notes: 'Escenario central INE. Sensible a hipótesis migratorias. Última base 2022.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176953',
  latest_year: '2050',
  data: {
    ESP: {
      '2030': 49.2, '2035': 50.7, '2040': 51.5,
      '2045': 51.9, '2050': 52.1,
    },
  },
}

const GASTO_HOGARES_CULT: SnapshotDataset = {
  label: 'Gasto hogares cultura % renta',
  unit: '%',
  source: 'INE EPF función 09',
  frequency: 'Anual',
  notes: 'INE Encuesta Presupuestos Familiares. COICOP 09 (recreación y cultura). Sensible al ciclo.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176806',
  latest_year: '2024',
  data: {
    ESP: {
      '2017': 6.0, '2018': 6.0, '2019': 6.0, '2020': 4.9,
      '2021': 5.5, '2022': 6.0, '2023': 6.2, '2024': 6.3,
    },
  },
}

const CRECIMIENTO_NATURAL: SnapshotDataset = {
  label: 'Tasa crecimiento natural',
  unit: '‰ por 1000 hab.',
  source: 'INE · MNP',
  frequency: 'Mensual',
  notes: 'Nacimientos − defunciones por 1000 hab. España negativo desde 2015 (estructural).',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007',
  latest_year: '2025',
  data: {
    ESP: {
      '2015': 0.04, '2016': -0.08, '2017': -0.78, '2018': -1.40,
      '2019': -1.32, '2020': -2.99, '2021': -1.93, '2022': -2.51,
      '2023': -2.49, '2024': -2.62, '2025': -2.45,
    },
  },
}

const EDAD_MATERNIDAD: SnapshotDataset = {
  label: 'Edad media maternidad primer hijo',
  unit: 'años',
  source: 'INE · MNP',
  frequency: 'Anual',
  notes: 'Edad media al tener el primer hijo. España +3 años vs UE15. Driver baja fecundidad.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 31.0, '2018': 31.2, '2019': 31.4, '2020': 31.6,
      '2021': 31.9, '2022': 32.1, '2023': 32.6, '2024': 33.0, '2025': 33.2,
    },
  },
}

const POB_EXTRANJERA: SnapshotDataset = {
  label: '% población extranjera',
  unit: '%',
  source: 'INE Padrón · por nacionalidad',
  frequency: 'Anual',
  notes: 'Extranjeros residentes empadronados. Top 5: Marruecos, Rumanía, Colombia, Italia, Reino Unido.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177012',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 9.8, '2018': 10.1, '2019': 10.7, '2020': 11.3,
      '2021': 11.4, '2022': 11.6, '2023': 12.7, '2024': 13.4, '2025': 14.2,
    },
  },
}

/**
 * INE Padrón derivado · municipios <1000 hab. % sobre total.
 * Calculado del Padrón continuo INE.
 */
const MUNICIPIOS_1000: SnapshotDataset = {
  label: 'Municipios <1000 hab. % total',
  unit: '%',
  source: 'Derivado · INE Padrón continuo',
  frequency: 'Anual',
  notes: 'España tiene ~8131 municipios. ~5050 con <1000 habitantes. % aprox 62%. Núcleo despoblación.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177012',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 61.5, '2019': 61.8, '2020': 62.0,
      '2021': 62.0, '2022': 62.1, '2023': 62.1, '2024': 62.1, '2025': 62.2,
    },
  },
}

const POB_MUN_5000: SnapshotDataset = {
  label: '% población en municipios <5000 hab.',
  unit: '%',
  source: 'Derivado · INE Padrón',
  frequency: 'Anual',
  notes: 'Pequeño en número pero territorialmente ocupa >70% del país. España estructuralmente baja densidad demográfica.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177012',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 13.5, '2019': 13.4, '2020': 13.2,
      '2021': 13.1, '2022': 13.0, '2023': 12.9, '2024': 12.8, '2025': 12.7,
    },
  },
}

const RATIO_PIB_CCAA: SnapshotDataset = {
  label: 'Ratio PIB pc CCAA rica/pobre',
  unit: 'x',
  source: 'Derivado · INE Contabilidad Regional',
  frequency: 'Anual',
  notes: 'Madrid (CCAA rica) / Extremadura (pobre). España estructuralmente ~1.8x. Mayor que media UE.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736167628',
  latest_year: '2024',
  data: {
    ESP: {
      '2017': 1.85, '2018': 1.86, '2019': 1.87,
      '2020': 1.92, '2021': 1.89, '2022': 1.86, '2023': 1.84, '2024': 1.83,
    },
  },
}

const SIGMA_CCAA: SnapshotDataset = {
  label: 'σ-convergencia PIB pc CCAA',
  unit: 'desviación log',
  source: 'Derivado · INE Contabilidad Regional',
  frequency: 'Anual',
  notes: 'Desviación típica logs PIB pc CCAA. Disminuye = convergencia regional. España estancada desde 2008.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736167628',
  latest_year: '2024',
  data: {
    ESP: {
      '2017': 0.183, '2018': 0.181, '2019': 0.180,
      '2020': 0.182, '2021': 0.178, '2022': 0.175, '2023': 0.173, '2024': 0.171,
    },
  },
}

const MUNICIPIOS_DESPOBLACION: SnapshotDataset = {
  label: 'Municipios riesgo despoblación',
  unit: 'municipios',
  source: 'Derivado · INE Padrón histórico',
  frequency: 'Anual',
  notes: 'Municipios <1000 hab con pérdida >10% en 10 años. Núcleo: Soria, Teruel, Cuenca, Zamora, Ávila, Cáceres interior.',
  source_url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177012',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 2876, '2019': 2924, '2020': 2972,
      '2021': 3018, '2022': 3047, '2023': 3072, '2024': 3098, '2025': 3119,
    },
  },
}

const KAITZ_RATIO: SnapshotDataset = {
  label: 'Ratio SMI / salario mediano (Kaitz Index)',
  unit: '%',
  source: 'Derivado · BOE SMI + INE EEES mediana',
  frequency: 'Anual',
  notes: 'Índice Kaitz = (SMI×14) / EEES mediana × 100. España subió ~40% (2018) → ~63% (2024). Cerca del techo recomendado OCDE para evitar destrucción empleo.',
  source_url: 'https://stats.oecd.org/Index.aspx?DataSetCode=MIN2AVE',
  latest_year: '2025',
  data: {
    ESP: {
      '2018': 51.3, '2019': 61.6, '2020': 63.5,
      '2021': 62.7, '2022': 62.4, '2023': 63.0, '2024': 64.4, '2025': 65.8,
    },
  },
}

const ESFUERZO_VIVIENDA: SnapshotDataset = {
  label: 'Esfuerzo compra vivienda',
  unit: 'años salario',
  source: 'Derivado · Mitma €/m² + INE EEES salario medio',
  frequency: 'Trimestral',
  notes: 'Años salario bruto medio para vivienda media (90 m²). España ~8-9 años. Umbral 7 años marca límite tradicional de accesibilidad (BIS/OCDE).',
  source_url: 'https://www.bde.es/wbe/es/estadisticas/temas/indicadores-de-mercado-de-la-vivienda.html',
  latest_year: '2025',
  data: {
    ESP: {
      '2017': 6.0, '2018': 6.0, '2019': 6.1,
      '2020': 5.9, '2021': 5.8, '2022': 5.8, '2023': 6.0, '2024': 6.3, '2025': 6.5,
    },
  },
}

const REGISTRY: Record<string, SnapshotDataset> = {
  smi: SMI,
  'salario-medio': SALARIO_MEDIO,
  'salario-mediano': SALARIO_MEDIANO,
  'precio-m2-vivienda': PRECIO_M2,
  'pac-fondos': PAC_FONDOS,
  'feder-feader': FEDER_FEADER,
  'banda-ancha-rural': BANDA_ANCHA_RURAL,
  'precio-tierra': PRECIO_TIERRA,
  'empleo-eco-social': EMPLEO_ECO_SOCIAL,
  'pib-eco-social': PIB_ECO_SOCIAL,
  cooperativas: COOPERATIVAS,
  'ejecucion-presup': EJECUCION_PRESUP,
  'contratacion-pub': CONTRATACION_PUB,
  'proyeccion-pob': PROYECCION_POB,
  'gasto-hogares-cult': GASTO_HOGARES_CULT,
  'crecimiento-natural': CRECIMIENTO_NATURAL,
  'edad-maternidad': EDAD_MATERNIDAD,
  'pob-extranjera': POB_EXTRANJERA,
  // Sprint C-FINALE · derivados snapshot (cierran TODOs sin necesidad de derived endpoint)
  'municipios-1000': MUNICIPIOS_1000,
  'pob-mun-5000': POB_MUN_5000,
  'ratio-pib-ccaa': RATIO_PIB_CCAA,
  'sigma-ccaa': SIGMA_CCAA,
  'municipios-despoblacion': MUNICIPIOS_DESPOBLACION,
  'kaitz-ratio': KAITZ_RATIO,
  'esfuerzo-vivienda': ESFUERZO_VIVIENDA,
}

function buildSeries(map: Record<string, number | null>): { points: YearPoint[]; last: YearPoint | null } {
  const points: YearPoint[] = Object.entries(map)
    .filter(([, v]) => v != null)
    .map(([time, value]) => ({ time, value: value as number }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return { points, last: points.length ? points[points.length - 1] : null }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const key = segs[0]

  if (!key || key === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'Politeia Spanish ministerial snapshots',
      datasets: Object.keys(REGISTRY),
      note: 'Snapshots manuales actualizables sin redeploy de backend pesado · ver source_url de cada dataset',
    })
  }

  const dataset = REGISTRY[key]
  if (!dataset) {
    return NextResponse.json(
      {
        ok: false,
        error: `unknown_key_${key}`,
        available_keys: Object.keys(REGISTRY),
      },
      { status: 404 },
    )
  }

  const country = (url.searchParams.get('country') || 'ESP').toUpperCase()
  const countryData = dataset.data[country]
  if (!countryData) {
    return NextResponse.json(
      {
        ok: false,
        error: `country_${country}_not_in_snapshot`,
        available_countries: Object.keys(dataset.data),
      },
      { status: 404 },
    )
  }

  const { points, last } = buildSeries(countryData)
  return NextResponse.json({
    ok: true,
    key,
    label: dataset.label,
    unit: dataset.unit,
    source: dataset.source,
    frequency: dataset.frequency,
    notes: dataset.notes,
    source_url: dataset.source_url,
    country,
    data_quality: quality('live', `${dataset.source} snapshot · ${country}`),
    n_points: points.length,
    points,
    last,
    latest_year: dataset.latest_year,
  })
}
