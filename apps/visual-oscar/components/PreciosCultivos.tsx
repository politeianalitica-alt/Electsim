'use client'
/**
 * PreciosCultivos · explorador interactivo de precios de cultivos
 * españoles desglosados por LONJA.
 *
 * UI:
 *   1. Selector de cultivo (12 grupos: cereales, aceite, vino, almendra,
 *      cítricos, hortalizas, patata, legumbres, frutos secos, porcino,
 *      vacuno, ovino) · pills horizontales scrollables.
 *   2. Selector de variedad (depende del cultivo · ej. cereales →
 *      trigo blando/trigo duro/cebada/maíz/avena).
 *   3. Selector de lonja (depende del cultivo · ej. cereales →
 *      Salamanca/León/Córdoba/Ebro/Albacete) · solo aparece si hay
 *      más de 1 lonja para ese cultivo.
 *   4. Gráfica de evolución 12 meses con marcadores de variación.
 *   5. KPIs · último precio, var mensual, var anual, máximo, mínimo.
 */
import { useEffect, useMemo, useState } from 'react'

interface Variedad { id: string; label: string; unidad: string }
interface Lonja { id: string; label: string; ubicacion: string; diferencial?: number }
interface Cultivo {
  id: string
  label: string
  icon: string
  unidad: string
  descripcion: string
  variedades: Variedad[]
  lonjas: Lonja[]
  series: Record<string, Record<string, Array<{ t: string; v: number }>>>  // variedad → lonja → puntos
}
interface DataResp {
  cultivos: Cultivo[]
  n_cultivos: number
  n_series_total: number
  fuente: string
  fuente_note: string
}

const CULTIVO_COLORS: Record<string, string> = {
  cereales:     '#D4A24F',
  aceite_oliva: '#5C8A3A',
  vino:         '#7C2D12',
  almendra:     '#A78BFA',
  citricos:     '#F97316',
  hortalizas:   '#16A34A',
  patata:       '#92400E',
  legumbres:    '#0F766E',
  frutos_secos: '#854D0E',
  porcino:      '#FBA8B8',
  vacuno:       '#991B1B',
  ovino:        '#94A3B8',
}

