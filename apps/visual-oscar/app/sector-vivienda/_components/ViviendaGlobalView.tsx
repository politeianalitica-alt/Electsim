'use client'
/**
 * <ViviendaGlobalView /> · Vivienda v3 · Sprint V1
 *
 * Landing del shell. PRESERVA toda la funcionalidad viva del rediseño
 * anterior (4 KPIs hero + IPV + compraventas stacked + donut tipología +
 * IPVA alquiler + licitaciones + SectorIntelPanel + cuaderno de notas)
 * para no perder nada visible. La diferencia con la página plana:
 *
 *   - Los catálogos de programas / empresas / reguladores / áreas se
 *     leen desde `lib/vivienda/catalogos/*.json` (con fuente y fecha
 *     en cada entrada), no desde arrays hardcoded en `lib/sources/ine`.
 *   - Cada bloque secundario (programas, empresas, reguladores, áreas)
 *     ofrece un CTA de navegación a la sub-tab profunda correspondiente
 *     (V5-V10), para que el usuario sepa dónde se profundiza.
 *
 * Datos en vivo desde INE TempUS (`/api/sectores/vivienda/*`).
 * Auto-refresh cada 60 min (datos publicados con frecuencia mensual/trim.).
 *
 * Cero emojis (CLAUDE.md §0.5).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import {
  PROGRAMAS,
  REGULADORES,
  EMPRESAS,
  AREAS_TEMATICAS,
  type Programa,
  type Regulador,
  type Empresa,
  type AreaTematica,
  type ViviendaTabId,
} from '@/lib/vivienda/catalogos'

interface ResumenResp {
  kpis: {
    ipv_indice: number | null
    ipv_indice_periodo?: string
    ipv_var_anual: number | null
    ipv_var_anual_periodo?: string
    compraventas_mes: number | null
    compraventas_mes_periodo?: string
    alquiler_var_anual: number | null
    alquiler_var_anual_periodo?: string
  }
  fetch_ms: number
}
interface PreciosResp {
  points: Array<{ t: string; indice: number | null; var_anual: number | null }>
}
interface CompraventasResp {
  points: Array<{ t: string; libre: number; protegida: number; nueva: number; usada: number }>
  totales: { libre: number; protegida: number; nueva: number; usada: number; total: number }
}
interface AlquilerResp {
  points: Array<{ t: string; indice: number | null; var_anual: number | null }>
}

const ACCENT = '#DB2777'
const ACCENT_DARK = '#831843'
const REFRESH_MS = 60 * 60 * 1000

interface Props {
  onNavigate: (tab: ViviendaTabId) => void
}

export function ViviendaGlobalView({ onNavigate }: Props) {
  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [precios, setPrecios] = useState<PreciosResp | null>(null)
  const [compras, setCompras] = useState<CompraventasResp | null>(null)
  const [alquiler, setAlquiler] = useState<AlquilerResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, p, c, a] = await Promise.all([
      fetch('/api/sectores/vivienda/resumen').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/sectores/vivienda/precios?nult=24').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/sectores/vivienda/compraventas?nult=18').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/sectores/vivienda/alquiler?nult=10').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
    setResumen(r)
    setPrecios(p)
    setCompras(c)
    setAlquiler(a)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius: 18,
          padding: '28px 36px',
          marginBottom: 18,
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 32,
          alignItems: 'center',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.16em',
              opacity: 0.8,
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            SECTORIAL · VIVIENDA & INMOBILIARIO · DATOS INE EN VIVO
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '-0.024em',
              margin: '0 0 10px',
              lineHeight: 1.05,
            }}
          >
            Mercado de la vivienda{' '}
            <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en tiempo real</em>
          </h1>
          <p style={{ fontSize: 13.5, opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
            Índice de Precios de Vivienda (IPV) · compraventas por segmento (libre, protegida, nueva,
            usada) · precios del alquiler (IPVA) · empresas cotizadas, SOCIMIs, promotores, marco
            regulatorio. Datos oficiales del Instituto Nacional de Estadística.
          </p>
          {updatedAt && (
            <div
              style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.7 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#86EFAC',
                  boxShadow: '0 0 8px #86EFAC',
                }}
              />
              Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
              {resumen?.fetch_ms ? ` · ${resumen.fetch_ms} ms` : ''}
              <button
                onClick={refresh}
                style={{
                  marginLeft: 8,
                  fontSize: 10.5,
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.35)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↻ Actualizar
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <HeroKPI
            label={`IPV ${resumen?.kpis.ipv_indice_periodo || ''}`}
            value={resumen?.kpis.ipv_indice}
            unit=""
            decimals={2}
            accent="#FCD34D"
            sub="Base 2015 = 100"
          />
          <HeroKPI
            label={`Variación anual (${resumen?.kpis.ipv_var_anual_periodo || ''})`}
            value={resumen?.kpis.ipv_var_anual}
            unit="%"
            decimals={1}
            accent="#FCA5A5"
          />
          <HeroKPI
            label={`Compraventas ${resumen?.kpis.compraventas_mes_periodo || ''}`}
            value={resumen?.kpis.compraventas_mes}
            unit=""
            accent="#86EFAC"
            sub="Libre + protegida"
          />
          <HeroKPI
            label={`Alquiler ${resumen?.kpis.alquiler_var_anual_periodo || ''}`}
            value={resumen?.kpis.alquiler_var_anual}
            unit="%"
            decimals={1}
            accent="#7DD3FC"
            sub="Variación anual IPVA"
          />
        </div>
      </section>

      {/* ROW 1: IPV + Compraventas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="IPV · Índice de Precios de Vivienda"
          subtitle={precios ? `Trimestral · ${precios.points.length} observaciones · base 2015 = 100` : 'Cargando…'}
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=4960"
          sourceLabel="INE"
          sourceTooltip="IPV · INE · Índice Precios Vivienda trimestral"
          apiUrl="/api/sectores/vivienda/precios?nult=24"
        >
          {precios && <PreciosLineChart points={precios.points} />}
        </Panel>
        <Panel
          title="Compraventas mensuales · Total nacional"
          subtitle={compras ? `Suma 18 meses: ${compras.totales.total.toLocaleString('es-ES')} viviendas` : 'Cargando…'}
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=8169"
          sourceLabel="INE"
          sourceTooltip="Estadística Transmisiones Derechos Propiedad · INE"
          apiUrl="/api/sectores/vivienda/compraventas?nult=18"
        >
          {compras && <CompraventasStacked points={compras.points} />}
        </Panel>
      </div>

      {/* ROW 2: Donut + IPVA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Distribución de compraventas · 18 meses"
          subtitle="Por tipología de vivienda"
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=8169"
          sourceLabel="INE"
          sourceTooltip="Compraventas por tipología · INE ETDP"
          apiUrl="/api/sectores/vivienda/compraventas?nult=18"
        >
          {compras && <CompraventasDonut totales={compras.totales} />}
        </Panel>
        <Panel
          title="IPVA · Índice Precios Vivienda Alquiler"
          subtitle={alquiler ? `${alquiler.points.length} años · variación anual` : 'Cargando…'}
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10309"
          sourceLabel="INE"
          sourceTooltip="IPVA · INE · variación anual del alquiler"
          apiUrl="/api/sectores/vivienda/alquiler?nult=10"
        >
          {alquiler && <AlquilerLineChart points={alquiler.points} />}
        </Panel>
      </div>

      {/* ROW 3: Programas activos · ahora desde catálogo JSON con fuente */}
      <Panel
        title="Programas y políticas activas"
        subtitle={`${PROGRAMAS.length} líneas · Plan Estatal · Bono Joven · Ley 12/2023 · SAREB · NextGen · BTR`}
        marginBottom
      >
        <ProgramasGrid programas={PROGRAMAS} onNavigate={() => onNavigate('politica')} />
      </Panel>

      {/* ROW 4: Empresas + Reguladores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Empresas cotizadas del sector"
          subtitle={`${EMPRESAS.length} compañías · IBEX, SOCIMIs y promotores`}
        >
          <EmpresasGrid empresas={EMPRESAS} onNavigate={() => onNavigate('mercado')} />
        </Panel>
        <Panel title="Reguladores y operadores" subtitle={`${REGULADORES.length} instituciones · marco institucional`}>
          <RegLista reguladores={REGULADORES} />
        </Panel>
      </div>

      {/* ROW 5: Licitaciones + Áreas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Licitaciones del sector" subtitle="CPV 70 · Servicios inmobiliarios + 45 · Construcción">
          <LicitacionesShortcut />
        </Panel>
        <Panel
          title="Áreas estratégicas del sector"
          subtitle={`${AREAS_TEMATICAS.length} ejes · topic taxonomy Politeia`}
        >
          <AreasGrid areas={AREAS_TEMATICAS} onNavigate={onNavigate} />
        </Panel>
      </div>

      {/* Politeia intel · housing_markets ZMT + tensión */}
      <SectorIntelPanel sector="vivienda" />

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>
          Cargando datos INE…
        </div>
      )}

      {/* Cuaderno N2 · notas sobre sector Vivienda */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="vivienda" name="Sector Vivienda" accentColor="#DC2626" />
      </div>
    </div>
  )
}

