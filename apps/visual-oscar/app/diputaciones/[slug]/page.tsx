'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Detalle unificado en /dosieres/[slug] · esta ruta queda como
// redirect para no romper deeplinks históricos.
export default function DiputacionesSlugRedirect() {
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
