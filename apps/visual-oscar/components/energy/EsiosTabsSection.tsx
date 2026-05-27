'use client'
/**
 * <EsiosTabsSection /> · Sprint ESIOS-DEEP S6
 *
 * Sección consolidada con 9 sub-tabs de datos en tiempo real ESIOS.
 * Se inserta como un único bloque en /sector-energia reemplazando el
 * antiguo bloque plano EsiosLivePanel + EsiosHourlyChart.
 *
 *   - Pulso        · 6 KPIs · EsiosLivePanel
 *   - Precios      · heatmap 7×24 + comparativas · EsiosPreciosHeatmap
 *   - Mix          · stacked 10 tech + donut · EsiosMixStacked
 *   - Emisiones    · gCO2/kWh vs % renov · EsiosEmisionesChart
 *   - Demanda      · real vs prevista + 5 sistemas · EsiosDemandaRealVsPrevista
 *   - Intercambios · mapa Iberia + saldos 4 fronteras · EsiosIntercambiosMap
 *   - Predicciones · D+1 eólica/solar/renov/demanda · EsiosPrediccionesPanel
 *   - Ajustes (B2B)· banda sec/terc/desvíos/restricciones · EsiosAjustesPanel
 *   - No-Peninsular· Canarias/Baleares/Ceuta/Melilla · EsiosNoPeninsularPanel
 *   - Explorar     · drill-down · EsiosHistoricoExplorer
 *
 * Carga perezosa: cada tab solo monta su componente cuando se activa
 * (los componentes hacen su propio fetch en useEffect).
 *
 * Estado de tab en URL via ?esios=mix para deep-link.
 */
import { useState, useEffect, type ReactNode } from 'react'
import { EsiosLivePanel } from './EsiosLivePanel'
import { EsiosHourlyChart } from './EsiosHourlyChart'
import { EsiosPreciosHeatmap } from './EsiosPreciosHeatmap'
import { EsiosMixStacked } from './EsiosMixStacked'
import { EsiosEmisionesChart } from './EsiosEmisionesChart'
import { EsiosDemandaRealVsPrevista } from './EsiosDemandaRealVsPrevista'
import { EsiosIntercambiosMap } from './EsiosIntercambiosMap'
import { EsiosPrediccionesPanel } from './EsiosPrediccionesPanel'
import { EsiosAjustesPanel } from './EsiosAjustesPanel'
import { EsiosNoPeninsularPanel } from './EsiosNoPeninsularPanel'
import { EsiosHistoricoExplorer } from './EsiosHistoricoExplorer'

type TabId = 'pulso' | 'precios' | 'mix' | 'demanda' | 'intercambios' | 'predicciones' | 'ajustes' | 'no_peninsular' | 'explorar'

const TABS: Array<{ id: TabId; label: string; desc: string }> = [
  { id: 'pulso', label: 'Pulso', desc: '6 KPIs sistema' },
  { id: 'precios', label: 'Precios', desc: 'PVPC heatmap + spot' },
  { id: 'mix', label: 'Mix · Emisiones', desc: '10 tech + gCO2/kWh' },
  { id: 'demanda', label: 'Demanda', desc: 'Real vs prevista + 5 sistemas' },
  { id: 'intercambios', label: 'Intercambios', desc: 'Mapa 4 fronteras' },
  { id: 'predicciones', label: 'Predicciones D+1', desc: 'Eólica/solar/demanda' },
  { id: 'ajustes', label: 'Ajustes (B2B)', desc: 'Mercado regulación' },
  { id: 'no_peninsular', label: 'No Peninsular', desc: 'Can/Bal/Ceu/Mel' },
  { id: 'explorar', label: 'Explorar', desc: 'Drill-down · CSV' },
]

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'pulso'
  const u = new URL(window.location.href)
  const t = u.searchParams.get('esios') as TabId | null
  if (t && TABS.find((x) => x.id === t)) return t
  return 'pulso'
}

export function EsiosTabsSection() {
  const [tab, setTab] = useState<TabId>('pulso')

  useEffect(() => {
    setTab(getInitialTab())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    if (u.searchParams.get('esios') !== tab) {
      u.searchParams.set('esios', tab)
      window.history.replaceState({}, '', u.toString())
    }
  }, [tab])

  return (
    <section style={{ marginBottom: 14 }}>
      {/* Header explicativo */}
      <div style={{
        background: '#0f172a', borderRadius: '14px 14px 0 0',
        padding: '14px 18px', color: '#fff',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
          ESIOS · Sistema eléctrico español en directo
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          {TABS.length} vistas con datos oficiales del operador del sistema (REE) ·
          precios, demanda, mix renovable, intercambios internacionales, predicciones D+1,
          mercado de regulación y los 4 sistemas no peninsulares.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, background: '#fff',
        borderLeft: '1px solid #ECECEF', borderRight: '1px solid #ECECEF',
        borderBottom: '1px solid #ECECEF', overflowX: 'auto',
      }}>
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 14px', border: 'none',
                background: active ? '#fff' : '#f8fafc',
                borderBottom: active ? '2px solid #0891b2' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit', textAlign: 'left', minWidth: 110,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: active ? '#0f172a' : '#475569' }}>
                {t.label}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: active ? '#64748b' : '#94a3b8' }}>
                {t.desc}
              </p>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{
        background: '#f8fafc', padding: '14px',
        borderRadius: '0 0 14px 14px',
        border: '1px solid #ECECEF', borderTop: 'none',
      }}>
        {tab === 'pulso' && (
          <TabBlock>
            <EsiosLivePanel variant="dashboard" />
            <EsiosHourlyChart defaultSlug="pvpc" hours={48} />
          </TabBlock>
        )}
        {tab === 'precios' && (
          <TabBlock><EsiosPreciosHeatmap /></TabBlock>
        )}
        {tab === 'mix' && (
          <TabBlock>
            <EsiosMixStacked />
            <EsiosEmisionesChart />
          </TabBlock>
        )}
        {tab === 'demanda' && (
          <TabBlock><EsiosDemandaRealVsPrevista /></TabBlock>
        )}
        {tab === 'intercambios' && (
          <TabBlock><EsiosIntercambiosMap /></TabBlock>
        )}
        {tab === 'predicciones' && (
          <TabBlock><EsiosPrediccionesPanel /></TabBlock>
        )}
        {tab === 'ajustes' && (
          <TabBlock><EsiosAjustesPanel /></TabBlock>
        )}
        {tab === 'no_peninsular' && (
          <TabBlock><EsiosNoPeninsularPanel /></TabBlock>
        )}
        {tab === 'explorar' && (
          <TabBlock><EsiosHistoricoExplorer /></TabBlock>
        )}
      </div>
    </section>
  )
}

function TabBlock({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
}

export default EsiosTabsSection
