'use client'
/**
 * Panel reutilizable de inteligencia sectorial · consume
 * /api/v1/sector-intel/{sector}/overview.
 *
 * Pinta:
 *   · 4 KPIs en grid auto-fit
 *   · Alertas relevantes (cards con severity coloreada)
 *   · Tabla de items + footer con fuentes y fecha
 *
 * Diseño consistente con SectorialWidgets pero independiente para no
 * tocar el resto de la maquinaria sectorial existente.
 */
import { useSectorIntel } from '@/hooks/useSectorIntel'
import { SECTOR_INTEL_CONFIG, type SectorIntelKey } from '@/types/sector-intel'
import { SectorMapPreview } from '@/components/SectorMapPreview'

interface Props {
  sector: SectorIntelKey
  /** Color de acento (override sobre default por sector). */
  accent?: string
  /** Título opcional · default 'Inteligencia operativa Politeia'. */
  title?: string
  /**
   * Compact = solo KPIs + alertas (sin tabla). Útil cuando la página
   * sectorial ya tiene su propia tabla principal y queremos un resumen
   * complementario · no contenido duplicado.
   */
  compact?: boolean
  /** Enlace 'ver detalle completo' opcional para guiar a otro módulo. */
  detailHref?: string
  detailLabel?: string
}

const SEVERITY_COLOR: Record<string, { bg: string; fg: string }> = {
  critical: { bg: '#fee2e2', fg: '#991b1b' },
  high: { bg: '#fef3c7', fg: '#92400e' },
  medium: { bg: '#dbeafe', fg: '#1e40af' },
  info: { bg: '#e5e7eb', fg: '#374151' },
}

export function SectorIntelPanel({
  sector,
  accent,
  title,
  compact = false,
  detailHref,
  detailLabel,
}: Props) {
  const cfg = SECTOR_INTEL_CONFIG[sector]
  const accentColor = accent ?? cfg?.accent ?? '#111827'
  const { data, loading, error, isLive, refresh, updatedAt } = useSectorIntel(sector)

  if (loading && !data) {
    return <p style={{ fontSize: 12, color: '#9ca3af' }}>Cargando inteligencia sectorial…</p>
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 13,
        }}
      >
        Error cargando overview de {sector}: {String(error)}
      </div>
    )
  }

  if (!data || (data.headline_kpis.length === 0 && data.table.rows.length === 0)) {
    return (
      <div
        style={{
          padding: 16,
          background: '#fff',
          border: '1px dashed #d1d5db',
          borderRadius: 8,
          fontSize: 13,
          color: '#6b7280',
        }}
      >
        Sin inteligencia operativa disponible para <strong>{sector}</strong>. Ejecuta
        el seed correspondiente (S7-S15) para poblar el tracker.
      </div>
    )
  }

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 18,
        marginTop: 18,
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: 1.2,
              color: accentColor,
              fontWeight: 700,
            }}
          >
            INTELIGENCIA OPERATIVA · POLITEIA
          </p>
          <h2
            style={{
              margin: '2px 0 0 0',
              fontSize: 20,
              fontWeight: 800,
              color: '#111827',
            }}
          >
            {title ?? `${cfg?.label ?? sector} · tracker en vivo`}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6b7280' }}>
          {detailHref ? (
            <a
              href={detailHref}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                background: accentColor,
                color: '#fff',
                borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              {detailLabel ?? 'Ver módulo completo →'}
            </a>
          ) : null}
          {isLive ? (
            <span style={{ color: '#16a34a', fontWeight: 600 }}>● LIVE</span>
          ) : (
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>○ fallback</span>
          )}
          {updatedAt ? <span>· {new Date(updatedAt).toLocaleTimeString('es-ES')}</span> : null}
          <button
            onClick={refresh}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid #e5e7eb',
              background: '#fff',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* KPIs */}
      {data.headline_kpis.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {data.headline_kpis.map((k, i) => (
            <div
              key={i}
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{k.label}</p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: 20,
                  fontWeight: 800,
                  color: k.color ?? '#111827',
                }}
              >
                {k.value}
              </p>
              {k.sub ? (
                <p style={{ margin: '2px 0 0 0', fontSize: 10, color: '#9ca3af' }}>{k.sub}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Alertas */}
      {data.alerts.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            ▲ Alertas activas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.alerts.map((a, i) => {
              const col = SEVERITY_COLOR[a.severity ?? 'medium'] ?? SEVERITY_COLOR.medium
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: '#fff',
                    border: '1px solid #f3f4f6',
                    borderLeft: `3px solid ${col.fg}`,
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      padding: '2px 6px',
                      fontSize: 9,
                      fontWeight: 700,
                      background: col.bg,
                      color: col.fg,
                      borderRadius: 3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {a.severity ?? 'medium'}
                  </span>
                  <span style={{ color: '#374151', flex: 1 }}>{a.title}</span>
                  {a.kind ? (
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{a.kind}</span>
                  ) : null}
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: 11, color: accentColor, textDecoration: 'none' }}
                    >
                      ↗
                    </a>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Tabla · oculta en modo compact (los datos suelen ya estar arriba) */}
      {!compact && data.table.rows.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                {data.table.columns.map((c, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.table.rows.slice(0, 12).map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '6px 10px', color: '#374151' }}>
                      {cell == null || cell === '' ? '—' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.table.rows.length > 12 ? (
            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
              · mostrando 12 de {data.table.rows.length} filas
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Footer fuentes */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Fuentes:</span>
        {data.sources.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: '#f3f4f6',
              color: '#6b7280',
              borderRadius: 3,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Vista inicial del mapa OSINT con las capas del sector + ampliar */}
      <SectorMapPreview sector={sector} accent={accentColor} />
    </section>
  )
}
