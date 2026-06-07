'use client'
/**
 * <TSVisionGlobalView /> · Tercer Sector v3 · TercerSectorShell · sección por defecto
 *
 * VISIÓN GLOBAL del tercer sector. En el Sprint TS1 esta vista PRESERVA la
 * funcionalidad viva de la página plana anterior para no perder nada:
 *   - Los KPIs agregados de cabecera, ahora vía la primitiva compartida
 *     <HeroKpis> dentro de <SectorHero> (entidades · ingresos agregados ·
 *     empleo directo · adheridas al IRPF 0,7%).
 *   - El panel IATI en vivo (`/api/iati/spain-overview`, caché 1h): top orgs
 *     reportantes, top países beneficiarios y top sectores DAC.
 *
 * El Sprint TS3 (Ola 2) la re-enfocará como cuadro ejecutivo con snapshots
 * cross-vista (financiación, cooperación, top licitaciones) y de-hardcodeará el
 * cómputo de KPIs hacia fuentes vivas. Mientras tanto, los KPIs agregados se
 * calculan sobre un seed mínimo de entidades cumbre representativas (curado,
 * datado por fuente), idéntico al comportamiento previo de la página.
 *
 * Principio de diseño: SNAPSHOTS, NO detalle (el directorio completo de ONGs vive
 * en «Organizaciones»; la cooperación a fondo en «Cooperación»). Degradación
 * honesta (CLAUDE.md): IATI sin clave → mensaje honesto, nunca datos inventados.
 * Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { Panel, SectorHero } from '@/components/SectorialWidgets'
// Primitiva GENÉRICA reutilizada del sector energía (CLAUDE.md: una sola
// implementación; el spec pide importar/reusar HeroKpis, no duplicarla).
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#15803D'

// ─────────────────────────────────────────────────────────────────
// Seed mínimo de entidades cumbre (curado · datado por fuente) — solo para los
// KPIs AGREGADOS de cabecera, replicando el comportamiento de la página plana.
// El directorio dinámico completo (de-hardcode) lo construye TS4 en la pestaña
// «Organizaciones». No es un listado exhaustivo: es la base de los titulares.
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

// ─────────────────────────────────────────────────────────────────
// Panel IATI · Cooperación internacional declarada (preservado de la página plana)
// ─────────────────────────────────────────────────────────────────
interface IatiData {
  total_activities: number
  by_org: Array<{ ref: string; count: number; name?: string }>
  top_countries: Array<{ iso2: string; count: number }>
  top_sectors: Array<{ code: string; count: number }>
  fetched_at: string
  data_quality: { source_type: string; source_name: string; note?: string }
}

// IATI DAC 3-digit sector codes · subset más común en cooperación ES
const IATI_SECTOR_NAMES: Record<string, string> = {
  '111': 'Educación',
  '112': 'Educación básica',
  '121': 'Salud general',
  '122': 'Salud básica',
  '130': 'Población y salud reproductiva',
  '140': 'Agua y saneamiento',
  '151': 'Gobierno y sociedad civil',
  '152': 'Prevención de conflictos',
  '160': 'Otros sociales',
  '210': 'Transporte',
  '230': 'Energía',
  '240': 'Servicios bancarios',
  '311': 'Agricultura',
  '410': 'Medio ambiente',
  '430': 'Otros productivos',
  '510': 'Ayuda presupuestaria',
  '520': 'Ayuda alimentaria',
  '720': 'Ayuda de emergencia',
  '730': 'Reconstrucción',
  '740': 'Prevención de desastres',
  '910': 'Costes administrativos',
  '998': 'Sin asignación',
}

// ISO-2 → nombre país (subset cooperación)
const COUNTRY_NAMES: Record<string, string> = {
  UA: 'Ucrania', MA: 'Marruecos', SN: 'Senegal', HT: 'Haití',
  CO: 'Colombia', PE: 'Perú', NI: 'Nicaragua', GT: 'Guatemala',
  ET: 'Etiopía', MZ: 'Mozambique', BO: 'Bolivia', PS: 'Palestina',
  SY: 'Siria', YE: 'Yemen', AF: 'Afganistán', MM: 'Myanmar',
  CD: 'RD Congo', SS: 'Sudán del Sur', CU: 'Cuba', DO: 'R. Dominicana',
  EC: 'Ecuador', SV: 'El Salvador', HN: 'Honduras', PY: 'Paraguay',
  LB: 'Líbano', JO: 'Jordania', TN: 'Túnez', DZ: 'Argelia',
  MR: 'Mauritania', BF: 'Burkina Faso', ML: 'Malí', NE: 'Níger',
  MX: 'México', BR: 'Brasil', AR: 'Argentina', CL: 'Chile',
}

function IatiCooperationPanel() {
  const [data, setData] = useState<IatiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/iati/spain-overview', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: IatiData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const subtitle = isLive
    ? `Datos en vivo · ${data?.total_activities.toLocaleString('es-ES')} actividades reportadas por orgs españolas a IATI · cache 1h`
    : 'IATI · International Aid Transparency Initiative'

  return (
    <Panel
      title="Cooperación internacional · IATI"
      subtitle={subtitle}
      sourceUrl="https://iatistandard.org"
      sourceLabel="IATI"
      sourceTooltip="IATI Datastore · actividades de organizaciones reportantes españolas"
      apiUrl="/api/iati/spain-overview"
    >
      {loading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando datos IATI…</p>}
      {!loading && !isLive && (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>
          IATI no disponible · {data?.data_quality?.note ?? 'configurar IATI_API_KEY'}
        </p>
      )}
      {!loading && isLive && data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {/* Top organizaciones */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#475569', fontWeight: 700, margin: 0 }}>
              TOP ORGS REPORTANTES (ES)
            </p>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: 12 }}>
              {data.by_org.slice(0, 8).map((o) => (
                <li key={o.ref} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{o.name ?? o.ref}</span>
                  <span style={{ color: ACCENT_DARK, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {o.count.toLocaleString('es-ES')}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top países beneficiarios */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#475569', fontWeight: 700, margin: 0 }}>
              TOP PAÍSES BENEFICIARIOS
            </p>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: 12 }}>
              {data.top_countries.slice(0, 10).map((c) => (
                <li key={c.iso2} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#0f172a' }}>
                    <code style={{ fontSize: 10, background: '#e2e8f0', padding: '1px 4px', borderRadius: 3, marginRight: 6 }}>
                      {c.iso2}
                    </code>
                    {COUNTRY_NAMES[c.iso2] ?? c.iso2}
                  </span>
                  <span style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                    {c.count.toLocaleString('es-ES')}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top sectores */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#475569', fontWeight: 700, margin: 0 }}>
              TOP SECTORES DAC (CAD)
            </p>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: 12 }}>
              {data.top_sectors.slice(0, 10).map((s) => {
                const sectorRoot = s.code.slice(0, 3)
                const sectorName = IATI_SECTOR_NAMES[sectorRoot] || IATI_SECTOR_NAMES[s.code] || `Sector ${s.code}`
                return (
                  <li key={s.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#0f172a' }}>
                      <code style={{ fontSize: 10, background: '#e2e8f0', padding: '1px 4px', borderRadius: 3, marginRight: 6 }}>
                        {s.code}
                      </code>
                      {sectorName}
                    </span>
                    <span style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                      {s.count.toLocaleString('es-ES')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      {data?.fetched_at && (
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'right' }}>
          Última actualización · {new Date(data.fetched_at).toLocaleString('es-ES')} ·{' '}
          <a
            href="https://iatistandard.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, textDecoration: 'none' }}
          >
            iatistandard.org →
          </a>
        </p>
      )}
    </Panel>
  )
}

export function TSVisionGlobalView() {
  // KPIs agregados (preservados): entidades · ingresos · empleo · IRPF 0,7%.
  const totalEntidades = SEED.length
  const totalIngresos = SEED.reduce((s, o) => s + (o.ingresos_anuales_eur ?? 0), 0)
  const totalEmpleados = SEED.reduce((s, o) => s + (o.empleados ?? 0), 0)
  const orgsIrpf = SEED.filter((o) => o.irpf_07).length

  const heroItems: HeroKpiItem[] = [
    {
      label: 'Entidades cumbre',
      value: totalEntidades,
      decimals: 0,
      color: '#86EFAC',
      footer: 'Seed curado · base de titulares',
    },
    {
      label: 'Ingresos agregados',
      value: Math.round(totalIngresos / 1_000_000),
      unit: 'M€',
      decimals: 0,
      color: '#FCD34D',
      footer: 'Memorias anuales · curado',
    },
    {
      label: 'Empleo directo',
      value: totalEmpleados,
      decimals: 0,
      color: '#7DD3FC',
      footer: 'Plantilla declarada',
    },
    {
      label: 'Adheridas IRPF 0,7%',
      value: `${orgsIrpf} / ${totalEntidades}`,
      color: '#C4B5FD',
      footer: 'Convenio fines sociales',
    },
  ]

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TERCER SECTOR · ECONOMÍA SOCIAL · ONGs"
        title="Tercer sector y ONGs · visión global"
        sub="Titulares del ecosistema (entidades cumbre, ingresos, empleo, IRPF 0,7%) y cooperación internacional declarada a IATI en vivo. El directorio dinámico de ONGs, la financiación, las licitaciones multinivel y el contexto de impacto viven en las pestañas superiores."
        updatedAt={null}
        onRefresh={() => {}}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} />
          </div>
        }
      />

      {/* Vista inicial del mapa OSINT con las capas del sector + ampliar */}
      <div style={{ marginBottom: 14 }}>
        <SectorMapPreview sector="tercer-sector" accent={ACCENT} height={320} />
      </div>

      {/* IATI · Cooperación internacional declarada (panel preservado · en vivo) */}
      <IatiCooperationPanel />

      {/* Cuaderno · notas que mencionan el sector Tercer Sector */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="tercer-sector" name="Tercer Sector" accentColor="#16A34A" />
      </div>
    </div>
  )
}

export default TSVisionGlobalView
