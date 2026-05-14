'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './DomoSidebar.module.css'

interface NavItem {
  href:    string
  label:   string
  glyph:   string
  exact?:  boolean
  group?:  string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/domo',                 label: 'Inicio',        glyph: '⬡', exact: true },

  // Data layer
  { href: '/domo/fuentes',         label: 'Fuentes',       glyph: '⇡', group: 'Datos' },
  { href: '/domo/pipeline',        label: 'Pipelines',     glyph: '⟶' },
  { href: '/domo/dataset',         label: 'Datasets',      glyph: '⊞' },
  { href: '/domo/warehouse',       label: 'Warehouse',     glyph: '◫' },

  // Insights layer
  { href: '/domo/dashboard',       label: 'Dashboards',    glyph: '⊟', group: 'Análisis' },
  { href: '/domo/charts',          label: 'Charts',        glyph: '▋' },
  { href: '/domo/query',           label: 'AI Query',      glyph: '✦' },

  // Ops layer
  { href: '/domo/alertas',         label: 'Alertas',       glyph: '!',  group: 'Operación' },
  { href: '/domo/notificaciones',  label: 'Notificaciones',glyph: '◐' },
  { href: '/domo/jobs',            label: 'Jobs',          glyph: '⚙' },
  { href: '/domo/health',          label: 'Health',        glyph: '◉' },

  // Admin layer
  { href: '/domo/gobernanza',      label: 'Gobernanza',    glyph: '✓', group: 'Admin' },
]

export default function DomoSidebar() {
  const pathname = usePathname()

  // Agrupa los items para mostrar separadores
  const groups: Array<{ name?: string; items: NavItem[] }> = []
  NAV_ITEMS.forEach(item => {
    if (item.group) groups.push({ name: item.group, items: [item] })
    else if (groups.length === 0) groups.push({ items: [item] })
    else groups[groups.length - 1].items.push(item)
  })

  return (
    <nav className={styles.sidebar} aria-label="Navegación Domo">
      <div className={styles.sidebarHeader}>
        <span className={styles.logo}>⬡</span>
        <span className={styles.logoText}>Domo</span>
      </div>

      <div className={styles.navList}>
        {groups.map((g, gi) => (
          <div key={gi} className={styles.navGroup}>
            {g.name && <div className={styles.navGroupLabel}>{g.name}</div>}
            <ul className={styles.navUl}>
              {g.items.map(item => {
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
          </div>
        ))}
      </div>

      <div className={styles.sidebarFooter}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Volver a Politeia
        </Link>
      </div>
    </nav>
  )
}
