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
        gap: 4,
        position: 'sticky',
        top: 60,
        zIndex: 20,
        background: '#fbfbfd',
        padding: '10px 0',
        borderBottom: '1px solid #ECECEF',
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
              background: active ? '#fff' : 'transparent',
              color: active ? t.themeAccent : '#475569',
              border: active ? `1.5px solid ${t.themeAccent}` : '1px solid transparent',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              scrollSnapAlign: 'start',
              transition: 'all 120ms ease',
              boxShadow: active ? `0 2px 8px ${t.themeAccent}22` : 'none',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: active ? t.themeAccent : '#e2e8f0',
                color: active ? '#fff' : '#64748b',
                fontSize: 10,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t.number}
            </span>
            <span>{t.label}</span>
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
