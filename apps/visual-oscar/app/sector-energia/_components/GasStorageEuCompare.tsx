'use client'
/**
 * <GasStorageEuCompare /> · Energía v3 · E7 (Gas profundo)
 *
 * Comparativa del % de llenado del almacenamiento de gas de España frente a la
 * UE agregada y a los principales países almacenadores (DE, FR, IT, NL). Pide
 * el endpoint AGSI existente `GET /api/energia/gas-storage?country=XX` una vez
 * por zona (en paralelo) y dibuja un gráfico de barras horizontales del % lleno
 * con:
 *   - una LÍNEA DE REFERENCIA del objetivo regulatorio (90% a 1-nov,
 *     Reglamento UE 2022/1032) sobre el gráfico;
 *   - el delta de cada país frente a ese objetivo;
 *   - el gas almacenado (TWh) y la fase (inyección/extracción) por zona.
 *
 * NO repite el panel AGSI ya presente en GasView (que muestra la serie temporal
 * de UE/ES y los KPIs de una sola zona): aquí el foco es el CORTE TRANSVERSAL
 * entre países en el día corriente vs el objetivo regulatorio.
 *
 * Degradación honesta: cada zona degrada por separado; si falta GIE_API_KEY
 * todas caen y se muestra el aviso de la key. Cero emojis · Unicode.
 */
import { useEffect, useMemo, useState } from 'react'
import type { GasStorage, GasStorageResponse } from '@/lib/energia/types'

const GAS = '#1D4ED8'
const GAS_DARK = '#1E3A8A'
const TARGET_PCT = 90 // Reg. UE 2022/1032 · 90% a 1-nov

// Zonas a comparar: ES destacada + UE agregado + grandes almacenadores.
const ZONES: Array<{ country: string; label: string; highlight?: boolean }> = [
  { country: 'es', label: 'España', highlight: true },
  { country: 'eu', label: 'Unión Europea' },
  { country: 'de', label: 'Alemania' },
  { country: 'fr', label: 'Francia' },
  { country: 'it', label: 'Italia' },
  { country: 'nl', label: 'Países Bajos' },
]

interface ZoneRow {
  country: string
  label: string
  highlight: boolean
  data: GasStorage | null
}

export function GasStorageEuCompare() {
  const [rows, setRows] = useState<ZoneRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const results = await Promise.all(
        ZONES.map((z) =>
          fetch(`/api/energia/gas-storage?country=${z.country}&days=14`, { cache: 'no-store' })
            .then((r) => (r.ok ? (r.json() as Promise<GasStorageResponse>) : null))
            .catch(() => null),
        ),
      )
      if (!alive) return
      const next: ZoneRow[] = ZONES.map((z, i) => {
        const resp = results[i]
        return {
          country: z.country,
          label: z.label,
          highlight: !!z.highlight,
          data: resp?.ok ? resp.data ?? null : null,
        }
      })
      setRows(next)
      const anyOk = next.some((r) => r.data)
      const firstErr = results.find((r) => r && !r.ok)?.error
      setErr(anyOk ? null : firstErr ?? 'sin datos')
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const withData = useMemo(() => (rows ?? []).filter((r) => r.data && r.data.full_pct != null), [rows])

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando comparativa de almacenamiento UE…</div>
  }
  if (withData.length === 0) {
    const keyMissing = /no_key|GIE_API_KEY|unauthorized|api key/i.test(err ?? '')
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
        <p style={{ margin: '0 0 8px' }}>
          Comparativa de almacenamiento no disponible ahora{err ? ` (${err.split('·')[0].trim()})` : ''}.
        </p>
        {keyMissing ? (
          <p style={{ margin: 0 }}>
            La API de <strong>GIE AGSI+</strong> requiere la clave gratuita{' '}
            <code style={codeStyle}>GIE_API_KEY</code> (
            <a href="https://agsi.gie.eu/account" target="_blank" rel="noreferrer" style={{ color: GAS, fontWeight: 600 }}>agsi.gie.eu/account</a>).
            El objetivo regulatorio de referencia es el 90% a 1 de noviembre (Reg. UE 2022/1032).
          </p>
        ) : (
          <p style={{ margin: 0 }}>La fuente (GIE AGSI+) no respondió. El dato es diario (gas-day) y se reintenta automáticamente.</p>
        )}
      </div>
    )
  }

  // Orden: España primero (destacada), luego por % lleno descendente.
  const ordered = [...withData].sort((a, b) => {
    if (a.highlight !== b.highlight) return a.highlight ? -1 : 1
    return (b.data!.full_pct ?? 0) - (a.data!.full_pct ?? 0)
  })

  const latestDate = ordered.find((r) => r.data?.latest_date)?.data?.latest_date ?? null

  return (
    <div>
      <CompareBars rows={ordered} />

      <p style={{ margin: '14px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        GIE AGSI+ · % de llenado por zona{latestDate ? ` · gas-day ${latestDate}` : ''}. La línea
        discontinua marca el <strong>objetivo regulatorio del 90% a 1 de noviembre</strong>{' '}
        (Reglamento UE 2022/1032, adoptado tras la crisis de 2022): cada Estado miembro debe alcanzar
        ese nivel de llenado antes del invierno. El delta indica los puntos porcentuales por encima
        (verde) o por debajo (rojo) del objetivo. El nivel real fluctúa con la estación: se inyecta en
        verano y se extrae en invierno.
      </p>
    </div>
  )
}

export default GasStorageEuCompare

// ─── Barras horizontales con línea de objetivo 90% ───────────────────────────
function CompareBars({ rows }: { rows: ZoneRow[] }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Línea de objetivo (90%) que cruza todas las barras */}
      <TargetLine />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
        {rows.map((r) => (
          <BarRow key={r.country} row={r} />
        ))}
      </ul>
    </div>
  )
}

