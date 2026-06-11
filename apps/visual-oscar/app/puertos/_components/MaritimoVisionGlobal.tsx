'use client'
/**
 * <MaritimoVisionGlobal /> · Resumen ejecutivo del sector marítimo global.
 *
 * Landing de la página principal /puertos. Fusiona, de un vistazo, datos VIVOS
 * de varios endpoints, cada bloque degradando por su cuenta (Promise.allSettled,
 * tolerancia a fallos independiente):
 *
 *   1. /api/osiris/maritime           → KPIs hero (buques en vivo · puertos
 *                                        monitorizados · corredores estratégicos).
 *   2. /api/maritimo/flota            → top pabellones (banderas) por GT y grandes
 *                                        navieras de portacontenedores por TEU.
 *   3. /api/maritimo/comercio-bilateral?reporter=ESP
 *                                     → balanza comercial de España y socios.
 *
 * NUNCA inventa datos: si un bloque falla, su sección muestra un aviso honesto
 * y el resto sigue vivo. Sin claves hardcodeadas (AIS via env en el endpoint).
 * Cero emojis (CLAUDE.md §0.5): solo glifos Unicode. Marca teal ACCENT '#0e7490'.
 *
 * Se cablea desde /puertos. export default.
 */
import { useEffect, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

/** Teal portuario · marca del sector marítimo. */
const ACCENT = '#0e7490'
const ACCENT_SOFT = '#f0fdfa'
const MUTED = '#6e6e73'
const INK = '#1d1d1f'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de las respuestas (subconjunto que consumimos)
// ─────────────────────────────────────────────────────────────────────────────

interface OsirisData {
  total_ships?: number
  total_ports?: number
  total_chokepoints?: number
  ships_source?: string
  ship_type_counts?: Record<string, number>
  chokepoints?: Array<{ name: string; risk: string; traffic?: string }>
}

interface FlagFleet {
  iso2: string
  name: string
  gt_thousand: number
  vessels: number
  category: 'open' | 'national'
}

interface Carrier {
  slug: string
  name: string
  country_iso2: string
  teu: number
  share_pct: number
  alliance: string
}

interface FlotaEnvelope {
  ok: boolean
  data?: {
    por_pabellon?: FlagFleet[]
    navieras?: Carrier[]
    resumen?: {
      flag_gt_thousand_total?: number
      open_registry_gt_share_pct?: number
      carriers_teu_total?: number
      fleet_by_flag_as_of?: string
      carriers_as_of?: string
    } | null
  }
  error?: string | null
  source_url?: string
}

interface TopPartner {
  partner_iso: string
  partner_name: string
  value_usd: number
  value_fmt: string
  share_pct: number
}

interface ComercioEnvelope {
  ok: boolean
  data?: {
    reporter?: string
    year?: number
    top_export?: TopPartner[]
    top_import?: TopPartner[]
    balanza?: {
      exports_usd?: number
      imports_usd?: number
      balance_usd?: number
      exports_fmt?: string
      imports_fmt?: string
      balance_fmt?: string
    }
    source?: string
  }
  error?: string | null
  source_url?: string
}

interface BlockState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de formato (defensivos · nunca lanzan)
// ─────────────────────────────────────────────────────────────────────────────

function nfmt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES')
}

/** GT en miles → texto en millones de GT (las cifras del dataset van en miles). */
function gtThousandToM(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return `${(n / 1000).toFixed(1)} M GT`
}

/** TEU absoluto → texto en millones de TEU. */
function teuToM(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return `${(n / 1e6).toFixed(1)} M TEU`
}

/** Bandera emoji a partir del ISO alpha-2 (regional indicators · no es emoji decorativo). */
function flagEmoji(iso2: string | undefined): string {
  if (!iso2 || iso2.length !== 2) return ''
  const base = 0x1f1e6
  const cc = iso2.toUpperCase()
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65)
}

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#b91c1c',
  HIGH: '#dc2626',
  ELEVATED: '#d97706',
  MODERATE: '#ca8a04',
  LOW: '#16a34a',
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes de presentación
// ─────────────────────────────────────────────────────────────────────────────

