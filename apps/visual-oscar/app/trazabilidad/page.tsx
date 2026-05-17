'use client'

/**
 * /trazabilidad — Trazabilidad Legislativa.
 *
 * Pestaña 2 del módulo Legislativo.
 *
 * Para cada iniciativa en tramitación (las mismas que aparecen en el monitor),
 * muestra el timeline cronológico completo de pasos:
 *   - Presentación → calificación → comisión → enmiendas → ponencia → dictamen
 *   - Pleno origen → cámara revisora → aprobación → publicación BOE
 *
 * Sin datos hardcodeados. Información derivada de las fuentes oficiales.
 */

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

interface LegislativeInitiative {
  id: string
  ambito: string
  ccaa?: string | null
  expediente: string
  titulo: string
  kind: string
  materia: string
  promotor: string
  stage: string
  fechaRegistro: string | null
  fechaActualizacion: string | null
  urlOficial: string | null
  tags: string[]
}

interface InitiativesResponse {
  items: LegislativeInitiative[]
  stats: { total: number; enTramitacion: number; aprobadas: number; porAmbito: Record<string, number> }
}

interface TraceStep {
  order: number
  kind: string
  label: string
  date: string | null
  forum: string
  outcome?: string | null
  url?: string | null
}

interface Traceability {
  initiative: LegislativeInitiative
  steps: TraceStep[]
  summary: { totalSteps: number; currentStage: string; daysSinceStart: number | null; nextExpected: string | null }
}

const STAGE_COLOR: Record<string, string> = {
  'registrado': '#6E6E73', 'calificacion': '#94A3B8', 'comision': '#F97316',
  'enmiendas': '#FB923C', 'ponencia': '#EAB308', 'dictamen': '#A3A3A3',
  'pleno-origen': '#1F4E8C', 'pleno-revision': '#5B21B6', 'aprobado': '#16A34A',
  'rechazado': '#DC2626', 'caducado': '#525252', 'publicado': '#16A34A', 'desconocido': '#94A3B8',
}

const STEP_KIND_GLYPH: Record<string, string> = {
  'presentacion': '◉', 'calificacion': '⊟', 'toma-consideracion': '✓',
  'enmiendas-totalidad': '⌥', 'enmiendas-articulado': '⌥', 'comparecencias': '◐',
  'ponencia': '⊞', 'dictamen-comision': '✦', 'pleno-debate': '◫',
  'pleno-votacion': '◉', 'remision-camara': '⇡', 'devolucion-enmiendas': '⇣',
  'aprobacion-final': '★', 'sancion-real': '✓', 'publicacion-boe': '✓',
  'recurso-inconstitucionalidad': '!', 'sentencia-tc': '◐', 'otro': '·',
}

