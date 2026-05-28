'use client'
/**
 * /geopolitica/pais/[id] · Sprint Geo-FIX
 *
 * Página de perfil completo por país (ISO3) totalmente reescrita.
 * Cambios respecto a la versión Sprint G5 original:
 *
 *  1. Consume el endpoint nuevo `/api/geopolitica/country-profile/[iso3]`
 *     en lugar del viejo `/api/geopolitica/pais-profile` (que sigue
 *     existiendo internamente para el motor de riesgo, pero la página
 *     ya no depende de él directamente).
 *
 *  2. Capas mostradas (10):
 *     - Identidad país (REST Countries: bandera, capital, vecinos, idiomas, moneda)
 *     - Riesgo & banda (motor interno, sin ACLED)
 *     - Gobierno (Wikidata: jefe de Estado, jefe de Gobierno, forma de gobierno, organizaciones)
 *     - Conflicto estructural (UCDP)
 *     - Saliencia mediática 7d (GDELT)
 *     - Humanitario (ReliefWeb)
 *     - Sanciones (OFAC + EU + UN consolidadas)
 *     - Travel Advisory (US State Department)
 *     - Sismos (USGS, radio 1500 km, M≥5.0, 30d)
 *     - Top Risks Politeia relacionados
 *     - Timeline multi-fuente (componente existente)
 *
 *  3. Cada bloque lleva su <SourceFooter /> con: nombre, tipo de acceso,
 *     confianza, última actualización, qué mide, link a fuente original.
 *
 *  4. ACLED no aparece en ninguna parte de la UI. La página usa
 *     UCDP+GDELT+ReliefWeb como sustitutos y se cita esas fuentes.
 *
 *  5. Cada capa es defensiva: si el endpoint devuelve `null` para esa
 *     capa, el bloque muestra un placeholder honesto en lugar de romper.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppHeader from '../../../_components/AppHeader'
import { GeoCountryTimeline } from '../../../../components/geopolitica/GeoCountryTimeline'
import { SourceFooter } from '../../../../components/geopolitica/SourceFooter'

// ────────────────────────────────────────────────────────────────────
// Tipos (paralelos al endpoint country-profile)
// ────────────────────────────────────────────────────────────────────

interface SourceMeta {
  id: string
  name: string
  access_type: string
  source_url: string
  last_updated?: string
  what_it_measures: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

interface IdentityLayer {
  iso2: string | null
  iso3: string
  name_common: string
  name_official: string | null
  capital: string | null
  region: string | null
  subregion: string | null
  population: number | null
  area: number | null
  latlng: [number, number] | null
  borders: string[]
  currencies: string[]
  languages: string[]
  flag_png: string | null
  flag_emoji: string | null
  timezones: string[]
  un_member: boolean | null
  _source: SourceMeta
}

interface GovernmentLayer {
  head_of_state: string | null
  head_of_government: string | null
  form_of_government: string | null
  governing_parties: string[]
  international_orgs: string[]
  independence_date: string | null
  // ── Wikidata extended facts (FIX-A7) ───────────────────────────
  national_motto?: string | null
  state_religion?: string | null
  legal_system?: string | null
  official_language?: string | null
  head_of_state_since?: string | null
  head_of_government_since?: string | null
  _source: SourceMeta
}

interface EconomicLayer {
  gdp_growth_pct_latest: number | null
  inflation_pct_latest: number | null
  unemployment_pct_latest: number | null
  current_account_pct_gdp_latest: number | null
  debt_pct_gdp_latest: number | null
  reserves_months_imports_latest: number | null
  series_5y: {
    gdp_growth_pct?: Array<{ year: number; value: number | null }>
    inflation_pct?: Array<{ year: number; value: number | null }>
    unemployment_pct?: Array<{ year: number; value: number | null }>
  }
  economic_health: 'estable' | 'tension' | 'crisis' | 'sin_datos'
  alerts: string[]
  _source: SourceMeta
}

type ConcernSeverity = 'low' | 'medium' | 'high' | 'critical'
interface Concern {
  rank: number
  title: string
  detail: string
  source: string
  severity: ConcernSeverity
  category: 'conflict' | 'economy' | 'governance' | 'sanctions' | 'humanitarian' | 'security'
}
interface ConcernsLayer {
  total: number
  by_severity: Record<ConcernSeverity, number>
  by_category: Record<string, number>
  concerns: Concern[]
  _source: SourceMeta
}

interface SeismicLayer {
  events_30d: number
  max_magnitude: number | null
  recent: Array<{ date: string; mag: number; depth_km: number; place: string }>
  _source: SourceMeta
}

interface ConflictLayer {
  n_conflicts: number
  max_intensity_level: number
  years_covered: string
  interpretation: string
  recent: Array<{ name: string; side_a: string; side_b: string; year: number; intensity_level: number }>
  _source: SourceMeta
}

interface HumanitarianLayer {
  n_reports: number
  total_available: number
  recent: Array<{ id: number; title: string; source: string; date: string; url: string }>
  _source: SourceMeta
}

interface NarrativeLayer {
  volume_articles_7d: number
  avg_tone: number | null
  top_articles: Array<{ title: string; url: string; source: string; tone: number; date: string }>
  _source: SourceMeta
}

interface SanctionsLayer {
  total_count: number
  by_program: Record<string, number>
  sample: Array<{ entity: string; source: string; date?: string; reason?: string }>
  _source: SourceMeta
}

interface TravelLayer {
  score: number
  band: string
  message: string
  updated: string
  _source: SourceMeta
}

interface RiskLayer {
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  baseline_risk: number
  uplift: number
  related_top_risks: Array<{ rank: number; title: string; spain_exposure: string }>
  _source: SourceMeta
}

interface CountryProfile {
  ok: boolean
  iso3: string
  country_name: string
  layers: {
    identity: IdentityLayer | null
    government: GovernmentLayer | null
    seismic: SeismicLayer | null
    conflict: ConflictLayer | null
    humanitarian: HumanitarianLayer | null
    narrative: NarrativeLayer | null
    sanctions: SanctionsLayer | null
    travel: TravelLayer | null
    risk: RiskLayer | null
    economic?: EconomicLayer | null
    concerns?: ConcernsLayer | null
  }
  layers_available: string[]
  layers_count: number
  _meta?: { generated_at: string; latency_ms: number; version: string }
}

const BAND_COLOR: Record<string, { bg: string; fg: string; track: string }> = {
  BAJO:    { bg: '#dcfce7', fg: '#166534', track: '#16a34a' },
  MEDIO:   { bg: '#fef3c7', fg: '#92400e', track: '#f59e0b' },
  ALTO:    { bg: '#ffedd5', fg: '#9a3412', track: '#f97316' },
  CRITICO: { bg: '#fee2e2', fg: '#991b1b', track: '#dc2626' },
}

// ────────────────────────────────────────────────────────────────────
// Página
// ────────────────────────────────────────────────────────────────────

export default function PaisPage() {
  const params = useParams()
  const router = useRouter()
  const iso = String(params?.id || 'ESP').toUpperCase()
  const [data, setData] = useState<CountryProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/country-profile/${iso}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
  }, [iso])

  return (
    <>
      <AppHeader />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <button
          onClick={() => router.push('/geopolitica?tab=ia')}
          style={{
            background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0',
            padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginBottom: 16,
          }}
        >
          ← Volver al mapa global
        </button>

        {loading && <p style={{ color: '#94a3b8' }}>Cargando perfil país…</p>}

        {data && !data.ok && (
          <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#991b1b', fontWeight: 700 }}>
              Perfil país no disponible para: {iso}
            </p>
            <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: 11 }}>
              No conseguimos resolver el código ISO3 en las fuentes externas (REST Countries / Wikidata).
              Comprueba que el código es válido (ej. ESP, FRA, UKR).
            </p>
          </div>
        )}

        {data && data.ok && (
          <div>
            {/* Hero país · combina identidad (REST Countries) + risk score (motor Politeia) */}
            <HeroBlock data={data} />

            {/* Capas en grid */}
            <div style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 18,
            }}>
              <ConcernsBlock layer={data.layers.concerns ?? null} />
              <IdentityBlock layer={data.layers.identity} />
              <GovernmentBlock layer={data.layers.government} />
              <EconomicBlock layer={data.layers.economic ?? null} />
              <ConflictBlock layer={data.layers.conflict} />
              <NarrativeBlock layer={data.layers.narrative} />
              <HumanitarianBlock layer={data.layers.humanitarian} />
              <SanctionsBlock layer={data.layers.sanctions} />
              <TravelBlock layer={data.layers.travel} />
              <SeismicBlock layer={data.layers.seismic} />
              <TopRisksBlock risk={data.layers.risk} countryName={data.country_name} />
            </div>

            {/* Timeline ancho completo · ya existía */}
            <div style={{ marginTop: 18 }}>
              <GeoCountryTimeline iso={data.iso3} />
            </div>

            {/* Footer de transparencia · qué fuentes usamos vs cuáles no */}
            <CoverageFooter data={data} />
          </div>
        )}
      </main>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// Bloques
