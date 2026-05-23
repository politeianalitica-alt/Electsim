/**
 * Catálogo de cruces CIS para hogares-empleo-vivienda (Sprint N4).
 *
 * Cada entrada cruza una serie CIS (problema percibido) con un indicador
 * económico real para detectar desalineamientos entre macro y percepción.
 *
 * Las rutas /macro/hogares-empleo-vivienda/cis/[id] abren un CISCruceLanding
 * con la serie CIS + indicador económico + lectura Groq del gap.
 */

export interface HogaresCisCrossing {
  id: string
  label: string
  shortLabel: string
  accent: string
  description: string
  /** Tag del problema en el barómetro CIS (texto que aparece en la pregunta de problemas) */
  cisProblemTag: string
  /** Endpoint CIS catch-all para obtener la serie (passthrough · puede devolver empty) */
  cisEndpoint: string
  /** Indicador económico del catálogo que el problema CIS refleja o anticipa */
  economicIndicatorId: string
  /** Pregunta analítica */
  analyticalQuestion: string
  /** Interpretación esperada de Groq sobre el desalineamiento */
  interpretationHint: string
}

export const HOGARES_CIS_CROSSINGS: HogaresCisCrossing[] = [
  {
    id: 'vivienda-problema',
    label: 'Vivienda como problema · CIS',
    shortLabel: 'Vivienda CIS',
    accent: '#dc2626',
    description:
      'Porcentaje de españoles que cita "vivienda / alquiler / hipotecas" entre los principales problemas del país en el barómetro CIS mensual. Crítico porque ha pasado de problema marginal (~5%) a top-3 en menos de 3 años.',
    cisProblemTag: 'vivienda',
    cisEndpoint: '/api/cis/problemas?tag=vivienda',
    economicIndicatorId: 'hev-ipv-general',
    analyticalQuestion:
      '¿La saliencia política de la vivienda en el CIS está alineada con la subida del IPV/alquiler real, o es presión política independiente?',
    interpretationHint:
      'Si IPV sube +X% YoY y CIS-vivienda crece más rápido, la percepción está acelerando antes que los datos económicos — alerta política. Si IPV sube pero CIS-vivienda se estabiliza, la presión se está naturalizando.',
  },
  {
    id: 'paro-problema',
    label: 'Paro como problema · CIS',
    shortLabel: 'Paro CIS',
    accent: '#f59e0b',
    description:
      'Porcentaje que cita "paro / desempleo" entre los principales problemas. Históricamente el #1 problema en España (>50% en crisis 2012-2015), ha caído al ~30-40% en expansión actual pero sigue siendo dominante.',
    cisProblemTag: 'paro',
    cisEndpoint: '/api/cis/problemas?tag=paro',
    economicIndicatorId: 'hev-paro-epa-general',
    analyticalQuestion:
      '¿La caída del paro EPA se traduce en menor saliencia del paro como problema CIS? ¿Hay desfase de meses?',
    interpretationHint:
      'El paro CIS suele tardar 2-3 trimestres en reflejar mejoras EPA reales. Si paro EPA baja pero CIS-paro sigue alto, el "miedo al paro" persiste por experiencias recientes o por sectores donde la mejora no ha llegado.',
  },
  {
    id: 'precios-problema',
    label: 'Precios/Inflación como problema · CIS',
    shortLabel: 'Precios CIS',
    accent: '#8b5cf6',
    description:
      'Porcentaje que cita "precios / inflación / coste de vida" entre los principales problemas. Surge fuerte tras 2022 con el shock energético y se mantiene como top-5 incluso con IPC normalizado.',
    cisProblemTag: 'precios',
    cisEndpoint: '/api/cis/problemas?tag=precios',
    economicIndicatorId: 'hev-ipc-anual',
    analyticalQuestion:
      '¿La saliencia de precios/inflación en CIS sigue el IPC anual o el IPC acumulado de los últimos 3 años (efecto memoria)?',
    interpretationHint:
      'CIS-precios suele responder más al IPC acumulado (poder adquisitivo perdido) que al IPC instantáneo. España acumula ~15% IPC 2021-2024, lo que explica la persistencia del problema percibido incluso con inflación volviendo al 2%.',
  },
]

export function getHogaresCisCrossing(id: string): HogaresCisCrossing | undefined {
  return HOGARES_CIS_CROSSINGS.find((c) => c.id === id)
}

export function listHogaresCisCrossings(): HogaresCisCrossing[] {
  return HOGARES_CIS_CROSSINGS.slice()
}
