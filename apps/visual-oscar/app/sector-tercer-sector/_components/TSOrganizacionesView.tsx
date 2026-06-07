'use client'
/**
 * <TSOrganizacionesView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS4
 *
 * Directorio DINÁMICO de ONGs, fundaciones y entidades de economía social,
 * servido por `/api/tercer-sector/organizaciones` (catálogo curado+datado +
 * facetas). Tres capas, de panorámica a detalle:
 *
 *   1) Barra de filtros (<OrgFiltros>) alimentada por las `facetas` del endpoint:
 *      tipo · sector · CCAA · ámbito · búsqueda (nombre/sector/NIF) · orden
 *      (ingresos|nombre). Estado deep-linkable en la URL (useUrlState).
 *   2) Distribución (<OrgDistribucion>): mini-gráficos por tipo, sector y CCAA
 *      sobre el conjunto FILTRADO completo (toggle nº entidades / ingresos).
 *   3) Directorio paginado (<OrgDirectorio>): grid de entidades; al seleccionar
 *      abre la ficha (<OrgFicha>) con datos económicos, IRPF, web, fuente+fecha,
 *      actividades IATI (si la entidad reporta) y subvenciones BDNS por NIF.
 *
 * KPIs hero vía la primitiva compartida <HeroKpis> (reusada del sector energía,
 * CLAUDE.md: una sola implementación), calculados sobre el conjunto filtrado.
 *
 * Patrón de fetch (patrón Politeia): envelope `{ ok, data, ... }`, degradación
 * honesta (nunca inventa importes; nulos → «n/d»). Dos peticiones:
 *   - PÁGINA visible (paginada) → directorio.
 *   - CONJUNTO filtrado completo (pageSize alto, cubre el catálogo) → KPIs +
 *     distribución, para que los conteos no dependan de la página.
 * Cero emojis · Unicode geométrico.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUrlState } from '@/lib/useUrlState'
import { SectorHero } from '@/components/SectorialWidgets'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import { OrgFiltros, type OrgFilters, type OrgSort } from './OrgFiltros'
import { OrgDistribucion } from './OrgDistribucion'
import { OrgDirectorio } from './OrgDirectorio'
import { OrgFicha } from './OrgFicha'
import { ACCENT, ACCENT_DARK, type Envelope, type OrgRow, type OrgsData } from './OrgShared'

const PAGE_SIZE = 24
// El catálogo es pequeño (~75 entidades) y el server clampa pageSize a 100; con
// 100 cubrimos el conjunto filtrado completo de una sola petición para los KPIs
// y la distribución (conteos exactos, independientes de la página visible).
const FULL_PAGE_SIZE = 100

/** Construye la query string del endpoint a partir de filtros + paginación. */
function buildQuery(f: OrgFilters, page: number, pageSize: number): string {
  const sp = new URLSearchParams()
  if (f.tipo) sp.set('tipo', f.tipo)
  if (f.sector) sp.set('sector', f.sector)
  if (f.ccaa) sp.set('ccaa', f.ccaa)
  if (f.ambito) sp.set('ambito', f.ambito)
  if (f.q) sp.set('q', f.q)
  if (f.sort) sp.set('sort', f.sort)
  sp.set('page', String(page))
  sp.set('pageSize', String(pageSize))
  return sp.toString()
}