function HeroKpi({
  glyph, label, value, sub,
}: { glyph: string; label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        flex: '1 1 160px', minWidth: 150,
        background: '#fff', border: '1px solid #ECECEF',
        borderLeft: `3px solid ${ACCENT}`, borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ fontSize: 14, color: ACCENT, lineHeight: 1 }}>{glyph}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: MUTED, textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function BlockNotice({ loading, error, label }: { loading: boolean; error: string | null; label: string }) {
  if (loading) {
    return <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Cargando {label}…</p>
  }
  return (
    <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11.5, color: '#92400e' }}>
      <strong>{label} no disponible</strong>{error ? ` · ${error}` : ''}.
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '5px 6px', fontWeight: 600, fontSize: 10.5, color: '#475569',
  letterSpacing: '0.02em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 6px', fontSize: 11.5, color: '#334155', borderBottom: '1px solid #f1f5f9',
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function MaritimoVisionGlobal() {
  const [osiris, setOsiris] = useState<BlockState<OsirisData>>({ data: null, error: null, loading: true })
  const [flota, setFlota] = useState<BlockState<FlotaEnvelope['data']>>({ data: null, error: null, loading: true })
  const [comercio, setComercio] = useState<BlockState<ComercioEnvelope['data']>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let alive = true

    // Cada bloque degrada SOLO · Promise.allSettled + try/catch por petición.
    const loadOsiris = fetch('/api/osiris/maritime', { cache: 'no-store' })
      .then((r) => r.json() as Promise<OsirisData>)
      .then((j) => { if (alive) setOsiris({ data: j, error: null, loading: false }) })
      .catch((e) => { if (alive) setOsiris({ data: null, error: String(e?.message ?? 'red'), loading: false }) })

    const loadFlota = fetch('/api/maritimo/flota')
      .then((r) => r.json() as Promise<FlotaEnvelope>)
      .then((j) => {
        if (!alive) return
        if (j?.ok && j.data) setFlota({ data: j.data, error: null, loading: false })
        else setFlota({ data: j?.data ?? null, error: j?.error || 'sin datos', loading: false })
      })
      .catch((e) => { if (alive) setFlota({ data: null, error: String(e?.message ?? 'red'), loading: false }) })

    const loadComercio = fetch('/api/maritimo/comercio-bilateral?reporter=ESP')
      .then((r) => r.json() as Promise<ComercioEnvelope>)
      .then((j) => {
        if (!alive) return
        if (j?.ok && j.data) setComercio({ data: j.data, error: null, loading: false })
        else setComercio({ data: j?.data ?? null, error: j?.error || 'sin datos', loading: false })
      })
      .catch((e) => { if (alive) setComercio({ data: null, error: String(e?.message ?? 'red'), loading: false }) })

    Promise.allSettled([loadOsiris, loadFlota, loadComercio])

    return () => { alive = false }
  }, [])

  // ── Derivados OSIRIS ──
  const o = osiris.data
  const criticalChokes = (o?.chokepoints || []).filter(
    (c) => c.risk === 'CRITICAL' || c.risk === 'HIGH',
  ).length
  const cargoLive = o?.ship_type_counts?.cargo
  const tankerLive = o?.ship_type_counts?.tanker

  // ── Derivados FLOTA ──
  const banderas = (flota.data?.por_pabellon || []).slice(0, 6)
  const navieras = (flota.data?.navieras || []).slice(0, 6)
  const resumen = flota.data?.resumen

  // ── Derivados COMERCIO ──
  const bal = comercio.data?.balanza
  const topExp = (comercio.data?.top_export || []).slice(0, 5)
  const topImp = (comercio.data?.top_import || []).slice(0, 5)
  const balPositive = (bal?.balance_usd ?? 0) >= 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ───── Cabecera de sección ───── */}
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: INK }}>
          <span aria-hidden="true" style={{ color: ACCENT, marginRight: 8 }}>⚓</span>
          Inteligencia marítima global
        </h1>
        <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>
          Resumen ejecutivo · tráfico AIS en vivo, flota mundial y comercio de España, de un vistazo.
        </p>
      </header>

      {/* ───── Fila de KPIs hero · OSIRIS Maritime ───── */}
      <section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <HeroKpi
            glyph="⛴"
            label="Buques en vivo"
            value={osiris.loading ? '…' : nfmt(o?.total_ships)}
            sub={
              cargoLive != null
                ? `${nfmt(cargoLive)} carga · ${nfmt(tankerLive)} tanker`
                : 'tráfico AIS agregado'
            }
          />
          <HeroKpi
            glyph="⬡"
            label="Puertos monitorizados"
            value={osiris.loading ? '…' : nfmt(o?.total_ports)}
            sub="principales + dataset mundial"
          />
          <HeroKpi
            glyph="◈"
            label="Corredores estratégicos"
            value={osiris.loading ? '…' : nfmt(o?.total_chokepoints)}
            sub={criticalChokes > 0 ? `${criticalChokes} en riesgo alto/crítico` : 'chokepoints vigilados'}
          />
          <HeroKpi
            glyph="◉"
            label="Flota mundial (top)"
            value={flota.loading ? '…' : gtThousandToM(resumen?.flag_gt_thousand_total)}
            sub={
              resumen?.open_registry_gt_share_pct != null
                ? `${resumen.open_registry_gt_share_pct}% registros abiertos`
                : 'tonelaje bruto agregado'
            }
          />
        </div>
        {!osiris.loading && (osiris.error || !o?.total_ships) && (
          <div style={{ marginTop: 10 }}>
            <BlockNotice loading={false} error={osiris.error} label="Tráfico AIS (OSIRIS)" />
          </div>
        )}
        {!osiris.loading && o?.ships_source && (
          <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#94a3b8' }}>
            ◦ Fuente buques · {o.ships_source}
          </p>
        )}
      </section>

      {/* ───── Fila 2 · flota (banderas + navieras) ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* Top pabellones */}
        <Panel
          title="Top pabellones por tonelaje"
          subtitle={resumen?.fleet_by_flag_as_of ? `a ${resumen.fleet_by_flag_as_of}` : 'flota mundial por bandera'}
          sourceUrl="https://unctadstat.unctad.org/datacentre/dataviewer/US.MerchantFleet"
          sourceLabel="UNCTAD"
          sourceTooltip="UNCTAD Review of Maritime Transport · flota por pabellón de registro"
        >
          {flota.loading || (!banderas.length) ? (
            <BlockNotice loading={flota.loading} error={flota.error} label="Flota por pabellón" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Pabellón</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>GT</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Buques</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Registro</th>
                </tr>
              </thead>
              <tbody>
                {banderas.map((f, i) => (
                  <tr key={f.iso2}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: INK }}>
                      <span aria-hidden="true" style={{ color: '#94a3b8', marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                      <span aria-hidden="true" style={{ marginRight: 5 }}>{flagEmoji(f.iso2)}</span>
                      {f.name}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {gtThousandToM(f.gt_thousand)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {nfmt(f.vessels)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em',
                        padding: '2px 7px', borderRadius: 999,
                        background: f.category === 'open' ? '#fef3c7' : ACCENT_SOFT,
                        color: f.category === 'open' ? '#92400e' : ACCENT,
                      }}>
                        {f.category === 'open' ? 'ABIERTO' : 'NACIONAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Grandes navieras */}
        <Panel
          title="Grandes navieras (cuota TEU)"
          subtitle={resumen?.carriers_as_of ? `a ${resumen.carriers_as_of}` : 'portacontenedores · capacidad operada'}
          sourceUrl="https://www.alphaliner.com/top-100/"
          sourceLabel="Alphaliner"
          sourceTooltip="Capacidad operada de portacontenedores · datos públicos estilo Alphaliner Top 100"
        >
          {flota.loading || (!navieras.length) ? (
            <BlockNotice loading={flota.loading} error={flota.error} label="Navieras" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Naviera</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>TEU</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cuota</th>
                </tr>
              </thead>
              <tbody>
                {navieras.map((c, i) => {
                  const maxShare = navieras[0]?.share_pct || 1
                  const w = Math.max(2, Math.round((c.share_pct / maxShare) * 100))
                  return (
                    <tr key={c.slug}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: INK }}>
                        <span aria-hidden="true" style={{ color: '#94a3b8', marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                        <span aria-hidden="true" style={{ marginRight: 5 }}>{flagEmoji(c.country_iso2)}</span>
                        {c.name.replace(/\s*\(.*\)\s*/, '')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {teuToM(c.teu)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: ACCENT, fontWeight: 700, fontSize: 11.5 }}>
                            {c.share_pct.toFixed(1)}%
                          </span>
                          <span aria-hidden="true" style={{ width: 44, height: 5, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden', display: 'inline-block' }}>
                            <span style={{ display: 'block', width: `${w}%`, height: '100%', background: ACCENT }} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {/* ───── Fila 3 · mini-balanza España + corredores en riesgo ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* Balanza comercial ES */}
        <Panel
          title="Balanza comercial · España"
          subtitle={
            comercio.data?.year
              ? `${comercio.data.year} · ${(comercio.data.source || '').toUpperCase() || 'comercio declarado'}`
              : 'comercio declarado de mercancías'
          }
          sourceUrl={comercio.data?.source === 'oec' ? 'https://oec.world' : 'https://comtradeplus.un.org'}
          sourceLabel={comercio.data?.source === 'oec' ? 'OEC' : 'UN Comtrade'}
          sourceTooltip="Comercio bilateral declarado · UN Comtrade (primaria) / OEC (fallback)"
        >
          {comercio.loading || (!bal && !topExp.length) ? (
            <BlockNotice loading={comercio.loading} error={comercio.error} label="Comercio España" />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 90px', background: ACCENT_SOFT, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase' }}>
                    <span aria-hidden="true" style={{ marginRight: 4 }}>⇡</span>Exporta
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {bal?.exports_fmt ?? '—'}
                  </div>
                </div>
                <div style={{ flex: '1 1 90px', background: '#fafafa', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase' }}>
                    <span aria-hidden="true" style={{ marginRight: 4 }}>⟶</span>Importa
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {bal?.imports_fmt ?? '—'}
                  </div>
                </div>
                <div style={{ flex: '1 1 90px', background: balPositive ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase' }}>
                    <span aria-hidden="true" style={{ marginRight: 4 }}>{balPositive ? '●' : '◦'}</span>Saldo
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: balPositive ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {bal?.balance_fmt ?? '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase' }}>
                    Top destinos export
                  </p>
                  {topExp.length ? topExp.map((p) => (
                    <div key={`x-${p.partner_iso}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: INK }}>
                        <span aria-hidden="true" style={{ marginRight: 5 }}>{flagEmoji(p.partner_iso.slice(0, 2))}</span>
                        {p.partner_name}
                      </span>
                      <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.value_fmt}</span>
                    </div>
                  )) : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
                </div>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase' }}>
                    Top origen import
                  </p>
                  {topImp.length ? topImp.map((p) => (
                    <div key={`m-${p.partner_iso}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: INK }}>
                        <span aria-hidden="true" style={{ marginRight: 5 }}>{flagEmoji(p.partner_iso.slice(0, 2))}</span>
                        {p.partner_name}
                      </span>
                      <span style={{ color: '#475569', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.value_fmt}</span>
                    </div>
                  )) : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
                </div>
              </div>
            </>
          )}
        </Panel>

        {/* Corredores en riesgo · vive con OSIRIS */}
        <Panel
          title="Corredores marítimos · riesgo"
          subtitle="chokepoints con tráfico AIS en vivo"
          sourceUrl="https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints"
          sourceLabel="Chokepoints"
          sourceTooltip="Corredores estratégicos · riesgo recalculado con tráfico AIS en vivo"
        >
          {osiris.loading || !(o?.chokepoints || []).length ? (
            <BlockNotice loading={osiris.loading} error={osiris.error} label="Corredores" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Corredor</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Tráfico</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {[...(o?.chokepoints || [])]
                  .sort((a, b) => {
                    const order = ['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW']
                    return order.indexOf(a.risk) - order.indexOf(b.risk)
                  })
                  .slice(0, 7)
                  .map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: INK }}>{c.name}</td>
                      <td style={{ ...tdStyle, color: MUTED, fontSize: 10.5 }}>{c.traffic || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em',
                          padding: '2px 8px', borderRadius: 999,
                          background: `${RISK_COLOR[c.risk] || MUTED}1a`,
                          color: RISK_COLOR[c.risk] || MUTED,
                        }}>
                          {c.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  )
}
