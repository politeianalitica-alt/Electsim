'use client'
/**
 * /mapa-espana · Mapa dedicado de España. Solo datos de España: infraestructura
 * curada (ciudades, nucleares, refinerías, GNL, presas, aeropuertos, puertos) +
 * clima dinámico por ciudad (calidad del aire / temperatura, Open-Meteo).
 * Mapa MapLibre independiente del OSINT global. Client-side (ssr:false).
 */
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

const MapaEspana = dynamic(() => import('@/components/espana/MapaEspana'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed', inset: '44px 0 0 0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#04040A', color: '#1F4E8C',
      fontFamily: 'system-ui, sans-serif', letterSpacing: '0.2em', fontSize: 12, textTransform: 'uppercase',
    }}>
      Cargando mapa de España…
    </div>
  ),
})

export default function MapaEspanaPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <>
      <AppHeader />
      <div style={{ position: 'fixed', inset: '44px 0 0 0' }}>
        <MapaEspana />
      </div>
    </>
  )
}
