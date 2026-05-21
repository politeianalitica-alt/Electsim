'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { datasetsApi } from '@/lib/estudio/api-client'
import { formatNumber } from '@/lib/estudio/utils'
import type { DatasetQueryResult } from '@/types/domo'
import styles from './DatasetDetail.module.css'

interface Props { datasetId: string }

const EXAMPLE_QUERIES = [
 'SELECT * FROM dataset LIMIT 100',
 'SELECT COUNT(*) AS total FROM dataset',
 'SELECT partido, SUM(votos) AS total_votos FROM dataset GROUP BY partido ORDER BY total_votos DESC',
]

export default function SqlEditor({ datasetId }: Props) {
  const [sql,          setSql]          = useState(EXAMPLE_QUERIES[0])
  const [result,       setResult]       = useState<DatasetQueryResult | null>(null)
  const [columnFilter, setColumnFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const queryMutation = useMutation({
    mutationFn: (q: string) => datasetsApi.query(datasetId, q),
    onSuccess:  (data) => setResult(data),
  })

  const handleRun = () => {
    const q = sql.trim()
    if (!q) return
    queryMutation.mutate(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
  }

  const filteredCols = result
    ? (columnFilter ? result.columns.filter(c => c.toLowerCase().includes(columnFilter.toLowerCase())) : result.columns)
    : []

  return (
 <div className={styles.sqlRoot}>
 <div className={styles.sqlEditorWrapper}>
 <div className={styles.sqlEditorHeader}>
 <span className={styles.sqlEditorLabel}>SQL · dataset: <code>{datasetId}</code></span>
 <div style={{ display: 'flex', gap: 6 }}>
            {EXAMPLE_QUERIES.map((q, i) => (
 <button
                key={i}
                onClick={() => setSql(q)}
                className={styles.exampleBtn}
                title={q}
              >
                Ejemplo {i + 1}
 </button>
            ))}
 </div>
 </div>
 <textarea
          ref={textareaRef}
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          className={styles.sqlTextarea}
          rows={6}
          spellCheck={false}
          placeholder="SELECT * FROM dataset LIMIT 100"
        />
 <div className={styles.sqlEditorFooter}>
 <span className={styles.sqlHint}>⌘+Enter para ejecutar</span>
 <button
            onClick={handleRun}
            disabled={queryMutation.isPending || !sql.trim()}
            className={styles.btnRun}
          >
            {queryMutation.isPending ? '⟳ Ejecutando…' : '▶ Ejecutar'}
 </button>
 </div>
 </div>

      {queryMutation.isError && (
 <div className={styles.sqlError}>
           {(queryMutation.error as Error)?.message ?? 'Error ejecutando la consulta'}
 </div>
      )}

      {result && (
 <div className={styles.sqlResults}>
 <div className={styles.sqlResultsHeader}>
 <input
              type="search"
              placeholder="Filtrar columnas…"
              value={columnFilter}
              onChange={e => setColumnFilter(e.target.value)}
              className={styles.colFilter}
              style={{ maxWidth: 200 }}
            />
 <span className={styles.rowCount}>
              {formatNumber(result.rowCount)} filas · {result.durationMs}ms
              {result.fromCache && ' · desde caché'}
 </span>
 </div>
 <div className={styles.tableWrapper}>
 <table className={styles.dataTable}>
 <thead>
 <tr>
 <th className={`${styles.th} ${styles.thRowNum}`}>#</th>
                  {filteredCols.map(col => (
 <th key={col} className={styles.th}>{col}</th>
                  ))}
 </tr>
 </thead>
 <tbody>
                {result.rows.map((row, i) => (
 <tr key={i} className={styles.tr}>
 <td className={`${styles.td} ${styles.tdRowNum}`}>{i + 1}</td>
                    {filteredCols.map(col => {
                      const val    = row[col]
                      const isNull = val === null || val === undefined
                      const isNum  = typeof val === 'number'
                      return (
 <td
                          key={col}
                          className={styles.td}
                          style={{ textAlign: isNum ? 'right' : 'left', opacity: isNull ? 0.35 : 1 }}
                        >
                          {isNull ? 'NULL' : isNum ? val.toLocaleString('es-ES') : String(val)}
 </td>
                      )
                    })}
 </tr>
                ))}
 </tbody>
 </table>
 </div>
 </div>
      )}
 </div>
  )
}
