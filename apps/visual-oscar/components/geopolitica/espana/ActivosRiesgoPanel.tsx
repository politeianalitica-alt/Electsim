'use client'
/**
 * <ActivosRiesgoPanel /> · Sprint G20 item 20
 *
 * Panel "Activos españoles en riesgo en el exterior".
 *
 * Consume /api/presencia-espana/activos-riesgo.
 *
 * Muestra:
 *   - KPIs ejecutivos (total activos, valor €M, ciudadanos, países, solapamiento UCDP)
 *   - Filtro por categoría (empresa / contrato / ciudadano / infraestructura / estado)
 *   - Filtro por banda de riesgo (CRITICO/ALTO/MEDIO/BAJO)
 *   - Tabla ordenada por severidad con: país · categoría · descripción · €M · UCDP badge
 */
import { useEffect, useMemo, useState } from 'react'

type RiskBand = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
type Category = 'empresa' | 'contrato' | 'ciudadano' | 'infraestructura' | 'estado'

interface Asset {
  iso3: string
  country_name_es: string
  category: Category
  category_label: string
  description: string
  value_eur_m: number | null
  magnitude: number | null
  magnitude_label?: string
  host_risk_band: RiskBand
  host_irc_score: number | null
  in_ucdp_seed: boolean
  conflict_label?: string
  notes?: string
}

interface Summary {
  total_assets: number
  total_value_eur_m: number
  total_ciudadanos_in_risk: number
  countries_covered: number
  by_band: Record<RiskBand, number>
  by_category: Record<Category, number>
  ucdp_overlap: number
}

interface Response {
  ok: boolean
  assets: Asset[]
  summary: Summary
  _meta?: { sources: string[]; methodology?: string }
}

const BAND_COLORS: Record<RiskBand, { bg: string; fg: string; border: string }> = {
  CRITICO: { bg: '#fef2f2', fg: '#7f1d1d', border: '#dc2626' },
  ALTO: { bg: '#fff7ed', fg: '#9a3412', border: '#ea580c' },
  MEDIO: { bg: '#fefce8', fg: '#854d0e', border: '#ca8a04' },
  BAJO: { bg: '#f0fdf4', fg: '#166534', border: '#16a34a' },
}

const CATEGORY_ICONS: Record<Category, string> = {
  empresa: '◉',
  contrato: '⊞',
  ciudadano: '◐',
  infraestructura: '⊟',
  estado: '◆',
}

