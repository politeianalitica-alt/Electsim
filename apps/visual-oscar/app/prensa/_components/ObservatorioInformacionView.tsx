'use client'
/**
 * `<ObservatorioInformacionView />` · Sprint G15 FASE G
 *
 * Reemplaza el render mínimo de la tab "Observatorio de Información"
 * (antes "Desinformación"), que sólo mostraba DesinformacionLive
 * (un buscador Google Fact Check).
 *
 * Ahora la tab responde a las cuatro preguntas del brief:
 *   1. ¿Qué bulos están activos? · feed agregado EFE/Newtral/Maldita
 *   2. ¿Qué temas concentran desinformación? · top categorías
 *   3. ¿A quién perjudica? · actores más atacados por bulos
 *   4. ¿Está acelerando o decreciendo? · tendencia temporal compacta
 *
 * Más el buscador puntual de claims (DesinformacionLive) que ya existía.
 *
 * Data source: `/api/news/desinformacion` (el endpoint que ya alimenta
 * la página dedicada `/prensa/desinformacion`). No se crea endpoint nuevo.
 *
 * Si el endpoint está caído (NewsAPI rate-limit, etc.), el componente
 * renderiza sólo el buscador puntual sin romper la tab.
 */
import { useEffect, useState } from 'react'
import { DesinformacionLive } from './DesinformacionLive'
import { DsaTransparencyPanel } from './DsaTransparencyPanel'

const ACCENT = '#B91C1C'

interface ActorAfectado {
  actor: string
  n: number
  veredictosNegativos: number
  temas?: string[]
  tendencia?: 'creciente' | 'estable' | 'decreciente'
}
interface SummaryShape {
  agregado: {
    totalItems: number
    porFuente?: Record<string, number>
    porVeredicto: Record<string, number>
    porTema: Array<{ tema: string; n: number }>
    actoresAfectados: ActorAfectado[]
    alcanceViral?: number
  }
  tendenciasTemporales?: Array<{ fecha: string; total: number; bulos: number }>
}

export function ObservatorioInformacionView() {
  const [summary, setSummary] = useState<SummaryShape | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const r = await fetch('/api/news/desinformacion?limit=80', { cache: 'no-store' })
        if (!r.ok) {
          if (mounted) setError(`HTTP ${r.status}`)
          return
        }
        const d = await r.json()
        if (mounted) setSummary(d)
      } catch (e: any) {
        if (mounted) setError(String(e?.message ?? e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sumario agregado */}
      <SummarySection summary={summary} loading={loading} error={error} />

      {/* Transparencia de plataformas · moderación DSA (Comisión Europea) ·
          complementa a los fact-checkers: aquéllos miden qué bulos circulan,
          éste mide cómo responden las plataformas (cuánto retiran/restringen). */}
      <DsaTransparencyPanel />

      {/* Buscador puntual · Google Fact Check */}
      <DesinformacionLive />

      {/* Footer · link a página dedicada */}
      <p style={{
        margin: 0, fontSize: 10, color: '#94a3b8', textAlign: 'right',
        padding: '6px 4px',
      }}>
        ¿Quieres el análisis completo (timeline diario, alcance, drill por bulo)?{' '}
        <a href="/prensa/desinformacion" style={{ color: ACCENT, fontWeight: 600 }}>
          Abrir Observatorio dedicado →
        </a>
      </p>
    </div>
  )
}