// ────────────────────────────────────────────────────────────────────

function HeroBlock({ data }: { data: CountryProfile }) {
  const id = data.layers.identity
  const risk = data.layers.risk
  const band = risk?.band || 'MEDIO'
  const colors = BAND_COLOR[band]
  return (
    <header style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      border: `1px solid ${colors.track}`,
      borderLeft: `4px solid ${colors.track}`,
      borderRadius: 12, padding: 20, color: '#f1f5f9',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {id?.flag_emoji && (
            <span style={{ fontSize: 48, lineHeight: 1 }}>{id.flag_emoji}</span>
          )}
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Country Profile · ISO3 {data.iso3}
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 700, color: '#fbbf24' }}>
              {data.country_name}
            </h1>
            {id?.name_official && id.name_official !== id.name_common && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                {id.name_official}
              </p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cbd5e1' }}>
              {[id?.region, id?.subregion].filter(Boolean).join(' · ')}
              {id?.capital && ` · capital ${id.capital}`}
            </p>
          </div>
        </div>
        {risk && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 64, fontWeight: 700, color: colors.track, lineHeight: 1 }}>
              {risk.score}
            </p>
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
              padding: '4px 12px', borderRadius: 12,
              background: colors.bg, color: colors.fg,
            }}>
              RIESGO · {risk.band}
            </span>
          </div>
        )}
      </div>
      {risk && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11 }}>
          <Stat label="Riesgo estructural" value={`${risk.baseline_risk}/100`} />
          <Stat label="Uplift eventos 30d" value={`+${risk.uplift}`} />
          <Stat label="Conflictos UCDP" value={String(data.layers.conflict?.n_conflicts ?? '—')} />
          <Stat label="Reports humanitarios" value={String(data.layers.humanitarian?.n_reports ?? '—')} />
          <Stat label="Sanciones consolidadas" value={String(data.layers.sanctions?.total_count ?? '—')} />
        </div>
      )}
    </header>
  )
}

