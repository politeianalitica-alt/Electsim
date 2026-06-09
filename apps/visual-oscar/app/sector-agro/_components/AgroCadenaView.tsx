'use client'
/**
 * <AgroCadenaView /> · Agro v4 · Cadena de Valor + inflación alimentaria viva
 *
 * Quién captura el valor en la cadena alimentaria. Añade datos VIVOS de
 * inflación de alimentos (Eurostat HICP prc_hicp_manr): España vs IPC general
 * vs UE-27, con la brecha alimentos-vs-general como proxy de tensión de
 * márgenes en la cadena. Debajo, áreas estratégicas y fuentes oficiales
 * (AICA, Observatorio de Precios MAPA) para el detalle origen→mayorista→PVP.
 *
 * Cero datos inventados: el panel de inflación degrada si Eurostat no responde.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Skeleton, Vacio, MultiLineChart, type MultiLineSeries } from '@/lib/sectores/charts'

const ACCENT = '#5B21B6'

interface InflEnvelope {
  ok: boolean
  data: {
    series: MultiLineSeries[]
    latest: {
      es_food: { time: string; value: number } | null
      es_general: { time: string; value: number } | null
      eu_food: { time: string; value: number } | null
      brecha_food_vs_general: number | null
      brecha_es_vs_eu: number | null
    }
  } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

export function AgroCadenaView() {
  const relevantes = AREAS_AGRO.filter((a) =>
    ['cadena_alimentaria', 'aceite_oliva', 'porcino_export', 'frutas_hortalizas'].includes(a.id)
  )
  const [infl, setInfl] = useState<InflEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/agro/inflacion-alimentos?n=24', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: InflEnvelope | null) => alive && setInfl(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const l = infl?.data?.latest

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · CADENA DE VALOR · ORIGEN A MESA"
        titulo="Quién captura el valor en la cadena alimentaria"
        descripcion="Inflación de alimentos en vivo (Eurostat HICP) frente al IPC general y a la UE, como termómetro de la tensión de márgenes entre origen, industria y distribución. La comparativa exacta de precio en origen, mayorista y consumo vive en el Observatorio de Precios del MAPA y en AICA (Ley 12/2013), enlazados abajo."
        colorFrom={ACCENT}
        colorTo="#3B0764"
      />

      {/* Inflación alimentaria viva */}
      <Panel
        titulo="Inflación de alimentos vs general · tasa anual"
        fuente={infl?.fuente || 'Eurostat · HICP'}
        url={infl?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr'}
      >
        {loading ? (
          <Skeleton h={240} />
        ) : !infl?.ok || !infl.data ? (
          <Vacio msg={`Eurostat HICP sin respuesta · ${infl?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
              <KpiCard label="Alimentos España" value={l?.es_food ? `${l.es_food.value > 0 ? '+' : ''}${l.es_food.value}%` : '—'} color="#16A34A" sub={l?.es_food?.time} />
              <KpiCard label="IPC general España" value={l?.es_general ? `${l.es_general.value > 0 ? '+' : ''}${l.es_general.value}%` : '—'} color="#1F4E8C" sub={l?.es_general?.time} />
              <KpiCard
                label="Brecha alimentos − general"
                value={l?.brecha_food_vs_general != null ? `${l.brecha_food_vs_general > 0 ? '+' : ''}${l.brecha_food_vs_general} pp` : '—'}
                color={(l?.brecha_food_vs_general ?? 0) > 0 ? '#DC2626' : '#16A34A'}
                sub="presión sobre la cesta"
              />
              <KpiCard
                label="España − UE (alimentos)"
                value={l?.brecha_es_vs_eu != null ? `${l.brecha_es_vs_eu > 0 ? '+' : ''}${l.brecha_es_vs_eu} pp` : '—'}
                color={(l?.brecha_es_vs_eu ?? 0) > 0 ? '#DC2626' : '#16A34A'}
                sub="vs media UE-27"
              />
            </div>
            <MultiLineChart series={infl.data.series} height={240} />
            <p style={{ fontSize: 10.5, color: '#86868b', marginTop: 8, lineHeight: 1.5 }}>
              Cuando la inflación de alimentos supera al IPC general (brecha positiva), la cesta de la compra tira al alza por
              encima del coste de vida medio: señal de tensión en la cadena (climática, energética o de márgenes). El desglose
              origen → mayorista → consumo se verifica en el Observatorio de Precios del MAPA.
            </p>
          </>
        )}
      </Panel>

      <Panel titulo="Áreas estratégicas en la cadena" fuente="Catálogo Politeia · áreas-agro" url="https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {relevantes.map((a) => (
            <li key={a.id} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderLeft: `3px solid ${a.color}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 5, lineHeight: 1.45 }}>{a.descripcion}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {a.keywords.slice(0, 3).map((k) => (
                  <span key={k} style={{ fontSize: 9, fontWeight: 700, background: `${a.color}20`, color: a.color, padding: '2px 7px', borderRadius: 999 }}>
                    {k}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo="Fuentes oficiales para profundizar (origen → mayorista → PVP)" fuente="MAPA + AICA + INE" url="https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: 'Observatorio de Precios MAPA', d: 'Precios semanales de productos representativos en origen, mayorista y consumo. Series desde 2008 publicadas en PDF y CSV.', url: 'https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/' },
            { t: 'AICA · Agencia de Información y Control Alimentarios', d: 'Verifica el cumplimiento de la Ley 12/2013 de la Cadena Alimentaria. Resoluciones sancionadoras y observatorio de contratos.', url: 'https://www.aica.gob.es/' },
            { t: 'INE · IPC desagregado · alimentación', d: 'Índice de Precios de Consumo de la rúbrica de Alimentos y Bebidas no Alcohólicas. Serie mensual con desglose por subgrupo.', url: 'https://www.ine.es/dynt3/inebase/index.htm?padre=1426' },
            { t: 'Eurostat · prc_hicp_manr · inflación armonizada', d: 'Fuente del panel superior. Comparativa armonizada con la UE de la rúbrica alimentación (CP011) y general (CP00).', url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr' },
          ].map((f, i) => (
            <li key={i} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF' }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f' }}>{f.t}</div>
                <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 3, lineHeight: 1.45 }}>{f.d}</div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, marginTop: 5 }}>{f.url}</div>
              </a>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 10.5, color: '#86868b', marginTop: 10 }}>
          Para el contexto macro completo (IPC subyacente, energía, comparativa europea ampliada) ver{' '}
          <Link href="/macro" style={{ color: ACCENT, fontWeight: 700 }}>/macro</Link>.
        </p>
      </Panel>
    </div>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
