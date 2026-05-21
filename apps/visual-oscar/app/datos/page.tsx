'use client'
/**
 * /datos · Catálogo de fuentes globales integradas.
 *
 * Lista los 18 conectores externos del stack con su estado (key/sin key),
 * uso típico, endpoint base y enlace a docs. Cards filtrables por:
 *   - Categoría · políticos / mercados / corporate / contratación / social
 *   - Estado    · LIVE (con key/abierto) o REQUIRES_KEY (opt-in)
 *   - Cobertura · global / Europa / España / Latam / Asia
 *
 * Estética homogénea con /puertos · cards blancos · ACCENT cyan.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

const ACCENT = '#0e7490'

type Category = 'politicos' | 'mercados' | 'corporate' | 'contratacion' | 'social' | 'macro' | 'medios' | 'comercio'
type Status = 'live' | 'requires_key' | 'opt_in'

interface Source {
  slug: string
  name: string
  category: Category
  status: Status
  coverage: string // 'global' | 'eu' | 'es' | 'usa' | 'latam' | 'asia'
  description: string
  why_useful: string
  endpoint: string
  module: string  // ej. 'etl/sources/global_intel/wikidata_sparql.py'
  env_var?: string
  docs_url: string
  free_tier?: string
}

const SOURCES: Source[] = [
  // ─── Cooperación + tercer sector ────────────────────────────────
  {
    slug: 'iati',
    name: 'IATI · Aid Transparency',
    category: 'social',
    status: 'live',
    coverage: 'global',
    description: 'International Aid Transparency Initiative · 1000+ organizaciones reportantes · millones de actividades de cooperación con presupuestos y transacciones.',
    why_useful: 'Tracking cooperación internacional España (AECID, ACF, Cruz Roja, Cáritas…) · destinos top, sectores DAC, comparativa UE.',
    endpoint: 'https://api.iatistandard.org/datastore',
    module: 'etl/sources/global_intel/iati_client.py · app/api/iati/spain-overview',
    env_var: 'IATI_API_KEY',
    docs_url: 'https://developer.iatistandard.org/api-details',
    free_tier: '1000 req/día · 2 req/seg',
  },
  // ─── Políticos + actores ───────────────────────────────────────────
  {
    slug: 'wikidata',
    name: 'Wikidata SPARQL',
    category: 'politicos',
    status: 'live',
    coverage: 'global',
    description: 'Grafo público de entidades · 100M+ items con propiedades estructuradas (cargos, partidos, consejos, familia).',
    why_useful: 'Construir grafo de actores políticos/corporativos: cargos actuales e históricos, afiliaciones partidistas, consejos de administración, relaciones familiares.',
    endpoint: 'https://query.wikidata.org/sparql',
    module: 'etl/sources/global_intel/wikidata_sparql.py',
    docs_url: 'https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service',
    free_tier: 'Ilimitado uso razonable',
  },
  {
    slug: 'parltrack',
    name: 'Parltrack (data.europa.eu)',
    category: 'politicos',
    status: 'live',
    coverage: 'eu',
    description: 'Tracking del Parlamento Europeo · MEPs, votaciones, dossiers, comités, amendments.',
    why_useful: 'Histórico de votos de eurodiputados españoles · posición en Green Deal, AI Act, Defensa · transparencia lobbying.',
    endpoint: 'https://parltrack.org · https://data.europa.eu/api/hub',
    module: 'etl/sources/global_intel/parltrack.py',
    docs_url: 'https://parltrack.org',
    free_tier: 'CC-BY 4.0, ilimitado',
  },
  {
    slug: 'ess',
    name: 'European Social Survey',
    category: 'social',
    status: 'live',
    coverage: 'eu',
    description: 'Encuesta bianual en 30+ países UE · valores, actitudes políticas, comportamiento electoral desde 2002.',
    why_useful: 'Tracking de confianza institucional España vs UE · actitudes hacia inmigración, UE, partidos · construir variables electorales.',
    endpoint: 'https://europeansocialsurvey.org · https://ess.sikt.no',
    module: 'etl/sources/global_intel/ess_social_survey.py',
    docs_url: 'https://www.europeansocialsurvey.org/data/',
    free_tier: 'Acceso público con registro académico',
  },
  // ─── Mercados + macro ─────────────────────────────────────────────
  {
    slug: 'fred',
    name: 'FRED · Federal Reserve',
    category: 'macro',
    status: 'live',
    coverage: 'usa',
    description: '800.000+ series macroeconómicas oficiales del Fed, BLS, BEA, Treasury.',
    why_useful: 'GDP, inflación, paro, tipos Fed, curva 10y-2y · base para previsiones macro USA con impacto en España.',
    endpoint: 'https://api.stlouisfed.org/fred',
    module: 'etl/sources/markets/fred_client.py',
    env_var: 'FRED_API_KEY',
    docs_url: 'https://fred.stlouisfed.org/docs/api/fred/',
    free_tier: '120 req/min (efectivamente ilimitado)',
  },
  {
    slug: 'alpha_vantage',
    name: 'Alpha Vantage',
    category: 'mercados',
    status: 'live',
    coverage: 'global',
    description: 'Stocks, forex, commodities · intraday + daily + indicadores técnicos pre-calculados.',
    why_useful: 'Quote real-time IBEX 35, S&P 500 · RSI/MACD pre-calc ahorra computar en cliente · FX EUR/USD spot.',
    endpoint: 'https://www.alphavantage.co/query',
    module: 'etl/sources/markets/alpha_vantage_client.py',
    env_var: 'ALPHA_VANTAGE_KEY',
    docs_url: 'https://www.alphavantage.co/documentation/',
    free_tier: '25 req/día',
  },
  {
    slug: 'nasdaq_data_link',
    name: 'Nasdaq Data Link',
    category: 'mercados',
    status: 'live',
    coverage: 'global',
    description: 'Ex-Quandl · 100+ datasets premium · OPEC oil, oro, plata, FRED mirror, BIS macro.',
    why_useful: 'OPEC oil basket diario · gold spot · BIS credit gap · datasets gratis con key.',
    endpoint: 'https://data.nasdaq.com/api/v3',
    module: 'etl/sources/global_intel/nasdaq_data_link.py',
    env_var: 'NASDAQ_DATA_LINK_KEY',
    docs_url: 'https://docs.data.nasdaq.com',
    free_tier: 'Muchos datasets gratuitos con key',
  },
  {
    slug: 'open_exchange_rates',
    name: 'Open Exchange Rates',
    category: 'mercados',
    status: 'opt_in',
    coverage: 'global',
    description: 'FX cross-rates · ~170 monedas vs USD.',
    why_useful: 'Alternativa a ECB cuando se necesitan monedas exóticas · CNY, BRL, MXN, ZAR.',
    endpoint: 'https://openexchangerates.org/api',
    module: 'etl/sources/global_intel/open_exchange_rates.py',
    env_var: 'OPEN_EXCHANGE_RATES_APP_ID',
    docs_url: 'https://docs.openexchangerates.org/',
    free_tier: '1000 req/mes (registro free)',
  },
  // ─── Corporate ─────────────────────────────────────────────────────
  {
    slug: 'sec_edgar',
    name: 'SEC EDGAR Full-Text',
    category: 'corporate',
    status: 'live',
    coverage: 'usa',
    description: 'Filings SEC de empresas cotizadas USA · 10-K, 13D (>5% holdings), 8-K.',
    why_useful: 'Detectar inversiones de fondos USA en empresas españolas · subsidiarias de multinacionales.',
    endpoint: 'https://efts.sec.gov · https://data.sec.gov',
    module: 'etl/sources/global_intel/sec_edgar.py',
    docs_url: 'https://sec-api.io/docs/full-text-search-api',
    free_tier: 'Gratuito · sin clave',
  },
  {
    slug: 'bris',
    name: 'BRIS · EU Corporate Registers',
    category: 'corporate',
    status: 'live',
    coverage: 'eu',
    description: '27 registros mercantiles UE + UK interconectados desde 2017.',
    why_useful: 'Resolver empresas españolas vs filiales europeas · identificar beneficial owners cross-border.',
    endpoint: 'https://openbris.eu/api/v1',
    module: 'etl/sources/global_intel/bris_corporate.py',
    docs_url: 'https://openbris.eu',
    free_tier: 'Acceso público',
  },
  {
    slug: 'gleif',
    name: 'GLEIF LEI',
    category: 'corporate',
    status: 'live',
    coverage: 'global',
    description: 'Legal Entity Identifier global · matrices, filiales, beneficial owners.',
    why_useful: 'Resolver entidad legal de empresas españolas con LEI · ya usado en /puertos y /banca.',
    endpoint: 'https://api.gleif.org/api/v1',
    module: 'etl/sources/ports/gleif_client.py',
    docs_url: 'https://www.gleif.org/en/lei-data/gleif-api',
    free_tier: 'API pública ilimitada',
  },
  // ─── Contratación ─────────────────────────────────────────────────
  {
    slug: 'open_contracting',
    name: 'Open Contracting (OCDS)',
    category: 'contratacion',
    status: 'live',
    coverage: 'global',
    description: 'Estándar mundial de licitaciones · UK, México, Colombia, Ucrania publican en OCDS.',
    why_useful: 'Comparar prácticas de contratación pública entre países · detectar empresas favorecidas multi-jurisdicción.',
    endpoint: 'Portales OCDS · 4 países soportados',
    module: 'etl/sources/global_intel/open_contracting.py',
    docs_url: 'https://www.open-contracting.org/data-standard/',
    free_tier: 'Datos públicos',
  },
  {
    slug: 'ted_eu',
    name: 'TED · Tenders Electronic Daily',
    category: 'contratacion',
    status: 'live',
    coverage: 'eu',
    description: 'Suplemento del Diario Oficial UE · todas las licitaciones públicas europeas.',
    why_useful: 'Inteligencia competitiva en licitaciones europeas · ya usado en /sector-defensa y /licitaciones.',
    endpoint: 'https://api.ted.europa.eu',
    module: 'etl/ingestion/connectors/ted_eu_connector.py',
    docs_url: 'https://data.europa.eu/data/datasets?query=ted',
    free_tier: 'API pública',
  },
  // ─── Comercio ───────────────────────────────────────────────────────
  {
    slug: 'comtrade',
    name: 'UN Comtrade',
    category: 'comercio',
    status: 'live',
    coverage: 'global',
    description: 'Flujos de comercio internacional bilateral por HS · 250+ países.',
    why_useful: 'Comercio bilateral España↔resto del mundo · ya usado en /puertos/comercio.',
    endpoint: 'https://comtradeapi.un.org/data/v1',
    module: 'etl/sources/ports/comtrade_client.py',
    docs_url: 'https://comtradedeveloper.un.org',
    free_tier: 'Anon 100 calls/hora',
  },
  {
    slug: 'eurostat_comext',
    name: 'Eurostat Comext',
    category: 'comercio',
    status: 'live',
    coverage: 'eu',
    description: 'Comercio bilateral UE granularidad CN8 (más fina que HS6).',
    why_useful: 'EU↔EU flujos detallados · /puertos/comercio auto-detecta y prefiere este.',
    endpoint: 'https://ec.europa.eu/eurostat/api',
    module: 'etl/sources/ports/comext_client.py',
    docs_url: 'https://ec.europa.eu/eurostat/web/international-trade-in-goods/overview',
    free_tier: 'API pública',
  },
  // ─── Macro/Social ──────────────────────────────────────────────────
  {
    slug: 'owid',
    name: 'Our World in Data',
    category: 'social',
    status: 'live',
    coverage: 'global',
    description: '3.000+ datasets · desarrollo, salud, desigualdad, democracia, clima, economía.',
    why_useful: 'V-Dem democracia electoral, HDI, libertad de prensa, CPI Transparency · base para benchmarks internacionales.',
    endpoint: 'https://ourworldindata.org/grapher',
    module: 'etl/sources/global_intel/our_world_in_data.py',
    docs_url: 'https://docs.owid.io/projects/etl/api/',
    free_tier: 'Gratuito · sin auth',
  },
  {
    slug: 'ecb',
    name: 'ECB Statistical Data Warehouse',
    category: 'macro',
    status: 'live',
    coverage: 'eu',
    description: 'Estadísticas oficiales del BCE · tipos, FX, agregados monetarios.',
    why_useful: 'EUR/USD spot, M3, deuda soberana España · ya usado en /macro y /puertos.',
    endpoint: 'https://data-api.ecb.europa.eu',
    module: 'etl/sources/ports/ecb_client.py',
    docs_url: 'https://sdw-wsrest.ecb.europa.eu/help/',
    free_tier: 'API pública',
  },
  {
    slug: 'world_bank',
    name: 'World Bank Open Data',
    category: 'macro',
    status: 'live',
    coverage: 'global',
    description: '300+ indicadores económicos y de desarrollo por país y año.',
    why_useful: 'GDP, deuda pública, capital humano · benchmarks largo plazo.',
    endpoint: 'https://api.worldbank.org/v2',
    module: 'etl/sources/ports/world_bank_commodities.py',
    docs_url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
    free_tier: 'API pública ilimitada',
  },
  // ─── Medios ─────────────────────────────────────────────────────────
  {
    slug: 'newsapi',
    name: 'NewsAPI',
    category: 'medios',
    status: 'live',
    coverage: 'global',
    description: 'Headlines top + búsqueda full-text en 80k+ fuentes.',
    why_useful: 'Complemento a RSS curados · cubre medios anglosajones y finance que no tenemos en feeds.',
    endpoint: 'https://newsapi.org/v2',
    module: 'etl/sources/news/newsapi_client.py',
    env_var: 'NEWSAPI_KEY',
    docs_url: 'https://newsapi.org/docs',
    free_tier: '100 req/día · ≤30 días histórico',
  },
]

const CATEGORY_STYLE: Record<Category, { label: string; bg: string; fg: string }> = {
  politicos:    { label: 'Políticos · Actores', bg: '#fef3c7', fg: '#92400e' },
  mercados:     { label: 'Mercados',            bg: '#dbeafe', fg: '#1e40af' },
  corporate:    { label: 'Corporate',           bg: '#ede9fe', fg: '#5b21b6' },
  contratacion: { label: 'Contratación',        bg: '#fff7ed', fg: '#9a3412' },
  social:       { label: 'Social · Encuestas',  bg: '#dcfce7', fg: '#166534' },
  macro:        { label: 'Macro',               bg: '#cffafe', fg: '#155e75' },
  medios:       { label: 'Medios',              bg: '#fce7f3', fg: '#9d174d' },
  comercio:     { label: 'Comercio',            bg: '#fef2f2', fg: '#991b1b' },
}

const STATUS_STYLE: Record<Status, { label: string; bg: string; fg: string }> = {
  live:         { label: 'LIVE',          bg: '#dcfce7', fg: '#166534' },
  requires_key: { label: 'REQUIERE KEY',  bg: '#fef3c7', fg: '#92400e' },
  opt_in:       { label: 'OPT-IN',        bg: '#f3f4f6', fg: '#374151' },
}

export default function DatosPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<Status | ''>('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let out = SOURCES
    if (selectedCategory) out = out.filter((s) => s.category === selectedCategory)
    if (selectedStatus) out = out.filter((s) => s.status === selectedStatus)
    if (query) {
      const q = query.toLowerCase()
      out = out.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.module.toLowerCase().includes(q),
      )
    }
    return out
  }, [selectedCategory, selectedStatus, query])

  const categories = Array.from(new Set(SOURCES.map((s) => s.category)))
  const liveCount = SOURCES.filter((s) => s.status === 'live').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <header style={{ marginBottom: 18 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            FUENTES GLOBALES · CONECTORES INTEGRADOS
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              margin: '4px 0 0',
            }}
          >
            Catálogo de datos
          </h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
            {SOURCES.length} fuentes integradas · {liveCount} LIVE · todas con
            cache + falla-cerrado + cliente Python documentado.
          </p>
        </header>

        {/* Filtros */}
        <section
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar fuente · Wikidata, EDGAR, FRED…"
            style={{
              flex: 1,
              minWidth: 220,
              padding: '7px 11px',
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              background: '#fff',
            }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | '')}
            style={selectStyle}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_STYLE[c].label}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as Status | '')}
            style={selectStyle}
          >
            <option value="">Todos los estados</option>
            <option value="live">Live</option>
            <option value="requires_key">Requiere key</option>
            <option value="opt_in">Opt-in</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
            {filtered.length} de {SOURCES.length}
          </span>
        </section>

        {/* Cards */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((s) => {
            const cat = CATEGORY_STYLE[s.category]
            const st = STATUS_STYLE[s.status]
            return (
              <div
                key={s.slug}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${cat.fg}`,
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#111827',
                        margin: 0,
                      }}
                    >
                      {s.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                      {s.coverage.toUpperCase()} · {s.free_tier ?? '—'}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      background: st.bg,
                      color: st.fg,
                      borderRadius: 4,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st.label}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>
                  {s.description}
                </p>

                <p
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    fontStyle: 'italic',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  <strong style={{ color: '#475569' }}>Uso típico:</strong>{' '}
                  {s.why_useful}
                </p>

                <div
                  style={{
                    fontSize: 10,
                    color: '#6b7280',
                    background: '#f9fafb',
                    border: '1px solid #f1f5f9',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {s.module}
                  {s.env_var && (
                    <>
                      {' · '}
                      <span style={{ color: '#92400e', fontWeight: 600 }}>
                        env: {s.env_var}
                      </span>
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                    paddingTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: cat.bg,
                      color: cat.fg,
                      borderRadius: 999,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    {cat.label}
                  </span>
                  <a
                    href={s.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: ACCENT,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Docs →
                  </a>
                </div>
              </div>
            )
          })}
        </section>

        {filtered.length === 0 && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
            Sin fuentes para esos filtros.
          </p>
        )}

        <footer
          style={{
            marginTop: 30,
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#475569' }}>Patrón común:</strong> Todos los
            clientes implementan <code>is_available()</code> + cache TTL en
            memoria + <code>httpx</code> con timeout + falla cerrado (sin clave
            o sin red devuelve <code>[]</code> / <code>None</code> sin crash).
            Variables sensibles van en <code>.env</code> (gitignored) · Vercel
            production lee de Environment Variables.
          </p>
          <p style={{ margin: '8px 0 0' }}>
            <strong style={{ color: '#475569' }}>Cómo añadir nueva fuente:</strong>{' '}
            crear <code>etl/sources/global_intel/&lt;nombre&gt;.py</code> con
            el patrón de las 9 existentes, ampliar{' '}
            <code>packages/types/normalized_item.py:SourceKind</code>, añadir
            a este array de <code>SOURCES</code>.
          </p>
        </footer>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#fff',
  minWidth: 180,
}
