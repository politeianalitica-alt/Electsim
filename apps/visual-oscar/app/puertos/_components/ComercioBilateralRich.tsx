'use client'
/**
 * <ComercioBilateralRich /> · Comercio bilateral de un país, vista rica.
 *
 * Componente REUTILIZABLE: dado un `reporter` (alpha-3, default 'ESP'),
 * pinta los flujos comerciales declarados de ese país:
 *   - Selector de país reporter (<Combobox /> de @/components/ports).
 *   - KPIs de balanza comercial (exportaciones · importaciones · saldo).
 *   - Top socios de EXPORTACIÓN e IMPORTACIÓN (tablas país + valor + %).
 *   - Visual de flujos reporter → socio derivado de `pares` (no Sankey HS).
 *
 * Datos vía GET /api/maritimo/comercio-bilateral?reporter=XXX
 *   Envelope: { ok, data:{ reporter, partner, year, top_export[], top_import[],
 *               balanza, pares[], source }, error, fetched_at, source_url }
 *   (shape canónico en lib/maritimo/comercio-bilateral.ts)
 *
 * NOTA sobre <BilateralTradeSankey /> de @/components/ports:
 *   ese Sankey espera `TradeFlow[]` con campo `hs_code` (reporter→partner→HS
 *   chapter). Nuestro endpoint devuelve agregados por pareja SIN desglose HS
 *   (`BilateralFlow` no tiene `hs_code`). Reutilizarlo exigiría INVENTAR
 *   códigos HS — prohibido (CLAUDE.md). Por eso NO se reutiliza aquí y se
 *   pinta un visual honesto de barras de flujo a partir de `pares`.
 *
 * Reglas del repo: 'use client', cero emojis (glifos Unicode), marca teal
 * ACCENT '#0e7490', degradación honesta (sin datos → estado vacío explícito,
 * nunca datos inventados).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { Combobox } from '@/components/ports/Combobox'
import type {
  BilateralFlow,
  TopPartner,
  TradeBalance,
} from '@/lib/maritimo/comercio-bilateral'

/** Teal portuario · marca del sector marítimo. */
const ACCENT = '#0e7490'
const POS = '#0e7490' // saldo positivo (teal)
const NEG = '#b4232a' // saldo negativo (rojo sobrio)

/** Países reporter ofrecidos en el selector (los que la capa sabe resolver). */
interface ReporterOpt {
  iso3: string
  name: string
}
const REPORTERS: ReporterOpt[] = [
  { iso3: 'ESP', name: 'España' },
  { iso3: 'DEU', name: 'Alemania' },
  { iso3: 'FRA', name: 'Francia' },
  { iso3: 'ITA', name: 'Italia' },
  { iso3: 'PRT', name: 'Portugal' },
  { iso3: 'NLD', name: 'Países Bajos' },
  { iso3: 'BEL', name: 'Bélgica' },
  { iso3: 'GBR', name: 'Reino Unido' },
  { iso3: 'IRL', name: 'Irlanda' },
  { iso3: 'POL', name: 'Polonia' },
  { iso3: 'GRC', name: 'Grecia' },
  { iso3: 'AUT', name: 'Austria' },
  { iso3: 'DNK', name: 'Dinamarca' },
  { iso3: 'SWE', name: 'Suecia' },
  { iso3: 'CHE', name: 'Suiza' },
  { iso3: 'NOR', name: 'Noruega' },
  { iso3: 'USA', name: 'Estados Unidos' },
  { iso3: 'CAN', name: 'Canadá' },
  { iso3: 'MEX', name: 'México' },
  { iso3: 'BRA', name: 'Brasil' },
  { iso3: 'ARG', name: 'Argentina' },
  { iso3: 'CHL', name: 'Chile' },
  { iso3: 'CHN', name: 'China' },
  { iso3: 'JPN', name: 'Japón' },
  { iso3: 'KOR', name: 'Corea del Sur' },
  { iso3: 'IND', name: 'India' },
  { iso3: 'TUR', name: 'Turquía' },
  { iso3: 'SAU', name: 'Arabia Saudí' },
  { iso3: 'ARE', name: 'Emiratos Árabes Unidos' },
  { iso3: 'SGP', name: 'Singapur' },
  { iso3: 'MAR', name: 'Marruecos' },
  { iso3: 'DZA', name: 'Argelia' },
  { iso3: 'EGY', name: 'Egipto' },
  { iso3: 'NGA', name: 'Nigeria' },
  { iso3: 'ZAF', name: 'Sudáfrica' },
  { iso3: 'AUS', name: 'Australia' },
]

