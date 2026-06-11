'use client'

/**
 * PreinformesModule — Generador de informes preliminares.
 *
 * Módulo REUTILIZABLE (Estudio, War Room, Toolbox, Cuaderno, Command
 * Center) con asistente por pasos:
 *
 *   1. Plantilla y público  → ejecutivo / campaña / riesgo / sectorial
 *   2. Fuentes              → paneles, vigilantes, consultas, notas del
 *                             Cuaderno y macroargumentos de la Cama (reales)
 *   3. Secciones            → incluir/excluir y redactar cada bloque
 *   4. Revisión y generación → Markdown descargable o PDF imprimible
 *
 * Repositorio único en localStorage (lib/preinformes/store.ts).
 */

import { useEffect, useMemo, useState } from 'react'
import { WS } from '@/lib/workspace/workspace-utils'
import type {
  FuentePreinforme,
  Preinforme,
  PreinformePlantillaId,
  PreinformePublico,
  SeccionPreinforme,
  EspacioPreinforme,
} from '@/types/preinforme'
import {
  PLANTILLAS,
  PREINFORMES_CHANGE_EVENT,
  PUBLICO_LABEL,
  buildMarkdown,
  createPreinforme,
  deletePreinforme,
  fuentesDisponibles,
  generarPreinforme,
  getPlantilla,
  loadAll,
  loadRaw,
  saveAll,
  updatePreinforme,
} from '@/lib/preinformes/store'
import { startNamespaceAutoSync } from '@/lib/sync/namespace-sync'
import SyncChip from '@/app/_components/SyncChip'

const PASOS = ['Plantilla', 'Fuentes', 'Secciones', 'Revisión'] as const

const TIPO_LABEL: Record<FuentePreinforme['tipo'], string> = {
  panel: 'Paneles', vigilante: 'Vigilantes', consulta: 'Consultas',
  nota: 'Notas del Cuaderno', macroargumento: 'Macroargumentos (Cama)',
}

interface WizardState {
  id:        string | null
  paso:      number
  titulo:    string
  plantilla: PreinformePlantillaId
  publico:   PreinformePublico
  fuentes:   FuentePreinforme[]
  secciones: SeccionPreinforme[]
}

function wizardVacio(): WizardState {
  return {
    id: null, paso: 0, titulo: '',
    plantilla: 'ejecutivo', publico: 'direccion',
    fuentes: [],
    secciones: getPlantilla('ejecutivo').secciones.map((s, i) => ({
      id: `sec-${i}`, titulo: s.titulo, contenido: '', incluida: true,
    })),
  }
}

interface PreinformesModuleProps {
  /** Espacio anfitrión (estudio · war-room · toolbox · cuaderno · command-center). */
  espacio: EspacioPreinforme
  /** Altura contenida cuando va embebido en otro shell. */
  embebido?: boolean
  /** Contenido inicial (p. ej. una nota del Cuaderno convertida en borrador). */
  semilla?: { titulo: string; contenido: string } | null
}

