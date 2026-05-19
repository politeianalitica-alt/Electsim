'use client'
/**
 * <KeyHint /> · render consistente de teclas de atajo (Cmd+K, ↑↓, Enter).
 *
 * Reemplaza los múltiples `<kbd style={{ fontSize: 10, padding: '1px 5px', … }}>`
 * repartidos por todo el frontend (5+ definiciones distintas) con UN sólo
 * componente tokenizado.
 *
 * Auto-detecta plataforma para mostrar ⌘ o Ctrl según el OS del visitante
 * (sólo cliente, fallback ⌘ en SSR).
 *
 * Uso:
 *   <KeyHint keys={['cmd', 'k']} />
 *   <KeyHint keys={['esc']} />
 *   <KeyHint keys={['enter']} label="enviar" />
 */
import { useEffect, useState } from 'react'

export interface KeyHintProps {
  keys: ReadonlyArray<string>
  label?: string
  variant?: 'default' | 'subtle'
}

const KEY_GLYPH: Record<string, string> = {
  cmd: '⌘',
  ctrl: 'Ctrl',
  shift: '⇧',
  alt: '⌥',
  option: '⌥',
  enter: '↵',
  return: '↵',
  esc: 'Esc',
  escape: 'Esc',
  tab: 'Tab',
  space: 'Space',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  backspace: '⌫',
  delete: 'Del',
}

function renderKey(k: string, isMac: boolean): string {
  if (k.toLowerCase() === 'cmd') return isMac ? '⌘' : 'Ctrl'
  return KEY_GLYPH[k.toLowerCase()] ?? k.toUpperCase()
}

export function KeyHint({ keys, label, variant = 'default' }: KeyHintProps) {
  const [isMac, setIsMac] = useState(true)
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || ''))
    }
  }, [])

  const subtle = variant === 'subtle'
  const kbdStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-mono)',
    padding: '1px var(--space-2)',
    background: subtle ? 'transparent' : 'var(--color-surface-sunken)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--color-ink-3)',
    fontWeight: 600,
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
      {keys.map((k, i) => (
        <kbd key={`${k}-${i}`} style={kbdStyle}>{renderKey(k, isMac)}</kbd>
      ))}
      {label && (
        <span style={{
          marginLeft: 'var(--space-1)',
          fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)',
        }}>{label}</span>
      )}
    </span>
  )
}
