'use client'
/**
 * <FarmaRegulacionView /> · Farma v3 · Sprint F7
 *
 * Vista Regulación + Farmacovigilancia. Tres bloques:
 *   1. Catálogo de reguladores (ES + UE) leído de `lib/farma/catalogos/reguladores.json`.
 *   2. Programas activos (Plan Estatal Farmacéutico, PERTE Salud Vanguardia, Reglamento UE, …)
 *      leído de `lib/farma/catalogos/programas.json`.
 *   3. EMA RSS · 3 feeds (News + Shortages + Referrals) en vivo.
 */
import { useEffect, useState } from 'react'
import { REGULADORES_FARMA, PROGRAMAS_FARMA } from '@/lib/farma/catalogos'
import { Panel, Skeleton, Vacio, SectorHero, Th, Td } from '@/lib/sectores/charts'

const ACCENT = '#DC2626'

interface EmaItem {
  titulo: string
  link: string
  fecha: string | null
  resumen: string
  kind: 'news' | 'shortages' | 'referrals'
}
interface EmaEnvelope {
  ok: boolean
  data: { items: EmaItem[] } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

export function FarmaRegulacionView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="FARMA · REGULACIÓN · FARMACOVIGILANCIA"
        titulo="Quién decide y qué señales hay esta semana"
        descripcion="Marco institucional del sector farmacéutico español y europeo. Programas activos (PERTE Salud Vanguardia, Reglamento UE Farmacéutico en negociación) con su BOE / fuente oficial. Y alertas EMA en vivo de tres feeds RSS · noticias regulatorias, escasez de medicamentos críticos y revisiones de seguridad."
        colorFrom={ACCENT}
        colorTo="#7F1D1D"
      />

      <PanelProgramas />
      <PanelReguladores />
      <PanelEma kind="shortages" titulo="EMA · Escasez de medicamentos críticos (shortages)" color="#F97316" />
      <PanelEma kind="news" titulo="EMA · Noticias regulatorias humanas (news)" color={ACCENT} />
      <PanelEma kind="referrals" titulo="EMA · Revisiones de seguridad (referrals)" color="#7C3AED" />
    </div>
  )
}

function PanelProgramas() {
  return (
    <Panel
      titulo="Programas activos · políticas farmacéuticas"
      fuente="Catálogo Politeia · fuente BOE / portales oficiales"
      url="https://planderecuperacion.gob.es/como-acceder-a-los-fondos/pertes/perte-salud-vanguardia"
    >
      <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
        {PROGRAMAS_FARMA.length} líneas activas cubriendo política industrial (PERTE), regulación
        europea, salud pública (PRAN antibióticos), marco clínico y acceso (CIPM precios).
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
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
            {PROGRAMAS_FARMA.map((p) => (
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
      </div>
    </Panel>
  )
}

function PanelReguladores() {
  // Agrupar por ámbito
  const ES = REGULADORES_FARMA.filter((r) => r.ambito === 'estatal')
  const UE = REGULADORES_FARMA.filter((r) => r.ambito === 'ue')
  return (
    <Panel titulo="Marco institucional · reguladores y operadores" fuente={`${REGULADORES_FARMA.length} entidades curadas`} url="https://www.aemps.gob.es/">
      {[{ label: 'Ámbito estatal', items: ES }, { label: 'Ámbito UE', items: UE }].map(({ label, items }) =>
        items.length === 0 ? null : (
          <div key={label} style={{ marginBottom: 14 }}>
            <h4
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
                margin: '0 0 8px',
              }}
            >
              {label} · {items.length}
            </h4>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 8,
              }}
            >
              {items.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.web}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      padding: '10px 14px',
                      background: '#FAFAFA',
                      borderRadius: 10,
                      border: '1px solid #ECECEF',
                      borderLeft: '3px solid #1F4E8C',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'var(--font-display)' }}>{r.siglas}</span>
                      <span style={{ fontSize: 10, color: '#86868b', textAlign: 'right', maxWidth: 200 }}>{r.nombre}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{r.competencias}</div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </Panel>
  )
}

function PanelEma({ kind, titulo, color }: { kind: 'news' | 'shortages' | 'referrals'; titulo: string; color: string }) {
  const [env, setEnv] = useState<EmaEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch(`/api/farma/ema-alertas?kind=${kind}&limit=12`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EmaEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [kind])
  const items = env?.data?.items ?? []
  return (
    <Panel titulo={titulo} fuente={env?.fuente || `EMA RSS · ${kind}`} url={env?.fuente_url || `https://www.ema.europa.eu/en/rss/${kind}_en.xml`}>
      {loading ? (
        <Skeleton h={160} />
      ) : !env?.ok || items.length === 0 ? (
        <Vacio msg={`EMA RSS ${kind} no disponible · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it, i) => (
            <li
              key={`${it.link}-${i}`}
              style={{
                padding: '10px 12px',
                background: '#FAFAFA',
                borderRadius: 8,
                border: '1px solid #ECECEF',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <a href={it.link} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4 }}>{it.titulo}</div>
                {it.resumen && (
                  <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{it.resumen}</div>
                )}
                <div style={{ fontSize: 10, color: '#86868b', marginTop: 5 }}>
                  {it.fecha || ''} · ema.europa.eu ›
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
