'use client'
/**
 * <NuclearLoadFactor /> · Energía v3 · Sprint E5 (Nuclear profundo)
 *
 * Factor de carga real de la FLOTA nuclear española:
 *
 *     load factor = generación nuclear media / potencia nuclear instalada
 *
 * - Generación nuclear: media 24 h del indicador nuclear de ESIOS, que ya
 *   consume la plataforma vía `/api/esios/mix` (`tech.gen_nuclear.avg_24h_mw`).
 *   Este componente recibe ese valor por prop (sin fetch propio, para no
 *   duplicar llamadas). También acepta el "ahora" para un segundo gauge.
 * - Potencia instalada nuclear: suma de `REACTORES_ES[].potencia_mw` operativos
 *   (`summarizeFleet`).
 *
 * Render: gauge semicircular SVG con el % + lectura numérica (gen media MW /
 * potencia GW) + banda de interpretación (la nuclear opera como base de carga,
 * ~85-92 % típico; por debajo suele indicar parada de recarga/mantenimiento).
 *
 * Degradación honesta: si no hay serie ESIOS (sin clave o sin dato), muestra
 * una nota clara en lugar del gauge. Cero emojis · Unicode geométrico (◉ ⟶).
 */
import { useMemo } from 'react'
import { REACTORES_ES } from '@/lib/energia/catalog'
import { summarizeFleet, fleetLoadFactor } from '@/lib/energia/nuclear-calc'

const NUCLEAR = '#7c3aed'
const NUCLEAR_DARK = '#4c1d95'
const TRACK = '#EDE9FE'

interface Props {
  /** Generación nuclear media 24 h (MW) · de ESIOS `tech.gen_nuclear.avg_24h_mw`. */
  genMedia24hMw: number | null | undefined
  /** Generación nuclear "ahora" (MW) · de ESIOS `tech.gen_nuclear.now_mw`. */
  genNowMw?: number | null
  /** True si ESIOS no tiene clave configurada (degradación específica). */
  noKey?: boolean
}

// Banda cualitativa del factor de carga nuclear (base de carga).
function bandaFactor(pct: number): { label: string; color: string } {
  if (pct >= 88) return { label: 'plena carga · base estable', color: '#16A34A' }
  if (pct >= 75) return { label: 'alta · operación normal', color: '#16A34A' }
  if (pct >= 55) return { label: 'reducida · posible recarga/parada parcial', color: '#F59E0B' }
  if (pct >= 25) return { label: 'baja · paradas relevantes en el parque', color: '#F97316' }
  return { label: 'muy baja · gran parte del parque parado', color: '#DC2626' }
}

// Geometría del arco semicircular (gauge 180°).
function arcPath(cx: number, cy: number, r: number, frac: number): string {
  // De 180° (izquierda) a 0° (derecha) recorriendo por arriba.
  const a0 = Math.PI // 180°
  const a1 = Math.PI - frac * Math.PI // hacia 0°
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0) * -1 // y hacia arriba
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1) * -1
  const large = frac > 0.5 ? 1 : 0
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

