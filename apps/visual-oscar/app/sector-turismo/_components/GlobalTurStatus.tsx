'use client'
/**
 * <GlobalTurStatus /> · Turismo v3 · Sprint T3 (Visión Global)
 *
 * SEMÁFORO TURÍSTICO: estado sintético del sector en una sola tarjeta, con tres
 * señales y UNA línea de lectura para el analista. Mismo idioma de diseño que
 * <GlobalEnergyStatus /> (semáforo cross-energía). No repite detalle: agrega lo
 * que ya hay en las pestañas en un veredicto de cabecera.
 *
 *   1. Demanda · variación interanual de turistas internacionales (FRONTUR YoY).
 *      Crecimiento = bueno; caída fuerte = tensión.
 *   2. Presión / estacionalidad · ratio pico/valle de la demanda mensual. Cuanto
 *      más concentrada la temporada, mayor presión sobre destino e infraestructura.
 *   3. Comparativa UE · intensidad turística de España (% del PIB) frente a la
 *      media UE-27. Una dependencia muy por encima de la UE es a la vez fortaleza
 *      y vulnerabilidad (exposición a shocks de demanda).
 *
 * No hace fetch: la vista padre le pasa las tres magnitudes ya resueltas (un solo
 * Promise.all para toda la Visión Global). El "estado global" es la PEOR señal con
 * dato (criterio conservador, igual que en energía). Degradación honesta
 * (CLAUDE.md): una señal sin dato no penaliza y se marca "—". Cero emojis ·
 * Unicode geométrico (● faro).
 */

type Estado = 'favorable' | 'normal' | 'tension' | 'critico' | 'pendiente'

const ESTADO_COLOR: Record<Estado, string> = {
  favorable: '#16A34A',
  normal: '#65A30D',
  tension: '#F97316',
  critico: '#DC2626',
  pendiente: '#C0C0C5',
}
const ESTADO_LABEL: Record<Estado, string> = {
  favorable: 'Favorable',
  normal: 'Normal',
  tension: 'Tensión',
  critico: 'Crítico',
  pendiente: 'Sin dato',
}
const SEVERITY: Record<Estado, number> = { pendiente: -1, favorable: 0, normal: 1, tension: 2, critico: 3 }

interface Senal {
  nombre: string
  estado: Estado
  detalle: string
}

export interface GlobalTurStatusProps {
  /** Variación interanual de turistas internacionales (FRONTUR), en %. */
  demandaYoyPct?: number | null
  /** Periodo del último dato FRONTUR (p.ej. "2026-04"), para el detalle. */
  demandaPeriod?: string | null
  /** Ratio pico/valle de la demanda mensual (estacionalidad). */
  ratioPicoValle?: number | null
  /** Intensidad turística de España (% PIB · comparativa-ue). */
  pibTuristicoEs?: number | null
  /** Intensidad turística de la UE-27 (% PIB · comparativa-ue), referencia. */
  pibTuristicoUe?: number | null
  loading?: boolean
}

// ── Clasificadores por señal ─────────────────────────────────────────────────
function estadoDemanda(yoy: number | null | undefined, period: string | null | undefined): Senal {
  if (yoy == null || !Number.isFinite(yoy)) {
    return { nombre: 'Demanda (YoY)', estado: 'pendiente', detalle: 'Variación FRONTUR no disponible ahora' }
  }
  let estado: Estado = 'favorable'
  if (yoy < -8) estado = 'critico'
  else if (yoy < -2) estado = 'tension'
  else if (yoy < 2) estado = 'normal'
  const signo = yoy >= 0 ? '+' : ''
  return {
    nombre: 'Demanda (YoY)',
    estado,
    detalle: `Turistas ${signo}${yoy.toFixed(1)}% interanual${period ? ` (${period})` : ''}`,
  }
}

function estadoPresion(ratio: number | null | undefined): Senal {
  if (ratio == null || !Number.isFinite(ratio)) {
    return { nombre: 'Presión / estacionalidad', estado: 'pendiente', detalle: 'Ratio pico/valle no disponible' }
  }
  // Cuanto mayor el ratio pico/valle, más concentrada la temporada → más presión.
  let estado: Estado = 'favorable'
  if (ratio >= 3) estado = 'critico'
  else if (ratio >= 2.4) estado = 'tension'
  else if (ratio >= 1.8) estado = 'normal'
  return { nombre: 'Presión / estacionalidad', estado, detalle: `Pico/valle ${ratio.toFixed(2)}× de la demanda mensual` }
}

