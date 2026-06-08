'use client'
/**
 * <ViviendaPoliticaView /> · Vivienda v3 · Sprint V8
 *
 * Vista de políticas públicas activas. Tres lecturas:
 *
 *   1. Programas activos · leídos del catálogo `programas.json`. Cada
 *      programa cita su BOE/portal oficial.
 *   2. Distribución por régimen de tenencia (Eurostat ilc_lvho02) ·
 *      España vs UE. Permite ver la posición estructural española
 *      (¿es un país de propietarios?) frente a la media europea.
 *   3. CTA al panel de financiación del Tercer Sector para profundizar
 *      en BDNS · grants UE · IRPF 0,7% · concesiones vivienda.
 *
 * Cero datos inventados. Si Eurostat falla el panel cae limpio.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PROGRAMAS, type Programa } from '@/lib/vivienda/catalogos'

const ACCENT = '#1F4E8C'

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

export function ViviendaPoliticaView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header />
      <PanelProgramas />
      <PanelTenencia />
      <PanelFinanciacionCta />
    </div>
  )
}

function Header() {
  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, #0F2A4D 100%)`,
        borderRadius: 18,
        padding: '24px 32px',
        color: '#fff',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
        POLÍTICA · PROGRAMAS · MARCO REGULATORIO
      </p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
        Qué políticas tiene España y cómo se compara con la UE
      </h2>
      <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>
        Programas con presupuesto y BOE en la mano · posición estructural española vs la UE en
        régimen de tenencia · enlace con el cockpit de financiación al tercer sector para no
        duplicar el detalle de BDNS y grants UE.
      </p>
    </section>
  )
}

function PanelProgramas() {
  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 22px' }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: '0 0 4px' }}>
          Programas activos
        </h3>
        <p style={{ fontSize: 11, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          {PROGRAMAS.length} líneas con cobertura estatal · cada entrada con presupuesto declarado,
          fecha y enlace al BOE / portal oficial.
        </p>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #ECECEF' }}>
            <th style={Th}>Programa</th>
            <th style={Th}>Eje</th>
            <th style={{ ...Th, textAlign: 'right' }}>Presupuesto</th>
            <th style={Th}>Vigencia</th>
            <th style={Th}>Fuente</th>
          </tr>
        </thead>
        <tbody>
          {PROGRAMAS.map((p: Programa) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #F2F2F4' }}>
              <td style={{ ...Td, fontWeight: 700, fontFamily: 'var(--font-display)', borderLeft: `3px solid ${p.color}` }}>
                {p.programa}
                <div style={{ fontSize: 10.5, color: '#86868b', fontWeight: 400, marginTop: 2 }}>{p.descripcion}</div>
              </td>
              <td style={Td}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: `${p.color}20`,
                    color: p.color,
                    padding: '2px 7px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.eje.replace(/_/g, ' ')}
                </span>
              </td>
              <td style={{ ...Td, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1F4E8C' }}>
                {p.presupuesto_eur != null
                  ? `${(p.presupuesto_eur / 1_000_000_000).toFixed(2)} bn €`
                  : '—'}
                <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 400 }}>{p.presupuesto_descripcion}</div>
              </td>
              <td style={Td}>
                {p.fecha_inicio || '—'}
                {p.fecha_fin ? <> → {p.fecha_fin}</> : null}
                {p.ministerio && <div style={{ fontSize: 10, color: '#86868b' }}>{p.ministerio}</div>}
              </td>
              <td style={Td}>
                <a
                  href={p.fuente_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700, fontSize: 11 }}
                >
                  {p.fuente_label} ›
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function PanelTenencia() {
  const [env, setEnv] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/vivienda/eurostat-tenencia', { cache: 'no-store' })
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
      return { geo: s.geo, valor: last?.value ?? null, time: last?.time ?? '' }
    })
    .filter((r) => r.valor != null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 22px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
          Régimen de tenencia · España vs UE
        </h3>
        <a
          href={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho02'}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10.5, color: '#86868b', textDecoration: 'none' }}
        >
          {env?.fuente?.split(' · ')[0] || 'Eurostat ilc_lvho02'} ›
        </a>
      </header>
      <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
        Distribución de la población por régimen de tenencia de la vivienda. Permite ver la
        posición estructural española (tradicionalmente "país de propietarios") frente a la media
        europea y a países de referencia (Austria, Países Bajos con fuerte presencia de alquiler
        social).
      </p>

      {loading ? (
        <Skeleton h={200} />
      ) : !env?.ok || ranked.length === 0 ? (
        <Vacio msg={`Eurostat no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranked.map((r) => {
            const isES = r.geo === 'ES'
            const widthPct = (r.valor as number)
            return (
              <li
                key={r.geo}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 80px',
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
                  <div style={{ height: '100%', width: `${widthPct}%`, background: isES ? '#DB2777' : ACCENT }} />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: isES ? '#9D174D' : ACCENT,
                    textAlign: 'right',
                  }}
                >
                  {(r.valor as number).toFixed(1)}% ({r.time})
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function PanelFinanciacionCta() {
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
        Financiación pública: ver cockpit unificado en Tercer Sector
      </h3>
      <p style={{ fontSize: 12, color: '#3a3a3d', margin: '0 0 12px', lineHeight: 1.55, maxWidth: 860 }}>
        El detalle de convocatorias BDNS, grants UE (SEDIA), bonos sociales del BEI, IRPF 0,7% y
        concesiones a entidades del tercer sector ya vive en el cockpit del Tercer Sector. Desde
        ahí se puede filtrar por sector vivienda / sinhogarismo y bajar al pliego con análisis
        determinista. No duplicamos los datos aquí · enlazamos.
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
        <Link
          href="/sector-vivienda?vv=social"
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
          Vivienda · Convocatorias vivienda y vulnerabilidad ›
        </Link>
      </div>
    </section>
  )
}

// ─── helpers ───
const Th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6e6e73',
  padding: '8px 10px',
}
const Td: React.CSSProperties = {
  fontSize: 11.5,
  color: '#1d1d1f',
  padding: '10px 10px',
  verticalAlign: 'top',
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
