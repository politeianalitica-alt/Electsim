'use client'
/**
 * `<MapaMediosView />` · Sprint G15 FASE H
 *
 * Reemplaza el render de la tab "Mapa de medios" (antes "Informes &
 * monitores"). Antes mostraba sólo InformesAlertas (monitores guardados
 * en localStorage). Ahora la tab responde a "¿cómo es el panorama
 * mediático español?":
 *
 *   - Sumario · 6 KPIs (total medios · grupos · audiencia · % con RSS ·
 *     credibilidad media · medios locales)
 *   - Concentración por grupo · top 12 grupos empresariales con barra
 *     horizontal + share + audiencia agregada (Vocento · PRISA · Atresmedia…)
 *   - Distribución ideológica · 5 buckets con porcentajes
 *   - Distribución territorial · por scope_level (nacional/auton/prov/local/europ)
 *   - Catálogo filtrable · tabla con tipo · ámbito · ccaa · ideología · audiencia
 *   - Click medio → ficha lateral con detalle completo + link al web/RSS
 *
 * NO sustituye InformesAlertas: lo conserva como sub-bloque opcional
 * al final ("monitores guardados localStorage") por si el analista
 * quiere seguir teniendo sus monitores ahí.
 *
 * Data source: `/api/medios?limit=300` (endpoint que ya existe, ahora
 * devuelve stats enriquecidas Sprint G15 FASE H).
 *
 * Sin nuevas deps. Cero mapas SVG aquí (el mapa España de provincia
 * lo cubre SentimentMapInteractive en la tab Mapas; aquí el foco es
 * el catálogo + concentración, no la geografía).
 */
import { useEffect, useMemo, useState } from 'react'
import { InformesAlertas } from './InformesAlertas'

const ACCENT = '#475569'

interface MedioRow {
  id: string
  nombre: string
  grupo: string
  tipo: string
  ambito: string
  ccaa: string | null
  ideologia: number
  audiencia_M: number
  credibilidad: number
  rss: string | null
  web: string
  scope_level?: string | null
  provincia?: string | null
  municipio?: string | null
}

interface GrupoStat {
  grupo: string
  n: number
  share: number
  audiencia_M: number
}

interface ApiResponse {
  medios: MedioRow[]
  stats: {
    total: number
    por_tipo: Record<string, number>
    por_ambito: Record<string, number>
    por_scope: Record<string, number>
    por_ccaa: Record<string, number>
    por_ideologia: Record<string, number>
    por_grupo: GrupoStat[]
    con_rss: number
    rss_share: number
    audiencia_total_M: number
    credibilidad_media: number
    n_grupos_distintos: number
  }
}

type IdeologyFilter = 'all' | 'izquierda' | 'centro' | 'derecha'
type ScopeFilter = 'all' | 'nacional' | 'autonomico' | 'provincial' | 'local' | 'europeo'

function ideologyLabel(n: number): string {
  if (n <= -40) return 'izquierda'
  if (n <= -10) return 'centro-izquierda'
  if (n < 10) return 'centro'
  if (n < 40) return 'centro-derecha'
  return 'derecha'
}

function ideologyColor(n: number): string {
  if (n <= -40) return '#dc2626'
  if (n <= -10) return '#f59e0b'
  if (n < 10) return '#64748b'
  if (n < 40) return '#0891b2'
  return '#1F4E8C'
}

function normalizeCred(c: number): number {
  return c <= 1 ? c * 100 : c
}