function IdentityBlock({ layer }: { layer: IdentityLayer | null }) {
  return (
    <BlockShell title="Identidad país" accent="#0891b2" emoji="◉" emptyMessage={layer ? null : 'REST Countries no disponible'}>
      {layer && (
        <>
          {layer.flag_png && (
            <img src={layer.flag_png} alt={`Bandera ${layer.name_common}`} style={{ width: 80, height: 'auto', borderRadius: 4, border: '1px solid #e5e7eb', marginBottom: 10 }} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
            <Field label="Capital" value={layer.capital || '—'} />
            <Field label="Población" value={layer.population ? layer.population.toLocaleString('es-ES') : '—'} />
            <Field label="Área km²" value={layer.area ? layer.area.toLocaleString('es-ES') : '—'} />
            <Field label="Miembro ONU" value={layer.un_member === true ? 'Sí' : layer.un_member === false ? 'No' : '—'} />
            <Field label="Idiomas" value={layer.languages.slice(0, 3).join(', ') || '—'} />
            <Field label="Monedas" value={layer.currencies.join(', ') || '—'} />
          </div>
          {layer.borders.length > 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#475569' }}>
              <strong style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Vecinos:</strong>{' '}
              {layer.borders.join(' · ')}
            </p>
          )}
          <SourceFooter source={layer._source} />
        </>
      )}
    </BlockShell>
  )
}

function GovernmentBlock({ layer }: { layer: GovernmentLayer | null }) {
  return (
    <BlockShell title="Gobierno y régimen" accent="#7c3aed" emoji="⚖" emptyMessage={layer ? null : 'Wikidata no disponible o sin datos para este país'}>
      {layer && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <Field
              label="Jefe de Estado"
              value={
                layer.head_of_state
                  ? layer.head_of_state +
                    (layer.head_of_state_since ? ` (desde ${layer.head_of_state_since})` : '')
                  : '—'
              }
            />
            <Field
              label="Jefe de Gobierno"
              value={
                layer.head_of_government
                  ? layer.head_of_government +
                    (layer.head_of_government_since ? ` (desde ${layer.head_of_government_since})` : '')
                  : '—'
              }
            />
            <Field label="Forma de gobierno" value={layer.form_of_government || '—'} />
            {layer.legal_system && (
              <Field label="Sistema legal" value={layer.legal_system} />
            )}
            {layer.official_language && (
              <Field label="Idioma oficial" value={layer.official_language} />
            )}
            {layer.state_religion && (
              <Field label="Religión oficial" value={layer.state_religion} />
            )}
            {layer.independence_date && (
              <Field label="Independencia" value={layer.independence_date} />
            )}
            {layer.national_motto && (
              <Field label="Lema nacional" value={layer.national_motto} />
            )}
          </div>
          {layer.international_orgs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Organizaciones internacionales · {layer.international_orgs.length}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {layer.international_orgs.slice(0, 12).map((o) => (
                  <span key={o} style={{
                    background: '#faf5ff', color: '#7c3aed',
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                    border: '1px solid #e9d5ff',
                  }}>{o}</span>
                ))}
              </div>
            </div>
          )}
          <SourceFooter source={layer._source} />
        </>
      )}
    </BlockShell>
  )
}

