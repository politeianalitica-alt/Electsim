/**
 * Catálogo curado de ONGD españolas reportantes en IATI · TS2-iati.
 *
 * IATI identifica a cada organización por su `iati-identifier`. Para las ONGD
 * españolas el patrón es `ES-CIF-<CIF>` (publishers privados) o un identificador
 * de directorio público (`ES-DIR3-*`, `XM-DAC-*`) para la administración.
 *
 * Refs VERIFICADAS (sprint design + IATI Registry + endpoint legacy
 * `app/api/iati/spain-overview/route.ts`). Este catálogo es solo un punto de
 * partida curado y datado: el directorio dinámico real se resuelve contra el
 * Registry CKAN (keyless) en `iati-orgs.ts`. No hardcodea métricas, solo la
 * correspondencia ref↔nombre↔slug que la API no devuelve "bonita".
 *
 * Por qué curar refs: el Datastore filtra por `reporting_org_ref` exacto y el
 * Registry indexa por `slug` CKAN, que no siempre coincide con el nombre legible
 * ni con el CIF. Tener ambos permite (a) construir la query de overview y
 * (b) marcar `curated_spanish:true` al cruzar el listado del Registry.
 *
 * Mantener SIN duplicar nombres con `app/api/iati/spain-overview` (ese módulo
 * legacy tiene su propio subset; aquí es el catálogo canónico de TS v3, más
 * amplio y con slug). Datado: 2026-06-07.
 */

/** Una ONGD/organización española curada con sus identificadores IATI. */
export interface CuratedOrg {
  /** iati-identifier (reporting_org_ref) para el Datastore. */
  iati_ref: string
  /** Nombre legible canónico. */
  name: string
  /**
   * Slugs candidatos del Registry CKAN (organization_show?id=<slug>). Varios
   * porque el slug histórico no siempre es estable; el primero que resuelva
   * gana. Vacío si no se conoce (se intenta casar por iati_ref/nombre).
   */
  registry_slugs: string[]
}

/**
 * Refs curadas. Orden = relevancia editorial (grandes ONGD + AECID).
 * Las marcadas con slug vacío se intentan casar por iati_ref al recorrer el
 * Registry (que expone `publisher_iati_id`).
 */
export const CURATED_SPANISH_ORGS: CuratedOrg[] = [
  {
    iati_ref: 'ES-CIF-G58236803',
    name: 'Oxfam Intermón',
    registry_slugs: ['oxfamintermon', 'intermon-oxfam'],
  },
  {
    iati_ref: 'ES-CIF-G81164105',
    name: 'Acción contra el Hambre',
    registry_slugs: ['accioncontraelhambre', 'accion-contra-el-hambre'],
  },
  {
    iati_ref: 'XM-DAC-7',
    name: 'Gobierno de España (AECID / cooperación)',
    registry_slugs: ['aecid', 'spain'],
  },
  {
    iati_ref: 'ES-DIR3-EA0011488',
    name: 'AECID · Agencia Española de Cooperación Internacional',
    registry_slugs: ['aecid'],
  },
  {
    iati_ref: 'ES-CIF-G28021679',
    name: 'Cruz Roja Española',
    registry_slugs: ['cruzroja', 'cruz-roja-espanola'],
  },
  {
    iati_ref: 'ES-CIF-G81787493',
    name: 'Save the Children España',
    registry_slugs: ['savethechildren-es', 'savethechildrenspain'],
  },
  {
    iati_ref: 'ES-CIF-G28160124',
    name: 'Cáritas Española',
    registry_slugs: ['caritas', 'caritas-espanola'],
  },
  {
    iati_ref: 'ES-CIF-G80345349',
    name: 'Médicos Sin Fronteras España',
    registry_slugs: ['msf-spain', 'medicossinfronteras'],
  },
  {
    iati_ref: 'ES-CIF-G84451087',
    name: 'UNICEF Comité Español',
    registry_slugs: ['unicef-es', 'unicefcomiteespanol'],
  },
  {
    iati_ref: 'ES-CIF-G28567790',
    name: 'Manos Unidas',
    registry_slugs: ['manosunidas', 'manos-unidas'],
  },
]

/** Conjunto de refs curadas (para lookups O(1)). */
export const CURATED_REFS: ReadonlySet<string> = new Set(
  CURATED_SPANISH_ORGS.map((o) => o.iati_ref),
)

/** Mapa ref→nombre curado (para resolver facets de reporting_org). */
export const CURATED_REF_NAMES: Record<string, string> = Object.fromEntries(
  CURATED_SPANISH_ORGS.map((o) => [o.iati_ref, o.name]),
)

/** Mapa slug→curado (para marcar `curated_spanish` al recorrer el Registry). */
export const CURATED_BY_SLUG: Record<string, CuratedOrg> = (() => {
  const m: Record<string, CuratedOrg> = {}
  for (const o of CURATED_SPANISH_ORGS) {
    for (const s of o.registry_slugs) m[s.toLowerCase()] = o
  }
  return m
})()