export default function NuclearLoadFactor({ genMedia24hMw, genNowMw, noKey }: Props) {
  const summary = useMemo(() => summarizeFleet(REACTORES_ES), [])
  const capMw = summary.potencia_operativa_mw
  const capGw = capMw / 1000

  const lf24 = fleetLoadFactor(genMedia24hMw, capMw)
  const lfNow = fleetLoadFactor(genNowMw, capMw)

  const has24 = lf24.factor_pct != null
  const W = 320
  const H = 188
  const cx = W / 2
  const cy = 150
  const r = 120

  if (!has24) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
        {noKey
          ? 'Factor de carga en vivo no disponible (ESIOS_API_KEY no configurada en Vercel). En cuanto haya clave se calculará como generación nuclear media 24 h (ESIOS) sobre la potencia instalada operativa del parque.'
          : 'Generación nuclear de ESIOS no disponible ahora; no se puede calcular el factor de carga de la flota. Se mostrará en cuanto el indicador devuelva serie.'}
        <div style={{ marginTop: 10, fontSize: 11, color: '#6e6e73' }}>
          Potencia instalada operativa de referencia:{' '}
          <strong style={{ color: NUCLEAR }}>{capGw.toLocaleString('es-ES', { maximumFractionDigits: 2 })} GW</strong> ·{' '}
          {summary.operativos} reactores (catálogo CSN).
        </div>
      </div>
    )
  }

  const pct = lf24.factor_pct as number
  const frac = Math.min(1, Math.max(0, pct / 100))
  const banda = bandaFactor(pct)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'center' }}>
      {/* Gauge */}
      <div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label={`Factor de carga nuclear ${pct}%`}>
          <defs>
            <linearGradient id="lfGauge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor={NUCLEAR_DARK} />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d={arcPath(cx, cy, r, 1)} fill="none" stroke={TRACK} strokeWidth={20} strokeLinecap="round" />
          {/* Valor */}
          <path d={arcPath(cx, cy, r, frac)} fill="none" stroke="url(#lfGauge)" strokeWidth={20} strokeLinecap="round" />
          {/* Marca de referencia "base de carga" ~90% */}
          {(() => {
            const refFrac = 0.9
            const a = Math.PI - refFrac * Math.PI
            const x1 = cx + (r + 12) * Math.cos(a)
            const y1 = cy - (r + 12) * Math.sin(a)
            const x2 = cx + (r - 12) * Math.cos(a)
            const y2 = cy - (r - 12) * Math.sin(a)
            return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#16A34A" strokeWidth={2} strokeDasharray="2 2" />
          })()}
          {/* Lectura central */}
          <text x={cx} y={cy - 30} textAnchor="middle" style={{ fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-display)', fill: NUCLEAR, letterSpacing: '-0.02em' }}>
            {pct.toFixed(0)}
            <tspan style={{ fontSize: 18, fill: '#86868b' }}>%</tspan>
          </text>
          <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 10.5, fill: '#6e6e73', fontWeight: 600 }}>
            factor de carga · flota
          </text>
          {/* Extremos del eje */}
          <text x={cx - r} y={cy + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#A0A0A5' }}>0%</text>
          <text x={cx + r} y={cy + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#A0A0A5' }}>100%</text>
        </svg>
        <div style={{ textAlign: 'center', marginTop: -2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: banda.color }}>{banda.label}</span>
        </div>
      </div>

      {/* Desglose numérico */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row
          label="Generación nuclear media 24 h"
          value={`${(genMedia24hMw as number).toLocaleString('es-ES')} MW`}
          source="ESIOS · indicador nuclear"
        />
        {lfNow.factor_pct != null && (
          <Row
            label="Generación nuclear ahora"
            value={`${(genNowMw as number).toLocaleString('es-ES')} MW · ${lfNow.factor_pct.toFixed(0)}% carga`}
            source="ESIOS · instantáneo"
          />
        )}
        <Row
          label="Potencia nuclear instalada"
          value={`${capGw.toLocaleString('es-ES', { maximumFractionDigits: 2 })} GW`}
          source={`${summary.operativos} reactores operativos · catálogo CSN`}
        />
        <div style={{ borderTop: '1px solid #F0F0F3', paddingTop: 9, marginTop: 1 }}>
          <p style={{ margin: 0, fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
            La nuclear opera como <strong>base de carga</strong>: factores de carga típicos del 85-92 % (marca verde
            de referencia ~90 %). Una caída sostenida suele señalar una parada de recarga de combustible o
            mantenimiento de algún reactor del parque. Cálculo en vivo: gen. media ESIOS / potencia instalada.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f' }}>{label}</div>
        <div style={{ fontSize: 9.5, color: '#A0A0A5' }}>{source}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: NUCLEAR, whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}
