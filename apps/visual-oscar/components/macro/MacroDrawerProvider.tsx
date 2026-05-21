'use client'
/**
 * `<MacroDrawerProvider />` · Context para abrir/cerrar drawer lateral.
 *
 * Permite a cualquier componente del árbol `/macro` abrir el drawer con
 * cualquier contenido React, manteniendo un estado global.
 *
 * Uso:
 *   const { openDrill, close, isOpen } = useMacroDrawer()
 *   openDrill({
 *     title: 'PIB España',
 *     subtitle: 'IMF DataMapper · WEO Forecast',
 *     content: <IndicatorDrill code="NGDP_RPCH" source="imf" />,
 *     accent: '#0F766E'
 *   })
 */
import { createContext, useCallback, useContext, useState, ReactNode } from 'react'

export interface DrawerContent {
  title: string
  subtitle?: string
  content: ReactNode
  accent?: string  // hex color para el border-left del drawer
  source?: { name: string; url?: string; updatedAt?: string }
}

interface MacroDrawerCtx {
  isOpen: boolean
  content: DrawerContent | null
  openDrill: (content: DrawerContent) => void
  close: () => void
}

const MacroDrawerContext = createContext<MacroDrawerCtx | null>(null)

export function MacroDrawerProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DrawerContent | null>(null)

  const openDrill = useCallback((c: DrawerContent) => {
    setContent(c)
  }, [])

  const close = useCallback(() => {
    setContent(null)
  }, [])

  return (
    <MacroDrawerContext.Provider
      value={{ isOpen: content !== null, content, openDrill, close }}
    >
      {children}
    </MacroDrawerContext.Provider>
  )
}

export function useMacroDrawer(): MacroDrawerCtx {
  const ctx = useContext(MacroDrawerContext)
  if (!ctx) {
    // Fallback no-op para componentes usados fuera del provider
    return {
      isOpen: false,
      content: null,
      openDrill: () => {},
      close: () => {},
    }
  }
  return ctx
}
