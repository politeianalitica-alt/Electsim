'use client'
import { CSSProperties } from 'react'

export type LevelKey = 'critico' | 'alto' | 'medio' | 'bajo'

const COLORS: Record<LevelKey, { bg: string; fg: string; label: string }> = {
  critico: { bg: 'rgba(220,38,38,0.10)', fg: '#DC2626', label: 'Critico' },
  alto: { bg: 'rgba(249,115,22,0.10)', fg: '#F97316', label: 'Alto' },
  medio: { bg: 'rgba(234,179,8,0.12)', fg: '#B45309', label: 'Medio' },
  bajo: { bg: 'rgba(22,163,74,0.10)', fg: '#16A34A', label: 'Bajo' },
}

export interface LevelPillProps { level: LevelKey; size?: 'sm' | 'md' }

export default function LevelPill({ level, size = 'sm' }: LevelPillProps) {
  const cfg = COLORS[level]
  const padding = size === 'md' ? '4px 12px' : '3px 10px'
  const fontSize = size === 'md' ? 11.5 : 10.5
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding, borderRadius: 999, fontSize, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: cfg.fg, background: cfg.bg,
  }
  return <span style={style}>{cfg.label}</span>
}
