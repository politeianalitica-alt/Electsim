'use client'
/**
 * <RenovablesComplementarity /> · Energía v3 · Sprint E4 (Renovables profundo)
 *
 * Complementariedad eólica-solar. Usa las series de generación de las últimas
 * 24 h que ya expone `GET /api/esios/mix` (`tech.gen_eolica.serie_24h` y
 * `tech.gen_solar_fv.serie_24h`) y calcula su correlación de Pearson sobre los
 * instantes coincidentes. La idea: si la correlación es negativa, cuando una
 * baja la otra sube (se complementan), lo que estabiliza el sistema renovable.
 *
 *   - Scatter eólica (x) vs solar FV (y), por hora.
 *   - Coeficiente de Pearson r + lectura cualitativa honesta.
 *   - Degradación: si no hay suficientes puntos (o no hay ESIOS_API_KEY),
 *     muestra una nota cualitativa sin inventar el coeficiente.
 *
 * El cálculo de Pearson es local y puro. Cero emojis · Unicode.
 */
import { useEffect, useMemo, useState } from 'react'

const COLOR_EOLICA = '#3b82f6'
const COLOR_SOLAR = '#f59e0b'

interface MixTech {
  slug: string
  short: string
  serie_24h?: Array<{ t: string; v: number }>
}
interface EsiosMixResp {
  ok: boolean
  error?: string
  tech?: Record<string, MixTech>
}

interface Pair { t: string; eolica: number; solar: number }

/** Pearson r de dos vectores alineados (mismo índice). null si <3 puntos o varianza nula. */
function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i] }
  const mx = sx / n, my = sy / n
  let cov = 0, vx = 0, vy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    cov += dx * dy; vx += dx * dx; vy += dy * dy
  }
  if (vx <= 0 || vy <= 0) return null
  const r = cov / Math.sqrt(vx * vy)
  if (!Number.isFinite(r)) return null
  return Math.round(r * 1000) / 1000
}

/** Lectura cualitativa honesta del coeficiente. */
function interpret(r: number): { label: string; detail: string; color: string } {
  if (r <= -0.3) return {
    label: 'Complementarias',
    detail: 'Correlación negativa: cuando la generación solar baja, la eólica tiende a subir (y al revés). Se compensan a lo largo del día, suavizando la curva renovable.',
    color: '#15803d',
  }
  if (r < 0.3) return {
    label: 'Poco correlacionadas',
    detail: 'Correlación débil: eólica y solar varían de forma relativamente independiente en la ventana observada. Aportan algo de diversificación.',
    color: '#6e6e73',
  }
  return {
    label: 'Correlacionadas',
    detail: 'Correlación positiva en esta ventana: ambas suben y bajan a la vez. Menos complementariedad de la deseable (sube el riesgo de huecos simultáneos).',
    color: '#92400e',
  }
}

