'use client'
import { CSSProperties } from 'react'

export type SettingsTab = 'perfil' | 'workspace' | 'fuentes' | 'equipo'

const LABELS: Record<SettingsTab, string> = {
  perfil: 'Perfil', workspace: 'Workspace', fuentes: 'Fuentes', equipo: 'Equipo',
}

export interface SettingsTabsProps {
  active: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export default function SettingsTabs({ active, onChange }: SettingsTabsProps) {
  const wrap: CSSProperties = {
    background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
    padding: 4, display: 'inline-flex', gap: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }
  const tabs: SettingsTab[] = ['perfil', 'workspace', 'fuentes', 'equipo']
  return (
 <div style={wrap}>
      {tabs.map(t => {
        const isActive = active === t
        const style: CSSProperties = {
          padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: isActive ? '#1F4E8C' : 'transparent',
          color: isActive ? '#fff' : '#3a3a3d',
          fontSize: 12.5, fontWeight: isActive ? 600 : 500, fontFamily: 'inherit',
          letterSpacing: '-0.005em',
        }
        return <button key={t} type="button" style={style} onClick={() => onChange(t)}>{LABELS[t]}</button>
      })}
 </div>
  )
}
