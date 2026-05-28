'use client'
/**
 * <GeoCountryDrawer /> · Sprint GEO-RADAR C2
 *
 * Drawer lateral con detalle del país seleccionado en el mapa:
 *   - IRC actual + desglose por componente (V-Dem / SIPRI / GDELT tono / volumen)
 *   - Trend V-Dem 5 años
 *   - Top señales GDELT del país (filtradas del feed global)
 *   - Enlaces externos a V-Dem y GDELT para drill-down
 *
 * Sin libs · controlled component · cerrar con backdrop o ESC.
 */
import { useEffect, useState } from 'react'

interface CountryIRC {
  iso3: string; name_es: string; iso2: string
  irc: number; risk_level: string
  components: { vdem_risk: number | null; militarization: number | null; gdelt_tone: number | null; gdelt_volume: number | null }
  raw: { polyarchy: number | null; polyarchy_trend?: string; milex_pct_gdp: number | null; milex_usd_bn: number | null; gdelt_tone_value?: number; gdelt_articles_48h?: number }
}
interface Signal {
  type: string; type_label: string; type_color: string
  iso3: string | null; country_name: string | null
  title: string; source_domain: string; url: string; datetime: string; tone: number
}
interface Props {
  iso3: string | null
  onClose: () => void
}

export function GeoCountryDrawer({ iso3, onClose }: Props) {
  const [country, setCountry] = useState<CountryIRC | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!iso3) return
    let alive = true
    setLoading(true)
    Promise.all([
      fetch('/api/geopolitica/irc').then((r) => r.json()),
      fetch('/api/geopolitica/senales').then((r) => r.json()),
    ])
      .then(([irc, sen]) => {
        if (!alive) return
        const c = irc.countries?.find((x: CountryIRC) => x.iso3 === iso3) || null
        setCountry(c)
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
          zIndex: 1000, animation: 'fadeIn 0.15s ease-out',
        }}
      />
      {/* Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 95vw)', background: '#fff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.15)',
        zIndex: 1001, overflowY: 'auto',
        animation: 'slideIn 0.2s ease-out',
      }}>
        <header style={{
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {country?.name_es || iso3} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>· {iso3}</span>
            </h2>
            {country && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                IRC <strong style={{ color: ircColor(country.irc), fontFamily: 'ui-monospace, monospace' }}>{country.irc}</strong>
                {' '} · {country.risk_level.toUpperCase()}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, color: '#64748b',
            cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>×</button>
        </header>

        <div style={{ padding: '16px 20px' }}>
          {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando datos país…</p>}

          {!loading && !country && (
            <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              País no incluido en el catálogo IRC (80 países cubiertos).
            </p>
          )}

          {!loading && country && (
            <>
              {/* Desglose IRC */}
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Desglose IRC
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ComponentBar label="V-Dem · riesgo autocrático (40%)" value={country.components.vdem_risk} accent="#7c3aed" />
                  <ComponentBar label="SIPRI · militarización (15%)" value={country.components.militarization} accent="#dc2626" />
                  <ComponentBar label="GDELT · tono mediático (30%)" value={country.components.gdelt_tone} accent="#0891b2" />
                  <ComponentBar label="GDELT · volumen conflictos (15%)" value={country.components.gdelt_volume} accent="#f59e0b" />
                </div>
              </section>

              {/* Datos brutos */}
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Datos verificables
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {country.raw.polyarchy !== null && (
                    <DataChip
                      label="V-Dem 2023"
                      value={country.raw.polyarchy.toFixed(2)}
                      sub={trendLabel(country.raw.polyarchy_trend)}
                    />
                  )}
                  {country.raw.milex_pct_gdp !== null && (
                    <DataChip
                      label="Milex % PIB"
                      value={`${country.raw.milex_pct_gdp}%`}
                      sub={country.raw.milex_usd_bn ? `${country.raw.milex_usd_bn} bn USD` : undefined}
                    />
                  )}
                  {country.raw.gdelt_tone_value !== undefined && (
                    <DataChip
                      label="Tono GDELT 48h"
                      value={country.raw.gdelt_tone_value.toFixed(2)}
                      sub="-10 muy negativo · +10 positivo"
                    />
                  )}
                  {country.raw.gdelt_articles_48h !== undefined && (
                    <DataChip
                      label="Arts. WAR_CONFLICT 48h"
                      value={String(country.raw.gdelt_articles_48h)}
                      sub="cobertura conflicto"
                    />
                  )}
                </div>
              </section>

              {/* Señales recientes */}
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Señales últimas 6h ({signals.length})
                </h3>
                {signals.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                    Sin señales registradas en GDELT para este país en la ventana actual.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {signals.slice(0, 8).map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '8px 10px', background: '#f8fafc', borderRadius: 6,
                        borderLeft: `3px solid ${s.type_color}`, border: '1px solid #f1f5f9',
                        textDecoration: 'none', color: 'inherit',
                      }}>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: s.type_color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {s.type_label}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0f172a', lineHeight: 1.3 }}>
                          {s.title}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
                          {s.source_domain}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Enlaces externos */}
              <section>
                <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Explorar más
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ExtLink href={`https://v-dem.net/data_analysis/CountryGraph/`} label="V-Dem Country Graph →" />
                  <ExtLink href={`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(country.name_es)}&format=html&timespan=7d`} label="GDELT últimas 7d →" />
                  <ExtLink href={`https://reliefweb.int/country/${iso3.toLowerCase()}`} label="ReliefWeb humanitario →" />
                  <ExtLink href={`/geopolitica/pais/${iso3.toLowerCase()}`} label="Perfil completo →" internal />
                </div>
              </section>
            </>
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

function ComponentBar({ label, value, accent }: { label: string; value: number | null; accent: string }) {
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
        <div style={{ width: `${value}%`, height: '100%', background: accent }} />
      </div>
    </div>
  )
}

function DataChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
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
        padding: '6px 10px', background: '#fff', borderRadius: 6,
        border: '1px solid #e2e8f0', fontSize: 10, color: '#0891b2',
        textDecoration: 'none', fontWeight: 600,
      }}
    >
      {label}
    </a>
  )
}

function trendLabel(trend?: string): string | undefined {
  return trend ? ({
    mejora: '↑ Mejora 5y',
    estable: '→ Estable 5y',
    regresion: '↓ Regresión 5y',
    regresion_severa: '⇣ Regresión severa 5y',
  } as any)[trend] : undefined
}

function ircColor(irc: number): string {
  if (irc >= 75) return '#7f1d1d'
  if (irc >= 55) return '#dc2626'
  if (irc >= 35) return '#f59e0b'
  return '#16a34a'
}

export default GeoCountryDrawer
