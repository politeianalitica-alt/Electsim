'use client'
/**
 * <RenovablesForecast /> · Energía v3 · Sprint E4 (Renovables profundo)
 *
 * Forecast D+1 de generación eólica y solar FV, desde la predicción oficial de
 * REE que ya expone `GET /api/esios/predicciones`:
 *   - eólica prevista (541) vs real (551)
 *   - solar FV prevista (542) vs real (1161)
 * El endpoint devuelve, por par: serie_real 24h hacia atrás + serie_pred 24h
 * hacia delante, valor "ahora", MAPE 24h (calidad histórica) y bias (sesgo).
 *
 *   - Mini-chart por tecnología: real (sólido, pasado) + prevista (punteado, futuro).
 *   - KPIs: previsión ahora, pico previsto D+1, MAPE 24h, bias.
 *   - Si ESIOS no expone predicción (sin clave / 404), se OMITE con nota honesta.
 *
 * Cero emojis · Unicode.
 */
import { useEffect, useMemo, useState } from 'react'

interface SerieValor { t: string; v: number }
interface PredPair {
  pred_slug: string
  real_slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  pred_serie: SerieValor[]
  real_serie: SerieValor[]
  pred_now: number | null
  real_now: number | null
  mape_24h_pct: number | null
  bias_pct: number | null
  error?: string
}
interface PrediccionesResp {
  ok: boolean
  error?: string
  message?: string
  pairs?: PredPair[]
}

// Solo nos interesan eólica y solar FV para la vista Renovables.
const RENOV_PRED_SLUGS = ['prediccion_eolica', 'prediccion_solar'] as const
const COLOR: Record<string, string> = {
  prediccion_eolica: '#3b82f6',
  prediccion_solar: '#f59e0b',
}

export function RenovablesForecast() {
  const [resp, setResp] = useState<PrediccionesResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/predicciones', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PrediccionesResp>) : null))
      .then((j) => { if (alive) { setResp(j); setLoading(false) } })
      .catch(() => { if (alive) { setResp(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const noKey = resp?.error === 'no_key'
  const pairs = useMemo(
    () => (resp?.pairs ?? []).filter((p) => (RENOV_PRED_SLUGS as readonly string[]).includes(p.pred_slug)),
    [resp],
  )
  const usable = pairs.filter((p) => p.ok && (p.pred_serie.length > 0 || p.real_serie.length > 0))

  // Degradación honesta: ESIOS no expone la predicción → omitir con nota.
  if (!loading && (noKey || usable.length === 0)) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
        {noKey
          ? 'Predicción D+1 no disponible (ESIOS_API_KEY no configurada en Vercel). REE publica el forecast oficial de eólica (id 541) y solar FV (id 542); en cuanto haya clave se mostrará aquí.'
          : 'REE no devolvió predicción D+1 de eólica/solar en este momento. Sección omitida hasta que la fuente la exponga (no se inventan cifras).'}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: usable.length > 1 ? '1fr 1fr' : '1fr', gap: 16 }}>
      {usable.length === 0 && loading ? (
        <div style={{ fontSize: 12, color: '#86868b' }}>Cargando predicción D+1…</div>
      ) : (
        usable.map((p) => <ForecastCard key={p.pred_slug} pair={p} color={COLOR[p.pred_slug] || '#16A34A'} />)
      )}
    </div>
  )
}

function ForecastCard({ pair, color }: { pair: PredPair; color: string }) {
  const peakPred = pair.pred_serie.length ? Math.max(...pair.pred_serie.map((p) => p.v)) : null

  return (
    <div style={{ border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{pair.short}</span>
        <span style={{ fontSize: 10.5, color: '#86868b' }}>· {pair.unit}</span>
      </div>

      <PredChart pair={pair} color={color} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        <MiniKpi label="Prevista ahora" value={pair.pred_now} unit="MW" color={color} />
        <MiniKpi label="Pico previsto D+1" value={peakPred != null ? Math.round(peakPred) : null} unit="MW" color="#1d1d1f" />
        <MiniKpi
          label="MAPE 24 h"
          value={pair.mape_24h_pct}
          unit="%"
          color={pair.mape_24h_pct != null && pair.mape_24h_pct > 20 ? '#D97706' : '#15803d'}
          hint="Error medio histórico del forecast (menor = mejor)"
        />
        <MiniKpi
          label="Sesgo"
          value={pair.bias_pct}
          unit="%"
          color={pair.bias_pct == null ? '#86868b' : pair.bias_pct > 0 ? '#92400e' : '#1F4E8C'}
          hint="Positivo = el forecast sobreestima; negativo = infraestima"
          signed
        />
      </div>
    </div>
  )
}

function MiniKpi({
  label, value, unit, color, hint, signed,
}: {
  label: string; value: number | null; unit: string; color: string; hint?: string; signed?: boolean
}) {
  const display = value == null
    ? '—'
    : `${signed && value > 0 ? '+' : ''}${value.toLocaleString('es-ES', { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1 })}`
  return (
    <div title={hint} style={{ background: '#FAFAFA', border: '1px solid #F0F0F1', borderRadius: 8, padding: '7px 8px' }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#86868b', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
        {display}
        {value != null && unit && <span style={{ fontSize: 9, fontWeight: 600, color: '#86868b', marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  )
}

/** Línea real (pasado, sólida) + prevista (futuro, punteada), eje temporal continuo. */
function PredChart({ pair, color }: { pair: PredPair; color: string }) {
  const real = pair.real_serie
  const pred = pair.pred_serie
  if (real.length === 0 && pred.length === 0) {
    return <div style={{ fontSize: 11, color: '#86868b', padding: '8px 0' }}>Sin serie disponible.</div>
  }

  const W = 520, H = 150, P = 10
  // Eje temporal: real (n puntos) seguido de pred (m puntos). Continuo por índice.
  const nReal = real.length
  const nPred = pred.length
  const nTotal = nReal + nPred
  const allVals = [...real.map((p) => p.v), ...pred.map((p) => p.v)].filter(Number.isFinite)
  const maxV = Math.max(1, ...allVals)
  const x = (idx: number) => P + (idx / Math.max(1, nTotal - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - v / maxV) * (H - 2 * P)

  const realPath = real.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  // La predicción arranca justo donde acaba el real (índice nReal-1 .. nReal-1+nPred).
  const predPath = pred
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(nReal - 1 + i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  const nowX = x(Math.max(0, nReal - 1))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
      ))}
      {/* Marca "ahora" */}
      <line x1={nowX} x2={nowX} y1={P} y2={H - P} stroke="#D6D6DA" strokeWidth={1} strokeDasharray="3 3" />
      <text x={nowX} y={P + 9} textAnchor="middle" style={{ fontSize: 8, fill: '#86868b' }}>ahora</text>
      {/* Real (pasado, sólido) */}
      {realPath && <path d={realPath} fill="none" stroke={color} strokeWidth={2} />}
      {/* Prevista (futuro, punteado) */}
      {predPath && <path d={predPath} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 4" opacity={0.75} />}
    </svg>
  )
}

export default RenovablesForecast
