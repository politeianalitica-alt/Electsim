'use client'
/**
 * <TSVisionGlobalView /> · Tercer Sector v3 · TercerSectorShell · sección por defecto
 *
 * CUADRO EJECUTIVO del tercer sector (re-enfocado en Sprint TS3). Principio de
 * diseño igual que la Visión Global de Energía/Turismo: SNAPSHOTS, NO detalle.
 * Esta vista da los titulares y el veredicto; el detalle vive en sus pestañas y
 * aquí NO se replica:
 *   - directorio dinámico de ONGs, fichas, filtros → pestaña «Organizaciones».
 *   - mapa-mundi de receptores, timeline de desembolsos, sectores DAC, ONGD
 *     reportantes → pestaña «Cooperación».
 *   - convocatorias/concesiones BDNS, grants UE, IRPF a fondo → «Financiación».
 *   - buscador multinivel + análisis de pliegos por IA → «Licitaciones».
 *   - macro, marco regulatorio, transparencia → «Contexto e impacto».
 *
 * Lo que SÍ vive aquí (cabecera ejecutiva):
 *   - Fila de KPIs hero (<HeroKpis>): entidades del tercer sector (catálogo
 *     vivo), empleo e ingresos agregados (seed curado · no hay fuente viva),
 *     total subvenciones (BDNS), actividades IATI y total desembolsado (IATI).
 *   - <TSGlobalExecRead /> · lectura ejecutiva que sintetiza el cuadro.
 *   - 3 tarjetas-snapshot (<TSGlobalCoopSnapshot>, <TSGlobalFinanciacionSnapshot>,
 *     <TSGlobalLicitacionesSnapshot>), cada una con «ver detalle →» a su pestaña.
 *   - El mapa OSINT del sector + el widget de Cuaderno (preservados).
 *
 * UN SOLO Promise.all alimenta toda la vista (4 endpoints) y reparte los
 * envelopes a los snapshots por props (sin re-fetch). El panel IATI legacy
 * (`/api/iati/spain-overview`) se sustituye por el snapshot de cooperación, que
 * consume el endpoint CANÓNICO de TS v3 (`/api/tercer-sector/iati/overview`):
 * misma información de cabecera, una sola fuente de verdad, sin duplicar.
 *
 * Degradación honesta (CLAUDE.md): IATI sin clave → aviso del envelope, valores
 * null → '—', nunca datos inventados. Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { SectorHero } from '@/components/SectorialWidgets'
import { useUrlState } from '@/lib/useUrlState'
// Primitiva GENÉRICA reutilizada del sector energía (CLAUDE.md: una sola
// implementación; el spec pide importar/reusar HeroKpis, no duplicarla).
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import type { TercerSectorTab } from './TercerSectorShell'
import { TS_ACCENT, TS_ACCENT_DARK } from './TSGlobalShared'
import { TSGlobalExecRead, type ExecReadSignals } from './TSGlobalExecRead'
import { TSGlobalAlertasAnalista } from './TSGlobalAlertasAnalista'
import { TSGlobalCoopSnapshot, type IatiOverviewEnvelope } from './TSGlobalCoopSnapshot'
import { TSGlobalFinanciacionSnapshot, type FinanciacionEnvelope } from './TSGlobalFinanciacionSnapshot'
import { TSGlobalLicitacionesSnapshot, type LicitacionesResponse } from './TSGlobalLicitacionesSnapshot'
import { TSGlobalTerritorioSnapshot } from './TSGlobalTerritorioSnapshot'

const REFRESH_MS = 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────────
// Seed mínimo de entidades cumbre (curado · datado por fuente) — SOLO para los
// agregados de EMPLEO e INGRESOS de cabecera, para los que no hay un endpoint
// vivo (las memorias anuales no son una API). El nº de entidades, las
// subvenciones, las actividades IATI y los desembolsos SÍ son en vivo. El
// directorio dinámico completo (de-hardcode) lo sirve «Organizaciones» (TS4).
// ─────────────────────────────────────────────────────────────────
interface SeedOrg {
  short_name: string
  irpf_07: boolean
  ingresos_anuales_eur: number | null
  empleados: number | null
}

const SEED: SeedOrg[] = [
  { short_name: 'Cáritas', irpf_07: true, ingresos_anuales_eur: 386_000_000, empleados: 5800 },
  { short_name: 'Cruz Roja', irpf_07: true, ingresos_anuales_eur: 942_000_000, empleados: 12500 },
  { short_name: 'Oxfam Intermón', irpf_07: true, ingresos_anuales_eur: 78_000_000, empleados: 700 },
  { short_name: 'MSF España', irpf_07: true, ingresos_anuales_eur: 138_000_000, empleados: 320 },
  { short_name: 'UNICEF España', irpf_07: true, ingresos_anuales_eur: 71_000_000, empleados: 250 },
  { short_name: 'Manos Unidas', irpf_07: true, ingresos_anuales_eur: 51_000_000, empleados: 170 },
  { short_name: 'ACNUR España', irpf_07: true, ingresos_anuales_eur: 36_000_000, empleados: 95 },
  { short_name: 'Aldeas Infantiles', irpf_07: true, ingresos_anuales_eur: 45_000_000, empleados: 600 },
  { short_name: 'Save the Children', irpf_07: true, ingresos_anuales_eur: 28_000_000, empleados: 200 },
  { short_name: 'Amnistía Internacional', irpf_07: false, ingresos_anuales_eur: 11_000_000, empleados: 75 },
  { short_name: 'Greenpeace', irpf_07: false, ingresos_anuales_eur: 10_500_000, empleados: 60 },
  { short_name: 'WWF', irpf_07: true, ingresos_anuales_eur: 8_500_000, empleados: 55 },
  { short_name: 'SEO/BirdLife', irpf_07: true, ingresos_anuales_eur: 9_700_000, empleados: 95 },
  { short_name: 'Ecologistas en Acción', irpf_07: false, ingresos_anuales_eur: 3_500_000, empleados: 35 },
  { short_name: 'Mainel', irpf_07: true, ingresos_anuales_eur: 2_800_000, empleados: 32 },
  { short_name: 'FESBAL', irpf_07: true, ingresos_anuales_eur: 18_000_000, empleados: 110 },
  { short_name: 'Aldea Global', irpf_07: false, ingresos_anuales_eur: 1_200_000, empleados: 12 },
  { short_name: 'Plan International', irpf_07: true, ingresos_anuales_eur: 32_000_000, empleados: 140 },
  { short_name: 'Fundación ONCE', irpf_07: true, ingresos_anuales_eur: 87_000_000, empleados: 1500 },
  { short_name: 'CERMI', irpf_07: false, ingresos_anuales_eur: 4_200_000, empleados: 35 },
  { short_name: 'Plena Inclusión', irpf_07: true, ingresos_anuales_eur: 9_500_000, empleados: 75 },
  { short_name: 'CNSE', irpf_07: true, ingresos_anuales_eur: 7_300_000, empleados: 60 },
  { short_name: 'FAD Juventud', irpf_07: true, ingresos_anuales_eur: 12_500_000, empleados: 95 },
  { short_name: 'FSG', irpf_07: true, ingresos_anuales_eur: 41_000_000, empleados: 850 },
  { short_name: 'Fund. Caja Ingenieros', irpf_07: false, ingresos_anuales_eur: 1_800_000, empleados: 12 },
  { short_name: '"la Caixa"', irpf_07: false, ingresos_anuales_eur: 504_000_000, empleados: 800 },
  { short_name: 'Fund. BBVA', irpf_07: false, ingresos_anuales_eur: 40_000_000, empleados: 60 },
  { short_name: 'CEPES', irpf_07: false, ingresos_anuales_eur: 2_400_000, empleados: 20 },
  { short_name: 'PTS', irpf_07: false, ingresos_anuales_eur: 1_500_000, empleados: 12 },
  { short_name: 'CONGDE', irpf_07: false, ingresos_anuales_eur: 2_100_000, empleados: 25 },
]

// Shape mínimo del envelope de /organizaciones (solo lo que usa la cabecera: el
// nº total de entidades del catálogo). Las facetas se explotan en la pestaña
// «Organizaciones», no aquí.
interface OrganizacionesEnvelope {
  ok: boolean
  data: { catalogo_total?: number } | null
}

/** País receptor #1 legible (para la lectura ejecutiva). */
const COUNTRY_NAMES: Record<string, string> = {
  UA: 'Ucrania', MA: 'Marruecos', SN: 'Senegal', HT: 'Haití', CO: 'Colombia',
  PE: 'Perú', NI: 'Nicaragua', GT: 'Guatemala', ET: 'Etiopía', MZ: 'Mozambique',
  BO: 'Bolivia', PS: 'Palestina', SY: 'Siria', YE: 'Yemen', CD: 'RD Congo',
}

