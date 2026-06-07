'use client'
/**
 * <NuclearView /> · Sprint Energía S6
 *
 * Vista "Nuclear" del EnergiaShell (sustituye al placeholder "en
 * construcción"). Foto completa del parque nuclear español + contexto global,
 * con datos en vivo + catálogo curado:
 *
 *   - Hero · 4 KPIs nuclear (generación nuclear ahora GWh/h · cuota nuclear en
 *     mix % · potencia nuclear instalada GW · nº reactores operativos).
 *     Auto-refresh 5 min (patrón RenovablesView/ElectricoView).
 *   - <ReactorFleet /> · parque ES: 7 reactores (potencia, año, propietarios,
 *     factor de carga del parque, estado, cierre previsto).
 *   - Generación nuclear ES (ESIOS 549): serie 24h tiempo real + cuota en mix.
 *   - Calendario de cierre 2027-2035: timeline horizontal del cierre escalonado
 *     pactado (de REACTORES_ES[].cierre_previsto, agrupado por año).
 *   - Contexto global (Ember): generación nuclear por país (top + España),
 *     ranking + notas curadas (SMR, nueva construcción).
 *   - Precio uranio: referencia curada honesta (no hay dataset en vivo).
 *   - Empresas copropietarias del parque (Finnhub): Endesa, Iberdrola, Naturgy.
 *   - <SectorIntelPanel sector="energia" compact />.
 *
 * Fuentes reales: ESIOS/REE (generación nuclear + cuota mix), Ember (nuclear
 * por país), Finnhub (cotización), catálogo (parque, cierre, contexto, uranio).
 * Empty-state honesto cuando falta dato (CLAUDE.md). Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { REACTORES_ES } from '@/lib/energia/catalog'
import { CompanyQuotePanel } from './shared/CompanyQuotePanel'
import {
  summarizeFleet,
  fleetLoadFactor,
} from '@/lib/energia/nuclear-calc'
import ReactorFleet from './ReactorFleet'
import NuclearGantt from './NuclearGantt'
import NuclearMap from './NuclearMap'
import NuclearLoadFactor from './NuclearLoadFactor'
import NuclearDecommissioning from './NuclearDecommissioning'
import NuclearGlobalContext from './NuclearGlobalContext'

const ACCENT = '#16A34A'
const NUCLEAR = '#7c3aed'
const NUCLEAR_DARK = '#4c1d95'
const REFRESH_MS = 5 * 60 * 1000

// ── Tipos de respuesta ESIOS /api/esios/mix ──────────────────────────────────
interface MixTech {
  slug: string
  ok: boolean
  short: string
  label: string
  color: string
  now_mw: number | null
  avg_24h_mw: number | null
  pct_of_total: number | null
  serie_24h: Array<{ t: string; v: number }>
}
interface EsiosMixResp {
  ok: boolean
  error?: string
  tech: Record<string, MixTech>
  total_now_mw?: number
}

export function NuclearView() {
  const [mix, setMix] = useState<EsiosMixResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const m = await fetch('/api/esios/mix', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
    setMix(m)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // ── Datos del parque (catálogo) ──────────────────────────────────────────
  const summary = summarizeFleet(REACTORES_ES)
  const potenciaGw = summary.potencia_operativa_mw / 1000

  // ── KPIs del hero (ESIOS) ────────────────────────────────────────────────
  const nuclearTech = mix?.tech?.gen_nuclear
  const nuclearMwNow = nuclearTech?.now_mw ?? null
  // Generación "ahora" en GWh/h ≈ potencia (MW) instantánea / 1000 (energía en 1h).
  const nuclearGwhNow = nuclearMwNow != null ? nuclearMwNow / 1000 : null
  const cuotaNuclear = nuclearTech?.pct_of_total ?? null
  // Factor de carga del parque: gen media 24h ESIOS / potencia instalada operativa.
  const factorParque = fleetLoadFactor(nuclearTech?.avg_24h_mw ?? null, summary.potencia_operativa_mw)

  const noKey = mix?.ok === false && /no_key/i.test(mix?.error || '')

  return (
    <>
      {/* ───── HERO con KPIs nuclear ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${NUCLEAR} 0%, ${NUCLEAR_DARK} 100%)`,
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
            SECTORIAL · ENERGÍA Y SUMINISTROS · NUCLEAR
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Energía nuclear <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en España</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            Parque de 5 centrales y 7 reactores ({potenciaGw.toLocaleString('es-ES', { maximumFractionDigits: 1 })} GW),
            generación nuclear en vivo (base de carga), calendario de cierre escalonado 2027-2035 pactado en 2019
            y contexto internacional. Datos ESIOS/REE y Ember.
          </p>
          {updatedAt && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4B5FD', boxShadow: '0 0 8px #C4B5FD' }} />
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
          <HeroKPI label="Generación nuclear ahora" value={nuclearGwhNow} unit="GWh/h" accent="#DDD6FE" pending={nuclearGwhNow == null ? (noKey ? 'sin ESIOS_API_KEY' : 'sin dato ESIOS') : undefined} />
          <HeroKPI label="Cuota nuclear en mix" value={cuotaNuclear} unit="%" accent="#C4B5FD" pending={cuotaNuclear == null ? 'sin dato ESIOS' : undefined} />
          <HeroKPI label="Potencia nuclear instalada" value={potenciaGw} unit="GW" accent="#A78BFA" sub="catálogo CSN" />
          <HeroKPI label="Reactores operativos" value={summary.operativos} unit="" accent="#86EFAC" />
        </div>
      </section>

      {/* ───── ROW 1: Parque nuclear (ReactorFleet) ───── */}
      <Panel
        title="Parque nuclear español"
        subtitle="5 centrales · 7 reactores · potencia neta, año, propietarios, estado"
        marginBottom
        sourceUrl="https://www.foronuclear.org/"
        sourceTooltip="Foro Nuclear · centrales nucleares en España"
      >
        <ReactorFleet factorCargaPct={factorParque.factor_pct} />
        <p style={{ margin: '14px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
          Fuente: Consejo de Seguridad Nuclear (CSN) y Foro Nuclear. Potencias eléctricas netas aproximadas según
          fichas oficiales; pueden variar ±decenas de MW tras renovaciones de licencia. Tecnología PWR (agua a presión)
          salvo Cofrentes, BWR (agua en ebullición). Factor de carga del conjunto calculado en vivo desde ESIOS.
        </p>
      </Panel>

      {/* ───── ROW 2: Generación nuclear ES (ESIOS 549) ───── */}
      <Panel
        title="Generación nuclear ES · 24 h"
        subtitle={nuclearTech?.serie_24h?.length ? 'MW · agregado a hora · base de carga estable' : noKey ? 'ESIOS_API_KEY no configurada' : 'Cargando ESIOS…'}
        marginBottom
        sourceUrl="https://www.esios.ree.es/"
        sourceTooltip="Abrir ESIOS · REE · indicador 549"
      >
        <NuclearGenChart tech={nuclearTech ?? null} cuota={cuotaNuclear} totalNow={mix?.total_now_mw ?? null} noKey={noKey} />
      </Panel>

      {/* ───── ROW 3: Factor de carga real de la flota (gauge) ───── */}
      <Panel
        title="Factor de carga de la flota nuclear"
        subtitle="Generación nuclear media (ESIOS) ÷ potencia instalada operativa (catálogo CSN)"
        marginBottom
        sourceUrl="https://www.esios.ree.es/"
        sourceTooltip="ESIOS · REE · generación nuclear"
      >
        <NuclearLoadFactor
          genMedia24hMw={nuclearTech?.avg_24h_mw ?? null}
          genNowMw={nuclearMwNow}
          noKey={noKey}
        />
      </Panel>

      {/* ───── ROW 4: Mapa de centrales ES ───── */}
      <Panel
        title="Mapa de centrales nucleares · España"
        subtitle="5 emplazamientos · tamaño ∝ potencia · color por tecnología (PWR/BWR)"
        marginBottom
        sourceUrl="https://www.foronuclear.org/"
        sourceTooltip="Foro Nuclear · centrales nucleares en España"
      >
        <NuclearMap />
      </Panel>

      {/* ───── ROW 5: Gantt de cierre 2027-2035 ───── */}
      <Panel
        title="Gantt de cierre · vida útil restante por reactor (2027-2035)"
        subtitle="Barra hoy → cese pactado por reactor, agrupado por central · hito ◆ de cierre"
        marginBottom
        sourceUrl="https://www.enresa.es/"
        sourceTooltip="Enresa · calendario de cierre pactado 2019"
      >
        <NuclearGantt />
      </Panel>

      {/* ───── ROW 6: Coste de desmantelamiento (Enresa / 7.º PGRR) ───── */}
      <Panel
        title="Coste de desmantelamiento y residuos · fondo Enresa"
        subtitle="Cifras curadas del 7.º Plan General de Residuos Radiactivos (dic. 2023)"
        marginBottom
        sourceUrl="https://www.enresa.es/"
        sourceTooltip="Enresa · 7.º Plan General de Residuos Radiactivos"
      >
        <NuclearDecommissioning />
      </Panel>

      {/* ───── ROW 7: Contexto internacional (IAEA PRIS) + uranio ───── */}
      <Panel
        title="Contexto internacional · IAEA PRIS y uranio"
        subtitle="Parque mundial, nueva construcción, SMR y posición de España · referencia uranio U3O8"
        marginBottom
        sourceUrl="https://pris.iaea.org/PRIS/home.aspx"
        sourceTooltip="IAEA PRIS · Power Reactor Information System"
      >
        <NuclearGlobalContext />
      </Panel>

      {/* ───── ROW 8: Generación nuclear por país (Ember) ───── */}
      <div style={{ marginBottom: 14 }}>
        <NuclearGlobal />
      </div>

      {/* ───── ROW 9: Empresas copropietarias del parque ───── */}
      <div style={{ marginBottom: 14 }}>
        <CompanyQuotePanel
          energias={['nuclear']}
          title="Empresas copropietarias del parque"
          subtitle="Las utilities españolas titulares de los reactores · cotización"
          compact
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
          Cargando datos nucleares…
        </div>
      )}

      {/* Cuaderno · notas que mencionan al sector energía */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
    </>
  )
}

