'use client'
/**
 * <NuclearGantt /> · Energía v3 · Sprint E5 (Nuclear profundo)
 *
 * Gantt / timeline SVG del cierre escalonado del parque nuclear español
 * (2027-2035). A partir de `REACTORES_ES[].cierre_previsto` (vía
 * `buildClosureSchedule`) dibuja una barra por reactor que va desde HOY hasta
 * su año de cierre pactado, agrupando las barras por central. Cada barra lleva
 * su potencia neta (MW) y un hito ◆ que marca el cese. Una línea vertical "hoy"
 * y una banda de ejes por año completan la lectura.
 *
 * Sustituye al timeline plano por-año anterior: ahora se ve, reactor a reactor,
 * cuántos años de vida útil restante quedan y cómo se solapan los cierres.
 *
 * Componente cliente puro (sin fetch): lee el catálogo curado y calcula con
 * helpers puros. Cita el protocolo Enresa/titulares 2019. Cero emojis · Unicode
 * geométrico (◆ ⬡ ⟶).
 */
import { useMemo } from 'react'
import { REACTORES_ES } from '@/lib/energia/catalog'
import { buildClosureSchedule } from '@/lib/energia/nuclear-calc'
import type { Reactor } from '@/lib/energia/types'

const NUCLEAR = '#7c3aed'
const NUCLEAR_SOFT = '#A78BFA'
const HITO = '#DC2626'

