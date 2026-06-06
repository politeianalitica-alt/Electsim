'use client'
/**
 * <RenovablesView /> · Sprint Energía S5
 *
 * Vista "Renovables" del EnergiaShell (sustituye al placeholder "en
 * construcción"). Foto completa de las renovables del sistema eléctrico ES,
 * con datos en vivo + catálogo curado:
 *
 *   - Hero · 4 KPIs renovables (cuota renovable ahora % · potencia instalada
 *     total GW · generación renovable ahora GWh · nº tecnologías). Auto-refresh
 *     5 min (patrón ElectricoView/VisionGlobalView).
 *   - Generación ES por tecnología (stacked 24h): eólica (551), solar FV (1161),
 *     solar térmica (1162), hidráulica (1158), biomasa (1160). ESIOS · /api/esios/mix.
 *   - <LoadFactorChart /> · factor de carga real / capacidad por tecnología.
 *   - Cuota renovable: histórica (REE balance mensual) + progreso a PNIEC 81 %.
 *   - Comparativa global (Ember): % renovable por país top + España resaltada.
 *   - Subastas renovables (catálogo SUBASTAS_RENOVABLES_ES · MITECO).
 *   - Empresas renovables (Finnhub): Acciona Energía, Solaria, Grenergy, EDPR,
 *     Iberdrola + segmento renovable del catálogo EMPRESAS_ENERGIA.
 *   - <SectorIntelPanel sector="energia" compact />.
 *
 * Fuentes reales: ESIOS/REE (generación + agregados), REE balance (histórico),
 * Ember (global), Finnhub (cotización), catálogo (capacidad, PNIEC, subastas).
 * Empty-state honesto cuando falta dato (CLAUDE.md). Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import {
  CAPACIDAD_RENOVABLE_ES,
  PNIEC_2030,
  SUBASTAS_RENOVABLES_ES,
} from '@/lib/energia/catalog'
import { ESIOS_TECH_COLORS } from '@/lib/esios/catalog'
import LoadFactorChart from './LoadFactorChart'
import { CompanyQuotePanel } from './shared/CompanyQuotePanel'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0d4626'
const REFRESH_MS = 5 * 60 * 1000

// Objetivo PNIEC 2030 · % generación eléctrica renovable (del catálogo).
const PNIEC_RENOVABLE = PNIEC_2030.find((t) => /generación eléctrica.*renovable/i.test(t.metrica))
const PNIEC_TARGET_PCT = typeof PNIEC_RENOVABLE?.objetivo_2030 === 'number' ? PNIEC_RENOVABLE.objetivo_2030 : 81

// ── Tipos de respuesta ──────────────────────────────────────────────────────
interface MixTech {
  slug: string
  ok: boolean
  short: string
  label: string
  color: string
  now_mw: number | null
  avg_24h_mw: number | null
  serie_24h: Array<{ t: string; v: number }>
}
interface MixAgg {
  slug: string
  ok: boolean
  latest_value: number | null
  avg_24h: number | null
}
interface EsiosMixResp {
  ok: boolean
  error?: string
  tech: Record<string, MixTech>
  agregados: Record<string, MixAgg>
}
interface BalanceResp {
  balance: Array<{ title: string; color?: string; total_gwh: number; points: Array<{ t: string; v: number }> }>
}

// Slugs ESIOS de las 5 tecnologías renovables que apilamos.
const RENOV_SLUGS = ['gen_eolica', 'gen_solar_fv', 'gen_solar_termica', 'gen_hidraulica', 'gen_biomasa'] as const

export function RenovablesView() {
  const [mix, setMix] = useState<EsiosMixResp | null>(null)
  const [balance, setBalance] = useState<BalanceResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [m, b] = await Promise.all([
      fetch('/api/esios/mix', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/sectores/energia/balance?months=12', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
    setMix(m)
    setBalance(b)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // ── KPIs del hero ──────────────────────────────────────────────────────────
  const cuotaRenov = mix?.agregados?.porcentaje_renovable?.latest_value ?? null
  const renovMwNow = mix?.agregados?.gen_renovable_total?.latest_value ?? null
  // Generación renovable "ahora" en GWh aproximada: potencia (MW) instantánea →
  // energía en una hora ≈ MW·1h / 1000 = GWh. Es una estimación horaria honesta.
  const renovGwhNow = renovMwNow != null ? renovMwNow / 1000 : null
  const capacidadTotalGw = CAPACIDAD_RENOVABLE_ES.reduce((s, c) => s + c.capacidad_mw, 0) / 1000
  const nTecnologias = CAPACIDAD_RENOVABLE_ES.length

  // Tecnologías renovables para el stacked (en orden de capacidad desc del catálogo-mapeo).
  const renovTech: MixTech[] = RENOV_SLUGS
    .map((slug) => mix?.tech?.[slug])
    .filter((t): t is MixTech => !!t)

  return (
    <>
      {/* ───── HERO con KPIs renovables ───── */}
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
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
            SECTORIAL · ENERGÍA Y SUMINISTROS · RENOVABLES
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Energías renovables <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en España</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            Generación por tecnología en vivo (eólica, solar FV, solar térmica, hidráulica, biomasa),
            factor de carga real, progreso hacia el objetivo PNIEC 2030 ({PNIEC_TARGET_PCT}% eléctrico
            renovable) y comparativa internacional. Datos ESIOS/REE y Ember.
          </p>
          {updatedAt && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }} />
              Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
              <button
                onClick={refresh}
                style={{ marginLeft: 8, fontSize: 10.5, padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ↻ Actualizar
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <HeroKPI label="Cuota renovable ahora" value={cuotaRenov} unit="%" accent="#86EFAC" />
          <HeroKPI label="Potencia renovable instalada" value={capacidadTotalGw} unit="GW" accent="#7DD3FC" sub="catálogo REE/MITECO" />
          <HeroKPI label="Generación renovable ahora" value={renovGwhNow} unit="GWh/h" accent="#FCD34D" pending={renovGwhNow == null ? 'sin dato ESIOS' : undefined} />
          <HeroKPI label="Tecnologías renovables" value={nTecnologias} unit="" accent="#C4B5FD" />
        </div>
      </section>

      {/* ───── ROW 1: Generación ES por tecnología (stacked) + Factor de carga ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Generación renovable ES por tecnología · 24 h"
          subtitle={renovTech.length ? `${renovTech.length} tecnologías · MW · agregado a hora` : 'Cargando ESIOS…'}
          sourceUrl="https://www.esios.ree.es/"
          sourceTooltip="Abrir ESIOS · REE"
        >
          <RenovStacked tech={renovTech} noKey={mix?.ok === false && /no_key/i.test(mix?.error || '')} />
        </Panel>
        <Panel
          title="Factor de carga por tecnología"
          subtitle="Generación media (24h) / potencia instalada"
        >
          <LoadFactorChart />
        </Panel>
      </div>

      {/* ───── ROW 2: Cuota renovable histórica + objetivo PNIEC 2030 ───── */}
      <Panel
        title="Cuota renovable: histórica y objetivo PNIEC 2030"
        subtitle={`Generación renovable mensual (REE balance) · objetivo 2030: ${PNIEC_TARGET_PCT}% eléctrico renovable`}
        marginBottom
        sourceUrl="https://www.ree.es/es/datos/balance"
        sourceTooltip="Abrir visor REE · Balance"
      >
        <CuotaRenovableHistorica balance={balance} targetPct={PNIEC_TARGET_PCT} cuotaActual={cuotaRenov} />
      </Panel>

      {/* ───── ROW 3: Comparativa global (Ember) ───── */}
      <div style={{ marginBottom: 14 }}>
        <ComparativaGlobal />
      </div>

      {/* ───── ROW 4: Subastas renovables (catálogo) ───── */}
      <Panel
        title="Subastas de capacidad renovable · España"
        subtitle={`${SUBASTAS_RENOVABLES_ES.length} resultados adjudicados · €/MWh medio ponderado (REER, RD 960/2020)`}
        marginBottom
        sourceUrl="https://www.miteco.gob.es/"
        sourceTooltip="MITECO · resultados de subastas"
      >
        <SubastasTable />
      </Panel>

      {/* ───── ROW 5: Empresas renovables (Finnhub) · primitiva compartida ───── */}
      <div style={{ marginBottom: 14 }}>
        <CompanyQuotePanel
          energias={['renovables']}
          title="Empresas renovables cotizadas"
          subtitle="Puro-play renovable español + integradas con segmento renovable · cotización"
        />
      </div>

      {/* Inteligencia operativa sectorial */}
      <SectorIntelPanel
        sector="energia"
        compact
        detailHref="/commodities?category=energy"
        detailLabel="Ver futuros · Vesper →"
      />

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>
          Cargando datos renovables…
        </div>
      )}

      {/* Cuaderno · notas que mencionan al sector energía */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
    </>
  )
}

