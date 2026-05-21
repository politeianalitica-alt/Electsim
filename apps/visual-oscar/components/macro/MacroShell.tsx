'use client'
/**
 * `<MacroShell />` · Layout wrapper de /macro.
 *
 * Renderiza:
 *  - Hero compacto (140px alto · termómetro + 4 KPIs flash + Briefing IA)
 *  - Sub-navegación 10 tabs sticky
 *  - Slot children para contenido del tab activo
 *  - MacroDrawer en el portal lateral
 *
 * Wraps con MacroDrawerProvider para que cualquier tab pueda abrir drawer.
 */
import { ReactNode } from 'react'
import { MacroDrawerProvider } from './MacroDrawerProvider'
import { MacroDrawer } from './MacroDrawer'
import { TabsNav } from './TabsNav'
import { MacroThermometer } from './MacroThermometer'
import { BriefingButton } from './BriefingButton'
import type { MacroTabId } from '@/lib/macro/sources-matrix'

interface FlashKPI {
  label: string
  value: string
  unit?: string
  direction?: 'up' | 'down' | 'flat'
}

interface MacroShellProps {
  activeId: MacroTabId
  onTabChange: (id: MacroTabId) => void
  thermometerScore: number
  flashKpis: FlashKPI[]
  children: ReactNode
}

export function MacroShell({
  activeId,
  onTabChange,
  thermometerScore,
  flashKpis,
  children,
}: MacroShellProps) {
  return (
    <MacroDrawerProvider>
      {/* Hero compacto */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0E2A1F 0%, #052016 100%)',
          color: '#fff',
          padding: '16px 28px',
          marginBottom: 0,
          borderRadius: 12,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 24,
          alignItems: 'center',
          minHeight: 100,
        }}
      >
        {/* Termómetro mini */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MacroThermometer value={thermometerScore} size="sm" showLabel={false} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase' }}>
              Termómetro macro
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 0', lineHeight: 1, color: '#fff' }}>
              {thermometerScore}
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>/100</span>
            </p>
          </div>
        </div>

        {/* 4 KPIs flash */}
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          {flashKpis.map((kpi) => {
            const color =
              kpi.direction === 'up'   ? '#86EFAC' :
              kpi.direction === 'down' ? '#FCA5A5' : 'rgba(255,255,255,0.85)'
            return (
              <div key={kpi.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.6, color: 'rgba(255,255,255,0.55)', margin: 0, textTransform: 'uppercase' }}>
                  {kpi.label}
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {kpi.value}
                  {kpi.unit && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}>{kpi.unit}</span>}
                </p>
              </div>
            )
          })}
        </div>

        {/* Briefing IA button */}
        <BriefingButton activeId={activeId} />
      </section>

      {/* Sub-nav 10 tabs sticky */}
      <TabsNav activeId={activeId} onChange={onTabChange} />

      {/* Contenido del tab activo */}
      <main>{children}</main>

      {/* Drawer lateral (portal) */}
      <MacroDrawer />
    </MacroDrawerProvider>
  )
}

export default MacroShell
