'use client'
/**
 * <GlobalEnergyStatus /> · Energía v3 · Sprint E9 (Visión Global)
 *
 * SEMÁFORO CROSS-ENERGÍA: estado sintético del sistema energético en una sola
 * tarjeta, con tres señales y UNA línea de lectura para el analista. No repite
 * detalle: agrega lo que ya hay en otras pestañas en un veredicto de cabecera.
 *
 *   1. Precios · spot eléctrico OMIE (ESIOS) clasificado por bandas MIBEL.
 *   2. Almacenamiento de gas · % lleno UE (GIE AGSI) clasificado por estacional.
 *   3. Riesgo de suministro · riesgo país ponderado (peor de crudo/gas), que la
 *      vista padre le pasa desde <GlobalSupplyRiskBoard> (sin re-fetch).
 *
 * El estado global = la peor de las tres señales con dato (semáforo conservador).
 * Degradación honesta: una señal sin dato no cuenta y se marca "—". El spot y el
 * almacenamiento se fetchean aquí (ligeros); el riesgo llega por prop. Cero
 * emojis · Unicode geométrico (● para el faro).
 */
import { useEffect, useState } from 'react'

type Estado = 'holgado' | 'normal' | 'tension' | 'critico' | 'pendiente'

const ESTADO_COLOR: Record<Estado, string> = {
  holgado: '#16A34A',
  normal: '#65A30D',
  tension: '#F97316',
  critico: '#DC2626',
  pendiente: '#C0C0C5',
}
const ESTADO_LABEL: Record<Estado, string> = {
  holgado: 'Holgado',
  normal: 'Normal',
  tension: 'Tensión',
  critico: 'Crítico',
  pendiente: 'Sin dato',
}
// Severidad para combinar (peor gana).
const SEVERITY: Record<Estado, number> = { pendiente: -1, holgado: 0, normal: 1, tension: 2, critico: 3 }

interface Senal {
  nombre: string
  estado: Estado
  detalle: string
}

interface Props {
  /** Riesgo país ponderado del crudo (0-100), de GlobalSupplyRiskBoard. */
  petroleoGeoRisk?: number | null
  /** Riesgo país ponderado del gas/GNL (0-100), de GlobalSupplyRiskBoard. */
  gasGeoRisk?: number | null
}

interface EsiosIndicator {
  latest: { value: number; datetime: string } | null
}
interface EsiosSnapshotResp {
  indicators: Record<string, EsiosIndicator>
}
interface GasStorageResp {
  ok: boolean
  data?: { full_pct: number | null; latest_date?: string | null } | null
}

// ── Clasificadores por señal ─────────────────────────────────────────────────
function estadoSpot(spot: number | null): Senal {
  if (spot == null || !Number.isFinite(spot)) {
    return { nombre: 'Precios eléctricos', estado: 'pendiente', detalle: 'Spot OMIE no disponible ahora' }
  }
  let estado: Estado = 'holgado'
  if (spot >= 180) estado = 'critico'
  else if (spot >= 100) estado = 'tension'
  else if (spot >= 60) estado = 'normal'
  return { nombre: 'Precios eléctricos', estado, detalle: `Spot OMIE ${spot.toFixed(0)} €/MWh` }
}

function estadoAlmacenamiento(full: number | null): Senal {
  if (full == null || !Number.isFinite(full)) {
    return { nombre: 'Almacenamiento gas UE', estado: 'pendiente', detalle: 'AGSI no disponible (sin GIE_API_KEY)' }
  }
  // Umbrales de seguridad de suministro (estacionales, conservadores).
  let estado: Estado = 'holgado'
  if (full < 30) estado = 'critico'
  else if (full < 50) estado = 'tension'
  else if (full < 70) estado = 'normal'
  return { nombre: 'Almacenamiento gas UE', estado, detalle: `${full.toFixed(0)}% lleno (GIE AGSI)` }
}

function estadoRiesgo(petroleo: number | null | undefined, gas: number | null | undefined): Senal {
  const vals = [petroleo, gas].filter((v): v is number => v != null && Number.isFinite(v))
  if (vals.length === 0) {
    return { nombre: 'Riesgo de suministro', estado: 'pendiente', detalle: 'Riesgo país no disponible ahora' }
  }
  const peor = Math.max(...vals)
  let estado: Estado = 'holgado'
  if (peor >= 65) estado = 'critico'
  else if (peor >= 45) estado = 'tension'
  else if (peor >= 35) estado = 'normal'
  return { nombre: 'Riesgo de suministro', estado, detalle: `Riesgo país ponderado ${Math.round(peor)}/100 (peor vector)` }
}

