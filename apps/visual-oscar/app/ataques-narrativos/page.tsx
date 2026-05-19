'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useAtaquesNarrativos } from '@/hooks/narrativa/useAtaquesNarrativos'
import { Sparkline } from './_components/Sparkline'
import { BigSparkline } from './_components/BigSparkline'
import { MiniKPI } from './_components/MiniKPI'
import type { Severidad, FaseAtaque, TipoAtaque, Plataforma, PosicionAmplificador } from '@/types/narrativa'

const SEV_META: Record<Severidad, { color: string }> = {
  'CRÍTICA': { color: '#DC2626' }, 'ALTA': { color: '#F97316' },
  'MEDIA':   { color: '#EAB308' }, 'BAJA': { color: '#0EA5E9' },
}
const TIPO_META: Record<TipoAtaque, { color: string }> = {
  'Desinformación':        { color: '#7C3AED' },
  'Bulo viral':            { color: '#DC2626' },
  'Hashtag coordinado':    { color: '#F97316' },
  'Fake video / deepfake': { color: '#9333EA' },
  'Astroturfing':          { color: '#0EA5E9' },
  'Doxing':                { color: '#525258' },
  'Smear campaign':        { color: '#B45309' },
}
const FASE_META: Record<FaseAtaque, { color: string; pct: number }> = {
  'Detectado': { color: '#0EA5E9', pct: 15 },
  'Escalando': { color: '#F97316', pct: 40 },
  'Pico':      { color: '#DC2626', pct: 65 },
  'Decayendo': { color: '#16A34A', pct: 85 },
  'Cerrado':   { color: '#525258', pct: 100 },
}
const PLAT_COLOR: Record<Plataforma, string> = {
  'X (Twitter)': '#000000', 'Facebook': '#1877F2', 'TikTok': '#FF0050',
  'Telegram': '#0088CC', 'Instagram': '#E4405F', 'YouTube': '#FF0000',
  'Foros': '#525258', 'WhatsApp': '#25D366',
}
const POS_COLOR: Record<PosicionAmplificador, string> = {
  'A favor': '#16A34A', 'En contra': '#DC2626', 'Neutral': '#6e6e73',
}
const ACC_COLOR: Record<string, string> = {
  'Pendiente': '#6e6e73', 'En curso': '#5B21B6', 'Completada': '#16A34A',
}
const AMP_TIPO_COLOR: Record<string, string> = {
  'Bot detectado': '#DC2626', 'Político': '#1F4E8C', 'Medio': '#7C3AED', 'Influencer': '#F97316',
}

