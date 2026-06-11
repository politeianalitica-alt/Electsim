'use client'

/**
 * CamaModule — Campañas y Macroargumentos.
 *
 * Módulo REUTILIZABLE: se monta en Estudio, War Room, Toolbox, Cuaderno y
 * Command Center pasando `espacio` (trazabilidad de dónde se crea cada
 * argumentario). El repositorio es único para toda la plataforma
 * (lib/cama/store.ts · localStorage), así el equipo ve las mismas
 * narrativas desde cualquier espacio.
 *
 * Funciones:
 *   - Crear, editar y archivar macroargumentos (argumentarios versionados)
 *   - Puntos clave, evidencias con fuerza, etiquetas y vínculos a paneles/notas
 *   - Indicadores de impacto (penetración · resonancia · riesgo)
 *   - Historial de versiones con restauración
 *   - Comparador lado a lado de dos narrativas
 *   - Exportación a Markdown y a PDF (vía impresión del navegador)
 */

import { useEffect, useMemo, useState } from 'react'
import { WS } from '@/lib/workspace/workspace-utils'
import type { EspacioCama, Macroargumento, MacroargumentoEstado } from '@/types/cama'
import {
  CAMA_CHANGE_EVENT,
  createMacroargumento,
  deleteMacroargumento,
  loadAll,
  loadRaw,
  restaurarVersion,
  saveAll,
  seedIfEmpty,
  toMarkdown,
  updateMacroargumento,
} from '@/lib/cama/store'
import { startNamespaceAutoSync } from '@/lib/sync/namespace-sync'
import SyncChip from '@/app/_components/SyncChip'

const ESTADOS: Array<{ id: MacroargumentoEstado | 'todos'; label: string }> = [
  { id: 'todos',     label: 'Todos' },
  { id: 'borrador',  label: 'Borradores' },
  { id: 'activo',    label: 'Activos' },
  { id: 'archivado', label: 'Archivados' },
]

const ESTADO_COLOR: Record<MacroargumentoEstado, string> = {
  borrador:  WS.warn,
  activo:    WS.success,
  archivado: WS.ink3,
}

const ESTADO_LABEL: Record<MacroargumentoEstado, string> = {
  borrador: 'Borrador', activo: 'Activo', archivado: 'Archivado',
}

interface CamaModuleProps {
  /** Espacio anfitrión (estudio · war-room · toolbox · cuaderno · command-center). */
  espacio: EspacioCama
  /** Altura máxima del módulo cuando va embebido (War Room, Toolbox, Cuaderno). */
  embebido?: boolean
}

