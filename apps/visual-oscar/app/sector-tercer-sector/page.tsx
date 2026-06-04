'use client'
/**
 * /sector-tercer-sector · ONGs y Economía Social.
 *
 * Cubre el ecosistema de ONGs, fundaciones, asociaciones declaradas de utilidad
 * pública, cooperativas y sociedades laborales en España. Fuentes documentadas:
 *  · BDNS · Base de Datos Nacional de Subvenciones (datos públicos)
 *  · Plataforma del Tercer Sector (asociaciones cumbre)
 *  · CEPES · Confederación Empresarial Española de la Economía Social
 *  · Coordinadora ONGD España
 *  · IRPF · convenio 0,7% con Hacienda
 *  · EU Funding · calls Horizon Europe + RRF social
 *  · EIB · proyectos banca desarrollo
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
// Sprint Cuaderno N2-wire · notas que mencionan "Tercer sector"
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { SectorMapPreview } from '@/components/SectorMapPreview'

const ACCENT = '#16a34a' // verde tercer sector
const ACCENT_DARK = '#15803d'

interface SocialOrg {
  slug: string
  nif: string
  legal_name: string
  short_name: string
  type: string // 'fundacion' | 'asociacion_dup' | 'cooperativa' | 'ong'
  sector: string
  founded_year: number
  hq_ccaa: string
  irpf_07: boolean
  ingresos_anuales_eur?: number | null
  empleados?: number | null
  url: string
}

// Seed embebido · 30 ONGs y entidades cumbre representativas
const ORGS: SocialOrg[] = [
  { slug: 'caritas', nif: 'R2800032B', legal_name: 'Cáritas Española', short_name: 'Cáritas', type: 'asociacion_dup', sector: 'asistencia_social', founded_year: 1947, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 386_000_000, empleados: 5800, url: 'https://www.caritas.es' },
  { slug: 'cruz-roja', nif: 'Q2866001G', legal_name: 'Cruz Roja Española', short_name: 'Cruz Roja', type: 'asociacion_dup', sector: 'humanitario', founded_year: 1864, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 942_000_000, empleados: 12500, url: 'https://www.cruzroja.es' },
  { slug: 'oxfam-intermon', nif: 'G58236803', legal_name: 'Intermón Oxfam', short_name: 'Oxfam Intermón', type: 'ong', sector: 'cooperacion_internacional', founded_year: 1956, hq_ccaa: 'Cataluña', irpf_07: true, ingresos_anuales_eur: 78_000_000, empleados: 700, url: 'https://www.oxfamintermon.org' },
  { slug: 'msf-es', nif: 'G79205337', legal_name: 'Médicos Sin Fronteras España', short_name: 'MSF España', type: 'ong', sector: 'sanitario_humanitario', founded_year: 1986, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 138_000_000, empleados: 320, url: 'https://www.msf.es' },
  { slug: 'unicef-es', nif: 'G84451087', legal_name: 'UNICEF Comité Español', short_name: 'UNICEF España', type: 'ong', sector: 'infancia', founded_year: 1961, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 71_000_000, empleados: 250, url: 'https://www.unicef.es' },
  { slug: 'manos-unidas', nif: 'G28567790', legal_name: 'Manos Unidas', short_name: 'Manos Unidas', type: 'ong', sector: 'cooperacion_internacional', founded_year: 1959, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 51_000_000, empleados: 170, url: 'https://www.manosunidas.org' },
  { slug: 'acnur', nif: 'G81846825', legal_name: 'España con ACNUR', short_name: 'ACNUR España', type: 'ong', sector: 'refugiados', founded_year: 1993, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 36_000_000, empleados: 95, url: 'https://eacnur.org' },
  { slug: 'aldeas-infantiles', nif: 'G28821254', legal_name: 'Aldeas Infantiles SOS de España', short_name: 'Aldeas Infantiles', type: 'asociacion_dup', sector: 'infancia', founded_year: 1967, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 45_000_000, empleados: 600, url: 'https://www.aldeasinfantiles.es' },
  { slug: 'save-the-children', nif: 'G79362497', legal_name: 'Save the Children España', short_name: 'Save the Children', type: 'ong', sector: 'infancia', founded_year: 1997, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 28_000_000, empleados: 200, url: 'https://www.savethechildren.es' },
  { slug: 'amnistia-internacional', nif: 'G28851179', legal_name: 'Amnistía Internacional España', short_name: 'Amnistía Internacional', type: 'asociacion_dup', sector: 'derechos_humanos', founded_year: 1978, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 11_000_000, empleados: 75, url: 'https://www.es.amnesty.org' },
  { slug: 'greenpeace-es', nif: 'G28947653', legal_name: 'Greenpeace España', short_name: 'Greenpeace', type: 'asociacion_dup', sector: 'medio_ambiente', founded_year: 1984, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 10_500_000, empleados: 60, url: 'https://es.greenpeace.org' },
  { slug: 'wwf-es', nif: 'G28741470', legal_name: 'WWF España', short_name: 'WWF', type: 'asociacion_dup', sector: 'medio_ambiente', founded_year: 1968, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 8_500_000, empleados: 55, url: 'https://www.wwf.es' },
  { slug: 'seo-birdlife', nif: 'G28510539', legal_name: 'Sociedad Española de Ornitología', short_name: 'SEO/BirdLife', type: 'asociacion_dup', sector: 'medio_ambiente', founded_year: 1954, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 9_700_000, empleados: 95, url: 'https://www.seo.org' },
  { slug: 'ecologistas-accion', nif: 'G83387082', legal_name: 'Ecologistas en Acción', short_name: 'Ecologistas en Acción', type: 'asociacion_dup', sector: 'medio_ambiente', founded_year: 1998, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 3_500_000, empleados: 35, url: 'https://www.ecologistasenaccion.org' },
  { slug: 'mainel', nif: 'G46479300', legal_name: 'Fundación Mainel', short_name: 'Mainel', type: 'fundacion', sector: 'educacion_cooperacion', founded_year: 1992, hq_ccaa: 'Comunidad Valenciana', irpf_07: true, ingresos_anuales_eur: 2_800_000, empleados: 32, url: 'https://mainel.org' },
  { slug: 'banco-alimentos', nif: 'G80042747', legal_name: 'Federación Española de Bancos de Alimentos', short_name: 'FESBAL', type: 'asociacion_dup', sector: 'asistencia_social', founded_year: 1996, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 18_000_000, empleados: 110, url: 'https://www.bancodealimentos.es' },
  { slug: 'aldea-global', nif: 'G84068253', legal_name: 'Fundación Aldea Global', short_name: 'Aldea Global', type: 'fundacion', sector: 'cooperacion_internacional', founded_year: 2005, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 1_200_000, empleados: 12, url: 'https://www.aldeaglobal.org' },
  { slug: 'plan-internacional', nif: 'G85044048', legal_name: 'Plan International España', short_name: 'Plan International', type: 'ong', sector: 'infancia', founded_year: 2001, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 32_000_000, empleados: 140, url: 'https://plan-international.es' },
  { slug: 'fundacion-once', nif: 'G78661923', legal_name: 'Fundación ONCE', short_name: 'Fundación ONCE', type: 'fundacion', sector: 'discapacidad', founded_year: 1988, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 87_000_000, empleados: 1500, url: 'https://www.fundaciononce.es' },
  { slug: 'cermi', nif: 'G81628686', legal_name: 'Comité Español de Representantes de Personas con Discapacidad', short_name: 'CERMI', type: 'asociacion_dup', sector: 'discapacidad', founded_year: 1997, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 4_200_000, empleados: 35, url: 'https://www.cermi.es' },
  { slug: 'plena-inclusion', nif: 'G28695365', legal_name: 'Plena Inclusión España', short_name: 'Plena Inclusión', type: 'asociacion_dup', sector: 'discapacidad', founded_year: 1964, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 9_500_000, empleados: 75, url: 'https://www.plenainclusion.org' },
  { slug: 'cnse', nif: 'G28738752', legal_name: 'Confederación Estatal de Personas Sordas', short_name: 'CNSE', type: 'asociacion_dup', sector: 'discapacidad', founded_year: 1936, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 7_300_000, empleados: 60, url: 'https://www.cnse.es' },
  { slug: 'fad-juventud', nif: 'G79121081', legal_name: 'Fundación FAD Juventud', short_name: 'FAD Juventud', type: 'fundacion', sector: 'juventud_adicciones', founded_year: 1986, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 12_500_000, empleados: 95, url: 'https://www.fad.es' },
  { slug: 'fundacion-secretariado-gitano', nif: 'G83117374', legal_name: 'Fundación Secretariado Gitano', short_name: 'FSG', type: 'fundacion', sector: 'inclusion_social', founded_year: 1982, hq_ccaa: 'Madrid', irpf_07: true, ingresos_anuales_eur: 41_000_000, empleados: 850, url: 'https://www.gitanos.org' },
  { slug: 'caja-ingenieros-fundacion', nif: 'G64852989', legal_name: 'Fundación Caja Ingenieros', short_name: 'Fund. Caja Ingenieros', type: 'fundacion', sector: 'educacion_cultura', founded_year: 1996, hq_ccaa: 'Cataluña', irpf_07: false, ingresos_anuales_eur: 1_800_000, empleados: 12, url: 'https://www.fundaciocajaingenieros.com' },
  { slug: 'la-caixa-fundacion', nif: 'G58899998', legal_name: 'Fundación Bancaria La Caixa', short_name: '"la Caixa"', type: 'fundacion', sector: 'obra_social_bancaria', founded_year: 2014, hq_ccaa: 'Cataluña', irpf_07: false, ingresos_anuales_eur: 504_000_000, empleados: 800, url: 'https://fundacionlacaixa.org' },
  { slug: 'bbva-fundacion', nif: 'G48140119', legal_name: 'Fundación BBVA', short_name: 'Fund. BBVA', type: 'fundacion', sector: 'obra_social_bancaria', founded_year: 1988, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 40_000_000, empleados: 60, url: 'https://www.fbbva.es' },
  { slug: 'cepes', nif: 'G81882018', legal_name: 'Confederación Empresarial Española de la Economía Social', short_name: 'CEPES', type: 'asociacion_dup', sector: 'economia_social', founded_year: 1992, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 2_400_000, empleados: 20, url: 'https://www.cepes.es' },
  { slug: 'plataforma-tercer-sector', nif: 'G86345386', legal_name: 'Plataforma del Tercer Sector', short_name: 'PTS', type: 'asociacion_dup', sector: 'representacion_cumbre', founded_year: 2012, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 1_500_000, empleados: 12, url: 'https://www.plataformatercersector.es' },
  { slug: 'coordinadora-ongd', nif: 'G79041791', legal_name: 'Coordinadora de ONG para el Desarrollo España', short_name: 'CONGDE', type: 'asociacion_dup', sector: 'cooperacion_internacional', founded_year: 1986, hq_ccaa: 'Madrid', irpf_07: false, ingresos_anuales_eur: 2_100_000, empleados: 25, url: 'https://coordinadoraongd.org' },
]

const SECTOR_COLORS: Record<string, string> = {
  asistencia_social: '#dc2626',
  humanitario: '#ea580c',
  cooperacion_internacional: '#0891b2',
  sanitario_humanitario: '#be185d',
  infancia: '#9333ea',
  refugiados: '#7c3aed',
  derechos_humanos: '#b45309',
  medio_ambiente: '#16a34a',
  educacion_cooperacion: '#0284c7',
  discapacidad: '#0e7490',
  juventud_adicciones: '#c026d3',
  inclusion_social: '#a16207',
  obra_social_bancaria: '#475569',
  economia_social: '#1d4ed8',
  representacion_cumbre: '#0f172a',
  educacion_cultura: '#4338ca',
}

const TYPE_LABEL: Record<string, string> = {
  fundacion: 'Fundación',
  asociacion_dup: 'Asoc. utilidad pública',
  cooperativa: 'Cooperativa',
  ong: 'ONG',
}

export default function SectorTercerSectorPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [filterSector, setFilterSector] = useState<string>('')
  const [filterIrpf, setFilterIrpf] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')

  const sectors = Array.from(new Set(ORGS.map((o) => o.sector))).sort()
  const filtered = ORGS.filter((o) => {
    if (filterSector && o.sector !== filterSector) return false
    if (filterIrpf && !o.irpf_07) return false
    if (query) {
      const q = query.toLowerCase()
      if (!o.legal_name.toLowerCase().includes(q) && !o.short_name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalIngresos = filtered.reduce((s, o) => s + (o.ingresos_anuales_eur ?? 0), 0)
  const totalEmpleados = filtered.reduce((s, o) => s + (o.empleados ?? 0), 0)
  const orgsIrpf = filtered.filter((o) => o.irpf_07).length

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 20px' }}>
        <header style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            SECTORIAL · TERCER SECTOR · ECONOMÍA SOCIAL · ONGs
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
            Tercer Sector & ONGs · España
          </h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
            Ecosistema de {ORGS.length} fundaciones, asociaciones declaradas de utilidad pública, cooperativas y ONGs cumbre.
            Fuentes: BDNS · IRPF 0,7% · CEPES · Plataforma del Tercer Sector · Coordinadora ONGD.
          </p>
        </header>

        {/* Vista inicial del mapa OSINT con las capas del sector + ampliar */}
        <SectorMapPreview sector="tercer-sector" accent={ACCENT} height={320} />

        {/* KPIs hero */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <KPI label="Entidades" value={filtered.length.toString()} accent={ACCENT} />
          <KPI
            label="Ingresos agregados"
            value={`${(totalIngresos / 1_000_000).toFixed(0)}M €`}
            accent={ACCENT}
          />
          <KPI label="Empleados directos" value={totalEmpleados.toLocaleString('es-ES')} accent={ACCENT} />
          <KPI label="Adheridas IRPF 0,7%" value={`${orgsIrpf} / ${filtered.length}`} accent={ACCENT} />
        </section>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (Cáritas, Cruz Roja, MSF…)"
            style={{ flex: 1, minWidth: 200, padding: '7px 11px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
          />
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            style={{ padding: '7px 11px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
          >
            <option value="">Todos los sectores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
            <input type="checkbox" checked={filterIrpf} onChange={(e) => setFilterIrpf(e.target.checked)} />
            Solo IRPF 0,7%
          </label>
        </div>

        {/* IATI · Cooperación internacional declarada */}
        <IatiCooperationPanel />

        {/* Programas y políticas */}
        <Panel title="Programas y políticas activas" subtitle="Marco regulatorio + ayudas estatales 2025-2026">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
            {PROGRAMAS.map((p) => (
              <div key={p.titulo} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 10, letterSpacing: 0.6, color: ACCENT, fontWeight: 700, margin: 0 }}>{p.fuente.toUpperCase()}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>{p.titulo}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{p.descripcion}</p>
                <p style={{ fontSize: 11, color: ACCENT_DARK, fontWeight: 600, marginTop: 6 }}>
                  Dotación · {p.dotacion}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        {/* Grid entidades */}
        <Panel title="Entidades del Tercer Sector" subtitle={`${filtered.length} organizaciones · agrupadas por relevancia`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map((o) => (
              <OrgCard key={o.slug} org={o} />
            ))}
            {filtered.length === 0 && (
              <p style={{ fontSize: 13, color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center' }}>
                Sin entidades para los filtros actuales.
              </p>
            )}
          </div>
        </Panel>

        {/* Reguladores y fuentes */}
        <Panel title="Marco institucional y fuentes" subtitle="Reguladores · plataformas · datos públicos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#64748b', fontWeight: 700, margin: 0 }}>REGULADORES</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#1e293b' }}>
                <li>Ministerio de Derechos Sociales · IRPF 0,7%</li>
                <li>Subdirección General del Tercer Sector</li>
                <li>AECID · Cooperación Internacional</li>
                <li>Fundación ONCE · Plan Operativo Discapacidad</li>
                <li>Protectorado de Fundaciones (Ministerio Cultura)</li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#64748b', fontWeight: 700, margin: 0 }}>FUENTES DE DATOS</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#1e293b' }}>
                <li>
                  <a href="https://www.infosubvenciones.es" target="_blank" rel="noopener" style={{ color: ACCENT }}>BDNS</a> · Base Nacional Subvenciones
                </li>
                <li>EU Funding · calls Horizon + RRF social</li>
                <li>EIB · proyectos de banca de desarrollo</li>
                <li>Plataforma del Tercer Sector · informes anuales</li>
                <li>CEPES · economía social estadísticas</li>
              </ul>
            </div>
          </div>
        </Panel>

        {/* Atajos */}
        <Panel title="Atajos relacionados" subtitle="Investigación cruzada">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ShortcutLink href="/licitaciones?categoria=servicios_sociales" label="→ Licitaciones servicios sociales" />
            <ShortcutLink href="/fondos-europeos" label="→ Fondos europeos disponibles" />
            <ShortcutLink href="/macro" label="→ Macro · gasto social ES" />
            <ShortcutLink href="/instituciones" label="→ Ministerio Derechos Sociales" />
          </div>
        </Panel>

        {/* Sprint Cuaderno N2-wire · notas del Cuaderno sobre Tercer Sector */}
        <div style={{ marginTop: 18 }}>
          <CuadernoEntityWidget slug="tercer-sector" name="Tercer Sector" accentColor="#16A34A" />
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers visuales
// ─────────────────────────────────────────────────────────────────

const PROGRAMAS = [
  {
    fuente: 'IRPF 0,7%',
    titulo: 'Convocatoria IRPF Fines Sociales 2025',
    descripcion: 'Asignación de la casilla 0,7% del IRPF a entidades del tercer sector con utilidad pública.',
    dotacion: '~ 470 M €',
  },
  {
    fuente: 'Plan Estatal',
    titulo: 'Plan Estatal de Voluntariado 2025-2029',
    descripcion: 'Marco estratégico para fomentar el voluntariado y la participación ciudadana en entidades sociales.',
    dotacion: '~ 28 M €',
  },
  {
    fuente: 'RRF',
    titulo: 'PERTE Economía Social y Cuidados',
    descripcion: 'Componente del Plan de Recuperación con fondos NextGen orientado a innovación social y cuidados.',
    dotacion: '~ 808 M €',
  },
  {
    fuente: 'AECID',
    titulo: 'Convenios ONGD 2024-2028',
    descripcion: 'Financiación plurianual a ONGD para proyectos de cooperación internacional al desarrollo.',
    dotacion: '~ 350 M € / 4 años',
  },
  {
    fuente: 'EU Funding',
    titulo: 'Programa Ciudadanos, Igualdad, Derechos y Valores (CERV)',
    descripcion: 'Convocatoria UE para entidades de derechos fundamentales y participación democrática.',
    dotacion: '~ 1.550 M € / 7 años',
  },
  {
    fuente: 'Fundación ONCE',
    titulo: 'POISES · Programa Operativo Inclusión Social',
    descripcion: 'Operativo FSE+ gestionado por Fundación ONCE para empleo de personas con discapacidad.',
    dotacion: '~ 690 M €',
  },
]

// ─────────────────────────────────────────────────────────────────
// Panel IATI · Cooperación internacional declarada
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
    return () => { alive = false }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const subtitle = isLive
    ? `Datos en vivo · ${data?.total_activities.toLocaleString('es-ES')} actividades reportadas por orgs españolas a IATI · cache 1h`
    : 'IATI · International Aid Transparency Initiative'

  return (
    <Panel title="Cooperación internacional · IATI" subtitle={subtitle}>
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

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 10, letterSpacing: 0.6, color: '#64748b', margin: 0, fontWeight: 700 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: accent, margin: '6px 0 0' }}>{value}</p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>{title.toUpperCase()}</p>
        {subtitle ? <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}

function OrgCard({ org }: { org: SocialOrg }) {
  const color = SECTOR_COLORS[org.sector] || '#475569'
  return (
    <a
      href={org.url}
      target="_blank"
      rel="noopener"
      style={{
        display: 'block',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: 12,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{org.short_name}</p>
        {org.irpf_07 ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            IRPF 0,7%
          </span>
        ) : null}
      </div>
      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0' }}>{org.legal_name}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        <Pill text={TYPE_LABEL[org.type] || org.type} />
        <Pill text={org.sector.replace(/_/g, ' ')} bg={color} fg="#fff" />
        <Pill text={`${org.hq_ccaa}`} />
        <Pill text={`${org.founded_year}`} />
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <strong>{org.ingresos_anuales_eur ? `${(org.ingresos_anuales_eur / 1_000_000).toFixed(1)}M €` : '—'}</strong>
          <span style={{ color: '#94a3b8' }}> ingresos</span>
        </span>
        <span>
          <strong>{org.empleados ? org.empleados.toLocaleString('es-ES') : '—'}</strong>
          <span style={{ color: '#94a3b8' }}> empleados</span>
        </span>
      </div>
    </a>
  )
}

function Pill({ text, bg = '#f1f5f9', fg = '#475569' }: { text: string; bg?: string; fg?: string }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 6px', background: bg, color: fg, borderRadius: 4, fontWeight: 600 }}>
      {text}
    </span>
  )
}

function ShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 600,
        color: ACCENT_DARK,
        background: '#f0fdf4',
        border: `1px solid ${ACCENT}`,
        borderRadius: 6,
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  )
}
