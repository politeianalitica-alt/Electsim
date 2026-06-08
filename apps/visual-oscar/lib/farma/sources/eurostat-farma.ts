/**
 * Cliente Eurostat · datasets de farmacia y salud · Politeia Farma v3
 *
 * Reusa el cliente JSON-stat genérico creado para Vivienda v3
 * (`lib/vivienda/sources/eurostat-vivienda.ts`) — la función
 * `fetchEurostatDataset` es agnóstica del sector y vale para cualquier
 * dataset Eurostat con dimensiones geo + time.
 *
 * Datasets farma:
 *   - hlth_sha11_hf       · Gasto sanitario corriente por esquema de
 *                            financiación (% PIB y per cápita en EUR PPS)
 *   - hlth_silc_29        · Necesidades médicas no cubiertas por dinero
 *                            (% adultos >16 años)
 *   - hlth_rs_prsrs       · Recursos sanitarios · personal farmacéutico
 *                            por 100 000 habitantes
 */
import { fetchEurostatDataset } from '@/lib/vivienda/sources/eurostat-vivienda'

/**
 * Gasto sanitario corriente del total de financiadores en % PIB.
 * España vs UE-27 + Eurozona + países de referencia.
 */
export async function fetchEurostatGastoSanitario(
  geo: string[] = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL'],
  yearsBack = 6
) {
  const currentYear = 2024
  const time = Array.from({ length: yearsBack + 1 }, (_, i) => String(currentYear - yearsBack + i))
  return fetchEurostatDataset({
    dataset: 'hlth_sha11_hf',
    geo,
    time,
    filters: {
      unit: 'PC_GDP',
      icha11_hf: 'TOT_HF',
    },
  })
}

/**
 * Necesidades médicas no cubiertas por motivos económicos
 * (% adultos >=16 años). Eurostat hlth_silc_29.
 */
export async function fetchEurostatAccesoMedicamentos(
  geo: string[] = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL', 'AT'],
  yearsBack = 6
) {
  const currentYear = 2024
  const time = Array.from({ length: yearsBack + 1 }, (_, i) => String(currentYear - yearsBack + i))
  return fetchEurostatDataset({
    dataset: 'hlth_silc_29',
    geo,
    time,
    filters: {
      sex: 'T',
      age: 'Y_GE16',
      isced11: 'TOTAL',
      quant_inc: 'TOTAL',
      reason: 'TOOEXP_FAR_NEXP',
    },
  })
}

/**
 * Personal farmacéutico por 100 000 habitantes.
 * Eurostat hlth_rs_prsrs.
 */
export async function fetchEurostatFarmaceuticosPob(
  geo: string[] = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL', 'AT', 'BE'],
  yearsBack = 5
) {
  const currentYear = 2023
  const time = Array.from({ length: yearsBack + 1 }, (_, i) => String(currentYear - yearsBack + i))
  return fetchEurostatDataset({
    dataset: 'hlth_rs_prsrs',
    geo,
    time,
    filters: {
      unit: 'P_HTHAB',
      isco08: 'OC2262',
    },
  })
}