function SummarySection({
  summary, loading, error,
}: {
  summary: SummaryShape | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <section style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
        padding: 14, borderLeft: `4px solid ${ACCENT}`,
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
          Cargando agregado de desinformación…
        </p>
      </section>
    )
  }
  if (error || !summary) {
    return (
      <section style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
        padding: 14, borderLeft: `4px solid ${ACCENT}`,
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#991b1b', fontWeight: 600 }}>
          ▲ Sumario agregado no disponible {error ? `(${error})` : ''}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
          El buscador puntual sigue activo abajo · accede al
          <a href="/prensa/desinformacion" style={{ color: ACCENT, marginLeft: 4 }}>observatorio dedicado</a>
          {' '}para análisis completo.
        </p>
      </section>
    )
  }

  const agg = summary.agregado
  const bulos = agg.porVeredicto?.bulo || 0
  const engañosos = agg.porVeredicto?.engañoso || 0
  const sinContexto = agg.porVeredicto?.['sin-contexto'] || 0
  const verdaderos = agg.porVeredicto?.verdadero || 0

  // Tendencia compacta · % de bulos en los últimos 7 días vs los 7 previos
  const tt = summary.tendenciasTemporales || []
  let tendenciaPct = 0
  let tendenciaLabel = 'estable'
  if (tt.length >= 14) {
    const last7 = tt.slice(-7).reduce((s, d) => s + (d.bulos || 0), 0)
    const prev7 = tt.slice(-14, -7).reduce((s, d) => s + (d.bulos || 0), 0)
    if (prev7 > 0) {
      tendenciaPct = ((last7 - prev7) / prev7) * 100
      tendenciaLabel = tendenciaPct > 20 ? 'acelerando' : tendenciaPct < -20 ? 'cayendo' : 'estable'
    }
  }
  const tendColor = tendenciaLabel === 'acelerando' ? '#dc2626' : tendenciaLabel === 'cayendo' ? '#16a34a' : '#64748b'

  return (
    <section style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: 14, borderLeft: `4px solid ${ACCENT}`,
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: ACCENT, textTransform: 'uppercase' }}>
          ◆ Observatorio · agregado de fact-checkers ES
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Datos en vivo de <strong>EFE Verifica · Newtral · Maldita.es</strong>.
          {' '}Mide tres cosas: ¿qué <strong>temas</strong> concentran bulos · qué
          {' '}<strong>actores</strong> los reciben · si la cosa <strong>acelera</strong> esta semana.
        </p>
      </header>

      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12,
      }}>
        <Kpi label="Verificaciones" value={String(agg.totalItems)} color="#0f172a" />
        <Kpi label="Bulos" value={String(bulos)} color="#dc2626" />
        <Kpi label="Engañosos" value={String(engañosos)} color="#f59e0b" />
        <Kpi label="Sin contexto" value={String(sinContexto)} color="#0891b2" />
        <Kpi label="Verdaderos" value={String(verdaderos)} color="#16a34a" />
        <Kpi
          label="Tendencia 7d"
          value={tendenciaPct === 0 ? '—' : `${tendenciaPct > 0 ? '+' : ''}${tendenciaPct.toFixed(0)}%`}
          color={tendColor}
          sub={tendenciaLabel}
        />
      </div>

      {/* Top temas + actores en 2 columnas */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
      }}>
        <SubBlock title="Temas con más desinformación">
          {agg.porTema.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin temas con desinfo activa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {agg.porTema.slice(0, 6).map((t) => (
                <div key={t.tema} style={{
                  display: 'grid', gridTemplateColumns: '1fr 40px', gap: 6, alignItems: 'center',
                  fontSize: 11, padding: '3px 6px', background: '#fef2f2', borderRadius: 3,
                }}>
                  <span style={{ color: '#0f172a', textTransform: 'capitalize' }}>{t.tema}</span>
                  <span style={{ color: '#991b1b', fontWeight: 700, fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{t.n}</span>
                </div>
              ))}
            </div>
          )}
        </SubBlock>
        <SubBlock title="Actores más perjudicados">
          {agg.actoresAfectados.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin patrón claro de víctimas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {agg.actoresAfectados.slice(0, 6).map((a) => {
                const tend = a.tendencia
                const tIcon = tend === 'creciente' ? '↑' : tend === 'decreciente' ? '↓' : '·'
                const tColor = tend === 'creciente' ? '#dc2626' : tend === 'decreciente' ? '#16a34a' : '#94a3b8'
                return (
                  <div key={a.actor} style={{
                    display: 'grid', gridTemplateColumns: '1fr 50px 20px', gap: 6, alignItems: 'center',
                    fontSize: 11, padding: '3px 6px', background: '#fef2f2', borderRadius: 3,
                  }}>
                    <span style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.actor}>
                      {a.actor}
                    </span>
                    <span style={{ color: '#991b1b', fontWeight: 700, fontFamily: 'ui-monospace, monospace', textAlign: 'right', fontSize: 10 }}>
                      {a.veredictosNegativos}/{a.n}
                    </span>
                    <span style={{ color: tColor, fontWeight: 700, textAlign: 'right' }} title={`tendencia: ${tend || 'estable'}`}>
                      {tIcon}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SubBlock>
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
        Origen: <code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2 }}>/api/news/desinformacion</code> ·
        feeds RSS oficiales · agregado en backend · NO IA, sólo veredictos firmados por fact-checkers.
      </p>
    </section>
  )
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px',
      borderLeft: `3px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color, lineHeight: 1.2, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </p>
      {sub && <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{sub}</p>}
    </div>
  )
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default ObservatorioInformacionView
