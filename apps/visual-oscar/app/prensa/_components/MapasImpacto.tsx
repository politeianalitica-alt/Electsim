'use client'
/**
 * <MapasImpacto /> · Sprint M3.
 *
 * Fusiona ex-Tab 3 "Mapa global narrativas" y ex-Tab 9 "Inteligencia
 * regional" en una sola tab con 2 modos: España/CCAA y Global.
 *
 * Reutiliza componentes existentes:
 *   - MapaNarrativasGlobal · modo Global · world map ACLED+GDELT
 *   - IntelRegional        · modo España/CCAA · drill ya rico
 *
 * Añade arriba un strip metodológico que documenta los 3 conceptos
 * que el endpoint /api/medios/ccaa ya distingue:
 *   - CCAA del medio · de dónde es la fuente
 *   - CCAA mencionada · qué territorio cita el texto
 *   - CCAA afectada · qué territorio sufre/se beneficia políticamente
 */

import { useState } from 'react'
import { MapaNarrativasGlobal } from './MapaNarrativasGlobal'
import { IntelRegional } from './IntelRegional'

type MapaMode = 'espana' | 'global'

export function MapasImpacto({ defaultMode = 'espana' }: { defaultMode?: MapaMode }) {
  const [mode, setMode] = useState<MapaMode>(defaultMode)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Selector modo + strip metodológico */}
      <section style={{
        background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981',
        borderRadius: 10, padding: 14,
      }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#10b981', textTransform: 'uppercase' }}>
              ◆ Mapas de impacto · narrative attribution
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
              {mode === 'espana'
                ? 'Modo ESPAÑA/CCAA · separa explícitamente CCAA del medio · CCAA mencionada en el contenido · CCAA políticamente afectada. No atribuye automáticamente una noticia a Andalucía sólo porque el medio sea andaluz si el contenido habla de Madrid.'
                : 'Modo GLOBAL · cada país/evento con volumen mediático + severidad + relevancia para España + relación con actores ES/UE + frame dominante + fuente principal + confianza + explicación breve. ACLED 30d + GDELT 24h.'}
            </p>
          </div>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 999, padding: 3 }}>
            {(['espana', 'global'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  background: mode === m ? '#10b981' : 'transparent',
                  color: mode === m ? '#fff' : '#475569',
                  border: 'none', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, padding: '5px 14px',
                  cursor: 'pointer', letterSpacing: 0.4, fontFamily: 'inherit',
                  textTransform: 'uppercase',
                }}
              >
                {m === 'espana' ? 'España · CCAA' : 'Global · mundo'}
              </button>
            ))}
          </div>
        </header>

        {/* Strip explicativo · qué representa cada capa */}
        {mode === 'espana' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
            <LayerExplainer label="CCAA del medio" desc="De dónde es la fuente · origen editorial" color="#84cc16" />
            <LayerExplainer label="CCAA mencionada" desc="Territorio citado en el texto · cobertura" color="#16a34a" />
            <LayerExplainer label="CCAA afectada" desc="Territorio políticamente impactado · consecuencia" color="#10b981" />
          </div>
        )}
        {mode === 'global' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
            <LayerExplainer label="Volumen mediático" desc="Cuánto se habla del país/evento (ACLED + GDELT)" color="#0891b2" />
            <LayerExplainer label="Severidad" desc="Fatalities + intensidad ACLED + tono GDELT" color="#dc2626" />
            <LayerExplainer label="Relevancia España" desc="Exposición intereses ES (presencia, vínculos UE)" color="#1e40af" />
            <LayerExplainer label="Frame dominante" desc="Crisis · militar · diplomacia · humanitaria · ..." color="#7c3aed" />
          </div>
        )}
      </section>

      {/* Contenido según modo */}
      {mode === 'espana' ? <IntelRegional /> : <MapaNarrativasGlobal />}
    </div>
  )
}

function LayerExplainer({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div style={{
      padding: 8, background: `${color}10`, borderLeft: `3px solid ${color}`, borderRadius: 4,
    }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color, textTransform: 'uppercase' }}>
        ◆ {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569', lineHeight: 1.4 }}>{desc}</p>
    </div>
  )
}

export default MapasImpacto
