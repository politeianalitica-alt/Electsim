'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import RiskIntelligence from '@/components/RiskIntelligence'

export default function RiesgoPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
        <header style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Inteligencia · Risk Index
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 4px', color: '#1d1d1f' }}>
            Termómetro político
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, maxWidth: 880 }}>
            Motor <strong>live</strong> · marco ICRG adaptado + Pedersen + Kleinberg burst + EWMA + z-score
            sobre 414 fuentes y análisis del Brain en tiempo real. Las 6 dimensiones (institucional, electoral,
            geopolítico, económico, mediático y social) se actualizan continuamente desde feeds públicos.
          </p>
        </header>

        <RiskIntelligence/>
      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '22px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Politeia Analítica · Risk Intelligence v2.0 · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
