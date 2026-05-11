'use client'
import { useState, useMemo } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ── helpers ───────────────────────────────────────────────────────────────────
function relTime(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'ahora'
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `hace ${h}h`
    const d = Math.floor(h / 24)
    return `hace ${d}d`
  } catch { return iso?.slice(0, 10) ?? '—' }
}

function riskColor(r: number) {
  if (r >= 70) return '#dc2626'
  if (r >= 50) return '#f59e0b'
  if (r >= 30) return '#3b82f6'
  return '#22c55e'
}
function riskLabel(r: number) {
  if (r >= 70) return 'CRITICO'
  if (r >= 50) return 'ELEVADO'
  if (r >= 30) return 'MODERADO'
  return 'BAJO'
}
function sentColor(s: number) {
  if (s < -0.4) return '#dc2626'
  if (s < -0.1) return '#f59e0b'
  if (s > 0.1)  return '#22c55e'
  return '#64748b'
}
function nivelColor(n: string) {
  if (n === 'CRITICO') return '#dc2626'
  if (n === 'ALTO')    return '#f59e0b'
  if (n === 'MEDIO')   return '#3b82f6'
  return '#22c55e'
}

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.05)',
}
const CARD_INNER: React.CSSProperties = { padding: '20px 24px' }
const INK1 = '#0f172a'
const INK3 = '#64748b'
const INK4 = '#94a3b8'

// ── world map constants (equirectangular 900×440) ─────────────────────────────
const COUNTRY_COORDS: Record<string, [number, number]> = {
  RU: [98, 62], UA: [55, 72], IL: [51, 110], PS: [51, 112],
  IR: [60, 108], CN: [102, 95], US: [220, 95], MA: [30, 108],
  DZ: [32, 105], TR: [52, 95], VE: [260, 143], KP: [118, 78],
  SY: [53, 100], LB: [52, 103], ML: [27, 118], IQ: [55, 103],
  AF: [70, 98],  SA: [56, 112], TW: [115, 103], FR: [34, 78],
  DE: [36, 72],  GB: [30, 72],  MX: [200, 113], MM: [100, 107],
}
function projX(lon: number) { return ((lon + 180) / 360) * 900 }
function projY(lat: number) { return ((90 - lat) / 180) * 440 }

// Simple continent fills (outline only for performance)
const CONTINENT_PATHS = [
  // North America
  'M188 166 L165 170 L150 168 L140 158 L138 148 L135 138 L133 128 L135 119 L131 108 L128 102 L125 89 L115 80 L100 75 L88 69 L68 63 L48 58 L38 56 L30 46 L33 42 L50 40 L63 42 L88 51 L113 51 L150 46 L175 43 L200 43 L213 46 L225 48 L238 51 L250 58 L263 64 L273 75 L280 87 L283 96 L285 108 L288 119 L283 124 L278 128 L268 141 L258 158 L250 166 L233 168 L213 165 L200 174 L192 168 L188 166 Z',
  // South America
  'M253 210 L263 207 L273 205 L285 203 L295 202 L308 202 L318 206 L325 210 L330 217 L335 224 L343 232 L350 242 L358 255 L362 265 L360 278 L355 290 L348 305 L338 320 L328 338 L318 355 L310 371 L305 381 L300 384 L293 378 L288 370 L278 340 L268 300 L263 265 L258 235 L253 214 L253 210 Z',
  // Europe
  'M428 134 L428 124 L430 119 L436 116 L440 117 L450 117 L458 119 L462 116 L465 115 L470 117 L476 117 L480 114 L483 113 L486 109 L488 108 L492 108 L495 108 L498 103 L500 99 L502 93 L505 87 L508 81 L510 78 L512 71 L513 68 L511 61 L510 57 L500 52 L498 51 L492 52 L490 56 L486 57 L480 56 L475 57 L470 63 L465 71 L463 80 L464 86 L465 90 L470 91 L466 93 L461 95 L458 98 L455 99 L452 102 L448 105 L445 106 L441 109 L440 110 L438 112 L440 114 L442 116 L436 123 L431 129 L428 134 Z',
  // Africa
  'M435 138 L450 135 L458 135 L470 135 L476 133 L483 133 L488 138 L500 141 L513 141 L525 146 L533 146 L538 153 L541 163 L545 172 L550 192 L558 199 L575 204 L580 211 L573 224 L563 236 L555 243 L548 258 L543 265 L540 273 L538 281 L533 293 L530 301 L524 311 L518 319 L507 321 L500 320 L493 319 L483 308 L473 290 L468 281 L463 256 L463 235 L461 228 L455 220 L443 218 L428 216 L420 212 L408 196 L408 179 L413 164 L416 158 L424 150 L428 148 L432 143 L435 138 Z',
  // Asia
  'M515 125 L520 122 L527 120 L535 118 L545 117 L558 118 L568 118 L575 122 L583 119 L590 116 L602 112 L615 107 L628 103 L640 98 L653 95 L665 91 L678 88 L692 85 L706 80 L720 75 L733 70 L745 67 L755 65 L765 64 L778 65 L790 68 L800 73 L808 80 L812 88 L808 95 L800 100 L790 105 L778 110 L765 113 L752 118 L745 125 L743 132 L745 140 L750 148 L758 156 L763 163 L765 182 L758 200 L750 206 L730 218 L720 220 L700 225 L695 230 L688 228 L670 216 L650 218 L643 216 L638 213 L645 228 L638 270 L618 232 L600 215 L578 207 L563 220 L553 215 L548 202 L545 188 L543 175 L538 158 L527 148 L522 140 L515 125 Z',
  // Australia
  'M730 232 L743 225 L755 220 L770 218 L783 216 L796 216 L810 218 L820 220 L830 222 L838 228 L840 238 L838 248 L833 258 L825 268 L815 276 L795 278 L773 278 L744 274 L733 250 L730 240 L730 232 Z',
]

