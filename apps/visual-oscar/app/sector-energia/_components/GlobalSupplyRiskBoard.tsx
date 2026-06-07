'use client'
/**
 * <GlobalSupplyRiskBoard /> · Energía v3 · Sprint E9 (Visión Global)
 *
 * Tabla ejecutiva "PROVEEDORES POR RIESGO PAÍS" del aprovisionamiento energético
 * de España. No repite el SupplyRiskGauge (semáforo de dimensiones): aquí el foco
 * es QUIÉN nos suministra y CUÁNTO riesgo país aporta cada origen, ponderado por
 * su cuota de importación. Crudo (CORES) y GNL (Enagás/CORES) combinados, orden
 * por EXPOSICIÓN (cuota × riesgo) — los nombres que más mueven la aguja arriba.
 *
 * Fuente: GET /api/energia/energy-supply-risk-geo (V-Dem + sanciones seed ×
 * cuotas import). El score es ESTRUCTURAL (no eventos ACLED/UCDP en vivo): se
 * marca honestamente como "riesgo estructural · seed" (CLAUDE.md).
 *
 * Expone el riesgo ponderado de cada vector a la vista padre vía `onData`, para
 * que ésta lo pase al <SupplyRiskGauge> (prop opcional retrocompatible) sin que
 * el endpoint se fetchee dos veces. Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

// ── Bandas de riesgo país (alineadas con energy-supply-risk-geo) ─────────────
type Banda = 'bajo' | 'medio' | 'alto' | 'critico' | 'desconocido'
const BANDA_COLOR: Record<Banda, string> = {
  bajo: '#16A34A',
  medio: '#F59E0B',
  alto: '#F97316',
  critico: '#DC2626',
  desconocido: '#C0C0C5',
}
const BANDA_LABEL: Record<Banda, string> = {
  bajo: 'bajo',
  medio: 'medio',
  alto: 'alto',
  critico: 'crítico',
  desconocido: '—',
}

// ── Shape del endpoint (solo lo consumido) ───────────────────────────────────
interface RiskComponents {
  vdem: number | null
  vdem_categoria: string | null
  vdem_tendencia: string | null
  sanciones_programas: number
  urgency_for_spain: number | null
}
interface RiskCountry {
  pais: string
  iso: string | null
  cuota_pct: number
  riesgo: number | null
  riesgo_banda: Banda
  componentes: RiskComponents
}
interface RiskByVector {
  vector: 'petroleo' | 'gnl'
  por_pais: RiskCountry[]
  riesgo_ponderado: number | null
  cuota_identificada_pct: number
  fuente: string
  fuente_url: string
}
interface SupplyRiskGeo {
  petroleo: RiskByVector
  gas: RiskByVector
  riesgo_ponderado_petroleo: number | null
  riesgo_ponderado_gas: number | null
  nota: string
}
interface SupplyRiskGeoResp {
  ok: boolean
  data: SupplyRiskGeo | null
  source?: string
}

/** Lo que la vista padre necesita para enriquecer el SupplyRiskGauge. */
export interface SupplyRiskGeoSummary {
  petroleoGeoRisk: number | null
  gasGeoRisk: number | null
  petroleoCuotaIdentificada: number | null
  gasCuotaIdentificada: number | null
}

interface Props {
  /** Callback con el resumen ponderado (para alimentar el gauge). */
  onData?: (s: SupplyRiskGeoSummary) => void
}

// Fila aplanada para la tabla combinada (crudo + gas).
interface FlatRow extends RiskCountry {
  vectorLabel: string
  vectorColor: string
  exposicion: number
}