const CATEGORY_LABELS: Record<Category, string> = {
  empresa: 'Empresas',
  contrato: 'Contratos',
  ciudadano: 'Ciudadanos',
  infraestructura: 'Infraestructura',
  estado: 'Estado',
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

export function ActivosRiesgoPanel({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [filterBand, setFilterBand] = useState<RiskBand | 'all'>('all')

  useEffect(() => {
    let alive = true
    fetch('/api/presencia-espana/activos-riesgo', { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Response>)
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    if (!data?.assets) return []
    return data.assets.filter((a) =>
      (filterCat === 'all' || a.category === filterCat) &&
      (filterBand === 'all' || a.host_risk_band === filterBand),
    )
  }, [data, filterCat, filterBand])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#0f172a',
        }}>
          Activos españoles en riesgo en el exterior
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6e6e73', lineHeight: 1.5 }}>
          Empresas IBEX + contratos firmados + ciudadanos PERE + embajadas/Cervantes/AECID + FONPRODE/CESCE
          en países con IRC ≥ 35 o conflicto UCDP activo · datos curados cruzados con riesgo en tiempo real.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando inventario activos en riesgo…</p>}

      {!loading && data?.ok && (
        <>
          {/* KPIs */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8, marginBottom: 12,
          }}>
            <Kpi label="Total activos" value={String(data.summary.total_assets)} sub={`${data.summary.countries_covered} países`} color="#0f172a" />
            <Kpi label="Valor económico" value={`€${(data.summary.total_value_eur_m / 1000).toFixed(1)}bn`} sub="suma cuantificable" color="#7c3aed" />
            <Kpi label="Ciudadanos PERE" value={data.summary.total_ciudadanos_in_risk.toLocaleString('es-ES')} sub="en países riesgo" color="#0891b2" />
            <Kpi label="Banda crítica" value={String(data.summary.by_band.CRITICO)} sub="IRC ≥ 75" color="#dc2626" />
            <Kpi label="Conflicto UCDP" value={String(data.summary.ucdp_overlap)} sub="solapamiento" color="#ea580c" />
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Categoría:</span>
            {(['all', 'empresa', 'contrato', 'ciudadano', 'infraestructura', 'estado'] as const).map((c) => (
              <button key={c}
                onClick={() => setFilterCat(c)}
                style={chipStyle(filterCat === c, '#0f172a')}
              >
                {c === 'all' ? 'Todas' : CATEGORY_LABELS[c]}
                {' '}
                <span style={{ opacity: 0.7 }}>
                  ({c === 'all' ? data.summary.total_assets : data.summary.by_category[c]})
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Riesgo país:</span>
            {(['all', 'CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map((b) => {
              const color = b === 'all' ? '#0f172a' : BAND_COLORS[b].border
              return (
                <button key={b}
                  onClick={() => setFilterBand(b)}
                  style={chipStyle(filterBand === b, color)}
                >
                  {b === 'all' ? 'Todas' : b}
                  {' '}
                  <span style={{ opacity: 0.7 }}>
                    ({b === 'all' ? data.summary.total_assets : data.summary.by_band[b]})
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tabla activos */}
          {filtered.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 14 }}>
              No hay activos que coincidan con los filtros actuales.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 540, overflowY: 'auto' }}>
              {filtered.map((a, i) => {
                const sev = BAND_COLORS[a.host_risk_band]
                return (
                  <article
                    key={`${a.iso3}-${a.category}-${i}`}
                    onClick={() => onCountryClick?.(a.iso3)}
                    style={{
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid #f1f5f9',
                      borderLeft: `3px solid ${sev.border}`,
                      borderRadius: 4,
                      cursor: onCountryClick ? 'pointer' : 'default',
                      display: 'grid',
                      gridTemplateColumns: '24px 110px 70px 1fr auto',
                      gap: 8, alignItems: 'center', fontSize: 11,
                    }}>
                    <span style={{ fontSize: 14, color: sev.fg }}>{CATEGORY_ICONS[a.category]}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 11 }}>
                        {a.country_name_es}
                      </p>
                      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{a.iso3}</p>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                      background: sev.bg, color: sev.fg,
                      textAlign: 'center', letterSpacing: 0.3,
                    }}>
                      {a.host_risk_band}
                      {a.host_irc_score !== null && <> · {a.host_irc_score}</>}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#334155', lineHeight: 1.4 }}>
                        <strong style={{ color: '#0f172a' }}>{a.category_label}:</strong>{' '}
                        {a.description}
                      </p>
                      {a.notes && (
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                          {a.notes}
                        </p>
                      )}
                      {a.in_ucdp_seed && a.conflict_label && (
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#dc2626', fontWeight: 600 }}>
                          ▲ UCDP · {a.conflict_label}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      {a.value_eur_m !== null && (
                        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                          €{a.value_eur_m >= 1000 ? `${(a.value_eur_m / 1000).toFixed(1)}bn` : `${a.value_eur_m}M`}
                        </p>
                      )}
                      {a.magnitude !== null && a.magnitude_label && (
                        <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>
                          {a.magnitude.toLocaleString('es-ES')} {a.magnitude_label}
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <p style={{ marginTop: 12, fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
            Fuentes: PERE INE 2024 · MAEC red embajadas+consulados · Instituto Cervantes 86 centros ·
            AECID memoria 2023 · CESCE avales · IBEX_PRESENCE catálogo · IRC compuesto V-Dem+SIPRI+GDELT en tiempo real ·
            UCDP/PRIO seed top 30 conflictos. Click en una fila → drawer país con perfil completo.
          </p>
        </>
      )}
    </section>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 4,
    border: active ? `1px solid ${color}` : '1px solid #e2e8f0',
    background: active ? color : '#fff',
    color: active ? '#fff' : '#475569',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}

export default ActivosRiesgoPanel
