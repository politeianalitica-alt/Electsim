'use client'
/**
 * <FarmaGastoView /> · Farma v3 · Sprint F6
 *
 * Vista Gasto y Acceso. Tres lecturas:
 *   1. Gasto sanitario % PIB · Eurostat hlth_sha11_hf · España vs UE-27/EA20.
 *   2. Necesidades médicas insatisfechas por motivos económicos
 *      · Eurostat hlth_silc_29 · ranking ES vs UE.
 *   3. CTA al cockpit Tercer Sector financiación I+D salud.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, MultiLineChart, RankChart, Mini, Skeleton, Vacio, SectorHero } from '@/lib/sectores/charts'

const ACCENT = '#0EA5E9'

const GEO_LABELS: Record<string, string> = {
  ES: 'España',
  EU27_2020: 'UE-27',
  EA20: 'Zona euro',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Países Bajos',
  AT: 'Austria',
}
const GEO_COLORS: Record<string, string> = {
  ES: '#DB2777',
  EU27_2020: '#1F4E8C',
  EA20: '#0EA5E9',
  FR: '#7C3AED',
  DE: '#F59E0B',
  IT: '#16A34A',
  PT: '#DC2626',
  NL: '#0F766E',
  AT: '#B45309',
}

interface EurostatSerie {
  geo: string
  points: Array<{ time: string; value: number | null }>
}
interface EurostatEnvelope {
  ok: boolean
  data: { series: EurostatSerie[]; latest_by_geo: Record<string, { time: string; value: number | null }> } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

export function FarmaGastoView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="FARMA · GASTO Y ACCESO · EUROSTAT"
        titulo="Cuánto se gasta y quién no llega"
        descripcion="Dos métricas europeas estándar para responder con honestidad: el peso del gasto sanitario sobre el PIB y el % de población adulta que reporta haber renunciado a atención sanitaria por no poder pagarla. Sin métricas inventadas: si Eurostat no responde, el panel se cae limpio."
        colorFrom={ACCENT}
        colorTo="#075985"
      />
      <PanelGasto />
      <PanelAcceso />
      <PanelCtaFinanciacion />
    </div>
  )
}

function PanelGasto() {
  const [env, setEnv] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/farma/eurostat-gasto', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EurostatEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const series = env?.data?.series ?? []
  const visible = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL']
    .map((g) => series.find((s) => s.geo === g))
    .filter(Boolean) as EurostatSerie[]
  const last_es = env?.data?.latest_by_geo?.ES?.value ?? null
  const last_eu = env?.data?.latest_by_geo?.EU27_2020?.value ?? null

  return (
    <Panel
      titulo="Gasto sanitario corriente · % PIB"
      fuente={env?.fuente || 'Eurostat · hlth_sha11_hf'}
      url={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/hlth_sha11_hf'}
    >
      {loading ? (
        <Skeleton h={220} />
      ) : !env?.ok || visible.length === 0 ? (
        <Vacio msg={`Eurostat no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            <Mini label="España · último" value={last_es} unit="%" color="#DB2777" decimals={2} />
            <Mini label="UE-27 · último" value={last_eu} unit="%" color="#1F4E8C" decimals={2} />
            <Mini
              label="Diferencia ES − UE"
              value={last_es != null && last_eu != null ? Number((last_es - last_eu).toFixed(2)) : null}
              unit="pp"
              color={last_es != null && last_eu != null && last_es > last_eu ? '#DC2626' : '#16A34A'}
              decimals={2}
              sub={
                last_es != null && last_eu != null && last_es > last_eu
                  ? 'España con mayor gasto relativo'
                  : 'España con menor gasto relativo'
              }
            />
          </div>
          <MultiLineChart
            series={visible.map((s) => ({
              geo: s.geo,
              label: GEO_LABELS[s.geo] || s.geo,
              color: GEO_COLORS[s.geo] || '#999',
              points: s.points,
            }))}
          />
          <p style={{ fontSize: 11, color: '#86868b', margin: '10px 0 0', lineHeight: 1.5 }}>
            Gasto sanitario corriente del total de financiadores (públicos + privados) en porcentaje
            del PIB. Indicador estándar OECD/Eurostat para comparar el esfuerzo sanitario relativo
            entre países.
          </p>
        </>
      )}
    </Panel>
  )
}

function PanelAcceso() {
  const [env, setEnv] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/farma/eurostat-acceso', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EurostatEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const series = env?.data?.series ?? []
  const ranked = series
    .map((s) => {
      const last = s.points[s.points.length - 1]
      return { geo: s.geo, label: GEO_LABELS[s.geo] || s.geo, value: last?.value ?? null, time: last?.time ?? '' }
    })

  return (
    <Panel
      titulo="Necesidades médicas no cubiertas por motivos económicos"
      fuente={env?.fuente || 'Eurostat · hlth_silc_29'}
      url={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/hlth_silc_29'}
    >
      {loading ? (
        <Skeleton h={200} />
      ) : !env?.ok || ranked.length === 0 ? (
        <Vacio msg={`Eurostat no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <>
          <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
            % de población ≥16 años que ha dejado de acudir al médico o de comprar medicamentos por
            no poder pagarlo. Indicador europeo de acceso real al sistema sanitario (incluye la
            barrera económica a medicamentos prescritos pero no costeables).
          </p>
          <RankChart rows={ranked} highlight="ES" highlightColor="#DB2777" baseColor="#1F4E8C" unit="%" decimals={1} />
        </>
      )}
    </Panel>
  )
}

function PanelCtaFinanciacion() {
  return (
    <section
      style={{
        background: '#FEFCE8',
        border: '1px solid #FDE68A',
        borderRadius: 14,
        padding: '20px 22px',
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em', margin: '0 0 6px' }}>
        Financiación I+D salud · cockpit unificado
      </h3>
      <p style={{ fontSize: 12, color: '#3a3a3d', margin: '0 0 12px', lineHeight: 1.55, maxWidth: 860 }}>
        Las convocatorias BDNS de I+D salud, las ayudas EU Funding (Horizon Health) y las
        subvenciones del Plan de Recuperación se centralizan en el cockpit del Tercer Sector con
        scoring + análisis determinista de pliegos. Desde ahí se filtra por keywords salud / ensayos
        / vacunas / biotech.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link
          href="/sector-tercer-sector?ts=financiacion"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: '#FDE047',
            color: '#854D0E',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Tercer Sector · Financiación ›
        </Link>
        <Link
          href="/sector-tercer-sector?ts=licitaciones"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: '#fff',
            color: '#854D0E',
            border: '1px solid #FDE68A',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Tercer Sector · Licitaciones ›
        </Link>
      </div>
    </section>
  )
}