// ── Lectura sintética de 1 línea ─────────────────────────────────────────────
function lecturaGlobal(global: Estado, senales: Senal[]): string {
  if (global === 'pendiente') return 'Sin señales con dato suficiente para un veredicto. Reintenta más tarde.'
  const criticas = senales.filter((s) => s.estado === 'critico').map((s) => s.nombre.toLowerCase())
  const tensas = senales.filter((s) => s.estado === 'tension').map((s) => s.nombre.toLowerCase())
  if (global === 'critico') {
    return `Alerta: ${criticas.join(' y ')} en zona crítica. El sistema energético está bajo estrés; prioriza el seguimiento de estos vectores.`
  }
  if (global === 'tension') {
    const focos = [...criticas, ...tensas]
    return `Tensión en ${focos.join(' y ')}. Sin crisis, pero hay vectores que conviene vigilar de cerca.`
  }
  if (global === 'normal') {
    return 'Sistema en rango normal. Sin tensiones relevantes en precios, almacenamiento de gas ni riesgo de suministro.'
  }
  return 'Sistema holgado: precios contenidos, almacenamiento de gas cómodo y riesgo de suministro bajo.'
}

export default function GlobalEnergyStatus({ petroleoGeoRisk = null, gasGeoRisk = null }: Props) {
  const [spot, setSpot] = useState<number | null>(null)
  const [gasFull, setGasFull] = useState<number | null>(null)
  const [gasDate, setGasDate] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/esios/snapshot', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<EsiosSnapshotResp>) : null))
        .catch(() => null),
      fetch('/api/energia/gas-storage?country=eu&days=14', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<GasStorageResp>) : null))
        .catch(() => null),
    ]).then(([e, g]) => {
      if (!alive) return
      setSpot(e?.indicators?.mercado_spot?.latest?.value ?? null)
      setGasFull(g?.data?.full_pct ?? null)
      setGasDate(g?.data?.latest_date ?? null)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const senales: Senal[] = [
    estadoSpot(spot),
    estadoAlmacenamiento(gasFull),
    estadoRiesgo(petroleoGeoRisk, gasGeoRisk),
  ]
  const conDato = senales.filter((s) => s.estado !== 'pendiente')
  const global: Estado = conDato.length
    ? (conDato.reduce<Estado>((peor, s) => (SEVERITY[s.estado] > SEVERITY[peor] ? s.estado : peor), 'holgado'))
    : 'pendiente'
  const lectura = lecturaGlobal(global, senales)
  const color = ESTADO_COLOR[global]

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            aria-hidden="true"
            style={{
              fontSize: 22,
              color,
              lineHeight: 1,
              filter: `drop-shadow(0 0 6px ${color}88)`,
            }}
          >
            ●
          </span>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
              Estado del sistema energético
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
              Semáforo cross-energía · síntesis de precios, almacenamiento de gas y riesgo de suministro
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Estado global</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{ESTADO_LABEL[global]}</div>
        </div>
      </header>

      {/* Lectura de 1 línea para el analista */}
      <p style={{ margin: '12px 0 14px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.5, fontWeight: 500 }}>{lectura}</p>

      {/* Las 3 señales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {senales.map((s) => (
          <div
            key={s.nombre}
            style={{
              padding: '10px 12px',
              background: '#FAFAFA',
              border: '1px solid #ECECEF',
              borderRadius: 10,
              borderTop: `3px solid ${ESTADO_COLOR[s.estado]}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f' }}>{s.nombre}</span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: ESTADO_COLOR[s.estado],
                  whiteSpace: 'nowrap',
                }}
              >
                {ESTADO_LABEL[s.estado]}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 4, lineHeight: 1.4 }}>{s.detalle}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        El estado global es la peor de las tres señales con dato (criterio conservador). Spot OMIE · ESIOS;
        almacenamiento UE · GIE AGSI{gasDate ? ` (${gasDate})` : ''}; riesgo de suministro · cruce geopolítica
        estructural. Una señal sin dato no penaliza el veredicto y se marca "—".
        {!loaded && ' Cargando señales en vivo…'}
      </p>
    </section>
  )
}
