'use client'

import { useEffect, useState } from 'react'
import { getPresets, savePreset, deletePreset, type MapViewPreset } from '@/lib/osiris/view-presets'

/**
 * "Mis vistas" · guarda y restaura combinaciones de capas + posición del mapa
 * OSINT como presets propios del usuario (localStorage). Se apoya en que
 * OsirisDashboard ya sincroniza la vista actual a la query string de la URL.
 */
export default function MapViewPresets() {
  const [presets, setPresets] = useState<MapViewPreset[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { setPresets(getPresets()) }, [])

  const onSave = () => {
    const search = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''
    setPresets(savePreset(name, search))
    setName('')
    setAdding(false)
  }
  const onLoad = (p: MapViewPreset) => {
    if (typeof window === 'undefined') return
    window.location.assign(`${window.location.pathname}?${p.search}`)
  }

  return (
    <div className="glass-panel px-3 py-2" style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--gold-primary)', fontWeight: 700 }}>
          MIS VISTAS
        </span>
        <button
          onClick={() => setAdding(a => !a)}
          title="Guardar la vista actual (capas + posición)"
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: adding ? '#0b0e16' : 'var(--gold-primary)',
            background: adding ? 'var(--gold-primary)' : 'transparent',
            border: '1px solid var(--gold-primary)', borderRadius: 5,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          {adding ? 'CANCELAR' : '+ GUARDAR'}
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave() }}
            placeholder="Nombre de la vista"
            autoFocus
            maxLength={48}
            style={{
              flex: 1, minWidth: 0, fontSize: 11, color: '#e8edf6',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 5, padding: '4px 8px', outline: 'none',
            }}
          />
          <button
            onClick={onSave}
            disabled={!name.trim()}
            style={{
              fontSize: 10, fontWeight: 700, color: '#0b0e16',
              background: name.trim() ? 'var(--gold-primary)' : 'rgba(212,175,55,0.4)',
              border: 'none', borderRadius: 5, padding: '4px 10px',
              cursor: name.trim() ? 'pointer' : 'default',
            }}
          >OK</button>
        </div>
      )}

      {presets.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {presets.map(p => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10.5, color: '#cdd6e6',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999, padding: '3px 6px 3px 9px',
              }}
            >
              <button
                onClick={() => onLoad(p)}
                title="Cargar esta vista"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}
              >{p.name}</button>
              <button
                onClick={() => setPresets(deletePreset(p.id))}
                aria-label={`Eliminar vista ${p.name}`}
                title="Eliminar"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #8893a7)', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 13 }}
              >×</button>
            </span>
          ))}
        </div>
      ) : (
        !adding && (
          <p style={{ fontSize: 10, color: 'var(--text-muted, #8893a7)', margin: '7px 0 0', lineHeight: 1.4 }}>
            Activa capas y pulsa Guardar para crear una vista reutilizable.
          </p>
        )
      )}
    </div>
  )
}
