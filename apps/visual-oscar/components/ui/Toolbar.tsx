'use client'
/**
 * <Toolbar /> · barra horizontal de filtros, acciones y meta.
 *
 * Patrón visto repetidamente en la app: una fila con filtros a la izquierda,
 * meta/count en el centro, acciones a la derecha. Tokenizado.
 *
 * Uso:
 *   <Toolbar>
 *     <Toolbar.Group>
 *       <input ... />
 *       <PillSelect ... />
 *     </Toolbar.Group>
 *     <Toolbar.Spacer />
 *     <Toolbar.Group>
 *       <span>12 resultados</span>
 *       <button>Crear</button>
 *     </Toolbar.Group>
 *   </Toolbar>
 */
import { CSSProperties, ReactNode } from 'react'

export interface ToolbarProps {
  children: ReactNode
  variant?: 'default' | 'sunken' | 'transparent'
  size?: 'sm' | 'md'
  className?: string
}

const VARIANT_STYLES: Record<NonNullable<ToolbarProps['variant']>, CSSProperties> = {
  default: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-hairline)',
  },
  sunken: {
    background: 'var(--color-surface-sunken)',
    border: '1px solid var(--color-hairline-soft)',
  },
  transparent: {
    background: 'transparent',
    border: 'none',
  },
}

const SIZE_STYLES: Record<NonNullable<ToolbarProps['size']>, CSSProperties> = {
  sm: { padding: 'var(--space-2) var(--space-3)', gap: 'var(--space-2)' },
  md: { padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-3)' },
}

function ToolbarRoot({ children, variant = 'default', size = 'md', className }: ToolbarProps) {
  return (
    <div className={className} style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap',
      borderRadius: 'var(--radius-md)',
      ...VARIANT_STYLES[variant],
      ...SIZE_STYLES[size],
    }}>
      {children}
    </div>
  )
}

function ToolbarGroup({ children, gap = 'var(--space-2)' }: { children: ReactNode; gap?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      {children}
    </div>
  )
}

function ToolbarSpacer() {
  return <div style={{ flex: 1 }} />
}

function ToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{
      fontSize: 'var(--text-xs)', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--color-ink-4)',
    }}>
      {children}
    </span>
  )
}

export const Toolbar = Object.assign(ToolbarRoot, {
  Group: ToolbarGroup,
  Spacer: ToolbarSpacer,
  Label: ToolbarLabel,
})
