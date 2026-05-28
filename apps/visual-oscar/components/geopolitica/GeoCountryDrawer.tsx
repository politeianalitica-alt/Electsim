'use client'
/**
 * <GeoCountryDrawer /> · Sprint G16 item 3 · DRAWER COUNTRY ENRIQUECIDO
 *
 * Antes (Sprint GEO-RADAR C2): solo mostraba IRC + V-Dem polyarchy + señales
 * GDELT recientes. Para Cuba (CRITICO 90) salía sólo "V-Dem 0.10" y "sin datos"
 * para todo lo demás. La crítica del usuario fue justa: "limitadisima".
 *
 * Ahora consume /api/geopolitica/country-profile/[iso3] que devuelve 11 capas:
 *   identity, government, seismic, conflict, humanitarian, narrative,
 *   sanctions, travel, risk, economic, concerns.
 *
 * Layout: barra IRC arriba + grid de secciones:
 *   - Identidad (capital, población, área, idiomas, monedas, vecinos, bandera)
 *   - Gobierno (jefe de estado/gobierno, forma, sistema legal, idioma oficial,
 *     religión, lema, orgs internacionales, independencia)
 *   - Economic (PIB, IPC, paro, deuda, reservas + alerts)
 *   - Top Concerns (top 10 multi-fuente)
 *   - Conflict (UCDP si aplica)
 *   - Sanctions (count + programs)
 *   - Travel + Humanitarian
 *   - Señales GDELT últimas 6h
 *   - Enlaces externos
 */
import { useEffect, useState } from 'react'