function TrazabilidadInner() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const sp = useSearchParams()
  const preselected = sp.get('id')

  const [selectedId, setSelectedId] = useState<string | null>(preselected)
  const [q, setQ] = useState('')
  const [fAmbito, setFAmbito] = useState<string>('todos')

  const { data: initData, source, updatedAt, refresh, loading } =
    useApi<InitiativesResponse>('/api/legislativo/initiatives?limit=300', { refreshInterval: 600_000 })

  const initiatives = useMemo(() => (initData?.items || []).filter(it => {
    if (fAmbito !== 'todos' && it.ambito !== fAmbito) return false
    if (q && !(it.titulo.toLowerCase().includes(q.toLowerCase()) || it.expediente.includes(q))) return false
    return true
  }), [initData, q, fAmbito])

  useEffect(() => {
    if (!selectedId && initiatives.length > 0) setSelectedId(initiatives[0].id)
  }, [selectedId, initiatives])

  const { data: trace, loading: traceLoading } = useApi<Traceability>(
    selectedId ? `/api/legislativo/traceability/${encodeURIComponent(selectedId)}` : '/api/legislativo/traceability/none',
    { refreshInterval: 0 }
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 32px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>TRAZABILIDAD LEGISLATIVA</span>
                <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={600} onRefresh={refresh}/>
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.022em', margin: '0 0 4px' }}>
                Timeline cronológico <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#5B21B6' }}>de cada norma.</em>
              </h1>
              <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.45 }}>
                Selecciona una iniciativa de la lista para ver el recorrido completo:
                presentación, comisión, enmiendas, votaciones, publicación.
              </p>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
          <aside style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
            padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            maxHeight: 'calc(100vh - 240px)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
              {initiatives.length} INICIATIVAS · selecciona una
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { v: 'todos', l: 'Todas' },
                { v: 'nacional-congreso', l: 'Congreso' },
                { v: 'nacional-senado', l: 'Senado' },
                { v: 'autonomico', l: 'CCAA' },
              ].map(o => (
                <button key={o.v} onClick={() => setFAmbito(o.v)} style={{
                  background: fAmbito === o.v ? '#1F4E8C' : '#fff',
                  color: fAmbito === o.v ? '#fff' : '#3a3a3d',
                  border: '1px solid ' + (fAmbito === o.v ? '#1F4E8C' : '#ECECEF'),
                  borderRadius: 8, padding: '4px 9px',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{o.l}</button>
              ))}
            </div>
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar título o expediente…"
              style={{
                padding: '7px 10px', fontSize: 11.5, borderRadius: 8,
                border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 10,
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading && initiatives.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Cargando…</div>
              )}
              {initiatives.map(it => {
                const selected = selectedId === it.id
                const stageColor = STAGE_COLOR[it.stage] || '#94A3B8'
                return (
                  <button key={it.id} onClick={() => setSelectedId(it.id)} style={{
                    textAlign: 'left',
                    background: selected ? 'rgba(91,33,182,0.06)' : 'transparent',
                    border: selected ? '1px solid rgba(91,33,182,0.30)' : '1px solid transparent',
                    borderLeft: `3px solid ${stageColor}`,
                    borderRadius: 8, padding: '8px 10px',
                    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                  }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: '#1F4E8C', color: '#fff', letterSpacing: '0.04em' }}>{it.kind}</span>
                      <span style={{ fontSize: 9, color: '#6e6e73' }}>{it.expediente}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.3 }}>
                      {it.titulo.slice(0, 100)}{it.titulo.length > 100 ? '…' : ''}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73' }}>{it.materia} · {it.ambito.split('-').pop()}</p>
                  </button>
                )
              })}
            </div>
          </aside>

          <section style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
            padding: '20px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {!selectedId ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6e6e73' }}>
                Selecciona una iniciativa para ver su trazabilidad.
              </div>
            ) : traceLoading || !trace ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Generando trazabilidad…</div>
            ) : (
              <TraceDetail trace={trace}/>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function TraceDetail({ trace }: { trace: Traceability }) {
  const init = trace.initiative
  const completed = trace.steps.filter(s => s.outcome !== 'Pendiente')
  const pending = trace.steps.filter(s => s.outcome === 'Pendiente')

  return (
    <>
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #ECECEF' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#1F4E8C', color: '#fff', letterSpacing: '0.05em' }}>{init.kind}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>{init.expediente}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>· {init.materia}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>· {init.ambito.replace('nacional-', '').replace('-', ' ')}</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '-0.014em', margin: '0 0 6px', lineHeight: 1.3 }}>
          {init.titulo}
        </h2>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
          Promotor: <strong style={{ color: '#1d1d1f' }}>{init.promotor}</strong>
          {init.fechaRegistro && <> · Registro: <strong style={{ color: '#1d1d1f' }}>{init.fechaRegistro.slice(0, 10)}</strong></>}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          <SummaryBox label="PASOS COMPLETADOS" value={String(completed.length)} color="#16A34A"/>
          <SummaryBox label="PASOS PENDIENTES" value={String(pending.length)} color="#F97316"/>
          <SummaryBox label="DÍAS TRAMITACIÓN" value={trace.summary.daysSinceStart != null ? String(trace.summary.daysSinceStart) : '—'} color="#5B21B6"/>
          <SummaryBox label="ESTADO" value={trace.summary.currentStage.replace(/-/g, ' ')} color={STAGE_COLOR[trace.summary.currentStage] || '#6E6E73'} small/>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
        {trace.steps.map((step, i) => {
          const isPending = step.outcome === 'Pendiente'
          const isLast = i === trace.steps.length - 1
          const color = isPending ? '#94A3B8' : '#5B21B6'
          return (
            <div key={step.order} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 12, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isPending ? '#fff' : color, color: isPending ? '#94A3B8' : '#fff',
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-display)',
                }}>{STEP_KIND_GLYPH[step.kind] || step.order}</div>
                {!isLast && (
                  <div style={{ flex: 1, width: 2, background: isPending ? '#ECECEF' : '#5B21B6', minHeight: 24, opacity: 0.4 }}/>
                )}
              </div>
              <div style={{ padding: '4px 0 24px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isPending ? '#9CA3AF' : '#1d1d1f', fontFamily: 'var(--font-display)' }}>
                    {step.label}
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: isPending ? 'rgba(148,163,184,0.10)' : 'rgba(22,163,74,0.10)', color: isPending ? '#94A3B8' : '#16A34A', letterSpacing: '0.04em' }}>
                    {isPending ? 'PENDIENTE' : 'COMPLETADO'}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#6e6e73' }}>
                  {step.forum}{step.date ? ` · ${step.date}` : ''}
                </p>
                {step.url && (
                  <a href={step.url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 11, color: '#5B21B6', textDecoration: 'none', display: 'inline-block', marginTop: 4,
                  }}>Documento oficial ↗</a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {init.urlOficial && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#6e6e73' }}>
            Fuente oficial: <a href={init.urlOficial} target="_blank" rel="noopener noreferrer" style={{ color: '#5B21B6', textDecoration: 'none', fontWeight: 600 }}>{init.urlOficial.slice(0, 80)}{init.urlOficial.length > 80 ? '…' : ''} ↗</a>
          </p>
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/huella-legislativa?id=${encodeURIComponent(init.id)}`} style={{
          background: '#7C3AED', color: '#fff', borderRadius: 8, padding: '8px 14px',
          fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit',
        }}>Ver huella legislativa →</Link>
      </div>

      {/* PDFs y minería de documentos */}
      {trace.steps.some(s => s.url?.includes('.pdf')) && (
        <section style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #ECECEF' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#0F766E', textTransform: 'uppercase', margin: '0 0 8px' }}>
            DOCUMENTOS OFICIALES DETECTADOS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {trace.steps.filter(s => s.url?.includes('.pdf')).slice(0, 8).map((s, i) => (
              <PdfMineRow key={i} url={s.url!} label={s.label} forum={s.forum}/>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

interface PdfMineResult {
  type: 'diario_sesiones' | 'bocg' | 'ley'
  fecha?: string | null
  numero?: string | null
  titulo?: string | null
  comparecientes?: Array<{ nombre: string; cargo?: string; pagina: number }>
  acuerdos?: string[]
  resumen?: string
  iniciativas?: Array<{ expediente: string; titulo: string; pagina: number }>
  enmiendas?: Array<{ numero: string; grupo: string; titulo: string; pagina: number }>
  preambulo?: string
  numArticulos?: number
  numDisposiciones?: number
  totalPaginas?: number
  error?: string
}

function PdfMineRow({ url, label, forum }: { url: string; label: string; forum: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mined, setMined] = useState<PdfMineResult | null>(null)

  async function mine() {
    if (mined || loading) return
    setLoading(true)
    try {
      // Detectar tipo por URL
      const isDS = /\/DSCD-|\/DSCS-|\/DS\//i.test(url)
      const isBocg = /\/BOCG-|\/BOCG\//i.test(url)
      const param = isDS ? `ds=${encodeURIComponent(url)}`
                  : isBocg ? `bocg=${encodeURIComponent(url)}`
                  : `ley=${encodeURIComponent(url)}`
      const res = await fetch(`/api/legislativo/document-mine?${param}`)
      const json: PdfMineResult = await res.json()
      setMined(json)
    } catch (e) {
      setMined({ type: 'ley', error: String(e) })
    } finally { setLoading(false) }
  }

  function toggle() {
    const will = !open
    setOpen(will)
    if (will) mine()
  }

  return (
    <div style={{ padding: '8px 10px', borderRadius: 8, background: '#FAFAFB', border: '1px solid #ECECEF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 700 }}>📄</span>
        <span style={{ flex: 1, fontSize: 11.5, color: '#1d1d1f' }}>{label}</span>
        <span style={{ fontSize: 10, color: '#6e6e73' }}>{forum}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 10.5, color: '#0F766E', textDecoration: 'none', fontWeight: 600,
          padding: '3px 8px', borderRadius: 5, background: 'rgba(15,118,110,0.08)',
        }}>Abrir ↗</a>
        <button onClick={toggle} style={{
          fontSize: 10.5, color: '#fff', background: open ? '#94A3B8' : '#0F766E',
          border: 'none', fontWeight: 700, fontFamily: 'inherit',
          padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
        }}>{open ? 'Ocultar' : 'Analizar PDF'}</button>
      </div>

      {open && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid #ECECEF' }}>
          {loading ? (
            <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af', textAlign: 'center', padding: 8 }}>
              Descargando y analizando PDF…
            </p>
          ) : mined?.error ? (
            <p style={{ margin: 0, fontSize: 10.5, color: '#DC2626' }}>Error: {mined.error.slice(0, 200)}</p>
          ) : mined ? (
            <PdfMineDetail mined={mined}/>
          ) : null}
        </div>
      )}
    </div>
  )
}

function PdfMineDetail({ mined }: { mined: PdfMineResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#0F766E', color: '#fff', letterSpacing: '0.05em' }}>
          {mined.type === 'diario_sesiones' ? 'DIARIO DE SESIONES' : mined.type === 'bocg' ? 'BOCG' : 'LEY'}
        </span>
        {mined.fecha && <span style={{ fontSize: 10, color: '#6e6e73' }}>{mined.fecha}</span>}
        {mined.numero && <span style={{ fontSize: 10, color: '#6e6e73' }}>· nº {mined.numero}</span>}
        {mined.totalPaginas != null && <span style={{ fontSize: 10, color: '#6e6e73', marginLeft: 'auto' }}>{mined.totalPaginas} págs.</span>}
      </div>
      {mined.titulo && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>{mined.titulo}</p>}
      {mined.resumen && (
        <p style={{ margin: 0, fontSize: 11, color: '#3a3a3d', lineHeight: 1.45, padding: '6px 8px', background: '#FAFAFB', borderRadius: 4 }}>
          {mined.resumen}
        </p>
      )}

      {mined.comparecientes && mined.comparecientes.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#7C3AED', textTransform: 'uppercase' }}>
            COMPARECIENTES · {mined.comparecientes.length}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {mined.comparecientes.slice(0, 12).map((c, i) => (
              <span key={i} title={c.cargo} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                {c.nombre} {c.cargo && <em style={{ opacity: 0.65 }}>· {c.cargo.slice(0, 40)}</em>}
              </span>
            ))}
          </div>
        </div>
      )}

      {mined.acuerdos && mined.acuerdos.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#16A34A', textTransform: 'uppercase' }}>
            ACUERDOS DETECTADOS · {mined.acuerdos.length}
          </p>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.4 }}>
            {mined.acuerdos.slice(0, 6).map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {mined.iniciativas && mined.iniciativas.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1F4E8C', textTransform: 'uppercase' }}>
            INICIATIVAS REFERENCIADAS · {mined.iniciativas.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' }}>
            {mined.iniciativas.slice(0, 20).map((it, i) => (
              <div key={i} style={{ fontSize: 10, color: '#3a3a3d' }}>
                <strong>{it.expediente}</strong> · {it.titulo.slice(0, 120)} <span style={{ color: '#6e6e73' }}>pág. {it.pagina}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mined.enmiendas && mined.enmiendas.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#EAB308', textTransform: 'uppercase' }}>
            ENMIENDAS · {mined.enmiendas.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' }}>
            {mined.enmiendas.slice(0, 20).map((e, i) => (
              <div key={i} style={{ fontSize: 10, color: '#3a3a3d' }}>
                <strong>Nº {e.numero}</strong> · <em>{e.grupo}</em> · {e.titulo.slice(0, 100)}
              </div>
            ))}
          </div>
        </div>
      )}

      {mined.preambulo && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1F4E8C', textTransform: 'uppercase' }}>
            PREÁMBULO
          </p>
          <p style={{ margin: 0, fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.5, fontStyle: 'italic' }}>
            {mined.preambulo.slice(0, 600)}{mined.preambulo.length > 600 ? '…' : ''}
          </p>
        </div>
      )}

      {(mined.numArticulos != null || mined.numDisposiciones != null) && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#6e6e73' }}>
          {mined.numArticulos != null && <span>{mined.numArticulos} artículos detectados</span>}
          {mined.numDisposiciones != null && <span>· {mined.numDisposiciones} disposiciones</span>}
        </div>
      )}
    </div>
  )
}

function SummaryBox({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, background: '#FAFAFB', border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: small ? 12 : 22, fontWeight: 700, lineHeight: 1.1, color, fontVariantNumeric: 'tabular-nums', textTransform: small ? 'capitalize' : 'none', wordBreak: small ? 'break-word' : undefined }}>{value}</div>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function TrazabilidadPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Cargando…</div>}>
      <TrazabilidadInner/>
    </Suspense>
  )
}
