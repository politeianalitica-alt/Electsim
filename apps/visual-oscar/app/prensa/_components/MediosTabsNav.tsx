'use client'
/**
 * `<MediosTabsNav />` · Sub-navegación 10 tabs · scroll-snap mobile · sticky.
 * Inspirado en /macro TabsNav.
 */
import { MEDIOS_TABS, MediosTabId, MediosTab } from '@/lib/medios/sources-matrix'

export function MediosTabsNav({
  activeId,
  onTabChange,
}: {
  activeId: MediosTabId
  onTabChange: (id: MediosTabId) => void
}) {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 2,
        position: 'sticky',
        top: 60,
        zIndex: 20,
        background: '#fff',
        padding: '8px 0',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        marginBottom: 16,
      }}
    >
      {MEDIOS_TABS.map((t) => {
        const active = activeId === t.id
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            title={t.description}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              color: active ? '#fff' : '#3a3a3d',
              background: active ? '#1F4E8C' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              scrollSnapAlign: 'start',
              transition: 'all 150ms',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}

export function MediosSourceBadges({ tab }: { tab: MediosTab }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {tab.sources.map((s, i) => {
        const color =
          s.status === 'live' ? { bg: '#dcfce7', fg: '#166534', label: 'LIVE' } :
          s.status === 'planned' ? { bg: '#fef3c7', fg: '#92400e', label: 'PLANNED' } :
          { bg: '#e0e7ff', fg: '#3730a3', label: 'OPCIONAL' }
        return (
          <span
            key={i}
            title={s.endpoint || s.name}
            style={{
              fontSize: 10,
              padding: '3px 8px',
              background: color.bg,
              color: color.fg,
              borderRadius: 999,
              fontWeight: 600,
              letterSpacing: 0.3,
              display: 'inline-flex',
              gap: 4,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 800, opacity: 0.7 }}>{color.label}</span>
            <span>{s.name}</span>
          </span>
        )
      })}
    </div>
  )
}
