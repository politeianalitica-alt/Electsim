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
import {
  REACTORES_ES,
  URANIO_REF,
  NUCLEAR_GLOBAL_CONTEXT,
} from '@/lib/energia/catalog'
import {
  summarizeFleet,
  fleetLoadFactor,
  buildClosureSchedule,
} from '@/lib/energia/nuclear-calc'
import ReactorFleet from './ReactorFleet'

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

      {/* ───── ROW 3: Calendario de cierre 2027-2035 ───── */}
      <Panel
        title="Calendario de cierre · 2027-2035"
        subtitle="Cese escalonado pactado en 2019 (Enresa + titulares) · potencia que sale del sistema"
        marginBottom
        sourceUrl="https://www.enresa.es/"
        sourceTooltip="Enresa · plan de desmantelamiento"
      >
        <ClosureTimeline />
      </Panel>

      {/* ───── ROW 4: Contexto global nuclear (Ember) ───── */}
      <div style={{ marginBottom: 14 }}>
        <NuclearGlobal />
      </div>

      {/* ───── ROW 5: Precio uranio (referencia curada) + empresas ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Precio del uranio (U3O8)"
          subtitle="Referencia spot yellowcake · sin dataset en vivo"
          sourceUrl={URANIO_REF.source_url}
          sourceTooltip="UxC · precio spot del uranio"
        >
          <UranioRefBox />
        </Panel>
        <EmpresasNuclear />
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

// ─── Calendario de cierre · timeline horizontal ──────────────────────────────
function ClosureTimeline() {
  const schedule = buildClosureSchedule(REACTORES_ES)
  if (schedule.length === 0) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Sin datos de calendario de cierre.</div>
  }
  const years = schedule.map((s) => s.year)
  const minY = Math.min(...years)
  const maxY = Math.max(...years)
  const totalMw = REACTORES_ES.reduce((s, r) => s + r.potencia_mw, 0)
  const maxYearMw = Math.max(1, ...schedule.map((s) => s.potencia_mw))

  // Potencia operativa acumulada que va quedando tras cada año de cierre.
  let restante = totalMw

  return (
    <div>
      {/* Eje + barras por año */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 4 }}>
        {schedule.map((s) => {
          restante -= s.potencia_mw
          const barH = Math.round((s.potencia_mw / maxYearMw) * 90) + 30
          return (
            <div key={s.year} style={{ flex: '1 1 0', minWidth: 130, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Reactores que cierran */}
              <div style={{ fontSize: 10.5, color: '#3a3a3d', textAlign: 'center', marginBottom: 6, minHeight: 30, lineHeight: 1.3 }}>
                {s.reactores.map((r) => r.nombre).join(' · ')}
              </div>
              {/* Barra de potencia */}
              <div
                title={`${s.potencia_mw.toLocaleString('es-ES')} MW cierran en ${s.year}`}
                style={{
                  width: '70%', height: barH, borderRadius: '8px 8px 0 0',
                  background: `linear-gradient(180deg, ${NUCLEAR}, ${NUCLEAR_DARK})`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6,
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
                  {(s.potencia_mw / 1000).toFixed(2)} GW
                </span>
              </div>
              {/* Año */}
              <div style={{ width: '100%', borderTop: '2px solid #ECECEF', marginTop: 0, paddingTop: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>{s.year}</div>
                <div style={{ fontSize: 9.5, color: '#86868b' }}>
                  quedan {(restante / 1000).toFixed(2)} GW
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        Desde {minY} hasta {maxY} salen del sistema los {(totalMw / 1000).toFixed(1)} GW nucleares actuales según el
        protocolo firmado en 2019 entre Enresa y las titulares (Iberdrola, Endesa, Naturgy, EDP). Almaraz I/II abren
        el calendario; Vandellós II y Trillo lo cierran en {maxY}. El debate sobre una posible revisión sigue abierto.
      </p>
    </div>
  )
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
        {/* Notas curadas de contexto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NUCLEAR_GLOBAL_CONTEXT.map((n) => (
            <div key={n.titular} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: NUCLEAR, marginBottom: 3 }}>{n.titular}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.45 }}>{n.detalle}</div>
              <div style={{ fontSize: 9, color: '#A0A0A5', marginTop: 4 }}>{n.fuente}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ─── Precio uranio (referencia curada) ───────────────────────────────────────
function UranioRefBox() {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', color: URANIO_REF.precio_usd_lb != null ? NUCLEAR : '#C0C0C5', letterSpacing: '-0.02em' }}>
        {URANIO_REF.precio_usd_lb != null ? `${URANIO_REF.precio_usd_lb.toLocaleString('es-ES')} ` : '— '}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#86868b' }}>USD/lb U3O8</span>
      </div>
      <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '5px 10px' }}>
        <span aria-hidden="true">⟶</span> {URANIO_REF.tendencia}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        {URANIO_REF.fuente} Referencia: {URANIO_REF.fecha_ref}.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        No hay dataset de uranio en las fuentes en vivo configuradas (Nasdaq Data Link cubre crudo/metales, no U3O8).
        Se mostraría una serie si se incorpora un proveedor con API pública.
      </p>
    </div>
  )
}

// ─── Empresas copropietarias del parque (Finnhub) ────────────────────────────
interface Quote {
  symbol: string
  name: string
  rol: string
  price: number | null
  change_percent: number | null
  available: boolean
}

// Las tres utilities españolas titulares del parque nuclear (ELE/IBE/NTGY).
const NUCLEAR_COMPANIES: Array<{ symbol: string; name: string; rol: string }> = [
  { symbol: 'IBE.MC', name: 'Iberdrola', rol: 'Copropietaria · 5 reactores' },
  { symbol: 'ELE.MC', name: 'Endesa', rol: 'Copropietaria · 5 reactores' },
  { symbol: 'NTGY.MC', name: 'Naturgy', rol: 'Copropietaria · Almaraz + Trillo' },
]

function EmpresasNuclear() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const qs = await Promise.all(
        NUCLEAR_COMPANIES.map(async (c): Promise<Quote> => {
          try {
            const r = await fetch(`/api/finnhub/quote/${encodeURIComponent(c.symbol)}`, { cache: 'no-store' })
            const j: any = await r.json()
            if (j?.ok && j.price != null) {
              return { ...c, price: j.price, change_percent: j.change_percent ?? null, available: true }
            }
          } catch { /* degradación silenciosa */ }
          return { ...c, price: null, change_percent: null, available: false }
        }),
      )
      if (alive) setQuotes(qs)
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
            Empresas copropietarias del parque
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Las tres utilities españolas titulares de los reactores · cotización
          </p>
        </div>
        <a href="https://finnhub.io" target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: NUCLEAR, textDecoration: 'none' }}>
          Finnhub · tiempo real
        </a>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {quotes == null &&
          Array.from({ length: NUCLEAR_COMPANIES.length }).map((_, i) => (
            <div key={i} style={{ height: 86, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }} />
          ))}
        {quotes?.map((q) => (
          <div key={q.symbol} style={{ padding: '10px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.name}
            </div>
            <div style={{ fontSize: 9.5, color: '#86868b', fontFamily: 'monospace', marginTop: 1 }}>{q.symbol}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 5, gap: 6 }}>
              {q.available ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
                    {q.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                  </span>
                  {q.change_percent != null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: q.change_percent >= 0 ? '#16A34A' : '#DC2626' }}>
                      {q.change_percent >= 0 ? '⇡' : '⇣'} {Math.abs(q.change_percent).toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 10.5, color: '#C0C0C5' }} title="Sin cotización (rate-limit o ticker no soportado en free tier)">
                  — sin cotización
                </span>
              )}
            </div>
            <div style={{ fontSize: 9, color: NUCLEAR, fontWeight: 700, marginTop: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {q.rol}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
