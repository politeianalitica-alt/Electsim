/**
 * Overview de cooperación IATI con degradación honesta · TS2-iati.
 *
 * Orquesta la "visión España" de la cooperación internacional combinando las
 * tres APIs IATI según disponibilidad de key:
 *
 *   - CON IATI_API_KEY  → modo 'datastore': facetas reales (país/sector/org) +
 *     total desembolsado EUR vía Solr (`lib/tercer-sector/iati-datastore.ts`).
 *   - SIN IATI_API_KEY  → modo 'registry' DEGRADADO pero útil: se construye la
 *     lista de orgs reportantes desde el Registry CKAN (keyless) y se anota
 *     honestamente que faltan país/sector/desembolsos (que solo da el Datastore).
 *
 * Mantener la lógica de degradación AQUÍ (no en el route) la hace testeable y
 * deja el route handler fino. Patrón: el route llama a `buildIatiOverview()` y
 * reenvía el envelope tal cual.
 */
import type {
  IatiOverviewData,
  IatiOverviewResponse,
} from './iati-types'
import { fetchIatiOverview } from './iati-datastore'
import { fetchIatiOrgs } from './iati-orgs'

const PUBLIC_URL = 'https://iatistandard.org/'

/**
 * Construye un overview en modo 'registry' (degradado) a partir del directorio
 * de orgs del Registry. Sin Datastore no hay país/sector ni desembolsos: se
 * dejan vacíos/null y se rellena solo `top_reporting_orgs` (por nº de datasets).
 * Pura respecto a su entrada (recibe ya el directorio). Exportada para test.
 */
export function buildRegistryOverview(
  orgs: Array<{ iati_ref: string | null; name: string; dataset_count: number }>,
): IatiOverviewData {
  const top_reporting_orgs = orgs
    .filter((o) => Boolean(o.iati_ref))
    .slice(0, 15)
    .map((o) => ({
      code: o.iati_ref as string,
      name: o.name,
      // En modo registry el "count" es nº de datasets, no de actividades.
      count: o.dataset_count,
    }))

  return {
    total_activities: 0,
    total_disbursed_eur: null,
    top_recipient_countries: [],
    top_sectors: [],
    top_reporting_orgs,
    mode: 'registry',
  }
}

/**
 * Punto de entrada del endpoint overview. Intenta Datastore (con key); si no hay
 * key o falla por auth, degrada al Registry keyless con nota honesta. Nunca lanza.
 */
export async function buildIatiOverview(opts: {
  noCache?: boolean
} = {}): Promise<IatiOverviewResponse> {
  const fetched_at = new Date().toISOString()

  // 1) Camino feliz: Datastore con key.
  const ds = await fetchIatiOverview({ noCache: opts.noCache })
  if (ds.ok && ds.data) return ds

  // 2) Degradación: Registry keyless. Solo si el fallo del Datastore es por key.
  //    Para otros errores (rate-limit transitorio) también degradamos pero lo
  //    decimos: el usuario ve datos parciales en vez de una pantalla vacía.
  const reasonDatastore = ds.error ?? 'datastore_unavailable'
  const orgsRes = await fetchIatiOrgs({ noCache: opts.noCache })

  if (!orgsRes.ok || !orgsRes.data) {
    // Ni Datastore ni Registry → fallo honesto (raro: el Registry es keyless).
    return {
      ok: false,
      data: null,
      error: `iati_unavailable · datastore: ${reasonDatastore} · registry: ${orgsRes.error ?? 'sin_datos'}`,
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  const data = buildRegistryOverview(orgsRes.data.orgs)
  const noKey = /^no_key/.test(reasonDatastore) || /unauthorized/.test(reasonDatastore)
  return {
    ok: true,
    data,
    degraded: true,
    degraded_reason: noKey
      ? 'Sin IATI_API_KEY: se muestran las ONGD reportantes (Registry, keyless). ' +
        'País receptor, sector DAC y desembolsos requieren el Datastore (configura IATI_API_KEY).'
      : `Datastore no disponible (${reasonDatastore}); mostrando ONGD reportantes desde el Registry (keyless).`,
    fetched_at,
    source_url: PUBLIC_URL,
  }
}
