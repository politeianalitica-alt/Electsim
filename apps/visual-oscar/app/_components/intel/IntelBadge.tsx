'use client'
import { CSSProperties, ReactNode } from 'react'

export interface IntelBadgeProps {
  children: ReactNode
  color?: string
  background?: string
  variant?: 'soft' | 'solid' | 'outline'
  size?: 'xs' | 'sm' | 'md'
}

export default function IntelBadge({ children, color = '#1F4E8C', background, variant = 'soft', size = 'sm' }: IntelBadgeProps) {
  const paddings = size === 'xs' ? '2px 6px' : size === 'md' ? '4px 12px' : '3px 10px'
  const fontSize = size === 'xs' ? 9.5 : size === 'md' ? 11.5 : 10.5
  const bg = background ?? (variant === 'solid' ? color : variant === 'outline' ? 'transparent' : `${color}15`)
  const text = variant === 'solid' ? '#fff' : color
  const border = variant === 'outline' ? `1px solid ${color}` : 'none'
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: paddings, borderRadius: 999,
    fontSize, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
    color: text, background: bg, border, lineHeight: 1.4,
  }
  return <span style={style}>{children}</span>
}