export default RenovablesView

// ─── HeroKPI ──────────────────────────────────────────────────────────────
function HeroKPI({
  label,
  value,
  unit,
  accent,
  sub,
  pending,
}: {
  label: string
  value: number | null | undefined
  unit: string
  accent: string
  sub?: string
  pending?: string
}) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: value >= 100 ? 0 : 1 })
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
        {display}
        {unit && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>{unit}</span>}
      </div>
      {value == null && pending ? (
        <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{pending}</div>
      ) : sub ? (
        <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  )
}

// ─── Stacked area · generación renovable por tecnología (24h) ────────────────
function RenovStacked({ tech, noKey }: { tech: MixTech[]; noKey?: boolean }) {
  if (noKey) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Generación en vivo no disponible (ESIOS_API_KEY no configurada en Vercel). El endpoint está
        listo; en cuanto haya clave, se mostrará la serie 24 h apilada por tecnología.
      </div>
    )
  }
  const withSeries = tech.filter((t) => t.serie_24h && t.serie_24h.length > 0)
  if (withSeries.length === 0) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Sin datos de generación disponibles.</div>
  }

  // Eje temporal común: tomamos las marcas de la serie más larga.
  const base = withSeries.reduce((a, b) => (b.serie_24h.length > a.serie_24h.length ? b : a))
  const times = base.serie_24h.map((p) => p.t)
  const n = times.length

  // Para cada instante t (índice i), suma de todas las tecnologías → total apilado.
  const totalsByIdx: number[] = times.map((t) =>
    withSeries.reduce((s, tech) => s + (tech.serie_24h.find((p) => p.t === t)?.v ?? 0), 0),
  )
  const maxTotal = Math.max(1, ...totalsByIdx)

  const W = 640, H = 220, P = 10
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - v / maxTotal) * (H - 2 * P)

  // Construimos áreas apiladas: para cada tech, banda entre acumulado previo y acumulado+valor.
  const cumulative = new Array(n).fill(0)
  const bands = withSeries.map((tech) => {
    const lower = [...cumulative]
    const upper = times.map((t, i) => {
      const v = tech.serie_24h.find((p) => p.t === t)?.v ?? 0
      cumulative[i] += v
      return cumulative[i]
    })
    // Path: upper de izq→der, luego lower de der→izq.
    const top = upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    const bottom = lower.map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(lower[n - 1 - i]).toFixed(1)}`).join(' ')
    return { tech, d: `${top} ${bottom} Z` }
  })

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
        ))}
        {bands.map(({ tech, d }) => (
          <path key={tech.slug} d={d} fill={tech.color || ESIOS_TECH_COLORS[tech.slug] || '#9CA3AF'} fillOpacity={0.85} stroke="none">
            <title>{tech.short || tech.label}</title>
          </path>
        ))}
      </svg>
      <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {withSeries.map((t) => (
          <li key={t.slug} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: t.color || ESIOS_TECH_COLORS[t.slug] || '#9CA3AF' }} />
            <span style={{ color: '#3a3a3d', fontWeight: 600 }}>{t.short || t.label}</span>
            <span style={{ color: ACCENT, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {t.now_mw != null ? `${t.now_mw.toLocaleString('es-ES')} MW` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Cuota renovable histórica + progreso PNIEC ──────────────────────────────
function CuotaRenovableHistorica({
  balance,
  targetPct,
  cuotaActual,
}: {
  balance: BalanceResp | null
  targetPct: number
  cuotaActual: number | null
}) {
  // Serie histórica de % renovable mensual: renovable / (renovable+no-renovable).
  const renovSerie = balance?.balance?.find((s) => /renovab/i.test(s.title) && !/no/i.test(s.title))
  const noRenovSerie = balance?.balance?.find((s) => /no.?renovab/i.test(s.title))

  let pctSerie: Array<{ t: string; pct: number }> = []
  if (renovSerie && noRenovSerie) {
    pctSerie = renovSerie.points
      .map((p) => {
        const nr = noRenovSerie.points.find((q) => q.t === p.t)?.v ?? 0
        const total = p.v + nr
        return { t: p.t, pct: total > 0 ? (p.v / total) * 100 : 0 }
      })
      .filter((p) => p.pct > 0)
  }

  const lastPct = pctSerie.length ? pctSerie[pctSerie.length - 1].pct : cuotaActual
  const progresoPct = lastPct != null ? Math.min(100, (lastPct / targetPct) * 100) : null

  return (
    <div>
      {/* Barra de progreso hacia el objetivo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: 12, color: '#3a3a3d', fontWeight: 600 }}>
            Progreso hacia el objetivo PNIEC 2030
          </span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 700, color: ACCENT }}>
            {lastPct != null ? `${lastPct.toFixed(1)}%` : '—'} <span style={{ color: '#86868b', fontWeight: 600 }}>/ {targetPct}%</span>
          </span>
        </div>
        <div style={{ position: 'relative', height: 14, background: '#F5F5F7', borderRadius: 7, overflow: 'hidden' }}>
          <div style={{ width: `${progresoPct ?? 0}%`, height: '100%', background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_DARK})`, transition: 'width 300ms ease' }} />
        </div>
        <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 4 }}>
          {progresoPct != null
            ? `${progresoPct.toFixed(0)}% del camino al objetivo · faltan ${Math.max(0, targetPct - (lastPct ?? 0)).toFixed(1)} puntos`
            : 'Sin dato histórico de cuota renovable'}
        </div>
      </div>

      {/* Mini serie histórica de % renovable mensual */}
      {pctSerie.length > 1 ? <PctLineChart serie={pctSerie} targetPct={targetPct} /> : (
        <div style={{ fontSize: 11.5, color: '#86868b' }}>Serie histórica de balance no disponible.</div>
      )}
    </div>
  )
}

