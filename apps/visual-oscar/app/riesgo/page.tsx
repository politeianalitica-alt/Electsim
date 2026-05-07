'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import RiskIntelligence from '@/components/RiskIntelligence'

/**
 * Página de riesgo dedicada — muestra el Politeia Risk Index en vista
 * extendida (mismo componente que en dashboard pero sin otras secciones).
 * Todos los datos son live · cero hardcode.
 */
export default function RiesgoPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
        <header style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Inteligencia · Risk Index
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 4px', color: '#1d1d1f' }}>
            Termómetro político
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            Marco metodológico ICRG adaptado · Pedersen volatility · Kleinberg burst · EWMA · z-score sobre baseline 30 días.
            Composite calculado en vivo desde 414 fuentes y análisis Ollama.
          </p>
        </header>
        <RiskIntelligence/>
      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '22px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Politeia Analítica · Risk Intelligence · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
