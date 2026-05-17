'use client'
/**
 * Buscador principal de licitaciones — sidebar con filtros completos,
 * resultados con todas las columnas, ordenación, paginación.
 *
 * Backend: Catalunya Socrata + Valencia CKAN + TED + PLACSP atom.
 * Selectores con visual del hemiciclo (PillSelect/PillInput).
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CPV_DIVISIONS, TIPOS_CONTRATO, PROCEDIMIENTOS, CCAA_CODES, SOURCES, cpvDivLabel,
} from '@/lib/socrata-catalunya'
import PillSelect, { PillInput } from '@/components/PillSelect'

interface NormalizedContrato {
  id: string
  fuente: 'CATALUNYA_SOCRATA' | 'PLACSP' | 'VALENCIA_CKAN' | 'TED' | 'ANDALUCIA'
  fuente_label: string
  expediente: string
  organo: string
  organo_dir3?: string
  ambito?: string
  objeto: string
  tipo_contrato?: string
  procedimiento?: string
  cpv?: string
  cpv_div?: string
  cpv_descripcion?: string
  lugar_ejecucion?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  importe_adjudicacion_iva?: number
  adjudicatario?: string
  adjudicatario_nif?: string
  ofertas_recibidas?: number
  estado?: string
  fecha_publicacion?: string
  fecha_adjudicacion?: string
  anio?: number
  es_pyme?: boolean
  url?: string
  // Enriquecimientos (pipeline calidad BquantFinance)
  quality_score?: number
  quality_level?: 'A' | 'B' | 'C'
  flags?: string[]
  is_outlier?: boolean
  nif_valido?: boolean
  cpv_valido?: boolean
}

interface SearchResponse {
  items: NormalizedContrato[]
  stats: {
    total: number
    importe_total_M: number
    por_fuente: Record<string, number>
    por_tipo: Record<string, number>
    calidad?: {
      avg_score: number
      nivel_a: number; nivel_b: number; nivel_c: number
      outliers: number
    }
    fetch_ms: number
    sources: Array<{ fuente: string; ok: boolean; items: number; ms: number; error?: string }>
  }
  pagination: { page: number; page_size: number; offset: number; total_estimado: number | null }
  filters: Record<string, unknown>
}

const FUENTE_COLOR: Record<string, string> = {
  CATALUNYA_SOCRATA: '#F97316',
  PLACSP: '#1F4E8C',
  VALENCIA_CKAN: '#DC2626',
  TED: '#0EA5E9',
  ANDALUCIA: '#16A34A',
}

const TYPE_OPTIONS = [
  { value: 'texto',         label: 'Texto del contrato' },
  { value: 'adjudicatario', label: 'Empresa adjudicataria' },
  { value: 'organo',        label: 'Órgano contratante' },
  { value: 'cpv',           label: 'Sector (CPV)' },
]

const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Fecha (más reciente)' },
  { value: 'date_asc',   label: 'Fecha (más antigua)' },
  { value: 'imp_desc',   label: 'Importe (mayor)' },
  { value: 'imp_asc',    label: 'Importe (menor)' },
  { value: 'relevance',  label: 'Relevancia' },
]

const ANIO_OPTIONS = Array.from({ length: 25 }, (_, i) => 2026 - i).map(y => ({ value: String(y), label: String(y) }))

export default function LicitacionesBuscador() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<string>('texto')
  const [anio, setAnio] = useState<string>('')
  const [ccaa, setCcaa] = useState<string>('')
  const [cpvDiv, setCpvDiv] = useState<string>('')
  const [tipoContrato, setTipoContrato] = useState<string>('')
  const [procedimiento, setProcedimiento] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [esPyme, setEsPyme] = useState<boolean>(false)
  const [soloMenores, setSoloMenores] = useState<boolean>(false)
  const [soloConImporte, setSoloConImporte] = useState<boolean>(false)
  const [soloAdjudicados, setSoloAdjudicados] = useState<boolean>(false)
  const [excluirOutliers, setExcluirOutliers] = useState<boolean>(false)
  const [minQuality, setMinQuality] = useState<string>('')   // '60' = solo nivel B+
  const [importeMin, setImporteMin] = useState<string>('')
  const [importeMax, setImporteMax] = useState<string>('')
  const [sort, setSort] = useState<string>('date_desc')
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(50)

  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (type !== 'texto') sp.set('type', type)
    if (anio) sp.set('anio', anio)
    if (ccaa) sp.set('ccaa', ccaa)
    if (cpvDiv) sp.set('cpv_div', cpvDiv)
    if (tipoContrato) sp.set('tipo_contrato', tipoContrato)
    if (procedimiento) sp.set('procedimiento', procedimiento)
    if (source) sp.set('source', source)
    if (esPyme) sp.set('es_pyme', '1')
    if (soloMenores) sp.set('procedimiento', 'Contracte menor')
    if (importeMin) sp.set('importe_min', importeMin)
    if (importeMax) sp.set('importe_max', importeMax)
    if (soloConImporte) sp.set('importe_min', importeMin || '0.01')
    if (soloAdjudicados) sp.set('solo_adjudicados', '1')
    if (excluirOutliers) sp.set('excluir_outliers', '1')
    if (minQuality) sp.set('min_quality', minQuality)
    sp.set('sort', sort)
    sp.set('page', String(page))
    sp.set('page_size', String(pageSize))
    return `/api/licitaciones/buscar?${sp.toString()}`
  }, [q, type, anio, ccaa, cpvDiv, tipoContrato, procedimiento, source, esPyme, soloMenores, soloConImporte, soloAdjudicados, excluirOutliers, minQuality, importeMin, importeMax, sort, page, pageSize])

  const runSearch = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(queryUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as SearchResponse
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown'); setData(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { runSearch() /* eslint-disable-next-line */ }, [])
  useEffect(() => { if (data) runSearch() /* eslint-disable-next-line */ }, [page, sort])

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); runSearch() }
  const reset = () => {
    setQ(''); setType('texto'); setAnio(''); setCcaa(''); setCpvDiv(''); setTipoContrato('')
    setProcedimiento(''); setSource(''); setEsPyme(false); setSoloMenores(false); setSoloConImporte(false)
    setSoloAdjudicados(false); setExcluirOutliers(false); setMinQuality('')
    setImporteMin(''); setImporteMax(''); setSort('date_desc'); setPage(1)
    setTimeout(runSearch, 0)
  }

  const totalPages = data?.pagination.total_estimado
    ? Math.min(40, Math.ceil(data.pagination.total_estimado / pageSize))
    : 1

  // Catálogos en formato PillSelectOption[]
  const sourceOptions = SOURCES.map(s => ({
    value: s.code,
    label: s.label + (!s.activa ? ' (próximamente)' : ''),
    disabled: !s.activa,
  }))
  const ccaaOptions = CCAA_CODES.map(c => ({ value: c.code, label: c.label }))
  const cpvOptions = CPV_DIVISIONS.map(c => ({ value: c.code, label: `${c.code} · ${c.label}` }))
  const tipoOptions = TIPOS_CONTRATO.map(t => ({ value: t, label: t }))
  const procOptions = PROCEDIMIENTOS.map(p => ({ value: p, label: p }))

  return (
    <section style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:18 }}>
      {/* ─── Sidebar de filtros ─── */}
      <aside style={{
        background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 16px',
        position:'sticky', top:80, alignSelf:'start', maxHeight:'calc(100vh - 100px)', overflowY:'auto',
      }}>
        <form onSubmit={onSubmit}>
          <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.013em', color:'#1d1d1f' }}>
            Filtros
          </h3>

          <FilterGroup label="Buscar por">
            <PillSelect
              value={type} onChange={setType}
              options={TYPE_OPTIONS}
              ariaLabel="Tipo de búsqueda"
            />
            <div style={{ marginTop:6 }}>
              <PillInput
                value={q} onChange={setQ}
                placeholder="Texto…"
                ariaLabel="Texto de búsqueda"
              />
            </div>
          </FilterGroup>

          <FilterGroup label="Fuente oficial">
            <PillSelect
              value={source} onChange={setSource}
              options={sourceOptions}
              placeholder="— todas —"
              ariaLabel="Fuente oficial"
            />
          </FilterGroup>

          <FilterGroup label="Comunidad autónoma">
            <PillSelect
              value={ccaa} onChange={setCcaa}
              options={ccaaOptions}
              placeholder="— todas —"
              ariaLabel="Comunidad autónoma"
            />
          </FilterGroup>

          <FilterGroup label="Año de adjudicación">
            <PillSelect
              value={anio} onChange={setAnio}
              options={ANIO_OPTIONS}
              placeholder="— todos —"
              ariaLabel="Año"
            />
          </FilterGroup>

          <FilterGroup label="Importe adjudicado (€)">
            <div style={{ display:'flex', gap:6 }}>
              <PillInput
                value={importeMin} onChange={setImporteMin}
                type="number" min={0} placeholder="Min"
                ariaLabel="Importe mínimo"
              />
              <PillInput
                value={importeMax} onChange={setImporteMax}
                type="number" min={0} placeholder="Max"
                ariaLabel="Importe máximo"
              />
            </div>
          </FilterGroup>

          <FilterGroup label="Sector (CPV)">
            <PillSelect
              value={cpvDiv} onChange={setCpvDiv}
              options={cpvOptions}
              placeholder="— todos —"
              ariaLabel="Sector CPV"
            />
          </FilterGroup>

          <FilterGroup label="Tipo de contrato">
            <PillSelect
              value={tipoContrato} onChange={setTipoContrato}
              options={tipoOptions}
              placeholder="— todos —"
              ariaLabel="Tipo de contrato"
            />
          </FilterGroup>

          <FilterGroup label="Procedimiento">
            <PillSelect
              value={procedimiento} onChange={setProcedimiento}
              options={procOptions}
              placeholder="— todos —"
              ariaLabel="Procedimiento"
            />
          </FilterGroup>

          <FilterGroup label="Otros">
            <CheckBox label="Solo PYME adjudicataria" checked={esPyme} onChange={setEsPyme}/>
            <CheckBox label="Solo contratos menores" checked={soloMenores} onChange={setSoloMenores}/>
            <CheckBox label="Solo con importe declarado" checked={soloConImporte} onChange={setSoloConImporte}/>
            <CheckBox label="Solo adjudicados" checked={soloAdjudicados} onChange={setSoloAdjudicados}/>
          </FilterGroup>

          <FilterGroup label="Calidad de datos">
            <PillSelect
              value={minQuality} onChange={setMinQuality}
              options={[
                { value: '85', label: 'Solo nivel A · score ≥ 85' },
                { value: '60', label: 'Nivel A o B · score ≥ 60' },
              ]}
              placeholder="Cualquier calidad"
              ariaLabel="Calidad mínima"
            />
            <div style={{ marginTop:6 }}>
              <CheckBox label="Excluir outliers de importe" checked={excluirOutliers} onChange={setExcluirOutliers}/>
            </div>
          </FilterGroup>

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Buscando…' : 'Aplicar filtros'}
            </button>
            <button type="button" onClick={reset} style={secondaryBtn}>Limpiar</button>
          </div>
        </form>
      </aside>

      {/* ─── Resultados ─── */}
      <div>
        {/* Header con stats */}
        <header style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'14px 18px', marginBottom:12,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap',
        }}>
          <div>
            {data ? (
              <>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.013em', color:'#1d1d1f' }}>
                  {data.pagination.total_estimado != null
                    ? data.pagination.total_estimado.toLocaleString('es-ES')
                    : data.stats.total} contratos encontrados
                </div>
                <div style={{ fontSize:11.5, color:'#6e6e73', marginTop:3 }}>
                  Búsqueda: <strong>“{q || '—'}”</strong> · {data.stats.fetch_ms} ms · {data.stats.sources.filter(s => s.ok).length}/{data.stats.sources.length} fuentes activas
                </div>
              </>
            ) : (
              <div style={{ fontSize:12, color:'#6e6e73' }}>Cargando…</div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#6e6e73' }}>Ordenar:</span>
            <PillSelect
              value={sort} onChange={v => { setSort(v); setPage(1) }}
              options={SORT_OPTIONS}
              size="sm"
              fullWidth={false}
              ariaLabel="Ordenar por"
            />
          </div>
        </header>

        {/* Strip de stats de calidad · score medio + nivel A/B/C + outliers */}
        {data && data.stats.calidad && (
          <div style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
            padding:'10px 14px', marginBottom:12, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap',
          }}>
            <div title="Quality score medio · pipeline INT-VAL/CONS/FIA" style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>Calidad media</span>
              <span style={{
                fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, letterSpacing:'-0.02em',
                color: data.stats.calidad.avg_score >= 85 ? '#16A34A' : data.stats.calidad.avg_score >= 60 ? '#F97316' : '#DC2626',
              }}>{data.stats.calidad.avg_score}<span style={{ fontSize:11, color:'#86868b', marginLeft:3, fontWeight:500 }}>/100</span></span>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span title="Nivel A · score ≥ 85 · alta calidad de datos" style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#16A34A', color:'#fff', letterSpacing:'0.04em', cursor:'help' }}>A · {data.stats.calidad.nivel_a}</span>
              <span title="Nivel B · score 60-84 · calidad media" style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#F97316', color:'#fff', letterSpacing:'0.04em', cursor:'help' }}>B · {data.stats.calidad.nivel_b}</span>
              <span title="Nivel C · score < 60 · calidad baja" style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#DC2626', color:'#fff', letterSpacing:'0.04em', cursor:'help' }}>C · {data.stats.calidad.nivel_c}</span>
              {data.stats.calidad.outliers > 0 && (
                <span title="Importes anómalos detectados (z-score > 3 o > 50M€)" style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#7C3AED', color:'#fff', letterSpacing:'0.04em', cursor:'help' }}>⚠ {data.stats.calidad.outliers} outliers</span>
              )}
            </div>
            <span style={{ marginLeft:'auto', fontSize:10.5, color:'#86868b' }}>
              Pipeline INT-VAL/CONS/FIA · 14 indicadores · validación NIF/CIF/CPV/fechas/coherencia
            </span>
          </div>
        )}

        {error && (
          <div style={{ padding:'30px', background:'#FEE2E2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, fontSize:13, textAlign:'center' }}>
            Error: {error}
          </div>
        )}

        {!error && data && data.items.length === 0 && (
          <div style={{ padding:'40px', background:'#fff', border:'1px solid #ECECEF', borderRadius:14, textAlign:'center', fontSize:13, color:'#6e6e73' }}>
            <strong>Sin resultados.</strong> Prueba con otra palabra o quita algún filtro.
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {data?.items.map(it => <ContratoCard key={it.id} c={it}/>)}
        </div>

        {/* Paginación */}
        {data && data.items.length > 0 && (
          <nav style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            marginTop:14, fontSize:12, color:'#6e6e73',
          }}>
            <span>
              Página {data.pagination.page} · Mostrando {((data.pagination.page - 1) * data.pagination.page_size) + 1}–{((data.pagination.page - 1) * data.pagination.page_size) + data.items.length}
              {data.pagination.total_estimado != null && ` de ${data.pagination.total_estimado.toLocaleString('es-ES')}`}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || loading} style={pagBtn(page === 1)}>‹ Anterior</button>
              <span style={{ padding:'7px 12px', fontSize:12, color:'#3a3a3d' }}>
                {page} / {totalPages}+
              </span>
              <button onClick={() => setPage(page + 1)} disabled={data.items.length < pageSize || loading} style={pagBtn(data.items.length < pageSize)}>Siguiente ›</button>
            </div>
          </nav>
        )}
      </div>
    </section>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────

function ContratoCard({ c }: { c: NormalizedContrato }) {
  const importe = c.importe_adjudicacion ?? c.importe_licitacion
  const qColor = c.quality_level === 'A' ? '#16A34A' : c.quality_level === 'B' ? '#F97316' : '#DC2626'
  // Tooltip con flags · si hay
  const flagsLabel = c.flags && c.flags.length > 0 ? `Issues detectados: ${c.flags.join(', ')}` : 'Sin issues detectados · pasa todos los validadores'
  return (
    <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
      padding:'14px 18px', display:'grid', gridTemplateColumns:'1fr auto', gap:14,
      borderLeft:`3px solid ${FUENTE_COLOR[c.fuente] || '#525258'}`,
    }}>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
          <Badge label={c.fuente_label} color={FUENTE_COLOR[c.fuente]}/>
          {c.tipo_contrato && <Badge label={c.tipo_contrato} color="#525258" outline/>}
          {c.procedimiento && <Badge label={c.procedimiento} color="#7C3AED" outline/>}
          {c.cpv_div && (
            <span title={c.cpv_descripcion || `CPV código ${c.cpv}`} style={{ cursor:'help', display:'inline-block' }}>
              <Badge label={`CPV ${c.cpv_div} · ${cpvDivLabel(c.cpv_div).slice(0, 22)}`} color="#5B21B6" outline/>
            </span>
          )}
          {c.es_pyme && <Badge label="PYME" color="#16A34A"/>}
          {c.quality_level && (
            <span title={`Quality score ${c.quality_score}/100 · Nivel ${c.quality_level} · ${flagsLabel}`} style={{ cursor:'help', display:'inline-block' }}>
              <Badge label={`Q ${c.quality_level} · ${c.quality_score}`} color={qColor}/>
            </span>
          )}
          {c.is_outlier && (
            <span title="Outlier · importe atípico (z-score > 3 o > 50M€)" style={{ cursor:'help', display:'inline-block' }}>
              <Badge label="⚠ outlier" color="#7C3AED"/>
            </span>
          )}
          {c.adjudicatario_nif && c.nif_valido === false && (
            <span title="NIF/CIF con checksum inválido · INT-VAL-12 fallido" style={{ cursor:'help', display:'inline-block' }}>
              <Badge label="NIF inválido" color="#DC2626" outline/>
            </span>
          )}
          {c.fecha_publicacion && (
            <span style={{ fontSize:10, color:'#6e6e73', marginLeft:4 }}>{c.fecha_publicacion}</span>
          )}
        </div>
        <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.01em', color:'#1d1d1f', lineHeight:1.4 }}>
          {c.url ? (
            <a href={c.url} target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'none' }}>
              {c.objeto} <span style={{ fontSize:11, color:'#6e6e73' }}>↗</span>
            </a>
          ) : c.objeto}
        </h3>
        <div style={{ fontSize:11.5, color:'#3a3a3d', display:'flex', gap:6, flexWrap:'wrap' }}>
          {c.organo && (
            <Link href={`/licitaciones/organo/${encodeURIComponent(c.organo_dir3 || c.organo)}`} style={{ color:'#1F4E8C', textDecoration:'none', fontWeight:600 }}>
              {c.organo}
            </Link>
          )}
          {c.adjudicatario && (
            <>
              <span style={{ color:'#86868b' }}>· adj.</span>
              <Link href={`/licitaciones/adjudicatario/${c.adjudicatario_nif}`} style={{ color:'#0F766E', textDecoration:'none', fontWeight:600 }}>
                {c.adjudicatario}
              </Link>
            </>
          )}
          {c.expediente && <span style={{ color:'#86868b' }}>· EXP {c.expediente}</span>}
          {c.lugar_ejecucion && <span style={{ color:'#86868b' }}>· {c.lugar_ejecucion}</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', minWidth:120 }}>
        {importe ? (
          <>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1F4E8C', letterSpacing:'-0.01em' }}>
              {fmtImporte(importe)}
            </div>
            <div style={{ fontSize:9.5, color:'#86868b' }}>
              {c.importe_adjudicacion != null ? 'adjudicado' : 'licitación'}
            </div>
          </>
        ) : (
          <span style={{ fontSize:11, color:'#86868b' }}>sin importe</span>
        )}
        {c.ofertas_recibidas != null && (
          <div style={{ fontSize:10, color:'#6e6e73', marginTop:4 }}>{c.ofertas_recibidas} ofertas</div>
        )}
      </div>
    </article>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{
        display:'block', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
        color:'#6e6e73', textTransform:'uppercase', marginBottom:5,
      }}>{label}</label>
      {children}
    </div>
  )
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display:'flex', gap:6, alignItems:'center', fontSize:12, color:'#3a3a3d', marginBottom:5, cursor:'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
      {label}
    </label>
  )
}