export default function NuclearGantt() {
  const data = useMemo(() => {
    const reactores = REACTORES_ES.filter((r) => Number.isFinite(r.cierre_previsto))
    if (reactores.length === 0) return null

    const schedule = buildClosureSchedule(REACTORES_ES)
    const totalMw = REACTORES_ES.reduce((s, r) => s + r.potencia_mw, 0)

    // Año "hoy" como inicio del eje; última fecha de cierre como fin.
    const hoyYear = new Date().getFullYear()
    const cierres = reactores.map((r) => r.cierre_previsto)
    const minClose = Math.min(...cierres)
    const maxClose = Math.max(...cierres)
    const axisStart = Math.min(hoyYear, minClose - 1)
    const axisEnd = maxClose

    // Agrupar reactores por central, ordenando centrales por su primer cierre.
    const byCentral = new Map<string, Reactor[]>()
    for (const r of reactores) {
      const arr = byCentral.get(r.central) ?? []
      arr.push(r)
      byCentral.set(r.central, arr)
    }
    const centrales = Array.from(byCentral.entries())
      .map(([central, rs]) => ({
        central,
        reactores: rs.slice().sort((a, b) => a.cierre_previsto - b.cierre_previsto),
        firstClose: Math.min(...rs.map((r) => r.cierre_previsto)),
        mw: rs.reduce((s, r) => s + r.potencia_mw, 0),
      }))
      .sort((a, b) => a.firstClose - b.firstClose)

    return { schedule, totalMw, hoyYear, axisStart, axisEnd, centrales }
  }, [])

  if (!data) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Sin datos de calendario de cierre.</div>
  }

  const { totalMw, hoyYear, axisStart, axisEnd, centrales, schedule } = data

  // ── Geometría SVG ──────────────────────────────────────────────────────────
  const W = 1080
  const LABEL_W = 150 // columna de etiquetas (reactor)
  const RIGHT = 18
  const ROW_H = 30
  const HEADER_H = 26 // banda de años arriba
  const GROUP_GAP = 8 // separación visual entre centrales

  const totalRows = centrales.reduce((s, c) => s + c.reactores.length, 0)
  const plotW = W - LABEL_W - RIGHT
  const span = Math.max(1, axisEnd - axisStart)
  const xForYear = (y: number) => LABEL_W + ((y - axisStart) / span) * plotW
  const H = HEADER_H + totalRows * ROW_H + centrales.length * GROUP_GAP + 14

  // Marcas de año (enteros).
  const yearTicks: number[] = []
  for (let y = axisStart; y <= axisEnd; y++) yearTicks.push(y)

  // Posiciones de fila acumuladas (respetando los gaps entre centrales).
  let cursorY = HEADER_H
  const rows: Array<{
    reactor: Reactor
    y: number
    isFirstOfCentral: boolean
    central: string
  }> = []
  for (const c of centrales) {
    cursorY += GROUP_GAP
    c.reactores.forEach((r, i) => {
      rows.push({ reactor: r, y: cursorY, isFirstOfCentral: i === 0, central: c.central })
      cursorY += ROW_H
    })
  }

  const xHoy = xForYear(hoyYear)

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label="Gantt de cierre del parque nuclear español">
        <defs>
          <linearGradient id="ganttBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={NUCLEAR_SOFT} stopOpacity={0.95} />
            <stop offset="100%" stopColor={NUCLEAR} stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="ganttBarBwr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.95} />
          </linearGradient>
        </defs>

        {/* Líneas verticales por año + etiquetas de año (cabecera) */}
        {yearTicks.map((y) => {
          const x = xForYear(y)
          return (
            <g key={y}>
              <line x1={x} x2={x} y1={HEADER_H - 6} y2={H - 8} stroke="#F0F0F3" strokeWidth={1} />
              <text x={x} y={14} textAnchor="middle" style={{ fontSize: 10, fill: '#86868b', fontWeight: 600 }}>
                {y}
              </text>
            </g>
          )
        })}

        {/* Línea "hoy" */}
        <line x1={xHoy} x2={xHoy} y1={HEADER_H - 6} y2={H - 8} stroke={HITO} strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={xHoy} y={HEADER_H - 10} textAnchor="middle" style={{ fontSize: 9, fill: HITO, fontWeight: 700 }}>
          hoy
        </text>

        {/* Filas: barra por reactor desde hoy → cierre */}
        {rows.map(({ reactor: r, y, isFirstOfCentral, central }) => {
          const x0 = xHoy
          const x1 = xForYear(r.cierre_previsto)
          const barW = Math.max(2, x1 - x0)
          const barY = y + 6
          const barH = ROW_H - 12
          const isBwr = /bwr/i.test(r.tecnologia)
          const yearsLeft = r.cierre_previsto - hoyYear
          // Grosor proporcional a potencia (sutil): barras más potentes algo más altas.
          return (
            <g key={r.nombre}>
              {/* Etiqueta de central (solo en la primera fila del grupo) */}
              {isFirstOfCentral && (
                <text x={8} y={y + ROW_H / 2 - 4} style={{ fontSize: 10.5, fill: '#1d1d1f', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {central}
                </text>
              )}
              {/* Nombre del reactor */}
              <text x={isFirstOfCentral ? 8 : 16} y={y + ROW_H / 2 + (isFirstOfCentral ? 9 : 4)} style={{ fontSize: 10, fill: '#6e6e73' }}>
                {r.nombre.replace(`${central} `, '').replace(central, '') || r.nombre}
              </text>

              {/* Carril de fondo (vida total hasta fin de eje) */}
              <rect x={LABEL_W} y={barY + barH / 2 - 1} width={W - LABEL_W - RIGHT} height={2} fill="#F5F5F7" rx={1} />

              {/* Barra de vida útil restante */}
              <rect x={x0} y={barY} width={barW} height={barH} rx={5} fill={isBwr ? 'url(#ganttBarBwr)' : 'url(#ganttBar)'}>
                <title>{`${r.nombre} · ${r.potencia_mw.toLocaleString('es-ES')} MW · ${r.tecnologia} · cierre ${r.cierre_previsto} (${yearsLeft} años restantes)`}</title>
              </rect>

              {/* Potencia dentro de la barra si cabe */}
              {barW > 64 && (
                <text x={x0 + 8} y={barY + barH / 2 + 3.5} style={{ fontSize: 9.5, fill: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {r.potencia_mw.toLocaleString('es-ES')} MW
                </text>
              )}

              {/* Hito de cierre ◆ */}
              <g transform={`translate(${x1}, ${barY + barH / 2})`}>
                <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill={HITO} stroke="#fff" strokeWidth={1.2}>
                  <title>{`Cese previsto ${r.cierre_previsto}`}</title>
                </path>
              </g>
              <text x={x1 + 11} y={barY + barH / 2 + 3.5} style={{ fontSize: 9.5, fill: HITO, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {r.cierre_previsto}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Leyenda + resumen por año */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginTop: 10 }}>
        <LegendDot color={NUCLEAR} label="Vida útil restante (PWR)" />
        <LegendDot color="#2563EB" label="Cofrentes (BWR)" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#6e6e73' }}>
          <svg width={12} height={12} viewBox="-7 -7 14 14"><path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill={HITO} /></svg>
          Hito de cierre pactado
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: HITO }}>
          <span style={{ width: 12, borderTop: `1.5px dashed ${HITO}`, display: 'inline-block' }} /> Hoy
        </span>
      </div>

      {/* Mini-resumen: potencia que sale por año */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {schedule.map((s) => (
          <div key={s.year} style={{ flex: '1 1 0', minWidth: 96, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>{s.year}</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: NUCLEAR }}>
              −{(s.potencia_mw / 1000).toFixed(2)} <span style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600 }}>GW</span>
            </div>
            <div style={{ fontSize: 9.5, color: '#86868b', lineHeight: 1.3, marginTop: 2 }}>
              {s.reactores.map((r) => r.nombre).join(' · ')}
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        Cada barra es la vida útil restante de un reactor hasta su cese pactado; el rombo ◆ marca el hito. Del año{' '}
        {hoyYear} al {axisEnd} salen del sistema los {(totalMw / 1000).toFixed(1)} GW nucleares actuales según el
        protocolo firmado en 2019 entre Enresa y las titulares (Iberdrola, Endesa, Naturgy, EDP). Almaraz I/II abren
        el calendario; Vandellós II y Trillo lo cierran. El debate sobre una posible revisión sigue abierto.
      </p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#6e6e73' }}>
      <span style={{ width: 14, height: 8, borderRadius: 4, background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}