export function TSVisionGlobalView() {
  // Navegación a otras pestañas del shell (mismo searchParam `?ts=`).
  const [, setTab] = useUrlState<TercerSectorTab>('ts', 'global')
  const onNavigate = (t: TercerSectorTab) => setTab(t)

  // Envelopes vivos (un solo origen de datos para todo el cuadro).
  const [orgs, setOrgs] = useState<OrganizacionesEnvelope | null>(null)
  const [iati, setIati] = useState<IatiOverviewEnvelope | null>(null)
  const [financiacion, setFinanciacion] = useState<FinanciacionEnvelope | null>(null)
  const [licitaciones, setLicitaciones] = useState<LicitacionesResponse | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = async () => {
    const [o, i, f, l] = await Promise.all([
      fetch('/api/tercer-sector/organizaciones?pageSize=1', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<OrganizacionesEnvelope>) : null))
        .catch(() => null),
      fetch('/api/tercer-sector/iati/overview', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<IatiOverviewEnvelope>) : null))
        .catch(() => null),
      fetch('/api/tercer-sector/financiacion', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<FinanciacionEnvelope>) : null))
        .catch(() => null),
      fetch('/api/tercer-sector/licitaciones?pageSize=5', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<LicitacionesResponse>) : null))
        .catch(() => null),
    ])
    setOrgs(o)
    setIati(i)
    setFinanciacion(f)
    setLicitaciones(l)
    setUpdatedAt(new Date())
    setLoaded(true)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // ── Señales derivadas (vivas) ───────────────────────────────────────────
  const entidades = orgs?.ok ? orgs.data?.catalogo_total ?? null : null

  const iatiData = iati?.ok ? iati.data : null
  const iatiActividades = iatiData?.mode === 'datastore' ? iatiData.total_activities : null
  const iatiDesembolsado = iatiData?.total_disbursed_eur ?? null
  const iatiMode = iatiData?.mode ?? null
  const topCountryFacet = iatiData?.top_recipient_countries?.[0] ?? null
  const topPaisCoop = topCountryFacet
    ? topCountryFacet.name && topCountryFacet.name !== topCountryFacet.code
      ? topCountryFacet.name
      : COUNTRY_NAMES[topCountryFacet.code] ?? topCountryFacet.code
    : null

  // Total subvenciones robusto: prefer TS-specific total from enriched endpoint
  // (resumen.total_concedido_ts_eur), fallback to raw sum sobre concesiones BDNS,
  // y por último resumen.total_concedido_eur · recompute defensivo.
  const fdata = financiacion?.data ?? null
  const sumImporte = (fdata?.concesiones ?? []).reduce(
    (s, c) => s + (typeof c.importe_eur === 'number' ? c.importe_eur : 0),
    0,
  )
  const totalSubvencionesTs = fdata?.resumen?.total_concedido_ts_eur ?? null
  const totalSubvenciones = totalSubvencionesTs ?? (sumImporte > 0 ? sumImporte : fdata?.resumen?.total_concedido_eur ?? null)

  const licitacionesTotal = typeof licitaciones?.total === 'number' ? licitaciones.total : null

  // ── KPIs hero · entidades (vivo) · ingresos/empleo (seed) · subvenciones,
  //    actividades IATI y desembolsos (vivo). Solo titulares.
  const seedIngresos = SEED.reduce((s, o) => s + (o.ingresos_anuales_eur ?? 0), 0)
  const seedEmpleados = SEED.reduce((s, o) => s + (o.empleados ?? 0), 0)

  const heroItems: HeroKpiItem[] = [
    {
      label: 'Entidades (catálogo)',
      value: entidades,
      decimals: 0,
      color: '#86EFAC',
      footer: 'Directorio vivo · TS Organizaciones',
    },
    {
      label: 'Ingresos agregados (est.)',
      value: Math.round(seedIngresos / 1_000_000),
      unit: 'M€',
      decimals: 0,
      color: '#FCD34D',
      footer: 'Estimación curada · entidades cumbre · memorias (no en vivo)',
    },
    {
      label: 'Empleo directo (est.)',
      value: seedEmpleados,
      decimals: 0,
      color: '#7DD3FC',
      footer: 'Estimación curada · entidades cumbre · plantilla (no en vivo)',
    },
    {
      label: 'Subvenciones TS',
      value: totalSubvenciones != null ? Math.round(totalSubvenciones / 1_000_000) : null,
      unit: 'M€',
      decimals: 0,
      color: '#FDBA74',
      footer: totalSubvencionesTs != null
        ? 'Concesiones TS filtradas (NIF+keyword)'
        : 'Concesiones recientes al tercer sector',
    },
    {
      label: 'Actividades IATI',
      value: iatiActividades,
      decimals: 0,
      color: '#C4B5FD',
      footer: iatiMode === 'registry' ? 'Requiere Datastore (IATI_API_KEY)' : 'Cooperación declarada',
    },
    {
      label: 'Desembolsado cooperación',
      value: iatiDesembolsado != null ? Math.round(iatiDesembolsado / 1_000_000) : null,
      unit: 'M€',
      decimals: 0,
      color: '#FCA5A5',
      footer: 'IATI · transacciones tipo 3',
    },
  ]

  const execSignals: ExecReadSignals = {
    entidades,
    totalSubvenciones,
    iatiActividades,
    iatiDesembolsado,
    iatiMode,
    licitacionesTotal,
    topPaisCoop,
  }

  return (
    <div>
      <SectorHero
        accent={TS_ACCENT}
        accentDark={TS_ACCENT_DARK}
        eyebrow="SECTORIAL · TERCER SECTOR · ECONOMÍA SOCIAL · ONGs · CUADRO EJECUTIVO"
        title="Tercer sector y ONGs · visión global"
        sub="Titulares en vivo (catálogo de entidades · subvenciones BDNS · cooperación IATI · licitaciones multinivel). El directorio dinámico de ONGs, la cooperación a fondo, la financiación detallada, las licitaciones con análisis de pliegos y el contexto de impacto viven en las pestañas superiores."
        updatedAt={updatedAt}
        onRefresh={refresh}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={!loaded} />
          </div>
        }
      />

      {/* ───── Fila de alertas accionables del analista (lo primero) ─────
          Hace su propio fetch (oportunidades scoreMin=55 + territorio); cada
          tarjeta enlaza a la pestaña accionable vía onNavigate (?ts=). ───── */}
      <div style={{ marginBottom: 14 }}>
        <TSGlobalAlertasAnalista onNavigate={onNavigate} />
      </div>

      {/* ───── Lectura ejecutiva · veredicto de cabecera ───── */}
      <div style={{ marginBottom: 14 }}>
        <TSGlobalExecRead signals={execSignals} loading={!loaded} />
      </div>

      {/* ───── Tarjetas-snapshot (cada una enlaza a su pestaña) ───── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <TSGlobalCoopSnapshot env={iati} loading={!loaded} onNavigate={onNavigate} />
        <TSGlobalFinanciacionSnapshot env={financiacion} loading={!loaded} onNavigate={onNavigate} />
        <TSGlobalLicitacionesSnapshot res={licitaciones} loading={!loaded} onNavigate={onNavigate} />
        {/* Snapshot territorial (top-5 CCAA · fetch propio a /territorio) ───── */}
        <TSGlobalTerritorioSnapshot onNavigate={onNavigate} />
      </div>

      {/* ───── Mapa OSINT del sector (preservado) ───── */}
      <div style={{ marginBottom: 14 }}>
        <SectorMapPreview sector="tercer-sector" accent={TS_ACCENT} height={320} />
      </div>

      {/* Cuaderno · notas que mencionan el sector Tercer Sector */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="tercer-sector" name="Tercer Sector" accentColor="#16A34A" />
      </div>
    </div>
  )
}

export default TSVisionGlobalView
