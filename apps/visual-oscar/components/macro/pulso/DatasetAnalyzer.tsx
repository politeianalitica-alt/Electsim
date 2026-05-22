'use client'
/**
 * `<DatasetAnalyzer dataset />` · Sprint L F4.
 *
 * Reemplaza el render "card-link-only" de `<DatosGobRadar>` cuando un dataset
 * tiene distribución CSV. Extrae la CSV via `/api/datos-gob/csv?url=...`,
 * infiere columnas (fecha + valor), muestra:
 *  - stats (filas, columnas, columna temporal, columna numérica)
 *  - mini bar chart inline con últimos 10-20 puntos
 *  - tabla 5 primeras filas (compacta, monospace)
 *  - link al dataset original
 *
 * Modo CONSERVADOR (confirmado con usuario):
 *  - Sólo intenta CSV (no Excel/PDF/ZIP). Frontend acepta dataset.csvUrl != null.
 *  - Cap byteSize 5MB (en runtime el endpoint /api/datos-gob/csv limita a 25MB
 *    pero aquí descartamos antes para evitar timeouts).
 *  - limit=50 filas, timeout 8s en el cliente.
 *  - Si dataset.csvUrl es null → muestra "Formato no analizable inline".
 */
import { useEffect, useState } from 'react'
import { MiniBarChart } from '../charts/MiniBarChart'

interface CsvField {
  name: string
  /** Shape real del parser: lib/parsers/datagob-csv.ts → CSVField.type */
  type?: 'number' | 'date' | 'string' | 'boolean'
  fillRate?: number
}

interface CsvResponse {
  ok: boolean
  fields?: CsvField[]
  rows?: Record<string, unknown>[]
  totalRows?: number
  header?: string[]
  separator?: string
  truncated?: boolean
  error?: string
  detail?: string
}

interface DatasetForAnalysis {
  title: string
  description?: string
  publisher?: string
  url: string
  modified?: string
  formats?: string[]
  csvUrl?: string | null
  csvByteSize?: number | null
}

interface Props {
  dataset: DatasetForAnalysis
  accent?: string
}

const FIVE_MB = 5 * 1024 * 1024
const CLIENT_TIMEOUT_MS = 8_000

export function DatasetAnalyzer({ dataset, accent = '#0F766E' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'no-csv' | 'too-large' | 'error'>(
    () => {
      if (!dataset.csvUrl) return 'no-csv'
      if (dataset.csvByteSize && dataset.csvByteSize > FIVE_MB) return 'too-large'
      return 'idle'
    }
  )
  const [data, setData] = useState<CsvResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state !== 'idle') return
    if (!dataset.csvUrl) {
      setState('no-csv')
      return
    }
    let alive = true
    setState('loading')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS)
    fetch(`/api/datos-gob/csv?url=${encodeURIComponent(dataset.csvUrl)}&limit=50&infer=true`, {
      signal: ctrl.signal,
      cache: 'force-cache',
    })
      .then((r) => r.json())
      .then((json: CsvResponse) => {
        clearTimeout(timer)
        if (!alive) return
        if (!json?.ok) {
          setError(json?.error || json?.detail || 'csv_parse_failed')
          setState('error')
          return
        }
        setData(json)
        setState('success')
      })
      .catch((err) => {
        clearTimeout(timer)
        if (!alive) return
        const msg = (err as Error).name === 'AbortError' ? 'timeout_8s' : (err as Error).message
        setError(msg)
        setState('error')
      })
    return () => {
      alive = false
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [state, dataset.csvUrl])

  // ─── Empty states ─────────────────────────────────────────────────────
  if (state === 'no-csv') {
    return (
      <div style={panelStyle(accent)}>
        <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
          Este dataset sólo expone {dataset.formats?.filter((f) => f !== 'CSV').join(', ') || 'formatos no procesables'} (PDF/Excel/ZIP).
          {' '}
          <a href={dataset.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>
            Abrir dataset original →
          </a>
        </p>
      </div>
    )
  }

  if (state === 'too-large') {
    const sizeMb = ((dataset.csvByteSize || 0) / 1024 / 1024).toFixed(1)
    return (
      <div style={panelStyle(accent)}>
        <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
          CSV demasiado grande para preview inline ({sizeMb} MB &gt; 5 MB).{' '}
          <a href={dataset.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>
            Abrir dataset original →
          </a>
        </p>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div style={panelStyle(accent)}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Extrayendo CSV (limit 50 filas, 8s timeout)…</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{ ...panelStyle(accent), background: '#fef2f2', borderColor: '#fecaca' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#991b1b' }}>
          Error parseando CSV · {error}.{' '}
          <a href={dataset.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>
            Abrir dataset original →
          </a>
        </p>
      </div>
    )
  }

  if (state !== 'success' || !data) {
    return null
  }

  // ─── Success render ───────────────────────────────────────────────────
  const fields = data.fields || []
  const rows = data.rows || []
  const dateField = fields.find((f) => f.type === 'date')
  const numericFields = fields.filter((f) => f.type === 'number')
  // Pick last numeric column as the chart axis (usually trailing total).
  const valueField = numericFields[numericFields.length - 1]

  const chartPoints = (dateField && valueField)
    ? rows
        .slice(-20)
        .map((r) => {
          const v = r[valueField.name]
          const num = typeof v === 'number' ? v : Number.isFinite(Number(v)) ? Number(v) : null
          return { label: String(r[dateField.name] ?? ''), value: num }
        })
        .filter((p) => p.label && p.value != null)
    : []

  return (
    <div style={panelStyle(accent)}>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569', marginBottom: 10, flexWrap: 'wrap' }}>
        <span><strong>{data.totalRows ?? rows.length}</strong> filas{data.truncated ? ' (truncado)' : ''}</span>
        <span>·</span>
        <span><strong>{fields.length}</strong> columnas</span>
        {dateField && <><span>·</span><span>fecha: <strong>{dateField.name}</strong></span></>}
        {valueField && <><span>·</span><span>valor: <strong>{valueField.name}</strong></span></>}
      </div>

      {chartPoints.length >= 2 && (
        <div style={{ marginBottom: 12 }}>
          <MiniBarChart
            data={chartPoints}
            accent={accent}
            height={70}
            formatValue={(v) => v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', borderTop: '1px solid #e5e7eb' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 10, fontFamily: 'ui-monospace, monospace', width: '100%' }}>
            <thead>
              <tr>
                {fields.slice(0, 6).map((f) => (
                  <th
                    key={f.name}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderBottom: '1px solid #e5e7eb',
                      color: '#64748b',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.name}
                    {f.inferredType && f.inferredType !== 'string' && (
                      <span style={{ marginLeft: 4, fontSize: 8, color: '#94a3b8', fontWeight: 500 }}>
                        ({f.inferredType})
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i}>
                  {fields.slice(0, 6).map((f) => (
                    <td
                      key={f.name}
                      style={{
                        padding: '4px 8px',
                        borderBottom: '1px solid #f1f5f9',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={String(r[f.name] ?? '')}
                    >
                      {String(r[f.name] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
        <a href={dataset.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>
          Dataset completo en datos.gob.es →
        </a>
        {dataset.csvUrl && (
          <>
            {' · '}
            <a href={dataset.csvUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8' }}>
              Descargar CSV
            </a>
          </>
        )}
      </p>
    </div>
  )
}

function panelStyle(accent: string): React.CSSProperties {
  return {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderLeft: `3px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  }
}

export default DatasetAnalyzer
