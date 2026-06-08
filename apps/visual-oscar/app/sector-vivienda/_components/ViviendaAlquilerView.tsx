'use client'
/**
 * <ViviendaAlquilerView /> · Vivienda v3 · Sprint V7
 *
 * Vista profunda del mercado del alquiler español + estado de implantación
 * territorial de la Ley 12/2023. Cruza:
 *
 *   1. INE IPVA (índice de precios de alquiler de vivienda) histórico 10 años
 *      desde el endpoint ya existente /api/sectores/vivienda/alquiler.
 *   2. Eurostat ilc_mdho06 (cost overburden) por país, para comparar
 *      el esfuerzo financiero de los hogares en España vs UE-27 + zona euro
 *      + países de referencia.
 *   3. Catálogo curado (`catalogos/zmt-ccaa.json`) con el estado actual de
 *      aplicación de la Ley 12/2023 por las 17 CCAA: declaraciones de Zonas
 *      de Mercado Residencial Tensionado (ZMT), posición pública del
 *      gobierno autonómico y enlace al portal oficial de vivienda.
 *
 * Cada panel cita su fuente. Degradación honesta si una fuente cae.
 */
import { useEffect, useState } from 'react'
import zmtCcaa from '@/lib/vivienda/catalogos/zmt-ccaa.json'

const ACCENT = '#0EA5E9' // Azul Eurostat para alquiler

interface IpvaPoint {
  t: string
  indice: number | null
  var_anual: number | null
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

interface CcaaZmt {
  id: string
  nombre: string
  estado: 'activa' | 'en_estudio' | 'rechaza' | 'no_aplica'
  zmt_declaradas: number | null
  comentario: string
  fuente_url: string
  fuente_label: string
  color: string
}
const CCAA: CcaaZmt[] = (zmtCcaa.ccaa as CcaaZmt[]).slice()

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

export function ViviendaAlquilerView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header />
      <PanelIpva />
      <PanelOverburden />
      <PanelZmtCcaa />
    </div>
  )
}

function Header() {
  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, #1E40AF 100%)`,
        borderRadius: 18,
        padding: '24px 32px',
        color: '#fff',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
        ALQUILER · ZMT LEY 12/2023 · IPVA + EUROSTAT
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
        Alquiler, esfuerzo y dónde se ha activado la Ley 12/2023
      </h2>
      <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>
        Tres lecturas: el índice oficial del alquiler español (IPVA), el coste medido por la métrica
        europea estándar (% hogares con sobrecarga de gastos vivienda) y el estado actualizado de
        aplicación de la Ley 12/2023 por cada una de las 17 CCAA (las competencias en vivienda son
        autonómicas, así que la aplicación es desigual).
      </p>
    </section>
  )
}

// ─── Panel 1 · IPVA España ─────────────────────────────────

function PanelIpva() {
  const [points, setPoints] = useState<IpvaPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/sectores/vivienda/alquiler?nult=15', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { points: IpvaPoint[] } | null) => {
        if (alive) setPoints(j?.points ?? null)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const valid = (points ?? []).filter((p) => p.indice != null)
  const last = valid[valid.length - 1]
  const first = valid[0]
  const acumulada =
    first && last && first.indice && last.indice
      ? Number((((last.indice - first.indice) / first.indice) * 100).toFixed(1))
      : null

  return (
    <Panel
      titulo="IPVA España · variación anual del alquiler"
      fuente="INE · Índice de Precios de Vivienda en Alquiler"
      url="https://www.ine.es/dynt3/inebase/index.htm?padre=10309"
    >
      {loading ? (
        <Skeleton h={220} />
      ) : !valid.length ? (
        <Vacio msg="INE no devuelve datos de IPVA ahora mismo." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            <Mini label={`Índice actual (${last?.t ?? '—'})`} value={last?.indice ?? null} unit="" color={ACCENT} decimals={2} />
            <Mini
              label={`Variación anual último (${last?.t ?? '—'})`}
              value={last?.var_anual ?? null}
              unit="%"
              color={(last?.var_anual ?? 0) > 0 ? '#DC2626' : '#16A34A'}
              decimals={1}
            />
            <Mini
              label={`Acumulada (${first?.t ?? ''} → ${last?.t ?? ''})`}
              value={acumulada}
              unit="%"
              color="#1F4E8C"
              decimals={1}
            />
          </div>
          <LineChart points={valid.map((p) => ({ t: p.t, value: p.indice }))} color={ACCENT} />
        </>
      )}
    </Panel>
  )
}