export default NuclearView

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

// ─── Serie 24h generación nuclear + cuota en mix ─────────────────────────────
function NuclearGenChart({
  tech,
  cuota,
  totalNow,
  noKey,
}: {
  tech: MixTech | null
  cuota: number | null
  totalNow: number | null
  noKey: boolean
}) {
  if (noKey) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Generación en vivo no disponible (ESIOS_API_KEY no configurada en Vercel). El endpoint está listo;
        en cuanto haya clave, se mostrará la serie 24 h del indicador 549 (generación nuclear) y su cuota en el mix.
      </div>
    )
  }
  const serie = tech?.serie_24h?.filter((p) => Number.isFinite(p.v)) ?? []
  if (serie.length === 0) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Sin datos de generación nuclear disponibles.</div>
  }

  const W = 1080, H = 200, P = 12
  const vals = serie.map((p) => p.v)
  const max = Math.max(...vals) * 1.08
  const min = Math.min(0, ...vals)
  const range = max - min || 1
  const n = serie.length
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const line = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - P).toFixed(1)} L${x(0).toFixed(1)},${(H - P).toFixed(1)} Z`

  return (
    <div>
      {/* Métricas inline */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <InlineMetric label="Ahora" value={tech?.now_mw != null ? `${tech.now_mw.toLocaleString('es-ES')} MW` : '—'} />
        <InlineMetric label="Media 24 h" value={tech?.avg_24h_mw != null ? `${tech.avg_24h_mw.toLocaleString('es-ES')} MW` : '—'} />
        <InlineMetric label="Cuota en mix" value={cuota != null ? `${cuota.toFixed(1)}%` : '—'} highlight />
        <InlineMetric label="Total generación ahora" value={totalNow != null ? `${(totalNow / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} GW` : '—'} />
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
        ))}
        <defs>
          <linearGradient id="nuclearArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NUCLEAR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={NUCLEAR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#nuclearArea)" stroke="none" />
        <path d={line} fill="none" stroke={NUCLEAR} strokeWidth={2} />
        {serie.map((p, i) => (
          <circle key={p.t} cx={x(i)} cy={y(p.v)} r={5} fill="transparent" style={{ cursor: 'crosshair' }}>
            <title>{p.t}: {p.v.toLocaleString('es-ES')} MW</title>
          </circle>
        ))}
        <text x={x(0)} y={H + 12} textAnchor="start" style={{ fontSize: 9, fill: '#86868b' }}>{fmtHour(serie[0].t)}</text>
        <text x={x(n - 1)} y={H + 12} textAnchor="end" style={{ fontSize: 9, fill: '#86868b' }}>{fmtHour(serie[n - 1].t)}</text>
      </svg>
      <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        La nuclear funciona como <strong>base de carga</strong>: produce de forma muy estable cerca de su máximo
        salvo paradas programadas para recarga de combustible o mantenimiento. Su cuota en el mix sube cuando cae
        la demanda o las renovables.
      </p>
    </div>
  )
}

function InlineMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: highlight ? NUCLEAR : '#1d1d1f', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function fmtHour(iso: string): string {
  try {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { /* fallthrough */ }
  return iso.slice(5, 16).replace('T', ' ')
}

// ─── Contexto global nuclear (Ember) ─────────────────────────────────────────
interface CountryNuclear {
  code: string
  name: string
  nuclear_twh: number | null
  nuclear_pct: number | null
}
// Países nucleares relevantes (ISO-3 reconocidos por Ember) + España.
const NUCLEAR_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'ESP', name: 'España' },
  { code: 'USA', name: 'EE. UU.' },
  { code: 'FRA', name: 'Francia' },
  { code: 'CHN', name: 'China' },
  { code: 'RUS', name: 'Rusia' },
  { code: 'KOR', name: 'Corea del Sur' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'UKR', name: 'Ucrania' },
  { code: 'JPN', name: 'Japón' },
  { code: 'DEU', name: 'Alemania' },
  { code: 'GBR', name: 'Reino Unido' },
  { code: 'SWE', name: 'Suecia' },
]

function pickNuclear(by_source: Array<{ series: string; generation_twh: number | null; share_of_generation_pct: number | null }>) {
  const row = by_source.find((r) => /nuclear/i.test(r.series))
  return {
    twh: row?.generation_twh ?? null,
    pct: row?.share_of_generation_pct ?? null,
  }
}

function NuclearGlobal() {
  const [rows, setRows] = useState<CountryNuclear[] | null>(null)
  const [year, setYear] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const out = await Promise.all(
        NUCLEAR_COUNTRIES.map(async (c): Promise<CountryNuclear> => {
          try {
            const r = await fetch(`/api/ember/generation?entity_code=${encodeURIComponent(c.code)}`, { cache: 'no-store' })
            const j: any = await r.json()
            if (j?.ok && j.data?.by_source) {
              const nuke = pickNuclear(j.data.by_source)
              if (c.code === 'ESP' && j.data.date) setYear(String(j.data.date))
              return { code: c.code, name: c.name, nuclear_twh: nuke.twh, nuclear_pct: nuke.pct }
            }
          } catch { /* degradación por país */ }
          return { code: c.code, name: c.name, nuclear_twh: null, nuclear_pct: null }
        }),
      )
      if (alive) setRows(out)
    }
    load()
    return () => { alive = false }
  }, [])

  const ranked = (rows ?? [])
    .filter((r) => r.nuclear_twh != null && (r.nuclear_twh as number) > 0)
    .sort((a, b) => (b.nuclear_twh ?? 0) - (a.nuclear_twh ?? 0))
  const hasData = ranked.length > 0
  const maxTwh = Math.max(1, ...ranked.map((r) => r.nuclear_twh ?? 0))

  return (
    <Panel
      title="Contexto internacional · generación nuclear por país"
      subtitle={year ? `Generación nuclear (TWh) y cuota nacional · ${year} · fuente Ember` : 'Cargando Ember…'}
      sourceUrl="https://ember-energy.org/data/"
      sourceTooltip="Abrir Ember Energy"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        {/* Ranking */}
        <div>
          {rows == null ? (
            <div style={{ fontSize: 11.5, color: '#86868b' }}>Cargando ranking nuclear global…</div>
          ) : !hasData ? (
            <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
              Ranking global no disponible (EMBER_API_KEY no configurada o sin datos). Cuando haya clave, se mostrará
              la generación nuclear (TWh) por país con España resaltada.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ranked.map((r, i) => {
                const isES = r.code === 'ESP'
                const twh = r.nuclear_twh ?? 0
                return (
                  <li key={r.code} style={{ display: 'grid', gridTemplateColumns: '22px 120px 1fr 92px', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#86868b', fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: isES ? 800 : 600, color: isES ? NUCLEAR : '#3a3a3d' }}>{r.name}</span>
                    <div style={{ height: 10, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${(twh / maxTwh) * 100}%`, height: '100%', background: isES ? NUCLEAR : '#A78BFA', transition: 'width 250ms ease' }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: isES ? NUCLEAR : '#1d1d1f', textAlign: 'right' }}>
                      {twh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} TWh
                      {r.nuclear_pct != null && <span style={{ display: 'block', fontSize: 9.5, color: '#86868b', fontWeight: 600 }}>{r.nuclear_pct.toFixed(0)}% mix</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {/* Lectura del ranking (las notas curadas viven en el panel IAEA PRIS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: NUCLEAR, marginBottom: 4 }}>Cómo leer el ranking</div>
            <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>
              Generación nuclear anual (TWh) por país, con España resaltada. EE. UU., Francia y China lideran por
              volumen; Francia destaca además por la cuota nuclear en su mix (~70 %). El contexto cualitativo
              (parque mundial, nueva construcción, SMR, posición de España) está en el panel «Contexto internacional ·
              IAEA PRIS y uranio».
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

// Uranio + contexto IAEA PRIS curado → <NuclearGlobalContext /> (panel propio).
// Empresas copropietarias del parque → <CompanyQuotePanel energias={['nuclear']} />
// (shared · Energía v3 E1).
