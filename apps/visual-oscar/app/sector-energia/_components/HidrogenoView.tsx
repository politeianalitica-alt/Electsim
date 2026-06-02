'use client'
/**
 * <HidrogenoView /> · Sprint Energía S9
 *
 * Vista "Hidrógeno" del EnergiaShell. El H2 tiene poca data tiempo-real pública,
 * así que esta vista es la más basada en CATÁLOGO CURADO, marcada claramente
 * como "datos de proyecto/catálogo" vs tiempo real (CLAUDE.md · spec §3.7):
 *
 *   - Hero · 4 KPIs H2 (capacidad electrolizadores ES planificada · nº proyectos
 *     PERTE · objetivo PNIEC 11-12 GW electrólisis 2030 · inversión movilizada).
 *     Todos de catálogo curado, marcados como "proyecto/catálogo".
 *   - Proyectos H2 verde ES (H2_PROYECTOS_ES): grid con promotor, ubicación,
 *     capacidad MW, estado, horizonte.
 *   - EU Hydrogen Bank (H2_SUBASTAS_EU): subastas con precios €/kg adjudicados.
 *   - Corredor H2Med / backbone (H2_BACKBONE): red troncal Enagás + H2Med.
 *   - Empresas H2 (Iberdrola, Repsol, Acciona, Enagás): strip cotización Finnhub
 *     (ÚNICO dato en vivo de la vista).
 *   - <SectorIntelPanel sector="energia" compact />.
 *
 * Cero emojis · Unicode (◆ ⬢ ⟶ ⇡ ⇣). El único dato en vivo es la cotización
 * de las empresas (Finnhub); todo lo demás es catálogo curado citado.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import {
  H2_PROYECTOS_ES,
  H2_SUBASTAS_EU,
  H2_SUBASTA_EU_NOTA_2A,
  H2_BACKBONE,
  EMPRESAS_ENERGIA,
} from '@/lib/energia/catalog'

const H2 = '#0D9488' // teal-cyan · hidrógeno
const H2_DARK = '#115E59'

// Objetivo PNIEC de electrólisis a 2030 (GW). El PNIEC revisado (2024) eleva el
// objetivo de electrolizadores de hidrógeno renovable a ~12 GW (la versión
// inicial fijaba 11 GW). Fuente: PNIEC 2023-2030 · MITECO.
const PNIEC_ELECTROLISIS_GW = 12

export function HidrogenoView() {
  // Capacidad de electrólisis planificada ES = suma de los proyectos de
  // electrólisis (excluye infraestructura pura como H2Med, capacidad_mw=0).
  const capacidadPlanificadaMw = useMemo(
    () => H2_PROYECTOS_ES.reduce((acc, p) => acc + (p.capacidad_mw > 0 ? p.capacidad_mw : 0), 0),
    [],
  )
  const nProyectos = H2_PROYECTOS_ES.filter((p) => p.capacidad_mw > 0).length

  return (
    <>
      {/* ───── HERO con KPIs H2 (catálogo) ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${H2} 0%, ${H2_DARK} 100%)`,
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
            SECTORIAL · ENERGÍA Y SUMINISTROS · HIDRÓGENO
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Hidrógeno renovable <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en España y Europa</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            Los grandes proyectos de hidrógeno verde de España (PERTE ERHA), las subastas del Banco
            Europeo del Hidrógeno (prima €/kg), el corredor H2Med y la red troncal de Enagás, y las
            empresas que lideran el sector. El hidrógeno es un mercado emergente con poca data en
            tiempo real, por lo que esta vista se basa en catálogo curado citado.
          </p>
          <div style={{ marginTop: 14, display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 11, opacity: 0.85, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '5px 12px' }}>
            <span aria-hidden="true">⬢</span>
            Datos de proyecto / catálogo curado · la cotización de empresas es el único dato en vivo
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <HeroKPI label="Electrólisis ES planificada" value={(capacidadPlanificadaMw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} unit="GW" accent="#5EEAD4" sub="suma proyectos catálogo" tag="catálogo" />
          <HeroKPI label="Proyectos H2 verde ES" value={String(nProyectos)} unit="" accent="#99F6E4" sub="PERTE ERHA + privados" tag="catálogo" />
          <HeroKPI label="Objetivo PNIEC 2030" value={String(PNIEC_ELECTROLISIS_GW)} unit="GW" accent="#CCFBF1" sub="electrólisis instalada" tag="PNIEC" />
          <HeroKPI label="EU Hydrogen Bank 1ª" value={H2_SUBASTAS_EU[0] ? `${H2_SUBASTAS_EU[0].precio_min_eur_kg.toFixed(2)}–${H2_SUBASTAS_EU[0].precio_max_eur_kg.toFixed(2)}` : '—'} unit="€/kg" accent="#A7F3D0" sub="prima adjudicada" tag="UE" />
        </div>
      </section>

      {/* Aviso global de naturaleza de los datos */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          background: '#F0FDFA',
          border: '1px solid #99F6E4',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 14,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, color: H2, lineHeight: 1.2 }}>⬢</span>
        <p style={{ margin: 0, fontSize: 11.5, color: '#134E4A', lineHeight: 1.5 }}>
          <strong>Naturaleza de los datos:</strong> el hidrógeno renovable es un sector emergente sin
          mercados de referencia líquidos ni APIs públicas de precio/producción en tiempo real. Esta
          vista se construye sobre <strong>catálogo curado citado</strong> (PERTE ERHA / MITECO,
          Comisión Europea, Enagás) salvo la cotización de las empresas (Finnhub, en vivo). Las
          capacidades y fechas-horizonte son objetivos de proyecto y pueden variar.
        </p>
      </div>

      {/* ───── ROW 1: Proyectos H2 verde ES (catálogo) ───── */}
      <Panel
        title="Proyectos de hidrógeno verde en España"
        subtitle="PERTE ERHA + proyectos privados · promotor, ubicación, capacidad de electrólisis, estado y horizonte"
        marginBottom
        sourceUrl="https://www.miteco.gob.es/es/energia/estrategia-normativa/hidrogeno.html"
        sourceTooltip="MITECO · PERTE de Energías Renovables, Hidrógeno Renovable y Almacenamiento (ERHA)"
      >
        <ProyectosGrid />
      </Panel>

      {/* ───── ROW 2: EU Hydrogen Bank (subastas €/kg) ───── */}
      <Panel
        title="European Hydrogen Bank · subastas de prima fija"
        subtitle="Banco Europeo del Hidrógeno · ayuda en €/kg durante 10 años a los proyectos que pujan más bajo"
        marginBottom
        sourceUrl="https://climate.ec.europa.eu/eu-action/eu-funding-climate-action/innovation-fund/european-hydrogen-bank_en"
        sourceTooltip="Comisión Europea (DG CLIMA) / CINEA · European Hydrogen Bank"
      >
        <SubastasEU />
      </Panel>

      {/* ───── ROW 3: Corredor H2Med / backbone ───── */}
      <Panel
        title="Corredor H2Med y red troncal de hidrógeno"
        subtitle="Infraestructura de transporte de H2 · interconexiones ibéricas + red troncal Enagás (European Hydrogen Backbone)"
        marginBottom
        sourceUrl="https://www.enagas.es/en/transition-energy/renewable-hydrogen/h2med/"
        sourceTooltip="Enagás · H2Med + European Hydrogen Backbone · Comisión Europea (lista PCI)"
      >
        <BackboneList />
      </Panel>

      {/* ───── ROW 4: Empresas H2 (Finnhub · en vivo) ───── */}
      <div style={{ marginBottom: 14 }}>
        <EmpresasH2 />
      </div>

      {/* Inteligencia operativa sectorial */}
      <SectorIntelPanel
        sector="energia"
        compact
        detailHref="/sector-energia/empresas?energia=hidrogeno"
        detailLabel="Ver empresas de hidrógeno ⟶"
      />

      {/* Cuaderno · notas que mencionan al sector energía */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
    </>
  )
}