// ─── Panel 2 · Eurostat cost overburden multi-país ────────

function PanelOverburden() {
  const [env, setEnv] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/vivienda/eurostat-overburden', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EurostatEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const series = env?.data?.series ?? []
  const latest_es = env?.data?.latest_by_geo?.ES
  const latest_eu = env?.data?.latest_by_geo?.EU27_2020

  // Rank de países por último valor disponible
  const ranked = series
    .map((s) => {
      const last = s.points[s.points.length - 1]
      return { geo: s.geo, valor: last?.value ?? null, time: last?.time ?? '' }
    })
    .filter((r) => r.valor != null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))

  return (
    <Panel
      titulo="Esfuerzo financiero en vivienda · comparativa UE"
      fuente={env?.fuente || 'Eurostat · ilc_mdho06'}
      url={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdho06'}
    >
      {loading ? (
        <Skeleton h={220} />
      ) : !env?.ok || ranked.length === 0 ? (
        <Vacio msg={`Eurostat no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <>
          <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
            % de hogares que dedican más del 40% de la renta disponible al coste total de la
            vivienda (incluye hipoteca · alquiler · suministros). Ranking de países por mayor
            sobrecarga. España en rosa.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ranked.map((r) => {
              const isES = r.geo === 'ES'
              const maxValor = ranked[0].valor as number
              const widthPct = ((r.valor as number) / maxValor) * 100
              return (
                <li
                  key={r.geo}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 80px',
                    gap: 10,
                    alignItems: 'center',
                    padding: '6px 10px',
                    background: isES ? '#FCE7F3' : 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isES ? 700 : 500, color: '#1d1d1f' }}>
                    {GEO_LABELS[r.geo] || r.geo}
                  </span>
                  <div style={{ height: 14, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${widthPct}%`,
                        background: isES ? '#DB2777' : '#1F4E8C',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: isES ? '#9D174D' : '#1F4E8C',
                      textAlign: 'right',
                    }}
                  >
                    {(r.valor as number).toLocaleString('es-ES', { maximumFractionDigits: 1 })}% ({r.time})
                  </span>
                </li>
              )
            })}
          </ul>
          {latest_es?.value != null && latest_eu?.value != null && (
            <p style={{ fontSize: 11, color: '#86868b', margin: '12px 0 0', lineHeight: 1.5 }}>
              España con <strong>{latest_es.value.toFixed(1)}%</strong> vs UE-27{' '}
              <strong>{latest_eu.value.toFixed(1)}%</strong> · diferencia{' '}
              {(latest_es.value - latest_eu.value).toFixed(1)} pp.
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

// ─── Panel 3 · Estado ZMT por CCAA ─────────────────────────

function PanelZmtCcaa() {
  const grouped: Record<CcaaZmt['estado'], CcaaZmt[]> = {
    activa: [],
    en_estudio: [],
    rechaza: [],
    no_aplica: [],
  }
  CCAA.forEach((c) => grouped[c.estado].push(c))
  const labels: Record<CcaaZmt['estado'], string> = {
    activa: 'Aplicación activa (ZMT declaradas)',
    en_estudio: 'En estudio / diagnóstico territorial',
    rechaza: 'Rechaza la aplicación',
    no_aplica: 'No aplica · sin ZMT',
  }
  const totalZmt = CCAA.reduce((s, c) => s + (c.zmt_declaradas ?? 0), 0)

  return (
    <Panel
      titulo="Estado Ley 12/2023 por CCAA · 17 territorios"
      fuente="Catálogo curado Politeia · fuente: boletines oficiales autonómicos"
      url="https://www.boe.es/eli/es/l/2023/05/24/12/con"
    >
      <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
        Las competencias de vivienda son autonómicas. La Ley 12/2023 se aplica por opt-in
        territorial. {totalZmt > 0 ? `${totalZmt} ZMT declaradas en total a fecha de actualización.` : ''}{' '}
        Cada CCAA enlaza a su portal oficial de vivienda.
      </p>

      {(['activa', 'en_estudio', 'rechaza', 'no_aplica'] as const).map((estado) => {
        const arr = grouped[estado]
        if (arr.length === 0) return null
        const swatch = arr[0].color
        return (
          <div key={estado} style={{ marginBottom: 14 }}>
            <h4
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
                margin: '0 0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 10, height: 10, background: swatch, borderRadius: 2 }} />
              {labels[estado]} · {arr.length}
            </h4>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 8,
              }}
            >
              {arr.map((c) => (
                <li key={c.id}>
                  <a
                    href={c.fuente_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      padding: '10px 14px',
                      background: '#FAFAFA',
                      borderRadius: 10,
                      border: '1px solid #ECECEF',
                      borderLeft: `3px solid ${c.color}`,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'var(--font-display)' }}>
                        {c.nombre}
                      </span>
                      {c.zmt_declaradas != null && c.zmt_declaradas > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: c.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.zmt_declaradas} ZMT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.45 }}>{c.comentario}</div>
                    <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 6 }}>{c.fuente_label} ›</div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </Panel>
  )
}

// ─── Primitivas internas (mismo patrón que ViviendaPreciosView) ──

function Panel({
  titulo,
  fuente,
  url,
  children,
}: {
  titulo: string
  fuente: string
  url: string
  children: React.ReactNode
}) {
  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 22px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
          {titulo}
        </h3>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: '#86868b', textDecoration: 'none' }}>
          {fuente} ›
        </a>
      </header>
      {children}
    </section>
  )
}

