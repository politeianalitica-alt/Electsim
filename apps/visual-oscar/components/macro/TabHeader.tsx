'use client'
/**
 * `<TabHeader />` · Header común para todos los tabs de /macro.
 */
import { useMacroDrawer } from './MacroDrawerProvider'
import { MacroTab } from '@/lib/macro/sources-matrix'

export function TabHeader({ tab }: { tab: MacroTab }) {
  const { openDrill } = useMacroDrawer()

  const openSources = () => {
    openDrill({
      title: `Fuentes · ${tab.label}`,
      subtitle: 'METADATA TAB · DATOS OFICIALES',
      accent: tab.themeAccent,
      content: (
        <div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            Esta pestaña combina <strong>{tab.sources.length} fuentes oficiales</strong> para dibujar la coyuntura económica española en tiempo real:
          </p>
          <ul style={{ margin: '12px 0', padding: 0, listStyle: 'none', fontSize: 12 }}>
            {tab.sources.map((s, i) => (
              <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                  <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {s.cadence}
                  </span>
                </div>
                {s.endpoint && (
                  <code style={{ fontSize: 10, color: tab.themeAccent, fontFamily: 'monospace' }}>
                    {s.endpoint}
                  </code>
                )}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 16 }}>
            Estas fuentes son APIs públicas (IMF, Eurostat, ECB, OEC, INE, BIS, Comtrade) sin coste de licencia. Los datos se cachean entre 1h y 24h según cadencia. Cuando una fuente falla, el card muestra estado <code>NO DATA</code> con motivo del error.
          </p>
        </div>
      ),
    })
  }

  return (
    <header style={{
      padding: '4px 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
          <span style={{ color: tab.themeAccent }}>Tab {tab.number} ·</span> {tab.label}
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', maxWidth: 720, lineHeight: 1.5 }}>
          {tab.description}
        </p>
      </div>
      <button
        onClick={openSources}
        style={{
          background: '#fff',
          border: `1px solid ${tab.themeAccent}`,
          color: tab.themeAccent,
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Ver {tab.sources.length} fuentes →
      </button>
    </header>
  )
}

export default TabHeader
