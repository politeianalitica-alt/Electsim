'use client'
/**
 * `<GeoDataHealth />` · Sprint G8 + G13 FASE 9.
 *
 * Diagnóstico de fuentes geo · ping de 20 endpoints con timeout 8s.
 * Reporta latency + status + n_items por endpoint, agrupado por capa.
 *
 * Sprint G13 FASE 9 · añade panel "Data Meaning" antes del status técnico:
 * no basta saber si una fuente "funciona", hay que decir qué mide cada capa
 * y qué NO mide. Evita interpretar "GDELT TV ON" como "riesgo subió".
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

      {/* Sprint G13 FASE 9 · Data Meaning · qué mide y qué NO mide cada capa */}
      <DataMeaningPanel />

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

// ════════════════════════════════════════════════════════════════════════
// Sprint G13 FASE 9 · DataMeaningPanel · qué mide y qué NO mide cada capa
// ════════════════════════════════════════════════════════════════════════

interface MeaningRow {
  source: string
  what_it_means: string
  what_it_does_not_mean: string
  confirm_with?: string
}

const DATA_MEANING: MeaningRow[] = [
  {
    source: 'GDELT TV',
    what_it_means: 'Presencia en emisiones televisivas. Útil para detectar presión narrativa y saliencia mediática.',
    what_it_does_not_mean: 'No mide gravedad material ni realidad del conflicto.',
    confirm_with: 'ACLED/UCDP/ReliefWeb si se trata de conflicto material',
  },
  {
    source: 'GDELT DOC',
    what_it_means: 'Cobertura mediática global agregada por país/tema con tono y volumen.',
    what_it_does_not_mean: 'Cobertura ≠ realidad. Tono ≠ probabilidad de evento.',
    confirm_with: 'fuentes primarias',
  },
  {
    source: 'UCDP',
    what_it_means: 'Conflictos armados registrados estructuralmente (multi-año, peer-reviewed).',
    what_it_does_not_mean: 'NO indica deterioro de HOY · el dato es histórico/anual.',
    confirm_with: 'ACLED para señal táctica reciente',
  },
  {
    source: 'ACLED',
    what_it_means: 'Eventos de violencia política reciente (combate, ataque, protesta) georeferenciados.',
    what_it_does_not_mean: 'No mide percepción pública ni recomendación política.',
    confirm_with: 'ReliefWeb para impacto humanitario',
  },
  {
    source: 'ReliefWeb',
    what_it_means: 'Presión humanitaria actual (desplazados, necesidades) reportada por OCHA y ONGs.',
    what_it_does_not_mean: 'No mide intensidad militar ni atribución de responsables.',
    confirm_with: 'ACLED/UCDP para componente militar',
  },
  {
    source: 'Travel Advisory MAEC',
    what_it_means: 'Recomendación consular oficial española para viajeros nacionales.',
    what_it_does_not_mean: 'No mide violencia material · depende de política consular del emisor.',
    confirm_with: 'ACLED para hechos materiales',
  },
  {
    source: 'NATO / EEAS / UN SC',
    what_it_means: 'Comunicación institucional oficial militar/diplomática.',
    what_it_does_not_mean: 'No mide voluntad de uso de la fuerza · sólo declaración pública.',
  },
  {
    source: 'OFAC / EU sanctions',
    what_it_means: 'Medidas restrictivas oficiales actualmente vigentes.',
    what_it_does_not_mean: 'No garantiza cumplimiento ni impacto económico real.',
  },
  {
    source: 'Crisis Group / ISW',
    what_it_means: 'Análisis cualitativo experto de think tanks (situational picture).',
    what_it_does_not_mean: 'No es dato cuantitativo · es opinión experta · puede tener sesgos editoriales.',
  },
  {
    source: 'Moncloa / Defensa / Exteriores (RSS oficial)',
    what_it_means: 'Postura oficial de la administración española.',
    what_it_does_not_mean: 'No necesariamente refleja consenso parlamentario ni opinión pública.',
  },
  {
    source: 'Theme Clusters (IA)',
    what_it_means: 'Agrupación temática generada por LLM sobre titulares recientes.',
    what_it_does_not_mean: 'No es fuente factual · puede asignar miembros mal · validar con fuente primaria.',
  },
  {
    source: 'Baseline curado Politeia',
    what_it_means: 'Prior editorial sobre países/intereses de revisión manual.',
    what_it_does_not_mean: 'No es observación primaria · no se actualiza con noticias del día sin override explícito.',
  },
]

function DataMeaningPanel() {
  const [expanded, setExpanded] = useState(false)
  return (
    <section style={{ marginBottom: 14, padding: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textAlign: 'left' }}
      >
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase' }}>
          ◇ Data Meaning · qué mide y qué NO mide cada capa
        </p>
        <span style={{ fontSize: 14, color: '#94a3b8' }}>{expanded ? '▾' : '▸'}</span>
      </button>
      {!expanded && (
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
          Cada fuente mide cosas distintas. GDELT ≠ ACLED ≠ UCDP. Expandir para ver qué significa cada una y qué NO debe interpretarse.
        </p>
      )}
      {expanded && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {DATA_MEANING.map((m) => (
            <div key={m.source} style={{ padding: 8, background: '#fff', borderRadius: 4, border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#0f172a', letterSpacing: 0.3, textTransform: 'uppercase' }}>{m.source}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0f172a', lineHeight: 1.4 }}>
                <strong style={{ color: '#16a34a' }}>Mide:</strong> {m.what_it_means}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                <strong style={{ color: '#dc2626' }}>NO mide:</strong> {m.what_it_does_not_mean}
              </p>
              {m.confirm_with && (
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                  ↗ Validar con: <strong>{m.confirm_with}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