// Geometría compartida: la zona de barra ocupa de LABEL_W a 100%-VALUE_W.
const LABEL_W = 116 // px reservados para la etiqueta
const VALUE_W = 92 // px reservados para el valor + delta a la derecha

function TargetLine() {
  // La línea 90% se posiciona dentro de la franja de barra (entre las columnas).
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `calc(${LABEL_W}px + (100% - ${LABEL_W + VALUE_W}px) * ${TARGET_PCT / 100})`,
        top: 0,
        bottom: 0,
        width: 0,
        borderLeft: '2px dashed #1d1d1f',
        opacity: 0.4,
        zIndex: 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -2,
          left: 4,
          fontSize: 8.5,
          fontWeight: 700,
          color: '#1d1d1f',
          opacity: 0.7,
          whiteSpace: 'nowrap',
        }}
      >
        objetivo UE 90%
      </span>
    </div>
  )
}

function BarRow({ row }: { row: ZoneRow }) {
  const d = row.data!
  const pct = d.full_pct ?? 0
  const delta = pct - TARGET_PCT
  const meets = delta >= 0
  const barColor = row.highlight ? GAS : meets ? '#16A34A' : pct >= 70 ? '#D97706' : '#DC2626'
  return (
    <li style={{ display: 'grid', gridTemplateColumns: `${LABEL_W}px 1fr ${VALUE_W}px`, alignItems: 'center', gap: 0 }}>
      {/* etiqueta */}
      <div style={{ paddingRight: 10 }}>
        <div style={{ fontSize: 12, fontWeight: row.highlight ? 800 : 600, color: row.highlight ? GAS_DARK : '#1d1d1f' }}>
          {row.label}
        </div>
        <div style={{ fontSize: 9, color: '#A0A0A5', display: 'flex', gap: 6 }}>
          {d.gas_in_storage_twh != null && <span>{d.gas_in_storage_twh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} TWh</span>}
          {d.fase && <span style={{ color: d.fase === 'extraccion' ? '#DC2626' : d.fase === 'inyeccion' ? '#16A34A' : '#A0A0A5' }}>{faseShort(d.fase)}</span>}
        </div>
      </div>
      {/* barra */}
      <div style={{ height: 20, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            height: '100%',
            background: barColor,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {/* valor + delta */}
      <div style={{ textAlign: 'right', paddingLeft: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
          {pct.toFixed(1)}%
        </span>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: meets ? '#16A34A' : '#DC2626' }}>
          {meets ? '⇡' : '⇣'} {Math.abs(delta).toFixed(1)} pp
        </div>
      </div>
    </li>
  )
}

function faseShort(fase: GasStorage['fase']): string {
  if (fase === 'inyeccion') return 'inyectando'
  if (fase === 'extraccion') return 'extrayendo'
  if (fase === 'equilibrio') return 'equilibrio'
  return ''
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: '#F1F5F9',
  padding: '1px 4px',
  borderRadius: 3,
}