// ── types ─────────────────────────────────────────────────────────────────────
interface RiesgoItem {
  code: string; name: string; risk: number; status: string
  delta_7d: number; n_articles_30d: number; avg_sentiment: number
  n_negative: number; structural_risk: number; has_data: boolean
}
interface EventItem {
  date: string | null; country: string; type: string
  title: string; description: string; source?: string | null
  impact: number; spain_impact?: string | null; url?: string | null
}
interface KpiData {
  eventos_criticos_hoy: number
  articulos_internacionales_7d: number
  paises_escalada_7d: number
  conflictos_activos: number
  fuentes_internacionales: number
  impacto_espana_alto_7d: number
  alertas_activas: number
  paises_monitorizados: number
  presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
  trend_delta: number
  updated_at: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string
  paises: string[]; descripcion_corta: string; fuente: string
  confianza_sistema?: number
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string
  urgencia: number; categoria: string; resumen: string
  relevancia_espana: number
}
interface PresenciaItem {
  id: string; pais: string; iso3: string; lat: number; lon: number
  categoria: string; titulo: string; descripcion: string
  valor: number; unidad: string; score_relevancia: number
  n_articulos_30d: number; last_updated: string
}
interface PresenciaKpis {
  efectivos: number; diaspora: number; inversion_mill_eur: number
  embajadas: number; fuentes_energia: number
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 5, background: 'rgba(0,0,0,0.04)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', marginBottom: 24, overflowX: 'auto' }}>
      {items.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} style={{
          border: active === i ? '1px solid rgba(14,165,233,0.22)' : '1px solid transparent',
          background: active === i ? 'rgba(14,165,233,0.10)' : 'transparent',
          color: active === i ? INK1 : INK3,
          borderRadius: 8, padding: '7px 16px',
          fontSize: 11, fontWeight: active === i ? 700 : 500,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>{t}</button>
      ))}
    </div>
  )
}