export default function PreinformesModule({ espacio, embebido = false, semilla = null }: PreinformesModuleProps) {
  const [items, setItems] = useState<Preinforme[]>([])
  const [wizard, setWizard] = useState<WizardState | null>(null)
  const [verId, setVerId] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setItems(loadAll())
    refresh()
    window.addEventListener(PREINFORMES_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PREINFORMES_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  // Fase 2 · sync con la nube de la cuenta (pull → merge LWW → push).
  useEffect(() => {
    return startNamespaceAutoSync('preinformes', { loadRaw, saveRaw: saveAll, changeEvent: PREINFORMES_CHANGE_EVENT })
  }, [])

  // Semilla (nota del Cuaderno → preinforme): abre el asistente precargado.
  useEffect(() => {
    if (!semilla) return
    const w = wizardVacio()
    w.titulo = semilla.titulo
    w.secciones = w.secciones.map((s, i) =>
      i === 1 ? { ...s, contenido: semilla.contenido } : s,
    )
    setWizard(w)
    // Solo al montar con semilla; el flujo posterior es del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visto = items.find(p => p.id === verId) ?? null

  function abrirNuevo() {
    setVerId(null)
    setWizard(wizardVacio())
  }

  function editarExistente(p: Preinforme) {
    setVerId(null)
    setWizard({
      id: p.id, paso: 2, titulo: p.titulo, plantilla: p.plantilla,
      publico: p.publico, fuentes: [...p.fuentes],
      secciones: p.secciones.map(s => ({ ...s })),
    })
  }

  return (
    <div style={{ fontFamily: WS.font, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!wizard && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: WS.ink3 }}>
              {items.length === 0
                ? 'Genera borradores de informe a partir de tus paneles, vigilantes, notas y macroargumentos.'
                : `${items.length} preinforme${items.length === 1 ? '' : 's'} · ${items.filter(p => p.estado === 'generado').length} generados`}
            </span>
            <div style={{ flex: 1 }} />
            <SyncChip namespace="preinformes" />
            <button onClick={abrirNuevo} style={btnPrimario}>+ Nuevo preinforme</button>
          </div>

          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10,
              maxHeight: embebido ? 520 : undefined, overflowY: embebido ? 'auto' : undefined,
            }}
          >
            {items.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', fontSize: 12.5, color: WS.ink3, border: `1px dashed ${WS.border}`, borderRadius: 12, gridColumn: '1 / -1' }}>
                Aún no hay preinformes. El asistente te guía en 4 pasos:
                plantilla, fuentes, secciones y generación.
              </div>
            )}
            {items.map(p => (
              <PreinformeCard
                key={p.id}
                p={p}
                onVer={() => setVerId(p.id)}
                onEditar={() => editarExistente(p)}
                onEliminar={() => {
                  if (window.confirm('¿Eliminar este preinforme?')) {
                    deletePreinforme(p.id)
                    if (verId === p.id) setVerId(null)
                  }
                }}
              />
            ))}
          </div>

          {visto && <VistaGenerada p={visto} onCerrar={() => setVerId(null)} />}
        </>
      )}

      {wizard && (
        <Asistente
          state={wizard}
          espacio={espacio}
          onChange={setWizard}
          onCerrar={() => setWizard(null)}
        />
      )}
    </div>
  )
}

// ── Tarjeta de preinforme ────────────────────────────────────────────────────

