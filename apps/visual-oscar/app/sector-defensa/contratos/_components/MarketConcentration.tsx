'use client'
/**
 * Análisis de concentración de mercado para contratos defensa:
 *   - HHI (Herfindahl-Hirschman Index)
 *   - Top 10 adjudicatarios con cuota
 *   - Distribución por fuente
 *   - Distribución por CPV / segmento
 *
 * Cero dependencias: todo SVG y heurísticas client-side.
 */
import type { ConcentracionContratacion } from '@/lib/defense/analisis-defensa'
import { ContractSourceBadge } from './ContractSourceBadge'

interface ContratoLite {
  id: string
  fuente: string
  fuente_label: string
  objeto: string
  organo: string
  cpv?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  adjudicatario?: string
  fecha_publicacion?: string
}

const SEGMENTOS_CPV: Array<{ code: string; label: string; color: string }> = [
  { code: '35100', label: 'Equipos seguridad/incendios', color: '#DC2626' },
  { code: '35200', label: 'Armamento y munición',         color: '#1F4E8C' },
  { code: '35300', label: 'Armamento de fuego',            color: '#7C3AED' },
  { code: '35400', label: 'Material militar',              color: '#0EA5E9' },
  { code: '35500', label: 'Vehículos militares',           color: '#F97316' },
  { code: '35600', label: 'Buques militares',              color: '#0F766E' },
  { code: '35700', label: 'Sistemas militares electrónicos', color: '#5B21B6' },
  { code: '35800', label: 'Equipo individual',             color: '#5D4037' },
  { code: '34',    label: 'Equipos transporte',            color: '#6B7280' },
]

function detectarSegmento(cpv?: string, objeto?: string): { label: string; color: string } {
  if (cpv) {
    for (const s of SEGMENTOS_CPV) {
      if (cpv.startsWith(s.code)) return { label: s.label, color: s.color }
    }
  }
  const lower = (objeto || '').toLowerCase()
  if (/aero|aviaci/i.test(lower)) return { label: 'Aeronáutica', color: '#0EA5E9' }
  if (/buque|naval|submarino|fragata/i.test(lower)) return { label: 'Naval', color: '#0F766E' }
  if (/ciber|cyber/i.test(lower)) return { label: 'Ciberdefensa', color: '#16A34A' }
  if (/sat[ée]lite|espac/i.test(lower)) return { label: 'Espacial', color: '#7C3AED' }
  if (/drone|rpas|uav/i.test(lower)) return { label: 'No tripulados', color: '#F97316' }
  if (/munici[oó]n|armament/i.test(lower)) return { label: 'Munición/armamento', color: '#1F4E8C' }
  return { label: 'Otros servicios defensa', color: '#9CA3AF' }
}