function PctLineChart({ serie, targetPct }: { serie: Array<{ t: string; pct: number }>; targetPct: number }) {
  const W = 1080, H = 150, P = 12
  const max = Math.max(targetPct, ...serie.map((p) => p.pct)) * 1.05
  const min = Math.min(...serie.map((p) => p.pct)) * 0.9
  const range = max - min || 1
  const x = (i: number) => P + (i / Math.max(1, serie.length - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const path = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ')
  const targetY = y(targetPct)

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ display: 'block' }}>
        {/* Línea objetivo PNIEC */}
        {targetY > P && targetY < H - P && (
          <>
            <line x1={P} x2={W - P} y1={targetY} y2={targetY} stroke="#16A34A" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.6} />
            <text x={W - P} y={targetY - 4} textAnchor="end" style={{ fontSize: 9.5, fill: ACCENT, fontWeight: 700 }}>
              Objetivo PNIEC {targetPct}%
            </text>
          </>
        )}
        <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} />
        {serie.map((p, i) => (
          <circle key={p.t} cx={x(i)} cy={y(p.pct)} r={5} fill="transparent" style={{ cursor: 'crosshair' }}>
            <title>{p.t}: {p.pct.toFixed(1)}% renovable</title>
          </circle>
        ))}
        {/* Etiquetas de extremos */}
        <text x={x(0)} y={H + 12} textAnchor="start" style={{ fontSize: 9, fill: '#86868b' }}>{serie[0].t}</text>
        <text x={x(serie.length - 1)} y={H + 12} textAnchor="end" style={{ fontSize: 9, fill: '#86868b' }}>{serie[serie.length - 1].t}</text>
      </svg>
    </div>
  )
}

