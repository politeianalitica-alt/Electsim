"use client"
/**
 * Charts SVG livianos para las fichas dinámicas.
 *
 * Todos los componentes son SVG nativo, sin librería de gráficos (Recharts
 * está disponible pero estos charts son más compactos en bundle y se
 * comportan bien en SSR/ISR).
 *
 * Componentes exportados:
 *   PiramidePoblacional  — barras espejadas hombre/mujer por tramo edad
 *   LineaEvolucion       — serie temporal con eje X = año
 *   Hemiciclo            — semicírculo con escaños coloreados por partido
 *   RadarTemas           — radar 5-7 ejes (temas, etos/logos/pathos, etc.)
 *
 * Sin emojis. Estilo coherente con la UI principal (colores Politeia).
 */
import React from "react"

const PALETA_PARTIDOS: Record<string, string> = {
  PSOE: "#DC2626", PP: "#1F4E8C", VOX: "#16A34A",
  SUMAR: "#7C3AED", PODEMOS: "#5B21B6",
  ERC: "#EAB308", JUNTS: "#0EA5E9", PNV: "#0F766E",
  BILDU: "#16A34A", CIUDADANOS: "#F97316",
}

function colorPartido(nombre: string): string {
  const k = (nombre || "").toUpperCase().replace(/\s/g, "")
  return PALETA_PARTIDOS[k] || "#6e6e73"
}

// ────────────────────────────────────────────────────────────────
// PIRÁMIDE POBLACIONAL
// ────────────────────────────────────────────────────────────────

