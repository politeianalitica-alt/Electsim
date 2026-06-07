'use client'
/**
 * <PetroleoLogistics /> · Energía v3 · E6 (Petróleo profundo)
 *
 * Panel "Logística energética": consume el endpoint cross-source
 * `GET /api/energia/energy-logistics?days=30` (cruza el módulo Puertos con
 * Energía) y renderiza:
 *   - Chokepoints (Ormuz / Suez / Bab-el-Mandeb / Bósforo) con nivel de riesgo,
 *     % de tráfico, disrupciones típicas y por qué importan al crudo/GNL de ES.
 *   - Fletes · Baltic Dry Index (último + variación + tendencia) + subíndices
 *     tanker.
 *   - Conteo de buques energéticos (petroleros + metaneros del catálogo).
 *
 * HONESTIDAD (CLAUDE.md): el endpoint declara que el risk_score de chokepoints
 * es seed curado + heurístico (ACLED real requiere backend), el BDI es
 * determinista (sin yfinance) y los buques son del catálogo (no AIS en vivo).
 * Ese origen se muestra explícitamente en un aviso. Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'

const OIL = '#0F766E'

// Shape del endpoint (no se importan tipos de lib/ para mantener el componente
// autónomo; el contrato lo fija app/api/energia/energy-logistics).
interface Chokepoint {
  slug: string
  name: string
  region: string
  traffic_volume_pct: number | null
  risk_score: number | null
  risk_level: string | null
  n_events_30d: number | null
  typical_disruptions: string[]
  energia_nota: string
}
interface Freight {
  bdi: number | null
  change_pct: number | null
  trend: string
  name: string | null
  tanker_indices: Array<{ slug: string; name: string; last: number | null; change_pct: number | null }>
}
interface Tankers {
  tankers: number
  lng: number
  sample: Array<{ imo: string; name: string; type: string; subtype?: string; dwt?: number }>
  source_note: string
}
interface LogisticsResp {
  ok: boolean
  data: { chokepoints: Chokepoint[]; freight: Freight; tankers: Tankers } | null
  error?: string
  source?: string
  _meta?: { source?: string; source_label?: string; note?: string }
}

export function PetroleoLogistics() {
  const [resp, setResp] = useState<LogisticsResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const r = await fetch('/api/energia/energy-logistics?days=30', { cache: 'no-store' })
        const j = (await r.json()) as LogisticsResp
        if (alive) setResp(j)
      } catch {
        if (alive) setResp({ ok: false, data: null, error: 'fetch error' })
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando logística energética…</div>
  }
  if (!resp?.ok || !resp.data) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Logística energética no disponible ahora. El endpoint cruza el módulo de Puertos (chokepoints,
        Baltic Dry, buques) con Energía; si falla se muestra este estado honesto. {resp?.error ?? ''}
      </div>
    )
  }

  const { chokepoints, freight, tankers } = resp.data
  const sourceNote = resp._meta?.note ?? resp.source ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Aviso de procedencia (seed/heurístico) ─────────────────────────── */}
      <div
        style={{
          fontSize: 10, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A',
          borderRadius: 8, padding: '7px 10px', lineHeight: 1.45,
        }}
      >
        <strong>Origen de los datos:</strong> chokepoints con riesgo seed curado + boost heurístico
        (ACLED en vivo requiere backend); Baltic Dry determinista (sin yfinance); conteo de buques del
        catálogo de Puertos, no posiciones AIS en vivo.
      </div>

      {/* ── Chokepoints ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Corredores marítimos críticos (chokepoints)</SectionLabel>
        {chokepoints.length === 0 ? (
          <div style={{ fontSize: 11.5, color: '#86868b' }}>Sin chokepoints energéticos en la respuesta.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {chokepoints.map((c) => (
              <ChokepointCard key={c.slug} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* ── Fletes (BDI) + buques ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        {/* BDI */}
        <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px' }}>
          <SectionLabel>{freight.name ?? 'Baltic Dry Index'}</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-display)', color: freight.bdi != null ? OIL : '#C0C0C5', letterSpacing: '-0.02em' }}>
              {freight.bdi != null ? freight.bdi.toLocaleString('es-ES', { maximumFractionDigits: 0 }) : '—'}
            </span>
            {freight.change_pct != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: freight.change_pct >= 0 ? '#16A34A' : '#DC2626' }}>
                {freight.change_pct >= 0 ? '⇡' : '⇣'} {Math.abs(freight.change_pct).toFixed(1)}%
              </span>
            )}
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {trendLabel(freight.trend)}
            </span>
          </div>
          {freight.tanker_indices.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {freight.tanker_indices.map((t) => (
                <li key={t.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#3a3a3d' }}>{t.name}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f' }}>
                    {t.last != null ? t.last.toLocaleString('es-ES', { maximumFractionDigits: 0 }) : '—'}
                    {t.change_pct != null && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: t.change_pct >= 0 ? '#16A34A' : '#DC2626' }}>
                        {t.change_pct >= 0 ? '+' : ''}{t.change_pct.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.45 }}>
            El Baltic Dry Index mide el coste de fletar graneleros secos; es un proxy de la actividad
            del comercio marítimo y, junto a los índices tanker (crudo/refinados), un termómetro del
            coste de transportar la energía que importa España.
          </p>
        </div>

        {/* Buques */}
        <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px' }}>
          <SectionLabel>Buques energéticos (catálogo)</SectionLabel>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <CountBox label="Petroleros" value={tankers.tankers} />
            <CountBox label="Metaneros (GNL)" value={tankers.lng} />
          </div>
          {tankers.sample.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {tankers.sample.slice(0, 5).map((v, i) => (
                <li key={v.imo || i} style={{ fontSize: 10.5, color: '#3a3a3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#86868b' }}>{v.type}{v.subtype ? ` · ${v.subtype}` : ''}</span> — {v.name || v.imo}
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 9.5, color: '#A0A0A5', lineHeight: 1.45 }}>
            {tankers.source_note}
          </p>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 9.5, color: '#A0A0A5', lineHeight: 1.45 }} title={sourceNote}>
        Fuente: {resp._meta?.source_label ?? 'Puertos (standalone) · chokepoints + Baltic Dry + buques'}.
      </p>
    </div>
  )
}

export default PetroleoLogistics

// ─── Sub-piezas ──────────────────────────────────────────────────────────────
function ChokepointCard({ c }: { c: Chokepoint }) {
  const rc = riskColors(c.risk_level)
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{c.name}</div>
          {c.region && <div style={{ fontSize: 9.5, color: '#86868b' }}>{c.region}</div>}
        </div>
        <span
          style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
            color: rc.fg, background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
          }}
        >
          {riskLabel(c.risk_level)}{c.risk_score != null ? ` · ${Math.round(c.risk_score)}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#6e6e73' }}>
        {c.traffic_volume_pct != null && <span>Tráfico mundial ~{c.traffic_volume_pct}%</span>}
        {c.n_events_30d != null && <span>{c.n_events_30d} eventos/30d</span>}
      </div>

      {c.energia_nota && (
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.45 }}>{c.energia_nota}</p>
      )}

      {c.typical_disruptions.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
          {c.typical_disruptions.slice(0, 4).map((d) => (
            <span key={d} style={{ fontSize: 9, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '2px 7px' }}>{d}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function CountBox({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: OIL, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  )
}

// ─── Mapeos de presentación ──────────────────────────────────────────────────
function riskColors(level: string | null): { fg: string; bg: string; border: string } {
  switch ((level ?? '').toLowerCase()) {
    case 'critico':
      return { fg: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' }
    case 'alto':
      return { fg: '#9A3412', bg: '#FFEDD5', border: '#FDBA74' }
    case 'medio':
      return { fg: '#854D0E', bg: '#FEF3C7', border: '#FDE68A' }
    case 'bajo':
      return { fg: '#166534', bg: '#DCFCE7', border: '#86EFAC' }
    case 'minimo':
      return { fg: '#3F6212', bg: '#ECFCCB', border: '#BEF264' }
    default:
      return { fg: '#3a3a3d', bg: '#F5F5F7', border: '#E5E7EB' }
  }
}
function riskLabel(level: string | null): string {
  const m: Record<string, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', minimo: 'Mínimo' }
  return m[(level ?? '').toLowerCase()] ?? (level ?? 'n/d')
}
function trendLabel(trend: string): string {
  const m: Record<string, string> = {
    fuerte_subida: '↑↑ fuerte subida',
    subida: '↑ subida',
    estable: '→ estable',
    bajada: '↓ bajada',
    fuerte_bajada: '↓↓ fuerte bajada',
  }
  return m[trend] ?? trend
}
