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
  { href: '/estudio',                 label: 'Inicio',                glyph: '⬡', exact: true },

  // Fuentes
  { href: '/estudio/fuentes',         label: 'Mis fuentes',           glyph: '⇡', group: 'Fuentes' },
  { href: '/estudio/pipeline',        label: 'Limpieza y cruces',     glyph: '⟶' },
  { href: '/estudio/dataset',         label: 'Mis tablas',            glyph: '⊞' },
  { href: '/estudio/warehouse',       label: 'Almacén',               glyph: '◫' },

  // Análisis
  { href: '/estudio/dashboard',       label: 'Mis paneles',           glyph: '⊟', group: 'Análisis' },
  { href: '/estudio/charts',          label: 'Galería de gráficos',   glyph: '▋' },
  { href: '/estudio/query',           label: 'Pregúntale a los datos',glyph: '' },

  // Vigilancia
  { href: '/estudio/alertas',         label: 'Vigilantes',            glyph: '!', group: 'Vigilancia' },
  { href: '/estudio/notificaciones',  label: 'Mis avisos',            glyph: '◐' },
  { href: '/estudio/jobs',            label: 'Histórico de tareas',   glyph: '' },
  { href: '/estudio/health',          label: 'Estado del sistema',    glyph: '◉' },

  // Equipo
  { href: '/estudio/gobernanza',      label: 'Equipo y permisos',     glyph: '', group: 'Equipo' },
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
 <nav className={styles.sidebar} aria-label="Navegación Estudio">
 <div className={styles.sidebarHeader}>
 <span className={styles.logo}>P</span>
 <span className={styles.logoText}>Estudio Politeia</span>
 <span className={styles.logoSubtext}>Workspace del analista</span>
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
