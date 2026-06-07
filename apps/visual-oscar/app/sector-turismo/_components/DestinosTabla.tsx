'use client'
/**
 * <DestinosTabla /> · Turismo v3 · Sprint T6 (Destinos y territorio)
 *
 * Tabla enriquecida de destinos: nombre, CCAA, tipos (chips), pernoctaciones de
 * la CCAA en vivo y badge live/catálogo. Filtro por TIPO de turismo (chips
 * conmutables: todos · ciudad · costa · isla · …). Cada fila es seleccionable:
 * al pulsar, el padre fija el destino activo (drill) y esta tabla lo resalta.
 *
 * El detalle del destino seleccionado se muestra en <DestinoDetalle /> (export
 * auxiliar de este módulo) que el padre coloca donde quiera; aquí la tabla solo
 * comunica la selección. Ordena por pernoctaciones de CCAA desc (live primero).
 *
 * Datos en vivo de `/api/turismo/destinos`. Degradación honesta: si un destino
 * no tiene dato de CCAA, badge "catálogo" y guion en pernoctaciones; nunca se
 * inventa. Cero emojis · Unicode geométrico (◔ ◉ ⟶).
 */
import { useMemo } from 'react'
import type { Destino, DestinoTipo } from './DestinosTerritorioView'

const ACCENT = '#0EA5E9'

const TIPO_LABEL: Record<DestinoTipo, string> = {
  ciudad: 'Ciudad',
  costa: 'Costa',
  isla: 'Isla',
  rural: 'Rural',
  interior: 'Interior',
  cultural: 'Cultural',
  esqui: 'Esquí',
  naturaleza: 'Naturaleza',
  gastronomico: 'Gastronómico',
  religioso: 'Religioso',
}

const ALL_TIPOS: DestinoTipo[] = [
  'ciudad', 'costa', 'isla', 'rural', 'interior',
  'cultural', 'esqui', 'naturaleza', 'gastronomico', 'religioso',
]

function fmtMillones(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k`
  return v.toLocaleString('es-ES')
}

interface Props {
  destinos: Destino[]
  /** Tipo activo de filtro; null = todos. */
  tipoFilter: DestinoTipo | null
  onTipoChange: (t: DestinoTipo | null) => void
  selectedSlug: string | null
  onSelect: (slug: string) => void
  loading?: boolean
}

/** Chip de tipo (reutilizado en tabla y detalle). */
function TipoChip({ t }: { t: DestinoTipo }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        color: '#0369A1',
        background: '#E0F2FE',
        borderRadius: 999,
        padding: '2px 7px',
        whiteSpace: 'nowrap',
      }}
    >
      {TIPO_LABEL[t]}
    </span>
  )
}

export function DestinosTabla({
  destinos,
  tipoFilter,
  onTipoChange,
  selectedSlug,
  onSelect,
  loading = false,
}: Props) {
  // Conteo por tipo (sobre el universo SIN filtrar — el padre filtra el fetch,
  // así que aquí `destinos` ya viene filtrado; el conteo es informativo del set).
  const sorted = useMemo(() => {
    return destinos.slice().sort((a, b) => {
      const av = a.pernoctaciones_ccaa ?? -1
      const bv = b.pernoctaciones_ccaa ?? -1
      if (bv !== av) return bv - av
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [destinos])

  return (
    <div>
      {/* Filtro por tipo */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => onTipoChange(null)}
          aria-pressed={tipoFilter == null}
          style={chipBtnStyle(tipoFilter == null)}
        >
          Todos
        </button>
        {ALL_TIPOS.map((t) => {
          const active = tipoFilter === t
          return (
            <button key={t} type="button" onClick={() => onTipoChange(active ? null : t)} aria-pressed={active} style={chipBtnStyle(active)}>
              {TIPO_LABEL[t]}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 34, background: '#F1F5F9', borderRadius: 8 }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: 12, color: '#94A3B8' }}>
          No hay destinos del tipo seleccionado en el catálogo.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#86868b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={thStyle}>Destino</th>
                <th style={thStyle}>Comunidad</th>
                <th style={thStyle}>Tipos</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Pernoct. CCAA</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Dato</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => {
                const selected = selectedSlug === d.slug
                return (
                  <tr
                    key={d.slug}
                    onClick={() => onSelect(d.slug)}
                    style={{
                      cursor: 'pointer',
                      background: selected ? '#E0F2FE' : 'transparent',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: selected ? '#0C4A6E' : '#1d1d1f' }}>
                      {d.nombre}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569' }}>{d.ccaa}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {d.tipo.map((t) => (
                          <TipoChip key={t} t={t} />
                        ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#0C4A6E', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMillones(d.pernoctaciones_ccaa)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <LiveBadge live={d.live} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Detalle del destino seleccionado (drill). Lo coloca el padre. */
export function DestinoDetalle({ destino, year }: { destino: Destino | null; year: number | null }) {
  if (!destino) {
    return (
      <div style={{ padding: '16px 14px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
        Selecciona un destino (en el mapa o la tabla) para ver su detalle.
      </div>
    )
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #E0F2FE', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0C4A6E', fontFamily: 'var(--font-display)' }}>{destino.nombre}</div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{destino.ccaa}</div>
        </div>
        <LiveBadge live={destino.live} />
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
        {destino.tipo.map((t) => (
          <TipoChip key={t} t={t} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <DetalleStat
          label={`Pernoct. CCAA${year ? ` · ${year}` : ''}`}
          value={fmtMillones(destino.pernoctaciones_ccaa)}
        />
        <DetalleStat
          label="Coordenadas"
          value={Number.isFinite(destino.lat) && Number.isFinite(destino.lon) ? `${destino.lat.toFixed(3)}, ${destino.lon.toFixed(3)}` : '—'}
        />
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#94A3B8', lineHeight: 1.5 }}>
        Fuente: {destino.fuente} · ref. {destino.fecha_ref}.
        {destino.live
          ? ' Pernoctaciones en vivo por comunidad (Eurostat NUTS2).'
          : ' Sin dato de pernoctaciones live para esta comunidad (entrada de catálogo).'}
      </p>
    </div>
  )
}

function DetalleStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0C4A6E', fontFamily: 'var(--font-display)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        color: live ? '#15803D' : '#94A3B8',
        background: live ? '#DCFCE7' : '#F1F5F9',
        border: `1px solid ${live ? '#86EFAC' : '#E2E8F0'}`,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {live ? '◉ live' : '◔ catálogo'}
    </span>
  )
}

function chipBtnStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? ACCENT : '#E2E8F0'}`,
    background: active ? ACCENT : '#fff',
    color: active ? '#fff' : '#475569',
    borderRadius: 999,
    padding: '4px 11px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

const thStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #E2E8F0', fontWeight: 700 }
const tdStyle: React.CSSProperties = { padding: '8px 8px', verticalAlign: 'middle' }

export default DestinosTabla