export default function AtaquesNarrativosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { ataques, loading, totals, topHashtags, topAmplificadores } = useAtaquesNarrativos()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'evolucion' | 'amplificadores' | 'patrones' | 'plan'>('evolucion')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')

  useEffect(() => {
    if (ataques.length > 0 && !selectedId) setSelectedId(ataques[0].id)
  }, [ataques, selectedId])

  const selected = useMemo(() => ataques.find(a => a.id === selectedId), [ataques, selectedId])
  const visibles = useMemo(
    () => ataques.filter(a => filterSev === 'Todas' || a.severidad === filterSev),
    [ataques, filterSev]
  )

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppHeader />
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '80px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
          Cargando monitor de ataques narrativos…
        </div>
      </div>
    )
  }

  if (!selected) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppHeader />
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '80px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
          Sin ataques narrativos detectados actualmente.
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        <AttackRiskContext/>

        {/* ───── Hero ───── */}
        <section style={{
          background: 'linear-gradient(135deg,#0f172a 0%,#0a0f1f 100%)',
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32,
          alignItems: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, #DC2626aa 0%, transparent 65%)' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.7, textTransform: 'uppercase', margin: '0 0 8px' }}>
              <span style={{ color: '#FCA5A5' }}>●</span> RIESGO · DETECCIÓN DE ATAQUES NARRATIVOS
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {totals.activos} ataques activos{' '}
              <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>requieren respuesta</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
              {totals.criticos} crítica(s) · {totals.altos} alta(s) · {totals.sospAvg}% cuentas sospechosas detectadas en media.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, position: 'relative' }}>
            <HeroKPI label="Ataques"  value={String(totals.total)}    accent="#FCA5A5" />
            <HeroKPI label="Críticos" value={String(totals.criticos)} accent="#DC2626" />
            <HeroKPI label="Activos"  value={String(totals.activos)}  accent="#F97316" />
            <HeroKPI label="% Susp."  value={`${totals.sospAvg}%`}    accent="#EAB308" />
          </div>
        </section>

        {/* ───── Filtro ───── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Severidad:</span>
          <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
            {(['Todas', 'CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
                <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: active ? '#fff' : 'transparent', color: active ? col : '#6e6e73',
                  border: 'none', borderRadius: 999, padding: '4px 12px',
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{s}</button>
              )
            })}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#6e6e73' }}>{visibles.length} ataques visibles</span>
        </div>

        {/* ───── Grid de tarjetas ───── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 10, marginBottom: 18 }}>
          {visibles.map(a => {
            const sev = SEV_META[a.severidad]
            const tm = TIPO_META[a.tipo]
            const fm = FASE_META[a.fase]
            const active = a.id === selectedId
            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                background: '#fff', border: `1px solid ${active ? sev.color : '#ECECEF'}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${sev.color}`, padding: 0,
              }}>
                <header style={{ padding: '12px 14px 8px', borderBottom: '1px solid #F5F5F7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 4, background: sev.color, color: '#fff' }}>● {a.severidad}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 4, background: `${tm.color}15`, color: tm.color, border: `1px solid ${tm.color}40` }}>{a.tipo.toUpperCase()}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 999, background: `${fm.color}15`, color: fm.color, border: `1px solid ${fm.color}40` }}>{a.fase.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.25 }}>{a.titulo}</h3>
                  <div style={{ fontSize: 10.5, color: '#6e6e73' }}>Target: <strong style={{ color: '#3a3a3d' }}>{a.target}</strong></div>
                </header>
                <div style={{ padding: '10px 14px' }}>
                  <Sparkline data={a.evolucion} color={sev.color} h={36} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
                    <MiniKPI label="Alcance" value={a.alcance.split(' ')[0]} sub="impres." color={sev.color} />
                    <MiniKPI label="% Susp." value={`${a.cuentasSospechosas}%`} sub="cuentas" color="#5B21B6" />
                    <MiniKPI label="Plataf." value={String(a.plataformas.length)} sub="afectadas" color="#0EA5E9" />
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Detalle ───── */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
          padding: '18px 24px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          borderLeft: `5px solid ${SEV_META[selected.severidad].color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: '1 1 460px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 6, background: SEV_META[selected.severidad].color, color: '#fff' }}>● {selected.severidad}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: `${TIPO_META[selected.tipo].color}15`, color: TIPO_META[selected.tipo].color, border: `1px solid ${TIPO_META[selected.tipo].color}40` }}>{selected.tipo.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600 }}>· INICIO: {selected.inicio}</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, letterSpacing: '-0.018em', margin: '0 0 4px', color: '#1d1d1f', lineHeight: 1.2 }}>{selected.titulo}</h2>
              <p style={{ margin: '0 0 6px', fontSize: 11.5, color: '#6e6e73' }}>Target: <strong style={{ color: '#3a3a3d' }}>{selected.target}</strong></p>
              <p style={{ margin: 0, fontSize: 13, color: '#3a3a3d', lineHeight: 1.5 }}>{selected.narrativa}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,auto)', gap: 8 }}>
              <CardKPI label="Alcance"  value={selected.alcance.split(' ')[0]} sub="impres."    color={SEV_META[selected.severidad].color} />
              <CardKPI label="% Susp."  value={`${selected.cuentasSospechosas}`} sub="% cuentas" color="#5B21B6" />
              <CardKPI label="Plataf."  value={String(selected.plataformas.length)} sub="afectadas" color="#0EA5E9" />
              <CardKPI label="Hashtags" value={String(selected.hashtags.length)} sub="trackeados" color="#16A34A" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>Fase: <span style={{ color: FASE_META[selected.fase].color }}>{selected.fase}</span></span>
              <span>{FASE_META[selected.fase].pct}% del ciclo</span>
            </div>
            <div style={{ display: 'flex', height: 8, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
              {(['Detectado', 'Escalando', 'Pico', 'Decayendo', 'Cerrado'] as FaseAtaque[]).map(f => {
                const isPast = FASE_META[f].pct <= FASE_META[selected.fase].pct
                return (
                  <div key={f} style={{
                    flex: 1, background: isPast ? FASE_META[selected.fase].color : 'transparent',
                    borderRight: f !== 'Cerrado' ? '2px solid #fff' : 'none',
                  }} />
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, marginBottom: 14, flexWrap: 'wrap' }}>
          {([
            { k: 'evolucion',      label: 'Evolución y plataformas', count: 24 },
            { k: 'amplificadores', label: 'Amplificadores',          count: selected.amplificadores.length },
            { k: 'patrones',       label: 'Patrones detectados',     count: selected.patrones.length },
            { k: 'plan',           label: 'Plan de respuesta',       count: selected.acciones.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 14px',
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label}
                <span style={{ marginLeft: 5, color: active ? SEV_META[selected.severidad].color : '#6e6e73', fontWeight: 700, fontSize: 10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB: Evolución ───── */}
        {tab === 'evolucion' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.012em' }}>Evolución de menciones · últimas 24 h</h3>
                <span style={{ fontSize: 11, color: '#6e6e73' }}>Resolución horaria</span>
              </div>
              <BigSparkline data={selected.evolucion} color={SEV_META[selected.severidad].color} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#86868b', fontWeight: 600, marginTop: 4 }}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>ahora</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 800, color: '#3a3a3d', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hashtags rastreados</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.hashtags.map(h => (
                    <span key={h.h} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                      background: h.hostil ? '#FEF2F2' : '#F0F9FF',
                      color: h.hostil ? '#DC2626' : '#0369A1',
                      border: `1px solid ${h.hostil ? '#FECACA' : '#BAE6FD'}`,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      {h.h} <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, opacity: 0.85 }}>{h.vol}K</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.012em' }}>Plataformas afectadas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.plataformas.map(pl => (
                  <div key={pl.p}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: PLAT_COLOR[pl.p], display: 'inline-block' }} />
                        {pl.p}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: PLAT_COLOR[pl.p] }}>{pl.peso}%</span>
                    </div>
                    <div style={{ height: 7, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pl.peso}%`, height: '100%', background: PLAT_COLOR[pl.p], borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB: Amplificadores ───── */}
        {tab === 'amplificadores' && (
          <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#FAFAFB', borderBottom: '2px solid #ECECEF' }}>
                    {['#', 'Cuenta', 'Tipo', 'Seguidores', 'Posición', 'Menciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...selected.amplificadores].sort((a, b) => b.menciones - a.menciones).map((am, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #ECECEF', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1d1d1f' }}>{am.nombre}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 4, background: AMP_TIPO_COLOR[am.tipo] ?? '#525258', color: '#fff' }}>
                          {am.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 600, color: '#1d1d1f' }}>{am.seguidores}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 999, background: `${POS_COLOR[am.posicion]}15`, color: POS_COLOR[am.posicion], border: `1px solid ${POS_COLOR[am.posicion]}40` }}>
                          {am.posicion.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${Math.min(100, (am.menciones / (selected.amplificadores[0]?.menciones || 1)) * 100)}%`, height: '100%', background: POS_COLOR[am.posicion] }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', minWidth: 36, textAlign: 'right' }}>{am.menciones}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB: Patrones ───── */}
        {tab === 'patrones' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 10 }}>
            {selected.patrones.map((p, i) => (
              <article key={i} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
                padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft: `3px solid ${SEV_META[p.severidad].color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: SEV_META[p.severidad].color, fontWeight: 800 }}>!</span>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 4, background: SEV_META[p.severidad].color, color: '#fff' }}>{p.severidad}</span>
                </div>
                <h4 style={{ margin: '0 0 5px', fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.012em' }}>{p.tipo}</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.45 }}>{p.evidencia}</p>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB: Plan ───── */}
        {tab === 'plan' && (
          <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 680 }}>
                <thead>
                  <tr style={{ background: '#FAFAFB', borderBottom: '2px solid #ECECEF' }}>
                    {['Acción', 'Plazo', 'Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.acciones.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #ECECEF', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1d1d1f' }}>{a.accion}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', color: '#1d1d1f', whiteSpace: 'nowrap' }}>{a.plazo}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999, background: `${ACC_COLOR[a.estado]}15`, color: ACC_COLOR[a.estado], border: `1px solid ${ACC_COLOR[a.estado]}40` }}>
                          {a.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── Sección agregada ───── */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginTop: 18 }}>
          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.012em' }}>Top hashtags hostiles · agregado</h3>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: '#6e6e73' }}>De los {ataques.length} ataques activos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {topHashtags.map((h, i) => (
                <div key={h.h} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#DC2626' }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#7F1D1D' }}>{h.h}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#DC2626' }}>{h.v}K</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.012em' }}>Top amplificadores · agregado</h3>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: '#6e6e73' }}>Cuentas con más menciones en campañas activas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {topAmplificadores.map((a, i) => (
                <div key={a.nombre} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', gap: 10, alignItems: 'center', padding: '7px 10px', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 4, background: AMP_TIPO_COLOR[a.tipo] ?? '#525258', color: '#fff' }}>
                    {a.tipo.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: POS_COLOR[a.pos as PosicionAmplificador] ?? '#6e6e73' }}>{a.menciones}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '18px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Detección de Ataques Narrativos · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function AttackRiskContext() {
  const [media, setMedia] = useState<{ score: number; label: string; colors: { low: string; medium: string; high: string; critical: string } } | null>(null)
  const [scenario, setScenario] = useState<{ name: string; probability: number | null; horizon_days: number } | null>(null)
  useEffect(() => {
    fetch('/api/risk-v2/indices?country=ES')
      .then(r => r.json())
      .then(j => {
        const m = (j.indices ?? []).find((i: { index_id: string }) => i.index_id === 'riesgo_mediatico')
        if (m) setMedia({ score: m.score, label: m.label, colors: m.colors })
      })
      .catch(() => {})
    fetch('/api/risk-v2/scenarios?country=ES')
      .then(r => r.json())
      .then(j => {
        const s = (j.scenarios ?? []).find((x: { scenario_id: string }) => x.scenario_id === 'crisis_mediatica')
        if (s) setScenario({ name: s.name, probability: s.probability, horizon_days: s.horizon_days })
      })
      .catch(() => {})
  }, [])
  if (!media && !scenario) return null
  const colorFor = (label: string, c: { low: string; medium: string; high: string; critical: string }) => {
    if (label === 'BAJO') return c.low
    if (label === 'MEDIO') return c.medium
    if (label === 'ALTO') return c.high
    return c.critical
  }
  return (
    <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
      padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center',
      gap:14, flexWrap:'wrap', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
      Contexto · Riesgo mediático estructural
      </div>
      {media && (
        <span style={{
          fontSize:11, fontWeight:700, color:'#fff',
          background: colorFor(media.label, media.colors),
          padding:'4px 10px', borderRadius:5,
        }}>
          Riesgo mediático {media.score}/100 · {media.label}
        </span>
      )}
      {scenario?.probability != null && (
        <span style={{
          fontSize:11, fontWeight:700, color:'#7C3AED',
          padding:'4px 10px', background:'#F3E8FF', border:'1px solid #DDD6FE', borderRadius:5,
        }}>
          P(crisis mediática {scenario.horizon_days}d): {scenario.probability.toFixed(0)}%
        </span>
      )}
      <Link href="/riesgo" style={{
        fontSize:11, fontWeight:600, color:'#0c4a6e', textDecoration:'none', marginLeft:'auto',
      }}>Ver termómetro completo →</Link>
    </section>
  )
}

function HeroKPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: `1px solid ${accent}55` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, lineHeight: 1, color: '#fff', letterSpacing: '-0.018em' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, marginTop: 4, color: accent }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 80, padding: '8px 12px', background: '#FAFAFB', borderRadius: 10, border: '1px solid #ECECEF' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1, color, letterSpacing: '-0.018em' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6e6e73', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 8.5, color: '#86868b', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
