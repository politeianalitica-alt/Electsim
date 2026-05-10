'use client';
import { useState } from 'react';
import { MOCK_BRIEFINGS } from './_data/mock';
import type { Briefing, BriefingSeccion } from '@/types/briefing';
import type { NivelRiesgo } from '@/types/riesgo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

const NIVEL_COLOR: Record<NivelRiesgo, string> = {
  critico: 'var(--severity-critical)',
  alto:    'var(--severity-high)',
  medio:   'var(--severity-medium)',
  bajo:    'var(--severity-low)',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--severity-critical)' : score >= 65 ? 'var(--severity-high)' : score >= 45 ? 'var(--severity-medium)' : 'var(--severity-low)';
  const r = 22; const circ = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-surface-raised)" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circ} ${circ}`} transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="var(--font-display)">{score}</text>
    </svg>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:var(--text-base);font-weight:700;color:var(--color-ink);margin:20px 0 8px;font-family:var(--font-display)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:var(--text-lg);font-weight:700;color:var(--color-ink);margin:24px 0 10px;font-family:var(--font-display)">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:6px 0"><span style="flex-shrink:0;font-weight:700;color:var(--color-accent)">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<br/><br/>');
}

export default function BriefingPage() {
  const [activeBriefing, setActiveBriefing] = useState<Briefing>(MOCK_BRIEFINGS[0]);
  const [activeTab, setActiveTab] = useState<BriefingSeccion['tipo']>('situacion');
  const [expandedEscenario, setExpandedEscenario] = useState<string | null>(null);

  const activeSection = activeBriefing.secciones.find(s => s.tipo === activeTab);

  const impactoColor: Record<string, string> = { alto: 'var(--color-danger)', medio: 'var(--color-warn)', bajo: 'var(--color-success)' };

  return (
    <div className="shell" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <SectionHeader
        eyebrow="Inteligencia Ejecutiva"
        title="Brain Briefing"
        subtitle="Análisis diario generado por IA · Politeia Brain v2.1"
        size="lg"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Sidebar: archive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 60 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Archivo</div>
          {MOCK_BRIEFINGS.map(b => (
            <button key={b.id} onClick={() => { setActiveBriefing(b); setActiveTab('situacion'); }}
              style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-fast)', background: activeBriefing.id === b.id ? 'var(--color-accent-subtle)' : 'var(--color-surface)', borderColor: activeBriefing.id === b.id ? 'rgba(0,113,227,0.25)' : 'var(--color-hairline-soft)', fontFamily: 'var(--font-text)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: b.tipo === 'crisis' ? 'var(--color-danger)' : 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.tipo}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: b.score_riesgo_contexto >= 80 ? 'var(--severity-critical)' : b.score_riesgo_contexto >= 65 ? 'var(--severity-high)' : 'var(--severity-medium)', fontVariantNumeric: 'tabular-nums' }}>{b.score_riesgo_contexto}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: activeBriefing.id === b.id ? 'var(--color-accent-text)' : 'var(--color-ink-2)', fontWeight: 500, lineHeight: 1.3 }}>
                {new Date(b.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Resumen ejecutivo */}
          <Card variant="raised" padding="md">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <ScoreRing score={activeBriefing.score_riesgo_contexto} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', margin: 0 }}>{activeBriefing.titulo}</h2>
                  {activeBriefing.estado === 'archivado' && <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--color-surface-raised)', color: 'var(--color-ink-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-hairline)', fontWeight: 500 }}>Archivado</span>}
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', lineHeight: 1.7, margin: '0 0 12px' }}>{activeBriefing.resumen_ejecutivo}</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Señales analizadas', value: activeBriefing.signals_analizadas.toLocaleString('es-ES') },
                    { label: 'Tiempo generación', value: `${activeBriefing.tiempo_generacion_s}s` },
                    { label: 'Palabras', value: activeBriefing.palabras.toLocaleString('es-ES') },
                    { label: 'Generado por', value: activeBriefing.generado_por },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {activeBriefing.secciones.length > 0 && (
            <>
              {/* Section tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', padding: 4, border: '1px solid var(--color-hairline-soft)' }}>
                {activeBriefing.secciones.map(sec => (
                  <button key={sec.tipo} onClick={() => setActiveTab(sec.tipo)}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'var(--font-text)', transition: 'all var(--transition-fast)', background: activeTab === sec.tipo ? 'var(--color-surface)' : 'transparent', color: activeTab === sec.tipo ? 'var(--color-ink)' : 'var(--color-ink-4)', boxShadow: activeTab === sec.tipo ? 'var(--shadow-xs)' : 'none' }}>
                    {sec.titulo}
                    {sec.nivel_alerta && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: NIVEL_COLOR[sec.nivel_alerta], marginLeft: 6, verticalAlign: 'middle' }} />}
                  </button>
                ))}
              </div>

              {/* Section content */}
              {activeSection && (
                <Card variant="default" padding="md">
                  {activeSection.bullets && activeSection.bullets.length > 0 && (
                    <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${activeSection.nivel_alerta ? NIVEL_COLOR[activeSection.nivel_alerta] : 'var(--color-accent)'}` }}>
                      {activeSection.bullets.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>→</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSection.contenido) }}
                  />
                  {activeSection.fuentes_usadas && activeSection.fuentes_usadas.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-hairline)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)', fontWeight: 500 }}>Fuentes:</span>
                      {activeSection.fuentes_usadas.map(f => <span key={f} style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--color-surface-raised)', color: 'var(--color-ink-3)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-hairline)' }}>{f}</span>)}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* Scenarios */}
          {activeBriefing.escenarios.length > 0 && (
            <Card variant="default" padding="md">
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 16, fontFamily: 'var(--font-display)' }}>Escenarios Probabilísticos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeBriefing.escenarios.map(esc => (
                  <div key={esc.nombre} style={{ border: '1px solid var(--color-hairline-soft)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedEscenario(expandedEscenario === esc.nombre ? null : esc.nombre)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: 'var(--color-surface-raised)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)' }}>{esc.nombre}</span>
                          <span style={{ fontSize: 'var(--text-xs)', padding: '1px 7px', background: (impactoColor[esc.impacto] ?? 'var(--color-ink-4)') + '14', color: impactoColor[esc.impacto] ?? 'var(--color-ink-4)', borderRadius: 'var(--radius-full)', fontWeight: 600, border: `1px solid ${impactoColor[esc.impacto] ?? 'var(--color-ink-4)'}28` }}>
                            Impacto {esc.impacto.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>· {esc.horizonte}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--color-hairline)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${esc.probabilidad * 100}%`, background: impactoColor[esc.impacto] ?? 'var(--color-accent)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: impactoColor[esc.impacto] ?? 'var(--color-accent)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(esc.probabilidad * 100)}%</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>probabilidad</div>
                      </div>
                      <span style={{ color: 'var(--color-ink-4)', fontSize: 16, marginLeft: 4 }}>{expandedEscenario === esc.nombre ? '▲' : '▼'}</span>
                    </div>
                    {expandedEscenario === esc.nombre && (
                      <div style={{ padding: '14px 16px', background: 'var(--color-surface)' }}>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', lineHeight: 1.7, margin: '0 0 12px' }}>{esc.descripcion}</p>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Triggers</div>
                          {esc.triggers.map(t => (
                            <div key={t} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
                              <span style={{ color: 'var(--color-warn)', flexShrink: 0 }}>⚡</span>
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeBriefing.secciones.length === 0 && activeBriefing.escenarios.length === 0 && (
            <Card variant="sunken" padding="md">
              <div style={{ textAlign: 'center', color: 'var(--color-ink-4)', fontSize: 'var(--text-sm)', padding: '24px 0' }}>
                Este briefing archivado no tiene contenido detallado disponible
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
