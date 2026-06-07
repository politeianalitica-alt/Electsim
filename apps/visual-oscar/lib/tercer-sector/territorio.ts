/**
 * lib/tercer-sector/territorio.ts · Orquestador (RED) de la capa TERRITORIAL del
 * cockpit de Tercer Sector · Sprint TS-Cockpit W1c.
 *
 * Responde a la pregunta del analista "¿dónde hay actividad, financiación,
 * compradores, concentración de entidades y HUECOS por CCAA?". Cruza cuatro
 * fuentes ya existentes en el data layer y delega TODA la agregación en el
 * núcleo PURO (`territorio-core.ts`, testeable sin red):
 *
 *   - Catálogo de organizaciones (`organizaciones-catalog.ts`) → nº de entidades,
 *     ingresos agregados, empleados agregados por CCAA de sede. Local, sin red.
 *   - Concesiones BDNS (`bdns.ts` · fetchConcesiones) → subvenciones recientes
 *     concedidas (dinero que ha llegado) agrupadas por la CCAA del CONVOCANTE
 *     (campo `territorio` = nivel2 BDNS) + beneficiarios top.
 *   - Convocatorias BDNS (`bdns.ts` · fetchConvocatorias) → convocatorias
 *     abiertas/recientes por CCAA del convocante (oportunidad activa).
 *   - Licitaciones (`licitaciones/{place,bdns}` connectors) → contratos públicos
 *     normalizados con `region`/`nivel`, agrupados por CCAA + compradores top.
 *     Solo PLACE + BDNS porque son los conectores ESPAÑOLES que aportan CCAA;
 *     los internacionales (TED/SEDIA/WorldBank/UK/Tenders.guru) no tienen CCAA.
 *
 * El contrato `TerritorioTS`, el agregador `buildTerritorio`, las reglas de
 * alerta `computeAlertas` y los helpers de atribución viven en el núcleo y se
 * RE-EXPORTAN aquí para que los consumidores tengan un único punto de entrada.
 *
 * Degradación honesta: cada fetch puede fallar de forma independiente; las
 * fuentes caídas se reportan en `fuentes_error` y la agregación continúa con lo
 * que haya. NUNCA lanza.
 */
import {
  ORGANIZACIONES,
} from './organizaciones-catalog'
import {
  fetchConcesiones,
  fetchConvocatorias,
} from './bdns'
import type { SourceResult } from './licitaciones/types'
import { fetchPlace } from './licitaciones/place'
import { fetchBdns } from './licitaciones/bdns'
import { buildTerritorio, type BuildTerritorioOpts, type TerritorioTS } from './territorio-core'

// Re-export del contrato + helpers puros (único punto de entrada del dominio).
export {
  buildTerritorio,
  computeAlertas,
  ccaaDeBdns,
  ccaaDeLicitacion,
  CCAA_DESCONOCIDA,
  CCAA,
} from './territorio-core'
export type {
  TerritorioTS,
  TerritorioRankItem,
  BuildTerritorioInputs,
  BuildTerritorioOpts,
  AlertaThresholds,
} from './territorio-core'

// ─────────────────────────────────────────────────────────────────────────
// Orquestador (RED) · fetchTerritorio · degradación honesta
// ─────────────────────────────────────────────────────────────────────────

export interface FetchTerritorioOpts {
  /** Páginas BDNS a recorrer (concesiones + convocatorias). Default 3, clamp 1-8. */
  pages?: number
  /** Timeout por fuente en ms. */
  timeoutMs?: number
  noCache?: boolean
  /** Override de opciones del agregador (umbrales/topN). */
  buildOpts?: BuildTerritorioOpts
}

/** Estado por-fuente para reporte honesto en el endpoint. */
export interface TerritorioFuenteStatus {
  fuente: string
  ok: boolean
  error?: string
  /** Nº de filas que aportó esta fuente (concesiones/convocatorias/licitaciones). */
  count: number
}