function Mini({
  label,
  value,
  unit,
  color,
  decimals = 1,
}: {
  label: string
  value: number | null
  unit: string
  color: string
  decimals?: number
}) {
  return (
    <div
      style={{
        background: '#FAFAFA',
        border: '1px solid #ECECEF',
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: value == null ? '#9CA3AF' : color,
          marginTop: 2,
        }}
      >
        {value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: decimals })}
        <span style={{ fontSize: 11, marginLeft: 4, color: '#86868b' }}>{unit}</span>
      </div>
    </div>
  )
}

function Skeleton({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }} />
}

function Vacio({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 10,
        fontSize: 12,
        color: '#991B1B',
      }}
    >
      {msg}
    </div>
  )
}

function LineChart({ points, color }: { points: Array<{ t: string; value: number | null }>; color: string }) {
  const valid = points.filter((p) => p.value != null)
  if (!valid.length) return <Vacio msg="Sin datos" />
  const W = 700
  const H = 220
  const P = 30
  const values = valid.map((p) => p.value as number)
  const minY = Math.min(...values) * 0.98
  const maxY = Math.max(...values) * 1.02
  const path = valid
    .map((p, i) => {
      const x = P + (i / (valid.length - 1)) * (W - 2 * P)
      const y = P + (1 - ((p.value as number) - minY) / (maxY - minY)) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
      {valid
        .filter((_, i) => i % Math.ceil(valid.length / 6) === 0)
        .map((p) => {
          const i = valid.findIndex((v) => v.t === p.t)
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          return (
            <text key={p.t} x={x} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
              {p.t}
            </text>
          )
        })}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {maxY.toFixed(0)}
      </text>
      <text x={4} y={H - P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {minY.toFixed(0)}
      </text>
    </svg>
  )
}
