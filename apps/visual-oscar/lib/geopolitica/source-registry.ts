/**
 * Geopolitics source registry · single source of truth for data access.
 *
 * Purpose:
 * - Distinguish live public APIs, public RSS/static feeds, restricted APIs and internal/curated data.
 * - Prevent the dashboard from treating demo/fallback data as live source data.
 * - Expose only safe metadata: env var names are public; secret values are never returned.
 */

export type GeoSourceAccessType =
  | 'public_api_no_key'
  | 'public_feed_no_key'
  | 'public_static_file'
  | 'requires_api_key'
  | 'requires_token'
  | 'requires_appname'
  | 'internal_derived'
  | 'curated_baseline'
  | 'optional_llm_key'

export type GeoSourceStatus = 'live_ready' | 'needs_config' | 'disabled' | 'degraded' | 'not_used'

export interface GeoSourceRegistryItem {
  id: string
  name: string
  layer:
    | 'media_attention'
    | 'hard_event'
    | 'structural_conflict'
    | 'humanitarian'
    | 'official_position'
    | 'sanctions'
    | 'consular'
    | 'expert_analysis'
    | 'economic_context'
    | 'analytical_model'
  access_type: GeoSourceAccessType
  env_vars: string[]
  required_env_vars?: string[]
  endpoint?: string
  external_base_url?: string
  used_by: string[]
  status_when_configured: GeoSourceStatus
  status_when_missing: GeoSourceStatus
  production_policy: 'use_live' | 'use_if_configured' | 'do_not_fake' | 'curated_only' | 'optional_enrichment'
  dashboard_label: string
  caveat: string
  setup_note: string
}

export interface GeoSourceRegistryResolvedItem extends GeoSourceRegistryItem {
  auth_configured: boolean
  runtime_status: GeoSourceStatus
  missing_env_vars: string[]
}

function hasEnv(name: string): boolean {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0
}

function resolveAuthConfigured(source: GeoSourceRegistryItem): { auth_configured: boolean; missing_env_vars: string[] } {
  const required = source.required_env_vars ?? []
  if (required.length === 0) return { auth_configured: true, missing_env_vars: [] }

  // ACLED supports two auth modes in the current Next route:
  // 1) ACLED_API_KEY + ACLED_EMAIL, preferred.
  // 2) ACLED_EMAIL + ACLED_PASSWORD, OAuth fallback, only if the account has API access.
  if (source.id === 'acled') {
    const hasApiKeyMode = hasEnv('ACLED_API_KEY') && hasEnv('ACLED_EMAIL')
    const hasOAuthMode = hasEnv('ACLED_EMAIL') && hasEnv('ACLED_PASSWORD')
    if (hasApiKeyMode || hasOAuthMode) return { auth_configured: true, missing_env_vars: [] }
    return {
      auth_configured: false,
      missing_env_vars: ['ACLED_API_KEY + ACLED_EMAIL', 'or ACLED_EMAIL + ACLED_PASSWORD'],
    }
  }

  const missing = required.filter((name) => !hasEnv(name))
  return { auth_configured: missing.length === 0, missing_env_vars: missing }
}