export function PiramidePoblacional({ tramos }: {
  tramos: Array<{ edad_min: number; edad_max: number; hombres: number; mujeres: number }>
}) {
  if (!tramos || tramos.length === 0) return null
  const maxVal = Math.max(...tramos.flatMap((t) => [t.hombres, t.mujeres]), 1)
  const ancho = 520
  const alto_tramo = 14
  const alto_total = tramos.length * alto_tramo + 30
  const cx = ancho / 2

  return (
    <svg viewBox={`0 0 ${ancho} ${alto_total}`} style={{ width: "100%", maxWidth: 600 }}>
      {/* eje central */}
      <line x1={cx} y1={0} x2={cx} y2={alto_total - 10}
            stroke="#ECECEF" strokeWidth={1} />
      {/* tramos ordenados de mayor edad arriba */}
      {[...tramos].reverse().map((t, i) => {
        const y = i * alto_tramo + 4
        const ancho_h = (t.hombres / maxVal) * (cx - 35)
        const ancho_m = (t.mujeres / maxVal) * (cx - 35)
        return (
          <g key={i}>
            {/* Hombres (izquierda) */}
            <rect x={cx - ancho_h} y={y} width={ancho_h} height={alto_tramo - 2}
                  fill="#1F4E8C" opacity={0.85} />
            {/* Mujeres (derecha) */}
            <rect x={cx} y={y} width={ancho_m} height={alto_tramo - 2}
                  fill="#DC2626" opacity={0.85} />
            {/* Etiqueta edad central */}
            <text x={cx} y={y + alto_tramo - 4} textAnchor="middle"
                  fontSize={9} fill="#3a3a3d" fontWeight={600}>
              {t.edad_min}–{t.edad_max < 120 ? t.edad_max : "+"}
            </text>
            {/* Cifras laterales */}
            {t.hombres > 0 && (
              <text x={cx - ancho_h - 4} y={y + alto_tramo - 4} textAnchor="end"
                    fontSize={9} fill="#6e6e73">{t.hombres.toLocaleString("es-ES")}</text>
            )}
            {t.mujeres > 0 && (
              <text x={cx + ancho_m + 4} y={y + alto_tramo - 4}
                    fontSize={9} fill="#6e6e73">{t.mujeres.toLocaleString("es-ES")}</text>
            )}
          </g>
        )
      })}
      {/* Leyenda */}
      <text x={ancho / 4} y={alto_total - 2} textAnchor="middle"
            fontSize={10} fill="#1F4E8C" fontWeight={700}>Hombres</text>
      <text x={3 * ancho / 4} y={alto_total - 2} textAnchor="middle"
            fontSize={10} fill="#DC2626" fontWeight={700}>Mujeres</text>
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────
// LÍNEA DE EVOLUCIÓN TEMPORAL
// ────────────────────────────────────────────────────────────────

export function LineaEvolucion({
  serie, label = "valor", color = "#1F4E8C",
}: {
  serie: Array<{ anio?: number | string; valor?: number | string }>
  label?: string
  color?: string
}) {
  const data = (serie || [])
    .map((p) => ({ anio: Number(p.anio), valor: Number(p.valor) }))
    .filter((p) => Number.isFinite(p.anio) && Number.isFinite(p.valor))
    .sort((a, b) => a.anio - b.anio)
  if (data.length < 2) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>
      Insuficientes datos para gráfico.
    </div>
  }
  const ancho = 600
  const alto = 200
  const padX = 40
  const padY = 24
  const xs = data.map((d) => d.anio)
  const ys = data.map((d) => d.valor)
  const xmin = Math.min(...xs), xmax = Math.max(...xs)
  const ymin = Math.min(...ys), ymax = Math.max(...ys)
  const sx = (x: number) => padX + (x - xmin) * (ancho - 2 * padX) / Math.max(1, xmax - xmin)
  const sy = (y: number) => alto - padY - (y - ymin) * (alto - 2 * padY) / Math.max(1, ymax - ymin)

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.anio)},${sy(d.valor)}`).join(" ")
  const area = `${path} L${sx(data[data.length - 1].anio)},${alto - padY} L${sx(data[0].anio)},${alto - padY} Z`

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", maxWidth: 800 }}>
      {/* Ejes */}
      <line x1={padX} y1={alto - padY} x2={ancho - padX} y2={alto - padY}
            stroke="#ECECEF" />
      <line x1={padX} y1={padY} x2={padX} y2={alto - padY}
            stroke="#ECECEF" />
      {/* Área */}
      <path d={area} fill={color} opacity={0.12} />
      {/* Línea */}
      <path d={path} stroke={color} strokeWidth={2} fill="none" />
      {/* Puntos */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.anio)} cy={sy(d.valor)} r={2.5} fill={color} />
      ))}
      {/* Labels eje X (extremos) */}
      <text x={padX} y={alto - 6} fontSize={10} fill="#6e6e73">{xmin}</text>
      <text x={ancho - padX} y={alto - 6} fontSize={10} fill="#6e6e73"
            textAnchor="end">{xmax}</text>
      {/* Labels eje Y (extremos) */}
      <text x={padX - 4} y={padY + 4} fontSize={10} fill="#6e6e73"
            textAnchor="end">{fmt(ymax)}</text>
      <text x={padX - 4} y={alto - padY} fontSize={10} fill="#6e6e73"
            textAnchor="end">{fmt(ymin)}</text>
      {/* Label superior */}
      <text x={ancho / 2} y={padY - 8} fontSize={11} fill="#1d1d1f"
            textAnchor="middle" fontWeight={700}>{label}</text>
    </svg>
  )

  function fmt(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M"
    if (v >= 1_000) return (v / 1_000).toFixed(0) + "k"
    return v.toLocaleString("es-ES")
  }
}

// ────────────────────────────────────────────────────────────────
// HEMICICLO PARLAMENTARIO
// ────────────────────────────────────────────────────────────────

export function Hemiciclo({ composicion }: {
  composicion: Array<{ partido: string; escanos: number; color?: string }>
}) {
  const total = (composicion || []).reduce((s, p) => s + (p.escanos || 0), 0)
  if (total === 0) return null
  const ancho = 600
  const alto = 280
  const cx = ancho / 2
  const cy = alto - 30
  const r_ext = 240
  const r_int = 80
  // Calcular escaños como puntos
  const filas = 6
  const cap_por_fila = Math.ceil(total / filas)
  const arc_total = Math.PI  // 180°
  let escanos_render: { cx: number; cy: number; color: string; partido: string }[] = []
  // Distribuir por partido en orden
  const partidos_color = composicion.map((p) => ({
    ...p,
    color: p.color || colorPartido(p.partido),
  }))
  let consumed = 0
  for (let fila = 0; fila < filas; fila++) {
    const r = r_int + ((r_ext - r_int) * (fila + 0.5)) / filas
    const n_fila = Math.min(cap_por_fila, total - consumed)
    if (n_fila <= 0) break
    for (let i = 0; i < n_fila; i++) {
      const ang = Math.PI - (arc_total * (i + 0.5)) / n_fila
      // Asignar color por partido según consumed/total
      let acum = 0
      let color = "#6e6e73", partido = ""
      for (const p of partidos_color) {
        acum += p.escanos
        if (consumed + i < acum) {
          color = p.color
          partido = p.partido
          break
        }
      }
      escanos_render.push({
        cx: cx + r * Math.cos(ang),
        cy: cy - r * Math.sin(ang),
        color, partido,
      })
    }
    consumed += n_fila
  }

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", maxWidth: 700 }}>
        {escanos_render.map((e, i) => (
          <circle key={i} cx={e.cx} cy={e.cy} r={5} fill={e.color}
                  stroke="#fff" strokeWidth={0.5} />
        ))}
        {/* Línea base */}
        <line x1={cx - r_ext - 10} y1={cy + 2} x2={cx + r_ext + 10} y2={cy + 2}
              stroke="#ECECEF" strokeWidth={1.5} />
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
                    marginTop: 8 }}>
        {partidos_color.map((p, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: 5, background: p.color,
            }} />
            {p.partido} ({p.escanos})
          </span>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// RADAR DE TEMAS / EJES
// ────────────────────────────────────────────────────────────────

export function RadarTemas({ ejes }: {
  ejes: Array<{ nombre: string; valor: number }>  // valor en 0..1 o 0..100
}) {
  const data = (ejes || []).map((e) => ({
    nombre: e.nombre,
    valor: e.valor > 1 ? e.valor / 100 : e.valor,
  })).slice(0, 8)
  if (data.length < 3) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>
      Insuficientes ejes para radar (mínimo 3).
    </div>
  }
  const ancho = 320
  const alto = 320
  const cx = ancho / 2
  const cy = alto / 2
  const r_max = 120
  const n = data.length
  const ang = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n

  // Polígono valores
  const poly_pts = data.map((d, i) => {
    const r = r_max * Math.max(0, Math.min(1, d.valor))
    return `${cx + r * Math.cos(ang(i))},${cy + r * Math.sin(ang(i))}`
  }).join(" ")

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", maxWidth: 360 }}>
      {/* Ejes y círculos guía */}
      {[0.25, 0.5, 0.75, 1.0].map((f, k) => (
        <circle key={k} cx={cx} cy={cy} r={r_max * f}
                fill="none" stroke="#ECECEF" strokeWidth={1} />
      ))}
      {data.map((d, i) => (
        <line key={i} x1={cx} y1={cy}
              x2={cx + r_max * Math.cos(ang(i))} y2={cy + r_max * Math.sin(ang(i))}
              stroke="#ECECEF" strokeWidth={1} />
      ))}
      {/* Polígono */}
      <polygon points={poly_pts}
               fill="#5B21B6" fillOpacity={0.2}
               stroke="#5B21B6" strokeWidth={2} />
      {/* Vértices */}
      {data.map((d, i) => {
        const r = r_max * Math.max(0, Math.min(1, d.valor))
        return <circle key={i} cx={cx + r * Math.cos(ang(i))} cy={cy + r * Math.sin(ang(i))}
                       r={3} fill="#5B21B6" />
      })}
      {/* Etiquetas */}
      {data.map((d, i) => {
        const r = r_max + 16
        const x = cx + r * Math.cos(ang(i))
        const y = cy + r * Math.sin(ang(i))
        const anchor = x > cx + 5 ? "start" : x < cx - 5 ? "end" : "middle"
        return (
          <text key={i} x={x} y={y} fontSize={10} fill="#3a3a3d"
                textAnchor={anchor} dominantBaseline="middle" fontWeight={600}>
            {d.nombre}
          </text>
        )
      })}
    </svg>
  )
}
