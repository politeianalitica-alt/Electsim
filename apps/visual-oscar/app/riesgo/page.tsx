'use client';
import { useState } from 'react';
import { MOCK_MATRIZ } from './_data/mock';
import type { IndicadorRiesgo, NivelRiesgo, DimensionRiesgo } from '@/types/riesgo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

// Color helpers
const NIVEL_COLOR: Record<NivelRiesgo, string> = {
  critico: 'var(--severity-critical)',
  alto:    'var(--severity-high)',
  medio:   'var(--severity-medium)',
  bajo:    'var(--severity-low)',
};

const NIVEL_LABEL: Record<NivelRiesgo, string> = {
  critico: 'CRÍTICO', alto: 'ALTO', medio: 'MEDIO', bajo: 'BAJO',
};

const DIM_LABEL: Record<DimensionRiesgo, string> = {
  estabilidad_gubernamental: 'Estabilidad Gubernamental',
  tension_territorial:       'Tensión Territorial',
  riesgo_electoral:          'Riesgo Electoral',
  conflicto_social:          'Conflicto Social',
  presion_mediatica:         'Presión Mediática',
  riesgo_legislativo:        'Riesgo Legislativo',
};

function NivelBadge({ nivel }: { nivel: NivelRiesgo }) {
  const color = NIVEL_COLOR[nivel];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 8px',
      borderRadius: 'var(--radius-full)', letterSpacing: '0.06em',
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: nivel === 'critico' ? 'pulse 1.6s ease-out infinite' : 'none' }} />
      {NIVEL_LABEL[nivel]}
    </span>
  );
}

function ScoreArc({ score, nivel }: { score: number; nivel: NivelRiesgo }) {
  const color = NIVEL_COLOR[nivel];
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75;
  return (
    <svg width="140" height="90" viewBox="0 0 140 90">
      <path d="M 14 84 A 56 56 0 1 1 126 84" fill="none" stroke="var(--color-hairline)" strokeWidth="10" strokeLinecap="round" />
      <path d="M 14 84 A 56 56 0 1 1 126 84" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="70" y="72" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-display)" letterSpacing="-2">{score}</text>
      <text x="70" y="85" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--color-ink-4)" letterSpacing="0.1em">/ 100</text>
    </svg>
  );
}

