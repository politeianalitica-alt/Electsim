'use client'

/**
 * /inicio — Pantalla de inicio minimalista.
 *
 * Después de hacer login, el analista debería ver SOLO lo importante:
 *   1. Briefing matinal generado por la IA (BrainBriefing)
 *   2. Tres o cuatro KPIs vivos
 *   3. Hasta 5 alertas prioritarias activas
 *   4. Cuatro atajos a los módulos que más uso
 *
 * Todo lo demás (mapas, trends, módulos sectoriales, etc.) queda
 * accesible desde la nav principal, no se mete en la home.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import BrainBriefing from '@/components/BrainBriefing'
import BriefingExports from '@/components/BriefingExports'
import CountUp from '@/components/CountUp'
import { LiveDot } from '@/components/Skeleton'
import AlertCard, { AlertKeyframes, LEVELS_ORDER, type AlertaItem } from '@/components/AlertCard'
import type { DashboardHome } from '../api/dashboard/home/route'

const QUICK_LINKS: Array<{ href: string; label: string; sub: string; glyph: string }> = [
  { href: '/briefing',          label: 'Morning Briefing',     sub: 'El parte completo del día', glyph: '◐' },
  { href: '/alertas',           label: 'Alertas Prioritarias', sub: 'Ver todas las alertas',     glyph: '!' },
  { href: '/monitor-legislativo', label: 'Monitor Legislativo', sub: 'BOE, BOCG, Congreso',      glyph: '⊟' },
  { href: '/estudio',           label: 'Tu Estudio',           sub: 'Paneles, fuentes, IA',     glyph: '⬡' },
]

export default function InicioPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return }
    setReady(true)
  }, [router])

  const { data, source, loading } = useApi<DashboardHome>('/api/dashboard/home', { staleTimeMs: 30_000 })

  // Alertas con shape rico · misma visual que /alertas
  const { data: signalsData } = useApi<{ signals?: AlertaItem[] }>(
    '/api/intelligence/signals?legacy=1',
    { refreshInterval: 30_000 }
  )

  if (!ready) return null

  // Top 3 KPIs (no más ruido en la home)
  const kpis = (data?.kpis ?? []).slice(0, 3)
  // Top 5 alertas ordenadas por nivel · misma prioridad que /alertas
  const richAlerts: AlertaItem[] = (signalsData?.signals ?? [])
    .slice()
    .sort((a, b) => LEVELS_ORDER.indexOf(a.level) - LEVELS_ORDER.indexOf(b.level))
  const alerts = richAlerts.slice(0, 5)

  return (
    <>
      <AppHeader />
      <main style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 28px 60px',
        background: 'var(--bg)',
      }}>
        {/* 1 · Briefing matinal generado por la IA */}
        <BrainBriefing />

        {/* 1bis · Descargar briefing en PDF o escuchar en audio */}
        <BriefingExports />

        {/* 2 · KPIs vivos (3 max) */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginTop: 18,
        }}>
          {kpis.map(k => {
            const numeric = typeof k.value === 'number'
              ? k.value
              : Number(String(k.value).replace(/[^0-9.-]/g, ''))
            const suffix = typeof k.value === 'string' && k.value.includes('%') ? '%' : ''
            const isNum = Number.isFinite(numeric) && !!String(k.value).match(/[0-9]/)
            return (
              <div key={k.label} style={{
                background: '#fff',
                border: '1px solid var(--hairline-2,#ECECEF)',
                borderLeft: `3px solid ${k.accent}`,
                borderRadius: 14,
                padding: '14px 18px',
              }}>
                <div style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  color: 'var(--ink-4,#6e6e73)',
                  fontWeight: 600,
                  marginBottom: 6,
                }}>{k.label}</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 28,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}>
                  {isNum ? <CountUp to={numeric} suffix={suffix} /> : String(k.value)}
                </div>
                {k.sub && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3,#515154)', marginTop: 6 }}>
                    {k.sub}
                  </div>
                )}
              </div>
            )
          })}
          {!data?.kpis && loading && [0,1,2].map(i => (
            <div key={i} style={{
              height: 92,
              background: '#fff',
              border: '1px solid var(--hairline-2,#ECECEF)',
              borderRadius: 14,
              opacity: 0.4,
            }} />
          ))}
        </section>

        {/* 3 · Alertas prioritarias (5 max) · misma visual que /alertas */}
        <section style={{ marginTop: 22 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
              Alertas que necesitan tu atención
              {richAlerts.length > 0 && (
                <span style={{
                  fontSize: 10.5, padding: '2px 8px', borderRadius: 999,
                  background: '#F5F5F7', color: '#6e6e73', fontWeight: 600,
                  marginLeft: 4,
                }}>{richAlerts.length} activas</span>
              )}
            </h2>
            <Link href="/alertas" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#0071e3', color: '#fff',
              fontSize: 11.5, fontWeight: 600, padding: '5px 12px',
              borderRadius: 999, textDecoration: 'none',
            }}>
              Ver más
              <span style={{ fontSize: 13, lineHeight: 1 }}>→</span>
            </Link>
          </div>
          {alerts.length === 0 && !loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-4,#6e6e73)', fontSize: 13, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
              Sin alertas activas. Todo bajo control.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(a => (
              <AlertCard key={a.id} alert={a} compact/>
            ))}
          </div>
          <AlertKeyframes/>
        </section>

        {/* 4 · Cuatro atajos rápidos a lo que más uso */}
        <section style={{
          marginTop: 22,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {QUICK_LINKS.map(q => (
            <Link key={q.href} href={q.href} style={{
              background: '#fff',
              border: '1px solid var(--hairline-2,#ECECEF)',
              borderRadius: 14,
              padding: '14px 18px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <span style={{
                fontSize: 18,
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-soft,#f5f5f7)',
                color: 'var(--accent,#0071e3)',
                borderRadius: 10,
                fontWeight: 700,
                marginBottom: 6,
              }}>{q.glyph}</span>
              <strong style={{ fontSize: 14, color: 'var(--ink,#1d1d1f)', letterSpacing: '-0.01em' }}>
                {q.label}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--ink-3,#6e6e73)' }}>
                {q.sub}
              </span>
            </Link>
          ))}
        </section>

        {/* Acceso al panel completo para quien lo necesite */}
        <p style={{ marginTop: 28, fontSize: 12, color: 'var(--ink-4,#9ca3af)', textAlign: 'center' }}>
          ¿Necesitas el panel ejecutivo completo? <Link href="/dashboard" style={{ color: 'var(--accent,#0071e3)' }}>Ver Panel Ejecutivo</Link>
        </p>
      </main>
    </>
  )
}
