'use client'
/**
 * BuscadorBarrios · busca barrios por nombre/ciudad/distrito y muestra
 * el precio €/m² (compra + alquiler) con variación anual.
 *
 * Filtros:
 *   - texto libre (debounced 200ms)
 *   - ciudad (dropdown con todas las ciudades disponibles)
 *   - sort (precio_desc | precio_asc | var_desc)
 *
 * Renderiza una tabla compacta · click en un barrio para fijarlo y
 * ver detalle ampliado (compra, alquiler, var, etiquetas).
 */
import { useEffect, useMemo, useState } from 'react'

interface Barrio {
  id: string
  barrio: string
  ciudad: string
  distrito?: string
  precio_m2_compra: number
  precio_m2_alquiler: number
  var_anual_compra: number
  tags: string[]
}
interface BarriosResp {
  items: Barrio[]
  total: number
  page: number
  page_size: number
  n_pages: number
  n_total_catalogo: number
  ciudades: string[]
}

type Sort = 'precio_desc' | 'precio_asc' | 'var_desc' | 'alfabetico'

export default function BuscadorBarrios() {
  const [q, setQ] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [sort, setSort] = useState<Sort>('precio_desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BarriosResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const PAGE_SIZE = 30

  const fetchData = async (qVal: string, ciudadVal: string, sortVal: Sort, pageVal: number) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (qVal) sp.set('q', qVal)
      if (ciudadVal) sp.set('ciudad', ciudadVal)
      sp.set('sort', sortVal)
      sp.set('page', String(pageVal))
      sp.set('page_size', String(PAGE_SIZE))
      const res = await fetch(`/api/sectores/vivienda/barrios?${sp.toString()}`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }

  // Reset de página al cambiar filtros (q/ciudad/sort)
  useEffect(() => { setPage(1) }, [q, ciudad, sort])

  // Carga inicial
  useEffect(() => { void fetchData('', '', 'precio_desc', 1) }, [])

  // Debounce búsqueda · 200ms · refetch cuando cambia q/ciudad/sort/page
  useEffect(() => {
    const t = setTimeout(() => fetchData(q, ciudad, sort, page), 200)
    return () => clearTimeout(t)
  }, [q, ciudad, sort, page])

  const selectedBarrio = useMemo(
    () => data?.items.find(b => b.id === selected) || null,
    [data, selected],
  )

  return (
    <div>
      {/* Controles · search + ciudad + sort */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar barrio… ej. salamanca, gracia, russafa, triana…"
          style={{
            padding: '9px 14px', borderRadius: 999, border: '1px solid #ECECEF',
            fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
            background: '#FAFAFA', outline: 'none',
          }}
        />
        <select value={ciudad} onChange={e => setCiudad(e.target.value)} style={{
          padding: '9px 28px 9px 14px', borderRadius: 999, border: '1px solid #ECECEF',
          fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
          background: '#FAFAFA', outline: 'none', appearance: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        }}>
          <option value="">Todas las ciudades</option>
          {data?.ciudades.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={{
          padding: '9px 28px 9px 14px', borderRadius: 999, border: '1px solid #ECECEF',
          fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
          background: '#FAFAFA', outline: 'none', appearance: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        }}>
          <option value="precio_desc">Precio · más caro</option>
          <option value="precio_asc">Precio · más barato</option>
          <option value="var_desc">Mayor subida anual</option>
          <option value="alfabetico">Alfabético A-Z</option>
        </select>
      </div>

      {/* Detalle del barrio seleccionado */}
      {selectedBarrio && (
        <div style={{
          background: 'linear-gradient(135deg, #FCE7F3 0%, #FDF2F8 100%)',
          border: '1px solid #FBCFE8', borderRadius: 12, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.015em' }}>
                {selectedBarrio.barrio}
              </div>
              <div style={{ fontSize: 11, color: '#6e6e73' }}>
                {selectedBarrio.distrito ? `${selectedBarrio.distrito} · ` : ''}{selectedBarrio.ciudad}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#6e6e73', fontFamily: 'inherit',
            }}>cerrar ✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            <KpiBig label="Compra" value={`${selectedBarrio.precio_m2_compra.toLocaleString('es-ES')}`} unit="€/m²" color="#DB2777"/>
            <KpiBig label="Alquiler" value={`${selectedBarrio.precio_m2_alquiler.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`} unit="€/m²/mes" color="#1F4E8C"/>
            <KpiBig
              label="Variación anual"
              value={`${selectedBarrio.var_anual_compra >= 0 ? '+' : ''}${selectedBarrio.var_anual_compra.toFixed(1)}`} unit="%"
              color={selectedBarrio.var_anual_compra >= 7 ? '#DC2626' : selectedBarrio.var_anual_compra >= 4 ? '#D97706' : '#16A34A'}
            />
          </div>
          {selectedBarrio.tags.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {selectedBarrio.tags.map(t => (
                <span key={t} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: '#fff', border: '1px solid #FBCFE8', color: '#9D174D', fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats strip + paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>
          {loading ? 'Buscando…' : data ? (
            <>
              <strong style={{ color: '#1d1d1f' }}>{data.total.toLocaleString('es-ES')}</strong> barrios encontrados
              {data.n_pages > 1 && ` · página ${data.page} de ${data.n_pages}`}
              {' · '}
              <span style={{ color: '#86868b' }}>catálogo {data.n_total_catalogo.toLocaleString('es-ES')} barrios · {data.ciudades.length} ciudades</span>
            </>
          ) : 'Cargando…'}
        </span>
        {data && data.n_pages > 1 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <PageBtn disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Anterior</PageBtn>
            <span style={{ fontSize: 11, padding: '0 8px', color: '#1d1d1f', fontWeight: 600 }}>
              {data.page} / {data.n_pages}
            </span>
            <PageBtn disabled={page >= data.n_pages} onClick={() => setPage(p => Math.min(data.n_pages, p + 1))}>Siguiente →</PageBtn>
          </div>
        )}
      </div>

      {/* Tabla compacta de resultados */}
      <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #ECECEF', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#FAFAFA', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #ECECEF' }}>
              <Th>Barrio</Th>
              <Th>Ciudad</Th>
              <Th align="right">Compra €/m²</Th>
              <Th align="right">Alquiler</Th>
              <Th align="right">Var anual</Th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(b => {
              const varColor = b.var_anual_compra >= 7 ? '#DC2626' : b.var_anual_compra >= 4 ? '#D97706' : '#16A34A'
              const isSel = selected === b.id
              return (
                <tr key={b.id}
                  onClick={() => setSelected(isSel ? null : b.id)}
                  style={{
                    borderBottom: '1px solid #F5F5F7', cursor: 'pointer',
                    background: isSel ? '#FCE7F3' : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <Td>
                    <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{b.barrio}</div>
                    {b.distrito && <div style={{ fontSize: 9.5, color: '#86868b' }}>{b.distrito}</div>}
                  </Td>
                  <Td>
                    <span style={{ color: '#3a3a3d' }}>{b.ciudad}</span>
                  </Td>
                  <Td align="right">
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f' }}>
                      {b.precio_m2_compra.toLocaleString('es-ES')}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{ color: '#3a3a3d' }}>
                      {b.precio_m2_alquiler.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span style={{ fontSize: 9, color: '#86868b' }}> €/m²/m</span>
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                      background: `${varColor}14`, color: varColor, border: `1px solid ${varColor}33`,
                    }}>
                      {b.var_anual_compra >= 0 ? '+' : ''}{b.var_anual_compra.toFixed(1)}%
                    </span>
                  </Td>
                </tr>
              )
            })}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#86868b', fontSize: 12 }}>
                  Sin resultados para tu búsqueda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      padding: '9px 12px', textAlign: align,
      fontSize: 9.5, fontWeight: 700, color: '#6e6e73',
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{children}</th>
  )
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '8px 12px', textAlign: align, verticalAlign: 'middle' }}>{children}</td>
}
function PageBtn({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '4px 10px', borderRadius: 999,
      border: '1px solid #ECECEF', background: disabled ? '#F5F5F7' : '#fff',
      fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#C7C7CC' : '#1d1d1f', fontFamily: 'inherit',
      transition: 'background 120ms, border-color 120ms',
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#D6D6DA' } }}
    onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECECEF' } }}>
      {children}
    </button>
  )
}
function KpiBig({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  )
}
