'use client'
/**
 * `<SegmentLanding segmentId />` · Sprint N4.
 *
 * Landing para un segmento poblacional de hogares-empleo-vivienda
 * (jovenes-25-34, hipotecados, inquilinos, hogares-vulnerables, rentas-bajas).
 *
 * Reutiliza arquitectura: fetcha overview del subtab + filtra indicadores
 * prioritarios del segmento + cargar análisis Groq específico para esa cohorte.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { getHogaresSegment, listHogaresSegments } from '@/lib/macro/hogares-segments'
import { getSubtab } from '@/lib/macro/subtab-registry'
import { DatosGobRadar } from './DatosGobRadar'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface OverviewResp {
  ok: boolean
  byId: Record<string, PulsoFetchResult>
  termometro: { score: number }
}

interface Props { segmentId: string }

export function SegmentLanding({ segmentId }: Props) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const segment = getHogaresSegment(segmentId)
  const subtab = getSubtab('hogares-empleo-vivienda')
  const [overview, setOverview] = useState<OverviewResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!segment) { setLoading(false); return }
    let alive = true
    fetch('/api/macro/hogares-empleo-vivienda/overview', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setOverview(j as OverviewResp) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [segment])

  if (!segment) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ color: '#dc2626' }}>Segmento no encontrado</h1>
          <p style={{ color: '#64748b' }}>
            El segmento <code>{segmentId}</code> no está registrado.{' '}
            <Link href="/macro?tab=hogares-empleo-vivienda" style={{ color: '#0F766E' }}>
              Volver a Hogares
            </Link>
          </p>
        </main>
      </div>
    )
  }

  const priorityData = segment.priorityIndicators.map((id) => ({
    id,
    label: subtab?.indicators.find((i) => i.id === id)?.shortLabel || id,
    unit: subtab?.indicators.find((i) => i.id === id)?.unit || '',
    result: overview?.byId?.[id],
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href="/macro?tab=hogares-empleo-vivienda" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Hogares</Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Segmento · {segment.label}</span>
        </div>

        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: segment.accent, textTransform: 'uppercase' }}>
            Segmento social
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
            {segment.label}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569', maxWidth: 760, lineHeight: 1.55 }}>
            {segment.description}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#0f172a', fontStyle: 'italic', maxWidth: 760, fontWeight: 600 }}>
            🔎 {segment.analyticalQuestion}
          </p>
        </header>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Cargando indicadores filtrados para {segment.label}…
          </div>
        )}

        {overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Indicadores prioritarios del segmento */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${segment.accent}`, borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: segment.accent, textTransform: 'uppercase' }}>
                Indicadores prioritarios · {priorityData.length} variables clave
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Las que más afectan a este segmento, filtradas del catálogo hogares-empleo-vivienda
              </p>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {priorityData.map((p) => (
                  <Link
                    key={p.id}
                    href={`/macro/hogares-empleo-vivienda/indicator/${p.id}`}
                    style={{ display: 'block', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, textDecoration: 'none', color: '#0f172a' }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{p.label}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: segment.accent, fontVariantNumeric: 'tabular-nums' as any }}>
                      {p.result?.last?.value != null ? `${p.result.last.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}${p.unit}` : '—'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>
                      {p.result?.last?.period || 'sin dato'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Lectura analítica */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#7c3aed', textTransform: 'uppercase' }}>
                Lectura analítica del segmento
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                {segment.description}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: '#0f172a', lineHeight: 1.6 }}>
                <strong>Pregunta crítica:</strong> {segment.analyticalQuestion}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                Nota: análisis Groq por segmento llegará en próxima iteración (requiere endpoint /api/macro/ai/analyze-segment).
                Mientras tanto, click en cada indicador arriba para análisis IA específico de la serie.
              </p>
            </section>

            {/* Datos.gob.es radar específico del segmento */}
            <DatosGobRadar subtabSlug="hogares-empleo-vivienda" keywords={segment.relatedKeywords} />

            {/* Navegación entre segmentos */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
                Otros segmentos sociales
              </p>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {listHogaresSegments().filter((s) => s.id !== segment.id).map((s) => (
                  <Link
                    key={s.id}
                    href={`/macro/hogares-empleo-vivienda/segment/${s.id}`}
                    style={{ background: '#f8fafc', border: `1px solid ${s.accent}`, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: s.accent, textDecoration: 'none', fontWeight: 600 }}
                  >
                    {s.shortLabel}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default SegmentLanding
