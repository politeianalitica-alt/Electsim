/**
 * Catálogo de segmentos sociales para hogares-empleo-vivienda (Sprint N4).
 *
 * Cada segmento define un sub-grupo poblacional con indicadores prioritarios
 * y narrativa específica. Las rutas /macro/hogares-empleo-vivienda/segment/[id]
 * abren un SegmentLanding filtrado para ese grupo.
 */

export interface HogaresSegment {
  id: string
  label: string
  shortLabel: string
  accent: string
  description: string
  /** Indicadores del catálogo hogares-empleo-vivienda que más afectan a este segmento */
  priorityIndicators: string[]
  /** Pregunta analítica que el segmento debe responder */
  analyticalQuestion: string
  /** Datasets datos.gob.es relevantes (keywords para el radar) */
  relatedKeywords: string[]
}

export const HOGARES_SEGMENTS: HogaresSegment[] = [
  {
    id: 'jovenes-25-34',
    label: 'Jóvenes 25-34',
    shortLabel: 'Jóvenes',
    accent: '#8b5cf6',
    description:
      'Cohorte clave para emancipación y formación de hogares. Sufre triple presión: paro juvenil estructural, salario inicial bajo y alquiler/precio vivienda fuera de su renta.',
    priorityIndicators: ['hev-paro-epa-jovenes', 'hev-ipv-general', 'hev-etcl-coste-laboral'],
    analyticalQuestion: '¿Pueden los jóvenes españoles emanciparse, formar hogar y tener vivienda con su renta actual?',
    relatedKeywords: ['jóvenes', 'emancipación', 'paro juvenil', 'alquiler joven', 'vivienda joven'],
  },
  {
    id: 'hipotecados',
    label: 'Hipotecados',
    shortLabel: 'Hipotecas',
    accent: '#dc2626',
    description:
      'Hogares con hipoteca activa cuya cuota está expuesta a las subidas de tipos. Cada +100pb del 10Y se traslada en meses a la cuota efectiva en hipotecas a tipo variable.',
    priorityIndicators: ['hev-paro-epa-general', 'hev-ipv-general'],
    analyticalQuestion: '¿Qué proporción de la renta familiar absorbe ya la cuota hipotecaria y cuánto margen queda ante nuevas subidas?',
    relatedKeywords: ['hipoteca', 'tipos hipotecarios', 'euribor', 'cuota hipoteca', 'deuda familiar'],
  },
  {
    id: 'inquilinos',
    label: 'Inquilinos',
    shortLabel: 'Alquiler',
    accent: '#f59e0b',
    description:
      'Hogares en régimen de alquiler. Vulnerables a la presión del precio del alquiler frente a salarios reales y a la escasez de oferta en áreas tensionadas (Madrid, Barcelona, Baleares, Málaga).',
    priorityIndicators: ['hev-ipv-general', 'hev-ipc-anual', 'hev-etcl-coste-laboral'],
    analyticalQuestion: '¿Cuál es el ratio alquiler/renta y cuántos hogares cruzan el umbral del 40% de sobrecarga habitacional?',
    relatedKeywords: ['alquiler', 'arrendamiento', 'precio alquiler', 'vivienda alquiler', 'inquilinos'],
  },
  {
    id: 'hogares-vulnerables',
    label: 'Hogares vulnerables (AROPE)',
    shortLabel: 'AROPE',
    accent: '#7c3aed',
    description:
      'Hogares en riesgo de pobreza o exclusión social (AROPE). Combinación de pobreza monetaria + carencia material severa + baja intensidad laboral. España persiste por encima de la media UE.',
    priorityIndicators: ['hev-paro-epa-general', 'hev-ipc-anual'],
    analyticalQuestion: '¿La mejora del empleo agregado está reduciendo AROPE o se concentra en hogares de renta media-alta?',
    relatedKeywords: ['pobreza', 'exclusión social', 'AROPE', 'IMV', 'prestaciones sociales'],
  },
  {
    id: 'rentas-bajas',
    label: 'Rentas bajas (Q1-Q2)',
    shortLabel: 'Q1-Q2',
    accent: '#16a34a',
    description:
      'Hogares en los dos primeros quintiles de renta. Mayor proporción de gasto en bienes inelásticos (alimentos, energía, vivienda) y por tanto más sensibles a inflación y precios regulados.',
    priorityIndicators: ['hev-ipc-anual', 'hev-etcl-coste-laboral'],
    analyticalQuestion: '¿La inflación impacta de forma desproporcionada en Q1-Q2 vía cesta de bienes básicos?',
    relatedKeywords: ['decil renta', 'desigualdad', 'IPC alimentos', 'energía hogar', 'pobreza energética'],
  },
]

export function getHogaresSegment(id: string): HogaresSegment | undefined {
  return HOGARES_SEGMENTS.find((s) => s.id === id)
}

export function listHogaresSegments(): HogaresSegment[] {
  return HOGARES_SEGMENTS.slice()
}
