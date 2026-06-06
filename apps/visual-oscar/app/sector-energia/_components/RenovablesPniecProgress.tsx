'use client'
/**
 * <RenovablesPniecProgress /> · Energía v3 · Sprint E4 (Renovables profundo)
 *
 * Progreso real hacia los objetivos del PNIEC 2030 desde
 * `GET /api/energia/pniec-progress`, que combina fuentes VIVAS (cuota renovable
 * del mix REE + potencia solar/eólica instalada de REE) con los objetivos
 * curados de MITECO. Cada métrica indica su procedencia (`source: live|catalog`).
 *
 *   - Barras de progreso (valor_actual vs objetivo_2030, % completado).
 *   - Color por avance: rojo <40 %, ámbar 40-75 %, verde ≥75 %.
 *   - Badge por métrica: "vivo" (REE) o "catálogo" (MITECO).
 *   - Resumen: cuántas métricas usan dato vivo (live_count / total_count).
 *
 * Empty-state honesto si el endpoint no responde. Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

interface PniecMetric {
  metrica: string
  objetivo_2030: number | string
  valor_actual: number | string
  progreso_pct: number | null
  unidad: string
  source: 'live' | 'catalog'
  source_label: string
}
interface PniecData {
  metricas: PniecMetric[]
  live_count: number
  total_count: number
  fecha_ref_mix?: string | null
}
interface PniecResp {
  ok: boolean
  error?: string
  data?: PniecData
}

// Color por nivel de avance (rojo → ámbar → verde).
function progressColor(pct: number | null): string {
  if (pct == null) return '#C0C0C5'
  if (pct >= 75) return ACCENT
  if (pct >= 40) return '#D97706'
  return '#DC2626'
}

function fmt(v: number | string): string {
  if (typeof v === 'number') return v.toLocaleString('es-ES', { maximumFractionDigits: v >= 100 ? 0 : 1 })
  return v
}

export function RenovablesPniecProgress() {
  const [resp, setResp] = useState<PniecResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/pniec-progress', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PniecResp>) : null))
      .then((j) => { if (alive) { setResp(j); setLoading(false) } })
      .catch(() => { if (alive) { setResp(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const data = resp?.data
  const metricas = data?.metricas ?? []

  return (
    <div>
      {data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14, fontSize: 11, color: '#6e6e73' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 999,
              color: data.live_count > 0 ? '#15803d' : '#92400e',
              background: data.live_count > 0 ? '#ECFDF3' : '#FEF6E7',
              border: `1px solid ${data.live_count > 0 ? '#BBF7D0' : '#FDE3B0'}`,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: data.live_count > 0 ? '#16A34A' : '#D97706' }} />
            {data.live_count} de {data.total_count} métricas en vivo
          </span>
          <span>El resto son seguimiento curado del PNIEC (MITECO).</span>
        </div>
      )}

      {metricas.length === 0 ? (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
          {loading
            ? 'Cargando progreso PNIEC…'
            : 'Progreso PNIEC no disponible. El endpoint /api/energia/pniec-progress no devolvió métricas.'}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {metricas.map((m) => {
            const pct = m.progreso_pct
            const color = progressColor(pct)
            const isLive = m.source === 'live'
            return (
              <li key={m.metrica}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3a3a3d', fontWeight: 600, lineHeight: 1.3 }}>
                    {m.metrica}
                    <span
                      title={m.source_label}
                      style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap',
                        color: isLive ? '#15803d' : '#86868b',
                        background: isLive ? '#ECFDF3' : '#F5F5F7',
                        border: `1px solid ${isLive ? '#BBF7D0' : '#E5E5EA'}`,
                      }}
                    >
                      {isLive ? 'vivo' : 'catálogo'}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                    {fmt(m.valor_actual)}
                    <span style={{ color: '#86868b', fontWeight: 600 }}> / {fmt(m.objetivo_2030)} {m.unidad}</span>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 12, background: '#F5F5F7', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    title={pct != null ? `${pct.toFixed(0)}% del objetivo 2030` : 'Progreso no calculable'}
                    style={{ width: `${pct == null ? 0 : Math.min(100, pct)}%`, height: '100%', background: color, transition: 'width 300ms ease' }}
                  />
                </div>
                <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3 }}>
                  {pct != null
                    ? `${pct.toFixed(0)}% del objetivo 2030`
                    : 'Progreso no calculable (objetivo o valor no numérico)'}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div style={{ marginTop: 12, fontSize: 9.5, color: '#86868b', lineHeight: 1.5 }}>
        Avance vs objetivos PNIEC 2030. valor_actual desde fuente viva (REE: mix renovable + potencia
        instalada) donde es posible; el resto del seguimiento curado MITECO. Color: rojo &lt;40 %,
        ámbar 40-75 %, verde ≥75 %.
      </div>
    </div>
  )
}

export default RenovablesPniecProgress
