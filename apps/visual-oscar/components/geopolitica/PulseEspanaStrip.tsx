'use client'
/**
 * <PulseEspanaStrip /> · Sprint G21
 *
 * Strip de KPIs ejecutivos siempre-visible al inicio de /geopolitica.
 * Cross-cuts las 6 tabs surfaciando el "pulso España" en un vistazo:
 *
 *   - Países críticos con presencia España: cuántos países IRC ≥ 75 con
 *     activos españoles documentados (IBEX, contratos, ciudadanos, etc.)
 *   - Valor exposición: suma €M de activos cuantificables en países
 *     con riesgo MEDIO/ALTO/CRITICO
 *   - Ciudadanos en riesgo: total PERE INE en países críticos + altos
 *   - Conflictos UCDP con activos: nº seed UCDP con presencia España
 *
 * Consume /api/presencia-espana/activos-riesgo (cached) y se actualiza
 * automáticamente cuando el IRC cambia (heartbeat real-time).
 *
 * UI minimalista: 4 cards en strip horizontal compacta.
 */
import { useEffect, useState } from 'react'

interface Summary {
  total_assets: number
  total_value_eur_m: number
  total_ciudadanos_in_risk: number
  countries_covered: number
  by_band: { CRITICO: number; ALTO: number; MEDIO: number; BAJO: number }
  by_category: { empresa: number; contrato: number; ciudadano: number; infraestructura: number; estado: number }
  ucdp_overlap: number
}

interface Resp {
  ok: boolean
  summary?: Summary
  assets?: Array<{ iso3: string; country_name_es: string; host_risk_band: string; in_ucdp_seed: boolean }>
}

export function PulseEspanaStrip() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/presencia-espana/activos-riesgo', { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Resp>)
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 12,
        color: '#94a3b8', fontSize: 11,
      }}>
        Calculando pulso España…
      </div>
    )
  }

  if (!data?.ok || !data.summary) return null

  const s = data.summary
  // Países únicos con riesgo CRITICO en los que España tiene activos
  const criticalCountries = new Set(
    (data.assets ?? [])
      .filter((a) => a.host_risk_band === 'CRITICO')
      .map((a) => a.iso3),
  ).size
  const ucdpCountries = new Set(
    (data.assets ?? [])
      .filter((a) => a.in_ucdp_seed)
      .map((a) => a.iso3),
  ).size

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)',
      borderRadius: 12, padding: '12px 16px', marginBottom: 14,
      color: '#fff',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h3 style={{
          margin: 0, fontSize: 11, fontWeight: 700,
          color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          ◆ Pulso España · exposición exterior agregada
        </h3>
        <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
          IBEX + PERE + MAEC + Cervantes + CESCE × IRC + UCDP real-time
        </span>
      </header>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 8,
      }}>
        <Kpi
          label="Países críticos"
          value={String(criticalCountries)}
          sub={`con presencia ES · IRC ≥ 75`}
          color="#dc2626"
        />
        <Kpi
          label="Valor exposición"
          value={`€${(s.total_value_eur_m / 1000).toFixed(1)}bn`}
          sub={`activos cuantificables`}
          color="#fbbf24"
        />
        <Kpi
          label="Ciudadanos en riesgo"
          value={s.total_ciudadanos_in_risk.toLocaleString('es-ES')}
          sub={`PERE INE · IRC ≥ 35`}
          color="#0891b2"
        />
        <Kpi
          label="Conflicto UCDP"
          value={String(ucdpCountries)}
          sub={`países con activos ES`}
          color="#ea580c"
        />
        <Kpi
          label="Total activos"
          value={String(s.total_assets)}
          sub={`${s.countries_covered} países`}
          color="#94a3b8"
        />
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      padding: '8px 10px', background: 'rgba(255,255,255,0.05)',
      borderRadius: 6, borderLeft: `3px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#cbd5e1' }}>
        {sub}
      </p>
    </div>
  )
}

export default PulseEspanaStrip
