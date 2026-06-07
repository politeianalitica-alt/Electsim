'use client'
/**
 * <RenovablesCapacityChart /> · Energía v3 · Sprint E4 (Renovables profundo)
 *
 * Potencia instalada por tecnología del sistema eléctrico ES, en VIVO desde
 * `GET /api/energia/renovables-capacity` (REE apidatos · potencia-instalada) con
 * degradación honesta al catálogo curado `CAPACIDAD_RENOVABLE_ES`. El endpoint
 * marca su procedencia en `data.source` ('live' | 'catalog'); aquí mostramos un
 * badge honesto según esa marca.
 *
 *   - Barras horizontales por tecnología (MW), ordenadas desc.
 *   - Badge de fuente: "EN VIVO · REE" (verde) o "CATÁLOGO" (ámbar) + fecha_ref.
 *   - Totales: potencia total + renovable (si REE clasifica las series).
 *
 * Empty-state honesto si el endpoint no responde. Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

interface CapTech {
  tecnologia: string
  capacidad_mw: number | null
  fecha: string
  tipo?: string | null
}
interface CapData {
  source: 'live' | 'catalog'
  fecha_ref: string | null
  tecnologias: CapTech[]
  total_mw: number | null
  total_renovable_mw: number | null
  source_label: string
  nota?: string
}
interface CapResp {
  ok: boolean
  error?: string
  data?: CapData
}

// Colorea las barras por familia tecnológica (reconocimiento por nombre REE).
function techColor(name: string): string {
  const n = name.toLowerCase()
  if (/e[oó]lica/.test(n)) return '#3b82f6'
  if (/fotovolta|solar f/.test(n)) return '#f59e0b'
  if (/solar t[eé]rmica|csp/.test(n)) return '#f97316'
  if (/hidr[aá]ulica|hidro/.test(n)) return '#06b6d4'
  if (/biomasa|biog[aá]s|residuos renov/.test(n)) return '#84cc16'
  if (/nuclear/.test(n)) return '#7c3aed'
  if (/ciclo combinado|gas/.test(n)) return '#94a3b8'
  if (/carb[oó]n/.test(n)) return '#171717'
  if (/cogeneraci/.test(n)) return '#a3a3a3'
  if (/turbinaci|bombeo/.test(n)) return '#0ea5e9'
  return '#9CA3AF'
}

export function RenovablesCapacityChart() {
  const [resp, setResp] = useState<CapResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/renovables-capacity', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<CapResp>) : null))
      .then((j) => { if (alive) { setResp(j); setLoading(false) } })
      .catch(() => { if (alive) { setResp(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const data = resp?.data
  const techs = (data?.tecnologias ?? []).filter((t) => t.capacidad_mw != null && t.capacidad_mw > 0)
  const isLive = data?.source === 'live'
  const maxMw = Math.max(1, ...techs.map((t) => t.capacidad_mw ?? 0))

  return (
    <div>
      {/* Cabecera: badge de fuente honesto + totales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {data && (
          <span
            title={data.source_label}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 999,
              color: isLive ? '#15803d' : '#92400e',
              background: isLive ? '#ECFDF3' : '#FEF6E7',
              border: `1px solid ${isLive ? '#BBF7D0' : '#FDE3B0'}`,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#16A34A' : '#D97706' }} />
            {isLive ? 'En vivo · REE' : 'Catálogo curado'}
          </span>
        )}
        {data?.fecha_ref && (
          <span style={{ fontSize: 11, color: '#86868b' }}>Referencia · {data.fecha_ref}</span>
        )}
        {data?.total_mw != null && (
          <span style={{ fontSize: 11, color: '#3a3a3d', marginLeft: 'auto' }}>
            Total instalado{' '}
            <strong style={{ fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
              {(data.total_mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} GW
            </strong>
            {data.total_renovable_mw != null && (
              <>
                {' · '}renovable{' '}
                <strong style={{ fontFamily: 'var(--font-display)', color: ACCENT }}>
                  {(data.total_renovable_mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} GW
                </strong>
              </>
            )}
          </span>
        )}
      </div>

      {techs.length === 0 ? (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
          {loading
            ? 'Cargando potencia instalada…'
            : 'Potencia instalada no disponible. El endpoint /api/energia/renovables-capacity no devolvió datos vivos ni de catálogo.'}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {techs.map((t) => {
            const mw = t.capacidad_mw ?? 0
            const widthPct = Math.min(100, (mw / maxMw) * 100)
            const color = techColor(t.tecnologia)
            return (
              <li key={t.tecnologia}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#3a3a3d', fontWeight: 600 }}>
                    <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
                    {t.tecnologia}
                    {t.tipo && /renovab/i.test(t.tipo) && !/no.?renovab/i.test(t.tipo) && (
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 4, padding: '0 4px', letterSpacing: '0.02em' }}>
                        REN
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                    {mw.toLocaleString('es-ES')} <span style={{ fontSize: 10, color: '#86868b', fontWeight: 600 }}>MW</span>
                  </span>
                </div>
                <div style={{ height: 9, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    title={`${t.tecnologia}: ${mw.toLocaleString('es-ES')} MW (${(mw / 1000).toFixed(1)} GW)`}
                    style={{ width: `${widthPct}%`, height: '100%', background: color, transition: 'width 250ms ease' }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {data?.nota && (
        <div style={{ marginTop: 12, fontSize: 9.5, color: '#92400e', lineHeight: 1.5, background: '#FFFBEB', border: '1px solid #FDE3B0', borderRadius: 8, padding: '7px 10px' }}>
          {data.nota}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 9.5, color: '#86868b', lineHeight: 1.5 }}>
        Potencia instalada por tecnología (MW). Fuente: REE apidatos · potencia-instalada (en vivo);
        degrada al catálogo curado REE/MITECO si la API no responde. {data?.source_label}
      </div>
    </div>
  )
}

export default RenovablesCapacityChart
