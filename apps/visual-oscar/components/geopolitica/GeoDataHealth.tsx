'use client'
/**
 * `<GeoDataHealth />` · Sprint G8.
 *
 * Diagnóstico de fuentes geo · ping de 20 endpoints con timeout 8s.
 * Reporta latency + status + n_items por endpoint, agrupado por capa.
 *
 * Útil para:
 *   - Transparencia ("¿por qué no veo el feed XX?")
 *   - Debugging RSS feeds que cambian de URL sin avisar
 *   - Auditoría de cobertura ("¿cuántas capas tenemos OK ahora mismo?")
 */
import { useEffect, useState } from 'react'

interface Endpoint {
  name: string
  layer: string
  path: string
  status: number
  ms: number
  ok: boolean
  has_data: boolean
  n_items: number
  error?: string
}

interface Resp {
  ok: boolean
  n_endpoints?: number
  summary?: { ok_count: number; with_data_count: number; failed_count: number; avg_latency_ms: number }
  by_layer?: Record<string, { total: number; ok: number; with_data: number }>
  endpoints?: Endpoint[]
  note?: string
  error?: string
}

const LAYER_COLOR: Record<string, string> = {
  'Capa 1':    '#0ea5e9',
  'Capa 2':    '#7c3aed',
  'Capa 3':    '#1e40af',
  'Capa 4':    '#f97316',
  'Capa 5':    '#dc2626',
  'Capa 6':    '#be123c',
  'Analítico': '#16a34a',
}

function statusColor(ep: Endpoint): string {
  if (!ep.ok) return '#dc2626'
  if (!ep.has_data) return '#f59e0b'
  return '#16a34a'
}

function statusLabel(ep: Endpoint): string {
  if (!ep.ok) return ep.error ? `ERROR · ${ep.error.slice(0, 24)}` : `HTTP ${ep.status}`
  if (!ep.has_data) return 'SIN DATOS'
  return `${ep.n_items} items`
}

export function GeoDataHealth() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = (force = false) => {
    setRefreshing(true)
    fetch(`/api/geopolitica/data-health${force ? `?ts=${Date.now()}` : ''}`, { cache: force ? 'no-store' : 'force-cache' })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load(false) }, [])

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #64748b',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#475569', textTransform: 'uppercase' }}>
            ◆ Data health · transparencia de fuentes
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            Ping a 20 endpoints geo agrupados por capa. Verde = OK con datos, ámbar = OK sin datos, rojo = error.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: refreshing ? '#94a3b8' : '#0f172a',
            color: '#fff',
            border: 'none',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          {refreshing ? '…' : '↻'} Re-ping
        </button>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Pinging endpoints…</p>}

      {data?.ok && (
        <>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>OK</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{data.summary?.ok_count ?? 0}</p>
            </div>
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Con datos</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{data.summary?.with_data_count ?? 0}</p>
            </div>
            <div style={{ padding: 8, background: '#fee2e2', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Fallaron</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{data.summary?.failed_count ?? 0}</p>
            </div>
            <div style={{ padding: 8, background: '#f1f5f9', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Latency media</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>{data.summary?.avg_latency_ms}ms</p>
            </div>
          </div>

          {/* Cobertura por capa */}
          {data.by_layer && (
            <div style={{ marginBottom: 14, padding: 10, background: '#f8fafc', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Cobertura por capa
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                {Object.entries(data.by_layer).map(([layer, st]) => {
                  const col = LAYER_COLOR[layer] || '#64748b'
                  const pct = st.total > 0 ? Math.round((st.with_data / st.total) * 100) : 0
                  return (
                    <div key={layer} style={{ padding: 6, background: '#fff', borderRadius: 4, borderLeft: `3px solid ${col}` }}>
                      <p style={{ margin: 0, fontSize: 9, color: col, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{layer}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#0f172a' }}>
                        {st.with_data}/{st.total} con datos <span style={{ color: '#94a3b8' }}>({pct}%)</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista endpoints */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
            {data.endpoints?.map((ep) => {
              const col = statusColor(ep)
              const layerCol = LAYER_COLOR[ep.layer] || '#64748b'
              return (
                <div key={ep.path} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 90px 60px 110px',
                  gap: 8,
                  padding: '6px 8px',
                  background: '#f8fafc',
                  borderLeft: `3px solid ${col}`,
                  borderRadius: 3,
                  alignItems: 'center',
                  fontSize: 10,
                }}>
                  <span style={{ fontSize: 8, color: layerCol, fontWeight: 700, letterSpacing: 0.4 }}>{ep.layer}</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{ep.name}</span>
                  <span style={{ color: '#64748b', fontFamily: 'ui-monospace, monospace', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</span>
                  <span style={{ color: ep.ms > 3000 ? '#dc2626' : ep.ms > 1500 ? '#f59e0b' : '#16a34a', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{ep.ms}ms</span>
                  <span style={{ color: col, fontWeight: 700, fontSize: 9, letterSpacing: 0.3, textAlign: 'right' }}>{statusLabel(ep)}</span>
                </div>
              )
            })}
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.note}
          </p>
        </>
      )}
    </section>
  )
}

export default GeoDataHealth
