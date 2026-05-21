'use client'
/**
 * `<TabPlaceholder />` · placeholder común para Sprint M1.
 *
 * Cada tab que aún no está implementado renderiza este componente
 * mostrando: descripción · fuentes · sprint plan · ETA.
 */
import { useMacroDrawer } from '../MacroDrawerProvider'
import { getTab, type MacroTabId } from '@/lib/macro/sources-matrix'

interface TabPlaceholderProps {
  tabId: MacroTabId
  sprintLabel: string  // ej. "Sprint M2"
  sectionsPreview?: string[]
}

export function TabPlaceholder({ tabId, sprintLabel, sectionsPreview }: TabPlaceholderProps) {
  const { openDrill } = useMacroDrawer()
  const tab = getTab(tabId)

  const openSources = () => {
    openDrill({
      title: `Fuentes de ${tab.label}`,
      subtitle: 'METADATA · MACRO TAB',
      accent: tab.themeAccent,
      content: (
        <div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{tab.description}</p>
          <p style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginTop: 16, marginBottom: 8, letterSpacing: 0.6 }}>
            FUENTES OFICIALES
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
            {tab.sources.map((s, i) => (
              <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                  <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.cadence}</span>
                </div>
                {s.endpoint && (
                  <code style={{ fontSize: 10, color: tab.themeAccent, fontFamily: 'monospace', display: 'block', marginTop: 4 }}>
                    {s.endpoint}
                  </code>
                )}
              </li>
            ))}
          </ul>
        </div>
      ),
    })
  }

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10,
        padding: 28,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.8, margin: 0, textTransform: 'uppercase' }}>
            Tab {tab.number} · {tab.label}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '6px 0 0', letterSpacing: '-0.01em' }}>
            {tab.label}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 720 }}>
            {tab.description}
          </p>
        </div>
        <span style={{ fontSize: 11, padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 999, fontWeight: 700, letterSpacing: 0.4 }}>
          ⏳ Llega en {sprintLabel}
        </span>
      </header>

      {sectionsPreview && sectionsPreview.length > 0 && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 0.6, margin: '0 0 10px' }}>
            SECCIONES PREVISTAS
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
            {sectionsPreview.map((section, i) => (
              <li key={i} style={{ padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 8, color: '#0f172a' }}>
                <span style={{ color: tab.themeAccent, fontWeight: 700, flexShrink: 0 }}>{(i + 1).toString().padStart(2, '0')}.</span>
                <span>{section}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={openSources}
          style={{
            background: tab.themeAccent,
            color: '#fff',
            border: 0,
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Ver fuentes →
        </button>
      </div>
    </section>
  )
}

export default TabPlaceholder
