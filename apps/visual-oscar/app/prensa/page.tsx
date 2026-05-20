'use client';
import { useState } from 'react';
import { MOCK_FEED } from './_data/mock';
import type { SignalItem, RelevanciaSignal, SentimientoTono } from '@/types/intelligence-feed';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import AppHeader from '../_components/AppHeader';

const TONO_COLOR: Record<SentimientoTono, string> = {
  negativo: 'var(--color-danger)',
  positivo: 'var(--color-success)',
  neutro:   'var(--color-ink-4)',
  mixto:    'var(--color-warn)',
};
const RELEVANCIA_ORDER: Record<RelevanciaSignal, number> = { breaking: 0, alta: 1, media: 2, baja: 3 };

function timeSince(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
  return `hace ${Math.floor(mins / 1440)}d`;
}

export default function PrensaPage() {
  const data = MOCK_FEED;
  const [filterRel, setFilterRel] = useState<RelevanciaSignal | 'all'>('all');
  const [filterTono, setFilterTono] = useState<SentimientoTono | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.signals
    .filter((s: SignalItem) => filterRel === 'all' || s.relevancia === filterRel)
    .filter((s: SignalItem) => filterTono === 'all' || s.tono === filterTono)
    .filter((s: SignalItem) => !searchTerm || s.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || s.resumen.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a: SignalItem, b: SignalItem) => RELEVANCIA_ORDER[a.relevancia] - RELEVANCIA_ORDER[b.relevancia] || b.score_relevancia - a.score_relevancia);

  return (
    <div style={{ background: 'var(--color-bg, var(--bg))', minHeight: '100vh' }}>
      {/* Top-bar global del dashboard — antes faltaba y se cortaba la
          parte superior de la página. */}
      <AppHeader />
      <div className="shell" style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader
          eyebrow="Inteligencia de Prensa"
          title="Feed de inteligencia"
          subtitle={`${data.total_monitorizados_24h.toLocaleString('es-ES')} fuentes monitorizadas · Sync: ${timeSince(data.ultima_sync)}`}
          size="lg"
          style={{ marginBottom: 0 }}
        />
        {data.breaking_activos > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(196,44,44,0.2)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 1.6s ease-out infinite' }} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{data.breaking_activos} Breaking</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Main feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-hairline-soft)' }}>
            <input
              placeholder="Buscar señal…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: '0 0 200px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', background: 'var(--color-surface-raised)', color: 'var(--color-ink)', fontSize: 'var(--text-xs)', outline: 'none', fontFamily: 'var(--font-text)' }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', fontWeight: 500 }}>Relevancia:</span>
            {(['all', 'breaking', 'alta', 'media', 'baja'] as Array<RelevanciaSignal | 'all'>).map(r => (
              <button key={r} onClick={() => setFilterRel(r)} style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid', cursor: 'pointer', fontWeight: r === 'breaking' ? 700 : 500, transition: 'all var(--transition-fast)', borderColor: filterRel === r ? (r === 'breaking' ? 'var(--color-danger)' : 'var(--color-accent)') : 'var(--color-hairline)', background: filterRel === r ? (r === 'breaking' ? 'var(--color-danger-subtle)' : 'var(--color-accent-subtle)') : 'transparent', color: filterRel === r ? (r === 'breaking' ? 'var(--color-danger)' : 'var(--color-accent-text)') : 'var(--color-ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {r === 'all' ? 'Todas' : r}
              </button>
            ))}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', fontWeight: 500, marginLeft: 4 }}>Tono:</span>
            {(['all', 'negativo', 'positivo', 'neutro', 'mixto'] as Array<SentimientoTono | 'all'>).map(t => (
              <button key={t} onClick={() => setFilterTono(t)} style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid', cursor: 'pointer', fontWeight: 500, transition: 'all var(--transition-fast)', borderColor: filterTono === t ? 'var(--color-accent)' : 'var(--color-hairline)', background: filterTono === t ? 'var(--color-accent-subtle)' : 'transparent', color: filterTono === t ? 'var(--color-accent-text)' : 'var(--color-ink-3)' }}>
                {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Signal cards */}
          {filtered.map((signal: SignalItem) => (
            <div key={signal.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', border: signal.es_breaking ? '1px solid rgba(196,44,44,0.35)' : '1px solid var(--color-hairline-soft)', boxShadow: signal.es_breaking ? '0 0 0 1px rgba(196,44,44,0.1)' : 'var(--shadow-xs)', position: 'relative', overflow: 'hidden' }}>
              {signal.es_breaking && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--color-danger)' }} />}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {signal.es_breaking && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 1.6s ease-out infinite' }} />
                      BREAKING
                    </span>
                  )}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', fontWeight: 500 }}>{signal.fuente}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>·</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{timeSince(signal.publicado_en)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: TONO_COLOR[signal.tono] }}>{signal.tono.toUpperCase()}</span>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-4)', background: 'var(--color-surface-raised)', padding: '2px 6px', borderRadius: 4 }}>{signal.score_relevancia}</span>
                </div>
              </div>
              {signal.url ? (
                <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', display: 'block', margin: '0 0 6px', lineHeight: 1.3, textDecoration: 'none', borderBottom: '1px dotted rgba(0,113,227,0.35)' }}
                   onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0071e3' }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)' }}
                >{signal.titulo} <span style={{ color: '#0071e3', fontSize: 12 }}>↗</span></a>
              ) : (
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', margin: '0 0 6px', lineHeight: 1.3 }}>{signal.titulo}</h3>
              )}
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)', lineHeight: 1.6, margin: '0 0 10px' }}>{signal.resumen}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {signal.temas.map(t => <span key={t} style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)', borderRadius: 'var(--radius-full)' }}>{t}</span>)}
                {signal.actores.slice(0, 3).map(a => <span key={a} style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--color-surface-raised)', color: 'var(--color-ink-3)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-hairline)' }}>{a}</span>)}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-ink-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-hairline-soft)' }}>
              No hay señales con los filtros seleccionados
            </div>
          )}
        </div>

        {/* Sidebar: clusters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 60 }}>
          <Card variant="default" padding="md">
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 16, fontFamily: 'var(--font-display)' }}>Narrativas Activas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.clusters.map(cl => (
                <div key={cl.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-2)', flex: 1, marginRight: 8 }}>{cl.nombre}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: cl.tendencia === 'creciendo' ? 'var(--color-danger)' : cl.tendencia === 'decayendo' ? 'var(--color-success)' : 'var(--color-ink-4)', fontWeight: 600 }}>
                      {cl.tendencia === 'creciendo' ? '↑' : cl.tendencia === 'decayendo' ? '↓' : '→'} {cl.items_count}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cl.intensidad}%`, background: cl.intensidad > 80 ? 'var(--color-danger)' : cl.intensidad > 60 ? 'var(--color-warn)' : 'var(--color-accent)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>Estadísticas 24h</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Fuentes monitorizadas', value: data.total_monitorizados_24h.toLocaleString('es-ES') },
                { label: 'Breaking activos', value: String(data.breaking_activos), color: 'var(--color-danger)' },
                { label: 'Señales procesadas', value: String(data.signals.length) },
                { label: 'Narrativas detectadas', value: String(data.clusters.length) },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{label}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: color ?? 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    </div>
  );
}
