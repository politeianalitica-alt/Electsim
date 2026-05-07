'use client'

import { useState } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import type { TopPerson } from '../app/api/persons/top-mentioned/route'
import type { PersonProfile } from '../app/api/persons/[name]/profile/route'

const SENTIMENT_COLOR: Record<string, string> = {
  positivo: '#16A34A',
  negativo: '#DC2626',
  neutro:   '#6E6E73',
  mixto:    '#A855F7',
}

export default function TopFigures() {
  const [selected, setSelected] = useState<string | null>(null)

  const { data, source } = useApi<{ persons: TopPerson[]; total_unique: number }>(
    '/api/persons/top-mentioned?hours_back=168&limit=15',
    { refreshInterval: 300_000 }
  )
  const persons = data?.persons ?? []

  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Figuras públicas en el foco
          </h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            Personas más mencionadas en la prensa · {data?.total_unique ?? '—'} únicas detectadas en 7d · click para perfil
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 18 }}>
        {/* List */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxHeight: 600, overflowY: 'auto' }}>
          {persons.length > 0 ? persons.map((p, i) => {
            const isActive = selected === p.name
            const sentColor = p.sent_polarity > 0 ? '#16A34A' : p.sent_polarity < 0 ? '#DC2626' : '#6E6E73'
            return (
              <button
                key={p.name}
                onClick={() => setSelected(isActive ? null : p.name)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  border: 'none', borderLeft: `3px solid ${isActive ? '#1F4E8C' : 'transparent'}`,
                  padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'grid', gridTemplateColumns: '24px 1fr 50px 50px', gap: 8, alignItems: 'center',
                  transition: 'all 160ms',
                  animation: 'pol-fade-in 320ms ease-out', animationDelay: `${i * 25}ms`, animationFillMode: 'backwards',
                  borderBottom: '1px solid var(--hairline)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', textAlign: 'center' }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-2)', textAlign: 'right' }}>
                  <CountUp value={p.mentions}/>
                </span>
                <span style={{ fontSize: 9.5, color: sentColor, fontWeight: 700, textAlign: 'right' }}>
                  {p.sent_polarity > 0 ? '+' : ''}{p.sent_polarity}
                </span>
              </button>
            )
          }) : (
            Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--hairline)' }}>
                <Skeleton width="80%" height={14} radius={4}/>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 320 }}>
          {selected
            ? <PersonDetail name={selected}/>
            : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--ink-4)', fontSize: 13, textAlign: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Selecciona una figura</span>
                <span style={{ fontSize: 11, fontStyle: 'italic' }}>Verás sus menciones, narrativas que le afectan y co-actores.</span>
              </div>
            )}
        </div>
      </div>
    </section>
  )
}

function PersonDetail({ name }: { name: string }) {
  const { data } = useApi<PersonProfile>(
    `/api/persons/${encodeURIComponent(name)}/profile?hours_back=720`,
    { refreshInterval: 0 }   // no auto-refresh aquí, se refresca al cambiar selección
  )

  if (!data) {
    return (
      <div>
        <Skeleton width="50%" height={20} radius={4} style={{ marginBottom: 12 }}/>
        <Skeleton width="100%" height={11} radius={4} style={{ marginBottom: 8 }}/>
        <Skeleton width="80%" height={11} radius={4}/>
      </div>
    )
  }

  const stats = data.stats || { total_mentions: 0, sentiment_breakdown: {}, sentiment_polarity: 0, hours_back: 720 }
  const breakdown = stats.sentiment_breakdown || {}
  const total = Object.values(breakdown).reduce((s: number, v) => s + ((v as number) || 0), 0) || 1

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Perfil enriquecido</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '2px 0 0', letterSpacing: '-0.018em', color: '#1d1d1f' }}>
          {data.name}
        </h3>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <Stat label="Menciones 30d" value={stats.total_mentions}/>
        <Stat label="Polaridad"     value={stats.sentiment_polarity} accent={stats.sentiment_polarity > 0 ? '#16A34A' : stats.sentiment_polarity < 0 ? '#DC2626' : '#6E6E73'} decimals={2}/>
        <Stat label="Co-actores"    value={data.co_persons.length}/>
      </div>

      {/* Sentiment bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
          <div style={{ width: `${(((breakdown.positivo as number) || 0) / total) * 100}%`, background: '#16A34A', transition: 'width 600ms' }}/>
          <div style={{ width: `${(((breakdown.neutro as number) || 0) / total) * 100}%`, background: '#9CA3AF', transition: 'width 600ms' }}/>
          <div style={{ width: `${(((breakdown.negativo as number) || 0) / total) * 100}%`, background: '#DC2626', transition: 'width 600ms' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--ink-3)', marginTop: 3 }}>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>{(breakdown.positivo as number) || 0}+</span>
          <span>{(breakdown.neutro as number) || 0}=</span>
          <span style={{ color: '#DC2626', fontWeight: 600 }}>{(breakdown.negativo as number) || 0}−</span>
        </div>
      </div>

      {/* Direct narratives */}
      {data.narratives_direct.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#1F4E8C', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>
            Narrativas que le afectan directamente
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.narratives_direct.map(t => (
              <span key={t.topic} style={{
                fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
                background: '#EFF6FF', color: '#1F4E8C', border: '1px solid #DBEAFE', fontWeight: 500,
              }}>{t.topic} · {t.cnt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Indirect narratives */}
      {data.narratives_indirect.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>
            Narrativas asociadas indirectamente
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.narratives_indirect.map(t => (
              <span key={t.topic} style={{
                fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
                background: '#F5F5F7', color: 'var(--ink-3)', border: '1px solid #ECECEF',
              }}>{t.topic} · {t.cnt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Co-actors */}
      {(data.co_persons.length > 0 || data.co_orgs.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {data.co_persons.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Co-mencionados</div>
              {data.co_persons.slice(0, 5).map(p => (
                <div key={p.name} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ color: 'var(--ink-4)' }}>{p.cnt}</span>
                </div>
              ))}
            </div>
          )}
          {data.co_orgs.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Organizaciones</div>
              {data.co_orgs.slice(0, 5).map(p => (
                <div key={p.name} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ color: 'var(--ink-4)' }}>{p.cnt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent mentions */}
      {data.mentions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            Apariciones recientes
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {data.mentions.slice(0, 8).map(m => (
              <a key={m.id} href={m.url || '#'} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', padding: '7px 0', borderBottom: '1px solid var(--hairline)',
                textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 2 }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{m.source}</span>
                  <span style={{ color: SENTIMENT_COLOR[m.sentiment] || 'var(--ink-4)' }}>● {m.sentiment}</span>
                  {m.is_direct ? (
                    <span style={{ background: '#EFF6FF', color: '#1F4E8C', padding: '0 5px', borderRadius: 3, fontWeight: 600 }}>directa</span>
                  ) : (
                    <span style={{ background: '#F5F5F7', color: 'var(--ink-4)', padding: '0 5px', borderRadius: 3 }}>indirecta</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent = '#1F4E8C', decimals = 0 }: { label: string; value: number; accent?: string; decimals?: number }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
      <div style={{ fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        <CountUp value={value} decimals={decimals}/>
      </div>
    </div>
  )
}
