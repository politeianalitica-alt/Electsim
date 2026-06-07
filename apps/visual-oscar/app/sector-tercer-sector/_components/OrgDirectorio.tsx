'use client'
/**
 * <OrgDirectorio /> · Tercer Sector v3 · TS4 (Organizaciones)
 *
 * Grid paginado de entidades del directorio. Cada tarjeta resume nombre, tipo,
 * sector, CCAA, ingresos, empleados, IRPF 0,7% y la cita de fuente+fecha. Es
 * interactiva (selecciona la entidad → abre la ficha). El control de paginación
 * (servidor) vive al pie.
 *
 * Honesto con nulos: ingresos/empleados no publicados → «n/d». Cero emojis.
 */
import {
  ACCENT,
  ambitoLabel,
  ccaaLabel,
  fmtEur,
  fmtNum,
  FuenteBadge,
  OrgChip,
  sectorLabel,
  tipoLabel,
  type OrgRow,
} from './OrgShared'

interface Props {
  rows: OrgRow[]
  loading?: boolean
  page: number
  pageSize: number
  total: number
  selectedSlug?: string | null
  onSelect: (o: OrgRow) => void
  onPage: (page: number) => void
}

function MetricCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: strong ? 14 : 12.5,
          fontWeight: 700,
          color: value === 'n/d' || value === '—' ? '#cbd5e1' : '#1d1d1f',
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function OrgCard({
  o,
  selected,
  onSelect,
}: {
  o: OrgRow
  selected: boolean
  onSelect: (o: OrgRow) => void
}) {
  return (
    <button
      onClick={() => onSelect(o)}
      aria-pressed={selected}
      style={{
        textAlign: 'left',
        border: selected ? `1.5px solid ${ACCENT}` : '1px solid #ECECEF',
        background: selected ? 'rgba(22,163,74,0.04)' : '#fff',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 120ms ease, background 120ms ease',
        boxShadow: selected ? '0 2px 10px rgba(22,163,74,0.10)' : 'none',
      }}
    >
      {/* Cabecera: nombre + chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#1d1d1f',
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {o.nombre}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <OrgChip tone="accent">{tipoLabel(o.tipo)}</OrgChip>
          <OrgChip tone="neutral">{sectorLabel(o.sector)}</OrgChip>
          {o.irpf_07 && (
            <OrgChip tone="violet" title="Adherida al convenio IRPF 0,7% Fines Sociales">
              IRPF 0,7%
            </OrgChip>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          paddingTop: 4,
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <MetricCell label="Ingresos" value={fmtEur(o.ingresos_eur)} strong />
        <MetricCell label="Empleo" value={fmtNum(o.empleados)} />
        <MetricCell label="CCAA" value={o.ccaa ? ccaaLabel(o.ccaa) : ambitoLabel(o.ambito)} />
      </div>

      {/* Pie: fuente + fecha */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <FuenteBadge fuente={o.fuente} fecha={o.fecha_ref} compact />
        <span aria-hidden="true" style={{ color: ACCENT, fontSize: 13, opacity: selected ? 1 : 0.5 }}>
          ⟶
        </span>
      </div>
    </button>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  const btn = (disabled: boolean): React.CSSProperties => ({
    border: '1px solid #E2E8F0',
    background: '#fff',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 11.5,
    fontWeight: 700,
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11.5, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
        {from.toLocaleString('es-ES')}–{to.toLocaleString('es-ES')} de {total.toLocaleString('es-ES')}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btn(page <= 1)} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Anterior
        </button>
        <span style={{ fontSize: 11.5, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          Página {page} / {totalPages}
        </span>
        <button style={btn(page >= totalPages)} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Siguiente →
        </button>
      </div>
    </div>
  )
}

export function OrgDirectorio({
  rows,
  loading,
  page,
  pageSize,
  total,
  selectedSlug,
  onSelect,
  onPage,
}: Props) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{ height: 168, background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, opacity: 0.6 }}
          />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px dashed #E2E8F0',
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 26, color: ACCENT, opacity: 0.55 }}>◍</div>
        <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>
          Sin entidades para estos filtros
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Prueba a relajar el tipo, sector, CCAA o ámbito, o limpia la búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {rows.map((o) => (
          <OrgCard key={o.slug} o={o} selected={o.slug === selectedSlug} onSelect={onSelect} />
        ))}
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPage={onPage} />
    </div>
  )
}

export default OrgDirectorio