function ConcernsBlock({ layer }: { layer: ConcernsLayer | null }) {
  if (!layer || layer.total === 0) {
    return (
      <BlockShell
        title="Top concerns · síntesis multi-fuente"
        accent="#dc2626"
        emoji="⊞"
        emptyMessage="No hay señales críticas para este país en este momento (todas las capas devuelven valores normales)"
      >
        {null}
      </BlockShell>
    )
  }
  const SEV_COLORS: Record<ConcernSeverity, { bg: string; fg: string; border: string }> = {
    critical: { bg: '#fef2f2', fg: '#7f1d1d', border: '#dc2626' },
    high: { bg: '#fff7ed', fg: '#9a3412', border: '#ea580c' },
    medium: { bg: '#fefce8', fg: '#854d0e', border: '#ca8a04' },
    low: { bg: '#f0fdf4', fg: '#166534', border: '#16a34a' },
  }
  const CAT_ICONS: Record<string, string> = {
    conflict: '⊞',
    economy: '⊟',
    governance: '⊞',
    sanctions: '⊟',
    humanitarian: '◐',
    security: '✦',
  }
  return (
    <BlockShell title="Top concerns · síntesis multi-fuente" accent="#dc2626" emoji="⊞" emptyMessage={null}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {(['critical', 'high', 'medium', 'low'] as ConcernSeverity[]).map((s) => (
          layer.by_severity[s] > 0 && (
            <span key={s} style={{
              fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 4,
              background: SEV_COLORS[s].bg, color: SEV_COLORS[s].fg,
              border: `1px solid ${SEV_COLORS[s].border}`,
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              {s} · {layer.by_severity[s]}
            </span>
          )
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {layer.concerns.map((c) => (
          <div key={c.rank} style={{
            background: SEV_COLORS[c.severity].bg,
            borderLeft: `3px solid ${SEV_COLORS[c.severity].border}`,
            padding: '8px 10px', borderRadius: 4,
            fontSize: 11,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
              <span style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                color: SEV_COLORS[c.severity].fg, opacity: 0.7,
              }}>#{c.rank}</span>
              <span style={{ fontWeight: 700, color: SEV_COLORS[c.severity].fg, flex: 1 }}>
                {CAT_ICONS[c.category] ?? '·'} {c.title}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: SEV_COLORS[c.severity].fg, opacity: 0.85, lineHeight: 1.4 }}>
              {c.detail}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
              {c.source} · {c.category}
            </p>
          </div>
        ))}
      </div>
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function EconomicBlock({ layer }: { layer: EconomicLayer | null }) {
  if (!layer) {
    return (
      <BlockShell title="Indicadores económicos" accent="#16a34a" emoji="⊞" emptyMessage="World Bank no disponible o sin datos para este país">
        {null}
      </BlockShell>
    )
  }
  const healthLabel = layer.economic_health === 'crisis' ? 'CRISIS' :
    layer.economic_health === 'tension' ? 'TENSIÓN' :
    layer.economic_health === 'estable' ? 'ESTABLE' : 'SIN DATOS'
  const healthColor = layer.economic_health === 'crisis' ? '#dc2626' :
    layer.economic_health === 'tension' ? '#f59e0b' :
    layer.economic_health === 'estable' ? '#16a34a' : '#94a3b8'

  const fmt = (v: number | null, suffix = '%') =>
    v === null ? '—' : `${v >= 0 && suffix === '%' ? '' : ''}${v.toFixed(1)}${suffix}`

  return (
    <BlockShell title="Indicadores económicos" accent="#16a34a" emoji="⊞" emptyMessage={null}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>
          Salud macro
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: healthColor,
          background: layer.economic_health === 'crisis' ? '#fef2f2' : layer.economic_health === 'tension' ? '#fef3c7' : layer.economic_health === 'estable' ? '#f0fdf4' : '#f8fafc',
          padding: '3px 8px', borderRadius: 4,
        }}>
          {healthLabel}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
        <Field label="PIB crecimiento" value={fmt(layer.gdp_growth_pct_latest)} />
        <Field label="Inflación IPC" value={fmt(layer.inflation_pct_latest)} />
        <Field label="Desempleo" value={fmt(layer.unemployment_pct_latest)} />
        <Field label="Cuenta corriente" value={fmt(layer.current_account_pct_gdp_latest, '% PIB')} />
        <Field label="Deuda pública" value={fmt(layer.debt_pct_gdp_latest, '% PIB')} />
        <Field label="Reservas" value={layer.reserves_months_imports_latest === null ? '—' : `${layer.reserves_months_imports_latest.toFixed(1)} m`} />
      </div>
      {layer.alerts.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 6, borderLeft: '3px solid #dc2626' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Alertas macro · {layer.alerts.length}
          </p>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#991b1b', lineHeight: 1.5 }}>
            {layer.alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function ConflictBlock({ layer }: { layer: ConflictLayer | null }) {
  if (!layer) {
    return (
      <BlockShell title="Conflicto estructural" accent="#94a3b8" emoji="⊞" emptyMessage="UCDP no disponible">
        {null}
      </BlockShell>
    )
  }
  const intensityLabel = layer.max_intensity_level >= 2
    ? 'GUERRA · 1000+ muertes/año'
    : layer.max_intensity_level >= 1
    ? 'CONFLICTO MENOR · 25-999/año'
    : 'Sin conflicto registrado'
  const intensityColor = layer.max_intensity_level >= 2 ? '#dc2626' : layer.max_intensity_level >= 1 ? '#f59e0b' : '#16a34a'
  return (
    <BlockShell title="Conflicto estructural" accent="#94a3b8" emoji="⊞" emptyMessage={null}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: intensityColor, lineHeight: 1.3 }}>
        {intensityLabel}
      </p>
      <p style={{ margin: '4px 0 8px', fontSize: 11, color: '#475569' }}>
        {layer.n_conflicts} conflictos registrados · cobertura {layer.years_covered || 'serie histórica'}
      </p>
      {layer.interpretation && (
        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
          {layer.interpretation}
        </p>
      )}
      {layer.recent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {layer.recent.slice(0, 5).map((c, i) => (
            <div key={i} style={{
              padding: 6, background: '#f8fafc',
              borderLeft: `3px solid ${c.intensity_level >= 2 ? '#dc2626' : '#f59e0b'}`,
              borderRadius: 4, fontSize: 11,
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{c.name} · {c.year}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>{c.side_a} vs {c.side_b}</p>
            </div>
          ))}
        </div>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function NarrativeBlock({ layer }: { layer: NarrativeLayer | null }) {
  if (!layer) {
    return (
      <BlockShell title="Saliencia mediática 7d" accent="#1F4E8C" emoji="◐" emptyMessage="GDELT no disponible">{null}</BlockShell>
    )
  }
  const toneColor = layer.avg_tone !== null
    ? layer.avg_tone > 1 ? '#16a34a' : layer.avg_tone < -1 ? '#dc2626' : '#64748b'
    : '#94a3b8'
  return (
    <BlockShell title="Saliencia mediática 7d" accent="#1F4E8C" emoji="◐" emptyMessage={null}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#1F4E8C', fontFamily: 'ui-monospace, monospace' }}>
          {layer.volume_articles_7d}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>artículos · GDELT 7d</span>
        {layer.avg_tone !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: toneColor, fontWeight: 600 }}>
            Tono medio: {layer.avg_tone > 0 ? '+' : ''}{layer.avg_tone}
          </span>
        )}
      </div>
      {layer.top_articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {layer.top_articles.slice(0, 5).map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{
              padding: 6, background: '#f0f9ff', borderLeft: '3px solid #0ea5e9',
              borderRadius: 4, fontSize: 11, textDecoration: 'none', color: '#0f172a',
            }}>
              <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>
                {a.source} · {a.date}
                {a.tone !== 0 && (
                  <span style={{ marginLeft: 6, color: a.tone > 0 ? '#16a34a' : '#dc2626' }}>
                    tono {a.tone > 0 ? '+' : ''}{a.tone.toFixed(1)}
                  </span>
                )}
              </p>
            </a>
          ))}
        </div>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function HumanitarianBlock({ layer }: { layer: HumanitarianLayer | null }) {
  if (!layer) return <BlockShell title="Crisis humanitaria" accent="#0ea5e9" emoji="◓" emptyMessage="ReliefWeb no disponible">{null}</BlockShell>
  return (
    <BlockShell title="Crisis humanitaria" accent="#0ea5e9" emoji="◓" emptyMessage={null}>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: '#0f172a' }}>
        <strong>{layer.n_reports}</strong> reports recientes · {layer.total_available?.toLocaleString('es-ES') || '—'} disponibles
      </p>
      {layer.recent.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {layer.recent.slice(0, 5).map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{
              padding: 6, background: '#f0f9ff', borderLeft: '3px solid #0ea5e9',
              borderRadius: 4, fontSize: 11, textDecoration: 'none', color: '#0f172a',
            }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{r.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>{r.source} · {r.date?.slice(0, 10)}</p>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin reports recientes.</p>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function SanctionsBlock({ layer }: { layer: SanctionsLayer | null }) {
  if (!layer) return <BlockShell title="Sanciones internacionales" accent="#f59e0b" emoji="!" emptyMessage="Listas consolidadas no disponibles">{null}</BlockShell>
  return (
    <BlockShell title="Sanciones internacionales" accent="#f59e0b" emoji="!" emptyMessage={null}>
      <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: layer.total_count > 0 ? '#92400e' : '#16a34a' }}>
        {layer.total_count} entidades sancionadas
      </p>
      {Object.keys(layer.by_program).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {Object.entries(layer.by_program).map(([k, n]) => (
            <span key={k} style={{
              background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: 999,
              fontSize: 10, fontWeight: 600, border: '1px solid #fde68a',
            }}>{k}: {n}</span>
          ))}
        </div>
      )}
      {layer.sample.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {layer.sample.map((s, i) => (
            <div key={i} style={{
              padding: 6, background: '#fffbeb', borderLeft: '3px solid #f59e0b',
              borderRadius: 4, fontSize: 11,
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{s.entity}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#92400e' }}>
                {s.source}{s.date ? ` · ${s.date}` : ''}{s.reason ? ` · ${s.reason}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function TravelBlock({ layer }: { layer: TravelLayer | null }) {
  if (!layer) return <BlockShell title="Riesgo para ciudadanos" accent="#dc2626" emoji="✦" emptyMessage="Travel Advisory no disponible">{null}</BlockShell>
  const c = layer.score >= 4.5 ? '#7f1d1d' : layer.score >= 3.5 ? '#dc2626' : layer.score >= 2.5 ? '#f97316' : '#16a34a'
  return (
    <BlockShell title="Riesgo para ciudadanos" accent={c} emoji="✦" emptyMessage={null}>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: c, lineHeight: 1 }}>
        {layer.score?.toFixed(1) ?? '—'} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>/ 5</span>
      </p>
      <p style={{ margin: '4px 0 8px', fontSize: 12, color: c, fontWeight: 600 }}>
        {layer.band}
      </p>
      {layer.message && (
        <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
          {layer.message}
        </p>
      )}
      <SourceFooter source={layer._source} customLastUpdated={layer.updated} />
    </BlockShell>
  )
}

function SeismicBlock({ layer }: { layer: SeismicLayer | null }) {
  if (!layer) return <BlockShell title="Sismos M≥5.0 · 30d" accent="#475569" emoji="◈" emptyMessage="USGS sin datos o país sin coordenadas">{null}</BlockShell>
  return (
    <BlockShell title="Sismos M≥5.0 · 30d" accent="#475569" emoji="◈" emptyMessage={null}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: layer.events_30d > 10 ? '#dc2626' : layer.events_30d > 0 ? '#f59e0b' : '#16a34a' }}>
          {layer.events_30d}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>sismos · radio 1500 km</span>
        {layer.max_magnitude !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
            Mag máx: <strong>{layer.max_magnitude}</strong>
          </span>
        )}
      </div>
      {layer.recent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {layer.recent.map((e, i) => (
            <div key={i} style={{
              padding: 5, background: '#f8fafc', borderLeft: `3px solid ${e.mag >= 6 ? '#dc2626' : '#f59e0b'}`,
              borderRadius: 4, fontSize: 11,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ color: '#0f172a' }}>{e.place}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', color: e.mag >= 6 ? '#dc2626' : '#f59e0b', fontWeight: 700 }}>
                  M{e.mag}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>{e.date} · {e.depth_km} km</p>
            </div>
          ))}
        </div>
      )}
      <SourceFooter source={layer._source} />
    </BlockShell>
  )
}

function TopRisksBlock({ risk, countryName }: { risk: RiskLayer | null; countryName: string }) {
  if (!risk || risk.related_top_risks.length === 0) {
    return (
      <BlockShell title={`Top Risks Politeia · ${countryName}`} accent="#7c3aed" emoji="◆" emptyMessage="Sin top risks específicos en este momento">{null}</BlockShell>
    )
  }
  return (
    <BlockShell title={`Top Risks Politeia · ${countryName}`} accent="#7c3aed" emoji="◆" emptyMessage={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {risk.related_top_risks.map((r) => (
          <div key={r.rank} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto',
            gap: 10, padding: '6px 8px', background: '#faf5ff',
            borderRadius: 4, fontSize: 11,
          }}>
            <span style={{ color: '#7c3aed', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const }}>#{r.rank}</span>
            <span style={{ color: '#0f172a' }}>{r.title}</span>
            <span style={{ fontSize: 9, color: '#7c3aed', textTransform: 'uppercase' }}>ES · {r.spain_exposure}</span>
          </div>
        ))}
      </div>
      <SourceFooter source={risk._source} />
    </BlockShell>
  )
}

function CoverageFooter({ data }: { data: CountryProfile }) {
  return (
    <section style={{
      marginTop: 18, padding: 14, background: '#f8fafc',
      border: '1px solid #e5e7eb', borderRadius: 10,
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        ◇ Cobertura del perfil · {data.layers_count} de 9 capas con datos
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
        Capas resueltas: <strong>{data.layers_available.join(' · ')}</strong>.
        Cada bloque cita su fuente con tipo de acceso, confianza, última actualización y URL original
        en su footer respectivo. Las capas que aparezcan vacías indican que la fuente no respondió o
        no tiene datos para este país.
      </p>
      {data._meta && (
        <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
          Generado en {data._meta.latency_ms} ms · {data._meta.generated_at} · version {data._meta.version}
        </p>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────
// Helpers UI
// ────────────────────────────────────────────────────────────────────

function BlockShell({
  title, accent, emoji, emptyMessage, children,
}: {
  title: string
  accent: string
  emoji: string
  emptyMessage: string | null
  children: React.ReactNode
}) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16,
    }}>
      <p style={{
        margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
        color: accent, textTransform: 'uppercase',
      }}>
        {emoji} {title}
      </p>
      {emptyMessage ? (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {emptyMessage}
        </p>
      ) : children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#1e293b', borderRadius: 6 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' as const }}>{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#0f172a' }}>
        {value}
      </p>
    </div>
  )
}
