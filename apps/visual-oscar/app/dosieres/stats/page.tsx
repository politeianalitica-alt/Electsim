'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import Skeleton from '@/components/Skeleton'
import { IBEX35_FIXTURE, IBEX35_RESUMEN } from '@/data/ibex35-fixture'
import { DIPUTACIONES_FIXTURE, DIPUTACIONES_RESUMEN } from '@/data/diputaciones-fixture'
import { PODER_FIXTURE, PODER_RESUMEN } from '@/data/poder-fixture'
import type { DossierResumen } from '@/data/dosieres-fixture'

// Colores partido (alineados con el resto)
const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030', PSDEG: '#C53030', 'PSOE-A': '#C53030',
  PP: '#2D4A8A', VOX: '#63BE21', Vox: '#63BE21',
  Sumar: '#BF3F7E', SUMAR: '#BF3F7E', Podemos: '#7A2980',
  ERC: '#FFB30F', 'EH Bildu': '#A02525', Junts: '#1FA89B', PNV: '#0F766E',
  CC: '#0EA5E9', BNG: '#0E7490', 'Más Madrid': '#BF3F7E',
  Compromís: '#FF6B35', UPN: '#D97706', IU: '#7A2980', PRC: '#0891B2', UPL: '#16A34A',
  Independiente: '#6e6e73',
}

function normalizePartido(p: string | null | undefined): string {
  if (!p) return 'Sin partido'
  const aliases: Record<string, string> = {
    'PSC': 'PSOE', 'PSDEG': 'PSOE', 'PSOE-A': 'PSOE', 'PSC-CP': 'PSOE',
    'PSDEG-PSOE': 'PSOE', 'PSE-EE': 'PSOE', 'PSE-EE (PSOE)': 'PSOE',
    'PSE-EE-PSOE': 'PSOE', 'PSC-UNITS-CP': 'PSOE', 'PSdeG-PSOE': 'PSOE',
    'PSN-PSOE': 'PSOE', 'PSN': 'PSOE', 'FSA-PSOE': 'PSOE', 'PSIB-PSOE': 'PSOE',
    'VOX': 'Vox', 'SUMAR': 'Sumar',
    'B.N.G.': 'BNG', 'M\\u00e1s Madrid': 'Más Madrid', 'Más Madrid': 'Más Madrid',
    'Comprom\\u00eds': 'Compromís', 'I.U.': 'IU', 'CCA': 'CC',
  }
  return aliases[p] || p
}