export function RenovablesComplementarity() {
  const [mix, setMix] = useState<EsiosMixResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/mix', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EsiosMixResp>) : null))
      .then((j) => { if (alive) { setMix(j); setLoading(false) } })
      .catch(() => { if (alive) { setMix(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const noKey = mix?.ok === false && /no_key|ESIOS_API_KEY/i.test(mix?.error || '')

  // Alineamos por marca temporal coincidente.
  const pairs: Pair[] = useMemo(() => {
    const eo = mix?.tech?.gen_eolica?.serie_24h ?? []
    const so = mix?.tech?.gen_solar_fv?.serie_24h ?? []
    if (!eo.length || !so.length) return []
    const soMap = new Map(so.map((p) => [p.t, p.v]))
    const out: Pair[] = []
    for (const p of eo) {
      const sv = soMap.get(p.t)
      if (sv != null && Number.isFinite(p.v) && Number.isFinite(sv)) {
        out.push({ t: p.t, eolica: p.v, solar: sv })
      }
    }
    return out
  }, [mix])

  const r = useMemo(() => pearson(pairs.map((p) => p.eolica), pairs.map((p) => p.solar)), [pairs])
  const hasEnough = pairs.length >= 6 && r != null

  // Nota cualitativa (degradación) cuando no hay datos suficientes.
  if (!hasEnough) {
    return (
      <div style={{ fontSize: 12, color: '#3a3a3d', lineHeight: 1.6 }}>
        {loading ? (
          'Calculando complementariedad eólica-solar…'
        ) : (
          <>
            <p style={{ margin: '0 0 8px' }}>
              {noKey
                ? 'Series de generación en vivo no disponibles (ESIOS_API_KEY no configurada).'
                : 'No hay suficientes puntos horarios coincidentes de eólica y solar para calcular la correlación de forma fiable.'}
            </p>
            <p style={{ margin: 0, color: '#6e6e73' }}>
              <strong style={{ color: '#1d1d1f' }}>Complementariedad eólica-solar (cualitativa):</strong> en
              España la solar fotovoltaica genera en las horas centrales del día y la eólica suele reforzarse
              de tarde-noche y en episodios de borrascas (más frecuentes en invierno, cuando hay menos sol).
              Esta anticorrelación parcial estabiliza la curva renovable y reduce la necesidad de respaldo, pero
              no la elimina: existen periodos de calma anticiclónica con poco viento y poco sol simultáneos.
            </p>
          </>
        )}
      </div>
    )
  }

  const reading = interpret(r as number)

  // Scatter SVG.
  const W = 560, H = 300, P = 38
  const maxEo = Math.max(1, ...pairs.map((p) => p.eolica))
  const maxSo = Math.max(1, ...pairs.map((p) => p.solar))
  const x = (v: number) => P + (v / maxEo) * (W - P - 12)
  const y = (v: number) => H - P - (v / maxSo) * (H - P - 12)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, alignItems: 'start' }}>
      <div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {/* Ejes */}
          <line x1={P} x2={P} y1={12} y2={H - P} stroke="#D6D6DA" strokeWidth={1} />
          <line x1={P} x2={W - 12} y1={H - P} y2={H - P} stroke="#D6D6DA" strokeWidth={1} />
          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={`gx${g}`} x1={x(maxEo * g)} x2={x(maxEo * g)} y1={12} y2={H - P} stroke="#F5F5F7" strokeWidth={1} />
          ))}
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={`gy${g}`} x1={P} x2={W - 12} y1={y(maxSo * g)} y2={y(maxSo * g)} stroke="#F5F5F7" strokeWidth={1} />
          ))}
          {/* Puntos */}
          {pairs.map((p) => (
            <circle key={p.t} cx={x(p.eolica)} cy={y(p.solar)} r={4.5} fill={COLOR_SOLAR} fillOpacity={0.45} stroke={COLOR_EOLICA} strokeWidth={0.8}>
              <title>{p.t}: eólica {Math.round(p.eolica).toLocaleString('es-ES')} MW · solar {Math.round(p.solar).toLocaleString('es-ES')} MW</title>
            </circle>
          ))}
          {/* Etiquetas ejes */}
          <text x={(W + P) / 2} y={H - 6} textAnchor="middle" style={{ fontSize: 10, fill: COLOR_EOLICA, fontWeight: 700 }}>
            Eólica (MW) →
          </text>
          <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90, 12, ${H / 2})`} style={{ fontSize: 10, fill: '#D97706', fontWeight: 700 }}>
            Solar FV (MW) →
          </text>
        </svg>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 6 }}>
          Correlación de Pearson (24 h)
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', color: reading.color, lineHeight: 1 }}>
          r = {(r as number).toFixed(2)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: reading.color, margin: '6px 0 8px' }}>
          {reading.label}
        </div>
        <p style={{ fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.55, margin: 0 }}>
          {reading.detail}
        </p>
        <div style={{ marginTop: 10, fontSize: 9.5, color: '#86868b', lineHeight: 1.5 }}>
          Calculado sobre {pairs.length} horas coincidentes de generación eólica (id 551) y solar FV (id 1161),
          ESIOS · REE. r ∈ [−1, +1]; valores negativos indican complementariedad.
        </div>
      </div>
    </div>
  )
}

export default RenovablesComplementarity
