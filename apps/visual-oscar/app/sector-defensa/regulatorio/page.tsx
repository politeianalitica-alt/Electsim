'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SanctionsSearch } from './_components/SanctionsSearch'
import { ExportControlHeatmap } from './_components/ExportControlHeatmap'
import { RegulatoryTimeline } from './_components/RegulatoryTimeline'
import { ComplianceChecker } from './_components/ComplianceChecker'
import { ExposureScoringCard } from './_components/ExposureScoring'

type Subtab = 'heatmap' | 'timeline' | 'sanciones' | 'compliance' | 'exposicion'

export default function RegulatorioPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [subtab, setSubtab] = useState<Subtab>('heatmap')

  return (
    <div style={{ paddingTop: 24 }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSA · REGULATORIO & COMPLIANCE
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Control de exportaciones y sanciones
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          ITAR · EAR · Reglamento EU 2021/821 · Sanciones OFAC / EU FSF / ONU · Legislación española
        </p>
      </div>

      {/* DISCLAIMER */}
      <div style={{ padding: '10px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 18, fontSize: 11.5, color: '#92400E' }}>
        <strong>Aviso legal:</strong> La información de esta sección es orientativa y no constituye asesoramiento jurídico. Consulte siempre con un experto en control de exportaciones para operaciones reales.
      </div>

      {/* SUB-TABS */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ECECEF', marginBottom: 16 }}>
        {([
          { id: 'heatmap',    label: 'Heatmap ITAR/EAR' },
          { id: 'exposicion', label: 'Exposición empresas ES' },
          { id: 'timeline',   label: 'Normativa' },
          { id: 'sanciones',  label: 'Sanciones' },
          { id: 'compliance', label: 'Compliance Checker' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id)}
            style={{
              padding: '9px 16px', fontSize: 12.5, fontWeight: subtab === t.id ? 600 : 400,
              color: subtab === t.id ? '#1d1d1f' : '#6e6e73',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${subtab === t.id ? '#1d1d1f' : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* HEATMAP TAB */}
      {subtab === 'heatmap' && (
        <Panel
          title="Export Control Heatmap · País × Tecnología"
          subtitle="Nivel de restricción ITAR/EAR/EU por país de destino y tipo de tecnología de defensa · Hover para detalles"
          sourceUrl="https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M"
          sourceLabel="ITAR 22 CFR"
          sourceTooltip="ITAR + EAR + EU 2021/821 + OFAC SDN"
        >
          <ExportControlHeatmap />
        </Panel>
      )}

      {/* EXPOSICIÓN TAB */}
      {subtab === 'exposicion' && (
        <Panel
          title="Scoring de exposición regulatoria · empresas españolas"
          subtitle="Evaluación multifactor de las 11 empresas tractoras del sector · ITAR + EAR + EU 2021/821 + Sanciones + Exportación"
          sourceLabel="Análisis Politeia"
          sourceTooltip="Heurística sobre perfil sectorial público — orientativo"
        >
          <ExposureScoringCard/>
        </Panel>
      )}

      {/* TIMELINE TAB */}
      {subtab === 'timeline' && (
        <Panel
          title="Timeline de normativa · Actualizaciones recientes"
          subtitle="ITAR · EAR · Reglamento UE · Sanciones · OTAN · Legislación española · Click para expandir cada norma"
          sourceUrl="https://eur-lex.europa.eu"
          sourceLabel="EUR-Lex + BOE + OFAC"
          sourceTooltip="EUR-Lex + BOE + OFAC.gov + NATO NSO"
          apiUrl="/api/sectores/defensa/normas"
        >
          <RegulatoryTimeline />
        </Panel>
      )}

      {/* SANCIONES TAB */}
      {subtab === 'sanciones' && (
        <Panel
          title="Buscador de entidades sancionadas"
          subtitle="OFAC SDN + EU FSF + ONU + UK HMT · Filtrado por relevancia sector defensa · OpenSanctions API"
          sourceUrl="https://www.opensanctions.org"
          sourceLabel="OpenSanctions"
          sourceTooltip="OpenSanctions.org · Consolidado OFAC + EU + ONU + UK HMT"
          apiUrl="/api/sectores/defensa/sanciones"
        >
          <SanctionsSearch />
        </Panel>
      )}

      {/* COMPLIANCE CHECKER TAB */}
      {subtab === 'compliance' && (
        <Panel
          title="Compliance Checker · Evaluador ITAR/EAR/Sanciones"
          subtitle="Evaluación rápida del nivel de restricción de una exportación de tecnología de defensa por país de destino"
        >
          <ComplianceChecker />
        </Panel>
      )}
    </div>
  )
}
