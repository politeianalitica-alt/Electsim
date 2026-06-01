'use client'
/**
 * /osint-global · OSINT Global (mapa de inteligencia OSIRIS portado)
 *
 * Mapa táctico MapLibre a pantalla completa bajo el AppHeader de Politeia,
 * con todas las capas (vuelos, CCTV, sismos, incendios, marítimo, satélites,
 * ciber/CVE, sanciones, conflictos, etc.). Estilos OSIRIS aislados en
 * ./osiris.css bajo el contenedor .osiris-root para no contaminar el resto
 * de Politeia. El dashboard se carga client-side (ssr:false) porque MapLibre
 * necesita `window`.
 */
import './osiris.css'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

const OsirisDashboard = dynamic(() => import('@/components/osiris/OsirisDashboard'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed', inset: '44px 0 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#04040A', color: '#D4AF37',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.25em', fontSize: 12, textTransform: 'uppercase',
      }}
    >
      Inicializando OSINT Global…
    </div>
  ),
})

export default function OsintGlobalPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <>
      <AppHeader />
      <OsirisDashboard />
    </>
  )
}