const REPORTER_NAME = new Map(REPORTERS.map((r) => [r.iso3, r.name]))

// ─────────────────────────────────────────────────────────────────
// Shapes del envelope del endpoint
// ─────────────────────────────────────────────────────────────────
interface BilateralData {
  reporter: string
  partner: string | null
  year: number
  top_export: TopPartner[]
  top_import: TopPartner[]
  balanza: TradeBalance
  pares: BilateralFlow[]
  source: 'comtrade' | 'oec' | 'none'
}
interface BilateralEnvelope {
  ok: boolean
  data: BilateralData | null
  error: string | null
  fetched_at: string
  source_url: string
}

const EMPTY_BALANCE: TradeBalance = {
  exports_usd: 0,
  imports_usd: 0,
  balance_usd: 0,
  exports_fmt: '—',
  imports_fmt: '—',
  balance_fmt: '—',
}

const SOURCE_LABEL: Record<string, string> = {
  comtrade: 'UN Comtrade',
  oec: 'OEC',
  none: '—',
}

// ─────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────
interface Props {
  reporter?: string
}

export default function ComercioBilateralRich({ reporter = 'ESP' }: Props) {
  const [code, setCode] = useState((reporter || 'ESP').toUpperCase())
  const [env, setEnv] = useState<BilateralEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  // Sincroniza si el prop cambia desde fuera.
  useEffect(() => {
    setCode((reporter || 'ESP').toUpperCase())
  }, [reporter])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/maritimo/comercio-bilateral?reporter=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j: BilateralEnvelope) => {
        if (alive) setEnv(j)
      })
      .catch((e) => {
        if (alive) {
          setEnv({
            ok: false,
            data: null,
            error: String(e?.message ?? e).slice(0, 160),
            fetched_at: new Date().toISOString(),
            source_url: 'https://comtradeplus.un.org',
          })
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [code])

  const data = env?.data ?? null
  const ok = !!env?.ok && !!data
  const balanza = data?.balanza ?? EMPTY_BALANCE
  const topExport = data?.top_export ?? []
  const topImport = data?.top_import ?? []
  const pares = data?.pares ?? []
  const year = data?.year
  const source = data?.source ?? 'none'
  const reporterName = REPORTER_NAME.get(code) ?? code
  const sourceUrl = env?.source_url ?? 'https://comtradeplus.un.org'
  const balancePositive = (balanza.balance_usd ?? 0) >= 0

  const subtitle = useMemo(() => {
    const parts: string[] = []
    if (year) parts.push(`Año ${year}`)
    if (ok && source !== 'none') parts.push(`Fuente: ${SOURCE_LABEL[source] ?? source}`)
    parts.push('Valores en USD declarados')
    return parts.join(' · ')
  }, [year, ok, source])

  return (
    <Panel
      title={`Comercio bilateral · ${reporterName}`}
      subtitle={subtitle}
      sourceUrl={sourceUrl}
      sourceLabel={source === 'oec' ? 'OEC' : 'UN Comtrade'}
      sourceTooltip="Abrir portal oficial de la fuente de comercio declarado"
    >
      {/* ───── Selector de país reporter ───── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>
          País declarante
        </span>
        <Combobox<ReporterOpt>
          value={code}
          onChange={(v) => v && setCode(v.toUpperCase())}
          options={REPORTERS}
          getValue={(o) => o.iso3}
          getLabel={(o) => `${o.name} (${o.iso3})`}
          placeholder="Buscar país…"
          width={260}
          renderOption={(o, active) => (
            <span
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                color: active ? '#1d1d1f' : '#33333a',
              }}
            >
              <span>{o.name}</span>
              <span style={{ color: '#9a9aa0', fontVariantNumeric: 'tabular-nums' }}>
                {o.iso3}
              </span>
            </span>
          )}
        />
        {loading && (
          <span style={{ fontSize: 11, color: '#9a9aa0' }}>◐ cargando…</span>
        )}
      </div>

      {/* ───── Estado de carga / error / vacío ───── */}
      {loading && !data ? (
        <SkeletonBlock />
      ) : !ok ? (
        <EmptyState
          message={
            env?.error
              ? `Sin datos de comercio para ${reporterName}: ${env.error}`
              : `Sin datos de comercio bilateral disponibles para ${reporterName}.`
          }
        />
      ) : (
        <>
          {/* ───── KPIs de balanza comercial ───── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <KpiCard
              glyph="⇡"
              label="Exportaciones"
              value={balanza.exports_fmt}
              accent={ACCENT}
            />
            <KpiCard
              glyph="⇣"
              label="Importaciones"
              value={balanza.imports_fmt}
              accent="#6e6e73"
            />
            <KpiCard
              glyph={balancePositive ? '◉' : '◐'}
              label={balancePositive ? 'Superávit comercial' : 'Déficit comercial'}
              value={balanza.balance_fmt}
              accent={balancePositive ? POS : NEG}
              strong
            />
          </div>

          {/* ───── Tablas de top socios ───── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 18,
              marginBottom: 20,
            }}
          >
            <PartnersTable
              title="Top destinos de exportación"
              glyph="⟶"
              partners={topExport}
              accent={ACCENT}
            />
            <PartnersTable
              title="Top orígenes de importación"
              glyph="⟵"
              partners={topImport}
              accent="#475569"
            />
          </div>

          {/* ───── Visual de flujos reporter → socio (desde pares) ───── */}
          <FlowBars reporterName={reporterName} pares={pares} />
        </>
      )}
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────
function KpiCard({
  glyph,
  label,
  value,
  accent,
  strong,
}: {
  glyph: string
  label: string
  value: string
  accent: string
  strong?: boolean
}) {
  return (
    <div
      style={{
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '13px 15px',
        background: strong ? `${accent}0d` : '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: '#6e6e73',
          marginBottom: 6,
        }}
      >
        <span aria-hidden="true" style={{ color: accent, fontSize: 13 }}>
          {glyph}
        </span>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: accent,
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tabla de socios
// ─────────────────────────────────────────────────────────────────
function PartnersTable({
  title,
  glyph,
  partners,
  accent,
}: {
  title: string
  glyph: string
  partners: TopPartner[]
  accent: string
}) {
  const rows = partners.slice(0, 10)
  const maxShare = rows.reduce((m, p) => Math.max(m, p.share_pct), 0) || 1
  return (
    <div style={{ border: '1px solid #ECECEF', borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '11px 14px',
          borderBottom: '1px solid #ECECEF',
          fontSize: 12.5,
          fontWeight: 600,
          color: '#1d1d1f',
          background: '#fafafa',
        }}
      >
        <span aria-hidden="true" style={{ color: accent }}>
          {glyph}
        </span>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '14px', fontSize: 12, color: '#9a9aa0' }}>
          Sin socios con datos.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {rows.map((p, i) => (
              <tr key={`${p.partner_iso}-${i}`} style={{ borderTop: i ? '1px solid #f3f3f5' : 'none' }}>
                <td
                  style={{
                    padding: '8px 14px',
                    color: '#9a9aa0',
                    width: 26,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: '8px 8px 8px 0', color: '#1d1d1f' }}>
                  <div style={{ fontWeight: 500 }}>{p.partner_name}</div>
                  <div style={{ marginTop: 3, height: 4, background: '#f0f0f2', borderRadius: 3 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(2, (p.share_pct / maxShare) * 100)}%`,
                        background: accent,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </td>
                <td
                  style={{
                    padding: '8px 14px',
                    textAlign: 'right',
                    color: '#1d1d1f',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.value_fmt}
                </td>
                <td
                  style={{
                    padding: '8px 14px 8px 0',
                    textAlign: 'right',
                    color: '#86868b',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.share_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Visual de flujos reporter → socio (barras desde `pares`)
// Sustituye al Sankey HS, que no encaja con esta capa (sin hs_code).
// ─────────────────────────────────────────────────────────────────
function FlowBars({
  reporterName,
  pares,
}: {
  reporterName: string
  pares: BilateralFlow[]
}) {
  const flows = useMemo(() => {
    const exp = pares.filter((p) => p.flow_kind === 'export').sort((a, b) => b.value_usd - a.value_usd)
    const imp = pares.filter((p) => p.flow_kind === 'import').sort((a, b) => b.value_usd - a.value_usd)
    return { exp, imp }
  }, [pares])

  const maxVal = useMemo(
    () => pares.reduce((m, p) => Math.max(m, p.value_usd), 0) || 1,
    [pares],
  )

  if (pares.length === 0) return null

  return (
    <div style={{ border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
        ⇄ Flujos {reporterName} → socio
      </div>
      <div style={{ fontSize: 11, color: '#86868b', marginBottom: 14 }}>
        Magnitud relativa de cada arco comercial (exportación e importación) entre {reporterName} y
        sus principales socios.
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
        }}
      >
        <FlowColumn label="Exportación ⟶" flows={flows.exp} maxVal={maxVal} color={ACCENT} />
        <FlowColumn label="Importación ⟵" flows={flows.imp} maxVal={maxVal} color="#64748b" />
      </div>
    </div>
  )
}

function FlowColumn({
  label,
  flows,
  maxVal,
  color,
}: {
  label: string
  flows: BilateralFlow[]
  maxVal: number
  color: string
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 8 }}>{label}</div>
      {flows.length === 0 ? (
        <div style={{ fontSize: 11.5, color: '#9a9aa0' }}>Sin arcos con datos.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {flows.slice(0, 10).map((f, i) => (
            <div key={`${f.partner_iso}-${i}`} style={{ fontSize: 11.5 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 3,
                  color: '#33333a',
                }}
              >
                <span>{f.partner_name}</span>
                <span style={{ fontWeight: 600, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>
                  {f.value_fmt}
                </span>
              </div>
              <div style={{ height: 5, background: '#f0f0f2', borderRadius: 3 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(2, (f.value_usd / maxVal) * 100)}%`,
                    background: color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Estados auxiliares
// ─────────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px dashed #e0e0e4',
        borderRadius: 12,
        padding: '28px 20px',
        textAlign: 'center',
        color: '#86868b',
        fontSize: 12.5,
        background: '#fafafa',
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 20, color: '#c4c4ca', marginBottom: 6 }}>
        ⚓
      </div>
      {message}
    </div>
  )
}

function SkeletonBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 72,
              borderRadius: 12,
              background: 'linear-gradient(90deg,#f4f4f6 25%,#ececef 37%,#f4f4f6 63%)',
              backgroundSize: '400% 100%',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 220,
          borderRadius: 12,
          background: 'linear-gradient(90deg,#f4f4f6 25%,#ececef 37%,#f4f4f6 63%)',
          backgroundSize: '400% 100%',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      />
      <style>{`@keyframes pulse{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
    </div>
  )
}
