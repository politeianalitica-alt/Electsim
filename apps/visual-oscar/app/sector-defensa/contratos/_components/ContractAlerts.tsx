'use client'

import { useState } from 'react'

interface AlertRule {
  id: string
  label: string
  minM: number
  fuentes: string[]
  keywords: string
  active: boolean
}

const DEFAULT_RULES: AlertRule[] = [
  { id: '1', label: 'Contratos >100M€ cualquier fuente', minM: 100, fuentes: ['all'], keywords: '', active: true },
  { id: '2', label: 'DoD USA >500M USD',                  minM: 500, fuentes: ['USASPENDING'], keywords: '', active: false },
  { id: '3', label: 'Contratos Indra / Navantia',         minM: 0,   fuentes: ['all'], keywords: 'indra navantia airbus', active: false },
]

export function ContractAlerts() {
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES)
  const [showForm, setShowForm] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newMinM, setNewMinM] = useState(50)

  function toggle(id: string) {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, active: !rule.active } : rule))
  }

  function addRule() {
    if (!newKeyword.trim() && newMinM === 0) return
    setRules(r => [...r, {
      id: String(Date.now()),
      label: newKeyword.trim() ? `"${newKeyword.trim()}" >${newMinM}M` : `Contratos >${newMinM}M`,
      minM: newMinM, fuentes: ['all'], keywords: newKeyword.trim(), active: true,
    }])
    setNewKeyword(''); setNewMinM(50); setShowForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>Alertas de contratos</div>
          <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>Notificación automática cuando se publique un contrato que cumpla los criterios</div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: '1px solid #1d1d1f', background: '#1d1d1f', color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Nueva alerta
        </button>
      </div>

      {showForm && (
        <div style={{
          padding: '14px 16px', background: '#F9FAFB', border: '1px solid #ECECEF',
          borderRadius: 10, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', display: 'block', marginBottom: 4 }}>Palabras clave</label>
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="indra, navantia, FCAS…"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #DDDDE3', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', display: 'block', marginBottom: 4 }}>Importe mínimo (M)</label>
            <input
              type="number" min={0} value={newMinM}
              onChange={e => setNewMinM(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #DDDDE3', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addRule} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', background: '#1F4E8C', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Crear</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1px solid #DDDDE3', background: '#fff', color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{
            padding: '10px 14px', background: rule.active ? '#F0FDF4' : '#FAFAFA',
            border: `1px solid ${rule.active ? '#BBF7D0' : '#ECECEF'}`,
            borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{rule.label}</div>
              <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 2 }}>
                Fuentes: {rule.fuentes.join(', ')} · Mínimo: {rule.minM}M
                {rule.keywords && ` · Keywords: "${rule.keywords}"`}
              </div>
            </div>
            <button
              onClick={() => toggle(rule.id)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: rule.active ? '#16A34A' : '#DDDDE3',
                border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: rule.active ? 20 : 3,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: '#86868b', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
        Las notificaciones por email se activarán cuando el ContractRadar Agent esté operativo (próximamente).
      </div>
    </div>
  )
}