interface SourceMeta {
  id: string
  name: string
  access_type: string
  source_url: string
  what_it_measures: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

interface IdentityLayer {
  iso2: string | null; iso3: string
  name_common: string; name_official: string | null
  capital: string | null; region: string | null; subregion: string | null
  population: number | null; area: number | null
  borders: string[]; currencies: string[]; languages: string[]
  flag_png: string | null; flag_emoji: string | null
  un_member: boolean | null
  _source: SourceMeta
}
interface GovernmentLayer {
  head_of_state: string | null; head_of_government: string | null
  form_of_government: string | null
  international_orgs: string[]; independence_date: string | null
  national_motto?: string | null
  state_religion?: string | null
  legal_system?: string | null
  official_language?: string | null
  head_of_state_since?: string | null
  head_of_government_since?: string | null
  _source: SourceMeta
}
interface EconomicLayer {
  gdp_growth_pct_latest: number | null
  inflation_pct_latest: number | null
  unemployment_pct_latest: number | null
  current_account_pct_gdp_latest: number | null
  debt_pct_gdp_latest: number | null
  reserves_months_imports_latest: number | null
  economic_health: 'estable' | 'tension' | 'crisis' | 'sin_datos'
  alerts: string[]
  _source: SourceMeta
}
interface ConflictLayer {
  n_conflicts: number; max_intensity_level: number
  years_covered: string; interpretation: string
  recent: Array<{ name: string; side_a: string; side_b: string; year: number; intensity_level: number }>
  _source: SourceMeta
}
interface SanctionsLayer {
  total_count: number
  by_program: Record<string, number>
  sample: Array<{ entity: string; source: string; date?: string; reason?: string }>
  _source: SourceMeta
}
interface TravelLayer { score: number; band: string; message: string; updated: string; _source: SourceMeta }
interface HumanitarianLayer { n_reports: number; total_available: number; _source: SourceMeta }
interface RiskLayer { score: number; band: string; baseline_risk: number; uplift: number; _source: SourceMeta }
type ConcernSev = 'low' | 'medium' | 'high' | 'critical'
interface Concern { rank: number; title: string; detail: string; source: string; severity: ConcernSev; category: string }
interface ConcernsLayer { total: number; by_severity: Record<ConcernSev, number>; concerns: Concern[]; _source: SourceMeta }

interface CountryProfile {
  ok: boolean
  iso3: string
  country_name: string
  layers: {
    identity: IdentityLayer | null
    government: GovernmentLayer | null
    conflict: ConflictLayer | null
    humanitarian: HumanitarianLayer | null
    sanctions: SanctionsLayer | null
    travel: TravelLayer | null
    risk: RiskLayer | null
    economic?: EconomicLayer | null
    concerns?: ConcernsLayer | null
  }
  layers_count: number
  _meta?: { generated_at: string; latency_ms: number }
}

interface IRCEntry {
  iso3: string; name_es: string
  irc: number; risk_level: string
  components: { vdem_risk: number | null; militarization: number | null; gdelt_tone: number | null; gdelt_volume: number | null }
  raw: { polyarchy: number | null; polyarchy_trend?: string; milex_pct_gdp: number | null; milex_usd_bn: number | null; gdelt_tone_value?: number; gdelt_articles_48h?: number }
}

interface Signal {
  type: string; type_label: string; type_color: string
  iso3: string | null
  title: string; source_domain: string; url: string; datetime: string
}

interface Props {
  iso3: string | null
  onClose: () => void
}

const SEV_COLORS: Record<ConcernSev, { bg: string; fg: string; border: string }> = {
  critical: { bg: '#fef2f2', fg: '#7f1d1d', border: '#dc2626' },
  high: { bg: '#fff7ed', fg: '#9a3412', border: '#ea580c' },
  medium: { bg: '#fefce8', fg: '#854d0e', border: '#ca8a04' },
  low: { bg: '#f0fdf4', fg: '#166534', border: '#16a34a' },
}

export function GeoCountryDrawer({ iso3, onClose }: Props) {
  const [profile, setProfile] = useState<CountryProfile | null>(null)
  const [irc, setIrc] = useState<IRCEntry | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!iso3) return
    let alive = true
    setLoading(true)
    setProfile(null); setIrc(null); setSignals([])
    Promise.all([
      fetch(`/api/geopolitica/country-profile/${iso3}`, { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/geopolitica/irc', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/geopolitica/senales', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([prof, ircResp, sen]) => {
        if (!alive) return
        setProfile(prof)
        setIrc(ircResp.countries?.find((x: IRCEntry) => x.iso3 === iso3) || null)
        setSignals((sen.signals || []).filter((s: Signal) => s.iso3 === iso3))
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (iso3) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [iso3, onClose])

  if (!iso3) return null

  const ident = profile?.layers.identity
  const gov = profile?.layers.government
  const econ = profile?.layers.economic ?? null
  const conf = profile?.layers.conflict
  const sanc = profile?.layers.sanctions
  const travel = profile?.layers.travel
  const human = profile?.layers.humanitarian
  const concerns = profile?.layers.concerns ?? null

  const countryName = ident?.name_common || profile?.country_name || iso3

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
        zIndex: 1000, animation: 'fadeIn 0.15s ease-out',
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(640px, 95vw)', background: '#fff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.15)',
        zIndex: 1001, overflowY: 'auto',
        animation: 'slideIn 0.2s ease-out',
      }}>
        <header style={{
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
            {ident?.flag_png && (
              <img src={ident.flag_png} alt={`Bandera ${countryName}`} style={{
                width: 48, height: 'auto', borderRadius: 3, border: '1px solid #e5e7eb',
              }} />
            )}
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {countryName} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>· {iso3}</span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569' }}>
                {ident?.region}{ident?.subregion ? ` · ${ident.subregion}` : ''}{' '}
                {ident?.capital && <span style={{ color: '#94a3b8' }}>· capital {ident.capital}</span>}
              </p>
              {irc && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                  IRC <strong style={{ color: ircColor(irc.irc), fontFamily: 'ui-monospace, monospace' }}>{irc.irc}</strong>
                  {' '} · {irc.risk_level.toUpperCase()}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, color: '#64748b',
            cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>×</button>
        </header>

        <div style={{ padding: '14px 20px' }}>
          {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando perfil país…</p>}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* TOP CONCERNS · siempre arriba */}
              {concerns && concerns.total > 0 && (
                <Section title={`Top concerns · ${concerns.total} señales`} accent="#dc2626">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {(['critical', 'high', 'medium', 'low'] as ConcernSev[]).map((s) =>
                      concerns.by_severity[s] > 0 && (
                        <span key={s} style={{
                          fontSize: 9, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 3,
                          background: SEV_COLORS[s].bg, color: SEV_COLORS[s].fg,
                          textTransform: 'uppercase', letterSpacing: 0.3,
                        }}>{s} {concerns.by_severity[s]}</span>
                      )
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {concerns.concerns.slice(0, 6).map((c) => (
                      <div key={c.rank} style={{
                        background: SEV_COLORS[c.severity].bg,
                        borderLeft: `3px solid ${SEV_COLORS[c.severity].border}`,
                        padding: '6px 8px', borderRadius: 3,
                      }}>
                        <p style={{ margin: 0, fontSize: 11, color: SEV_COLORS[c.severity].fg, fontWeight: 700 }}>
                          #{c.rank} · {c.title}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: SEV_COLORS[c.severity].fg, opacity: 0.85, lineHeight: 1.4 }}>
                          {c.detail}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>
                          {c.source} · {c.category}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* IDENTIDAD · grid compacto */}
              {ident && (
                <Section title="Identidad · REST Countries" accent="#0891b2">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    <Chip label="Población" value={ident.population ? ident.population.toLocaleString('es-ES') : '—'} />
                    <Chip label="Área (km²)" value={ident.area ? ident.area.toLocaleString('es-ES') : '—'} />
                    <Chip label="Miembro ONU" value={ident.un_member === true ? 'Sí' : ident.un_member === false ? 'No' : '—'} />
                    <Chip label="ISO 3166" value={ident.iso2 ? `${ident.iso2} · ${ident.iso3}` : ident.iso3} />
                  </div>
                  {ident.borders.length > 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: 10, color: '#475569' }}>
                      <strong style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.3 }}>Vecinos:</strong>{' '}
                      {ident.borders.slice(0, 12).join(' · ')}
                    </p>
                  )}
                  {(ident.languages.length > 0 || ident.currencies.length > 0) && (
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#475569' }}>
                      {ident.languages.length > 0 && <>Idiomas: {ident.languages.slice(0, 3).join(', ')} · </>}
                      {ident.currencies.length > 0 && <>Monedas: {ident.currencies.join(', ')}</>}
                    </p>
                  )}
                </Section>
              )}

              {/* GOBIERNO · Wikidata */}
              {gov && (
                <Section title="Gobierno y régimen · Wikidata" accent="#7c3aed">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gov.head_of_state && (
                      <Field label="Jefe de Estado"
                        value={gov.head_of_state + (gov.head_of_state_since ? ` (desde ${gov.head_of_state_since})` : '')} />
                    )}
                    {gov.head_of_government && (
                      <Field label="Jefe de Gobierno"
                        value={gov.head_of_government + (gov.head_of_government_since ? ` (desde ${gov.head_of_government_since})` : '')} />
                    )}
                    {gov.form_of_government && <Field label="Forma de gobierno" value={gov.form_of_government} />}
                    {gov.legal_system && <Field label="Sistema legal" value={gov.legal_system} />}
                    {gov.official_language && <Field label="Idioma oficial" value={gov.official_language} />}
                    {gov.state_religion && <Field label="Religión oficial" value={gov.state_religion} />}
                    {gov.national_motto && <Field label="Lema nacional" value={gov.national_motto} />}
                    {gov.independence_date && <Field label="Independencia" value={gov.independence_date} />}
                  </div>
                  {gov.international_orgs.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Organizaciones internacionales · {gov.international_orgs.length}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {gov.international_orgs.slice(0, 12).map((o) => (
                          <span key={o} style={{
                            background: '#faf5ff', color: '#7c3aed',
                            padding: '2px 6px', borderRadius: 999, fontSize: 9, fontWeight: 600,
                          }}>{o}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* ECONÓMICO · World Bank */}
              {econ && (
                <Section title={`Indicadores económicos · ${ecHealthLabel(econ.economic_health)}`} accent={ecHealthColor(econ.economic_health)}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                    <Chip label="PIB %" value={fmtPct(econ.gdp_growth_pct_latest)} />
                    <Chip label="Inflación %" value={fmtPct(econ.inflation_pct_latest)} />
                    <Chip label="Paro %" value={fmtPct(econ.unemployment_pct_latest)} />
                    <Chip label="CC % PIB" value={fmtPct(econ.current_account_pct_gdp_latest)} />
                    <Chip label="Deuda % PIB" value={fmtPct(econ.debt_pct_gdp_latest)} />
                    <Chip label="Reservas (m)" value={fmtNum(econ.reserves_months_imports_latest)} />
                  </div>
                  {econ.alerts.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 10, color: '#7f1d1d' }}>
                      {econ.alerts.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
                </Section>
              )}

              {/* CONFLICTO · UCDP estructural (si aplica) */}
              {conf && (
                <Section title={`Conflicto · ${conf.years_covered}`} accent="#94a3b8">
                  <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                    {conf.interpretation || '—'}
                  </p>
                  {conf.recent.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                      {conf.recent.slice(0, 3).map((r, i) => (
                        <li key={i}>
                          <strong>{r.name}</strong> · {r.side_a} vs {r.side_b} · {r.year}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}

              {/* SANCIONES · OpenSanctions live */}
              {sanc && sanc.total_count > 0 && (
                <Section title={`Sanciones · ${sanc.total_count} entidades`} accent="#f97316">
                  {Object.keys(sanc.by_program).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                      {Object.entries(sanc.by_program).slice(0, 8).map(([k, v]) => (
                        <span key={k} style={{
                          background: '#fff7ed', color: '#9a3412',
                          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                        }}>{k}: {v}</span>
                      ))}
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>{sanc._source.name}</p>
                </Section>
              )}

              {/* TRAVEL ADVISORY (si score >=3) */}
              {travel && travel.score >= 2 && (
                <Section title={`Travel Advisory · ${travel.band} (${travel.score.toFixed(1)}/5)`} accent="#0ea5e9">
                  <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                    {(travel.message || '').slice(0, 280)}
                  </p>
                </Section>
              )}

              {/* HUMANITARIO · ReliefWeb */}
              {human && human.n_reports > 0 && (
                <Section title={`Humanitario · ${human.n_reports} reports ReliefWeb`} accent="#16a34a">
                  <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>
                    Total disponible: {human.total_available} · OCHA registra actividad humanitaria reciente.
                  </p>
                </Section>
              )}

              {/* DESGLOSE IRC + DATOS RAW */}
              {irc && (
                <Section title="Desglose IRC · 4 componentes" accent="#0f172a">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Bar label="V-Dem riesgo (40%)" value={irc.components.vdem_risk} color="#7c3aed" />
                    <Bar label="SIPRI milex (15%)" value={irc.components.militarization} color="#dc2626" />
                    <Bar label="GDELT tono (30%)" value={irc.components.gdelt_tone} color="#0891b2" />
                    <Bar label="GDELT volumen (15%)" value={irc.components.gdelt_volume} color="#f59e0b" />
                  </div>
                </Section>
              )}

              {/* SEÑALES GDELT */}
              {signals.length > 0 && (
                <Section title={`Señales últimas 6h · ${signals.length}`} accent="#0891b2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {signals.slice(0, 5).map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '6px 8px', background: '#f8fafc', borderRadius: 4,
                        borderLeft: `3px solid ${s.type_color}`,
                        textDecoration: 'none', color: 'inherit',
                      }}>
                        <p style={{ margin: 0, fontSize: 9, color: s.type_color, fontWeight: 700, textTransform: 'uppercase' }}>
                          {s.type_label}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#0f172a', lineHeight: 1.3 }}>
                          {s.title}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{s.source_domain}</p>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* ENLACES EXTERNOS */}
              <Section title="Explorar más" accent="#475569">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <ExtLink href={`/geopolitica/pais/${iso3.toLowerCase()}`} label="Perfil completo →" internal />
                  <ExtLink href={`https://v-dem.net/data_analysis/CountryGraph/`} label="V-Dem Graph →" />
                  <ExtLink href={`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(countryName)}&format=html&timespan=7d`} label="GDELT 7d →" />
                  <ExtLink href={`https://reliefweb.int/country/${iso3.toLowerCase()}`} label="ReliefWeb →" />
                  <ExtLink href={`https://www.opensanctions.org/datasets/?countries=${(ident?.iso2 || '').toLowerCase()}`} label="OpenSanctions →" />
                </div>
              </Section>

              {profile?._meta && (
                <p style={{ margin: 0, fontSize: 8, color: '#cbd5e1', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                  Profile {profile.layers_count} capas · {profile._meta.latency_ms}ms
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: '10px 12px',
      background: '#fff', border: '1px solid #f1f5f9', borderLeft: `3px solid ${accent}`,
      borderRadius: 4,
    }}>
      <h3 style={{
        margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: accent,
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>{title}</h3>
      {children}
    </section>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '5px 8px', background: '#f8fafc', borderRadius: 3 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
      <span style={{ width: 130, color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: '#0f172a', fontSize: 11 }}>{value}</span>
    </div>
  )
}

function Bar({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
        <span>{label}</span>
        <span style={{ fontStyle: 'italic' }}>sin datos</span>
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{value}/100</span>
      </div>
      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

function ExtLink({ href, label, internal }: { href: string; label: string; internal?: boolean }) {
  return (
    <a
      href={href}
      target={internal ? undefined : '_blank'}
      rel={internal ? undefined : 'noopener noreferrer'}
      style={{
        padding: '5px 8px', background: '#fff', borderRadius: 4,
        border: '1px solid #e2e8f0', fontSize: 10, color: '#0891b2',
        textDecoration: 'none', fontWeight: 600,
      }}
    >{label}</a>
  )
}

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '' : ''}${v.toFixed(1)}%`
}
function fmtNum(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1)
}

function ircColor(irc: number): string {
  if (irc >= 75) return '#7f1d1d'
  if (irc >= 55) return '#dc2626'
  if (irc >= 35) return '#f59e0b'
  return '#16a34a'
}
function ecHealthLabel(h: string): string {
  return h === 'crisis' ? 'CRISIS' : h === 'tension' ? 'TENSIÓN' : h === 'estable' ? 'ESTABLE' : 'SIN DATOS'
}
function ecHealthColor(h: string): string {
  return h === 'crisis' ? '#dc2626' : h === 'tension' ? '#f59e0b' : h === 'estable' ? '#16a34a' : '#94a3b8'
}

export default GeoCountryDrawer
