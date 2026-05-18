'use client'
/**
 * NarrativesV3View — análisis multidimensional avanzado.
 * 8 dimensiones por narrativa: Tema · Actores · Frame · Emoción · Evidencia ·
 * Audiencia · Objetivo · Ciclo de vida.
 *
 * Se conecta a /api/news/narrativas-v3 (en vivo, RSS 50 medios).
 */
import { useEffect, useState } from 'react'

interface ActorDetectado { nombre: string; tipo: string; menciones: number; sentimientoMedio: number; alineacion?: string }
interface BenefPerj { actor: string; intensidad: string; evidenciaCount: number }
interface NarrativaV3 {
  id: string; tema: string; subtemas: string[]; taxonomia: string; color: string
  actores: ActorDetectado[]; beneficia: BenefPerj[]; perjudica: BenefPerj[]
  frameDominante: string; framesSecundarios: string[]; esEpisodico: boolean; pesoFrame: Record<string, number>
  emocionDominante: string; emocionesSecundarias: string[]; intensidadEmocional: number; pesoEmocion: Record<string, number>
  tipoEvidenciaDominante: string; fuentesCitadas: string[]; calidadEvidencia: string
  ideologiaMediaMedios: string; distribucionIdeologica: Record<string, number>; cobertura: string
  objetivoInferido: string; objetivosSecundarios: string[]; mensajesClave: string[]
  faseCiclo: string; fuerza: number; diasActiva: number; crescendo: number; polarizacion: number; velocidadDifusion: number
  sentimientoMedio: number; tono: string
  ejemplos: Array<{ titulo: string; medio: string; url: string; fecha: string | null }>
  mediosCubriendo: string[]
}

const FRAME_COLOR: Record<string, string> = {
  'conflicto': '#DC2626', 'responsabilidad': '#F97316', 'consecuencias_econ': '#0F766E',
  'moralidad': '#7C3AED', 'interés_humano': '#0EA5E9', 'estratégico': '#5D4037',
  'episódico': '#9CA3AF', 'temático': '#1F4E8C',
}

const EMOCION_COLOR: Record<string, string> = {
  'alegría': '#16A34A', 'confianza': '#0EA5E9', 'miedo': '#F59E0B', 'sorpresa': '#7C3AED',
  'tristeza': '#5B21B6', 'asco': '#5D4037', 'ira': '#DC2626', 'anticipación': '#F97316',
  'indignación': '#7F1D1D', 'esperanza': '#16A34A', 'desprecio': '#7F1D1D', 'orgullo': '#7C3AED',
  'neutral': '#9CA3AF',
}

const FASE_COLOR: Record<string, string> = {
  'emergencia': '#16A34A', 'crecimiento': '#0EA5E9', 'pico': '#DC2626',
  'meseta': '#F59E0B', 'declive': '#9CA3AF', 'resurgencia': '#7C3AED',
}

const ACTOR_TIPO_COLOR: Record<string, string> = {
  'protagonista': '#1F4E8C', 'antagonista': '#DC2626', 'víctima': '#7C3AED',
  'héroe': '#16A34A', 'observador': '#9CA3AF', 'institución': '#0F766E',
  'colectivo': '#F97316', 'experto': '#5B21B6',
}

const IDEO_COLOR: Record<string, string> = {
  'izquierda': '#DC2626', 'centro_izq': '#F97316', 'centro': '#9CA3AF',
  'centro_der': '#0EA5E9', 'derecha': '#1F4E8C',
}

