'use client'
/**
 * <MaritimoShell /> · Sector Marítimo & Puertos
 *
 * Barra de navegación STICKY (estilo sectorial, replicando <EnergiaShell />:
 * sticky top:44, backdrop-blur, botones con borderBottom activo, glifos
 * Unicode) para usarse en TODAS las páginas de /puertos/*.
 *
 * A diferencia de EnergiaShell —que conmuta vistas con ?energia= en una sola
 * ruta— aquí cada pestaña es una ruta real (/puertos, /puertos/mapa, …), así
 * que usamos <Link href> y derivamos la pestaña activa de usePathname().
 *
 * NO incluye <AppHeader/>: cada página de /puertos lo monta por su cuenta.
 * Marca portuaria teal ACCENT '#0e7490'. Cero emojis (CLAUDE.md §0.5): solo
 * caracteres Unicode (◉ ⬡ ⛴ ◧ ⇄ ⚓ ◐ ◈).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Teal portuario · marca del sector marítimo. */
const ACCENT = '#0e7490'

interface MaritimoTab {
  /** Ruta exacta (href). La activa se resuelve comparando con usePathname(). */
  href: string
  label: string
  /** Marca Unicode (no emoji) para la barra. */
  glyph: string
}

const TABS: MaritimoTab[] = [
  { href: '/puertos',             label: 'Visión global',      glyph: '◉' },
  { href: '/puertos/mapa',        label: 'Mapa',               glyph: '⬡' },
  { href: '/puertos/buques',      label: 'Buques en vivo',     glyph: '⛴' },
  { href: '/puertos/cargo',       label: 'Cargo',              glyph: '◧' },
  { href: '/puertos/comercio',    label: 'Comercio bilateral', glyph: '⇄' },
  { href: '/puertos/rutas',       label: 'Navieras y rutas',   glyph: '⚓' },
  { href: '/puertos/fletes',      label: 'Fletes',             glyph: '◐' },
  { href: '/puertos/chokepoints', label: 'Corredores',         glyph: '◈' },
]

/**
 * Resuelve si `href` es la pestaña activa para el `pathname` actual.
 * - '/puertos' (raíz) → solo activa en match exacto (no en sub-rutas).
 * - El resto → activa en match exacto o cuando es prefijo de una sub-ruta
 *   (p. ej. /puertos/buques activo en /puertos/buques y /puertos/buques/xyz).
 */
function isActive(href: string, pathname: string): boolean {
  if (href === '/puertos') return pathname === '/puertos'
  return pathname === href || pathname.startsWith(href + '/')
}

interface MaritimoShellProps {
  /** Sub-título opcional renderizado bajo la barra (contexto de la página). */
  subtitle?: string
}

export default function MaritimoShell({ subtitle }: MaritimoShellProps) {
  const pathname = usePathname() ?? '/puertos'

  return (
    <>
      {/* ───── Barra sticky · sección marítima (estilo sectorial) ───── */}
      <nav
        aria-label="Sector marítimo y puertos"
        style={{
          position: 'sticky', top: 44, zIndex: 40,
          background: 'rgba(251,251,253,0.92)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div style={{
          maxWidth: 1500, margin: '0 auto', padding: '0 28px',
          display: 'flex', alignItems: 'stretch', gap: 0,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(t => {
            const active = isActive(t.href, pathname)
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '12px 16px', fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? ACCENT : '#6e6e73',
                  background: 'none', textDecoration: 'none',
                  borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                  whiteSpace: 'nowrap', marginBottom: -1,
                  fontFamily: 'var(--font-text)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ───── Sub-título opcional · contexto de la página ───── */}
      {subtitle && (
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '14px 28px 0' }}>
          <p style={{
            margin: 0, fontSize: 12.5, color: '#6e6e73',
            fontFamily: 'var(--font-text)',
          }}>
            {subtitle}
          </p>
        </div>
      )}
    </>
  )
}