// ── KPI Strip ────────────────────────────────────────────────────────────────
function KpiStrip({ kpis }: { kpis: KpiData | null }) {
  const items = [
    { label: 'Noticias int. 7d',    value: kpis?.articulos_internacionales_7d ?? '—', accent: '#0ea5e9' },
    { label: 'Alertas activas',     value: kpis?.alertas_activas ?? '—', accent: '#dc2626' },
    { label: 'Países monitorizados',value: kpis?.paises_monitorizados ?? '—', accent: '#6366f1' },
    { label: 'Conflictos activos',  value: kpis?.conflictos_activos ?? '—', accent: '#f59e0b' },
    { label: 'Impacto alto 7d',     value: kpis?.impacto_espana_alto_7d ?? '—', accent: '#ef4444' },
    { label: 'Presencia exterior',  value: kpis?.presencia_activa ?? '—', accent: '#22c55e' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(({ label, value, accent }) => (
        <div key={label} style={{ ...CARD, ...CARD_INNER, padding: '14px 18px' }}>
          <div style={{ fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: accent, letterSpacing: '-0.03em', fontFamily: 'var(--font-display, inherit)' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── World Map with risk bubbles ────────────────────────────────────────────────
function WorldMap({ riesgo }: { riesgo: RiesgoItem[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: RiesgoItem } | null>(null)
  const riesgoByCode = useMemo(() => {
    const m: Record<string, RiesgoItem> = {}
    riesgo.forEach(r => { m[r.code] = r })
    return m
  }, [riesgo])

  return (
    <div style={{ ...CARD, overflow: 'hidden', position: 'relative' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Mapa de riesgo global</span>
        <span style={{ marginLeft: 12, fontSize: 11, color: INK3 }}>Intensidad desde noticias_prensa últimos 30 días</span>
      </div>
      <svg
        viewBox="0 0 900 440"
        style={{ width: '100%', background: '#f0f4f8', display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Ocean gradient */}
        <defs>
          <radialGradient id="oceanG" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={900} height={440} fill="url(#oceanG)" />

        {/* Continent fills */}
        {CONTINENT_PATHS.map((d, i) => (
          <path key={i} d={d} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
        ))}

        {/* Spain marker */}
        <circle cx={projX(-3.7)} cy={projY(40.4)} r={6}
          fill="#1F4E8C" stroke="white" strokeWidth={1.5}
          style={{ filter: 'drop-shadow(0 1px 3px rgba(31,78,140,0.5))' }} />
        <text x={projX(-3.7)} y={projY(40.4) - 10}
          textAnchor="middle" fill="#1F4E8C" fontSize={8} fontWeight={700}>ESP</text>

        {/* Country risk bubbles */}
        {Object.entries(COUNTRY_COORDS).map(([code, [x, y]]) => {
          const item = riesgoByCode[code]
          if (!item) return null
          const r = Math.max(5, Math.min(22, item.risk / 5))
          const col = riskColor(item.risk)
          return (
            <g key={code}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, item })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={r + 4}
                fill={col} opacity={0.12} />
              <circle cx={x} cy={y} r={r}
                fill={col} stroke="white" strokeWidth={1}
                opacity={item.has_data ? 0.85 : 0.45}
                style={{ filter: `drop-shadow(0 1px 2px ${col}60)` }} />
              {r >= 10 && (
                <text x={x} y={y + 3.5} textAnchor="middle"
                  fill="white" fontSize={7} fontWeight={800}>{code}</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 20, alignItems: 'center' }}>
        {[['#dc2626','CRITICO ≥70'],['#f59e0b','ELEVADO 50-69'],['#3b82f6','MODERADO 30-49'],['#22c55e','BAJO <30']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c as string }} />
            <span style={{ fontSize: 10, color: INK3 }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: INK4, marginLeft: 'auto' }}>Tamaño ∝ riesgo compuesto · Opacidad ∝ cobertura</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 10, zIndex: 9999,
          background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
          padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          pointerEvents: 'none', minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: INK1, marginBottom: 4 }}>{tooltip.item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: riskColor(tooltip.item.risk) }}>{tooltip.item.risk}</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: riskColor(tooltip.item.risk), textTransform: 'uppercase', letterSpacing: '0.08em' }}>{riskLabel(tooltip.item.risk)}</div>
              <div style={{ fontSize: 10, color: INK3 }}>{tooltip.item.status}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: INK3 }}>{tooltip.item.n_articles_30d} artículos · 30d</div>
          <div style={{ fontSize: 10, color: INK3 }}>Sent: <span style={{ color: sentColor(tooltip.item.avg_sentiment) }}>{tooltip.item.avg_sentiment.toFixed(2)}</span></div>
          {!tooltip.item.has_data && <div style={{ fontSize: 9, color: INK4, marginTop: 4 }}>Sin datos recientes · riesgo estructural</div>}
        </div>
      )}
    </div>
  )
}

// ── Country Risk Table ─────────────────────────────────────────────────────────
function RiesgoTable({ riesgo }: { riesgo: RiesgoItem[] }) {
  return (
    <div style={{ ...CARD, ...CARD_INNER }}>
      <div style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Índice de riesgo por país</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {riesgo.map((item, i) => (
          <div key={item.code} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 80px 60px 60px',
            gap: 8, alignItems: 'center',
            padding: '9px 0',
            borderBottom: i < riesgo.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <span style={{ fontSize: 10, color: INK4, fontWeight: 600 }}>{i + 1}</span>
            <div>
              <span style={{ fontWeight: 600, fontSize: 12, color: INK1 }}>{item.name}</span>
              {!item.has_data && <span style={{ marginLeft: 6, fontSize: 9, color: INK4 }}>est.</span>}
            </div>
            {/* Risk bar */}
            <div style={{ position: 'relative', height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${item.risk}%`, background: riskColor(item.risk), borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(item.risk), textAlign: 'right' }}>{item.risk}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: riskColor(item.risk), textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>
              {riskLabel(item.risk)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Events Feed ───────────────────────────────────────────────────────────────
function EventsFeed({ events, loading }: { events: EventItem[]; loading: boolean }) {
  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando eventos…</div>
  if (!events.length) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Sin eventos recientes.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((ev, i) => {
        const impact = ev.spain_impact || ''
        const impactColor = impact === 'critico' || impact === 'alto' ? '#dc2626' : impact === 'medio' ? '#f59e0b' : '#22c55e'
        return (
          <div key={i} style={{ ...CARD, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Impact dot */}
            <div style={{ flexShrink: 0, marginTop: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: impactColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK1, lineHeight: 1.4, marginBottom: 4 }}>
                {ev.url ? (
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: INK1, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1F4E8C')}
                    onMouseLeave={e => (e.currentTarget.style.color = INK1)}>
                    {ev.title}
                  </a>
                ) : ev.title}
              </div>
              {ev.description !== ev.title && (
                <div style={{ fontSize: 11.5, color: INK3, lineHeight: 1.5, marginBottom: 6 }}>{ev.description?.slice(0, 180)}{(ev.description?.length ?? 0) > 180 ? '…' : ''}</div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: INK4 }}>{relTime(ev.date)}</span>
                {ev.country && <span style={{ fontSize: 10, color: INK3, fontWeight: 600 }}>{ev.country}</span>}
                {ev.source && <span style={{ fontSize: 10, color: INK4 }}>{ev.source}</span>}
                {ev.type && (
                  <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', color: INK3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ev.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Alertas Panel ─────────────────────────────────────────────────────────────
function AlertasPanel({ alertas, loading }: { alertas: AlertaItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const filtered = filter ? alertas.filter(a => a.nivel === filter) : alertas

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando alertas…</div>

  const counts = { CRITICO: alertas.filter(a => a.nivel === 'CRITICO').length, ALTO: alertas.filter(a => a.nivel === 'ALTO').length, MEDIO: alertas.filter(a => a.nivel === 'MEDIO').length }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[null, 'CRITICO', 'ALTO', 'MEDIO'].map(nivel => (
          <button key={nivel ?? 'all'} onClick={() => setFilter(nivel)} style={{
            border: '1px solid', borderColor: nivel ? nivelColor(nivel) : 'rgba(0,0,0,0.15)',
            background: filter === nivel ? (nivel ? nivelColor(nivel) : '#f1f5f9') : 'white',
            color: filter === nivel && nivel ? 'white' : nivel ? nivelColor(nivel) : INK3,
            borderRadius: 8, padding: '5px 12px', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em',
            transition: 'all 150ms',
          }}>
            {nivel ?? 'Todas'} {nivel ? `(${counts[nivel as keyof typeof counts] ?? 0})` : `(${alertas.length})`}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>
          Sin alertas{filter ? ` de nivel ${filter}` : ''} en los últimos 14 días.
        </div>
      )}

      {filtered.map((a, i) => (
        <div key={a.id} style={{ ...CARD, padding: '16px 20px', borderLeft: `3px solid ${nivelColor(a.nivel)}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: nivelColor(a.nivel), textTransform: 'uppercase', letterSpacing: '0.09em' }}>{a.nivel}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK1, marginTop: 2, lineHeight: 1.4 }}>{a.titulo}</div>
            </div>
            <span style={{ fontSize: 10, color: INK4, flexShrink: 0 }}>{relTime(a.fecha)}</span>
          </div>
          <div style={{ fontSize: 12, color: INK3, lineHeight: 1.5, marginBottom: 8 }}>{a.descripcion_corta}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {a.paises?.map((p: string) => (
              <span key={p} style={{ fontSize: 10, background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 7px', color: INK3, fontWeight: 600 }}>{p}</span>
            ))}
            {a.fuente && <span style={{ fontSize: 10, color: INK4 }}>{a.fuente}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Presencia Exterior ─────────────────────────────────────────────────────────
function PresenciaExterior({ presencia, kpis, loading }: { presencia: PresenciaItem[]; kpis: PresenciaKpis | null; loading: boolean }) {
  const CAT_COLORS: Record<string, string> = {
    militar: '#dc2626', energetica: '#f59e0b', empresarial: '#3b82f6',
    diplomatica: '#6366f1', diaspora: '#22c55e',
  }

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando presencia…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI bar */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Efectivos', value: kpis.efectivos.toLocaleString(), accent: '#dc2626' },
            { label: 'Diaspora', value: kpis.diaspora.toLocaleString(), accent: '#22c55e' },
            { label: 'Inversión M€', value: kpis.inversion_mill_eur.toLocaleString(), accent: '#3b82f6' },
            { label: 'Embajadas', value: kpis.embajadas, accent: '#6366f1' },
            { label: 'Fuentes energía', value: kpis.fuentes_energia, accent: '#f59e0b' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ ...CARD, padding: '12px 16px' }}>
              <div style={{ fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: accent, letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Presence cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {presencia.map(p => (
          <div key={p.id} style={{ ...CARD, padding: '16px 20px', borderTop: `3px solid ${CAT_COLORS[p.categoria] ?? '#6366f1'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: CAT_COLORS[p.categoria] ?? '#6366f1', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                {p.categoria}
              </span>
              <span style={{ fontSize: 10, color: INK4 }}>{p.n_articulos_30d} art.</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK1, marginBottom: 4 }}>{p.pais}</div>
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 10, lineHeight: 1.4 }}>{p.titulo}</div>
            <div style={{ fontSize: 10, color: INK4, lineHeight: 1.5 }}>{p.descripcion}</div>
            {/* Relevance bar */}
            <div style={{ marginTop: 10, position: 'relative', height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${p.score_relevancia * 100}%`, background: CAT_COLORS[p.categoria] ?? '#6366f1', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── OSINT Feed ────────────────────────────────────────────────────────────────
function OsintFeed({ osint, loading }: { osint: OsintItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const countries = useMemo(() => {
    const seen = new Set<string>()
    osint.forEach(o => { if (o.categoria && o.categoria !== 'Internacional') seen.add(o.categoria) })
    return Array.from(seen).sort()
  }, [osint])
  const filtered = filter ? osint.filter(o => o.categoria === filter) : osint

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando OSINT…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Country filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter(null)} style={{ border: `1px solid ${filter === null ? '#1F4E8C' : 'rgba(0,0,0,0.15)'}`, background: filter === null ? '#1F4E8C' : 'white', color: filter === null ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
          Todos ({osint.length})
        </button>
        {countries.slice(0, 12).map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ border: `1px solid ${filter === c ? '#1F4E8C' : 'rgba(0,0,0,0.12)'}`, background: filter === c ? '#1F4E8C' : 'white', color: filter === c ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Sin señales OSINT{filter ? ` para ${filter}` : ''}.</div>
      )}

      {filtered.slice(0, 40).map((item, i) => (
        <div key={item.id} style={{ ...CARD, padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: INK1, lineHeight: 1.4, marginBottom: 4 }}>{item.titulo}</div>
            {item.resumen && item.resumen !== item.titulo && (
              <div style={{ fontSize: 11, color: INK3, lineHeight: 1.5, marginBottom: 6 }}>{item.resumen.slice(0, 160)}…</div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: INK4 }}>{relTime(item.fecha)}</span>
              {item.fuente && <span style={{ fontSize: 10, color: INK3, fontWeight: 600 }}>{item.fuente}</span>}
              {item.categoria && item.categoria !== 'Internacional' && (
                <span style={{ fontSize: 9, background: 'rgba(14,165,233,0.1)', borderRadius: 4, padding: '2px 6px', color: '#0284c7', fontWeight: 700 }}>{item.categoria}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{ color: n <= item.urgencia ? '#f59e0b' : 'rgba(0,0,0,0.1)', fontSize: 10 }}>●</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)

  const { data: kpisRaw, loading: kpisLoading }    = useApi<KpiData>('/api/geopolitica/stats',    { refreshInterval: 120_000 })
  const { data: riesgoRaw, loading: riesgoLoading } = useApi<RiesgoItem[]>('/api/geopolitica/riesgo', { refreshInterval: 180_000 })
  const { data: eventsRaw, loading: eventsLoading } = useApi<{ data: EventItem[] }>('/api/geopolitica/events', { refreshInterval: 60_000 })
  const { data: alertasRaw, loading: alertasLoad }  = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 60_000 })
  const { data: osintRaw, loading: osintLoading }   = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint',   { refreshInterval: 90_000 })
  const { data: presenciaRaw, loading: presLoad }   = useApi<{ data: PresenciaItem[]; kpis: PresenciaKpis }>('/api/geopolitica/presencia', { refreshInterval: 300_000 })

  const kpis     = kpisRaw ?? null
  const riesgo   = Array.isArray(riesgoRaw) ? riesgoRaw : []
  const events   = eventsRaw?.data ?? []
  const alertas  = alertasRaw?.data ?? []
  const osint    = osintRaw?.data ?? []
  const presencia = presenciaRaw?.data ?? []
  const presenciaKpis = presenciaRaw?.kpis ?? null

  return (
    <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh', fontFamily: 'var(--font-body, -apple-system, system-ui, sans-serif)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Page header */}
        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia · Geopolítica
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 4px', color: '#1d1d1f' }}>
            Monitor Geopolítico
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Riesgo país · Eventos internacionales · Presencia exterior española.
            Datos en tiempo real desde <strong>noticias_prensa</strong> (hoy: {new Date().toLocaleDateString('es-ES')}).
          </p>
        </header>

        {/* KPI strip */}
        <KpiStrip kpis={kpis} />

        {/* Tab bar */}
        <TabBar
          items={['MAPA DE RIESGO', 'EVENTOS', 'ALERTAS', 'SEÑALES OSINT', 'PRESENCIA EXTERIOR']}
          active={tab}
          onChange={setTab}
        />

        {/* Tab 0 — Mapa de riesgo */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
            <WorldMap riesgo={riesgo} />
            {riesgoLoading
              ? <div style={{ ...CARD, ...CARD_INNER, color: INK3 }}>Calculando riesgo…</div>
              : <RiesgoTable riesgo={riesgo.slice(0, 15)} />
            }
          </div>
        )}

        {/* Tab 1 — Eventos */}
        {tab === 1 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {events.length} eventos internacionales recientes · ordenados por fecha
            </div>
            <EventsFeed events={events} loading={eventsLoading} />
          </div>
        )}

        {/* Tab 2 — Alertas */}
        {tab === 2 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              Alertas basadas en negatividad de cobertura noticiosa (sentimiento &lt; -0.1)
            </div>
            <AlertasPanel alertas={alertas} loading={alertasLoad} />
          </div>
        )}

        {/* Tab 3 — OSINT */}
        {tab === 3 && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {osint.length} señales OSINT · noticias_prensa con keywords geopolíticos · últimos 7 días
            </div>
            <OsintFeed osint={osint} loading={osintLoading} />
          </div>
        )}

        {/* Tab 4 — Presencia exterior */}
        {tab === 4 && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              Presencia española en el exterior calculada desde artículos recientes · cobertura noticiosa como proxy de relevancia
            </div>
            <PresenciaExterior presencia={presencia} kpis={presenciaKpis} loading={presLoad} />
          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid var(--hairline, rgba(0,0,0,0.07))', padding: '20px 28px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5 }}>
        Politeia Analítica · Monitor Geopolítico · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