// ─── Componentes internos ────────────────────────────────────

function HeroKPI({
  label,
  value,
  unit,
  accent,
  sub,
  decimals = 0,
}: {
  label: string
  value: number | null | undefined
  unit: string
  accent: string
  sub?: string
  decimals?: number
}) {
  const display =
    value == null
      ? '—'
      : value.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.72,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: accent,
        }}
      >
        {display}
        <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function PreciosLineChart({ points }: { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }) {
  const valid = points.filter((p) => p.indice != null)
  if (!valid.length) return <div style={{ color: '#86868b', fontSize: 12 }}>Sin datos</div>

  const W = 500
  const H = 200
  const P = 30
  const indices = valid.map((p) => p.indice as number)
  const minY = Math.min(...indices) * 0.98
  const maxY = Math.max(...indices) * 1.02

  const pathIndice = valid
    .map((p, i) => {
      const x = P + (i / (valid.length - 1)) * (W - 2 * P)
      const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const varValid = points.filter((p) => p.var_anual != null)

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
        ))}
        <path d={pathIndice} fill="none" stroke={ACCENT} strokeWidth={2.5} />
        {valid.map((p, i) => {
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return (
            <circle key={p.t} cx={x} cy={y} r={2.5} fill={ACCENT}>
              <title>
                {p.t}: {p.indice} (var {p.var_anual?.toFixed(1)}%)
              </title>
            </circle>
          )
        })}
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
      <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 2, background: ACCENT }} />
          <span style={{ color: '#3a3a3d', fontWeight: 600 }}>Índice IPV</span>
          {valid.length > 0 && (
            <span style={{ color: ACCENT, fontFamily: 'var(--font-display)', fontWeight: 700, marginLeft: 4 }}>
              {valid[valid.length - 1].indice?.toFixed(2)}
            </span>
          )}
        </span>
        {varValid.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#86868b' }}>· Var. anual último periodo:</span>
            <span style={{ color: '#16A34A', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              +{varValid[varValid.length - 1].var_anual?.toFixed(1)}%
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

function CompraventasStacked({ points }: { points: Array<{ t: string; libre: number; protegida: number }> }) {
  if (!points.length) return <div style={{ color: '#86868b', fontSize: 12 }}>Sin datos</div>
  const W = 500
  const H = 200
  const P = 14
  const colW = (W - 2 * P) / points.length
  const maxTotal = Math.max(...points.map((p) => p.libre + p.protegida)) * 1.05
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 25}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      {points.map((p, i) => {
        const totalH = ((p.libre + p.protegida) / maxTotal) * (H - 2 * P)
        const libreH = (p.libre / (p.libre + p.protegida || 1)) * totalH
        const protH = totalH - libreH
        const x = P + i * colW + 2
        const w = colW - 4
        return (
          <g key={p.t}>
            <rect x={x} y={H - P - totalH} width={w} height={libreH} fill="#DB2777">
              <title>
                {p.t} · libre {p.libre.toLocaleString('es-ES')}
              </title>
            </rect>
            <rect x={x} y={H - P - protH} width={w} height={protH} fill="#FCA5A5">
              <title>
                {p.t} · protegida {p.protegida.toLocaleString('es-ES')}
              </title>
            </rect>
            {i % 2 === 0 && (
              <text x={x + w / 2} y={H + 12} textAnchor="middle" style={{ fontSize: 8.5, fill: '#86868b' }}>
                {p.t.slice(2)}
              </text>
            )}
          </g>
        )
      })}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {Math.round(maxTotal).toLocaleString('es-ES')}
      </text>
      {(() => {
        const last = points[points.length - 1]
        const x = P + (points.length - 0.5) * colW
        return (
          <g>
            <text
              x={x}
              y={H - P - 4}
              textAnchor="middle"
              style={{ fontSize: 10, fontWeight: 700, fill: '#1d1d1f', fontFamily: 'var(--font-display)' }}
            >
              {(last.libre + last.protegida).toLocaleString('es-ES')}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

function CompraventasDonut({ totales }: { totales: { libre: number; protegida: number; nueva: number; usada: number } }) {
  const radius = 65
  const stroke = 18
  const circ = 2 * Math.PI * radius
  const total1 = totales.libre + totales.protegida
  const segments1 = [
    { label: 'Libre', value: totales.libre, color: '#DB2777' },
    { label: 'Protegida', value: totales.protegida, color: '#FCA5A5' },
  ]
  let acum = 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center' }}>
      <svg width={radius * 2 + stroke} height={radius * 2 + stroke}>
        <g transform={`translate(${radius + stroke / 2},${radius + stroke / 2}) rotate(-90)`}>
          {segments1.map((s) => {
            const len = (s.value / total1) * circ
            const offset = -acum
            acum += len
            return (
              <circle
                key={s.label}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={offset}
                style={{ cursor: 'pointer' }}
              >
                <title>
                  {s.label}: {s.value.toLocaleString('es-ES')} compraventas ({((s.value / total1) * 100).toFixed(1)}%)
                </title>
              </circle>
            )
          })}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, fill: '#1d1d1f' }}
        >
          {(total1 / 1000).toFixed(0)}k
        </text>
        <text x="50%" y="58%" textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
          compraventas
        </text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 11.5 }}>
        <li style={{ marginBottom: 6 }}>
          <strong style={{ color: '#86868b', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Régimen
          </strong>
        </li>
        {segments1.map((s) => (
          <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#3a3a3d', fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: '#1F4E8C', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {s.value.toLocaleString('es-ES')}{' '}
              <span style={{ color: '#86868b', fontWeight: 500 }}>· {((s.value / total1) * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
        <li style={{ marginTop: 10, marginBottom: 6 }}>
          <strong style={{ color: '#86868b', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Antigüedad
          </strong>
        </li>
        <li style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 11.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0EA5E9' }} />
          <span style={{ flex: 1, color: '#3a3a3d', fontWeight: 600 }}>Vivienda nueva</span>
          <span style={{ color: '#1F4E8C', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {totales.nueva.toLocaleString('es-ES')}
          </span>
        </li>
        <li style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0F766E' }} />
          <span style={{ flex: 1, color: '#3a3a3d', fontWeight: 600 }}>Segunda mano</span>
          <span style={{ color: '#1F4E8C', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {totales.usada.toLocaleString('es-ES')}
          </span>
        </li>
      </ul>
    </div>
  )
}

function AlquilerLineChart({ points }: { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }) {
  const valid = points.filter((p) => p.indice != null)
  if (!valid.length) return <div style={{ color: '#86868b', fontSize: 12 }}>Sin datos disponibles</div>
  const W = 500
  const H = 200
  const P = 24
  const indices = valid.map((p) => p.indice as number)
  const minY = Math.min(...indices) * 0.98
  const maxY = Math.max(...indices) * 1.02
  const path = valid
    .map((p, i) => {
      const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
      const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
        ))}
        <path d={path} fill="none" stroke="#0EA5E9" strokeWidth={2.5} />
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return (
            <g key={p.t}>
              <circle cx={x} cy={y} r={3} fill="#0EA5E9">
                <title>
                  {p.t}: {p.indice} (var {p.var_anual?.toFixed(1)}%)
                </title>
              </circle>
              <text x={x} y={H + 12} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
                {p.t}
              </text>
              {p.var_anual != null && (
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  style={{ fontSize: 9, fontWeight: 700, fill: p.var_anual > 0 ? '#16A34A' : '#DC2626' }}
                >
                  {p.var_anual > 0 ? '+' : ''}
                  {p.var_anual.toFixed(1)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ProgramasGrid({ programas, onNavigate }: { programas: Programa[]; onNavigate: () => void }) {
  return (
    <>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 10,
        }}
      >
        {programas.map((p) => (
          <li
            key={p.id}
            style={{
              padding: '12px 16px',
              background: '#FAFAFA',
              borderRadius: 10,
              border: '1px solid #ECECEF',
              borderLeft: `4px solid ${p.color}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 3,
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1d1d1f',
                }}
              >
                {p.programa}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: `${p.color}20`,
                  color: p.color,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.estado.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4, margin: '4px 0' }}>{p.descripcion}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
              <a
                href={p.fuente_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 9.5, color: '#86868b', textDecoration: 'none' }}
              >
                {p.fuente_label} ›
              </a>
              {p.presupuesto_eur != null && (
                <span
                  style={{
                    fontSize: 10.5,
                    color: '#1F4E8C',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                  }}
                >
                  {(p.presupuesto_eur / 1_000_000_000).toFixed(2)} bn €
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={onNavigate}
        style={{
          marginTop: 10,
          fontSize: 11,
          padding: '6px 14px',
          borderRadius: 999,
          background: '#fff',
          border: `1px solid ${ACCENT}`,
          color: ACCENT,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 700,
        }}
      >
        Ver Política a fondo ›
      </button>
    </>
  )
}

function EmpresasGrid({ empresas, onNavigate }: { empresas: Empresa[]; onNavigate: () => void }) {
  return (
    <>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          gap: 10,
        }}
      >
        {empresas.map((e) => (
          <li key={e.id}>
            <a
              href={e.web || e.cnmv_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                padding: '10px 12px',
                background: '#FAFAFA',
                borderRadius: 10,
                border: '1px solid #ECECEF',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    fontSize: 13.5,
                    color: '#1d1d1f',
                  }}
                >
                  {e.nombre}
                </span>
                {e.ibex && (
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#FCD34D',
                      color: '#92400E',
                    }}
                  >
                    IBEX 35
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#86868b', fontFamily: 'monospace', marginTop: 2 }}>{e.ticker}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.4 }}>{e.descripcion}</div>
              <div
                style={{
                  fontSize: 9.5,
                  color: ACCENT,
                  fontWeight: 700,
                  marginTop: 5,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {e.segmento}
              </div>
            </a>
          </li>
        ))}
      </ul>
      <button
        onClick={onNavigate}
        style={{
          marginTop: 10,
          fontSize: 11,
          padding: '6px 14px',
          borderRadius: 999,
          background: '#fff',
          border: `1px solid ${ACCENT}`,
          color: ACCENT,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 700,
        }}
      >
        Ver SOCIMIs y mercado ›
      </button>
    </>
  )
}

function RegLista({ reguladores }: { reguladores: Regulador[] }) {
  return (
    <ul
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {reguladores.map((r) => (
        <li key={r.id}>
          <a
            href={r.web}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              padding: '10px 12px',
              background: '#FAFAFA',
              borderRadius: 10,
              border: '1px solid #ECECEF',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f' }}>{r.siglas}</span>
              <span style={{ fontSize: 10, color: '#86868b', maxWidth: 200, textAlign: 'right' }}>{r.nombre}</span>
            </div>
            <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.4 }}>{r.competencias}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

function LicitacionesShortcut() {
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<
    Array<{ id: string; objeto: string; organo: string; importe?: number; url?: string }>
  >([])
  useEffect(() => {
    fetch('/api/licitaciones/buscar?cpv_div=70&page_size=5&sort=date_desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setCount(d.pagination?.total_estimado ?? d.stats?.total ?? 0)
        setItems(
          (d.items || []).slice(0, 5).map(
            (it: {
              id: string
              objeto: string
              organo: string
              importe_adjudicacion?: number
              importe_licitacion?: number
              url?: string
            }) => ({
              id: it.id,
              objeto: it.objeto,
              organo: it.organo,
              importe: it.importe_adjudicacion ?? it.importe_licitacion,
              url: it.url,
            })
          )
        )
      })
  }, [])
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>Últimos contratos publicados</span>
        <Link
          href="/licitaciones?cpv_div=70"
          style={{ fontSize: 11, color: '#1F4E8C', textDecoration: 'none', fontWeight: 600 }}
        >
          Ver buscador {count != null && `· ${count.toLocaleString('es-ES')} en total ›`}
        </Link>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <li style={{ fontSize: 11, color: '#86868b' }}>Cargando…</li>}
        {items.map((it) => (
          <li
            key={it.id}
            style={{ padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF' }}
          >
            <a href={it.url || '#'} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              <div style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 600, lineHeight: 1.4 }}>
                {it.objeto.length > 90 ? it.objeto.slice(0, 89) + '…' : it.objeto}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10.5 }}>
                <span style={{ color: '#86868b' }}>{it.organo}</span>
                {it.importe && (
                  <span style={{ fontFamily: 'var(--font-display)', color: '#1F4E8C', fontWeight: 700 }}>
                    {(it.importe / 1_000_000).toFixed(2)}M €
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AreasGrid({
  areas,
  onNavigate,
}: {
  areas: AreaTematica[]
  onNavigate: (tab: ViviendaTabId) => void
}) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 10,
      }}
    >
      {areas.map((a) => (
        <li key={a.id}>
          <button
            onClick={() => onNavigate(a.tab_destino)}
            style={{
              display: 'block',
              padding: '12px 14px',
              background: '#FAFAFA',
              borderRadius: 10,
              border: '1px solid #ECECEF',
              borderTop: `3px solid ${a.color}`,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              color: 'inherit',
              width: '100%',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.01em',
              }}
            >
              {a.titulo}
            </div>
            <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 5, lineHeight: 1.4 }}>{a.descripcion}</div>
            <div style={{ fontSize: 9.5, color: a.color, marginTop: 6, fontWeight: 700, letterSpacing: '0.04em' }}>
              IR A {a.tab_destino.toUpperCase()} ›
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
