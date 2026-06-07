'use client'
/**
 * <DestinosCcaaMap /> · Turismo v3 · Sprint T6 (Destinos y territorio)
 *
 * Choropleth de las CCAA por intensidad turística, REUTILIZANDO el mapa
 * hexagonal compartido `components/macro/charts/CCAAHexmap` (CLAUDE.md §0.6:
 * fuente única; aquí se CONSUME, no se duplica ni se toca). El hexmap colorea
 * cada comunidad por `value`; el tooltip nativo (`<title>`) muestra CCAA +
 * pernoctaciones + YoY, así que se pasa un `tooltipLabel` ya compuesto y un
 * `formatValue` propio.
 *
 * Puente de identificadores: el hexmap indexa por el `id` de `CCAA_CATALOG`
 * (slugs: cataluna, madrid, pais-vasco…), pero las filas de `/api/turismo/ccaa`
 * vienen por código NUTS2 (ES51, ES30…). Mapeamos NUTS2 → id con
 * `getCCAAByNuts2`. Robusto a que el dataset degrade alguna región.
 *
 * Dos métricas conmutables (sin segundo fetch):
 *   - "Pernoctaciones"  → volumen absoluto por CCAA (cuota nacional).
 *   - "Presión / cápita" → pernoctaciones por habitante (población del catálogo,
 *     constante demográfica) → señal honesta de saturación territorial.
 *
 * Degradación honesta: regiones sin dato salen en gris (emptyColor del hexmap),
 * nunca se inventan. Cero emojis · Unicode geométrico.
 */
import { useMemo } from 'react'
import { CCAAHexmap, type CCAADatum } from '@/components/macro/charts/CCAAHexmap'
import { getCCAAByNuts2 } from '@/lib/macro/ccaa-catalog'
import type { CcaaRow, TurismoMetric } from './DestinosTerritorioView'

const ACCENT = '#0EA5E9'

interface Props {
  rows: CcaaRow[]
  /** Métrica activa que pinta el color del mapa. */
  metric: TurismoMetric
  onMetricChange: (m: TurismoMetric) => void
  /** Habitantes por NUTS2 (del catálogo) para la métrica per-cápita. */
  poblacionByNuts2: Record<string, number>
  year: number | null
  loading?: boolean
}

const METRIC_LABEL: Record<TurismoMetric, string> = {
  pernoctaciones: 'Pernoctaciones',
  per_capita: 'Presión / cápita',
}

function fmtMillones(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k`
  return v.toLocaleString('es-ES')
}

export function DestinosCcaaMap({
  rows,
  metric,
  onMetricChange,
  poblacionByNuts2,
  year,
  loading = false,
}: Props) {
  // Construye el dataset que entiende el hexmap (id de catálogo + value).
  const { data, unmapped } = useMemo(() => {
    const out: CCAADatum[] = []
    let unmappedCount = 0
    for (const r of rows) {
      const cat = getCCAAByNuts2(r.nuts2)
      if (!cat) {
        unmappedCount += 1
        continue
      }
      const pernoct = r.pernoctaciones
      let value: number | null = null
      if (pernoct != null) {
        if (metric === 'per_capita') {
          const pob = poblacionByNuts2[r.nuts2]
          value = pob && pob > 0 ? pernoct / pob : null
        } else {
          value = pernoct
        }
      }

      // Tooltip compuesto: nombre + pernoctaciones + YoY (independiente de la métrica).
      const yoyTxt = r.yoy_pct != null ? `${r.yoy_pct >= 0 ? '+' : ''}${r.yoy_pct.toFixed(1)}% YoY` : 'YoY n/d'
      const pernoctTxt = pernoct != null ? `${fmtMillones(pernoct)} pernoct.` : 'sin dato'
      const tooltipLabel = `${r.ccaa} · ${pernoctTxt} · ${yoyTxt}`

      out.push({ id: cat.id, value, tooltipLabel })
    }
    return { data: out, unmapped: unmappedCount }
  }, [rows, metric, poblacionByNuts2])

  // Formato del número impreso dentro de cada hexágono según la métrica.
  const formatValue = useMemo(() => {
    if (metric === 'per_capita') {
      return (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 })
    }
    return (v: number) => fmtMillones(v)
  }, [metric])

  const unit = metric === 'per_capita' ? ' /hab' : ''

  if (loading) {
    return <div style={{ height: 360, background: '#F0F9FF', border: '1px solid #E0F2FE', borderRadius: 8 }} />
  }

  return (
    <div>
      {/* Conmutador de métrica */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pernoctaciones', 'per_capita'] as TurismoMetric[]).map((m) => {
          const active = m === metric
          return (
            <button
              key={m}
              type="button"
              onClick={() => onMetricChange(m)}
              aria-pressed={active}
              style={{
                border: `1px solid ${active ? ACCENT : '#E2E8F0'}`,
                background: active ? ACCENT : '#fff',
                color: active ? '#fff' : '#475569',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {METRIC_LABEL[m]}
            </button>
          )
        })}
        <span style={{ fontSize: 10.5, color: '#94A3B8', marginLeft: 'auto' }}>
          {metric === 'per_capita'
            ? 'Pernoctaciones por habitante (proxy de saturación)'
            : `Pernoctaciones totales${year ? ` · ${year}` : ''}`}
        </span>
      </div>

      <CCAAHexmap data={data} accent={ACCENT} unit={unit} formatValue={formatValue} height={360} />

      <p style={{ margin: '8px 2px 0', fontSize: 10, color: '#94A3B8', lineHeight: 1.5 }}>
        Mapa hexagonal esquemático (posición relativa de las 19 CCAA). Color por intensidad de la
        métrica seleccionada; tooltip con pernoctaciones y variación interanual.
        {unmapped > 0 ? ` ${unmapped} región(es) sin correspondencia en el catálogo no se pintan.` : ''}
      </p>
    </div>
  )
}

export default DestinosCcaaMap
