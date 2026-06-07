'use client'
/**
 * <TSGlobalCoopSnapshot /> · Tercer Sector v3 · Sprint TS3 (Visión Global)
 *
 * SNAPSHOT de la cooperación internacional española declarada a IATI. Consume el
 * endpoint canónico de TS v3 `/api/tercer-sector/iati/overview` (envelope
 * `{ ok, data, degraded?, ... }`), que con IATI_API_KEY usa el Datastore
 * (facetas país/sector/org + desembolsos) y sin ella degrada al Registry keyless
 * mostrando solo las ONGD reportantes.
 *
 * Esta tarjeta da TITULARES (nº actividades, total desembolsado, top país /
 * sector / org). El detalle a fondo —mapa-mundi de receptores, timeline de
 * desembolsos, ficha por ONGD reportante, sectores DAC completos— vive en la
 * pestaña «Cooperación» y NO se replica aquí.
 *
 * Degradación honesta (CLAUDE.md): sin Datastore se muestra el aviso del
 * envelope (`degraded_reason`) y los campos no disponibles van a '—'. Cero
 * emojis · Unicode geométrico.
 *
 * No hace fetch: recibe el envelope ya resuelto por <TSVisionGlobalView /> (un
 * solo origen de datos para todo el cuadro, sin re-fetch).
 */
import type { TercerSectorTab } from './TercerSectorShell'
import { SnapshotCard, SnapStat, fmtEur, fmtInt, TS_ACCENT_DARK } from './TSGlobalShared'

// ── Shape mínimo consumido del envelope (no acoplar a lib/) ───────────────
export interface FacetCount {
  code: string
  name: string
  count: number
}
export interface IatiOverviewData {
  total_activities: number
  total_disbursed_eur: number | null
  top_recipient_countries: FacetCount[]
  top_sectors: FacetCount[]
  top_reporting_orgs: FacetCount[]
  mode: 'datastore' | 'registry'
}
export interface IatiOverviewEnvelope {
  ok: boolean
  data: IatiOverviewData | null
  degraded?: boolean
  degraded_reason?: string
  error?: string
  fetched_at?: string
  source_url?: string
}

// ISO-2 → nombre país (subset cooperación; el resto cae a su código).
const COUNTRY_NAMES: Record<string, string> = {
  UA: 'Ucrania', MA: 'Marruecos', SN: 'Senegal', HT: 'Haití', CO: 'Colombia',
  PE: 'Perú', NI: 'Nicaragua', GT: 'Guatemala', ET: 'Etiopía', MZ: 'Mozambique',
  BO: 'Bolivia', PS: 'Palestina', SY: 'Siria', YE: 'Yemen', CD: 'RD Congo',
  CU: 'Cuba', DO: 'R. Dominicana', EC: 'Ecuador', SV: 'El Salvador', HN: 'Honduras',
  ML: 'Malí', NE: 'Níger', MR: 'Mauritania', JO: 'Jordania', LB: 'Líbano',
}

function pais(c: FacetCount): string {
  return c.name && c.name !== c.code ? c.name : COUNTRY_NAMES[c.code] ?? c.code
}

export function TSGlobalCoopSnapshot({
  env,
  loading,
  onNavigate,
}: {
  env: IatiOverviewEnvelope | null
  loading: boolean
  onNavigate: (tab: TercerSectorTab) => void
}) {
  const data = env?.ok ? env.data : null
  const degraded = Boolean(env?.degraded) || data?.mode === 'registry'
  const topCountry = data?.top_recipient_countries?.[0] ?? null
  const topSector = data?.top_sectors?.[0] ?? null
  const topOrg = data?.top_reporting_orgs?.[0] ?? null

  const degradedNote =
    !loading && (degraded || !data)
      ? env?.degraded_reason ??
        (env?.error
          ? `IATI no disponible · ${env.error}`
          : 'Sin IATI_API_KEY: país receptor, sector DAC y desembolsos requieren el Datastore. Se muestran las ONGD reportantes (Registry, keyless).')
      : null

  return (
    <SnapshotCard
      title="Cooperación internacional · IATI"
      subtitle="Ayuda al desarrollo declarada por orgs españolas"
      sourceLabel="IATI"
      sourceUrl="https://iatistandard.org"
      detalleTab="cooperacion"
      detalleLabel="Ver cooperación a fondo"
      onNavigate={onNavigate}
      loading={loading}
      degradedNote={degradedNote}
    >
      {/* Titulares: actividades + desembolsado (Datastore) o nº ONGD (registry) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        <SnapStat
          label="Actividades reportadas"
          value={data && data.mode === 'datastore' ? fmtInt(data.total_activities) : '—'}
          color={TS_ACCENT_DARK}
        />
        <SnapStat label="Total desembolsado" value={fmtEur(data?.total_disbursed_eur ?? null)} color="#B45309" />
      </div>

      {/* Top país / sector / org reportante (lo que haya según el modo) */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <RankRow label="País receptor #1" value={topCountry ? pais(topCountry) : '—'} count={topCountry?.count ?? null} mode={data?.mode} />
        <RankRow
          label="Sector DAC #1"
          value={topSector ? `${topSector.code} · ${topSector.name}` : '—'}
          count={topSector?.count ?? null}
          mode={data?.mode}
        />
        <RankRow
          label={data?.mode === 'registry' ? 'ONGD reportante #1' : 'Org. reportante #1'}
          value={topOrg ? topOrg.name || topOrg.code : '—'}
          count={topOrg?.count ?? null}
          mode={data?.mode}
          countLabel={data?.mode === 'registry' ? 'datasets' : 'act.'}
        />
      </ul>
    </SnapshotCard>
  )
}

function RankRow({
  label,
  value,
  count,
  mode,
  countLabel = 'act.',
}: {
  label: string
  value: string
  count: number | null
  mode?: 'datastore' | 'registry'
  countLabel?: string
}) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
      {count != null && (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {count.toLocaleString('es-ES')} {countLabel}
        </span>
      )}
    </li>
  )
}

export default TSGlobalCoopSnapshot