export function MarketConcentrationCard({ contratos, concentracion }: {
  contratos: ContratoLite[]
  concentracion: ConcentracionContratacion
}) {
  // Distribución por segmento
  const segMap: Record<string, { label: string; color: string; importeM: number; n: number }> = {}
  for (const c of contratos) {
    const s = detectarSegmento(c.cpv, c.objeto)
    const k = s.label
    const imp = (c.importe_adjudicacion || c.importe_licitacion || 0) / 1_000_000
    if (!segMap[k]) segMap[k] = { ...s, importeM: 0, n: 0 }
    segMap[k].importeM += imp
    segMap[k].n++
  }
  const segmentos = Object.values(segMap).sort((a, b) => b.importeM - a.importeM)
  const totalImpSeg = segmentos.reduce((s, x) => s + x.importeM, 0)

  // Color HHI
  const colorHHI = concentracion.bandaHHI === 'altamente concentrado' ? '#DC2626'
                 : concentracion.bandaHHI === 'concentrado' ? '#F97316'
                 : concentracion.bandaHHI === 'moderado' ? '#F59E0B'
                 : '#16A34A'

  const interpretacion =
    concentracion.bandaHHI === 'altamente concentrado' ? 'Mercado dominado por pocos actores · alta barrera de entrada' :
    concentracion.bandaHHI === 'concentrado' ? 'Mercado moderadamente concentrado · top-3 con alta cuota' :
    concentracion.bandaHHI === 'moderado' ? 'Mercado moderadamente competitivo · sin dominantes claros' :
    'Mercado fragmentado · muchas empresas con cuotas similares'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      {/* HHI HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center', padding: 14, background: '#FAFAFA', borderRadius: 12, border: '1px solid #ECECEF' }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ÍNDICE HHI</p>
          <p style={{ margin: '2px 0 0', fontSize: 32, fontWeight: 700, color: colorHHI, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {concentracion.hhi.toLocaleString('es-ES')}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF' }}>Herfindahl-Hirschman</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colorHHI, textTransform: 'capitalize' }}>{concentracion.bandaHHI}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{interpretacion}</p>
          {/* Bandas referencia */}
          <div style={{ display: 'flex', gap: 0, marginTop: 8, height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ flex: 1500, background: '#16A34A' }} title="< 1500 fragmentado"/>
            <div style={{ flex: 1000, background: '#F59E0B' }} title="1500-2500 moderado"/>
            <div style={{ flex: 1500, background: '#F97316' }} title="2500-4000 concentrado"/>
            <div style={{ flex: 6000, background: '#DC2626' }} title="> 4000 altamente concentrado"/>
          </div>
          <div style={{ position: 'relative', height: 8, marginTop: 1 }}>
            <div style={{ position: 'absolute', left: `${Math.min(99, (concentracion.hhi / 10000) * 100)}%`, transform: 'translateX(-50%)', color: '#1d1d1f' }}>▲</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>COBERTURA</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{concentracion.totalContratos} contratos</p>
          <p style={{ margin: 0, fontSize: 11, color: '#3a3a3d' }}>{concentracion.conImporte} con importe · {concentracion.totalImporteM.toLocaleString('es-ES')} M€</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* TOP ADJUDICATARIOS */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            TOP 10 ADJUDICATARIOS · CUOTA DE MERCADO
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {concentracion.topAdjudicatarios.map((a, i) => (
              <li key={a.nombre + i} style={{ padding: '7px 10px', background: '#FAFAFA', borderRadius: 6, border: '1px solid #ECECEF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                    <span style={{ color: '#9CA3AF', fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>{a.nombre}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C' }}>{a.importeM.toLocaleString('es-ES')} M€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 4, background: '#ECECEF', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, a.cuota * 2)}%`, height: '100%', background: '#1F4E8C' }}/>
                  </div>
                  <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                    {a.cuota}% · {a.nContratos} contratos
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* SEGMENTOS CPV */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            DISTRIBUCIÓN POR SEGMENTO DE DEFENSA
          </p>
          {/* Stacked bar */}
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
            {segmentos.map(s => (
              <div key={s.label} style={{ flex: s.importeM || 0.01, background: s.color }} title={`${s.label}: ${s.importeM.toFixed(1)} M€`}/>
            ))}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {segmentos.slice(0, 7).map(s => (
              <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2, flexShrink: 0 }}/>
                <span style={{ color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                <span style={{ color: '#6e6e73', fontSize: 10 }}>{s.n}</span>
                <span style={{ fontWeight: 700, color: '#1d1d1f', minWidth: 56, textAlign: 'right' }}>{s.importeM.toFixed(1)} M€</span>
                <span style={{ color: '#9CA3AF', fontSize: 10, minWidth: 32, textAlign: 'right' }}>{totalImpSeg > 0 ? ((s.importeM / totalImpSeg) * 100).toFixed(0) : 0}%</span>
              </li>
            ))}
          </ul>

          {/* Por fuente */}
          <p style={{ margin: '14px 0 6px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            POR FUENTE DE DATOS
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(concentracion.porFuente).sort((a, b) => b[1].importeM - a[1].importeM).map(([fuente, v]) => (
              <li key={fuente} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                <ContractSourceBadge fuente={fuente.includes('TED') ? 'TED' : fuente.includes('PLACSP') ? 'PLACSP' : fuente.includes('USAS') ? 'USASPENDING' : fuente.includes('Catal') ? 'CATALUNYA_SOCRATA' : 'TED'} label={fuente.length > 22 ? fuente.slice(0, 21) + '…' : fuente}/>
                <span style={{ color: '#6e6e73', fontSize: 10, flex: 1, textAlign: 'right' }}>{v.nContratos} contratos</span>
                <span style={{ fontWeight: 700, color: '#1d1d1f', minWidth: 60, textAlign: 'right' }}>{v.importeM.toLocaleString('es-ES')} M€</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