export function MapaMediosView() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [ideologyFilter, setIdeologyFilter] = useState<IdeologyFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [grupoFilter, setGrupoFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/medios?limit=300', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => { if (mounted) setData(d) })
      .catch((e) => { if (mounted) setError(String(e?.message ?? e)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    let rows = data.medios
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.grupo.toLowerCase().includes(q) ||
        (m.ccaa || '').toLowerCase().includes(q) ||
        (m.provincia || '').toLowerCase().includes(q),
      )
    }
    if (ideologyFilter !== 'all') {
      if (ideologyFilter === 'izquierda') rows = rows.filter((m) => m.ideologia < -20)
      else if (ideologyFilter === 'derecha') rows = rows.filter((m) => m.ideologia > 20)
      else rows = rows.filter((m) => m.ideologia >= -20 && m.ideologia <= 20)
    }
    if (scopeFilter !== 'all') rows = rows.filter((m) => m.scope_level === scopeFilter)
    if (tipoFilter !== 'all') rows = rows.filter((m) => m.tipo === tipoFilter)
    if (grupoFilter !== 'all') rows = rows.filter((m) => m.grupo === grupoFilter)
    return rows
  }, [data, search, ideologyFilter, scopeFilter, tipoFilter, grupoFilter])

  const selected = useMemo(() => {
    if (!selectedId || !data) return null
    return data.medios.find((m) => m.id === selectedId) || null
  }, [selectedId, data])

  if (loading) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando catálogo de medios…</p>
      </section>
    )
  }
  if (error || !data) {
    return (
      <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#991b1b', fontWeight: 600 }}>▲ Catálogo no disponible {error ? `(${error})` : ''}</p>
      </section>
    )
  }

  const s = data.stats
  const maxGrupoN = Math.max(...s.por_grupo.map((g) => g.n), 1)
  const ideoTotal = Object.values(s.por_ideologia).reduce((sum, v) => sum + v, 0) || 1
  const scopeTotal = Object.values(s.por_scope).reduce((sum, v) => sum + v, 0) || 1

  const tipos = Object.keys(s.por_tipo).sort()
  const grupos = s.por_grupo.map((g) => g.grupo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header metodológico */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: ACCENT, textTransform: 'uppercase' }}>
          ◆ Mapa de medios · panorama mediático español
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Catálogo curado de <strong>{s.total} medios</strong> ({s.n_grupos_distintos} grupos empresariales distintos)
          con audiencia agregada de <strong>{s.audiencia_total_M.toFixed(1)} M</strong>. Datos del seed estático
          + overlay <code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2, fontSize: 10 }}>data/medios-locales.json</code>
          (provincial · local · scope_level). Concentración por grupo, ideología y territorio.
        </p>
      </section>

      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8,
      }}>
        <Kpi label="Total medios" value={String(s.total)} color="#0f172a" />
        <Kpi label="Grupos distintos" value={String(s.n_grupos_distintos)} color="#0891b2" />
        <Kpi label="Audiencia M" value={s.audiencia_total_M.toFixed(1)} color="#1F4E8C" />
        <Kpi label="Con RSS" value={`${s.con_rss} (${Math.round(s.rss_share * 100)}%)`} color="#16a34a" />
        <Kpi label="Credib. media" value={`${s.credibilidad_media}/100`} color="#7c3aed" />
        <Kpi label="Locales/Prov" value={String((s.por_scope.local || 0) + (s.por_scope.provincial || 0))} color="#f59e0b" />
      </div>

      {/* 3 columnas · concentración + ideología + scope */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
      }}>
        {/* Concentración por grupo */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Concentración por grupo · top 12
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {s.por_grupo.map((g) => (
              <button
                key={g.grupo}
                onClick={() => setGrupoFilter(grupoFilter === g.grupo ? 'all' : g.grupo)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 36px 50px', gap: 6, alignItems: 'center',
                  fontSize: 11, padding: '4px 6px',
                  background: grupoFilter === g.grupo ? '#e0f2fe' : '#f8fafc',
                  border: 'none', borderRadius: 3, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 0, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', inset: 0, background: '#cbd5e1', borderRadius: 2,
                    width: `${(g.n / maxGrupoN) * 100}%`, opacity: 0.4,
                  }} />
                  <span style={{ position: 'relative', color: '#0f172a', fontWeight: 500, paddingLeft: 4 }}>{g.grupo}</span>
                </div>
                <span style={{ color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{g.n}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', textAlign: 'right', fontSize: 10 }}>
                  {g.audiencia_M.toFixed(1)}M
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Distribución ideológica */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Distribución ideológica · 5 buckets
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(['izquierda', 'centro-izquierda', 'centro', 'centro-derecha', 'derecha'] as const).map((b) => {
              const n = s.por_ideologia[b] || 0
              const pct = (n / ideoTotal) * 100
              const color = b === 'izquierda' ? '#dc2626' : b === 'centro-izquierda' ? '#f59e0b'
                : b === 'centro' ? '#64748b' : b === 'centro-derecha' ? '#0891b2' : '#1F4E8C'
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 110, color: '#0f172a', textTransform: 'capitalize' }}>{b}</span>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: color, height: '100%', width: `${pct}%` }} />
                  </div>
                  <span style={{ width: 50, color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
                    {n} · {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
            Bucket por ideología cuantificada del catálogo (-100..+100). Indicativo, no método científico.
          </p>
        </section>

        {/* Distribución territorial · scope_level */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Distribución territorial · scope_level
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(['nacional', 'autonomico', 'provincial', 'local', 'europeo'] as ScopeFilter[]).filter((sc) => sc !== 'all').map((sc) => {
              const n = s.por_scope[sc] || 0
              const pct = (n / scopeTotal) * 100
              return (
                <button
                  key={sc}
                  onClick={() => setScopeFilter(scopeFilter === sc ? 'all' : sc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                    background: scopeFilter === sc ? '#e0f2fe' : 'transparent',
                    border: 'none', padding: '2px 4px', borderRadius: 3, cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ width: 110, color: '#0f172a', textTransform: 'capitalize' }}>{sc}</span>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: '#0891b2', height: '100%', width: `${pct}%` }} />
                  </div>
                  <span style={{ width: 50, color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
                    {n} · {pct.toFixed(0)}%
                  </span>
                </button>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
            Click en un nivel para filtrar la tabla. Provincial/local vienen del overlay curado.
          </p>
        </section>
      </div>

      {/* Tabla filtrable + ficha lateral */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          flexWrap: 'wrap', marginBottom: 10,
        }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Catálogo · {filtered.length} de {s.total} medios
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre · grupo · ccaa…"
              style={{
                padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4,
                fontSize: 11, fontFamily: 'inherit', width: 220,
              }}
            />
            <select
              value={ideologyFilter}
              onChange={(e) => setIdeologyFilter(e.target.value as IdeologyFilter)}
              style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, fontFamily: 'inherit' }}
            >
              <option value="all">ideología: todas</option>
              <option value="izquierda">izquierda</option>
              <option value="centro">centro</option>
              <option value="derecha">derecha</option>
            </select>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, fontFamily: 'inherit' }}
            >
              <option value="all">tipo: todos</option>
              {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(search || ideologyFilter !== 'all' || scopeFilter !== 'all' || tipoFilter !== 'all' || grupoFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch(''); setIdeologyFilter('all'); setScopeFilter('all');
                  setTipoFilter('all'); setGrupoFilter('all')
                }}
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 4, fontSize: 10, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </header>

        <div style={{
          display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) 280px' : '1fr', gap: 12,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Medio</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Grupo</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Ámbito</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Audien.</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Cred.</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>RSS</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Ideo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                    style={{
                      cursor: 'pointer',
                      background: selectedId === m.id ? '#e0f2fe' : 'transparent',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <td style={{ padding: '5px 8px', color: '#0f172a', fontWeight: 600 }}>{m.nombre}</td>
                    <td style={{ padding: '5px 8px', color: '#475569' }}>{m.grupo}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{m.tipo}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>
                      {m.ambito}{m.ccaa ? ` · ${m.ccaa}` : ''}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
                      {m.audiencia_M.toFixed(1)}M
                    </td>
                    <td style={{ padding: '5px 8px', color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
                      {normalizeCred(m.credibilidad).toFixed(0)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      {m.rss ? <span style={{ color: '#16a34a' }}>✓</span> : <span style={{ color: '#cbd5e1' }}>·</span>}
                    </td>
                    <td style={{ padding: '5px 8px', color: ideologyColor(m.ideologia), fontWeight: 600, fontSize: 10 }}>
                      {ideologyLabel(m.ideologia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
                Mostrando top 50 de {filtered.length}. Filtra para acotar.
              </p>
            )}
          </div>

          {selected && (
            <aside style={{
              background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 11, color: '#334155',
            }}>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: 'transparent', border: 'none', color: '#64748b', fontSize: 10,
                  cursor: 'pointer', float: 'right', fontFamily: 'inherit',
                }}
              >cerrar ×</button>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Ficha del medio
              </p>
              <h4 style={{ margin: '4px 0 8px', fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {selected.nombre}
              </h4>
              <FieldRow label="Grupo" value={selected.grupo} />
              <FieldRow label="Tipo" value={selected.tipo} />
              <FieldRow label="Ámbito" value={selected.ambito} />
              {selected.ccaa && <FieldRow label="CCAA" value={selected.ccaa} />}
              {selected.provincia && <FieldRow label="Provincia" value={selected.provincia} />}
              {selected.municipio && <FieldRow label="Municipio" value={selected.municipio} />}
              {selected.scope_level && <FieldRow label="Scope" value={selected.scope_level} />}
              <FieldRow label="Audiencia" value={`${selected.audiencia_M.toFixed(1)}M`} />
              <FieldRow label="Credibilidad" value={`${normalizeCred(selected.credibilidad).toFixed(0)}/100`} />
              <FieldRow
                label="Ideología"
                value={
                  <span style={{ color: ideologyColor(selected.ideologia), fontWeight: 600 }}>
                    {selected.ideologia} · {ideologyLabel(selected.ideologia)}
                  </span>
                }
              />
              <FieldRow label="RSS" value={selected.rss ? '✓ activo' : 'sin RSS'} />
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <a href={selected.web} target="_blank" rel="noopener noreferrer" style={{
                  background: '#1F4E8C', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  padding: '4px 10px', textDecoration: 'none',
                }}>Abrir web →</a>
                {selected.rss && (
                  <a href={selected.rss} target="_blank" rel="noopener noreferrer" style={{
                    background: '#fff', color: '#16a34a', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    padding: '4px 10px', textDecoration: 'none', border: '1px solid #16a34a',
                  }}>RSS feed</a>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Sub-bloque · monitores guardados (conservado del legacy) */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Monitores guardados · localStorage
        </p>
        <InformesAlertas />
      </section>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px',
      borderLeft: `3px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color, lineHeight: 1.2, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </p>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p style={{ margin: '2px 0', fontSize: 11, color: '#334155', lineHeight: 1.4 }}>
      <strong style={{ color: '#64748b', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, marginRight: 6 }}>
        {label}:
      </strong>
      {value}
    </p>
  )
}

export default MapaMediosView