export default function GlobalSupplyRiskBoard({ onData }: Props) {
  const [data, setData] = useState<SupplyRiskGeo | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/energy-supply-risk-geo', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<SupplyRiskGeoResp>) : null))
      .then((j) => {
        if (!alive) return
        const d = j?.data ?? null
        setData(d)
        setFailed(!d)
        setLoading(false)
        if (d) {
          onData?.({
            petroleoGeoRisk: d.riesgo_ponderado_petroleo,
            gasGeoRisk: d.riesgo_ponderado_gas,
            petroleoCuotaIdentificada: d.petroleo?.cuota_identificada_pct ?? null,
            gasCuotaIdentificada: d.gas?.cuota_identificada_pct ?? null,
          })
        }
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
    // onData es estable (definido por la vista padre); no lo incluimos para no
    // re-disparar el fetch en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Combina crudo + gas, excluye agregado "Resto" (iso null) y ordena por
  // exposición (cuota × riesgo). Top 8 para mantener el cuadro ejecutivo.
  const rows: FlatRow[] = data
    ? [
        ...(data.petroleo?.por_pais ?? []).map((p) => ({ ...p, vectorLabel: 'Crudo', vectorColor: '#0F766E' })),
        ...(data.gas?.por_pais ?? []).map((p) => ({ ...p, vectorLabel: 'GNL', vectorColor: '#0EA5E9' })),
      ]
        .filter((p) => p.iso != null)
        .map((p) => ({ ...p, exposicion: (p.riesgo ?? 0) * (p.cuota_pct ?? 0) }))
        .sort((a, b) => b.exposicion - a.exposicion)
        .slice(0, 8)
    : []

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: '-0.013em',
              color: '#1d1d1f',
            }}
          >
            Proveedores energéticos por riesgo país
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Orígenes de crudo (CORES) y GNL (Enagás/CORES) ordenados por exposición · cuota × riesgo país
          </p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 18 }}>
            <PonderadoChip label="Riesgo crudo" value={data.riesgo_ponderado_petroleo} cuota={data.petroleo?.cuota_identificada_pct} />
            <PonderadoChip label="Riesgo gas/GNL" value={data.riesgo_ponderado_gas} cuota={data.gas?.cuota_identificada_pct} />
          </div>
        )}
      </header>

      {loading && <div style={{ fontSize: 12, color: '#86868b' }}>Cargando riesgo de proveedores…</div>}

      {!loading && failed && (
        <div style={{ fontSize: 12, color: '#86868b' }}>
          Riesgo de proveedores no disponible ahora. Reintenta más tarde.
        </div>
      )}

      {!loading && data && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ECECEF' }}>
                <th style={th('left')}>País</th>
                <th style={th('left')}>Vector</th>
                <th style={th('right')}>Cuota</th>
                <th style={th('right')}>Riesgo país</th>
                <th style={th('left')}>Banda V-Dem</th>
                <th style={th('left')}>Sanciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.vectorLabel}-${r.iso}-${r.pais}`} style={{ borderBottom: '1px solid #F5F5F7' }}>
                  <td style={{ padding: '9px 8px', fontWeight: 600, color: '#1d1d1f' }}>
                    {r.pais}
                    {r.iso && <span style={{ fontSize: 9.5, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 6 }}>{r.iso}</span>}
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    <span
                      aria-hidden="true"
                      style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: r.vectorColor, marginRight: 6, verticalAlign: 'middle' }}
                    />
                    <span style={{ color: '#3a3a3d' }}>{r.vectorLabel}</span>
                  </td>
                  <td style={td('right')}>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{r.cuota_pct.toFixed(0)}%</span>
                  </td>
                  <td style={td('right')}>
                    {r.riesgo == null ? (
                      <span style={{ color: '#C0C0C5' }}>—</span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', color: BANDA_COLOR[r.riesgo_banda] }}>
                        {Math.round(r.riesgo)}
                        <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>/100</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        color: BANDA_COLOR[r.riesgo_banda],
                        background: `${BANDA_COLOR[r.riesgo_banda]}18`,
                        padding: '2px 8px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                      }}
                      title={r.componentes.vdem_categoria ?? undefined}
                    >
                      {BANDA_LABEL[r.riesgo_banda]}
                    </span>
                    {r.componentes.vdem_tendencia && (
                      <span style={{ fontSize: 9.5, color: '#9CA3AF', marginLeft: 6 }}>{tendArrow(r.componentes.vdem_tendencia)}</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    {r.componentes.sanciones_programas > 0 ? (
                      <span style={{ fontSize: 10.5, color: '#DC2626', fontWeight: 700 }}>
                        {r.componentes.sanciones_programas} prog.
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', lineHeight: 1.5, maxWidth: 560 }}>
            <span style={{ fontWeight: 700, color: '#6e6e73' }}>Riesgo estructural · seed.</span> Score V-Dem
            (calidad democrática invertida) + sanciones conocidas, ponderado por cuota de importación. No
            incorpora eventos ACLED/UCDP en vivo. Las cuotas son orden de magnitud (varían mes a mes).
          </p>
          {data.petroleo?.fuente_url && (
            <a href={data.petroleo.fuente_url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Cuotas · CORES / Enagás
            </a>
          )}
        </div>
      )}
    </section>
  )
}

// ── Chip de riesgo ponderado por vector ──────────────────────────────────────
function PonderadoChip({ label, value, cuota }: { label: string; value: number | null; cuota?: number }) {
  const has = value != null && Number.isFinite(value)
  const color = !has ? '#C0C0C5' : value! >= 65 ? '#DC2626' : value! >= 45 ? '#F59E0B' : '#16A34A'
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>
        {has ? Math.round(value!) : '—'}
        {has && <span style={{ fontSize: 9.5, color: '#9CA3AF', fontWeight: 600 }}>/100</span>}
      </div>
      {cuota != null && Number.isFinite(cuota) && (
        <div style={{ fontSize: 9, color: '#9CA3AF' }}>{cuota.toFixed(0)}% identif.</div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function tendArrow(trend: string): string {
  const t = trend.toLowerCase()
  if (t.includes('deterior') || t.includes('declin') || t.includes('down') || t.includes('empeora')) return '⇣ deteriora'
  if (t.includes('mejora') || t.includes('improv') || t.includes('up')) return '⇡ mejora'
  return '· estable'
}
function th(align: 'left' | 'right'): React.CSSProperties {
  return {
    padding: '6px 8px',
    textAlign: align,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#86868b',
    whiteSpace: 'nowrap',
  }
}
function td(align: 'left' | 'right'): React.CSSProperties {
  return { padding: '9px 8px', textAlign: align, fontVariantNumeric: 'tabular-nums' }
}
