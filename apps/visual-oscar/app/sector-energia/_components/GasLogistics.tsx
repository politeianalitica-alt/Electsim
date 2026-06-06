'use client'
/**
 * <GasLogistics /> · Energía v3 · E7 (Gas profundo)
 *
 * Logística marítima del gas, enfocada al GNL. Consume el endpoint compartido
 * `GET /api/energia/energy-logistics?days=30` (cruce Puertos↔Energía) y de su
 * payload extrae el ángulo GAS:
 *   - conteo de METANEROS (buques LNG) del catálogo de Puertos + muestra;
 *   - termómetro de fletes (Baltic Dry Index + subíndices tanker) como proxy
 *     del coste de transporte marítimo;
 *   - los corredores marítimos (chokepoints) relevantes para el GNL que importa
 *     España (Ormuz · Qatar, Suez/Bab-el-Mandeb · ruta Asia-Europa).
 *
 * Es el MISMO endpoint que usará/usa PetroleoView (E6), pero aquí el enfoque es
 * el GNL: se prioriza el conteo de metaneros y los corredores del gas, no los
 * petroleros. La nota declara que el conteo es de catálogo (no AIS en vivo) y
 * que el risk_score/BDI son seed/heurísticos. Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'

const GAS = '#1D4ED8'
const GAS_DARK = '#1E3A8A'

// ─── Tipos (espejo del endpoint · NO se importan de types.ts) ────────────────
interface Chokepoint {
  slug: string
  name: string
  region: string
  risk_score: number | null
  risk_level: string | null
  typical_disruptions: string[]
  energia_nota: string
}
interface TankerIndex {
  slug: string
  name: string
  last: number | null
  change_pct: number | null
}
interface Freight {
  bdi: number | null
  change_pct: number | null
  trend: string
  name: string | null
  tanker_indices: TankerIndex[]
}
interface VesselSample {
  imo: string
  name: string
  type: string
  subtype?: string
  dwt?: number
}
interface Tankers {
  tankers: number
  lng: number
  sample: VesselSample[]
  source_note: string
}
interface LogisticsData {
  chokepoints: Chokepoint[]
  freight: Freight
  tankers: Tankers
}
interface LogisticsResponse {
  ok: boolean
  data: LogisticsData | null
  error?: string
  source?: string
}

const TREND_LABEL: Record<string, { txt: string; color: string; arrow: string }> = {
  fuerte_subida: { txt: 'fuerte subida', color: '#DC2626', arrow: '⇡' },
  subida: { txt: 'subida', color: '#D97706', arrow: '⇡' },
  estable: { txt: 'estable', color: '#6e6e73', arrow: '→' },
  bajada: { txt: 'bajada', color: '#16A34A', arrow: '⇣' },
  fuerte_bajada: { txt: 'fuerte bajada', color: '#16A34A', arrow: '⇣' },
}

export function GasLogistics() {
  const [data, setData] = useState<LogisticsData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const res = (await fetch('/api/energia/energy-logistics?days=30', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as LogisticsResponse | null
      if (!alive) return
      setData(res?.ok ? res.data : null)
      setErr(res?.ok ? null : res?.error ?? 'sin datos')
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando logística marítima del gas…</div>
  }
  if (!data) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Logística marítima no disponible ahora{err ? ` (${err.split('·')[0].trim()})` : ''}. Cruza el
        módulo de Puertos con Energía (conteo de buques, fletes, corredores). Se reintenta
        automáticamente.
      </div>
    )
  }

  const trend = TREND_LABEL[data.freight.trend] ?? TREND_LABEL.estable
  const lngSample = data.tankers.sample.filter((v) => v.type === 'lng' || (v.subtype ?? '').toLowerCase().includes('lng'))
  const gasChokes = data.chokepoints.slice(0, 4)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {/* Metaneros (LNG) · el foco gas */}
        <StatCard
          big={data.tankers.lng}
          label="Metaneros (LNG) en catálogo"
          accent={GAS}
          foot={`${data.tankers.tankers} petroleros · referencia`}
        />
        {/* Baltic Dry */}
        <StatCard
          big={data.freight.bdi ?? '—'}
          label={data.freight.name ?? 'Baltic Dry Index'}
          accent={GAS_DARK}
          foot={
            data.freight.change_pct != null
              ? `${trend.arrow} ${Math.abs(data.freight.change_pct).toFixed(1)}% · ${trend.txt}`
              : trend.txt
          }
          footColor={trend.color}
        />
        {/* Corredores energéticos */}
        <StatCard
          big={gasChokes.length}
          label="Corredores marítimos del gas"
          accent="#7C3AED"
          foot="Ormuz · Suez · Mar Rojo · Bósforo"
        />
      </div>

      {/* Subíndices tanker (proxy de coste de transporte de líquidos/GNL) */}
      {data.freight.tanker_indices.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SubLabel>Subíndices de flete (tanker)</SubLabel>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {data.freight.tanker_indices.map((t) => (
              <div key={t.slug} style={{ fontSize: 11 }}>
                <span style={{ color: '#6e6e73' }}>{t.name}: </span>
                <strong style={{ fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
                  {t.last != null ? t.last.toLocaleString('es-ES', { maximumFractionDigits: 0 }) : '—'}
                </strong>
                {t.change_pct != null && (
                  <span style={{ marginLeft: 5, fontWeight: 700, color: t.change_pct >= 0 ? '#DC2626' : '#16A34A' }}>
                    {t.change_pct >= 0 ? '⇡' : '⇣'} {Math.abs(t.change_pct).toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Corredores del gas */}
        <div>
          <SubLabel>Corredores relevantes para el GNL</SubLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gasChokes.map((c) => (
              <ChokeRow key={c.slug} c={c} />
            ))}
          </ul>
        </div>

        {/* Muestra de metaneros */}
        <div>
          <SubLabel>Metaneros en catálogo (muestra)</SubLabel>
          {lngSample.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {lngSample.slice(0, 6).map((v) => (
                <li
                  key={v.imo || v.name}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '6px 10px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 8 }}
                >
                  <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{v.name || v.imo || 'metanero'}</span>
                  <span style={{ color: '#86868b' }}>
                    {v.subtype ? v.subtype : 'LNG'}
                    {v.dwt ? ` · ${v.dwt.toLocaleString('es-ES')} DWT` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 11, color: '#86868b' }}>
              {data.tankers.lng} metaneros contabilizados; sin muestra individual disponible en este corte.
            </div>
          )}
        </div>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {data.tankers.source_note} El Baltic Dry Index y el risk_score de los corredores son
        seed/heurísticos (sin yfinance/ACLED en vivo en este entorno), según declara la fuente. Los
        corredores son los pasos por los que transita el GNL que importa España: su tensión
        (indisponibilidades, ataques, congestión) encarece el flete y la prima de suministro.
      </p>
    </div>
  )
}

export default GasLogistics

function StatCard({
  big,
  label,
  accent,
  foot,
  footColor,
}: {
  big: number | string
  label: string
  accent: string
  foot?: string
  footColor?: string
}) {
  return (
    <div style={{ border: '1px solid #ECECEF', borderRadius: 12, padding: '13px 15px', background: '#FAFAFA' }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {typeof big === 'number' ? big.toLocaleString('es-ES') : big}
      </div>
      <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600, marginTop: 4 }}>{label}</div>
      {foot && <div style={{ fontSize: 9.5, color: footColor ?? '#A0A0A5', marginTop: 2, fontWeight: footColor ? 700 : 400 }}>{foot}</div>}
    </div>
  )
}

function ChokeRow({ c }: { c: Chokepoint }) {
  const lvl = (c.risk_level ?? '').toLowerCase()
  const lvlColor =
    lvl === 'critico' ? '#DC2626' : lvl === 'alto' ? '#EA580C' : lvl === 'medio' ? '#D97706' : '#16A34A'
  return (
    <li style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '9px 11px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{c.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.risk_score != null && (
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', color: lvlColor }}>{c.risk_score}</span>
          )}
          {c.risk_level && (
            <span style={{ fontSize: 8, fontWeight: 800, color: lvlColor, background: `${lvlColor}14`, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {c.risk_level}
            </span>
          )}
        </span>
      </div>
      {c.energia_nota && (
        <p style={{ margin: '4px 0 0', fontSize: 9.5, color: '#86868b', lineHeight: 1.45 }}>{c.energia_nota}</p>
      )}
    </li>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
      {children}
    </div>
  )
}
