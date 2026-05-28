'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Detalle unificado: todos los dossieres (políticos del fixture +
// seeds IBEX 35 + seeds Diputaciones) comparten ahora la misma
// estética en /dosieres/[slug]. Esta ruta queda como redirect para
// no romper deeplinks históricos.
export default function Ibex35SlugRedirect() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''

  useEffect(() => {
    router.replace(slug ? `/dosieres/${slug}` : '/dosieres')
  }, [router, slug])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', color: '#86868b', fontSize: 13,
    }}>
      Redirigiendo a /dosieres/{slug}…
    </div>
  )
}