export default function NarrativesV3View() {
  const [narr, setNarr] = useState<NarrativaV3[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(168)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/news/narrativas-v3?max=10&hours=${hours}&sources=50`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => {
        if (d) { setNarr(d.narrativas || []); setTotal(d.totalArticulos || 0) }
        setLoading(false)
      })
  }, [hours])

  return (
    <div>
      {/* MARCO TEÓRICO */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 10, color: '#7C3AED', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          FRAMEWORK V3 · ANÁLISIS MULTIDIMENSIONAL
        </p>
        <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#1d1d1f' }}>
          Una narrativa mediática se descompone en <strong>8 dimensiones</strong> interdependientes derivadas de la teoría clásica de la comunicación
          (Entman · Iyengar · Lasswell · Plutchik · Lakoff · Downs):
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
          {[
            { n: '1', t: 'TEMA',       d: '14 categorías taxonomía',                   c: '#1F4E8C' },
            { n: '2', t: 'ACTORES',    d: 'Protag/antag/víctima/inst (NER 30)',         c: '#7C3AED' },
            { n: '3', t: 'FRAME',      d: '6 marcos Entman/Iyengar',                    c: '#F97316' },
            { n: '4', t: 'EMOCIÓN',    d: 'Plutchik 8 + 4 políticas',                   c: '#DC2626' },
            { n: '5', t: 'EVIDENCIA',  d: 'Datos/declaración/opinión',                  c: '#0F766E' },
            { n: '6', t: 'AUDIENCIA',  d: 'Ideología media medios',                     c: '#5B21B6' },
            { n: '7', t: 'OBJETIVO',   d: '7 funciones Lasswell',                       c: '#16A34A' },
            { n: '8', t: 'CICLO',      d: 'Fases Downs + crescendo',                    c: '#5D4037' },
          ].map(d => (
            <div key={d.n} style={{ padding: 8, background: `${d.c}10`, borderLeft: `2px solid ${d.c}`, borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: d.c }}>{d.n}. {d.t}</p>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#3a3a3d', lineHeight: 1.3 }}>{d.d}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: '#6e6e73' }}>
          {total > 0 ? `${total} artículos analizados de 50 medios RSS · ${narr.length} narrativas extraídas` : 'Cargando…'}
        </p>
      </div>

      {/* SELECTOR VENTANA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[72, 168, 336, 720].map(h => (
          <button key={h} onClick={() => setHours(h)}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                     border: '1px solid', borderColor: hours === h ? '#7C3AED' : '#DDDDE3',
                     background: hours === h ? '#7C3AED' : '#fff', color: hours === h ? '#fff' : '#3a3a3d',
                     cursor: 'pointer', fontFamily: 'inherit' }}>
            {h === 72 ? '3 días' : h === 168 ? '7 días' : h === 336 ? '14 días' : '30 días'}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: '#6e6e73' }}>Analizando narrativas multidimensionalmente…</p>}

      {/* NARRATIVAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {narr.map((n, i) => <CardV3 key={n.id} n={n} rank={i + 1}/>)}
      </div>
    </div>
  )
}

function CardV3({ n, rank }: { n: NarrativaV3; rank: number }) {
  const [expanded, setExpanded] = useState(rank <= 2)
  const tonoColor = n.tono === 'positivo' ? '#16A34A' : n.tono === 'negativo' ? '#DC2626' : n.tono === 'polarizado' ? '#F59E0B' : '#9CA3AF'

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18, borderLeft: `5px solid ${n.color}` }}>
      {/* HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: n.color, fontFamily: 'var(--font-display)' }}>#{rank}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>{n.tema}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#F5F5F7', color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{n.taxonomia.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: FASE_COLOR[n.faseCiclo] || '#9CA3AF', color: '#fff', textTransform: 'uppercase', fontWeight: 700 }}>{n.faseCiclo}</span>
          </div>
          {n.subtemas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {n.subtemas.map(s => (
                <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: `${n.color}15`, color: n.color, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <Metric label="FUERZA" value={String(n.fuerza)} color="#1d1d1f"/>
          <Metric label="DÍAS" value={String(n.diasActiva)} color="#1F4E8C"/>
          <Metric label="CRESC" value={`${n.crescendo}x`} color={n.crescendo > 1.3 ? '#16A34A' : n.crescendo < 0.7 ? '#DC2626' : '#9CA3AF'}/>
          <Metric label="POL" value={`${(n.polarizacion * 100).toFixed(0)}%`} color={n.polarizacion > 0.5 ? '#F59E0B' : '#9CA3AF'}/>
          <Metric label="VEL" value={`${n.velocidadDifusion}/h`} color="#7C3AED"/>
        </div>
      </div>

      {expanded && (
        <>
          {/* DIMENSIONES 3-7 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14 }}>
            {/* FRAME */}
            <DimCard titulo="FRAME (marco)" color={FRAME_COLOR[n.frameDominante] || '#525258'}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', textTransform: 'capitalize' }}>{n.frameDominante.replace(/_/g, ' ')}</span>
              {n.framesSecundarios.length > 0 && (
                <p style={{ margin: '3px 0 0', fontSize: 9.5, color: '#6e6e73' }}>+ {n.framesSecundarios.map(f => f.replace(/_/g, ' ')).join(', ')}</p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#9CA3AF' }}>{n.esEpisodico ? 'Episódico' : 'Temático'}</p>
            </DimCard>

            {/* EMOCIÓN */}
            <DimCard titulo="EMOCIÓN" color={EMOCION_COLOR[n.emocionDominante] || '#525258'}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', textTransform: 'capitalize' }}>{n.emocionDominante}</span>
              {n.emocionesSecundarias.length > 0 && (
                <p style={{ margin: '3px 0 0', fontSize: 9.5, color: '#6e6e73' }}>+ {n.emocionesSecundarias.join(', ')}</p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#9CA3AF' }}>Intensidad {n.intensidadEmocional}/100</p>
            </DimCard>

            {/* EVIDENCIA */}
            <DimCard titulo="EVIDENCIA" color="#0F766E">
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', textTransform: 'capitalize' }}>{n.tipoEvidenciaDominante.replace(/_/g, ' ')}</span>
              <p style={{ margin: '3px 0 0', fontSize: 9.5, color: n.calidadEvidencia === 'alta' ? '#16A34A' : n.calidadEvidencia === 'media' ? '#F59E0B' : '#DC2626' }}>
                Calidad {n.calidadEvidencia}
              </p>
              {n.fuentesCitadas.length > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#6e6e73' }}>{n.fuentesCitadas.slice(0, 2).join(', ')}</p>
              )}
            </DimCard>

            {/* AUDIENCIA */}
            <DimCard titulo="MEDIOS (ideología)" color={IDEO_COLOR[n.ideologiaMediaMedios] || '#525258'}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', textTransform: 'capitalize' }}>{n.ideologiaMediaMedios.replace(/_/g, ' ')}</span>
              <p style={{ margin: '3px 0 0', fontSize: 9.5, color: n.cobertura === 'transversal' ? '#16A34A' : '#F97316' }}>{n.cobertura}</p>
              {/* Mini-barra ideológica */}
              <div style={{ display: 'flex', height: 4, marginTop: 4, borderRadius: 2, overflow: 'hidden' }}>
                {(['izquierda', 'centro_izq', 'centro', 'centro_der', 'derecha'] as const).map(i => (
                  <div key={i} style={{ flex: Math.max(0.5, n.distribucionIdeologica[i] || 0), background: IDEO_COLOR[i] }} title={`${i}: ${n.distribucionIdeologica[i]}`}/>
                ))}
              </div>
            </DimCard>

            {/* OBJETIVO */}
            <DimCard titulo="OBJETIVO (Lasswell)" color="#16A34A">
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', textTransform: 'capitalize' }}>{n.objetivoInferido}</span>
              {n.objetivosSecundarios.length > 0 && (
                <p style={{ margin: '3px 0 0', fontSize: 9.5, color: '#6e6e73' }}>+ {n.objetivosSecundarios.join(', ')}</p>
              )}
            </DimCard>
          </div>

          {/* ACTORES */}
          {n.actores.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                DRAMATIS PERSONAE · {n.actores.length} actores detectados
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {n.actores.map(a => {
                  const tipoColor = ACTOR_TIPO_COLOR[a.tipo] || '#525258'
                  const sentColor = a.sentimientoMedio > 0.15 ? '#16A34A' : a.sentimientoMedio < -0.15 ? '#DC2626' : '#9CA3AF'
                  return (
                    <div key={a.nombre} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: `${tipoColor}10`, borderRadius: 999, border: `1px solid ${tipoColor}30` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tipoColor }}>{a.nombre}</span>
                      <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase' }}>{a.tipo}</span>
                      {a.alineacion && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: IDEO_COLOR[a.alineacion] + '20', color: IDEO_COLOR[a.alineacion] }}>{a.alineacion.replace(/_/g, ' ')}</span>}
                      <span style={{ fontSize: 9, color: sentColor, fontWeight: 700 }}>{a.sentimientoMedio > 0 ? '+' : ''}{a.sentimientoMedio}</span>
                      <span style={{ fontSize: 9, color: '#9CA3AF' }}>{a.menciones}m</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* BENEFICIA / PERJUDICA */}
          {(n.beneficia.length > 0 || n.perjudica.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div style={{ padding: 10, background: 'rgba(22,163,74,0.05)', borderLeft: '3px solid #16A34A', borderRadius: 8 }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BENEFICIA A</p>
                {n.beneficia.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Sin beneficiarios claros</p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {n.beneficia.map(b => (
                      <li key={b.actor} style={{ fontSize: 11, color: '#1d1d1f', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{b.actor}</span>
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>{b.intensidad}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ padding: 10, background: 'rgba(220,38,38,0.05)', borderLeft: '3px solid #DC2626', borderRadius: 8 }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PERJUDICA A</p>
                {n.perjudica.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Sin perjudicados claros</p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {n.perjudica.map(p => (
                      <li key={p.actor} style={{ fontSize: 11, color: '#1d1d1f', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{p.actor}</span>
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>{p.intensidad}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* MENSAJES CLAVE */}
          {n.mensajesClave.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: '#FAFAFB', borderRadius: 8 }}>
              <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                MENSAJES CLAVE · frases recurrentes en titulares
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {n.mensajesClave.map((m, i) => (
                  <li key={i} style={{ fontSize: 11, padding: '4px 9px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 6, color: '#1d1d1f', fontStyle: 'italic' }}>
                    «{m}»
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FOOTER: tono + ejemplos + medios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px dashed #ECECEF' }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>TONO + MEDIOS</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: tonoColor, textTransform: 'capitalize' }}>
                {n.tono} · {n.sentimientoMedio > 0 ? '+' : ''}{n.sentimientoMedio.toFixed(2)}
              </p>
              <p style={{ margin: '4px 0 4px', fontSize: 10.5, color: '#3a3a3d' }}>
                <strong>{n.mediosCubriendo.length}</strong> medios:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {n.mediosCubriendo.slice(0, 10).map(m => (
                  <span key={m} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#F5F5F7', color: '#3a3a3d' }}>{m}</span>
                ))}
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>EJEMPLOS REPRESENTATIVOS</p>
              <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {n.ejemplos.map((e, i) => (
                  <li key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>{e.titulo}</a>
                    <span style={{ color: '#6e6e73', fontSize: 10 }}> · {e.medio}{e.fecha ? ` · ${new Date(e.fecha).toLocaleDateString('es-ES')}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 10, padding: '4px 10px', fontSize: 10.5, border: '1px solid #ECECEF', borderRadius: 6, background: '#fff', color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>
        {expanded ? '↑ Colapsar' : '↓ Expandir 8 dimensiones'}
      </button>
    </div>
  )
}

function DimCard({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 9, background: '#FAFAFA', borderRadius: 6, borderTop: `2px solid ${color}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 8.5, color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{titulo}</p>
      {children}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '4px 8px', background: '#FAFAFA', borderRadius: 5, textAlign: 'center', minWidth: 48 }}>
      <p style={{ margin: 0, fontSize: 8, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  )
}
