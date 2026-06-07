'use client'
/**
 * <TSLicitacionesView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS7
 *
 * PIEZA CENTRAL del sector. Buscador de licitaciones MULTINIVEL (CCAA → estatal
 * ES → UE → otros países → regional extranjero → organizaciones internacionales)
 * con filtros por nivel, país, CPV/categoría, texto y fechas, MÁS análisis de
 * pliegos por IA (extracción estructurada de requisitos: objeto, presupuesto,
 * plazos, criterios con pesos, solvencia, CPV, lotes, garantías, apto para ONG).
 *
 * Flujo de datos:
 *   1. <LicFiltros> compone los filtros (LicitacionesFiltros). Al cambiar
 *      nivel/CPV (chips) o confirmar texto/país/fechas → refetch.
 *   2. GET /api/tercer-sector/licitaciones?… → LicitacionesResponse (HTTP 200 aun
 *      degradado; el servidor filtra/dedup/pagina y expone facetas + fuentes_error).
 *   3. <LicResumen> pinta por_nivel/por_fuente + fuentes_error (honesto).
 *   4. <LicMapaMundi> (opcional) burbujea las internacionales por país.
 *   5. <LicResultados> lista las tarjetas + paginación; al seleccionar una →
 *      <LicFicha> muestra todos los datos + documentos, y por documento se puede
 *      "Analizar pliego" (POST /analizar → requisitos por IA en <LicAnalisisPliego>).
 *
 * Ángulo: tercer sector + multinivel internacional + análisis de pliegos. Las
 * licitaciones generales españolas viven en /licitaciones (enlazado, no duplicado).
 * Degradación honesta · cero emojis · Unicode geométrico.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { SectorHero } from '@/components/SectorialWidgets'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import type {
  LicitacionNormalizada,
  LicitacionesFiltros,
  LicitacionesResponse,
  FuenteLicitacion,
  NivelLicitacion,
} from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, ACCENT_DARK, formatEur } from './LicShared'
import { LicFiltros } from './LicFiltros'
import { LicResumen } from './LicResumen'
import { LicResultados } from './LicResultados'
import { LicFicha } from './LicFicha'
import { LicMapaMundi } from './LicMapaMundi'

const PAGE_SIZE = 30

interface ViewData {
  licitaciones: LicitacionNormalizada[]
  total: number
  page: number
  page_size: number
  por_nivel: Record<string, number>
  por_fuente: Record<string, number>
  fuentes_ok: FuenteLicitacion[]
  fuentes_error: { fuente: FuenteLicitacion; error: string }[]
  fetched_at: string | null
}

const EMPTY: ViewData = {
  licitaciones: [],
  total: 0,
  page: 1,
  page_size: PAGE_SIZE,
  por_nivel: {},
  por_fuente: {},
  fuentes_ok: [],
  fuentes_error: [],
  fetched_at: null,
}

function buildQuery(f: LicitacionesFiltros): string {
  const sp = new URLSearchParams()
  if (f.nivel) sp.set('nivel', f.nivel)
  if (f.pais) sp.set('pais', f.pais)
  if (f.cpv) sp.set('cpv', f.cpv)
  if (f.q) sp.set('q', f.q)
  if (f.desde) sp.set('desde', f.desde)
  if (f.hasta) sp.set('hasta', f.hasta)
  sp.set('page', String(f.page ?? 1))
  sp.set('pageSize', String(f.pageSize ?? PAGE_SIZE))
  return sp.toString()
}

export function TSLicitacionesView() {
  const [filtros, setFiltros] = useState<LicitacionesFiltros>({ page: 1, pageSize: PAGE_SIZE })
  const [data, setData] = useState<ViewData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Token de petición para descartar respuestas obsoletas (carrera de fetches).
  const reqToken = useRef(0)

  const run = useCallback(async (f: LicitacionesFiltros) => {
    const token = ++reqToken.current
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/tercer-sector/licitaciones?${buildQuery(f)}`)
      const j = (await r.json()) as LicitacionesResponse & { error?: string }
      if (token !== reqToken.current) return // respuesta obsoleta
      if (j.error && (!j.licitaciones || j.licitaciones.length === 0)) {
        setError(j.error)
      }
      setData({
        licitaciones: j.licitaciones ?? [],
        total: j.total ?? 0,
        page: j.page ?? f.page ?? 1,
        page_size: j.page_size ?? PAGE_SIZE,
        por_nivel: j.por_nivel ?? {},
        por_fuente: j.por_fuente ?? {},
        fuentes_ok: j.fuentes_ok ?? [],
        fuentes_error: j.fuentes_error ?? [],
        fetched_at: j.fetched_at ?? null,
      })
    } catch (e: unknown) {
      if (token !== reqToken.current) return
      setError(String((e as Error)?.message ?? e))
      setData(EMPTY)
    } finally {
      if (token === reqToken.current) setLoading(false)
    }
  }, [])

  // Refetch cada vez que cambian los filtros (el padre es la fuente de verdad).
  useEffect(() => {
    run(filtros)
  }, [filtros, run])

  // Cambio de filtro de chips (nivel/CPV) — efecto inmediato.
  const onChange = useCallback((patch: Partial<LicitacionesFiltros>) => {
    setSelectedId(null)
    setFiltros((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))
  }, [])

  // Confirmación de campos de texto (Enter / Buscar / Limpiar).
  const onSubmit = useCallback((patch: Partial<LicitacionesFiltros>) => {
    setSelectedId(null)
    setFiltros((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const onPage = useCallback((page: number) => {
    setSelectedId(null)
    setFiltros((prev) => ({ ...prev, page }))
    // Scroll suave arriba de los resultados al paginar.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const onNivel = useCallback((n: NivelLicitacion | null) => {
    onChange({ nivel: n ?? undefined })
  }, [onChange])

  const onPaisFromMap = useCallback((pais: string) => {
    onSubmit({ pais })
  }, [onSubmit])

  const selected = data.licitaciones.find((l) => l.id === selectedId) ?? null

  // KPIs de cabecera derivados del barrido actual (honestos: del conjunto filtrado).
  const valorTotal = data.licitaciones.reduce((s, l) => s + (l.valor_eur ?? 0), 0)
  const internacionales = data.licitaciones.filter((l) => l.nivel !== 'ccaa' && l.nivel !== 'nacional_es').length
  const conDocs = data.licitaciones.filter((l) => (l.documentos?.length ?? 0) > 0).length
  const nFuentes = data.fuentes_ok.length + data.fuentes_error.length

  const heroItems: HeroKpiItem[] = [
    { label: 'Resultados', value: data.total, decimals: 0, color: '#86EFAC', footer: 'Tras filtros · dedup' },
    { label: 'Valor (página)', value: formatEur(valorTotal), color: '#FCD34D', footer: 'Suma valor estimado visible' },
    { label: 'Internacionales', value: internacionales, decimals: 0, color: '#7DD3FC', footer: 'UE + países + org. int. (página)' },
    {
      label: 'Fuentes activas',
      value: nFuentes > 0 ? `${data.fuentes_ok.length} / ${nFuentes}` : '—',
      color: data.fuentes_error.length > 0 ? '#FDA4AF' : '#C4B5FD',
      footer: data.fuentes_error.length > 0 ? `${data.fuentes_error.length} caída(s)` : 'Cobertura completa',
    },
  ]

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TERCER SECTOR · LICITACIONES · MULTINIVEL"
        title="Licitaciones y convocatorias multinivel"
        sub="Buscador exhaustivo de CCAA a organizaciones internacionales, con análisis de pliegos por IA para evaluar de un vistazo si una ONG puede concurrir. El enfoque es tercer sector y cooperación; las licitaciones generales españolas viven en el módulo /licitaciones."
        updatedAt={data.fetched_at ? new Date(data.fetched_at) : null}
        onRefresh={() => run(filtros)}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={loading && data.total === 0} />
          </div>
        }
      />

      {/* Enlace honesto al módulo general español (no duplicamos contratación ES). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 11.5, color: '#166534' }}>
          ¿Buscas contratación pública española general (sin enfoque social)? El módulo dedicado tiene adjudicaciones, contratos vigentes, competidores y litigios.
        </span>
        <a
          href="/licitaciones"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#fff',
            color: ACCENT_DARK,
            border: `1px solid ${ACCENT}55`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11.5,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Ir a /licitaciones <span aria-hidden="true">→</span>
        </a>
      </div>

      {/* Buscador multinivel */}
      <LicFiltros value={filtros} onChange={onChange} onSubmit={onSubmit} loading={loading} />

      {/* Error global del endpoint (raro: el endpoint degrada a 200) */}
      {error && data.total === 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#991B1B', fontWeight: 600 }}>
            <span aria-hidden="true">▲</span> No se pudo completar la búsqueda: {error}
          </p>
        </div>
      )}

      {/* Resumen de facetas + fuentes caídas (honesto) */}
      {(data.total > 0 || data.fuentes_error.length > 0) && (
        <LicResumen
          total={data.total}
          porNivel={data.por_nivel}
          porFuente={data.por_fuente}
          fuentesOk={data.fuentes_ok}
          fuentesError={data.fuentes_error}
          nivelActivo={filtros.nivel ?? null}
          onNivel={onNivel}
          fetchedAt={data.fetched_at}
        />
      )}

      {/* Mapa mundi de internacionales (solo si hay) */}
      <LicMapaMundi items={data.licitaciones} onPais={onPaisFromMap} />

      {/* Resultados (lista) + Ficha (detalle) */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) minmax(0, 1.1fr)' : '1fr', gap: 14, alignItems: 'start' }}>
        <div>
          <LicResultados
            items={data.licitaciones}
            total={data.total}
            page={data.page}
            pageSize={data.page_size}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPage={onPage}
          />
        </div>
        {selected && (
          <div style={{ position: 'sticky', top: 16 }}>
            <LicFicha lic={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default TSLicitacionesView
