'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const HIDE_ON = ['/login', '/agente-ia']
const HIDE_PREFIX = ['/workspaces/']

export default function BottomAgenteBar() {
  const path = usePathname() || ''
  const [container, setContainer] = useState<HTMLElement | null>(null)

  // Crea/posiciona un slot vacío justo antes del <footer> de la página.
  // El portal renderiza el botón ahí, así React lo gestiona sin tocar el DOM directamente.
  useEffect(() => {
    if (HIDE_ON.includes(path) || HIDE_PREFIX.some(p => path.startsWith(p))) {
      setContainer(null)
      return
    }
    let slot = document.getElementById('agente-bar-slot') as HTMLDivElement | null
    const footer = document.querySelector('footer')
    if (!slot) {
      slot = document.createElement('div')
      slot.id = 'agente-bar-slot'
    }
    if (footer && footer.parentElement) {
      if (slot.nextSibling !== footer || slot.parentNode !== footer.parentElement) {
        footer.parentElement.insertBefore(slot, footer)
      }
    } else if (!slot.isConnected) {
      document.body.appendChild(slot)
    }
    setContainer(slot)
  }, [path])

  const hiddenByPrefix = HIDE_PREFIX.some(p => path.startsWith(p))
  if (HIDE_ON.includes(path) || hiddenByPrefix || !container) return null

  return createPortal(
    <Link href="/agente-ia" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      width: '100%',
      height: 28,
      background: '#1F4E8C',
      color: '#fff',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      fontFamily: 'inherit',
      transition: 'background 160ms',
      cursor: 'pointer',
    }}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
      </svg>
      AGENTE IA
      <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 2 }}>· pregúntame sobre los datos</span>
    </Link>,
    container
  )
}
