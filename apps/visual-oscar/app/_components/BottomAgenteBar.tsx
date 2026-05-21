'use client'
/**
 * BottomAgenteBar — barra fija al pie del viewport con acceso rápido al
 * Agente IA. Se ve igual en TODAS las páginas (independientemente de si
 * tienen <footer> o no, de si hay scroll o no).
 *
 * Antes usaba un portal que buscaba el <footer> de la página e
 * insertaba un slot justo antes — fallaba en páginas sin footer
 * (institucionales, workspace, …) y acababa pegada arriba del DOM.
 * Ahora es un `position: fixed` puro al `bottom: 0`.
 *
 * Para que el contenido de la página no quede tapado, el body recibe
 * un `padding-bottom` igual a la altura de la barra (28px) cuando es
 * visible. Cuando se oculta (login, agente-ia, /workspaces/*), se
 * retira el padding.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const HIDE_ON: readonly string[] = ['/login', '/agente-ia']
const HIDE_PREFIX: readonly string[] = ['/workspaces/']

const BAR_HEIGHT = 28

export default function BottomAgenteBar() {
  const path = usePathname() || ''
  const hidden = HIDE_ON.includes(path) || HIDE_PREFIX.some(p => path.startsWith(p))

  // Reserva espacio en el body para que el contenido no quede tapado por
  // la barra fija. Al desmontar/ocultar, lo quitamos.
  useEffect(() => {
    const body = document.body
    if (hidden) {
      body.style.removeProperty('padding-bottom')
    } else {
      body.style.paddingBottom = `${BAR_HEIGHT}px`
    }
    return () => { body.style.removeProperty('padding-bottom') }
  }, [hidden])

  // Limpieza one-time: si quedó algún slot del portal viejo en el DOM
  // (de versiones anteriores con createPortal), lo borramos para que no
  // siga apareciendo arriba en páginas sin footer.
  useEffect(() => {
    const stale = document.getElementById('agente-bar-slot')
    if (stale) stale.remove()
  }, [])

  if (hidden) return null

  return (
 <Link href="/agente-ia" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      height: BAR_HEIGHT,
      background: '#1F4E8C',
      color: '#fff',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      fontFamily: 'inherit',
      transition: 'background 160ms',
      cursor: 'pointer',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.10)',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#0F2A4F' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#1F4E8C' }}
    >
 <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
 <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
 </svg>
      AGENTE IA
 <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 2 }}>· pregúntame sobre los datos</span>
 </Link>
  )
}
