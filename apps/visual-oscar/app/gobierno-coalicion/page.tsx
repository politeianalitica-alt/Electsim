'use client'

/**
 * /gobierno-coalicion — Composición del Gobierno + apoyos parlamentarios en vivo.
 *
 * 100% dinámico. Combina:
 *   - Catálogo enumerado del Gobierno actual (presidente + 3 VP + 19 ministros)
 *   - Noticias 7d sobre el Gobierno (RSS)
 *   - Iniciativas en tramitación promovidas por el Gobierno
 *   - Sentimiento agregado + tendencia
 *   - Apoyos parlamentarios con conteo de menciones en prensa por partido
 *   - Dossier rico de cada ministro al hacer clic
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import FigureDossierModal from '@/components/FigureDossierModal'

interface Minister {
  id: string; nombre: string; cargo: string; partido: string
  twitter?: string; wikipedia?: string
}
interface Apoyo {
  partido: string; siglas: string; color: string; escanos: number
  rol: string; riesgo: string; observacion?: string; newsCount: number
}

interface Snapshot {
  presidente: Minister
  vicepresidencias: Minister[]
  ministros: Minister[]
  apoyos: Apoyo[]
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number }>
  iniciativas: Array<{ titulo: string; expediente: string; materia: string; kind: string; stage: string; fechaRegistro: string | null; url: string | null }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  stats: { totalEscanosGobierno: number; totalEscanosInvestidura: number; totalEscanosOposicion: number; mayoriaAbsoluta: number }
  updatedAt: string
  error?: string
}

const PARTY_COLOR: Record<string, string> = {
  'PSOE': '#E1322D', 'Sumar': '#D43F8D', 'Independiente': '#525258',
}

const ROL_META: Record<string, { label: string; color: string }> = {
  'gobierno':    { label: 'Gobierno',    color: '#E1322D' },
  'investidura': { label: 'Investidura', color: '#7DB94B' },
  'situacional': { label: 'Situacional', color: '#F97316' },
  'oposicion':   { label: 'Oposición',   color: '#1F4E8C' },
}

const RIESGO_COLOR: Record<string, string> = {
  'bajo': '#16A34A', 'medio': '#F97316', 'alto': '#DC2626',
}

export default function GobiernoCoalicionPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [dossierByName, setDossierByName] = useState<{ name: string; cargo?: string; afiliacion?: string; color?: string } | null>(null)

  useEffect(() => {
    fetch('/api/government/snapshot')
      .then(r => r.json())
      .then(setData)
      .catch(e => setData({ error: String(e) } as Snapshot))
      .finally(() => setLoading(false))
  }, [])

  const apoyoEstable = data ? data.stats.totalEscanosGobierno + data.stats.totalEscanosInvestidura : 0
  const distanciaMayoria = data ? data.stats.mayoriaAbsoluta - apoyoEstable : 0

  function openDossier(m: Minister) {
    setDossierByName({
      name: m.nombre, cargo: m.cargo, afiliacion: m.partido,
      color: PARTY_COLOR[m.partido] || '#525258',
    })
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
        <AppHeader/>
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '40px 28px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Cargando composición del Gobierno + apoyos en vivo…</p>
        </main>
      </div>
    )
  }

  if (!data || data.error) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
        <AppHeader/>
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '40px 28px' }}>
          <p style={{ color: '#DC2626', fontSize: 13 }}>Error: {data?.error || 'no_data'}</p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        <section style={{
          background: 'linear-gradient(135deg,#B45309 0%,#5C2310 100%)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 16, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
              GOBIERNO DE COALICIÓN · XV LEGISLATURA · DATOS EN VIVO
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {data.presidente.nombre} · PSOE-Sumar
            </h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
              {data.ministros.length + data.vicepresidencias.length} ministros · {data.iniciativas.length} iniciativas en tramitación
              {data.noticias.length > 0 && ` · ${data.noticias.length} noticias 7d`}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <KPIHero label="Bloque gobierno" value={data.stats.totalEscanosGobierno}/>
            <KPIHero label="Bloque investidura" value={data.stats.totalEscanosInvestidura}/>
            <KPIHero label="Apoyo estable" value={apoyoEstable} highlight={apoyoEstable >= 176}/>
            <KPIHero label="Mayoría 176" value={distanciaMayoria > 0 ? `−${distanciaMayoria}` : `+${-distanciaMayoria}`} highlight={distanciaMayoria <= 0}/>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#E1322D', textTransform: 'uppercase', margin: '0 0 10px' }}>
                PRESIDENCIA Y VICEPRESIDENCIAS
              </p>
              <MinisterCard m={data.presidente} highlight onClick={() => openDossier(data.presidente)}/>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {data.vicepresidencias.map(vp => (
                  <MinisterCard key={vp.id} m={vp} onClick={() => openDossier(vp)}/>
                ))}
              </div>
            </section>

            <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#525258', textTransform: 'uppercase', margin: '0 0 10px' }}>
                MINISTROS · {data.ministros.length} (clic para dossier en vivo)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {data.ministros.map(m => (
                  <MinisterCard key={m.id} m={m} onClick={() => openDossier(m)}/>
                ))}
              </div>
            </section>

            {data.iniciativas.length > 0 && (
              <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  INICIATIVAS DEL GOBIERNO EN TRAMITACIÓN · {data.iniciativas.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
                  {data.iniciativas.map((it, i) => (
                    <a key={i} href={it.url || '#'} target="_blank" rel="noopener noreferrer" style={{
                      padding: '8px 10px', borderRadius: 8,
                      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: '3px solid #5B21B6',
                      textDecoration: 'none', color: '#1d1d1f',
                    }}>
                      <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#5B21B6', color: '#fff' }}>{it.kind}</span>
                        <span>{it.expediente}</span>
                        <span>· {it.materia}</span>
                        {it.fechaRegistro && <span>· {it.fechaRegistro.slice(0, 10)}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>{it.titulo}</p>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
                SENTIMIENTO MEDIÁTICO (GOBIERNO)
              </p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, height: 10, borderRadius: 5, overflow: 'hidden', background: '#F5F5F7' }}>
                {data.sentimientoAgregado.positivo > 0 && <div style={{ flex: data.sentimientoAgregado.positivo, background: '#16A34A' }}/>}
                {data.sentimientoAgregado.neutral > 0 && <div style={{ flex: data.sentimientoAgregado.neutral, background: '#94A3B8' }}/>}
                {data.sentimientoAgregado.negativo > 0 && <div style={{ flex: data.sentimientoAgregado.negativo, background: '#DC2626' }}/>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>+{data.sentimientoAgregado.positivo}</span>
                <span style={{ color: '#94A3B8' }}>={data.sentimientoAgregado.neutral}</span>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>−{data.sentimientoAgregado.negativo}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#1d1d1f', textAlign: 'center' }}>
                Score <strong style={{ color: data.sentimientoAgregado.score < 0 ? '#DC2626' : '#16A34A', fontSize: 18 }}>{data.sentimientoAgregado.score > 0 ? '+' : ''}{data.sentimientoAgregado.score}</strong>
                {' · '}
                <strong>{data.sentimientoAgregado.tendencia === 'up' ? '↑ mejora' : data.sentimientoAgregado.tendencia === 'down' ? '↓ empeora' : '→ estable'}</strong>
              </p>
            </section>

            <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
                APOYOS PARLAMENTARIOS · CONGRESO 350
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.apoyos.map(a => {
                  const rol = ROL_META[a.rol] || { label: a.rol, color: '#525258' }
                  return (
                    <div key={a.siglas} style={{
                      padding: '7px 10px', borderRadius: 8,
                      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${a.color}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <strong style={{ fontSize: 12, color: '#1d1d1f' }}>{a.siglas}</strong>
                        <span style={{ flex: 1, fontSize: 10, color: '#6e6e73' }}>{a.partido.slice(0, 30)}{a.partido.length > 30 ? '…' : ''}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: a.color }}>{a.escanos}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: `${rol.color}15`, color: rol.color, letterSpacing: '0.04em' }}>{rol.label.toUpperCase()}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: `${RIESGO_COLOR[a.riesgo]}15`, color: RIESGO_COLOR[a.riesgo], letterSpacing: '0.04em' }}>RIESGO {a.riesgo.toUpperCase()}</span>
                        {a.newsCount > 0 && <span style={{ fontSize: 9, color: '#6e6e73' }}>{a.newsCount} mens.</span>}
                      </div>
                      {a.observacion && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6e6e73', fontStyle: 'italic' }}>{a.observacion}</p>}
                    </div>
                  )
                })}
              </div>
            </section>

            {data.noticias.length > 0 && (
              <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 22px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#0F766E', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  ÚLTIMAS NOTICIAS · {data.noticias.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
                  {data.noticias.slice(0, 20).map((n, i) => {
                    const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                    return (
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '6px 9px', borderRadius: 6, fontSize: 11,
                        background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${sc}`,
                        textDecoration: 'none', color: '#1d1d1f',
                      }}>
                        <div style={{ display: 'flex', gap: 5, fontSize: 9.5, color: '#6e6e73', marginBottom: 2 }}>
                          <span style={{ color: sc, fontWeight: 700 }}>{n.medio}</span>
                          {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                        </div>
                        {n.titulo.slice(0, 140)}
                      </a>
                    )
                  })}
                </div>
              </section>
            )}

            <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
              Actualizado · {new Date(data.updatedAt).toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </main>

      <FigureDossierModal
        figureId={null}
        byName={dossierByName}
        onClose={() => setDossierByName(null)}
      />
    </div>
  )
}

function KPIHero({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      background: highlight ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.10)',
      border: '1px solid ' + (highlight ? 'rgba(34,197,94,0.50)' : 'rgba(255,255,255,0.18)'),
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.72, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function MinisterCard({ m, highlight, onClick }: { m: Minister; highlight?: boolean; onClick: () => void }) {
  const color = PARTY_COLOR[m.partido] || '#525258'
  const initials = m.nombre.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <button onClick={onClick} style={{
      display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left',
      padding: highlight ? '14px 16px' : '10px 12px', borderRadius: 10,
      background: highlight ? `${color}10` : '#FAFAFB',
      border: '1px solid ' + (highlight ? `${color}40` : '#ECECEF'),
      borderLeft: `3px solid ${color}`,
      cursor: 'pointer', fontFamily: 'inherit', width: '100%',
    }}>
      <div style={{
        width: highlight ? 44 : 36, height: highlight ? 44 : 36, borderRadius: '50%',
        background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: highlight ? 16 : 12, flexShrink: 0, fontFamily: 'var(--font-display)',
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: highlight ? 14 : 12, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2 }}>{m.nombre}</p>
        <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#6e6e73', lineHeight: 1.3 }}>{m.cargo}</p>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
        background: `${color}15`, color, letterSpacing: '0.04em',
      }}>{m.partido}</span>
    </button>
  )
}