export default function CamaModule({ espacio, embebido = false }: CamaModuleProps) {
  const [items, setItems] = useState<Macroargumento[]>([])
  const [filtro, setFiltro] = useState<MacroargumentoEstado | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)

  // Carga inicial + re-render cuando otro componente/pestaña toca el store.
  useEffect(() => {
    seedIfEmpty()
    const refresh = () => setItems(loadAll())
    refresh()
    window.addEventListener(CAMA_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CAMA_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  // Fase 2 · sync con la nube de la cuenta (pull → merge LWW → push). Si
  // Blob no está configurado, el ciclo se apaga solo y todo sigue local.
  useEffect(() => {
    return startNamespaceAutoSync('cama', { loadRaw, saveRaw: saveAll, changeEvent: CAMA_CHANGE_EVENT })
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter(m => {
      if (filtro !== 'todos' && m.estado !== filtro) return false
      if (!q) return true
      return (
        m.titulo.toLowerCase().includes(q) ||
        m.resumen.toLowerCase().includes(q) ||
        m.etiquetas.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [items, filtro, busqueda])

  const selected = items.find(m => m.id === selectedId) ?? null
  const comparados = compareIds
    .map(id => items.find(m => m.id === id))
    .filter(Boolean) as Macroargumento[]

  function handleNuevo() {
    const m = createMacroargumento({ titulo: 'Nuevo macroargumento', espacio })
    setSelectedId(m.id)
    setCompareMode(false)
  }

  function toggleCompare(id: string) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev.slice(-1), id],
    )
  }

  return (
    <div style={{ fontFamily: WS.font, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar narrativa, etiqueta…"
          style={{
            flex: '1 1 180px', maxWidth: 280, padding: '7px 12px', fontSize: 12.5,
            border: `1px solid ${WS.border}`, borderRadius: 9, background: WS.surface,
            color: WS.ink, outline: 'none', fontFamily: WS.font,
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {ESTADOS.map(e => (
            <button
              key={e.id}
              onClick={() => setFiltro(e.id)}
              style={{
                padding: '6px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 99,
                border: `1px solid ${filtro === e.id ? WS.accent : WS.border}`,
                background: filtro === e.id ? WS.accentSubtle : WS.surface,
                color: filtro === e.id ? WS.accent : WS.ink3,
                cursor: 'pointer', fontFamily: WS.font,
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <SyncChip namespace="cama" />
        <button
          onClick={() => { setCompareMode(v => !v); setSelectedId(null); setCompareIds([]) }}
          style={{
            padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 9,
            border: `1px solid ${compareMode ? WS.accent : WS.border}`,
            background: compareMode ? WS.accentSubtle : WS.surface,
            color: compareMode ? WS.accent : WS.ink2, cursor: 'pointer', fontFamily: WS.font,
          }}
        >
          ⊟ Comparar
        </button>
        <button
          onClick={handleNuevo}
          style={{
            padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 9,
            border: 'none', background: WS.accent, color: '#fff', cursor: 'pointer',
            fontFamily: WS.font,
          }}
        >
          + Nuevo macroargumento
        </button>
      </div>

      {compareMode && (
        <div style={{ fontSize: 12, color: WS.ink3 }}>
          Selecciona dos narrativas para compararlas lado a lado
          {comparados.length > 0 && ` · ${comparados.length}/2 seleccionadas`}.
        </div>
      )}

      {/* ── Comparador ── */}
      {compareMode && comparados.length === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {comparados.map(m => (
            <ComparePanel key={m.id} m={m} />
          ))}
        </div>
      )}

      {/* ── Lista + editor ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selected && !compareMode ? 'minmax(240px, 340px) 1fr' : '1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: selected && !compareMode ? 'flex' : 'grid',
            flexDirection: 'column',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
            maxHeight: embebido ? 520 : undefined,
            overflowY: embebido ? 'auto' : undefined,
          }}
        >
          {filtrados.length === 0 && (
            <div
              style={{
                padding: 28, textAlign: 'center', fontSize: 12.5, color: WS.ink3,
                border: `1px dashed ${WS.border}`, borderRadius: 12, gridColumn: '1 / -1',
              }}
            >
              No hay macroargumentos con este filtro. Crea el primero con
              “+ Nuevo macroargumento”.
            </div>
          )}
          {filtrados.map(m => (
            <CamaCard
              key={m.id}
              m={m}
              activa={selectedId === m.id}
              comparando={compareMode}
              marcada={compareIds.includes(m.id)}
              onClick={() => (compareMode ? toggleCompare(m.id) : setSelectedId(m.id))}
            />
          ))}
        </div>

        {selected && !compareMode && (
          <CamaEditor
            key={selected.id}
            m={selected}
            onClose={() => setSelectedId(null)}
            onDelete={() => { deleteMacroargumento(selected.id); setSelectedId(null) }}
          />
        )}
      </div>
    </div>
  )
}

// ── Tarjeta de lista ─────────────────────────────────────────────────────────

function CamaCard({
  m, activa, comparando, marcada, onClick,
}: {
  m: Macroargumento
  activa: boolean
  comparando: boolean
  marcada: boolean
  onClick: () => void
}) {
  const borde = comparando && marcada ? WS.accent : activa ? WS.accent : WS.border
  return (
    <div
      onClick={onClick}
      style={{
        background: WS.surface,
        border: `1px solid ${borde}`,
        borderLeft: `3px solid ${ESTADO_COLOR[m.estado]}`,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        boxShadow: activa || marcada ? '0 4px 14px rgba(0,0,0,0.07)' : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow .15s ease, border-color .15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: WS.ink, flex: 1, minWidth: 0 }}>
          {comparando && <span style={{ color: WS.accent, marginRight: 6 }}>{marcada ? '◉' : '◯'}</span>}
          {m.titulo}
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 700, color: ESTADO_COLOR[m.estado],
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          }}
        >
          {ESTADO_LABEL[m.estado]}
        </span>
      </div>
      <p
        style={{
          margin: '0 0 10px', fontSize: 12, color: WS.ink3, lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {m.resumen || 'Sin resumen todavía.'}
      </p>
      <ImpactoBars impacto={m.impacto} compact />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 10.5, color: WS.ink3 }}>
        <span>v{m.version}</span>
        <span>{m.puntosClave.length} puntos</span>
        <span>{m.evidencias.length} evidencias</span>
        <span style={{ marginLeft: 'auto' }}>
          {new Date(m.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

// ── Barras de impacto ────────────────────────────────────────────────────────

function ImpactoBars({ impacto, compact = false }: { impacto: Macroargumento['impacto']; compact?: boolean }) {
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'Penetración', value: impacto.penetracion, color: WS.accent },
    { label: 'Resonancia',  value: impacto.resonancia,  color: WS.success },
    { label: 'Riesgo',      value: impacto.riesgo,      color: WS.danger },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: compact ? 9.5 : 11, color: WS.ink3, width: compact ? 68 : 90, flexShrink: 0 }}>
            {r.label}
          </span>
          <div style={{ flex: 1, height: compact ? 4 : 6, background: WS.surface2, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, r.value))}%`, height: '100%', background: r.color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: compact ? 9.5 : 11, color: WS.ink2, width: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Panel comparador ─────────────────────────────────────────────────────────

function ComparePanel({ m }: { m: Macroargumento }) {
  return (
    <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: WS.ink, flex: 1 }}>{m.titulo}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: ESTADO_COLOR[m.estado], textTransform: 'uppercase' }}>
          {ESTADO_LABEL[m.estado]} · v{m.version}
        </span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: WS.ink2, lineHeight: 1.5 }}>
        {m.resumen || 'Sin resumen.'}
      </p>
      <div style={{ marginBottom: 12 }}>
        <ImpactoBars impacto={m.impacto} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: WS.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Puntos clave
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: WS.ink2, lineHeight: 1.6 }}>
        {m.puntosClave.length ? m.puntosClave.map((p, i) => <li key={i}>{p}</li>) : <li>Sin puntos clave.</li>}
      </ul>
    </div>
  )
}

// ── Editor ───────────────────────────────────────────────────────────────────

function CamaEditor({
  m, onClose, onDelete,
}: {
  m: Macroargumento
  onClose: () => void
  onDelete: () => void
}) {
  const [titulo, setTitulo] = useState(m.titulo)
  const [resumen, setResumen] = useState(m.resumen)
  const [puntos, setPuntos] = useState(m.puntosClave.join('\n'))
  const [etiquetas, setEtiquetas] = useState(m.etiquetas.join(', '))
  const [impacto, setImpacto] = useState(m.impacto)
  const [notaVersion, setNotaVersion] = useState('')
  const [evTexto, setEvTexto] = useState('')
  const [evFuente, setEvFuente] = useState('')
  const [evFuerza, setEvFuerza] = useState<'alta' | 'media' | 'baja'>('media')
  const [guardado, setGuardado] = useState(false)

  const dirty =
    titulo !== m.titulo ||
    resumen !== m.resumen ||
    puntos !== m.puntosClave.join('\n') ||
    etiquetas !== m.etiquetas.join(', ') ||
    JSON.stringify(impacto) !== JSON.stringify(m.impacto)

  function guardar() {
    updateMacroargumento(
      m.id,
      {
        titulo: titulo.trim() || 'Sin título',
        resumen,
        puntosClave: puntos.split('\n').map(s => s.trim()).filter(Boolean),
        etiquetas: etiquetas.split(',').map(s => s.trim()).filter(Boolean),
        impacto,
      },
      notaVersion.trim() || undefined,
    )
    setNotaVersion('')
    setGuardado(true)
    setTimeout(() => setGuardado(false), 1800)
  }

  function addEvidencia() {
    if (!evTexto.trim()) return
    updateMacroargumento(m.id, {
      evidencias: [
        ...m.evidencias,
        { id: 'ev-' + Math.random().toString(36).slice(2, 8), texto: evTexto.trim(), fuente: evFuente.trim() || undefined, fuerza: evFuerza },
      ],
    })
    setEvTexto(''); setEvFuente('')
  }

  function removeEvidencia(id: string) {
    updateMacroargumento(m.id, { evidencias: m.evidencias.filter(e => e.id !== id) })
  }

  function exportarMd() {
    const blob = new Blob([toMarkdown(m)], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `macroargumento-${m.id}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function exportarPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const html = toMarkdown(m)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/^# (.*)$/m, '<h1>$1</h1>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${m.titulo}</title>
      <style>body{font-family:-apple-system,system-ui,sans-serif;color:#1d1d1f;max-width:720px;margin:40px auto;line-height:1.55;font-size:14px}
      h1{font-size:24px}h2{font-size:16px;margin-top:24px}blockquote{color:#6e6e73;border-left:3px solid #d2d2d7;padding-left:12px;margin-left:0}
      li{margin:4px 0}</style></head><body>${html}</body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', fontSize: 12.5, fontFamily: WS.font,
    border: `1px solid ${WS.border}`, borderRadius: 9, background: WS.surface,
    color: WS.ink, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: WS.ink3, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14, padding: 18 }}>
      {/* Cabecera del editor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: ESTADO_COLOR[m.estado], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {ESTADO_LABEL[m.estado]} · v{m.version} · creado en {m.espacio}
        </span>
        <div style={{ flex: 1 }} />
        {(['borrador', 'activo', 'archivado'] as MacroargumentoEstado[]).map(e => (
          <button
            key={e}
            onClick={() => updateMacroargumento(m.id, { estado: e })}
            style={{
              padding: '4px 9px', fontSize: 10.5, fontWeight: 600, borderRadius: 99,
              border: `1px solid ${m.estado === e ? ESTADO_COLOR[e] : WS.border}`,
              background: m.estado === e ? `${ESTADO_COLOR[e]}18` : WS.surface,
              color: m.estado === e ? ESTADO_COLOR[e] : WS.ink3, cursor: 'pointer', fontFamily: WS.font,
            }}
          >
            {ESTADO_LABEL[e]}
          </button>
        ))}
        <button
          onClick={onClose}
          title="Cerrar editor"
          style={{ border: 'none', background: 'transparent', color: WS.ink3, fontSize: 15, cursor: 'pointer', padding: 4 }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Columna izquierda: contenido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Resumen · narrativa central</label>
            <textarea
              value={resumen}
              onChange={e => setResumen(e.target.value)}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Puntos clave · uno por línea</label>
            <textarea
              value={puntos}
              onChange={e => setPuntos(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Etiquetas · separadas por coma</label>
            <input value={etiquetas} onChange={e => setEtiquetas(e.target.value)} style={inputStyle} placeholder="#mensaje, #vivienda" />
          </div>
        </div>

        {/* Columna derecha: impacto, evidencias, versiones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Indicadores de impacto</label>
            {(
              [
                ['penetracion', 'Penetración'],
                ['resonancia', 'Resonancia'],
                ['riesgo', 'Riesgo'],
              ] as Array<[keyof typeof impacto, string]>
            ).map(([k, label]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, color: WS.ink2, width: 86, flexShrink: 0 }}>{label}</span>
                <input
                  type="range" min={0} max={100} value={impacto[k]}
                  onChange={e => setImpacto({ ...impacto, [k]: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: WS.accent }}
                />
                <span style={{ fontSize: 11.5, color: WS.ink2, width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {impacto[k]}
                </span>
              </div>
            ))}
          </div>

          <div>
            <label style={labelStyle}>Evidencias · {m.evidencias.length}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, maxHeight: 150, overflowY: 'auto' }}>
              {m.evidencias.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: WS.surface2, borderRadius: 9, fontSize: 11.5 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, marginTop: 1,
                    color: e.fuerza === 'alta' ? WS.success : e.fuerza === 'media' ? WS.warn : WS.ink3,
                  }}>
                    {e.fuerza}
                  </span>
                  <span style={{ flex: 1, color: WS.ink2, lineHeight: 1.4 }}>
                    {e.texto}
                    {e.fuente && <span style={{ color: WS.ink3 }}> · {e.fuente}</span>}
                  </span>
                  <button
                    onClick={() => removeEvidencia(e.id)}
                    style={{ border: 'none', background: 'transparent', color: WS.ink3, cursor: 'pointer', fontSize: 12, padding: 0 }}
                    title="Quitar evidencia"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={evTexto} onChange={e => setEvTexto(e.target.value)} placeholder="Nueva evidencia" style={{ ...inputStyle, flex: 2 }} />
              <input value={evFuente} onChange={e => setEvFuente(e.target.value)} placeholder="Fuente" style={{ ...inputStyle, flex: 1 }} />
              <select value={evFuerza} onChange={e => setEvFuerza(e.target.value as typeof evFuerza)} style={{ ...inputStyle, width: 80, flexShrink: 0 }}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <button
                onClick={addEvidencia}
                style={{ padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: `1px solid ${WS.border}`, background: WS.surface2, color: WS.ink2, cursor: 'pointer', flexShrink: 0 }}
              >
                +
              </button>
            </div>
          </div>

          {m.versiones.length > 0 && (
            <div>
              <label style={labelStyle}>Historial · {m.versiones.length} versiones</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                {m.versiones.map(v => (
                  <div key={v.version} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, padding: '5px 10px', background: WS.surface2, borderRadius: 8 }}>
                    <span style={{ fontWeight: 700, color: WS.ink2 }}>v{v.version}</span>
                    <span style={{ color: WS.ink3, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {new Date(v.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {v.nota && ` · ${v.nota}`}
                    </span>
                    <button
                      onClick={() => restaurarVersion(m.id, v.version)}
                      style={{ border: 'none', background: 'transparent', color: WS.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pie: guardar + exportar + eliminar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${WS.border}` }}>
        <input
          value={notaVersion}
          onChange={e => setNotaVersion(e.target.value)}
          placeholder="Nota de versión (opcional)"
          style={{ ...inputStyle, maxWidth: 240 }}
        />
        <button
          onClick={guardar}
          disabled={!dirty}
          style={{
            padding: '8px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 9, border: 'none',
            background: dirty ? WS.accent : WS.surface2, color: dirty ? '#fff' : WS.ink3,
            cursor: dirty ? 'pointer' : 'default', fontFamily: WS.font,
          }}
        >
          {guardado ? '✓ Guardado' : dirty ? 'Guardar cambios (nueva versión)' : 'Sin cambios'}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={exportarMd} style={btnSecundario}>⇡ Markdown</button>
        <button onClick={exportarPdf} style={btnSecundario}>⇡ PDF / Imprimir</button>
        <button
          onClick={() => { if (window.confirm('¿Eliminar este macroargumento? Esta acción no se puede deshacer.')) onDelete() }}
          style={{ ...btnSecundario, color: WS.danger, borderColor: WS.danger + '55' }}
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

const btnSecundario: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: 9,
  border: `1px solid ${WS.border}`, background: WS.surface, color: WS.ink2,
  cursor: 'pointer', fontFamily: WS.font,
}
