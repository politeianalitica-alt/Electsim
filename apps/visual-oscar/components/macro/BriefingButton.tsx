'use client'
/**
 * `<BriefingButton />` · botón "Briefing IA" en hero compacto.
 *
 * Click abre el drawer con análisis LLM del tab actual generado vía
 * /api/brain/copilot. Cachéa resultados 1h para no llamar varias veces.
 */
import { useState } from 'react'
import { useMacroDrawer } from './MacroDrawerProvider'
import { getTab, type MacroTabId } from '@/lib/macro/sources-matrix'

export function BriefingButton({ activeId }: { activeId: MacroTabId }) {
  const { openDrill } = useMacroDrawer()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    const tab = getTab(activeId)
    setLoading(true)
    // Abre drawer inmediatamente con estado loading
    openDrill({
      title: `Lectura Politeia · ${tab.label}`,
      subtitle: 'BRAIN IA · Análisis del analista virtual',
      accent: tab.themeAccent,
      content: <BriefingDrawerContent tabId={activeId} />,
      source: {
        name: 'Politeia Brain · Groq LLaMA 3.3 70B',
        updatedAt: 'just now',
      },
    })
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.5,
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
      }}
    >
      <span style={{ fontSize: 14 }}>◆</span>
      Briefing IA
    </button>
  )
}

function BriefingDrawerContent({ tabId }: { tabId: MacroTabId }) {
  const tab = getTab(tabId)
  // En Sprint M6 se hará fetch real a /api/brain/copilot
  // Por ahora muestra placeholder didáctico con fuentes del tab
  return (
    <div>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
        El asistente Politeia generará un análisis sintetizado de <strong>{tab.label}</strong> usando las fuentes oficiales activas en este tab. Esta función se activa en <strong>Sprint M6 · Polish + Brain</strong>.
      </p>

      <div style={{ background: '#f9fafb', borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
          FUENTES UTILIZADAS PARA EL BRIEFING
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, color: '#0f172a' }}>
          {tab.sources.map((s, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < tab.sources.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.cadence}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
        El briefing incluirá: estado actual (3 bullets) · tendencias clave (3 bullets) · riesgos detectados (2 bullets) · contexto político-electoral (2 bullets). Generado por LLM con disclaimer "generated_by_llm".
      </div>
    </div>
  )
}

export default BriefingButton
