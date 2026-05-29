'use client'
import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  PARTIDOS,
  partyKey,
  REPS_BY_PARTY,
  BLOC_GOB,
  MEDIOS_PRO_GOB,
  MEDIOS_ANTI_GOB,
} from '@/lib/partidos-data'
import { PARTIDO_EXTRA } from '@/data/partidos-extra'

const wrap: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', padding: '0 20px 60px' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginTop: 18 }
const h2: React.CSSProperties = { margin: '0 0 12px', fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: '#1f2937' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#86868b' }

function Chips({ items, color, max = 40 }: { items: Array<{ slug: string; nombre_completo?: string; nombre?: string }>; color: string; max?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {items.slice(0, max).map((d) => (
        <Link key={d.slug} href={`/dosieres/${d.slug}`}
          style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 999, background: `${color}12`, color: '#3a3a3d', textDecoration: 'none', border: `1px solid ${color}33` }}>
          {d.nombre_completo || d.nombre || d.slug}
        </Link>
      ))}
      {items.length > max && (
        <Link href="/dosieres" style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 999, color, textDecoration: 'none', fontWeight: 700 }}>
          +{items.length - max} más en /dosieres →
        </Link>
      )}
    </div>
  )
}

export default function PartidoDetalle() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const params = useParams<{ slug: string }>()
  const slug = params?.slug

  const p = useMemo(() => PARTIDOS.find((x) => x.id === slug), [slug])
  const extra = slug ? PARTIDO_EXTRA[slug] : undefined
  const pk = p ? partyKey(p.siglas) : ''
  const reps = (pk && REPS_BY_PARTY[pk]) || { diputados: [], senadores: [] }
  const medios = BLOC_GOB.has(pk) ? MEDIOS_PRO_GOB : MEDIOS_ANTI_GOB
  const maxEsc = useMemo(() => Math.max(1, ...(extra?.historial?.map((h) => h.escanos) || [1])), [extra])

  if (!p) {
    return (
      <div style={{ background: '#f5f5f7', minHeight: '100vh' }}>
        <AppHeader />
        <main style={wrap}>
          <p style={{ marginTop: 40, color: '#6b7280' }}>Partido no encontrado. <Link href="/partidos">← Volver a partidos</Link></p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh' }}>
      <AppHeader />
      <main style={wrap}>
        <p style={{ marginTop: 18, fontSize: 12 }}><Link href="/partidos" style={{ color: '#0071e3', textDecoration: 'none' }}>← Partidos</Link></p>

        {/* Cabecera */}
        <section style={{ ...card, borderTop: `4px solid ${p.color}`, display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
            {p.siglas.slice(0, 4)}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ ...lbl, color: p.color }}>{p.familia} · {p.ambito} · desde {p.fundacion}</div>
            <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#1d1d1f' }}>{p.nombre}</h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#3a3a3d', lineHeight: 1.5 }}>
              <strong>{p.presidente}</strong> · {p.secretario} · {p.grupoUE}
            </p>
            {extra?.descripcion && <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#3a3a3d', lineHeight: 1.6 }}>{extra.descripcion}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.intencion}<span style={{ fontSize: 16 }}>%</span></div>
            <div style={{ fontSize: 11, color: '#86868b' }}>estimación voto</div>
            <div style={{ fontSize: 11, marginTop: 2, color: p.delta30d >= 0 ? '#16A34A' : '#DC2626' }}>{p.delta30d >= 0 ? '▲' : '▼'} {Math.abs(p.delta30d).toFixed(1)} · 30d</div>
          </div>
        </section>

        {/* KPIs de representación */}
        <section style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
          {[
            ['Congreso', p.congreso], ['Senado', p.senado], ['Europa', p.europa],
            ['Govs. CCAA', p.ccaa], ['Alc. >100k', p.alcaldias], ['Afiliados', `${p.afiliados}K`],
            ['Eje izq-dcha', p.ideologia > 0 ? `+${p.ideologia}` : p.ideologia],
          ].map(([l, v]) => (
            <div key={String(l)} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937' }}>{v}</div>
              <div style={lbl}>{l}</div>
            </div>
          ))}
        </section>

        {/* Resultados electorales históricos */}
        {extra?.historial && extra.historial.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Resultados en generales</h2>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {extra.historial.map((h) => (
                <div key={h.eleccion} style={{ textAlign: 'center', flex: '1 1 80px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{h.escanos}</div>
                  <div style={{ height: 90, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', margin: '3px 0' }}>
                    <div style={{ width: 26, height: `${Math.round((h.escanos / maxEsc) * 86) + 4}px`, background: p.color, borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#3a3a3d' }}>{h.pct}%</div>
                  <div style={{ fontSize: 10, color: '#86868b' }}>{h.eleccion}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Representantes en fichas */}
        {(reps.diputados.length > 0 || reps.senadores.length > 0) && (
          <section style={card}>
            <h2 style={h2}>Representantes (fichas) · {reps.diputados.length + reps.senadores.length}</h2>
            {reps.diputados.length > 0 && (<><div style={lbl}>Diputados · Congreso ({reps.diputados.length})</div><Chips items={reps.diputados} color={p.color} /></>)}
            {reps.senadores.length > 0 && (<><div style={{ ...lbl, marginTop: 14 }}>Senadores ({reps.senadores.length})</div><Chips items={reps.senadores} color={p.color} /></>)}
          </section>
        )}

        {/* Alianzas y conflictos */}
        {(extra?.alianzas || extra?.conflictos) && (
          <section style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <div>
              <h2 style={{ ...h2, color: '#16A34A' }}>Alianzas</h2>
              {(extra.alianzas || []).map((a) => (
                <div key={a} style={{ fontSize: 13, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: '#16A34A', fontWeight: 700 }}>+ </span>{a}</div>
              ))}
            </div>
            <div>
              <h2 style={{ ...h2, color: '#DC2626' }}>Conflictos</h2>
              {(extra.conflictos || []).map((c) => (
                <div key={c} style={{ fontSize: 13, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: '#DC2626', fontWeight: 700 }}>− </span>{c}</div>
              ))}
            </div>
          </section>
        )}

        {/* Medios afines a su bloque */}
        {medios.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Medios afines a su bloque · {medios.length}</h2>
            <p style={{ ...lbl, fontWeight: 500, textTransform: 'none', color: '#86868b', margin: '0 0 2px' }}>
              {BLOC_GOB.has(pk) ? 'Periodistas con relación favorable al Gobierno (bloque del partido).' : 'Periodistas más críticos con el Gobierno (afines a la oposición).'}
            </p>
            <Chips items={medios} color={p.color} max={20} />
          </section>
        )}

        {/* Financiación */}
        {extra?.financiacion && (
          <section style={card}>
            <h2 style={h2}>Financiación</h2>
            <p style={{ fontSize: 13.5, color: '#3a3a3d', lineHeight: 1.6, margin: 0 }}>{extra.financiacion.texto}</p>
            {extra.financiacion.fuente && (
              <a href={extra.financiacion.fuente} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                Tribunal de Cuentas · fiscalización de partidos ↗
              </a>
            )}
          </section>
        )}

        {/* Cronología */}
        {extra?.cronologia && extra.cronologia.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Cronología</h2>
            <div style={{ borderLeft: `2px solid ${p.color}40`, paddingLeft: 16 }}>
              {extra.cronologia.map((c) => (
                <div key={c.anio + c.hito} style={{ marginBottom: 12, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -21, top: 3, width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{c.anio}</div>
                  <div style={{ fontSize: 13, color: '#3a3a3d', lineHeight: 1.45 }}>{c.hito}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fortalezas / debilidades */}
        <section style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          <div>
            <h2 style={{ ...h2, color: '#16A34A' }}>Fortalezas</h2>
            {p.fortalezas.map((f) => <div key={f} style={{ fontSize: 13, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: '#16A34A', fontWeight: 700 }}>+ </span>{f}</div>)}
          </div>
          <div>
            <h2 style={{ ...h2, color: '#B45309' }}>Debilidades</h2>
            {p.debilidades.map((d) => <div key={d} style={{ fontSize: 13, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: '#B45309', fontWeight: 700 }}>− </span>{d}</div>)}
          </div>
        </section>

        <p style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: '#86868b' }}>
          {p.web} · {p.twitter} · Resultados electorales: Ministerio del Interior · Financiación: Tribunal de Cuentas
        </p>
      </main>
    </div>
  )
}