export const GEO_SOURCE_REGISTRY: GeoSourceRegistryItem[] = [
  {
    id: 'gdelt_doc',
    name: 'GDELT DOC 2.0',
    layer: 'media_attention',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '/api/gdelt/articles · /api/gdelt/tone · /api/gdelt/summary',
    external_base_url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    used_by: ['GeoGdeltSummary', 'GeoDataHealth', 'Spain Risk Index', 'GDELT live polling'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Mide cobertura mediática y tono; no mide gravedad material ni probabilidad de conflicto.',
    setup_note: 'No requiere variable de entorno. Usar cache y rate-limit amable.',
  },
  {
    id: 'gdelt_tv',
    name: 'GDELT TV API',
    layer: 'media_attention',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '/api/gdelt/tv-clips · /api/gdelt/tv-timeline · /api/gdelt/tv-tone',
    external_base_url: 'https://api.gdeltproject.org/api/v2/tv/tv',
    used_by: ['GeoTvBroadcast', 'Data health narrative layer'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Cobertura televisiva anglosajona/global; no sustituye a eventos ACLED/UCDP.',
    setup_note: 'No requiere variable de entorno. Mantener revalidate alto por límites de cortesía.',
  },
  {
    // Sprint Geo-FIX · ACLED denegada formalmente (mayo 2026).
    // Status pasa de `needs_config` a `disabled` definitivo.
    // No se muestra en UI (decisión usuario · ver C2). El registry conserva
    // la entrada para trazabilidad: alguien podrá reactivarla en el futuro
    // si la situación cambia, basta con poner status='live_ready'.
    id: 'acled',
    name: 'ACLED · acceso denegado',
    layer: 'hard_event',
    access_type: 'requires_api_key',
    env_vars: ['ACLED_API_KEY', 'ACLED_EMAIL', 'ACLED_PASSWORD'],
    required_env_vars: ['ACLED_API_KEY', 'ACLED_EMAIL'],
    endpoint: '/api/acled/* · endpoints internos conservados pero no usados en UI',
    external_base_url: 'https://acleddata.com/api/acled/read',
    used_by: [],   // Ya nada en la UI lo usa · sustituido por UCDP+GDELT+ReliefWeb
    status_when_configured: 'live_ready',
    status_when_missing: 'disabled',
    production_policy: 'do_not_fake',
    dashboard_label: 'Denegado · sustituido por UCDP+GDELT+ReliefWeb',
    caveat: 'API access denied. La página de país y el resto de la UI usa: UCDP (conflicto estructural anual, Uppsala), GDELT DOC 2.0 (saliencia mediática 24h-30d, sin key) y ReliefWeb (humanitario, OCHA). NO mencionar ACLED en strings visibles.',
    setup_note: 'Si en el futuro se aprueba el acceso, cambiar status_when_missing a "needs_config" o "live_ready" y volver a registrar en used_by.',
  },
  {
    id: 'ucdp',
    name: 'UCDP API',
    layer: 'structural_conflict',
    access_type: 'requires_token',
    env_vars: ['UCDP_ACCESS_TOKEN'],
    required_env_vars: ['UCDP_ACCESS_TOKEN'],
    endpoint: '/api/geopolitica/ucdp · internal UCDP fetchers',
    external_base_url: 'https://ucdpapi.pcr.uu.se/api',
    used_by: ['Convergence alerts', 'Country drilldown', 'Country timeline'],
    status_when_configured: 'live_ready',
    status_when_missing: 'needs_config',
    production_policy: 'use_if_configured',
    dashboard_label: 'Requiere token UCDP',
    caveat: 'Dato estructural/anual; no sirve para deterioro táctico de hoy.',
    setup_note: 'Añadir UCDP_ACCESS_TOKEN y enviar header x-ucdp-access-token en llamadas protegidas.',
  },
  {
    id: 'reliefweb',
    name: 'ReliefWeb API',
    layer: 'humanitarian',
    access_type: 'requires_appname',
    env_vars: ['RELIEFWEB_APPNAME'],
    endpoint: '/api/geopolitica/reliefweb · internal ReliefWeb fetchers',
    external_base_url: 'https://api.reliefweb.int/v2/reports',
    used_by: ['Country drilldown', 'Convergence alerts'],
    status_when_configured: 'live_ready',
    status_when_missing: 'degraded',
    production_policy: 'use_live',
    dashboard_label: 'API pública con appname',
    caveat: 'Mide presión humanitaria reportada; no intensidad militar ni atribución.',
    setup_note: 'Usar RELIEFWEB_APPNAME=politeia-analitica o dominio propio. No es API key secreta.',
  },
  {
    id: 'world_bank',
    name: 'World Bank API',
    layer: 'economic_context',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: 'risk-feeds.ts · Banco Mundial WDI',
    external_base_url: 'https://api.worldbank.org/v2',
    used_by: ['Risk v2 feeds', 'economic/social/geopolitical context'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Indicadores estructurales con rezago; no es señal diaria.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'ecb_sdw',
    name: 'ECB Data API',
    layer: 'economic_context',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: 'risk-feeds.ts · ECB DFR',
    external_base_url: 'https://data-api.ecb.europa.eu/service/data',
    used_by: ['Risk v2 feeds'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Contexto macro financiero, no riesgo geopolítico directo.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'ine_tempus',
    name: 'INE Tempus',
    layer: 'economic_context',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: 'risk-feeds.ts · INE IPC',
    external_base_url: 'https://servicios.ine.es/wstempus',
    used_by: ['Risk v2 feeds'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Dato macro nacional; no geopolítica directa.',
    setup_note: 'No requiere variable de entorno para Tempus público.',
  },
  {
    id: 'ofac_sdn',
    name: 'OFAC SDN',
    layer: 'sanctions',
    access_type: 'public_static_file',
    env_vars: [],
    endpoint: '/api/geopolitica/sanciones-live',
    external_base_url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    used_by: ['Sanctions live', 'Country timeline'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'Archivo público sin key',
    caveat: 'Lista oficial de designaciones; no estima impacto económico real.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'eu_sanctions',
    name: 'EU sanctions / Council feeds',
    layer: 'sanctions',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/sanciones · /api/geopolitica/eeas-news',
    used_by: ['Sanctions panel', 'Official EU narrative'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'Feed público sin key',
    caveat: 'Comunicados y medidas publicadas; no mide cumplimiento.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'nato_press',
    name: 'NATO press / RSS',
    layer: 'official_position',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/nato-press',
    used_by: ['Official NATO layer'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'Feed público sin key',
    caveat: 'Posición institucional; no predice decisiones futuras.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'unsc_news',
    name: 'UN Security Council news',
    layer: 'official_position',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/unsc-news',
    external_base_url: 'https://news.un.org/feed/subscribe/en/news/topic/security-council/feed/rss.xml',
    used_by: ['UNSC news panel', 'Official diplomacy layer'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'RSS público sin key',
    caveat: 'Cobertura institucional de la ONU; no evento militar táctico.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'spain_official',
    name: 'MAEC + Moncloa + Defensa RSS',
    layer: 'official_position',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/spain-official',
    used_by: ['Spain official panel'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'RSS público sin key',
    caveat: 'Voz oficial del Estado; no mide consenso político ni opinión pública.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'crisis_group',
    name: 'International Crisis Group RSS',
    layer: 'expert_analysis',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/crisis-group',
    used_by: ['Think tank / expert layer'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'RSS público sin key',
    caveat: 'Análisis experto; no dato cuantitativo primario.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'isw',
    name: 'Institute for the Study of War RSS',
    layer: 'expert_analysis',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/isw-briefings',
    used_by: ['ISW briefings panel'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'RSS público sin key',
    caveat: 'Análisis experto; útil para contexto, no como evento primario.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'geo_stats_internal',
    name: 'Politeia geo stats / OSINT interno',
    layer: 'analytical_model',
    access_type: 'internal_derived',
    env_vars: [],
    endpoint: '/api/geopolitica/stats · /api/geopolitica/osint',
    used_by: ['Geo KPI grid', 'Risk Index', 'Convergence alerts'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'optional_enrichment',
    dashboard_label: 'Derivado interno',
    caveat: 'Derivado de RSS/modelos propios; debe etiquetarse separado de fuentes primarias.',
    setup_note: 'No requiere key externa.',
  },
  {
    id: 'geo_curated_baseline',
    name: 'Baseline curado Politeia',
    layer: 'analytical_model',
    access_type: 'curated_baseline',
    env_vars: [],
    endpoint: 'WORLD_COUNTRY_BASELINE · TOP_RISKS curated',
    used_by: ['World risk heatmap', 'Top risks', 'Country metadata'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'curated_only',
    dashboard_label: 'Sin API · baseline curado',
    caveat: 'No es observación primaria y debe revisarse manualmente.',
    setup_note: 'No requiere variable de entorno.',
  },
  {
    id: 'llm_geo_enrichment',
    name: 'LLM enrichment / IA brief',
    layer: 'analytical_model',
    access_type: 'optional_llm_key',
    env_vars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    endpoint: '/api/geopolitica/ia-brief · theme clustering',
    used_by: ['IA brief', 'Theme clusters', 'Analytical summaries'],
    status_when_configured: 'live_ready',
    status_when_missing: 'degraded',
    production_policy: 'optional_enrichment',
    dashboard_label: 'Key opcional para IA',
    caveat: 'Genera síntesis; no añade hechos no presentes en fuentes.',
    setup_note: 'Configurar OPENAI_API_KEY/Groq u otra key si se quiere briefing premium. Sin key, mostrar fallback o desactivar.',
  },
  // ────────────────────────────────────────────────────────────────────
  // Sprint Geo-FIX · 6 fuentes nuevas añadidas tras el spec del usuario.
  // Todas son API/feeds públicos sin key. Las P1 (REST Countries,
  // Wikidata, GDELT, USGS) ya están integradas en el endpoint
  // /api/geopolitica/country-profile/[iso3]. Las P2 (GDACS, SIPRI,
  // Freedom House, WGI) quedan registradas como `live_ready` con
  // endpoint TBD para futura integración sin nuevo código de registry.
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'rest_countries',
    name: 'REST Countries',
    layer: 'economic_context',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/country-profile/[iso3]',
    external_base_url: 'https://restcountries.com/v3.1/',
    used_by: ['Country drilldown · capa Identidad'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Metadata identidad: capital, vecinos, idiomas, moneda, bandera, población. No mide riesgo.',
    setup_note: 'No requiere variable de entorno. Latencia baja, sin límites estrictos.',
  },
  {
    id: 'wikidata',
    name: 'Wikidata · SPARQL',
    layer: 'official_position',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/country-profile/[iso3] · query.wikidata.org',
    external_base_url: 'https://query.wikidata.org/sparql',
    used_by: ['Country drilldown · capa Gobierno'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'SPARQL público sin key',
    caveat: 'Jefe de Estado P35, jefe de Gobierno P6, forma de gobierno P122, organizaciones internacionales P463. Hay riesgo de vandalismo wiki — validar contra fuentes oficiales.',
    setup_note: 'Sin key, pero requiere User-Agent custom para evitar rate-limit.',
  },
  {
    id: 'usgs_earthquakes',
    name: 'USGS Earthquake Catalog',
    layer: 'hard_event',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '/api/geopolitica/country-profile/[iso3] · USGS FDSNWS',
    external_base_url: 'https://earthquake.usgs.gov/fdsnws/event/1/',
    used_by: ['Country drilldown · capa Sismos'],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: 'Sismos magnitud ≥5 últimos 30 días en radio 1500 km del centroide del país. Indicador de riesgo físico (no político).',
    setup_note: 'No requiere key. Formato GeoJSON.',
  },
  {
    id: 'gdacs_alerts',
    name: 'GDACS · Global Disaster Alerts',
    layer: 'hard_event',
    access_type: 'public_feed_no_key',
    env_vars: [],
    endpoint: '(TBD · futuro integrarse en country-profile)',
    external_base_url: 'https://www.gdacs.org/xml/rss.xml',
    used_by: [],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'RSS público sin key',
    caveat: 'Alertas verde/naranja/roja por desastres naturales (sismo, ciclón, inundación, volcán). Buen complemento a USGS si queremos eventos multi-tipo.',
    setup_note: 'No requiere key. Parseable como RSS/KML.',
  },
  {
    id: 'sipri_milex',
    name: 'SIPRI · Military Expenditure + Arms Transfers',
    layer: 'economic_context',
    access_type: 'public_static_file',
    env_vars: [],
    endpoint: '(TBD · descarga Excel anual)',
    external_base_url: 'https://www.sipri.org/databases',
    used_by: [],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'Descarga Excel pública',
    caveat: 'Gasto militar desde 1949, transferencias de armas convencionales mayores desde 1950. Actualización anual (marzo).',
    setup_note: 'Implementación pendiente: bajar Excel + parsear con SheetJS o convertir a JSON estático.',
  },
  {
    id: 'world_bank_wgi',
    name: 'World Bank · Worldwide Governance Indicators',
    layer: 'structural_conflict',
    access_type: 'public_api_no_key',
    env_vars: [],
    endpoint: '(TBD · futuro vía worldbank.org API)',
    external_base_url: 'https://api.worldbank.org/v2/',
    used_by: [],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'API pública sin key',
    caveat: '6 indicadores 0-100: voz/accountability, estabilidad política, eficacia gobierno, calidad regulatoria, rule of law, control corrupción. Serie 1996-actual.',
    setup_note: 'API pública JSON. Endpoint a integrar en country-profile/[iso3] como `governance` layer.',
  },
  {
    id: 'freedom_house',
    name: 'Freedom House · Freedom in the World',
    layer: 'structural_conflict',
    access_type: 'public_static_file',
    env_vars: [],
    endpoint: '(TBD · CSV anual)',
    external_base_url: 'https://freedomhouse.org/report/freedom-world',
    used_by: [],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'CSV público (uso académico)',
    caveat: 'Etiqueta Free/Partly Free/Not Free + scores derechos políticos y libertades civiles. 195 países. Uso comercial requiere permiso.',
    setup_note: 'Datos descargables. Para uso comercial pedir licencia. Útil como label rápida en capa Gobierno.',
  },
  {
    id: 'rsf_press_freedom',
    name: 'RSF · World Press Freedom Index',
    layer: 'media_attention',
    access_type: 'public_static_file',
    env_vars: [],
    endpoint: '(TBD · CSV anual)',
    external_base_url: 'https://rsf.org/en/index',
    used_by: [],
    status_when_configured: 'live_ready',
    status_when_missing: 'live_ready',
    production_policy: 'use_live',
    dashboard_label: 'CSV público anual',
    caveat: 'Score global + 5 indicadores (político, económico, legal, sociocultural, seguridad periodistas) para 180 países.',
    setup_note: 'Datos descargables anuales. Útil como capa "libertad de prensa" en ficha país.',
  },
]

export function resolveGeoSourceRegistry(): GeoSourceRegistryResolvedItem[] {
  return GEO_SOURCE_REGISTRY.map((source) => {
    const { auth_configured, missing_env_vars } = resolveAuthConfigured(source)
    return {
      ...source,
      auth_configured,
      missing_env_vars,
      runtime_status: auth_configured ? source.status_when_configured : source.status_when_missing,
    }
  })
}

export function geoSourceRegistrySummary(items = resolveGeoSourceRegistry()) {
  const byAccessType = items.reduce<Record<string, number>>((acc, source) => {
    acc[source.access_type] = (acc[source.access_type] || 0) + 1
    return acc
  }, {})
  const byRuntimeStatus = items.reduce<Record<string, number>>((acc, source) => {
    acc[source.runtime_status] = (acc[source.runtime_status] || 0) + 1
    return acc
  }, {})
  return {
    n_sources: items.length,
    live_ready: items.filter((s) => s.runtime_status === 'live_ready').length,
    needs_config: items.filter((s) => s.runtime_status === 'needs_config').length,
    degraded: items.filter((s) => s.runtime_status === 'degraded').length,
    by_access_type: byAccessType,
    by_runtime_status: byRuntimeStatus,
  }
}
