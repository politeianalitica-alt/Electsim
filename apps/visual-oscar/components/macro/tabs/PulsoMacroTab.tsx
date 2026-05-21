'use client'
/**
 * `<PulsoMacroTab />` · Tab 1 · Pulso macro España.
 *
 * Crecimiento + PIB + producción + consumo + inversión + paro +
 * confianza + previsiones. Combina IMF DataMapper + INE CNT + Eurostat.
 */
import { CNTDesglosePanel } from '../CNTDesglosePanel'
import { ImfWeoForecast } from '../ImfWeoForecast'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

export function PulsoMacroTab() {
  const tab = getTab('pulso-macro')
  const { openDrill } = useMacroDrawer()

  const openSources = () => {
    openDrill({
      title: 'Fuentes · Pulso macro',
      subtitle: 'METADATA TAB · DATOS OFICIALES',
      accent: tab.themeAccent,
      content: (
        <div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            Esta pestaña combina <strong>4 fuentes oficiales</strong> para dibujar la coyuntura económica española en tiempo real:
          </p>
          <ul style={{ margin: '12px 0', padding: 0, listStyle: 'none', fontSize: 12 }}>
            {tab.sources.map((s, i) => (
              <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                  <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.cadence}</span>
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
            Drift entre fuentes: IMF y Eurostat pueden diferir en décimas por revisiones. Si la diferencia &gt; 0.5pp el card lo marca como "verify".
          </p>
        </div>
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header del tab */}
      <header style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            <span style={{ color: tab.themeAccent }}>Tab 1 ·</span> Pulso macro
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

      {/* INE CNT Desglose · grupo principal */}
      <CNTDesglosePanel />

      {/* IMF WEO Forecast · reusa componente existente */}
      <ImfWeoForecast />

      {/* Brain "Lectura Politeia" placeholder */}
      <section
        style={{
          background: '#f0fdfa',
          border: '1px solid #ccfbf1',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          El análisis automatizado de tendencias macro España (crecimiento real, paro, inflación, confianza, contribución de cada componente PIB) se activa en <strong>Sprint M6</strong>. Por ahora, los datos crudos arriba ofrecen la lectura directa de fuentes oficiales.
        </p>
      </section>
    </div>
  )
}

export default PulsoMacroTab
