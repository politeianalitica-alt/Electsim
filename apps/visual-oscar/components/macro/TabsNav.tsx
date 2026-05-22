'use client'
/**
 * `<TabsNav />` · Sub-navegación 10 tabs sticky.
 *
 * - Pills horizontales con scroll-x en mobile
 * - Tab activo: pill blanca con sombra + border color del themeAccent
 * - Indicador numérico (1, 2, 3...) en cada pill
 * - Click cambia el activeId
 */
import { MACRO_TABS, MacroTabId } from '@/lib/macro/sources-matrix'

interface TabsNavProps {
  activeId: MacroTabId
  onChange: (id: MacroTabId) => void
}

export function TabsNav({ activeId, onChange }: TabsNavProps) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 0',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
        }}
        className="macro-tabs-scroll"
      >
        {MACRO_TABS.map((tab) => {
          const isActive = tab.id === activeId
          const pillStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid',
            borderColor: isActive ? tab.themeAccent : '#e5e7eb',
            background: isActive ? '#fff' : '#f9fafb',
            color: isActive ? tab.themeAccent : '#475569',
            fontWeight: isActive ? 700 : 500,
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            scrollSnapAlign: 'start',
            flexShrink: 0,
            boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 180ms ease',
            textDecoration: 'none',
          }
          const numberBadge = (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: isActive ? tab.themeAccent : '#e5e7eb',
                color: isActive ? '#fff' : '#64748b',
                fontSize: 10,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {tab.number}
            </span>
          )
          // Todas las 15 tabs renderizan inline en /macro?tab=...
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={pillStyle}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = tab.themeAccent
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              title={tab.description}
            >
              {numberBadge}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      <style jsx>{`
        .macro-tabs-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .macro-tabs-scroll::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
      `}</style>
    </nav>
  )
}

export default TabsNav
