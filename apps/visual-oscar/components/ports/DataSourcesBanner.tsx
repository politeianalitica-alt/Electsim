'use client'
/**
 * DataSourcesBanner · estado live/synth de las fuentes externas.
 *
 * Aparece arriba del dashboard /puertos. Por defecto colapsado mostrando
 * resumen `X/N fuentes en vivo`; expandible para ver el detalle por fuente
 * con el motivo y la variable de entorno requerida.
 */
import { useState } from 'react'
import type { DataSourcesStatusResponse } from '@/types/ports'

interface Props {
  status: DataSourcesStatusResponse | undefined
  loading: boolean
}

export function DataSourcesBanner({ status, loading }: Props) {
  const [open, setOpen] = useState(false)

  if (loading || !status) {
    return (
      <div
        style={{
          padding: '6px 12px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          marginBottom: 14,
          fontSize: 11,
          color: '#64748b',
        }}
      >
        Comprobando estado de fuentes externas…
      </div>
    )
  }

  const live = status.n_live
  const total = status.n_sources
  const pct = total > 0 ? Math.round((live / total) * 100) : 0
  const headColor = status.all_live ? '#16a34a' : status.any_live ? '#f59e0b' : '#dc2626'

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 10,
            height: 10,
            background: headColor,
            borderRadius: '50%',
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', letterSpacing: 0.4 }}>
          Fuentes en vivo · {live}/{total} ({pct}%)
        </span>
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
          {status.items
            .filter((s) => s.live)
            .map((s) => s.label.split(' · ')[0])
            .join(' · ') || 'todas sintéticas'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
          {open ? '▲ ocultar' : '▼ detalle'}
        </span>
      </button>

      {open ? (
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 14px' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={th}>Fuente</th>
                <th style={th}>Categoría</th>
                <th style={th}>Estado</th>
                <th style={th}>Motivo</th>
                <th style={th}>Configurar</th>
              </tr>
            </thead>
            <tbody>
              {status.items.map((s) => (
                <tr key={s.key} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={td}>
                    <strong>{s.label}</strong>
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>{s.category}</td>
                  <td style={td}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 999,
                        fontWeight: 700,
                        background: s.live ? '#dcfce7' : '#fef3c7',
                        color: s.live ? '#166534' : '#92400e',
                        letterSpacing: 0.4,
                      }}
                    >
                      {s.live ? 'LIVE' : 'SYNTH'}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#475569' }}>{s.reason}</td>
                  <td style={{ ...td, color: '#64748b' }}>
                    {s.env_hint ? <code style={{ fontSize: 10, background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{s.env_hint}</code> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, margin: '8px 0 0' }}>
            Las variables de entorno se configuran en el servidor backend (Railway/Vercel).
            Sin claves, el módulo degrada a datos sintéticos deterministas pero la UI sigue funcional.
          </p>
        </div>
      ) : null}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  fontSize: 10,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: 0.4,
}
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }

export default DataSourcesBanner
