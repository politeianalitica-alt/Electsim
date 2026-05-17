'use client'

import { useState, useMemo } from 'react'
import { ContractSourceBadge, FUENTE_COLOR } from './ContractSourceBadge'

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
}

interface Props {
  items: Contrato[]
  onSelect: (c: Contrato) => void
  selectedId: string | null
}

const FUENTES = ['all', 'TED', 'PLACSP', 'CATALUNYA_SOCRATA', 'USASPENDING']

function fmt(v?: number) {
  if (v == null) return null
  if (v >= 1_000_000_000) return `${(v/1e9).toFixed(1)}b`
  if (v >= 1_000_000)     return `${(v/1e6).toFixed(1)}M`
  if (v >= 1_000)         return `${(v/1e3).toFixed(0)}k`
  return `${v.toFixed(0)}`
}

export function ContractsTable({ items, onSelect, selectedId }: Props) {
  const [fuenteFiltro, setFuenteFiltro] = useState('all')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'fecha' | 'importe'>('fecha')

  const filtered = useMemo(() => {
    let r = items
    if (fuenteFiltro !== 'all') r = r.filter(c => c.fuente === fuenteFiltro)
    if (q.trim()) {
      const ql = q.toLowerCase()
      r = r.filter(c =>
        c.objeto?.toLowerCase().includes(ql) ||
        c.organo?.toLowerCase().includes(ql) ||
        c.adjudicatario?.toLowerCase().includes(ql)
      )
    }
    if (sortBy === 'importe') {
      r = [...r].sort((a,b) => ((b.importe_adjudicacion??b.importe_licitacion??0) - (a.importe_adjudicacion??a.importe_licitacion??0)))
    }
    return r
  }, [items, fuenteFiltro, q, sortBy])

  return (
    <div style={{ width: '100%' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar contrato, organismo, empresa…"
          style={{
            flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 8,
            border: '1px solid #DDDDE3', fontSize: 12, fontFamily: 'inherit',
            background: '#FAFAFA', color: '#1d1d1f', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {FUENTES.map(f => (
            <button
              key={f}
              onClick={() => setFuenteFiltro(f)}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                border: '1px solid',
                borderColor: fuenteFiltro === f ? '#1d1d1f' : '#DDDDE3',
                background: fuenteFiltro === f ? '#1d1d1f' : '#fff',
                color: fuenteFiltro === f ? '#fff' : '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {f === 'all' ? 'Todas' : f === 'CATALUNYA_SOCRATA' ? 'CAT' : f === 'USASPENDING' ? 'DoD' : f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['fecha','importe'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                border: '1px solid',
                borderColor: sortBy === s ? '#1F4E8C' : '#DDDDE3',
                background: sortBy === s ? '#EFF6FF' : '#fff',
                color: sortBy === s ? '#1F4E8C' : '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {s === 'fecha' ? 'Recientes' : 'Mayor importe'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#86868b', marginLeft: 'auto' }}>
          {filtered.length} contratos
        </span>
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 520, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#86868b', fontSize: 13 }}>Sin resultados</div>
        )}
        {filtered.map(c => {
          const importe = c.importe_adjudicacion ?? c.importe_licitacion
          const isSelected = selectedId === c.id
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                padding: '10px 14px',
                background: isSelected ? '#F0F4FF' : '#FAFAFA',
                borderRadius: 10,
                border: `1px solid ${isSelected ? '#1F4E8C' : '#ECECEF'}`,
                borderLeft: `3px solid ${FUENTE_COLOR[c.fuente] ?? '#525258'}`,
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
                cursor: 'pointer', transition: 'background 0.1s',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <ContractSourceBadge fuente={c.fuente} />
                  {c.cpv && <span style={{ fontSize: 9.5, color: '#5B21B6', fontFamily: 'monospace', fontWeight: 700 }}>CPV {c.cpv}</span>}
                  {c.fecha_publicacion && <span style={{ fontSize: 9.5, color: '#86868b' }}>{c.fecha_publicacion}</span>}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.objeto}
                </div>
                <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>{c.organo}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                {importe ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#1F4E8C' }}>
                      {fmt(importe)} <span style={{ fontSize: 10, fontWeight: 500, color: '#86868b' }}>€</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: '#86868b' }}>
                      {c.importe_adjudicacion != null ? 'adjudicado' : 'licitación'}
                    </div>
                  </>
                ) : <span style={{ fontSize: 10.5, color: '#DDDDE3' }}>sin importe</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
