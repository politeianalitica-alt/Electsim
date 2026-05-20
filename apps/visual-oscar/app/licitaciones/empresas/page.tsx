'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import LicitacionesNav from '@/components/LicitacionesNav'
import LicitacionesScreener from '@/components/LicitacionesScreener'

export default function EmpresasScreenerPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
 <LicitacionesNav/>
 <LicitacionesScreener modo="empresas"/>
 </main>
 </div>
  )
}