/** Resultado del orquestador: snapshots + estado de fuentes. */
export interface TerritorioResult {
  territorios: TerritorioTS[]
  fuentes_ok: string[]
  fuentes_error: { fuente: string; error: string }[]
  /** Detalle por fuente (incluye count) para el _meta del endpoint. */
  detalle_fuentes: TerritorioFuenteStatus[]
}

/**
 * Orquesta la foto territorial: lee el catálogo de organizaciones (local, sin
 * red), descarga concesiones + convocatorias BDNS y licitaciones (PLACE + BDNS),
 * y agrega con `buildTerritorio`.
 *
 * Degradación honesta: el catálogo de organizaciones siempre está disponible,
 * así que siempre hay al menos la foto de presencia de entidades aunque BDNS y
 * PLACE caigan. NUNCA lanza.
 */
export async function fetchTerritorio(
  opts: FetchTerritorioOpts = {},
): Promise<TerritorioResult> {
  const pages = Math.max(1, Math.min(8, opts.pages ?? 3))
  const passthrough = { timeoutMs: opts.timeoutMs, noCache: opts.noCache }

  const [conc, conv, place, licBdns] = await Promise.all([
    fetchConcesiones({ pages, ...passthrough }).catch(() => null),
    fetchConvocatorias({ pages, ...passthrough }).catch(() => null),
    fetchPlace(passthrough).catch((): SourceResult | null => null),
    fetchBdns({ pageSize: 50, ...passthrough }).catch((): SourceResult | null => null),
  ])

  const detalle_fuentes: TerritorioFuenteStatus[] = []
  const fuentes_ok: string[] = []
  const fuentes_error: { fuente: string; error: string }[] = []

  // Organizaciones: fuente local curada, siempre OK.
  const organizaciones = ORGANIZACIONES
  detalle_fuentes.push({ fuente: 'organizaciones_catalog', ok: true, count: organizaciones.length })
  fuentes_ok.push('organizaciones_catalog')

  // BDNS concesiones.
  const concesiones = conc?.ok && conc.data ? conc.data : []
  registerEnvelope('bdns_concesiones', conc?.ok ?? false, concesiones.length, conc?.error, detalle_fuentes, fuentes_ok, fuentes_error)

  // BDNS convocatorias.
  const convocatorias = conv?.ok && conv.data ? conv.data : []
  registerEnvelope('bdns_convocatorias', conv?.ok ?? false, convocatorias.length, conv?.error, detalle_fuentes, fuentes_ok, fuentes_error)

  // Licitaciones: PLACE + BDNS (ambos españoles → aportan CCAA). Se concatenan.
  const licPlace = place?.ok ? place.licitaciones : []
  registerEnvelope('licitaciones_place', place?.ok ?? false, licPlace.length, place?.error, detalle_fuentes, fuentes_ok, fuentes_error)

  const licBdnsList = licBdns?.ok ? licBdns.licitaciones : []
  registerEnvelope('licitaciones_bdns', licBdns?.ok ?? false, licBdnsList.length, licBdns?.error, detalle_fuentes, fuentes_ok, fuentes_error)

  const licitaciones = [...licPlace, ...licBdnsList]

  const territorios = buildTerritorio({
    organizaciones,
    concesiones,
    convocatorias,
    licitaciones,
    opts: opts.buildOpts,
  })

  return { territorios, fuentes_ok, fuentes_error, detalle_fuentes }
}

/** Helper interno: registra el estado de una fuente en los acumuladores. */
function registerEnvelope(
  fuente: string,
  ok: boolean,
  count: number,
  error: string | undefined,
  detalle: TerritorioFuenteStatus[],
  okList: string[],
  errList: { fuente: string; error: string }[],
): void {
  detalle.push({ fuente, ok, error: ok ? undefined : error || 'error', count })
  if (ok) okList.push(fuente)
  else errList.push({ fuente, error: error || 'error' })
}