export default HidrogenoView

// ─── HeroKPI ──────────────────────────────────────────────────────────────
function HeroKPI({
  label,
  value,
  unit,
  accent,
  sub,
  tag,
}: {
  label: string
  value: string
  unit: string
  accent: string
  sub?: string
  tag?: string
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
          {label}
        </div>
        {tag && (
          <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, padding: '1px 4px' }}>
            {tag}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Proyectos H2 verde ES (catálogo) ────────────────────────────────────────
const ESTADO_COLOR: Record<string, string> = {
  'en operación': '#16A34A',
  'en construcción': '#0EA5E9',
  'FID / en desarrollo': '#8B5CF6',
  'en desarrollo': '#8B5CF6',
  planificado: '#F59E0B',
  'planificado (infraestructura)': '#94A3B8',
}

function ProyectosGrid() {
  // Orden: mayor capacidad primero (los de infraestructura, cap=0, al final).
  const proyectos = useMemo(
    () => [...H2_PROYECTOS_ES].sort((a, b) => b.capacidad_mw - a.capacidad_mw),
    [],
  )
  const maxCap = Math.max(...proyectos.map((p) => p.capacidad_mw), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
      {proyectos.map((p) => {
        const col = ESTADO_COLOR[p.estado] ?? '#94A3B8'
        const isInfra = p.capacidad_mw === 0
        return (
          <div key={p.nombre} style={{ padding: 14, background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, borderLeft: `4px solid ${col}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.25 }}>{p.nombre}</p>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6e6e73' }}>{p.promotor}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#9CA3AF' }}>{p.ubicacion}</p>

            {!isInfra ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Electrólisis</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: H2_DARK }}>
                    {p.capacidad_mw.toLocaleString('es-ES')} <span style={{ fontSize: 9, color: '#9CA3AF' }}>MW</span>
                  </span>
                </div>
                <div style={{ height: 7, background: '#F0FDFA', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(p.capacidad_mw / maxCap) * 100}%`, height: '100%', background: H2 }} />
                </div>
              </div>
            ) : (
              <p style={{ margin: '10px 0 0', fontSize: 10.5, color: '#64748B', fontStyle: 'italic' }}>Infraestructura de transporte (sin electrólisis)</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 6 }}>
              <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: `${col}18`, color: col, fontWeight: 700 }}>
                {p.estado}
              </span>
              <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>{p.horizonte}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── EU Hydrogen Bank (subastas) ─────────────────────────────────────────────
function SubastasEU() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {H2_SUBASTAS_EU.map((s) => (
          <div key={s.ronda} style={{ padding: 14, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, borderTop: `3px solid ${H2}` }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{s.ronda}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#9CA3AF' }}>{s.fecha}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: H2_DARK, letterSpacing: '-0.02em' }}>
                {s.precio_min_eur_kg.toFixed(2)}–{s.precio_max_eur_kg.toFixed(2)}
              </span>
              <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600 }}>€/kg</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#86868b' }}>prima fija adjudicada · 10 años</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proyectos</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>{s.proyectos_adjudicados}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presupuesto</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>{s.presupuesto_meur} <span style={{ fontSize: 9, color: '#9CA3AF' }}>M€</span></div>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.45 }}>{s.observacion}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>{H2_SUBASTA_EU_NOTA_2A}</p>
    </div>
  )
}

// ─── Corredor H2Med / backbone ───────────────────────────────────────────────
function BackboneList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {H2_BACKBONE.map((b) => (
        <div key={b.nombre} style={{ padding: '12px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>
                <span aria-hidden="true" style={{ color: H2, marginRight: 6 }}>◆</span>{b.nombre}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
                {b.tipo} · {b.trazado}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#9CA3AF' }}>
                Promotores: {b.promotores.join(' · ')}
              </p>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {b.longitud_km != null && (
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: H2_DARK }}>
                  {b.longitud_km.toLocaleString('es-ES')} <span style={{ fontSize: 9, color: '#9CA3AF' }}>km</span>
                </div>
              )}
              <div style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>objetivo {b.horizonte}</div>
              <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9, padding: '2px 8px', borderRadius: 999, background: `${H2}15`, color: H2_DARK, fontWeight: 700 }}>{b.estado}</span>
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.45 }}>{b.observacion}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Empresas H2 (Finnhub · en vivo) ─────────────────────────────────────────
interface Quote {
  slug: string
  symbol: string | null
  name: string
  rol: string
  price: number | null
  change_percent: number | null
  available: boolean
}

// Empresas líderes del hidrógeno en España (electrolizadores + backbone).
const H2_COMPANY_SLUGS = ['iberdrola', 'repsol', 'acciona-energia', 'enagas', 'cepsa']

function rolFor(slug: string): string {
  if (slug === 'iberdrola') return 'Electrolizador Puertollano'
  if (slug === 'repsol') return 'Petronar · valles H2'
  if (slug === 'acciona-energia') return 'Green Hysland · renovable'
  if (slug === 'enagas') return 'Backbone · H2Med'
  if (slug === 'cepsa') return 'Valle H2 Andalucía'
  return 'Hidrógeno'
}

function EmpresasH2() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const companies = H2_COMPANY_SLUGS
        .map((slug) => EMPRESAS_ENERGIA.find((c) => c.slug === slug))
        .filter((c): c is NonNullable<typeof c> => !!c)
      const qs = await Promise.all(
        companies.map(async (c): Promise<Quote> => {
          const base: Quote = {
            slug: c.slug,
            symbol: c.ticker || null,
            name: c.nombre,
            rol: rolFor(c.slug),
            price: null,
            change_percent: null,
            available: false,
          }
          if (!c.ticker) return base
          try {
            const r = await fetch(`/api/finnhub/quote/${encodeURIComponent(c.ticker)}`, { cache: 'no-store' })
            const j: any = await r.json()
            if (j?.ok && j.price != null) {
              return { ...base, price: j.price, change_percent: j.change_percent ?? null, available: true }
            }
          } catch {
            /* degradación silenciosa */
          }
          return base
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
            Empresas líderes en hidrógeno
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Iberdrola · Repsol · Acciona · Enagás (backbone) · cotización en vivo
          </p>
        </div>
        <a href="/sector-energia/empresas?energia=hidrogeno" style={{ fontSize: 10.5, color: H2_DARK, textDecoration: 'none', fontWeight: 600 }}>
          Ver todas las empresas ⟶
        </a>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {quotes == null &&
          Array.from({ length: H2_COMPANY_SLUGS.length }).map((_, i) => (
            <div key={i} style={{ height: 86, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }} />
          ))}
        {quotes?.map((q) => (
          <a key={q.slug} href={`/sector-energia/empresas/${q.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: '10px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.name}
              </div>
              <div style={{ fontSize: 9.5, color: '#86868b', fontFamily: 'monospace', marginTop: 1 }}>{q.symbol ?? '—'}</div>
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
                  <span style={{ fontSize: 10.5, color: '#C0C0C5' }} title={q.symbol ? 'Sin cotización (rate-limit o ticker no soportado en free tier)' : 'Empresa privada · no cotiza'}>
                    {q.symbol ? '— sin cotización' : '— no cotiza'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9, color: H2_DARK, fontWeight: 700, marginTop: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {q.rol}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