export default function StatsPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Datos del backend
  const { data, loading } = useApi<DossierResumen[] | { error?: string }>(
    '/api/dosieres?limit=10000',
    { refreshInterval: 60_000 },
  )
  const apiDosieres: DossierResumen[] = Array.isArray(data) ? data : []

  // Unión de las 3 fuentes
  const all = useMemo(() => [...apiDosieres, ...IBEX35_RESUMEN, ...DIPUTACIONES_RESUMEN, ...PODER_RESUMEN], [apiDosieres])

  // KPI 1 · totales por fuente
  const totalAPI = apiDosieres.length
  const totalIBEX = IBEX35_RESUMEN.length
  const totalDIP = DIPUTACIONES_RESUMEN.length
  const totalPODER = PODER_RESUMEN.length
  const total = all.length

  // KPI 2 · distribución por partido (top 12)
  const porPartido = useMemo(() => {
    const counts: Record<string, number> = {}
    all.forEach(d => {
      const p = normalizePartido(d.partido)
      counts[p] = (counts[p] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 14)
  }, [all])

  // KPI 3 · distribución por tipo de cargo (top 10)
  const porCargoTipo = useMemo(() => {
    const counts: Record<string, number> = {}
    all.forEach(d => {
      // Primera palabra del cargo como heurística de tipo
      const first = (d.cargo_actual || 'Sin cargo').split(/[/\s]/)[0]
      const norm = first.replace(/^Empresa$/, 'Empresa cotizada')
      counts[norm] = (counts[norm] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  }, [all])

  // KPI 4 · número de apartados por dossier (densidad)
  const completeness = useMemo(() => {
    const buckets = { '0': 0, '1-2': 0, '3-4': 0, '5-6': 0, '7+': 0 }
    all.forEach(d => {
      const n = d.n_apartados || 0
      if (n === 0) buckets['0']++
      else if (n <= 2) buckets['1-2']++
      else if (n <= 4) buckets['3-4']++
      else if (n <= 6) buckets['5-6']++
      else buckets['7+']++
    })
    return buckets
  }, [all])

  // KPI 5 · top 10 con más relaciones (redes) — solo en seeds locales (tienen apartados completos)
  const topRedes = useMemo(() => {
    const all_full = [...IBEX35_FIXTURE, ...DIPUTACIONES_FIXTURE, ...PODER_FIXTURE]
    const con_redes = all_full.map(d => {
      const redes = d.apartados.find(a => a.tipo === 'redes')
      return { slug: d.slug, nombre: d.nombre_completo, n: redes?.items.length || 0 }
    })
    return con_redes.filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10)
  }, [])

  // KPI 6 · top controversias (mismo: solo seeds)
  const topControversias = useMemo(() => {
    const all_full = [...IBEX35_FIXTURE, ...DIPUTACIONES_FIXTURE, ...PODER_FIXTURE]
    const con_contro = all_full.map(d => {
      const c = d.apartados.find(a => a.tipo === 'controversias')
      return { slug: d.slug, nombre: d.nombre_completo, n: c?.items.length || 0 }
    })
    return con_contro.filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10)
  }, [])

  const maxBar = Math.max(...porPartido.map(([, n]) => n), 1)
  const maxCargo = Math.max(...porCargoTipo.map(([, n]) => n), 1)
  const totalDensity = Object.values(completeness).reduce((s, n) => s + n, 0)

  return (
    <div style={{ background: '#FBFBFD', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 80px' }}>
        <nav style={{ marginBottom: 16, fontSize: 12 }}>
          <Link href="/dosieres" style={{ color: '#86868b', textDecoration: 'none' }}>← Volver a Personas</Link>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia política · estadísticas del dataset
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 6px', color: '#1d1d1f' }}>
            Stats
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
            Panorama del dataset combinando las 4 fuentes (políticos del backend +
            IBEX 35 + Diputaciones + mapa de poder no-electo). Composición por partido,
            densidad de apartados, top conectados y top controversias.
          </p>
        </header>

        {/* ═══ Big KPIs ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Total dossieres" value={loading ? '…' : total} color="#1F4E8C" />
          <KpiCard label="Backend (políticos)" value={loading ? '…' : totalAPI} color="#7C3AED" />
          <KpiCard label="IBEX 35" value={totalIBEX} color="#B45309" />
          <KpiCard label="Diputaciones" value={totalDIP} color="#0F766E" />
          <KpiCard label="Poder no-electo" value={totalPODER} color="#4338CA" />
          <KpiCard label="Partidos" value={porPartido.length} color="#0EA5E9" />
        </div>

        {/* ═══ Distribución por partido ═══ */}
        <Section title="Composición por partido (top 14)">
          {loading ? <Skeleton width={'100%' as unknown as number} height={300} radius={8} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {porPartido.map(([p, n]) => {
                const pct = (n / total) * 100
                const color = PARTIDO_COLOR[p] || '#9CA3AF'
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#1d1d1f', textAlign: 'right', flexShrink: 0 }}>{p}</div>
                    <div style={{ flex: 1, background: '#F4F4F6', borderRadius: 6, overflow: 'hidden', height: 22, position: 'relative' }}>
                      <div style={{
                        background: color, width: `${(n / maxBar) * 100}%`, height: '100%',
                        transition: 'width 320ms ease', borderRadius: 6,
                      }} />
                      <span style={{
                        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                        left: 8, fontSize: 11, color: '#fff', fontWeight: 700,
                        textShadow: '0 0 4px rgba(0,0,0,0.4)',
                      }}>{n}</span>
                    </div>
                    <div style={{ width: 56, fontSize: 11, color: '#86868b', textAlign: 'right' }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ═══ Por tipo de cargo ═══ */}
        <Section title="Por tipo de cargo (top 10)">
          {loading ? <Skeleton width={'100%' as unknown as number} height={220} radius={8} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {porCargoTipo.map(([cargo, n]) => (
                <div key={cargo} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: '#1d1d1f', textAlign: 'right', flexShrink: 0 }}>
                    {cargo}
                  </div>
                  <div style={{ flex: 1, background: '#F4F4F6', borderRadius: 6, overflow: 'hidden', height: 18 }}>
                    <div style={{ background: '#1F4E8C', width: `${(n / maxCargo) * 100}%`, height: '100%', transition: 'width 320ms ease' }} />
                  </div>
                  <div style={{ width: 56, fontSize: 11, color: '#525258', fontWeight: 600, textAlign: 'right' }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ Densidad: nº de apartados ═══ */}
        <Section title="Densidad de información (apartados por dossier)">
          {loading ? <Skeleton width={'100%' as unknown as number} height={180} radius={8} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 6 }}>
                {Object.entries(completeness).map(([k, n]) => {
                  const pct = totalDensity > 0 ? (n / totalDensity) * 100 : 0
                  const color = k === '0' ? '#DC2626' : k === '1-2' ? '#F97316' : k === '3-4' ? '#9CA3AF' : k === '5-6' ? '#84CC16' : '#16A34A'
                  return (
                    <div key={k} style={{ textAlign: 'center', background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #ECECEF' }}>
                      <div style={{ fontSize: 11, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 4 }}>
                        {k} apartados
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>
                        {n.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11.5, color: '#86868b', margin: '10px 0 0', fontStyle: 'italic' }}>
                Apartados disponibles: identidad, trayectoria, posiciones, redes, declaraciones, controversias, evidencia.
                7 = dossier completo.
              </p>
            </>
          )}
        </Section>

        {/* ═══ Top conectados + controversias en paralelo ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
          <Section title={`Top conectados (más relaciones · ${topRedes.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topRedes.map((x, i) => (
                <Link key={x.slug} href={`/dosieres/${x.slug}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 6, textDecoration: 'none',
                  color: '#1d1d1f', background: i === 0 ? '#FFFBEB' : '#fff',
                  border: '1px solid #ECECEF', fontSize: 12.5,
                }}>
                  <span>
                    <span style={{ fontSize: 11, color: '#86868b', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                    <strong style={{ fontWeight: 600 }}>{x.nombre}</strong>
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#0EA5E9',
                    background: '#E6F4FB', padding: '2px 8px', borderRadius: 4,
                  }}>
                    {x.n} contactos
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <Section title={`Top controversias (${topControversias.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topControversias.map((x, i) => (
                <Link key={x.slug} href={`/dosieres/${x.slug}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 6, textDecoration: 'none',
                  color: '#1d1d1f', background: i === 0 ? '#FBEAEA' : '#fff',
                  border: '1px solid #ECECEF', fontSize: 12.5,
                }}>
                  <span>
                    <span style={{ fontSize: 11, color: '#86868b', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                    <strong style={{ fontWeight: 600 }}>{x.nombre}</strong>
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#DC2626',
                    background: '#FBEAEA', padding: '2px 8px', borderRadius: 4,
                  }}>
                    {x.n} casos
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#86868b' }}>
          Datos en vivo · {totalAPI} del backend + {totalIBEX + totalDIP} seeds locales.
          Top conectados/controversias solo cubren seeds locales (los del backend no exponen el conteo de items por apartado).
        </p>
      </main>
    </div>
  )
}

// ── Componentes auxiliares ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
      padding: '20px 24px', marginBottom: 16,
    }}>
      <h2 style={{
        fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: '0 0 16px',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{title}</h2>
      {children}
    </section>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: '1px solid #ECECEF', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color,
      }} />
      <div style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: 32, fontWeight: 700, color: '#1d1d1f',
        fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
      </div>
    </div>
  )
}