function Badge({ label, color, outline = false }: { label: string; color: string; outline?: boolean }) {
  return (
    <span style={{
      fontSize:9.5, fontWeight:800, letterSpacing:'0.04em',
      padding:'2px 7px', borderRadius:4,
      background: outline ? `${color}10` : color,
      color: outline ? color : '#fff',
      border: `1px solid ${color}${outline ? '40' : '00'}`,
    }}>{label}</span>
  )
}

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    flex:1, padding:'9px 14px', borderRadius:999, border:'none',
    background: loading ? '#9CA3AF' : '#1d1d1f', color:'#fff',
    fontSize:12, fontWeight:600, cursor: loading ? 'wait' : 'pointer',
    fontFamily:'inherit', transition:'all 160ms',
  }
}
const secondaryBtn: React.CSSProperties = {
  padding:'9px 14px', borderRadius:999, border:'1px solid #ECECEF',
  background:'#fff', color:'#6e6e73', fontSize:12, fontWeight:500,
  cursor:'pointer', fontFamily:'inherit', transition:'all 160ms',
}
function pagBtn(disabled: boolean): React.CSSProperties {
  return {
    padding:'7px 14px', borderRadius:999, border:'1px solid '+(disabled ? '#ECECEF' : '#1d1d1f'),
    background: disabled ? '#F5F5F7' : '#fff',
    color: disabled ? '#9CA3AF' : '#1d1d1f',
    fontSize:11.5, fontWeight: disabled ? 500 : 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily:'inherit', transition:'all 160ms',
  }
}
function fmtImporte(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k €`
  return `${v.toFixed(0)} €`
}
