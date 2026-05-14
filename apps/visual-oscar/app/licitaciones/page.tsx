'use client'
/**
 * /licitaciones · Buscador clon de buscalicitaciones.com
 *
 * Backend: Catalunya Open Data (1M+ contratos, Socrata SoQL) + PLACSP atom.
 * Filtros idénticos a buscalicitaciones.com.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import LicitacionesBuscador from '@/components/LicitacionesBuscador'
import LicitacionesNav from '@/components/LicitacionesNav'

export default function LicitacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#1F4E8C 0%,#0d1b2e 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
        }}>
          <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
            CONTRATACIÓN PÚBLICA · BUSCADOR EN VIVO
          </p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 8px', lineHeight:1.1 }}>
            Buscar licitaciones, adjudicaciones y contratos públicos <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en tiempo real</em>
          </h1>
          <p style={{ fontSize:13, opacity:0.75, margin:0, lineHeight:1.5, maxWidth:900 }}>
            Datos abiertos de la Generalitat de Catalunya (1M+ contratos · Socrata) + Plataforma Nacional (PLACSP atom).
            Mismo modelo que <a href="https://buscalicitaciones.com" target="_blank" rel="noreferrer" style={{ color:'#fcd34d', textDecoration:'underline' }}>buscalicitaciones.com</a> e
            inspirado en los parquets de <a href="https://github.com/BquantFinance/licitaciones-espana" target="_blank" rel="noreferrer" style={{ color:'#fcd34d', textDecoration:'underline' }}>BquantFinance/licitaciones-espana</a>.
          </p>
        </section>

        {/* ───── Subnav (Buscar / Empresas / Órganos / CPV / Metodología) ───── */}
        <LicitacionesNav/>

        {/* ───── Buscador ───── */}
        <LicitacionesBuscador/>
      </main>
    </div>
  )
}
