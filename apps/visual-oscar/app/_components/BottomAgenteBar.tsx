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

const HIDE_ON: readonly string[] = ['/login', '/agente-ia', '/osint-global']
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

  // Sprint Quality-Q-B.3 · ahora la barra inferior aloja DOS accesos:
  //   1. AGENTE IA (centrado · primary) — sin cambios respecto a v1
  //   2. GLOSARIO (alineado a la derecha · secundario) — siempre visible para
  //      consultar acrónimos sin perder contexto.
  // Antes era un `<Link>` envolvente único; al añadir un segundo enlace
  // pasamos a un wrapper `<nav>` con flex-row + space-between. Resultado:
  // mismo visual centrado para "AGENTE IA" + glosario accesible al borde.
  return (
 <nav aria-label="Barra inferior" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      height: BAR_HEIGHT,
      background: '#1F4E8C',
      color: '#fff',
      fontSize: 11.5,
      fontFamily: 'inherit',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.10)',
      // padding lateral para que el link de glosario no toque el borde
      padding: '0 14px',
    }}>
 {/* Glosario (izquierda · secundario · siempre visible) */}
 <Link
        href="/glosario"
        aria-label="Abrir el glosario de términos del dashboard"
        style={{
          color: '#fff',
          opacity: 0.7,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textDecoration: 'none',
          transition: 'opacity 160ms',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
      >
        Glosario
 </Link>
 {/* Agente IA (centrado · primary) */}
 <Link
        href="/agente-ia"
        aria-label="Abrir el Agente IA"
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          color: '#fff',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'opacity 160ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
 <svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
 <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
 </svg>
        AGENTE IA
 <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 2 }}>· pregúntame sobre los datos</span>
 </Link>
 {/* Spacer para equilibrar visualmente al "Glosario" izquierdo · ancho fijo
     que aproxima el ancho del label "Glosario" para que el AGENTE IA quede
     ópticamente centrado. */}
 <span aria-hidden="true" style={{ width: 56, flexShrink: 0 }} />
 </nav>
  )
}
