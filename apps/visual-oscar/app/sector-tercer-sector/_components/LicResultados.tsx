'use client'
/**
 * <LicResultados /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · listado)
 *
 * Lista de resultados del agregador en tarjetas compactas (título, comprador,
 * badge de nivel, país, valor, plazo, fuente, nº de documentos) + paginación.
 * La tarjeta seleccionada se resalta y abre su ficha completa (<LicFicha>) en el
 * panel lateral del padre. Estados de carga (skeletons) y vacío explícitos.
 *
 * Presentacional: recibe los datos ya resueltos por <TSLicitacionesView>; emite
 * `onSelect(id)` y `onPage(n)`. Cero emojis · Unicode geométrico.
 */
import type { LicitacionNormalizada } from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, NivelBadge, PlazoPill, MetaPill, fuenteLabel, formatEur, formatFecha } from './LicShared'

interface Props {
  items: LicitacionNormalizada[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onPage: (page: number) => void
}

export function LicResultados({ items, total, page, pageSize, loading, selectedId, onSelect, onPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 78, background: '#F1F5F9', border: '1px solid #ECECEF', borderRadius: 12 }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px dashed #D6D6DA', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
        <div aria-hidden="true" style={{ fontSize: 30, color: ACCENT, opacity: 0.4 }}>⊞</div>
        <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: '#334155' }}>Sin licitaciones para estos filtros</p>
        <p style={{ margin: '4px auto 0', maxWidth: 420, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>
          Prueba a quitar el filtro de nivel o país, amplía el rango de fechas o usa un prefijo CPV más corto (p. ej. «85» en vez de «85311»).
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((l) => (
          <LicCard key={l.id} lic={l} selected={l.id === selectedId} onSelect={() => onSelect(l.id)} />
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          <PagBtn label="‹ Anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          <span style={{ fontSize: 11.5, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            Página <strong style={{ color: '#334155' }}>{page}</strong> de {totalPages}
            <span style={{ marginLeft: 8, opacity: 0.7 }}>· {total.toLocaleString('es-ES')} resultados</span>
          </span>
          <PagBtn label="Siguiente ›" disabled={page >= totalPages} onClick={() => onPage(page + 1)} />
        </div>
      )}
    </div>
  )
}

function LicCard({ lic, selected, onSelect }: { lic: LicitacionNormalizada; selected: boolean; onSelect: () => void }) {
  const nDocs = lic.documentos?.length ?? 0
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        textAlign: 'left',
        width: '100%',
        background: selected ? '#F6FDF9' : '#fff',
        border: `1px solid ${selected ? ACCENT : '#ECECEF'}`,
        borderLeft: `3px solid ${selected ? ACCENT : 'transparent'}`,
        borderRadius: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 120ms ease, background 120ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <NivelBadge nivel={lic.nivel} size="sm" />
            <PlazoPill plazo={lic.plazo} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {lic.titulo || 'Licitación sin título'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lic.comprador || '—'}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {formatEur(lic.valor_eur)}
          </p>
          {lic.valor_eur != null && lic.moneda && lic.moneda !== 'EUR' && (
            <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8' }}>orig. {lic.moneda}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <MetaPill title="País">◍ {lic.pais || '—'}{lic.region ? ` · ${lic.region}` : ''}</MetaPill>
        {lic.cpv && <MetaPill title="CPV principal" mono>CPV {lic.cpv}</MetaPill>}
        <MetaPill title="Fuente">{fuenteLabel(lic.fuente)}</MetaPill>
        {nDocs > 0 && (
          <MetaPill title={`${nDocs} documento(s) · pliego / anexos`} mono>
            ◈ {nDocs} {nDocs === 1 ? 'doc' : 'docs'}
          </MetaPill>
        )}
        {lic.fecha_pub && (
          <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#94a3b8' }}>Pub. {formatFecha(lic.fecha_pub)}</span>
        )}
      </div>
    </button>
  )
}

function PagBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: '#fff',
        color: disabled ? '#CBD5E1' : '#334155',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 11.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}

export default LicResultados
