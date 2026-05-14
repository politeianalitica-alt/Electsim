'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './DomoSidebar.module.css'

interface NavItem {
  href:   string
  label:  string
  glyph:  string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/domo',            label: 'Inicio',        glyph: '⬡', exact: true },
  { href: '/domo/fuentes',    label: 'Fuentes',       glyph: '⇡' },
  { href: '/domo/pipeline',   label: 'Pipelines',     glyph: '⟶' },
  { href: '/domo/warehouse',  label: 'Warehouse',     glyph: '◫' },
  { href: '/domo/dataset',    label: 'Datasets',      glyph: '⊞' },
  { href: '/domo/dashboard',  label: 'Dashboards',    glyph: '⊟' },
  { href: '/domo/charts',     label: 'Charts',        glyph: '▋' },
  { href: '/domo/alertas',    label: 'Alertas',       glyph: '◇' },
  { href: '/domo/jobs',       label: 'Jobs',          glyph: '⚙' },
  { href: '/domo/governance', label: 'Gobernanza',    glyph: '✓' },
  { href: '/domo/ai-query',   label: 'AI Query',      glyph: '✦' },
]

export default function DomoSidebar() {
  const pathname = usePathname()

  return (
    <nav className={styles.sidebar} aria-label="Navegación Domo">
      <div className={styles.sidebarHeader}>
        <span className={styles.logo}>⬡</span>
        <span className={styles.logoText}>Domo</span>
      </div>

      <ul className={styles.navList}>
        {NAV_ITEMS.map(item => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href) ?? false
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.glyph}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className={styles.sidebarFooter}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Volver a Politeia
        </Link>
      </div>
    </nav>
  )
}
