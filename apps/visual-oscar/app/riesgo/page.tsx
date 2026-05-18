'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import RiskIntelligence from '@/components/RiskIntelligence'
import RiskV2Dashboard from '@/components/RiskV2Dashboard'

type View = 'live' | 'estructural'

export default function RiesgoPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('estructural')

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
            Dos lecturas complementarias del riesgo país. El motor <strong>estructural</strong> compone 6 índices DB-driven
            (institucional, electoral, geopolítico, económico, mediático, social) con fuentes externas (GPR, ACLED, V-Dem,
            WGI, RSUI, EPU, BCE, CIS…) y predicciones ML. El motor <strong>live</strong> aplica ICRG + Kleinberg + EWMA + z-score
            sobre 414 fuentes y análisis del Brain en tiempo real.
          </p>
        </header>

        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, marginBottom: 14 }}>
          <button onClick={() => setView('estructural')} style={{
            background: view === 'estructural' ? '#fff' : 'transparent',
            color: view === 'estructural' ? '#1d1d1f' : '#6e6e73',
            border: 'none', borderRadius: 999, padding: '7px 16px',
            fontSize: 12, fontWeight: view === 'estructural' ? 700 : 500, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: view === 'estructural' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>
          Motor estructural (DB-driven · 6 índices · ML)
          </button>
          <button onClick={() => setView('live')} style={{
            background: view === 'live' ? '#fff' : 'transparent',
            color: view === 'live' ? '#1d1d1f' : '#6e6e73',
            border: 'none', borderRadius: 999, padding: '7px 16px',
            fontSize: 12, fontWeight: view === 'live' ? 700 : 500, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: view === 'live' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>
          Motor live (composite ICRG + Ollama)
          </button>
        </div>

        {view === 'estructural' ? <RiskV2Dashboard country="ES" /> : <RiskIntelligence/>}
      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '22px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Politeia Analítica · Risk Intelligence v2.0 · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