function PreinformeCard({
  p, onVer, onEditar, onEliminar,
}: {
  p: Preinforme
  onVer: () => void
  onEditar: () => void
  onEliminar: () => void
}) {
  const generado = p.estado === 'generado'
  return (
    <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderLeft: `3px solid ${generado ? WS.success : WS.warn}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: WS.ink, flex: 1 }}>{p.titulo}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: generado ? WS.success : WS.warn, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {generado ? 'Generado' : 'Borrador'}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: WS.ink3, marginBottom: 10 }}>
        {getPlantilla(p.plantilla).nombre} · {PUBLICO_LABEL[p.publico]} · {p.fuentes.length} fuentes ·{' '}
        {new Date(p.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {generado && <button onClick={onVer} style={btnMini}>Ver documento</button>}
        <button onClick={onEditar} style={btnMini}>{generado ? 'Reabrir' : 'Continuar'}</button>
        <div style={{ flex: 1 }} />
        <button onClick={onEliminar} style={{ ...btnMini, color: WS.danger }}>Eliminar</button>
      </div>
    </div>
  )
}

// ── Vista del documento generado ─────────────────────────────────────────────

function VistaGenerada({ p, onCerrar }: { p: Preinforme; onCerrar: () => void }) {
  const md = p.markdown ?? buildMarkdown(p)
  return (
    <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: WS.ink }}>Documento generado</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => descargarMd(md, p.titulo)} style={btnSecundario}>⇡ Markdown</button>
        <button onClick={() => imprimirMd(md, p.titulo)} style={btnSecundario}>⇡ PDF / Imprimir</button>
        <button onClick={onCerrar} style={{ border: 'none', background: 'transparent', color: WS.ink3, fontSize: 15, cursor: 'pointer' }}>✕</button>
      </div>
      <pre
        style={{
          margin: 0, padding: 16, background: WS.surface2, borderRadius: 10,
          fontSize: 12, lineHeight: 1.6, color: WS.ink2, whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', maxHeight: 420, overflowY: 'auto',
        }}
      >
        {md}
      </pre>
    </div>
  )
}

// ── Asistente por pasos ──────────────────────────────────────────────────────

function Asistente({
  state, espacio, onChange, onCerrar,
}: {
  state: WizardState
  espacio: EspacioPreinforme
  onChange: (s: WizardState) => void
  onCerrar: () => void
}) {
  const fuentes = useMemo(() => fuentesDisponibles(), [])
  const tipos = useMemo(
    () => Array.from(new Set(fuentes.map(f => f.tipo))) as FuentePreinforme['tipo'][],
    [fuentes],
  )
  const [mdFinal, setMdFinal] = useState<string | null>(null)

  function setPlantilla(id: PreinformePlantillaId) {
    // Cambiar de plantilla regenera las secciones (se pierde lo escrito:
    // avisamos solo si había contenido).
    const hayContenido = state.secciones.some(s => s.contenido.trim())
    if (hayContenido && !window.confirm('Cambiar de plantilla reinicia las secciones redactadas. ¿Continuar?')) return
    onChange({
      ...state,
      plantilla: id,
      secciones: getPlantilla(id).secciones.map((s, i) => ({
        id: `sec-${i}`, titulo: s.titulo, contenido: '', incluida: true,
      })),
    })
  }

  function toggleFuente(f: FuentePreinforme) {
    const tiene = state.fuentes.some(x => x.id === f.id)
    onChange({
      ...state,
      fuentes: tiene ? state.fuentes.filter(x => x.id !== f.id) : [...state.fuentes, f],
    })
  }

  function persistir(): string {
    // Crea o actualiza el preinforme en el store y devuelve su id.
    if (state.id) {
      updatePreinforme(state.id, {
        titulo: state.titulo.trim() || 'Preinforme sin título',
        plantilla: state.plantilla,
        publico: state.publico,
        fuentes: state.fuentes,
        secciones: state.secciones,
      })
      return state.id
    }
    const creado = createPreinforme({
      titulo: state.titulo.trim() || 'Preinforme sin título',
      plantilla: state.plantilla,
      publico: state.publico,
      fuentes: state.fuentes,
      espacio,
    })
    updatePreinforme(creado.id, { secciones: state.secciones })
    return creado.id
  }

  function guardarBorrador() {
    persistir()
    onCerrar()
  }

  function generar() {
    const id = persistir()
    const generado = generarPreinforme(id)
    if (generado?.markdown) setMdFinal(generado.markdown)
  }

  const ultimo = state.paso === PASOS.length - 1

  return (
    <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14, padding: 18 }}>
      {/* Cabecera de pasos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {PASOS.map((p, i) => (
          <button
            key={p}
            onClick={() => onChange({ ...state, paso: i })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
              fontSize: 11.5, fontWeight: 600, borderRadius: 99, cursor: 'pointer', fontFamily: WS.font,
              border: `1px solid ${state.paso === i ? WS.accent : WS.border}`,
              background: state.paso === i ? WS.accentSubtle : WS.surface,
              color: state.paso === i ? WS.accent : i < state.paso ? WS.ink2 : WS.ink3,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: 99, fontSize: 9.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: i < state.paso ? WS.success : state.paso === i ? WS.accent : WS.surface2,
              color: i <= state.paso ? '#fff' : WS.ink3,
            }}>
              {i < state.paso ? '✓' : i + 1}
            </span>
            {p}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onCerrar} title="Cerrar asistente" style={{ border: 'none', background: 'transparent', color: WS.ink3, fontSize: 15, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Paso 1 · Plantilla y público */}
      {state.paso === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Título del informe</label>
            <input
              value={state.titulo}
              onChange={e => onChange({ ...state, titulo: e.target.value })}
              placeholder="P. ej. Nota semanal · situación PGE"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Plantilla</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {PLANTILLAS.map(t => (
                <div
                  key={t.id}
                  onClick={() => setPlantilla(t.id)}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${state.plantilla === t.id ? WS.accent : WS.border}`,
                    background: state.plantilla === t.id ? WS.accentSubtle : WS.surface,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: state.plantilla === t.id ? WS.accent : WS.ink, marginBottom: 4 }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: WS.ink3, lineHeight: 1.45 }}>{t.descripcion}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Público</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(Object.keys(PUBLICO_LABEL) as PreinformePublico[]).map(pu => (
                <button
                  key={pu}
                  onClick={() => onChange({ ...state, publico: pu })}
                  style={{
                    padding: '6px 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 99, cursor: 'pointer', fontFamily: WS.font,
                    border: `1px solid ${state.publico === pu ? WS.accent : WS.border}`,
                    background: state.publico === pu ? WS.accentSubtle : WS.surface,
                    color: state.publico === pu ? WS.accent : WS.ink3,
                  }}
                >
                  {PUBLICO_LABEL[pu]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 2 · Fuentes */}
      {state.paso === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: WS.ink3 }}>
            Selecciona qué datos alimentan el informe. Las notas del Cuaderno y los
            macroargumentos de la Cama se listan en tiempo real.
          </div>
          {tipos.map(tipo => {
            const grupo = fuentes.filter(f => f.tipo === tipo)
            return (
              <div key={tipo}>
                <div style={{ ...labelStyle, marginBottom: 6 }}>{TIPO_LABEL[tipo]} · {grupo.length}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6 }}>
                  {grupo.map(f => {
                    const activa = state.fuentes.some(x => x.id === f.id)
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleFuente(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 9, cursor: 'pointer', fontSize: 12,
                          border: `1px solid ${activa ? WS.accent : WS.border}`,
                          background: activa ? WS.accentSubtle : WS.surface,
                        }}
                      >
                        <span style={{ color: activa ? WS.accent : WS.ink3, fontSize: 13 }}>{activa ? '◉' : '◯'}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', color: WS.ink, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.label}</span>
                          {f.detalle && <span style={{ display: 'block', color: WS.ink3, fontSize: 10.5 }}>{f.detalle}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paso 3 · Secciones */}
      {state.paso === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.secciones.map((s, i) => {
            const guia = getPlantilla(state.plantilla).secciones[i]?.guia ?? ''
            return (
              <div key={s.id} style={{ border: `1px solid ${WS.border}`, borderRadius: 10, padding: 12, opacity: s.incluida ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: s.incluida ? 8 : 0 }}>
                  <button
                    onClick={() => onChange({
                      ...state,
                      secciones: state.secciones.map(x => x.id === s.id ? { ...x, incluida: !x.incluida } : x),
                    })}
                    title={s.incluida ? 'Excluir sección' : 'Incluir sección'}
                    style={{
                      width: 18, height: 18, borderRadius: 5, cursor: 'pointer', fontSize: 11, lineHeight: 1,
                      border: `1px solid ${s.incluida ? WS.accent : WS.border}`,
                      background: s.incluida ? WS.accent : WS.surface, color: '#fff',
                    }}
                  >
                    {s.incluida ? '✓' : ''}
                  </button>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: WS.ink }}>{s.titulo}</span>
                </div>
                {s.incluida && (
                  <textarea
                    value={s.contenido}
                    onChange={e => onChange({
                      ...state,
                      secciones: state.secciones.map(x => x.id === s.id ? { ...x, contenido: e.target.value } : x),
                    })}
                    placeholder={guia}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paso 4 · Revisión */}
      {state.paso === 3 && !mdFinal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: WS.ink2, flexWrap: 'wrap' }}>
            <span><strong>{state.titulo.trim() || 'Preinforme sin título'}</strong></span>
            <span>Plantilla: {getPlantilla(state.plantilla).nombre}</span>
            <span>Público: {PUBLICO_LABEL[state.publico]}</span>
            <span>{state.fuentes.length} fuentes</span>
            <span>{state.secciones.filter(s => s.incluida).length} secciones incluidas</span>
          </div>
          <pre style={{
            margin: 0, padding: 16, background: WS.surface2, borderRadius: 10, fontSize: 12,
            lineHeight: 1.6, color: WS.ink2, whiteSpace: 'pre-wrap', maxHeight: 380, overflowY: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {buildMarkdown({
              id: 'preview', titulo: state.titulo.trim() || 'Preinforme sin título',
              plantilla: state.plantilla, publico: state.publico, fuentes: state.fuentes,
              secciones: state.secciones, estado: 'borrador', espacio,
              createdAt: 0, updatedAt: 0,
            })}
          </pre>
        </div>
      )}

      {/* Documento final generado dentro del asistente */}
      {state.paso === 3 && mdFinal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: WS.success }}>✓ Preinforme generado</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => descargarMd(mdFinal, state.titulo || 'preinforme')} style={btnSecundario}>⇡ Markdown</button>
            <button onClick={() => imprimirMd(mdFinal, state.titulo || 'preinforme')} style={btnSecundario}>⇡ PDF / Imprimir</button>
          </div>
          <pre style={{
            margin: 0, padding: 16, background: WS.surface2, borderRadius: 10, fontSize: 12,
            lineHeight: 1.6, color: WS.ink2, whiteSpace: 'pre-wrap', maxHeight: 380, overflowY: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {mdFinal}
          </pre>
        </div>
      )}

      {/* Pie de navegación */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${WS.border}` }}>
        {state.paso > 0 && !mdFinal && (
          <button onClick={() => onChange({ ...state, paso: state.paso - 1 })} style={btnSecundario}>← Anterior</button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={mdFinal ? onCerrar : guardarBorrador} style={btnSecundario}>
          {mdFinal ? 'Cerrar' : 'Guardar borrador'}
        </button>
        {!ultimo && (
          <button onClick={() => onChange({ ...state, paso: state.paso + 1 })} style={btnPrimario}>
            Siguiente →
          </button>
        )}
        {ultimo && !mdFinal && (
          <button onClick={generar} style={btnPrimario}>Generar preinforme</button>
        )}
      </div>
    </div>
  )
}

// ── Helpers de exportación ───────────────────────────────────────────────────

function slugFile(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'preinforme'
}

function descargarMd(md: string, titulo: string) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slugFile(titulo)}.md`
  a.click()
  URL.revokeObjectURL(a.href)
}

function imprimirMd(md: string, titulo: string) {
  const w = window.open('', '_blank')
  if (!w) return
  const html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/^# (.*)$/m, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '<br/><br/>')
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
    <style>body{font-family:-apple-system,system-ui,sans-serif;color:#1d1d1f;max-width:720px;margin:40px auto;line-height:1.55;font-size:14px}
    h1{font-size:24px}h2{font-size:16px;margin-top:24px}blockquote{color:#6e6e73;border-left:3px solid #d2d2d7;padding-left:12px;margin-left:0}
    li{margin:4px 0}hr{border:none;border-top:1px solid #d2d2d7;margin:24px 0}</style></head><body>${html}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}

// ── Estilos compartidos ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', fontSize: 12.5, fontFamily: WS.font,
  border: `1px solid ${WS.border}`, borderRadius: 9, background: WS.surface,
  color: WS.ink, outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: WS.ink3, textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 5, display: 'block',
}

const btnPrimario: React.CSSProperties = {
  padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 9,
  border: 'none', background: WS.accent, color: '#fff', cursor: 'pointer', fontFamily: WS.font,
}

const btnSecundario: React.CSSProperties = {
  padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 9,
  border: `1px solid ${WS.border}`, background: WS.surface, color: WS.ink2,
  cursor: 'pointer', fontFamily: WS.font,
}

const btnMini: React.CSSProperties = {
  padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 8,
  border: `1px solid ${WS.border}`, background: WS.surface, color: WS.ink2,
  cursor: 'pointer', fontFamily: WS.font,
}
