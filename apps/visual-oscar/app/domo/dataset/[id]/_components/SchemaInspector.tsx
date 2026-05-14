'use client'

import { useState } from 'react'
import type { ColumnSchema, ColumnType } from '@/types/domo'
import { formatNumber } from '@/lib/domo/utils'
import styles from './DatasetDetail.module.css'

interface Props { schema: ColumnSchema[] }

const COL_TYPE_LABELS: Record<ColumnType, string> = {
  string:    'Texto',
  integer:   'Entero',
  float:     'Decimal',
  boolean:   'Booleano',
  date:      'Fecha',
  datetime:  'Fecha y hora',
  timestamp: 'Timestamp',
  json:      'JSON',
  array:     'Array',
  unknown:   '?',
}

const COL_TYPE_COLORS: Record<ColumnType, string> = {
  string:    '#3b82f6',
  integer:   '#10b981',
  float:     '#06b6d4',
  boolean:   '#f59e0b',
  date:      '#8b5cf6',
  datetime:  '#7c3aed',
  timestamp: '#6d28d9',
  json:      '#f97316',
  array:     '#ec4899',
  unknown:   '#9ca3af',
}

export default function SchemaInspector({ schema }: Props) {
  const [search,      setSearch]      = useState('')
  const [expandedCol, setExpandedCol] = useState<string | null>(null)

  const filtered = schema.filter(col =>
    !search || col.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className={styles.schemaRoot}>
      <div className={styles.schemaHeader}>
        <input
          type="search"
          placeholder="Buscar columna…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.colFilter}
          style={{ maxWidth: 260 }}
        />
        <span className={styles.rowCount}>{schema.length} columnas</span>
      </div>

      <div className={styles.schemaList}>
        {filtered.map((col, i) => {
          const color      = COL_TYPE_COLORS[col.type]
          const isExpanded = expandedCol === col.name

          return (
            <div key={col.name} className={styles.schemaRow}>
              <div
                className={styles.schemaRowHeader}
                onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                style={{ cursor: col.stats ? 'pointer' : 'default' }}
              >
                <span className={styles.schemaColNum}>{i + 1}</span>
                <span className={styles.schemaColName}>{col.name}</span>
                <span
                  className={styles.schemaColType}
                  style={{ color, background: `${color}15`, borderColor: `${color}30` }}
                >
                  {COL_TYPE_LABELS[col.type]}
                </span>
                {col.nullable && <span className={styles.schemaNullable}>nullable</span>}
                {col.description && (
                  <span className={styles.schemaColDesc}>{col.description}</span>
                )}
                {col.stats && (
                  <span className={styles.schemaExpandBtn}>{isExpanded ? '▲' : '▼'}</span>
                )}
              </div>

              {isExpanded && col.stats && (
                <div className={styles.schemaStats}>
                  <div className={styles.schemaStatGrid}>
                    {col.stats.nullCount !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Nulos</span>
                        <span className={styles.statValue}>{formatNumber(col.stats.nullCount)}</span>
                      </div>
                    )}
                    {col.stats.distinctCount !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Distintos</span>
                        <span className={styles.statValue}>{formatNumber(col.stats.distinctCount)}</span>
                      </div>
                    )}
                    {col.stats.min !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Mínimo</span>
                        <span className={styles.statValue}>{String(col.stats.min)}</span>
                      </div>
                    )}
                    {col.stats.max !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Máximo</span>
                        <span className={styles.statValue}>{String(col.stats.max)}</span>
                      </div>
                    )}
                    {col.stats.mean !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Media</span>
                        <span className={styles.statValue}>{col.stats.mean.toFixed(2)}</span>
                      </div>
                    )}
                    {col.stats.stddev !== undefined && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Desv. estándar</span>
                        <span className={styles.statValue}>{col.stats.stddev.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {col.stats.topValues && col.stats.topValues.length > 0 && (
                    <div className={styles.topValues}>
                      <span className={styles.topValuesLabel}>Valores más frecuentes</span>
                      <div className={styles.topValuesList}>
                        {col.stats.topValues.slice(0, 8).map((tv, j) => (
                          <div key={j} className={styles.topValueItem}>
                            <span className={styles.topValueVal}>{String(tv.value)}</span>
                            <span className={styles.topValueCount}>{formatNumber(tv.count)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {col.examples && col.examples.length > 0 && (
                    <div className={styles.examples}>
                      <span className={styles.topValuesLabel}>Ejemplos</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {col.examples.slice(0, 5).map((ex, j) => (
                          <code key={j} className={styles.exampleChip}>{String(ex)}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
