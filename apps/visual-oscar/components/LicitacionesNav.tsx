'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/licitaciones',          label: 'Buscador' },
  { href: '/licitaciones/empresas', label: 'Empresas adjudicatarias' },
  { href: '/licitaciones/organos',  label: 'Órganos contratantes' },
  { href: '/licitaciones/cpv',      label: 'Sectores (CPV)' },
  { href: '/licitaciones/metodologia', label: 'Metodología' },
] as const

export default function LicitacionesNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      display:'inline-flex', background:'#F5F5F7', borderRadius:999,
      padding:3, marginBottom:14, flexWrap:'wrap', gap:0,
    }}>
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href} style={{
            background: active ? '#fff' : 'transparent',
            color: active ? '#1d1d1f' : '#6e6e73',
            borderRadius:999, padding:'7px 14px',
            fontSize:12, fontWeight: active ? 700 : 500,
            fontFamily:'inherit', textDecoration:'none',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
