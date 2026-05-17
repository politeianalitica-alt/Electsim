'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/sector-defensa',                label: 'Situación',     description: 'Sala de mando macro',                                   exact: true  },
  { href: '/sector-defensa/paises',         label: 'Países',        description: 'Catálogo militar mundial (36 ejércitos)',               exact: false },
  { href: '/sector-defensa/ministerios',    label: 'Ministerios',   description: 'Estructura ministerios de defensa + agencias',          exact: false },
  { href: '/sector-defensa/teatros',        label: 'Teatros',       description: 'Balance de poder por área operacional',                 exact: false },
  { href: '/sector-defensa/oportunidades',  label: 'Oportunidades', description: 'Programas activos · ventanas competitivas globales',    exact: false },
  { href: '/sector-defensa/contratos',      label: 'Contratos',     description: 'Monitor de licitaciones y adjudicaciones',              exact: false },
  { href: '/sector-defensa/presupuestos',   label: 'Presupuestos',  description: 'Gasto militar por país y tendencias',                   exact: false },
  { href: '/sector-defensa/programas',      label: 'Programas',     description: 'Adquisiciones y cadena de suministro',                  exact: false },
  { href: '/sector-defensa/regulatorio',    label: 'Regulatorio',   description: 'ITAR · EAR · Sanciones · Compliance',                   exact: false },
]

export function DefenseTabNav() {
  const pathname = usePathname()

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 44,
        zIndex: 40,
        background: 'rgba(251,251,253,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          margin: '0 auto',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.description}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '13px 16px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#1d1d1f' : '#6e6e73',
                textDecoration: 'none',
                borderBottom: active
                  ? '2px solid #1d1d1f'
                  : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: -1,
                fontFamily: 'var(--font-text)',
              }}
            >
              {tab.label}
            </Link>
          )
        })}

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 16,
            fontSize: 10.5,
            color: '#86868b',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#34D399',
              boxShadow: '0 0 6px #34D399',
              display: 'inline-block',
            }}
          />
          Banco Mundial · TED · PLACSP · SIPRI
        </div>
      </div>
    </div>
  )
}
