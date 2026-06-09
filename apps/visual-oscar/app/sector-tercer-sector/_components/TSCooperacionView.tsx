'use client'
/**
 * <TSCooperacionView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS5
 *
 * COOPERACIÓN INTERNACIONAL (IATI) a fondo — "exprimir IATI". Explota las tres
 * APIs IATI vía la capa `/api/tercer-sector/iati/*`:
 *   1) Panorama · KPIs (actividades · desembolsado · nº países · nº orgs).
 *   2) Países receptores · mapa-coroplético mundial + ranking de barras.
 *   3) Sectores DAC · distribución en barras con etiquetas de codelists.
 *   4) Organizaciones reportantes · tabla de ONGD españolas (ref IATI, datasets)
 *      con drill a sus actividades.
 *   5) Desembolsos · timeline anual en EUR comparables.
 *   6) Actividades · tabla drill que reacciona a los filtros (país/org/sector).
 *
 * Filtros cruzados: clic en país (mapa/ranking), en sector (barras) o en org
 * (tabla) acota actividades y desembolsos. Un chip permite limpiar cada filtro.
 *
 * Degradación honesta (CLAUDE.md): sin IATI_API_KEY el Datastore cae (401) y el
 * overview llega `degraded:true` (mode 'registry'): se muestra el directorio de
 * ONGD del Registry KEYLESS + una banda ámbar explicando que país/sector/
 * importes/desembolsos requieren la key. Nunca se inventan datos.
 *
 * Reusa: SectorHero + HeroKpis (genéricas) y Panel (SectorPanel). Sub-componentes
 * propios Coop / Iati en este mismo directorio. Cero emojis · Unicode geométrico.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel, SectorHero } from '@/components/SectorialWidgets'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import type {
  CodelistsData,
  IatiOrgsData,
  IatiOverviewData,
} from '@/lib/tercer-sector/iati-types'
import {
  ACCENT,
  ACCENT_DARK,
  CoopSkeleton,
  DegradedBanner,
  countryName,
  fmtInt,
  getEnvelope,
  sectorName,
  toMillones,
} from './CoopShared'
import { CoopWorldMap, type CoopMapDatum } from './CoopWorldMap'
import { CoopPaisesRanking } from './CoopPaisesRanking'
import { IatiSectoresChart } from './IatiSectoresChart'
import { IatiOrgsTable } from './IatiOrgsTable'
import { IatiTimelineChart } from './IatiTimelineChart'
import { IatiActivitiesPanel } from './IatiActivitiesPanel'
import { CoopOrgProfile } from './CoopOrgProfile'
import { CoopYearlyHeatmap } from './CoopYearlyHeatmap'
import { CoopTopFlows } from './CoopTopFlows'
import { CoopOportunidadesRelacionadas } from './CoopOportunidadesRelacionadas'
import { SectorMapPreview } from '@/components/SectorMapPreview'

interface FilterState {
  country: { iso: string; name: string } | null
  sector: { code: string; name: string } | null
  org: { ref: string; name: string } | null
}

export function TSCooperacionView() {
  const [overview, setOverview] = useState<IatiOverviewData | null>(null)
  const [degradedReason, setDegradedReason] = useState<string | null>(null)
  const [isDegraded, setIsDegraded] = useState(false)
  const [orgs, setOrgs] = useState<IatiOrgsData | null>(null)
  const [codelists, setCodelists] = useState<CodelistsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [filters, setFilters] = useState<FilterState>({ country: null, sector: null, org: null })
  // Sprint IATI-MAX · drawer del perfil ONGD (al doble-click en la tabla).
  const [profileOrg, setProfileOrg] = useState<{ ref: string; name: string } | null>(null)

  // Carga inicial: overview + orgs (keyless) + codelists (keyless), en paralelo.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    Promise.all([
      getEnvelope<IatiOverviewData>('/api/tercer-sector/iati/overview', ctrl.signal),
      getEnvelope<IatiOrgsData>('/api/tercer-sector/iati/orgs', ctrl.signal),
      getEnvelope<CodelistsData>('/api/tercer-sector/iati/codelists', ctrl.signal),
    ]).then(([ovr, org, cl]) => {
      if (ctrl.signal.aborted) return
      if (ovr.ok && ovr.data) {
        setOverview(ovr.data)
        setIsDegraded(Boolean(ovr.degraded) || ovr.data.mode === 'registry')
        setDegradedReason(ovr.degraded_reason ?? null)
      } else {
        setOverview(null)
        setIsDegraded(true)
        setDegradedReason(ovr.error ?? null)
      }
      if (org.ok && org.data) setOrgs(org.data)
      if (cl.ok && cl.data) setCodelists(cl.data)
      setFetchedAt(ovr.fetched_at ?? new Date().toISOString())
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [reloadKey])

  // ── Derivados ──────────────────────────────────────────────────────────
  const datastoreMode = overview?.mode === 'datastore'

  // Países: enriquecer nombre con codelists (por si llega código pelado).
  const countriesFacets = useMemo(
    () =>
      (overview?.top_recipient_countries ?? []).map((c) => ({
        ...c,
        name: c.name && c.name !== c.code ? c.name : countryName(codelists, c.code),
      })),
    [overview, codelists],
  )

  const sectorsFacets = useMemo(
    () =>
      (overview?.top_sectors ?? []).map((s) => ({
        ...s,
        name: s.name && s.name !== s.code ? s.name : sectorName(codelists, s.code),
      })),
    [overview, codelists],
  )

  const mapData = useMemo<CoopMapDatum[]>(
    () => countriesFacets.filter((c) => c.code && c.count > 0).map((c) => ({ iso2: c.code, name: c.name, value: c.count })),
    [countriesFacets],
  )

  // KPIs: nº países / nº orgs salen del overview (datastore) o del directorio.
  const nPaises = countriesFacets.filter((c) => c.count > 0).length
  const nOrgsReportantes = orgs?.total ?? overview?.top_reporting_orgs.length ?? null
  const heroItems: HeroKpiItem[] = [
    {
      label: 'Actividades',
      value: datastoreMode ? overview?.total_activities ?? null : null,
      decimals: 0,
      color: '#86EFAC',
      footer: datastoreMode ? 'Reportadas por orgs ES a IATI' : 'Requiere IATI_API_KEY',
    },
    {
      label: 'Desembolsado',
      value: datastoreMode ? toMillones(overview?.total_disbursed_eur ?? null) : null,
      unit: 'M€',
      decimals: 1,
      color: '#FCD34D',
      footer: datastoreMode ? 'Mínimo comparable en EUR' : 'Requiere IATI_API_KEY',
    },
    {
      label: 'Países receptores',
      value: datastoreMode ? nPaises : null,
      decimals: 0,
      color: '#7DD3FC',
      footer: datastoreMode ? 'Con ayuda ES declarada' : 'Requiere IATI_API_KEY',
    },
    {
      label: 'ONGD reportantes',
      value: nOrgsReportantes,
      decimals: 0,
      color: '#C4B5FD',
      footer: 'IATI Registry (keyless)',
    },
  ]

  // ── Handlers de filtro (toggle: re-clic limpia) ─────────────────────────
  const setCountry = (iso: string, name: string) =>
    setFilters((f) => ({ ...f, country: f.country?.iso === iso ? null : { iso, name } }))
  const setSector = (code: string, name: string) =>
    setFilters((f) => ({ ...f, sector: f.sector?.code === code ? null : { code, name } }))
  const setOrg = (ref: string, name: string) =>
    setFilters((f) => ({ ...f, org: f.org?.ref === ref ? null : { ref, name } }))

  const anyFilter = Boolean(filters.country || filters.sector || filters.org)

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="TERCER SECTOR · COOPERACIÓN INTERNACIONAL · IATI"
        title="Cooperación internacional al desarrollo"
        sub="Explotación a fondo de IATI (International Aid Transparency Initiative): la ayuda española declarada por país receptor (mapa mundi), por ONGD reportante y por sector CAD/DAC, con desembolsos en el tiempo y drill a actividades. Fuentes: Datastore (con IATI_API_KEY), Registry y Codelists (keyless)."
        updatedAt={fetchedAt ? new Date(fetchedAt) : null}
        onRefresh={() => setReloadKey((k) => k + 1)}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={loading} />
          </div>
        }
      />

      {/* Banda honesta de modo degradado (sin key). */}
      {!loading && isDegraded && <DegradedBanner reason={degradedReason} />}

      {/* Chips de filtros activos. */}
      {anyFilter && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Filtros:</span>
          {filters.country && (
            <FilterChip label={`País · ${filters.country.name}`} onClear={() => setFilters((f) => ({ ...f, country: null }))} />
          )}
          {filters.sector && (
            <FilterChip label={`Sector · ${filters.sector.name}`} onClear={() => setFilters((f) => ({ ...f, sector: null }))} />
          )}
          {filters.org && (
            <FilterChip label={`ONGD · ${filters.org.name}`} onClear={() => setFilters((f) => ({ ...f, org: null }))} />
          )}
          <button
            onClick={() => setFilters({ country: null, sector: null, org: null })}
            style={{ fontSize: 11, fontWeight: 600, color: ACCENT_DARK, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Puente contextual · oportunidades relacionadas (cockpit). Reacciona al
          filtro de país receptor / sector DAC activo; sin filtro, CTA genérico a
          Licitaciones. */}
      <Panel
        title="Oportunidades relacionadas"
        subtitle={
          filters.country
            ? `Puente al agregador de oportunidades · subvenciones, licitaciones y grants de cooperación con ${filters.country.name}`
            : filters.sector
              ? `Puente al agregador de oportunidades · sector CAD/DAC ${filters.sector.name}`
              : 'Selecciona un país receptor o un sector CAD/DAC para ver oportunidades de financiación relacionadas'
        }
        sourceUrl="https://www.infosubvenciones.es"
        sourceLabel="Agregador oportunidades"
        sourceTooltip="BDNS subvenciones + licitaciones (PLACE/TED/SEDIA/WorldBank) · scoring de aptitud ONG"
        apiUrl="/api/tercer-sector/oportunidades"
      >
        <CoopOportunidadesRelacionadas
          pais={filters.country?.name ?? null}
          sector={filters.sector?.name ?? null}
        />
      </Panel>

      {/* 2 · Países receptores: mapa + ranking. */}
      <Panel
        title="Países receptores de la ayuda española"
        subtitle={
          datastoreMode
            ? 'Distribución por país receptor (nº de actividades) · mapa coroplético + ranking · clic para filtrar'
            : 'Requiere IATI_API_KEY (Datastore) para el desglose por país'
        }
        sourceUrl="https://iatistandard.org"
        sourceLabel="IATI Datastore"
        sourceTooltip="IATI Datastore · actividades por recipient_country_code"
        apiUrl="/api/tercer-sector/iati/overview"
      >
        {loading ? (
          <CoopSkeleton height={420} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
            <div>
              <CoopWorldMap
                data={mapData}
                metricLabel="actividades"
                selectedIso={filters.country?.iso ?? null}
                onSelect={setCountry}
              />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', margin: '0 0 8px' }}>
                Top receptores
              </p>
              <CoopPaisesRanking
                countries={countriesFacets}
                selectedIso={filters.country?.iso ?? null}
                onSelect={setCountry}
              />
            </div>
          </div>
        )}
      </Panel>

      {/* 3 · Sectores DAC. */}
      <Panel
        title="Sectores CAD/DAC"
        subtitle={
          datastoreMode
            ? 'Distribución por sector de destino (códigos CAD etiquetados vía codelists IATI) · clic para filtrar'
            : 'Requiere IATI_API_KEY (Datastore) para el desglose por sector'
        }
        sourceUrl="https://iatistandard.org/en/iati-standard/203/codelists/"
        sourceLabel="IATI Codelists"
        sourceTooltip="Sector DAC codelist (keyless) para resolver código→nombre"
        apiUrl="/api/tercer-sector/iati/overview"
      >
        {loading ? (
          <CoopSkeleton height={300} />
        ) : (
          <IatiSectoresChart
            sectors={sectorsFacets}
            codelists={codelists}
            selectedSector={filters.sector?.code ?? null}
            onSelect={setSector}
          />
        )}
      </Panel>

      {/* 4 · Organizaciones reportantes (keyless · siempre disponible). */}
      <Panel
        title="ONGD españolas reportantes en IATI"
        subtitle="Directorio del IATI Registry (CKAN, keyless) · referencia IATI y nº de datasets · clic en una fila para ver sus actividades"
        sourceUrl="https://iatiregistry.org"
        sourceLabel="IATI Registry"
        sourceTooltip="IATI Registry CKAN · organization_list (keyless)"
        apiUrl="/api/tercer-sector/iati/orgs"
      >
        {loading ? (
          <CoopSkeleton height={300} />
        ) : (
          <IatiOrgsTable
            orgs={orgs?.orgs ?? []}
            selectedOrgRef={filters.org?.ref ?? null}
            onSelectOrg={setOrg}
            onOpenProfile={(ref, name) => setProfileOrg({ ref, name })}
          />
        )}
      </Panel>

      {/* 5 · Timeline de desembolsos. */}
      <Panel
        title="Desembolsos en el tiempo"
        subtitle="Serie anual de desembolsos (transaction_type 3) en EUR comparables · refleja los filtros activos"
        sourceUrl="https://iatistandard.org"
        sourceLabel="IATI Datastore"
        sourceTooltip="IATI Datastore · transaction core (transaction_type_code=3)"
        apiUrl="/api/tercer-sector/iati/transacciones"
      >
        <IatiTimelineChart
          reportingOrg={filters.org?.ref ?? null}
          recipientCountry={filters.country?.iso ?? null}
        />
      </Panel>

      {/* 5b · Heatmap años × países · Sprint IATI-MAX (Full Access). */}
      <Panel
        title="Heatmap años × países"
        subtitle={
          datastoreMode
            ? 'Desembolsos EUR por (año × país receptor) · top países por importe acumulado · refleja el filtro de ONGD si lo hay'
            : 'Requiere IATI_API_KEY (Datastore) para el heatmap por año × país'
        }
        sourceUrl="https://iatistandard.org"
        sourceLabel="IATI Datastore"
        sourceTooltip="IATI Datastore · transaction core · agregado por (año, país)"
        apiUrl="/api/tercer-sector/iati/yearly-disbursements"
      >
        <CoopYearlyHeatmap
          reportingOrg={filters.org?.ref ?? null}
          yearsBack={8}
          topN={12}
        />
      </Panel>

      {/* 5c · Top flujos donante→receptor · Sprint IATI-MAX (Full Access). */}
      <Panel
        title="Top flujos ONGD ES → país receptor"
        subtitle={
          datastoreMode
            ? 'Top 20 flujos por importe EUR desembolsado · barras proporcionales (escala log)'
            : 'Requiere IATI_API_KEY (Datastore) para el ranking de flujos'
        }
        sourceUrl="https://iatistandard.org"
        sourceLabel="IATI Datastore"
        sourceTooltip="IATI Datastore · transaction core · top (donor_ref → recipient_country)"
        apiUrl="/api/tercer-sector/iati/top-flows"
      >
        <CoopTopFlows topN={20} />
      </Panel>

      {/* 6 · Actividades (drill). */}
      <Panel
        title="Actividades"
        subtitle={
          anyFilter
            ? 'Actividades que cumplen los filtros activos (país · sector · ONGD)'
            : 'Actividades de las ONGD españolas curadas · usa el mapa, los sectores o la tabla de orgs para acotar'
        }
        sourceUrl="https://iatistandard.org"
        sourceLabel="IATI Datastore"
        sourceTooltip="IATI Datastore · activity core"
        apiUrl="/api/tercer-sector/iati/actividades"
      >
        <IatiActivitiesPanel
          codelists={codelists}
          recipientCountry={filters.country?.iso ?? null}
          reportingOrg={filters.org?.ref ?? null}
          sector={filters.sector?.code ?? null}
        />
      </Panel>

      {/* Nota de fuentes / método. */}
      <p style={{ fontSize: 10.5, color: '#94A3B8', margin: '6px 2px 0', lineHeight: 1.6 }}>
        Fuente: IATI · Datastore (actividades, transacciones · requiere IATI_API_KEY), Registry CKAN (ONGD reportantes · keyless) y
        Codelists (Sector DAC, Country · keyless). {nOrgsReportantes != null && <>Directorio: {fmtInt(nOrgsReportantes)} ONGD españolas reportantes. </>}
        Los importes EUR son un mínimo comparable: solo se agregan valores ya en EUR (no se convierte divisa).
      </p>

      {/* Drawer perfil ONGD · Sprint IATI-MAX. */}
      {profileOrg && (
        <CoopOrgProfile
          orgRef={profileOrg.ref}
          orgName={profileOrg.name}
          onClose={() => setProfileOrg(null)}
        />
      )}

      {/* Mapa OSINT del sector (último · abajo del todo). */}
      <SectorMapPreview sector="tercer-sector" marginTop={28} />
    </div>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        color: ACCENT_DARK,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {label}
      <button
        onClick={onClear}
        aria-label={`Quitar filtro ${label}`}
        style={{ background: 'none', border: 'none', color: ACCENT_DARK, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </span>
  )
}

export default TSCooperacionView