export function TSOrganizacionesView() {
  // ── Estado de filtros deep-linkable (un searchParam por dimensión) ─────────
  const [tipo, setTipo] = useUrlState('o_tipo', '')
  const [sector, setSector] = useUrlState('o_sector', '')
  const [ccaa, setCcaa] = useUrlState('o_ccaa', '')
  const [ambito, setAmbito] = useUrlState('o_ambito', '')
  const [qUrl, setQUrl] = useUrlState('o_q', '')
  const [sortUrl, setSortUrl] = useUrlState('o_sort', 'ingresos')
  const [pageUrl, setPageUrl] = useUrlState('o_page', '1')

  // Búsqueda con input local + debounce → URL (evita refetch por tecla).
  const [qInput, setQInput] = useState(qUrl)
  useEffect(() => setQInput(qUrl), [qUrl])
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== qUrl) {
        setQUrl(qInput)
        setPageUrl('1')
      }
    }, 300)
    return () => clearTimeout(t)
  }, [qInput, qUrl, setQUrl, setPageUrl])

  const filters: OrgFilters = useMemo(
    () => ({
      tipo,
      sector,
      ccaa,
      ambito,
      q: qInput,
      sort: (sortUrl === 'nombre' ? 'nombre' : 'ingresos') as OrgSort,
    }),
    [tipo, sector, ccaa, ambito, qInput, sortUrl],
  )

  const page = Math.max(1, Number(pageUrl) || 1)

  // Patch de filtros: aplica los cambios y resetea la página (salvo la propia q,
  // que el debounce gestiona).
  const onChange = useCallback(
    (patch: Partial<OrgFilters>) => {
      if ('tipo' in patch) setTipo(patch.tipo || '')
      if ('sector' in patch) setSector(patch.sector || '')
      if ('ccaa' in patch) setCcaa(patch.ccaa || '')
      if ('ambito' in patch) setAmbito(patch.ambito || '')
      if ('sort' in patch) setSortUrl(patch.sort || 'ingresos')
      if ('q' in patch) {
        setQInput(patch.q ?? '')
        return // la página la resetea el debounce
      }
      setPageUrl('1')
    },
    [setTipo, setSector, setCcaa, setAmbito, setSortUrl, setPageUrl],
  )

  const onReset = useCallback(() => {
    setTipo('')
    setSector('')
    setCcaa('')
    setAmbito('')
    setQInput('')
    setQUrl('')
    setSortUrl('ingresos')
    setPageUrl('1')
  }, [setTipo, setSector, setCcaa, setAmbito, setQUrl, setSortUrl, setPageUrl])

  // ── Fetch de la PÁGINA visible (directorio) ────────────────────────────────
  const [pageData, setPageData] = useState<OrgsData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  // Filtros server-relevantes (sin la q de input; usamos qUrl ya debounced).
  const serverFilters = useMemo<OrgFilters>(
    () => ({ ...filters, q: qUrl }),
    [filters, qUrl],
  )

  useEffect(() => {
    let alive = true
    setPageLoading(true)
    const qs = buildQuery(serverFilters, page, PAGE_SIZE)
    fetch(`/api/tercer-sector/organizaciones?${qs}`)
      .then((r) => r.json() as Promise<Envelope<OrgsData>>)
      .then((j) => {
        if (!alive) return
        setPageData(j.ok && j.data ? j.data : null)
      })
      .catch(() => alive && setPageData(null))
      .finally(() => alive && setPageLoading(false))
    return () => {
      alive = false
    }
  }, [serverFilters, page])

  // ── Fetch del CONJUNTO filtrado completo (KPIs + distribución) ─────────────
  const [fullRows, setFullRows] = useState<OrgRow[]>([])
  const [fullLoading, setFullLoading] = useState(true)
  const [catalogoTotal, setCatalogoTotal] = useState(0)
  const [facetas, setFacetas] = useState<OrgsData['facetas']>({ tipos: [], sectores: [], ccaa: [] })
  const [filteredTotal, setFilteredTotal] = useState(0)

  useEffect(() => {
    let alive = true
    setFullLoading(true)
    // Sin paginar (pageSize alto) para cubrir todo el conjunto filtrado.
    const qs = buildQuery({ ...serverFilters }, 1, FULL_PAGE_SIZE)
    fetch(`/api/tercer-sector/organizaciones?${qs}`)
      .then((r) => r.json() as Promise<Envelope<OrgsData>>)
      .then((j) => {
        if (!alive) return
        if (j.ok && j.data) {
          setFullRows(j.data.organizaciones)
          setFilteredTotal(j.data.total)
          setCatalogoTotal(j.data.catalogo_total)
          // Las facetas son globales (no dependen del filtro): solo se fijan una
          // vez para no vaciar los selects al filtrar.
          setFacetas((prev) =>
            prev.tipos.length ? prev : j.data!.facetas,
          )
        } else {
          setFullRows([])
          setFilteredTotal(0)
        }
      })
      .catch(() => {
        if (!alive) return
        setFullRows([])
        setFilteredTotal(0)
      })
      .finally(() => alive && setFullLoading(false))
    return () => {
      alive = false
    }
  }, [serverFilters])

  // ── KPIs hero (sobre el conjunto filtrado completo) ────────────────────────
  const heroItems: HeroKpiItem[] = useMemo(() => {
    const n = fullRows.length
    const ingresos = fullRows.reduce((s, o) => s + (o.ingresos_eur ?? 0), 0)
    const empleo = fullRows.reduce((s, o) => s + (o.empleados ?? 0), 0)
    const irpf = fullRows.filter((o) => o.irpf_07).length
    return [
      {
        label: 'Entidades',
        value: n,
        decimals: 0,
        color: '#86EFAC',
        footer: catalogoTotal ? `de ${catalogoTotal} en catálogo` : 'directorio curado',
      },
      {
        label: 'Ingresos agregados',
        value: ingresos ? Math.round(ingresos / 1_000_000) : null,
        unit: 'M€',
        decimals: 0,
        color: '#FCD34D',
        footer: 'memorias · solo con dato',
      },
      {
        label: 'Empleo directo',
        value: empleo || null,
        decimals: 0,
        color: '#7DD3FC',
        footer: 'plantilla declarada',
      },
      {
        label: 'Adheridas IRPF 0,7%',
        value: n ? `${irpf} / ${n}` : '—',
        color: '#C4B5FD',
        footer: 'convenio fines sociales',
      },
    ]
  }, [fullRows, catalogoTotal])

  // ── Selección de ficha ─────────────────────────────────────────────────────
  const [selected, setSelected] = useState<OrgRow | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  const onSelect = useCallback((o: OrgRow) => setSelected(o), [])
  const onCloseFicha = useCallback(() => setSelected(null), [])

  const onPage = useCallback(
    (p: number) => {
      setPageUrl(String(p))
      // Scroll suave al inicio del directorio al cambiar de página.
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [setPageUrl],
  )

  const rows = pageData?.organizaciones ?? []
  // El total para la paginación y el contador sale del conjunto filtrado completo
  // (que coincide con pageData.total cuando el server responde a ambas).
  const total = pageData?.total ?? filteredTotal

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TERCER SECTOR · DIRECTORIO DE ORGANIZACIONES"
        title="Organizaciones del tercer sector"
        sub="Directorio dinámico de ONGs, fundaciones y entidades de economía social. Filtra por tipo, sector, CCAA y ámbito; abre la ficha de cualquier entidad para ver sus datos económicos, IRPF 0,7%, actividades de cooperación (IATI) y financiación pública relacionada. Datos curados y datados por fuente; los importes no publicados se muestran como «n/d», nunca se inventan."
        updatedAt={null}
        onRefresh={() => {}}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={fullLoading && fullRows.length === 0} />
          </div>
        }
      />

      {/* 1 · Filtros (facetas del endpoint) */}
      <OrgFiltros
        filters={filters}
        facetas={facetas}
        total={total}
        catalogoTotal={catalogoTotal}
        loading={fullLoading}
        onChange={onChange}
        onReset={onReset}
      />

      {/* 2 · Distribución (conjunto filtrado completo) */}
      <OrgDistribucion rows={fullRows} loading={fullLoading} />

      {/* 3 · Directorio paginado */}
      <div ref={mainRef}>
        <OrgDirectorio
          rows={rows}
          loading={pageLoading}
          page={page}
          pageSize={pageData?.page_size ?? PAGE_SIZE}
          total={total}
          selectedSlug={selected?.slug ?? null}
          onSelect={onSelect}
          onPage={onPage}
        />
      </div>

      {/* Ficha de la entidad seleccionada (drawer + enriquecimiento vivo) */}
      <OrgFicha org={selected} onClose={onCloseFicha} />
    </div>
  )
}

export default TSOrganizacionesView