export default function PreciosCultivos() {
  const [data, setData] = useState<DataResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [cultivoId, setCultivoId] = useState<string>('cereales')
  const [variedadId, setVariedadId] = useState<string>('')
  const [lonjaId, setLonjaId] = useState<string>('')

  useEffect(() => {
    fetch('/api/sectores/agro/precios-cultivos')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cultivo = useMemo(() => data?.cultivos.find(c => c.id === cultivoId), [data, cultivoId])

  // Reset variedad/lonja al cambiar cultivo
  useEffect(() => {
    if (!cultivo) return
    if (!cultivo.variedades.find(v => v.id === variedadId)) {
      setVariedadId(cultivo.variedades[0]?.id || '')
    }
    if (!cultivo.lonjas.find(l => l.id === lonjaId)) {
      setLonjaId(cultivo.lonjas[0]?.id || '')
    }
  }, [cultivo, variedadId, lonjaId])

  const variedad = useMemo(
    () => cultivo?.variedades.find(v => v.id === variedadId),
    [cultivo, variedadId],
  )
  const lonja = useMemo(
    () => cultivo?.lonjas.find(l => l.id === lonjaId),
    [cultivo, lonjaId],
  )

  const serie = useMemo(() => {
    if (!cultivo || !variedadId || !lonjaId) return []
    return cultivo.series[variedadId]?.[lonjaId] || []
  }, [cultivo, variedadId, lonjaId])

  if (loading) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#86868b', fontSize: 12 }}>Cargando precios…</div>
  }
  if (!data || !cultivo) return null

  const accent = CULTIVO_COLORS[cultivoId] || '#16A34A'
  const muestraLonjas = cultivo.lonjas.length > 1

  // KPIs derivados de la serie
  const kpis = (() => {
    if (serie.length < 2) return null
    const ult = serie[serie.length - 1].v
    const prev = serie[serie.length - 2].v
    const inicio = serie[0].v
    const max = Math.max(...serie.map(p => p.v))
    const min = Math.min(...serie.map(p => p.v))
    const varMes = ((ult - prev) / prev) * 100
    const varAnual = ((ult - inicio) / inicio) * 100
    return { ult, varMes, varAnual, max, min }
  })()

  return (
    <div>
      {/* Selector de CULTIVO */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Cultivo / Producto
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.cultivos.map(c => {
            const isActive = c.id === cultivoId
            const color = CULTIVO_COLORS[c.id] || '#6e6e73'
            return (
              <button key={c.id}
                onClick={() => setCultivoId(c.id)}
                title={c.descripcion}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 999,
                  background: isActive ? color : '#FAFAFA',
                  color: isActive ? '#fff' : '#3a3a3d',
                  border: `1px solid ${isActive ? color : '#ECECEF'}`,
                  fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.005em',
                  transition: 'background 120ms, border-color 120ms',
                }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: isActive ? 'rgba(255,255,255,0.2)' : `${color}14`,
                  color: isActive ? '#fff' : color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>{c.icon}</span>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Descripción del cultivo activo */}
      <div style={{
        padding: '8px 12px', background: `${accent}10`,
        borderLeft: `3px solid ${accent}`, borderRadius: 6, marginBottom: 14,
        fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4,
      }}>
        {cultivo.descripcion}
      </div>

      {/* Selectores de VARIEDAD + LONJA · grid 2 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: muestraLonjas ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
        {/* Variedad */}
        <div>
          <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Variedad · {cultivo.variedades.length} disponibles
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {cultivo.variedades.map(v => {
              const isActive = v.id === variedadId
              return (
                <button key={v.id}
                  onClick={() => setVariedadId(v.id)}
                  style={{
                    padding: '5px 11px', borderRadius: 999,
                    background: isActive ? '#1d1d1f' : '#FAFAFA',
                    color: isActive ? '#fff' : '#3a3a3d',
                    border: `1px solid ${isActive ? '#1d1d1f' : '#ECECEF'}`,
                    fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>{v.label}</button>
              )
            })}
          </div>
        </div>

        {/* Lonja (solo si hay >1) */}
        {muestraLonjas && (
          <div>
            <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Lonja · {cultivo.lonjas.length} disponibles
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {cultivo.lonjas.map(l => {
                const isActive = l.id === lonjaId
                return (
                  <button key={l.id}
                    onClick={() => setLonjaId(l.id)}
                    title={l.ubicacion}
                    style={{
                      padding: '5px 11px', borderRadius: 999,
                      background: isActive ? accent : '#FAFAFA',
                      color: isActive ? '#fff' : '#3a3a3d',
                      border: `1px solid ${isActive ? accent : '#ECECEF'}`,
                      fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>{l.label}</button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPIs strip */}
      {kpis && variedad && lonja && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
          <KpiCard label="Precio último" value={fmtPrecio(kpis.ult, variedad.unidad)} unit={variedad.unidad} accent={accent}/>
          <KpiCard label="Var. mensual" value={`${kpis.varMes >= 0 ? '+' : ''}${kpis.varMes.toFixed(1)}`} unit="%"
            accent={kpis.varMes >= 0 ? '#16A34A' : '#DC2626'}/>
          <KpiCard label="Var. anual" value={`${kpis.varAnual >= 0 ? '+' : ''}${kpis.varAnual.toFixed(1)}`} unit="%"
            accent={kpis.varAnual >= 0 ? '#16A34A' : '#DC2626'}/>
          <KpiCard label="Máximo 12m" value={fmtPrecio(kpis.max, variedad.unidad)} unit={variedad.unidad} accent="#86868b"/>
          <KpiCard label="Mínimo 12m" value={fmtPrecio(kpis.min, variedad.unidad)} unit={variedad.unidad} accent="#86868b"/>
        </div>
      )}

      {/* Gráfica */}
      {serie.length > 0 && variedad && lonja && (
        <PrecioChart serie={serie} accent={accent} unidad={variedad.unidad}
          variedadLabel={variedad.label} lonjaLabel={lonja.label}/>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────
function fmtPrecio(v: number, unidad: string): string {
  const decimals = unidad.includes('Tm') || unidad.includes('Hl') ? 0 : unidad.includes('lechón') ? 1 : 2
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function KpiCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
      padding: '10px 12px', borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.018em', color: accent, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  )
}

function PrecioChart({ serie, accent, unidad, variedadLabel, lonjaLabel }: {
  serie: Array<{ t: string; v: number }>
  accent: string
  unidad: string
  variedadLabel: string
  lonjaLabel: string
}) {
  const W = 800, H = 280, P = 50
  const maxRaw = Math.max(...serie.map(p => p.v))
  const minRaw = Math.min(...serie.map(p => p.v))
  const span = maxRaw - minRaw || 1
  const max = maxRaw + span * 0.1
  const min = Math.max(0, minRaw - span * 0.1)
  const range = max - min || 1
  const step = (W - 2 * P) / (serie.length - 1 || 1)
  const xy = (i: number, v: number): [number, number] =>
    [P + i * step, P + (1 - (v - min) / range) * (H - 2 * P)]

  const pathD = serie.map((p, i) => {
    const [x, y] = xy(i, p.v)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  const lastXY = xy(serie.length - 1, serie[serie.length - 1].v)
  const fillD = `${pathD} L ${lastXY[0]} ${H - P} L ${P} ${H - P} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => min + t * range)

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
          {variedadLabel} · {lonjaLabel}
        </h3>
        <span style={{ fontSize: 10.5, color: '#86868b' }}>
          Serie mensual · {serie.length} observaciones · {unidad}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${accent}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.25}/>
            <stop offset="100%" stopColor={accent} stopOpacity={0}/>
          </linearGradient>
        </defs>
        {/* Y grid */}
        {yTicks.map((t, i) => {
          const y = P + (1 - (t - min) / range) * (H - 2 * P)
          return (
            <g key={i}>
              <line x1={P} y1={y} x2={W - P} y2={y} stroke="#ECECEF" strokeDasharray={i === 0 ? '' : '2 4'}/>
              <text x={P - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#86868b">
                {t.toLocaleString('es-ES', { maximumFractionDigits: unidad.includes('Tm') || unidad.includes('Hl') ? 0 : 2 })}
              </text>
            </g>
          )
        })}
        {/* Área + línea */}
        <path d={fillD} fill={`url(#grad-${accent})`}/>
        <path d={pathD} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round"/>
        {/* Dots con tooltip */}
        {serie.map((p, i) => {
          const [x, y] = xy(i, p.v)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3.5} fill={accent} stroke="#fff" strokeWidth={1.5}/>
              <title>{p.t} · {fmtPrecio(p.v, unidad)} {unidad}</title>
            </g>
          )
        })}
        {/* X labels (cada 2 meses) */}
        {serie.filter((_, i) => i % 2 === 0).map(p => {
          const i = serie.findIndex(s => s.t === p.t)
          const [x] = xy(i, p.v)
          return (
            <text key={p.t} x={x} y={H - P + 18} textAnchor="middle" fontSize={10} fill="#86868b">
              {fmtMes(p.t)}
            </text>
          )
        })}
        {/* Última etiqueta destacada */}
        <text x={lastXY[0]} y={lastXY[1] - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={accent}>
          {fmtPrecio(serie[serie.length - 1].v, unidad)}
        </text>
      </svg>
    </div>
  )
}

function fmtMes(t: string): string {
  // t = '2026-05'
  const [y, m] = t.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m, 10) - 1]} ${y.slice(2)}`
}
