'use client'
/**
 * /sector-defensa/licitaciones — Hub consolidado de contratación, programas, presupuestos y regulatorio.
 *
 * Sub-secciones internas (tabs):
 *   - Contratos (PLACSP + TED + DoD en vivo)
 *   - Programas (FCAS, S-80, F-110, etc + supply chain)
 *   - Presupuestos (SIPRI + proyecciones)
 *   - Oportunidades (programas planificados extraídos del catálogo)
 *   - Regulatorio (ITAR · EAR · sanciones · compliance · exposición)
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'
import { Panel } from '@/components/SectorPanel'

type SubTab = 'contratos' | 'programas' | 'presupuestos' | 'oportunidades' | 'regulatorio' | 'analisis'

const SUBPAGES: Array<{ id: SubTab; href: string; label: string; descripcion: string; color: string; icon: string }> = [
  { id: 'contratos',     href: '/sector-defensa/contratos',     label: 'Contratos en vivo',     descripcion: 'TED + PLACSP + USASpending DoD + Catalunya · análisis HHI concentración · top adjudicatarios', color: '#0EA5E9', icon: '◆' },
  { id: 'oportunidades', href: '/sector-defensa/oportunidades', label: 'Oportunidades',          descripcion: 'Programas activos en planificación · ventanas competitivas por sector + región',            color: '#16A34A', icon: '★' },
  { id: 'programas',     href: '/sector-defensa/programas',     label: 'Programas estratégicos', descripcion: 'FCAS · S-80 · F-110 · Eurodrone · Gantt + supply chain SVG + hitos',                       color: '#5B21B6', icon: '⊞' },
  { id: 'presupuestos',  href: '/sector-defensa/presupuestos',  label: 'Presupuestos militares', descripcion: 'SIPRI 36 países · NATO compliance · proyecciones 2026-2030 · choropleth global',           color: '#1F4E8C', icon: '$' },
  { id: 'regulatorio',   href: '/sector-defensa/regulatorio',   label: 'Regulatorio · Compliance', descripcion: 'ITAR · EAR · sanciones · scoring exposición empresas ES · compliance checker',           color: '#DC2626', icon: '!' },
]

export default function LicitacionesHub() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [contratos, setContratos] = useState<{ total: number; importe_total_M: number } | null>(null)
  const [programas, setProgramas] = useState<{ items?: unknown[]; resumen?: { total: number; coste_total_M: number } } | null>(null)

  useEffect(() => {
    fetch('/api/sectores/defensa/contratos-global?days=180&limit=10').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setContratos({ total: d.total || 0, importe_total_M: d.stats?.importe_total_M || 0 })
    })
    fetch('/api/sectores/defensa/programas').then(r => r.ok ? r.json() : null).then(d => setProgramas(d))
  }, [])

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · LICITACIONES + PROGRAMAS + PRESUPUESTOS + COMPLIANCE
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Hub de inteligencia competitiva
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          Todo el ciclo de negocio defensa: licitaciones en vivo · programas estratégicos · presupuestos por país · oportunidades futuras · compliance regulatorio
        </p>
      </div>

      {/* KPIs RESUMEN VIVO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        <KPI label="CONTRATOS ÚLTIMOS 180D" value={contratos ? String(contratos.total) : '…'} color="#0EA5E9" sub="TED + PLACSP + DoD"/>
        <KPI label="IMPORTE AGREGADO" value={contratos ? `${contratos.importe_total_M.toLocaleString('es-ES')} M€` : '…'} color="#1F4E8C"/>
        <KPI label="PROGRAMAS TRACKING" value={programas?.resumen ? String(programas.resumen.total) : '…'} color="#5B21B6"/>
        <KPI label="COSTE TOTAL PROGRAMAS" value={programas?.resumen ? `${(programas.resumen.coste_total_M / 1000).toFixed(0)} bn€` : '…'} color="#7F1D1D"/>
      </div>

      {/* SUB-SECCIONES (cards grandes con link) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12, marginBottom: 18 }}>
        {SUBPAGES.map(s => (
          <Link key={s.id} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: 18, background: `linear-gradient(135deg, ${s.color}12, ${s.color}04)`, borderRadius: 12, borderLeft: `4px solid ${s.color}`, cursor: 'pointer', minHeight: 130 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22, color: s.color, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{s.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{s.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.5 }}>{s.descripcion}</p>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: s.color, fontWeight: 600 }}>Abrir módulo →</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ANÁLISIS EJECUTIVO RESUMEN */}
      <Panel title="Análisis ejecutivo · estado mercado contratación defensa" subtitle="Síntesis dinámica del estado del mercado · destacados última semana">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: '3px solid #16A34A' }}>
            <p style={{ margin: 0, fontSize: 10, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>OPORTUNIDADES ACTIVAS</p>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.6 }}>
              <li>EDF 2026: 1bn€ en 31 tópicos · cierre sep 2026</li>
              <li>EDIP 2026: 500M€ producción conjunta · primer tranche Q3 2026</li>
              <li>CDTI PERTE Defensa: 800M€ I+D industria ES</li>
              <li>Patriot PAC-3 MSE producción x4 capacidad RTX 2025-2027</li>
              <li>NSPA tenders permanentes · munición + combustible OTAN</li>
            </ul>
          </div>
          <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: '3px solid #DC2626' }}>
            <p style={{ margin: 0, fontSize: 10, color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>RIESGOS + LIMITACIONES</p>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.6 }}>
              <li>Capacidad producción saturada hasta 2027 (munición 155mm, motores)</li>
              <li>ITAR USA limita acceso componentes para terceros</li>
              <li>FCAS · tensiones Dassault vs Airbus DS por liderazgo</li>
              <li>Brexit · BAE excluido EDF directo · acceso via partner EU</li>
              <li>Nuevo objetivo OTAN 5% PIB · presión política sostenida</li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function KPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  )
}
