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
import type { CCAARegionStat } from '@/lib/news-aggregator'
import type { NarrativeCluster } from '@/lib/medios/media-methodology'
import { FLAGS } from '@/lib/medios/feature-flags'

// Sprint 1.4 · feature flag preparado: cuando USE_CANONICAL_MAPAS esté
// activo en preview Vercel, datos territoriales futuros consumirán
// /api/medios/pulso?mode=REGION. Sprint 0+1 mantiene legacy intacto.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MAPAS_USES_CANONICAL = FLAGS.USE_CANONICAL_MAPAS

type MapaMode = 'espana' | 'global'

/**
 * Sprint G15-FIX C1+C3 · MapasImpacto ahora acepta datos del intel para
 * enriquecer el panel lateral de cada CCAA. Las props son opcionales para
 * mantener backward-compat con consumers que solo pasan defaultMode.
 *
 * - ccaaData          · stat por CCAA (volumen + sentimiento + topics)
 * - narrativeClusters · clusters detectados · filtrar por territorial_spread
 * - actorImpacts      · figuras/empresas con beneficial/harmful · filtrar
 *                       por menciones en artículos de medios locales
 *
 * En C3 estos props se pasan a IntelRegional vía contexto/props.
 */
interface Props {
  defaultMode?: MapaMode
  ccaaData?: Record<string, CCAARegionStat>
  narrativeClusters?: NarrativeCluster[]
  actorImpacts?: Array<{
    actor: string
    mentions: number
    dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
    beneficial: number
    harmful: number
    neutral: number
    uncertain: number
    sample_reasons: string[]
  }>
}

export function MapasImpacto({
  defaultMode = 'espana',
  ccaaData,
  narrativeClusters,
  actorImpacts,
}: Props) {
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
                : 'Modo GLOBAL · cada país/evento con volumen mediático + severidad + relevancia para España + relación con actores ES/UE + frame dominante + fuente principal + confianza + explicación breve. GDELT 24h + crisis humanitaria 30d.'}
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
            <LayerExplainer label="Volumen mediático" desc="Cuánto se habla del país/evento (GDELT + crisis humanitaria)" color="#0891b2" />
            <LayerExplainer label="Severidad" desc="Fatalities + intensidad UCDP + tono GDELT" color="#dc2626" />
            <LayerExplainer label="Relevancia España" desc="Exposición intereses ES (presencia, vínculos UE)" color="#1e40af" />
            <LayerExplainer label="Frame dominante" desc="Crisis · militar · diplomacia · humanitaria · ..." color="#7c3aed" />
          </div>
        )}
      </section>

      {/* Contenido según modo · Sprint G15-FIX C3: IntelRegional recibe los
          datos del intel para mostrar narrativas y actores por territorio
          en su panel lateral. Si los props vienen undefined, IntelRegional
          hace fallback a su propio fetch interno (backward-compat). */}
      {mode === 'espana'
        ? (
          <IntelRegional
            ccaaData={ccaaData}
            narrativeClusters={narrativeClusters}
            actorImpacts={actorImpacts}
          />
        )
        : <MapaNarrativasGlobal />
      }
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
