'use client'

import { useState } from 'react'
import { WS } from '@/lib/workspace/workspace-utils'
import type { WorkspaceAutomation } from '@/types/workspace'
import { addUserAutomation } from '@/lib/workspace/automations-store'

const TRIGGERS = [
  'El risk score supera 70',
  'Llega un item al Inbox de fuente BOE',
  'Una publicación legislativa menciona una entidad seguida',
  'Se detecta un pico de menciones en medios',
  'Cada día laborable a las 8:00',
]

const ACTIONS: { label: string; category: WorkspaceAutomation['category'] }[] = [
  { label: 'Crear una alerta', category: 'alerts' },
  { label: 'Generar un briefing', category: 'reports' },
  { label: 'Notificar al equipo', category: 'alerts' },
  { label: 'Añadir al notebook', category: 'ingest' },
  { label: 'Lanzar una tarea del agente ARIA', category: 'agent' },
]

interface Props {
  workspaceId: string
  presetName?: string
  onClose: () => void
  onCreated: (list: WorkspaceAutomation[]) => void
}

export default function AutomationBuilder({ workspaceId, presetName = '', onClose, onCreated }: Props) {
  const [name, setName] = useState(presetName)
  const [trigger, setTrigger] = useState(TRIGGERS[0])
  const [actionIdx, setActionIdx] = useState(0)

  const save = () => {
    const action = ACTIONS[actionIdx]
    const list = addUserAutomation(workspaceId, {
      name: name || `${trigger} → ${action.label}`,
      triggerLabel: trigger,
      actionLabel: action.label,
      category: action.category,
    })
    onCreated(list)
    onClose()
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', fontSize: 13, padding: '9px 11px', borderRadius: 9,
    border: `1px solid ${WS.border}`, background: WS.surface, color: WS.ink, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: WS.ink3, marginBottom: 6, display: 'block',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: WS.surface, borderRadius: 16,
          border: `1px solid ${WS.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: 22,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: WS.ink, marginBottom: 2 }}>Nueva automatización</div>
        <div style={{ fontSize: 12.5, color: WS.ink3, marginBottom: 18 }}>Define un disparador y la acción que se ejecuta.</div>

        <label style={labelStyle}>Nombre (opcional)</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="p. ej. Aviso de riesgo alto"
          style={{ ...selectStyle, marginBottom: 14 }}
        />

        <label style={labelStyle}>Cuando… (disparador)</label>
        <select value={trigger} onChange={e => setTrigger(e.target.value)} style={{ ...selectStyle, marginBottom: 14 }}>
          {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label style={labelStyle}>Entonces… (acción)</label>
        <select value={actionIdx} onChange={e => setActionIdx(Number(e.target.value))} style={{ ...selectStyle, marginBottom: 20 }}>
          {ACTIONS.map((a, i) => <option key={a.label} value={i}>{a.label}</option>)}
        </select>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${WS.border}`, background: WS.surface, color: WS.ink2, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 9, border: 'none', background: WS.accent, color: '#fff', cursor: 'pointer' }}>Crear automatización</button>
        </div>
      </div>
    </div>
  )
}