function estadoComparativa(es: number | null | undefined, ue: number | null | undefined): Senal {
  if (es == null || !Number.isFinite(es)) {
    return { nombre: 'Comparativa UE', estado: 'pendiente', detalle: 'Intensidad turística no disponible' }
  }
  // Sin referencia UE: solo informamos del nivel ES, sin penalizar.
  if (ue == null || !Number.isFinite(ue) || ue === 0) {
    return { nombre: 'Comparativa UE', estado: 'normal', detalle: `Turismo ${es.toFixed(1)}% del PIB (sin referencia UE)` }
  }
  const ratio = es / ue
  // Una dependencia muy por encima de la UE = mayor exposición a shocks.
  let estado: Estado = 'favorable'
  if (ratio >= 2.2) estado = 'tension'
  else if (ratio >= 1.5) estado = 'normal'
  return {
    nombre: 'Comparativa UE',
    estado,
    detalle: `${es.toFixed(1)}% del PIB vs ${ue.toFixed(1)}% UE-27 (${ratio.toFixed(1)}×)`,
  }
}

// ── Lectura sintética de 1 línea ─────────────────────────────────────────────
function lecturaGlobal(global: Estado, senales: Senal[]): string {
  if (global === 'pendiente') return 'Sin señales con dato suficiente para un veredicto. Reintenta más tarde.'
  const criticas = senales.filter((s) => s.estado === 'critico').map((s) => s.nombre.toLowerCase())
  const tensas = senales.filter((s) => s.estado === 'tension').map((s) => s.nombre.toLowerCase())
  if (global === 'critico') {
    return `Alerta: ${criticas.join(' y ')} en zona crítica. El sector está bajo estrés; prioriza el seguimiento de estos vectores.`
  }
  if (global === 'tension') {
    const focos = [...criticas, ...tensas]
    return `Tensión en ${focos.join(' y ')}. Sin crisis, pero hay vectores del sector que conviene vigilar de cerca.`
  }
  if (global === 'normal') {
    return 'Sector en rango normal. Demanda, presión estacional y peso relativo del turismo sin tensiones destacadas.'
  }
  return 'Sector favorable: demanda al alza, estacionalidad contenida y peso del turismo en línea con su patrón habitual.'
}

export function GlobalTurStatus({
  demandaYoyPct = null,
  demandaPeriod = null,
  ratioPicoValle = null,
  pibTuristicoEs = null,
  pibTuristicoUe = null,
  loading = false,
}: GlobalTurStatusProps) {
  const senales: Senal[] = [
    estadoDemanda(demandaYoyPct, demandaPeriod),
    estadoPresion(ratioPicoValle),
    estadoComparativa(pibTuristicoEs, pibTuristicoUe),
  ]
  const conDato = senales.filter((s) => s.estado !== 'pendiente')
  const global: Estado = conDato.length
    ? conDato.reduce<Estado>((peor, s) => (SEVERITY[s.estado] > SEVERITY[peor] ? s.estado : peor), 'favorable')
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
          <span aria-hidden="true" style={{ fontSize: 22, color, lineHeight: 1, filter: `drop-shadow(0 0 6px ${color}88)` }}>
            ●
          </span>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
              Estado del sector turístico
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
              Semáforo turístico · síntesis de demanda, presión estacional y comparativa UE
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Estado global</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>
            {loading ? '…' : ESTADO_LABEL[global]}
          </div>
        </div>
      </header>

      {/* Lectura de 1 línea para el analista */}
      <p style={{ margin: '12px 0 14px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.5, fontWeight: 500 }}>
        {loading ? 'Cargando señales en vivo…' : lectura}
      </p>

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
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: ESTADO_COLOR[s.estado], whiteSpace: 'nowrap' }}>
                {ESTADO_LABEL[s.estado]}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 4, lineHeight: 1.4 }}>{s.detalle}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        El estado global es la peor de las tres señales con dato (criterio conservador). Demanda · INE FRONTUR (YoY);
        presión · índice de estacionalidad INE FRONTUR/EOH; comparativa · Eurostat (% PIB turístico ES vs UE-27).
        Una señal sin dato no penaliza el veredicto y se marca "—".
      </p>
    </section>
  )
}

export default GlobalTurStatus
