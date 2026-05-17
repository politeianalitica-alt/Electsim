'use client'

import { ContractSourceBadge } from './ContractSourceBadge'

interface Contrato {
  id: string
  fuente: string
  fuente_label: string
  objeto: string
  organo: string
  adjudicatario?: string
  cpv?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  fecha_publicacion?: string
  url?: string
  expediente?: string
  pais_iso2?: string
  lugar_ejecucion?: string
  estado?: string
}

interface Props {
  contrato: Contrato | null
  onClose: () => void
}

function fmt(v?: number) {
  if (v == null) return '—'
  if (v >= 1_000_000_000) return `${(v/1e9).toFixed(2)} b €`
  if (v >= 1_000_000)     return `${(v/1e6).toFixed(2)} M €`
  if (v >= 1_000)         return `${(v/1e3).toFixed(0)} k €`
  return `${v.toFixed(0)} €`
}

export function ContractDetail({ contrato: c, onClose }: Props) {
  if (!c) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: '#86868b', padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32 }}>&#9432;</div>
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Selecciona un contrato de la lista para ver su detalle
        </p>
      </div>
    )
  }

  const importe = c.importe_adjudicacion ?? c.importe_licitacion
  const tipoImporte = c.importe_adjudicacion != null ? 'Adjudicado' : 'Licitación'

  return (
    <div style={{ padding: '20px 20px 32px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <ContractSourceBadge fuente={c.fuente} />
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#86868b', lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Título */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
        color: '#1d1d1f', letterSpacing: '-0.01em', lineHeight: 1.4,
        margin: '0 0 16px',
      }}>
        {c.objeto}
      </h2>

      {/* Importe destacado */}
      {importe && (
        <div style={{
          padding: '12px 16px', background: '#EFF6FF',
          border: '1px solid #BFDBFE', borderRadius: 12, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 11, color: '#1F4E8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tipoImporte}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#1F4E8C' }}>
            {fmt(importe)}
          </span>
        </div>
      )}

      {/* Campos */}
      {[
        { label: 'Organismo contratante', value: c.organo },
        { label: 'Adjudicatario',          value: c.adjudicatario },
        { label: 'CPV',                    value: c.cpv },
        { label: 'Expediente',             value: c.expediente },
        { label: 'Publicación',            value: c.fecha_publicacion },
        { label: 'Lugar de ejecución',     value: c.lugar_ejecucion },
        { label: 'Estado',                 value: c.estado },
      ].filter(f => f.value).map(f => (
        <div key={f.label} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 2 }}>
            {f.label}
          </div>
          <div style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.4 }}>{f.value}</div>
        </div>
      ))}

      {/* Enlace externo */}
      {c.url && (
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 16, padding: '8px 16px', borderRadius: 8,
            background: '#1d1d1f', color: '#fff',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
            fontFamily: 'inherit',
          }}
        >
          Ver expediente original ↗
        </a>
      )}

      {/* AI Summary placeholder */}
      <div style={{
        marginTop: 20, padding: '12px 14px',
        background: '#F9FAFB', border: '1px solid #ECECEF',
        borderRadius: 10, borderLeft: '3px solid #8B5CF6',
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B5CF6', marginBottom: 6 }}>
          Análisis IA · Próximamente
        </div>
        <div style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.5 }}>
          En Sprint 3 este panel mostrará un resumen generado automáticamente con contexto estratégico,
          empresa adjudicataria y relevancia competitiva.
        </div>
      </div>
    </div>
  )
}
