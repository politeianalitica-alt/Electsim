'use client'
/**
 * <CommoditySnapshot /> · Primitiva compartida · Energía v3 · Sprint E1
 *
 * Tiles COMPACTOS de "solo snapshot": valor actual + cambio % (sin series ni
 * sparkline). Pensado para la Visión Global, donde el principio de diseño es
 * "snapshots, no detalle" (el detalle vive en la pestaña del tipo). Para series
 * completas con sparkline úsese <CommodityStrip /> (S7).
 *
 * No hace fetch: recibe `items` ya calculados por la vista. Degradación honesta
 * (CLAUDE.md): valor `null` → '—'. Cero emojis · Unicode geométrico (⇡ ⇣).
 *
 * Adopción: este sprint la CREA; su uso en Visión Global lo cierra E9.
 */

export interface CommoditySnapshotItem {
  label: string
  /** Valor spot ya resuelto. `null` → '—'. */
  value: number | string | null
  unit?: string
  /** Variación % (24h normalmente). `null` → sin chip de cambio. */
  change?: number | null
  /** Color de acento para el valor (default tinta). */
  color?: string
}

interface CommoditySnapshotProps {
  items: CommoditySnapshotItem[]
  title?: string
}

function fmt(value: number | string | null): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  return value.toLocaleString('es-ES', { maximumFractionDigits: value >= 100 ? 1 : 2 })
}

export function CommoditySnapshot({ items, title }: CommoditySnapshotProps) {
  return (
    <div>
      {title && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#86868b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {items.map((it) => {
          const hasValue = it.value != null
          const chg = it.change ?? null
          const up = (chg ?? 0) >= 0
          return (
            <div
              key={it.label}
              style={{ padding: '10px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#1d1d1f',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.label}
                </span>
                {it.unit && <span style={{ fontSize: 9, color: '#86868b', whiteSpace: 'nowrap' }}>{it.unit}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.02em',
                    color: hasValue ? it.color ?? '#1d1d1f' : '#C0C0C5',
                  }}
                >
                  {fmt(it.value)}
                </span>
                {hasValue && chg != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: up ? '#16A34A' : '#DC2626', whiteSpace: 'nowrap' }}>
                    {up ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CommoditySnapshot
