'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AppHeader from './AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { moduleOfPath, itemOfPath } from './navigation'

export default function PlaceholderPage({ description }: { description?: string }) {
  const router = useRouter()
  const path = usePathname() || ''
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const mod = moduleOfPath(path)
  const it = itemOfPath(path)

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
 <section style={{ background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)', borderRadius: 20, padding: '34px 40px', color: '#fff', marginBottom: 22 }}>
 <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, margin: '0 0 8px' }}>
            {mod?.label || 'Politeia Analítica'}
 </p>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.1 }}>
            {it?.label || 'Sección'}
 </h1>
 <p style={{ fontSize: 13, opacity: 0.75, margin: 0, maxWidth: 640 }}>
            {description || 'Esta sección está en desarrollo. Pronto integrará datos en vivo y análisis específicos del módulo.'}
 </p>
 </section>

 <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
 <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(31,78,140,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1F4E8C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
 <rect x="3" y="3" width="18" height="18" rx="3"/>
 <path d="M9 8 L15 8 M9 12 L15 12 M9 16 L13 16"/>
 </svg>
 </div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.014em', margin: '0 0 6px' }}>Próximamente</h2>
 <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 auto', maxWidth: 480, lineHeight: 1.55 }}>
            Esta vista forma parte del módulo <strong style={{ color: '#1d1d1f' }}>{mod?.label}</strong>. El equipo de Politeia Analítica está integrando los datos y visualizaciones correspondientes.
 </p>
          {mod && mod.items.length > 1 && (
 <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #ECECEF', fontSize: 11.5, color: '#86868b' }}>
              Otras vistas del módulo: {mod.items.filter(i => i.href !== path).map(i => i.label).join(' · ')}
 </div>
          )}
 </div>
 </main>
 <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Datos ficticios con fines demostrativos · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}