// ─── Comparativa global (Ember) · % renovable por país ───────────────────────
interface CountryRenov {
  code: string
  name: string
  renewable_pct: number | null
}
// Países curados para la comparativa (códigos ISO-3 que Ember reconoce).
const GLOBAL_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'ESP', name: 'España' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'DNK', name: 'Dinamarca' },
  { code: 'DEU', name: 'Alemania' },
  { code: 'FRA', name: 'Francia' },
  { code: 'GBR', name: 'Reino Unido' },
  { code: 'ITA', name: 'Italia' },
  { code: 'USA', name: 'EE. UU.' },
  { code: 'CHN', name: 'China' },
  { code: 'IND', name: 'India' },
  { code: 'POL', name: 'Polonia' },
]

function ComparativaGlobal() {
  const [rows, setRows] = useState<CountryRenov[] | null>(null)
  const [year, setYear] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const out = await Promise.all(
        GLOBAL_COUNTRIES.map(async (c): Promise<CountryRenov> => {
          try {
            const r = await fetch(`/api/ember/generation?entity_code=${encodeURIComponent(c.code)}`, { cache: 'no-store' })
            const j: any = await r.json()
            if (j?.ok && j.data) {
              return { code: c.code, name: c.name, renewable_pct: j.data.renewable_pct ?? null }
            }
          } catch { /* degradación por país */ }
          return { code: c.code, name: c.name, renewable_pct: null }
        }),
      )
      if (!alive) return
      // Año: tomamos el del primer país con dato (todos usan el último disponible).
      try {
        const rES = await fetch('/api/ember/generation?entity_code=ESP', { cache: 'no-store' })
        const jES: any = await rES.json()
        if (jES?.ok && jES.data?.date) setYear(String(jES.data.date))
      } catch { /* ignore */ }
      setRows(out)
    }
    load()
    return () => { alive = false }
  }, [])

  const ranked = (rows ?? [])
    .filter((r) => r.renewable_pct != null)
    .sort((a, b) => (b.renewable_pct ?? 0) - (a.renewable_pct ?? 0))
  const hasData = ranked.length > 0
  const maxPct = Math.max(1, ...ranked.map((r) => r.renewable_pct ?? 0))

  return (
    <Panel
      title="Comparativa internacional · cuota renovable eléctrica"
      subtitle={year ? `% de la generación · ${year} · fuente Ember` : 'Cargando Ember…'}
      sourceUrl="https://ember-energy.org/data/"
      sourceTooltip="Abrir Ember Energy"
    >
      {rows == null ? (
        <div style={{ fontSize: 11.5, color: '#86868b' }}>Cargando comparativa global…</div>
      ) : !hasData ? (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
          Comparativa global no disponible (EMBER_API_KEY no configurada o sin datos). Cuando haya
          clave, se mostrará el ranking de % renovable por país con España resaltada.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranked.map((r, i) => {
            const isES = r.code === 'ESP'
            const pct = r.renewable_pct ?? 0
            return (
              <li key={r.code} style={{ display: 'grid', gridTemplateColumns: '26px 130px 1fr 58px', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#86868b', fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, fontWeight: isES ? 800 : 600, color: isES ? ACCENT : '#3a3a3d' }}>
                  {r.name}
                </span>
                <div style={{ height: 10, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(pct / maxPct) * 100}%`, height: '100%', background: isES ? ACCENT : '#9CA3AF', transition: 'width 250ms ease' }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: isES ? ACCENT : '#1d1d1f', textAlign: 'right' }}>
                  {pct.toFixed(1)}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// ─── Subastas renovables (catálogo) ──────────────────────────────────────────
function SubastasTable() {
  const sorted = [...SUBASTAS_RENOVABLES_ES].sort((a, b) => b.fecha.localeCompare(a.fecha))
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#86868b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <th style={{ padding: '6px 8px', fontWeight: 700 }}>Fecha</th>
            <th style={{ padding: '6px 8px', fontWeight: 700 }}>Tecnología</th>
            <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Precio adj.</th>
            <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Capacidad</th>
            <th style={{ padding: '6px 8px', fontWeight: 700 }}>Observación</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr key={`${s.fecha}-${s.tecnologia}-${i}`} style={{ borderTop: '1px solid #ECECEF' }}>
              <td style={{ padding: '8px', color: '#3a3a3d', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{s.fecha}</td>
              <td style={{ padding: '8px', color: '#1d1d1f', fontWeight: 600 }}>{s.tecnologia}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
                {s.precio_adjudicado_eur_mwh.toFixed(2)} €/MWh
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                {s.capacidad_mw.toLocaleString('es-ES')} MW
              </td>
              <td style={{ padding: '8px', color: '#6e6e73', fontSize: 11, lineHeight: 1.4 }}>{s.observacion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Empresas renovables cotizadas → ahora vía
// <CompanyQuotePanel energias={['renovables']} /> (shared · Energía v3 E1).