export default function RiesgoPage() {
  const data = MOCK_MATRIZ;
  const [filterDim, setFilterDim] = useState<DimensionRiesgo | 'all'>('all');
  const [filterNivel, setFilterNivel] = useState<NivelRiesgo | 'all'>('all');
  const [selected, setSelected] = useState<IndicadorRiesgo | null>(null);

  const filtered = data.indicadores.filter(ind =>
    (filterDim === 'all' || ind.dimension === filterDim) &&
    (filterNivel === 'all' || ind.nivel === filterNivel)
  );

  // Heatmap: group by dimension
  const dims = Object.keys(DIM_LABEL) as DimensionRiesgo[];
  const heatmap = dims.map(dim => {
    const inds = data.indicadores.filter(i => i.dimension === dim);
    const maxScore = inds.length ? Math.max(...inds.map(i => i.score)) : 0;
    const nivel: NivelRiesgo = maxScore >= 85 ? 'critico' : maxScore >= 65 ? 'alto' : maxScore >= 45 ? 'medio' : 'bajo';
    return { dim, nivel, score: maxScore, count: inds.length };
  });

  return (
    <div className="shell" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <SectionHeader
        eyebrow="Monitor de Riesgos"
        title="Risk Intelligence"
        subtitle={`Calculado: ${new Date(data.fecha_calculo).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`}
        size="lg"
        action={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{data.alertas_activas} alertas activas</span>}
      />

      {/* Header KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 24, background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', border: '1px solid var(--color-hairline-soft)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingRight: 28, borderRight: '1px solid var(--color-hairline-soft)' }}>
          <ScoreArc score={data.score_global} nivel={data.nivel_global} />
          <NivelBadge nivel={data.nivel_global} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', textAlign: 'center' }}>Índice Global de Riesgo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignContent: 'center' }}>
          {(['critico', 'alto', 'medio', 'bajo'] as NivelRiesgo[]).map(n => {
            const count = data.indicadores.filter(i => i.nivel === n).length;
            const color = NIVEL_COLOR[n];
            return (
              <div key={n} style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 'var(--radius-md)', background: color + '08', border: `1px solid ${color}20` }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{NIVEL_LABEL[n]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Heatmap */}
        <Card variant="default" padding="md">
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 16 }}>Mapa de Calor por Dimensión</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {heatmap.map(({ dim, nivel, score, count }) => {
              const color = NIVEL_COLOR[nivel];
              return (
                <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)', fontWeight: 500 }}>{DIM_LABEL[dim]}</div>
                  <div style={{ width: 100, height: 6, background: 'var(--color-surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ width: 28, textAlign: 'right', fontSize: 'var(--text-xs)', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{score}</div>
                  <div style={{ width: 14, textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>{count}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline */}
        <Card variant="default" padding="md">
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 16 }}>Evolución Score Global — 30 días</div>
          <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
            {/* Threshold lines */}
            <line x1="0" y1={120 - (80/100)*120} x2="300" y2={120 - (80/100)*120} stroke="var(--severity-critical)" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
            <line x1="0" y1={120 - (60/100)*120} x2="300" y2={120 - (60/100)*120} stroke="var(--severity-high)" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
            {/* Area */}
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              points={data.historico_30d.map((p, i) => `${(i / 29) * 300},${120 - (p.score / 100) * 120}`).join(' ')}
            />
            {/* Labels */}
            <text x="2" y={120 - (80/100)*120 - 3} fontSize="8" fill="var(--severity-critical)" opacity="0.7">CRÍTICO 80</text>
            <text x="2" y={120 - (60/100)*120 - 3} fontSize="8" fill="var(--severity-high)" opacity="0.7">ALTO 60</text>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>Hace 30 días</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>Hoy</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', alignSelf: 'center', fontWeight: 500 }}>Dimensión:</span>
        {(['all', ...dims] as Array<DimensionRiesgo | 'all'>).map(d => (
          <button key={d} onClick={() => setFilterDim(d)} style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid', cursor: 'pointer', fontWeight: 500, transition: 'all var(--transition-fast)', borderColor: filterDim === d ? 'var(--color-accent)' : 'var(--color-hairline)', background: filterDim === d ? 'var(--color-accent-subtle)' : 'var(--color-surface)', color: filterDim === d ? 'var(--color-accent-text)' : 'var(--color-ink-3)' }}>
            {d === 'all' ? 'Todas' : DIM_LABEL[d]}
          </button>
        ))}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', alignSelf: 'center', fontWeight: 500, marginLeft: 8 }}>Nivel:</span>
        {(['all', 'critico', 'alto', 'medio', 'bajo'] as Array<NivelRiesgo | 'all'>).map(n => (
          <button key={n} onClick={() => setFilterNivel(n)} style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all var(--transition-fast)', borderColor: filterNivel === n ? (n === 'all' ? 'var(--color-accent)' : NIVEL_COLOR[n]) : 'var(--color-hairline)', background: filterNivel === n ? (n === 'all' ? 'var(--color-accent-subtle)' : NIVEL_COLOR[n] + '12') : 'var(--color-surface)', color: filterNivel === n ? (n === 'all' ? 'var(--color-accent-text)' : NIVEL_COLOR[n]) : 'var(--color-ink-3)' }}>
            {n === 'all' ? 'Todos' : NIVEL_LABEL[n]}
          </button>
        ))}
      </div>

      {/* Indicators table */}
      <Card variant="default" padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                {['Indicador', 'Dimensión', 'Score', 'Var 7d', 'Tendencia', 'Nivel', 'Horizonte'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ind => (
                <tr key={ind.id} onClick={() => setSelected(ind)} style={{ borderBottom: '1px solid var(--color-hairline-soft)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-surface-raised)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', maxWidth: 280 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.titulo}</div>
                    <div style={{ color: 'var(--color-ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.actores_implicados.slice(0, 3).join(', ')}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-ink-3)', whiteSpace: 'nowrap' }}>{DIM_LABEL[ind.dimension]}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: NIVEL_COLOR[ind.nivel], fontVariantNumeric: 'tabular-nums' }}>{ind.score}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: ind.variacion_7d > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {ind.variacion_7d > 0 ? '+' : ''}{ind.variacion_7d.toFixed(1)}%
                  </td>
                  <td style={{ padding: '12px 14px', color: ind.tendencia === 'subiendo' ? 'var(--color-danger)' : ind.tendencia === 'bajando' ? 'var(--color-success)' : 'var(--color-ink-4)' }}>
                    {ind.tendencia === 'subiendo' ? '↑ Sube' : ind.tendencia === 'bajando' ? '↓ Baja' : '→ Estable'}
                  </td>
                  <td style={{ padding: '12px 14px' }}><NivelBadge nivel={ind.nivel} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-ink-4)', whiteSpace: 'nowrap' }}>{ind.horizonte}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-4)', fontSize: 'var(--text-sm)' }}>No hay indicadores con los filtros seleccionados</div>}
        </div>
      </Card>

      {/* Detail drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 480, background: 'var(--color-surface)', boxShadow: 'var(--shadow-xl)', overflowY: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <NivelBadge nivel={selected.nivel} />
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-4)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', margin: '0 0 8px' }}>{selected.titulo}</h2>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginBottom: 20 }}>{DIM_LABEL[selected.dimension]} · Horizonte {selected.horizonte}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginBottom: 4 }}>Score actual</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: NIVEL_COLOR[selected.nivel] }}>{selected.score}</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginBottom: 4 }}>Variación 7d</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: selected.variacion_7d > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{selected.variacion_7d > 0 ? '+' : ''}{selected.variacion_7d.toFixed(1)}%</div>
              </div>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', lineHeight: 1.7, marginBottom: 20 }}>{selected.descripcion}</p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Actores implicados</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.actores_implicados.map(a => <span key={a} style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink-2)' }}>{a}</span>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Fuentes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.fuentes.map(f => <span key={f} style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', background: 'var(--color-accent-subtle)', borderRadius: 'var(--radius-full)', color: 'var(--color-accent-text)' }}>{f}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
