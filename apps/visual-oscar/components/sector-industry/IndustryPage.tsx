'use client'
/**
 * IndustryPage · Template Apple-Newsroom para las 9 industrias verticales
 * de Sectoriales (Energía, Farma, Defensa, Vivienda, Banca, Agro, Telecom,
 * Infraestructuras, Turismo).
 *
 * Comparte estética con /licitaciones, /geopolitica, /escenarios.
 *
 * Datos en vivo:
 *   - /api/sectores/[id]         · SectorReport (score, alertas, iniciativas_ids)
 *   - /api/sectores/[id]/kpis    · KPIs por fuente (BdE, MITECO, CNMC...)
 *   - /api/sectores/[id]/actores · empresas, reguladores, asociaciones
 *   - /api/sectores/[id]/eventos · eventos recientes regulatorios/políticos
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '@/app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { getSectorMeta } from '@/config/sectores'
import type {
  SectorReport, KPISectorial, ActorSectorial, EventoSectorial,
} from '@/types/sectores'

type TabId = 'overview' | 'actores' | 'eventos' | 'fuentes'

// Etiqueta humana del nivel de riesgo
const NIVEL_LABEL: Record<string, string> = {
  bajo: 'Bajo', medio: 'Medio', alto: 'Alto', critico: 'Crítico',
}
const NIVEL_COLOR: Record<string, string> = {
  bajo: '#16A34A', medio: '#F97316', alto: '#DC2626', critico: '#7F1D1D',
}
const TENDENCIA_LABEL: Record<string, string> = {
  subida: '▲ subiendo', bajada: '▼ bajando', estable: '— estable', sin_datos: 'sin datos',
}
const ACTOR_TIPO_COLOR: Record<string, string> = {
  empresa: '#1F4E8C', regulador: '#7C3AED', asociacion: '#0F766E',
  sindicato: '#DC2626', think_tank: '#F97316', organismo_publico: '#525258',
}
const EVENTO_TIPO_COLOR: Record<string, string> = {
  regulatorio: '#7C3AED', economico: '#16A34A', politico: '#1F4E8C',
  judicial: '#DC2626', internacional: '#0F766E', otro: '#525258',
}

// Convertir un hex a una versión más oscura para el gradient del hero
function darken(hex: string, amount = 0.45): string {
  const c = hex.replace('#', '')
  const r = Math.max(0, Math.floor(parseInt(c.substring(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.floor(parseInt(c.substring(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.floor(parseInt(c.substring(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ── Componentes auxiliares ──────────────────────────────────────────────
function KPICard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
 <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      padding: '14px 16px 12px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
 <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: accent }}/>
 <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', lineHeight: 1, color: accent, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 5 }}>{sub}</div>}
 </div>
  )
}
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
 <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
      padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
 <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d', margin: 0,
        }}>{title}</h2>
        {action}
 </div>
      {children}
 </section>
  )
}
function fmtKpiValue(v: number | null, unidad: string): string {
  if (v === null || v === undefined) return '—'
  // Format with locale + thousand separator + max 2 decimals
  const formatted = Math.abs(v) >= 1000
    ? Math.round(v).toLocaleString('es-ES')
    : (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace('.', ',')
  return unidad ? `${formatted}${['%', '€', '$'].includes(unidad) ? '' : ' '}${unidad}` : formatted
}

// ── Página principal ────────────────────────────────────────────────────
export default function IndustryPage({ sectorId }: { sectorId: string }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const meta = useMemo(() => getSectorMeta(sectorId), [sectorId])
  const accent = meta?.color_primario ?? '#1F4E8C'
  const heroFrom = accent
  const heroTo = darken(accent, 0.55)

  const [tab, setTab] = useState<TabId>('overview')

  const { data: report, source, updatedAt, refresh } = useApi<SectorReport>(
 `/api/sectores/${sectorId}`, { refreshInterval: 300_000 }
  )
  const { data: kpisRes } = useApi<{ kpis: KPISectorial[] }>(
 `/api/sectores/${sectorId}/kpis`, { refreshInterval: 600_000 }
  )
  const { data: actoresRes } = useApi<{ actores: ActorSectorial[] }>(
 `/api/sectores/${sectorId}/actores`, { refreshInterval: 0 }
  )
  const { data: eventosRes } = useApi<{ eventos: EventoSectorial[] }>(
 `/api/sectores/${sectorId}/eventos`, { refreshInterval: 600_000 }
  )

  const kpis = kpisRes?.kpis ?? []
  const actores = actoresRes?.actores ?? []
  const eventos = eventosRes?.eventos ?? []

  if (!meta) {
    return (
 <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body,system-ui)' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '60px 28px', textAlign: 'center' }}>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>Sector no encontrado</h1>
 <p style={{ color: '#6e6e73' }}>El sector <code>{sectorId}</code> no está registrado en la configuración.</p>
 </main>
 </div>
    )
  }

  const score = report?.score
  const nivel = score?.nivel ?? 'bajo'
  const nivelColor = NIVEL_COLOR[nivel] || '#6e6e73'
  const tendencia = score?.tendencia ?? 'sin_datos'
  const alertasCount = report?.alertas?.length ?? 0
  const iniciativasCount = report?.iniciativas_legislativas_ids?.length ?? 0

  return (
 <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero · gradient con accent del sector */}
 <section style={{
          background: `linear-gradient(135deg,${heroFrom} 0%,${heroTo} 100%)`,
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow decorativo */}
 <div style={{
            position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}/>
 <div style={{ position: 'relative' }}>
 <p style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78,
              textTransform: 'uppercase', margin: '0 0 8px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
 <span>SECTORIAL · {meta.nombre_corto.toUpperCase()}</span>
 <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
 </p>
 <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
              letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1,
            }}>
              {meta.nombre.split(' ')[0]} <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.78)' }}>{meta.nombre.split(' ').slice(1).join(' ')}</em>
 </h1>
 <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5, maxWidth: 620 }}>
              {meta.descripcion}
 </p>
 <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11.5, opacity: 0.85, flexWrap: 'wrap' }}>
 <Link href="/licitaciones" style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Ver licitaciones del sector →
 </Link>
 <span style={{ opacity: 0.4 }}>·</span>
 <span>{meta.fuentes_datos.length} fuentes monitorizadas</span>
 </div>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, position: 'relative' }}>
            {[
              { l: 'Riesgo',       v: NIVEL_LABEL[nivel],       sub: TENDENCIA_LABEL[tendencia] },
              { l: 'Alertas',      v: String(alertasCount),     sub: alertasCount > 0 ? 'activas' : 'sin alertas' },
              { l: 'Iniciativas',  v: String(iniciativasCount), sub: 'legislativas vivas' },
              { l: 'Áreas',        v: String(meta.areas_tematicas.length), sub: 'temáticas' },
            ].map((k) => (
 <div key={k.l} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.75, textTransform: 'uppercase' }}>{k.l}</div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.05, color: '#fff', marginTop: 4 }}>{k.v}</div>
 <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>{k.sub}</div>
 </div>
            ))}
 </div>
 </section>

        {/* KPI strip · scores agregados */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
 <KPICard label="Score Riesgo" value={score?.score_riesgo?.toFixed(0) ?? '0'} accent={nivelColor} sub={`/100 · ${NIVEL_LABEL[nivel]}`}/>
 <KPICard label="Actividad legislativa" value={score?.score_actividad_legislativa?.toFixed(0) ?? '0'} accent="#7C3AED" sub="/100"/>
 <KPICard label="Volatilidad" value={score?.score_volatilidad?.toFixed(0) ?? '0'} accent="#F97316" sub="/100"/>
 <KPICard label="KPIs monitorizados" value={kpis.length} accent={accent} sub={`${meta.fuentes_datos.length} fuentes`}/>
 </div>

        {/* Tabs pill */}
 <div style={{
          display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
          padding: 4, marginBottom: 18, overflowX: 'auto', maxWidth: '100%',
        }}>
          {([
            { k: 'overview',  l: `Overview` },
            { k: 'actores',   l: `Actores · ${actores.length}` },
            { k: 'eventos',   l: `Eventos · ${eventos.length}` },
            { k: 'fuentes',   l: `Fuentes · ${meta.fuentes_datos.length}` },
          ] as const).map((t) => {
            const active = tab === t.k
            return (
 <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 16px',
                fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 160ms',
              }}>{t.l}</button>
            )
          })}
 </div>

        {/* TAB · Overview · KPIs en vivo + áreas temáticas */}
        {tab === 'overview' && (
 <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
 <Card title={`KPIs sectoriales · ${kpis.length}`}>
              {kpis.length === 0 ? (
 <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                  Sin KPIs disponibles del backend en este momento. Las {meta.fuentes_datos.length} fuentes
                  configuradas se hidratarán cuando el backend FastAPI publique los datos.
 </p>
              ) : (
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {kpis.map((k) => (
 <li key={k.id} style={{
                      padding: '10px 12px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #f0f0f3',
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                    }}>
 <div>
 <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{k.nombre}</div>
 <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 2 }}>
                          {k.fuente_id} · {k.periodo || 'sin periodo'} · {TENDENCIA_LABEL[k.tendencia]}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{
                          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                          color: k.tendencia === 'subida' ? '#16A34A' : k.tendencia === 'bajada' ? '#DC2626' : '#1d1d1f',
                          fontVariantNumeric: 'tabular-nums',
                        }}>{fmtKpiValue(k.valor, k.unidad)}</div>
                        {typeof k.variacion_pct === 'number' && (
 <div style={{ fontSize: 10.5, color: k.variacion_pct >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                            {k.variacion_pct >= 0 ? '+' : ''}{k.variacion_pct.toFixed(1)}%
 </div>
                        )}
 </div>
 </li>
                  ))}
 </ul>
              )}
 </Card>

 <Card title="Áreas temáticas">
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {meta.areas_tematicas.map((a) => (
 <span key={a} style={{
                    padding: '5px 11px', borderRadius: 999,
                    background: `${accent}14`, color: accent, fontSize: 11.5, fontWeight: 600,
                    border: `1px solid ${accent}33`, textTransform: 'capitalize',
                  }}>{a.replace(/_/g, ' ')}</span>
                ))}
 </div>
              {report?.alertas && report.alertas.length > 0 && (
 <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f5f5f7' }}>
 <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>Alertas activas · {report.alertas.length}</p>
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {report.alertas.slice(0, 5).map((a, i) => (
 <li key={i} style={{ fontSize: 12, color: '#1d1d1f', padding: '6px 10px', background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #DC2626', borderRadius: 6 }}>
                        {String(a)}
 </li>
                    ))}
 </ul>
 </div>
              )}
 </Card>
 </div>
        )}

        {/* TAB · Actores */}
        {tab === 'actores' && (
 <Card title={`${actores.length} actores del sector`}>
            {actores.length === 0 ? (
 <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                Sin actores publicados todavía. Catálogo en construcción.
 </p>
            ) : (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
                {actores.map((a) => {
                  const c = ACTOR_TIPO_COLOR[a.tipo] || '#6e6e73'
                  return (
 <div key={a.id} style={{
                      padding: '12px 14px', borderRadius: 12, background: '#FAFAFB', border: '1px solid #f0f0f3',
                    }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
 <span style={{
                          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', color: '#fff',
                          background: c, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
                        }}>{a.tipo}</span>
 </div>
 <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600,
                        margin: '0 0 4px', color: '#1d1d1f',
                      }}>{a.nombre}</h3>
 <p style={{ fontSize: 11.5, color: '#3a3a3d', margin: 0, lineHeight: 1.4 }}>
                        {a.descripcion_corta}
 </p>
 </div>
                  )
                })}
 </div>
            )}
 </Card>
        )}

        {/* TAB · Eventos recientes */}
        {tab === 'eventos' && (
 <Card title={`${eventos.length} eventos sectoriales`}>
            {eventos.length === 0 ? (
 <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                Sin eventos recientes registrados para este sector.
 </p>
            ) : (
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {eventos.slice(0, 20).map((e) => {
                  const c = EVENTO_TIPO_COLOR[e.tipo] || '#525258'
                  return (
 <li key={e.id} style={{
                      padding: '12px 14px', borderRadius: 12, background: '#FAFAFB',
                      border: '1px solid #f0f0f3', borderLeft: `3px solid ${c}`,
                    }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
 <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: c, textTransform: 'uppercase' }}>{e.tipo}</span>
 <span style={{ fontSize: 11, color: '#6e6e73' }}>· {new Date(e.fecha).toLocaleDateString('es-ES')}</span>
 </div>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, margin: '0 0 4px', color: '#1d1d1f' }}>
                        {e.titulo}
 </h3>
 <p style={{ fontSize: 12, color: '#3a3a3d', margin: 0, lineHeight: 1.45 }}>{e.descripcion}</p>
                      {e.url_fuente && (
 <a href={e.url_fuente} target="_blank" rel="noopener noreferrer"
                           style={{ fontSize: 11, color: c, textDecoration: 'none', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
                          {e.fuente} ↗
 </a>
                      )}
 </li>
                  )
                })}
 </ul>
            )}
 </Card>
        )}

        {/* TAB · Fuentes monitorizadas */}
        {tab === 'fuentes' && (
 <Card title={`${meta.fuentes_datos.length} fuentes monitorizadas`}>
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {meta.fuentes_datos.map((f) => (
 <li key={f.id} style={{
                  padding: '12px 14px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #f0f0f3',
                }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
 <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                      color: accent, background: `${accent}14`, padding: '2px 7px',
                      borderRadius: 4, textTransform: 'uppercase',
                    }}>{f.tipo}</span>
 <span style={{ fontSize: 10, color: '#6e6e73', fontFamily: 'ui-monospace,monospace' }}>{Math.floor(f.revalidate_s / 60)} min</span>
 </div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{f.nombre}</div>
                  {f.endpoint_variable && (
 <code style={{ fontSize: 10.5, color: '#6e6e73', fontFamily: 'ui-monospace,monospace' }}>{f.endpoint_variable}</code>
                  )}
 </li>
              ))}
 </ul>
 </Card>
        )}

 </main>
 <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Sectorial · {meta.nombre} · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}
