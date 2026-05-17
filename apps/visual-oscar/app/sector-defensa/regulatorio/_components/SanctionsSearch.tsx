'use client'

import { useState } from 'react'

const DATASET_OPTS = [
  { id: 'all',  label: 'Todas' },
  { id: 'ofac', label: 'OFAC' },
  { id: 'eu',   label: 'EU FSF' },
  { id: 'un',   label: 'ONU' },
  { id: 'uk',   label: 'UK HMT' },
]

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  Organization: { bg: '#EFF6FF', color: '#1F4E8C' },
  Person:       { bg: '#FFF9E6', color: '#D97706' },
  Vessel:       { bg: '#F0FDF4', color: '#16A34A' },
  Aircraft:     { bg: '#FFF1F2', color: '#DC2626' },
}

interface Sancion {
  id: string; nombre: string; aliases: string[]; tipo: string
  paises: string[]; fuentes: string[]; programas: string[]
  razon?: string; primera_sancion?: string; ultima_actualizacion?: string
  relevancia_defensa: boolean
}

export function SanctionsSearch() {
  const [q, setQ]             = useState('')
  const [dataset, setDataset] = useState('all')
  const [items, setItems]     = useState<Sancion[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [source, setSource]   = useState('')

  async function search() {
    setLoading(true); setSearched(true)
    const res = await fetch(`/api/sectores/defensa/sanciones?q=${encodeURIComponent(q)}&dataset=${dataset}&limit=40`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
    setItems(res?.items ?? []); setSource(res?.source ?? ''); setLoading(false)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Buscar entidad, país, programa… (ej: Rostec, RU, Wagner)"
          style={{ flex: 1, minWidth: 240, padding: '8px 14px', borderRadius: 8, border: '1px solid #DDDDE3', fontSize: 12.5, fontFamily: 'inherit', background: '#FAFAFA' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {DATASET_OPTS.map(d => (
            <button key={d.id} onClick={() => setDataset(d.id)}
              style={{
                padding: '7px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                borderColor: dataset === d.id ? '#1d1d1f' : '#DDDDE3',
                background: dataset === d.id ? '#1d1d1f' : '#fff',
                color: dataset === d.id ? '#fff' : '#6e6e73',
              }}
            >{d.label}</button>
          ))}
        </div>
        <button onClick={search}
          style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          Buscar
        </button>
      </div>

      {source && (
        <div style={{ fontSize: 10, color: '#86868b', marginBottom: 10 }}>
          {source === 'opensanctions' ? '⚡ OpenSanctions API en vivo' : '📊 Datos curados estáticos'}
          {' · '}{items.length} resultados
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#86868b' }}>Consultando bases de datos de sanciones…</div>}

      {!loading && searched && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#86868b', fontSize: 13 }}>Sin resultados para "{q}"</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => {
          const tc = TIPO_COLORS[it.tipo] ?? TIPO_COLORS.Organization
          return (
            <div key={it.id} style={{
              padding: '12px 16px', background: '#fff', border: '1px solid #ECECEF',
              borderRadius: 12, borderLeft: '4px solid #DC2626',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.color, letterSpacing: '0.04em', flexShrink: 0 }}>{it.tipo.toUpperCase()}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', flex: 1 }}>{it.nombre}</span>
                {it.relevancia_defensa && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#FFF1F2', color: '#DC2626' }}>❗ DEFENSA</span>}
              </div>

              {it.aliases.length > 0 && (
                <div style={{ fontSize: 10.5, color: '#86868b', marginBottom: 4 }}>aka: {it.aliases.join(' · ')}</div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {it.fuentes.map(f => (
                  <span key={f} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F5F5F7', color: '#525258' }}>{f}</span>
                ))}
                {it.paises.map(p => (
                  <span key={p} style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: '#FFF9E6', color: '#D97706', fontWeight: 700 }}>🏴 {p}</span>
                ))}
              </div>

              {it.razon && <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '0 0 4px', lineHeight: 1.4 }}>{it.razon}</p>}

              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#86868b' }}>
                {it.primera_sancion && <span>Desde: {it.primera_sancion}</span>}
                {it.ultima_actualizacion && <span>Actualizado: {it.ultima_actualizacion}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
