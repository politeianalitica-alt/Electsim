'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { datasetsApi } from '@/lib/estudio/api-client'
import Skeleton from '@/components/Skeleton'
import styles from './DatasetDetail.module.css'

interface Props { datasetId: string }

const PAGE_SIZE = 50

export default function DataExplorer({ datasetId }: Props) {
  const [offset,       setOffset]       = useState(0)
  const [columnFilter, setColumnFilter] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey:        ['domo', 'datasets', datasetId, 'preview', offset],
    queryFn:         () => datasetsApi.preview(datasetId, PAGE_SIZE, offset),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  })

  const columns   = data?.columns ?? []
  const rows      = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0
  const page      = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const filteredColumns = columnFilter
    ? columns.filter(c => c.toLowerCase().includes(columnFilter.toLowerCase()))
    : columns

  if (isLoading) {
    return <Skeleton style={{ height: 400, borderRadius: 12 }} />
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.explorerControls}>
        <input
          type="search"
          placeholder="Filtrar columnas…"
          value={columnFilter}
          onChange={e => setColumnFilter(e.target.value)}
          className={styles.colFilter}
        />
        <span className={styles.rowCount}>
          {isFetching ? '⟳ Cargando…' : `Mostrando ${offset + 1}–${Math.min(offset + PAGE_SIZE, totalRows)} de ${totalRows.toLocaleString('es-ES')} filas`}
        </span>
        <div className={styles.pagination}>
          <button onClick={() => setOffset(0)} disabled={offset === 0 || isFetching} className={styles.pageBtn}>⟨⟨</button>
          <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0 || isFetching} className={styles.pageBtn}>⟨</button>
          <span className={styles.pageNum}>Pág. {page} / {totalPages}</span>
          <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= totalRows || isFetching} className={styles.pageBtn}>⟩</button>
          <button onClick={() => setOffset((totalPages - 1) * PAGE_SIZE)} disabled={offset + PAGE_SIZE >= totalRows || isFetching} className={styles.pageBtn}>⟩⟩</button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.thRowNum}`}>#</th>
              {filteredColumns.map(col => (
                <th key={col} className={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={styles.tr}>
                <td className={`${styles.td} ${styles.tdRowNum}`}>{offset + i + 1}</td>
                {filteredColumns.map(col => {
                  const val    = row[col]
                  const isNull = val === null || val === undefined
                  const isNum  = typeof val === 'number'
                  return (
                    <td
                      key={col}
                      className={styles.td}
                      style={{ textAlign: isNum ? 'right' : 'left', opacity: isNull ? 0.35 : 1 }}
                      title={isNull ? 'NULL' : String(val)}
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
  )
}
