'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useBriefing } from '@/hooks/narrativa/useBriefing'
import type { BriefingItem, TipoBriefingItem } from '@/types/narrativa'
import BrainPanelClient from '@/app/_components/workspace/brain-panel-client'

// ── design tokens ─────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
}
const INK1 = '#0f172a'
const INK2 = '#1f2937'
const INK3 = '#64748b'
const INK4 = '#94a3b8'

// Colours per tipo
const TIPO_COLOR: Record<TipoBriefingItem, string> = {
  'Geopolítica':  '#7c3aed',
  'Economía':     '#0ea5e9',
  'Legislativo':  '#7c2d12',
  'Electoral':    '#16a34a',
  'Narrativa':    '#db2777',
  'Seguridad':    '#dc2626',
  'Social':       '#1F4E8C',
  'Energía':      '#f59e0b',
}
const TIPO_BG: Record<TipoBriefingItem, string> = {
  'Geopolítica':  'rgba(124,58,237,0.08)',
  'Economía':     'rgba(14,165,233,0.08)',
  'Legislativo':  'rgba(124,45,18,0.08)',
  'Electoral':    'rgba(22,163,74,0.08)',
  'Narrativa':    'rgba(219,39,119,0.08)',
  'Seguridad':    'rgba(220,38,38,0.08)',
  'Social':       'rgba(31,78,140,0.08)',
  'Energía':      'rgba(245,158,11,0.08)',
}
function urgenciaColor(u: string): string {
  if (u === 'CRITICA') return '#dc2626'
  if (u === 'ALTA') return '#f59e0b'
  if (u === 'MEDIA') return '#3b82f6'
  return '#94a3b8'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// ── KPI strip ──────────────────────────────────────────────────────────────
function KpiStrip({ total, criticas, byType }: { total: number; criticas: number; byType: Array<[TipoBriefingItem, number]> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
      <div style={{ ...CARD, padding: '16px 20px' }}>
        <div style={{ fontSize: 9, color: INK4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Inteligencia hoy</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: INK1, letterSpacing: '-0.03em' }}>{total}</div>
        <div style={{ fontSize: 10, color: INK3 }}>ítems procesados</div>
      </div>
      <div style={{ ...CARD, padding: '16px 20px', borderLeft: '4px solid #dc2626' }}>
        <div style={{ fontSize: 9, color: INK4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Alertas críticas</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.03em' }}>{criticas}</div>
        <div style={{ fontSize: 10, color: INK3 }}>requieren atención</div>
      </div>
      {byType.slice(0, 4).map(([tipo, n]) => (
        <div key={tipo} style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ fontSize: 9, color: INK4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{tipo}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: TIPO_COLOR[tipo], letterSpacing: '-0.03em' }}>{n}</div>
          <div style={{ fontSize: 10, color: INK3 }}>{n === 1 ? 'historia' : 'historias'}</div>
        </div>
      ))}
    </div>
  )
}

// ── Item card ──────────────────────────────────────────────────────────────
function ItemCard({ item, onRead }: { item: BriefingItem; onRead?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const tipoColor = TIPO_COLOR[item.tipo] ?? INK3
  const tipoBg = TIPO_BG[item.tipo] ?? 'rgba(0,0,0,0.05)'
  const uColor = urgenciaColor(item.urgencia)

  return (
    <div
      style={{
        ...CARD,
        padding: '20px 24px',
        borderLeft: `3px solid ${uColor}`,
        opacity: item.leido ? 0.6 : 1,
        transition: 'opacity 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          background: tipoBg, color: tipoColor, padding: '4px 9px',
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', borderRadius: 6,
        }}>{item.tipo}</span>
        <span style={{
          background: uColor, color: 'white', padding: '3px 9px',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', borderRadius: 4,
        }}>{item.urgencia}</span>
        <span style={{ fontSize: 10.5, color: INK4, marginLeft: 'auto' }}>{formatTime(item.fecha)}</span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: INK1, margin: '0 0 8px', lineHeight: 1.35, fontFamily: 'var(--font-display, inherit)' }}>
        {item.titulo}
      </h3>

      {item.resumen && (
        <p style={{
          fontSize: 13, color: INK2, lineHeight: 1.6, margin: '0 0 10px',
          maxHeight: expanded ? 'none' : '4.8em',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {item.resumen}
        </p>
      )}

      {item.resumen && item.resumen.length > 240 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          background: 'transparent', border: 'none', color: '#1F4E8C',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 8,
        }}>
          {expanded ? '← Resumir' : 'Leer todo →'}
        </button>
      )}

      {item.implicaciones && item.implicaciones.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.025)', borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: INK4, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Implicaciones</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: INK2, lineHeight: 1.6 }}>
            {item.implicaciones.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </div>
      )}

      {(item.fuentes.length > 0 || item.tags.length > 0) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {item.fuentes.map((f, i) => (
            <span key={i} style={{ fontSize: 10, color: INK3, fontWeight: 600 }}> {f}</span>
          ))}
          {item.tags.slice(0, 6).map((t, i) => (
            <span key={i} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 4,
              background: 'rgba(0,0,0,0.05)', color: INK3, fontWeight: 600,
            }}>#{t}</span>
          ))}
          {onRead && !item.leido && (
            <button onClick={() => onRead(item.id)} style={{
              marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 6, padding: '4px 10px', fontSize: 10, color: INK3,
              fontWeight: 600, cursor: 'pointer',
            }}>Marcar como leído</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BriefingPage() {
  const router = useRouter()
  const { briefing, loading, marcarLeido } = useBriefing()
  const [filter, setFilter] = useState<TipoBriefingItem | 'ALL'>('ALL')

  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh' }}>
        <AppHeader />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 28px', textAlign: 'center', color: INK3, fontSize: 13 }}>
          Cargando briefing diario…
        </div>
      </div>
    )
  }

  if (!briefing || briefing.items.length === 0) {
    return (
      <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh' }}>
        <AppHeader />
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 80px' }}>
          <header style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Inicio · Briefing Matinal</span>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0', color: INK1, fontFamily: 'var(--font-display, inherit)' }}>
              Morning Briefing
            </h1>
          </header>
          <div style={{ ...CARD, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: INK1, margin: '0 0 8px' }}>El briefing matinal aún no está disponible</h3>
            <p style={{ fontSize: 13, color: INK3, lineHeight: 1.6, margin: 0 }}>
              El sistema genera el briefing automáticamente cada mañana a las 7:00 CET con datos de BOE, prensa, indicadores macroeconómicos y señales OSINT.
              <br />
              Vuelve en unos minutos o consulta el Panel Ejecutivo para ver los KPIs en tiempo real.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Group by tipo
  const byType: Map<TipoBriefingItem, number> = new Map()
  briefing.items.forEach(it => {
    byType.set(it.tipo, (byType.get(it.tipo) ?? 0) + 1)
  })
  const byTypeSorted = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]) as Array<[TipoBriefingItem, number]>
  const filtered = filter === 'ALL' ? briefing.items : briefing.items.filter(i => i.tipo === filter)

  return (
    <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh', fontFamily: 'var(--font-body, -apple-system, system-ui, sans-serif)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 80px' }}>

        <header style={{ marginBottom: 26 }}>
          <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inicio · Briefing Matinal · {briefing.periodo}
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 6px', color: INK1, fontFamily: 'var(--font-display, inherit)' }}>
            Morning Briefing
          </h1>
          <div style={{ fontSize: 13, color: INK3 }}>
            <strong style={{ color: INK2, textTransform: 'capitalize' }}>{formatDate(briefing.fecha)}</strong>
            {' · '}generado por {briefing.generado_por}
          </div>
        </header>

        <KpiStrip total={briefing.total_items} criticas={briefing.alertas_criticas} byType={byTypeSorted} />

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('ALL')} style={{
            border: filter === 'ALL' ? '1px solid #1F4E8C' : '1px solid rgba(0,0,0,0.1)',
            background: filter === 'ALL' ? '#1F4E8C' : 'white',
            color: filter === 'ALL' ? 'white' : INK3,
            borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Todos ({briefing.items.length})</button>
          {byTypeSorted.map(([tipo, n]) => (
            <button key={tipo} onClick={() => setFilter(tipo)} style={{
              border: filter === tipo ? `1px solid ${TIPO_COLOR[tipo]}` : '1px solid rgba(0,0,0,0.1)',
              background: filter === tipo ? TIPO_COLOR[tipo] : 'white',
              color: filter === tipo ? 'white' : TIPO_COLOR[tipo],
              borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{tipo} ({n})</button>
          ))}
        </div>

        {/* Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onRead={marcarLeido} />
          ))}
        </div>

        {/* ── IA · Briefing ejecutivo razonado por Groq ── */}
        <div style={{ marginTop: 28 }}>
          <BrainPanelClient
            title="Briefing IA · síntesis ejecutiva del día (Groq · LLaMA 3.3 70B)"
            tool="generate_briefing"
            kwargs={{
              title: 'Briefing Politeia',
              date: new Date().toISOString().slice(0, 10),
              sections_context: {
                politica_nacional:
                  `Briefing del día con ${briefing?.total_items ?? 0} ítems, ${briefing?.alertas_criticas ?? 0} alertas críticas.`,
                items_destacados: (briefing?.items ?? []).slice(0, 8).map(i =>
                  `[${(i as BriefingItem).tipo}] ${(i as BriefingItem).titular}`
                ).join(' | '),
                contexto:
                  'Plataforma Politeia · cobertura nacional + UE · monitor 24/7 sobre medios, Congreso, BOE y RRSS.',
              },
              audience: 'directivos políticos y CEOs',
              length: 'medio',
            }}
            autoRun
            buttonLabel="Regenerar briefing"
          />
        </div>
      </main>
    </div>
  )
}
