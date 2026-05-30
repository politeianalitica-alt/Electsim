'use client'

/**
 * <EntitiesPanel> · panel lateral con las entidades mencionadas en la nota
 * activa + cross-references (otras notas con cada entidad).
 *
 * Sprint Cuaderno N2 · backlinks bidireccionales nota ↔ entidad.
 *
 * UX:
 *   - Sección "Entidades en esta nota" con badges agrupados por tipo
 *   - Click en una entidad → expande mostrando las otras notas que la mencionan
 *   - Cada nota es clickable → abre esa nota en el editor
 *   - Click "Abrir en dashboard" → navega a /figuras/X · /partidos/X · etc
 */

import { useMemo, useState } from 'react'
import {
  resolveEntity,
  KIND_COLORS,
  type CuadEntity,
  type EntityKind,
} from '@/lib/cuaderno/entity-registry'
import { notesByEntitySlug, type CuadernoNote } from '@/lib/cuaderno/store'

interface Props {
  /** Contenido markdown de la nota activa */
  content: string
  /** ID de la nota activa · para filtrarla del listado de cross-refs */
  activeNoteId: string | null
  /** Callback al hacer click en una nota relacionada · navegación a esa nota */
  onOpenNote: (id: string) => void
}

const KIND_LABELS: Record<EntityKind, string> = {
  person: 'Personas',
  party: 'Partidos',
  ccaa: 'CCAA',
  sector: 'Sectores',
  company: 'Empresas',
  institution: 'Instituciones',
  country: 'Países',
}

export function EntitiesPanel({ content, activeNoteId, onOpenNote }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Resuelve cada [[X]] del markdown a una entidad del registry · dedup por slug
  const entities = useMemo<CuadEntity[]>(() => {
    const seen = new Set<string>()
    const out: CuadEntity[] = []
    const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const e = resolveEntity(m[1].trim())
      if (e && !seen.has(e.slug)) {
        seen.add(e.slug)
        out.push(e)
      }
    }
    return out
  }, [content])

  // Agrupa por tipo para mostrar secciones · respeta orden lógico
  const grouped = useMemo(() => {
    const out: Partial<Record<EntityKind, CuadEntity[]>> = {}
    for (const e of entities) {
      if (!out[e.kind]) out[e.kind] = []
      out[e.kind]!.push(e)
    }
    return out
  }, [entities])

  // Para la entidad expandida, busca otras notas que la mencionan (excluye activa)
  const crossRefs = useMemo<CuadernoNote[]>(() => {
    if (!expanded) return []
    return notesByEntitySlug(expanded).filter((n) => n.id !== activeNoteId)
  }, [expanded, activeNoteId])

  if (entities.length === 0) {
    return (
      <div
        style={{
          padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 8, fontSize: 12, color: '#64748b',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
          Sin entidades reconocidas
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          Usa el botón <strong>◉ Entidad</strong> o escribe <code>[[Pedro Sánchez]]</code> para
          enlazar a figuras/partidos/sectores del dashboard.
        </div>
      </div>
    )
  }

  const orderedKinds: EntityKind[] = ['person', 'party', 'institution', 'ccaa', 'sector', 'company', 'country']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, color: '#64748b' }}>
        Entidades mencionadas · {entities.length}
      </div>

      {orderedKinds.map((kind) => {
        const list = grouped[kind]
        if (!list || list.length === 0) return null
        return (
          <div key={kind}>
            <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>
              {KIND_LABELS[kind]} · {list.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {list.map((e) => {
                const c = KIND_COLORS[e.kind]
                const isExp = expanded === e.slug
                return (
                  <button
                    key={e.slug}
                    onClick={() => setExpanded(isExp ? null : e.slug)}
                    title={e.role}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 4,
                      background: isExp ? c.fg : c.bg,
                      color: isExp ? '#fff' : c.fg,
                      border: `1px solid ${c.border}`,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{c.glyph}</span>
                    {e.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Cross-refs · otras notas que mencionan la entidad expandida */}
      {expanded && (() => {
        const e = resolveEntity(expanded)
        if (!e) return null
        const c = KIND_COLORS[e.kind]
        return (
          <div style={{
            marginTop: 6, padding: '10px 12px', borderRadius: 6,
            background: '#fff', border: `1px solid ${c.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: c.fg, fontWeight: 700 }}>
                {c.glyph} {e.name}
              </span>
              {e.role && (
                <span style={{ fontSize: 10, color: '#64748b' }}>· {e.role}</span>
              )}
            </div>
            <a
              href={e.link}
              style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: 4,
                background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
                fontSize: 11, fontWeight: 600, textDecoration: 'none', marginBottom: 8,
              }}
            >
              ⇗ Abrir en dashboard
            </a>
            {crossRefs.length === 0 ? (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Ninguna otra nota menciona esta entidad.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>
                  Otras notas · {crossRefs.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {crossRefs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onOpenNote(n.id)}
                      style={{
                        textAlign: 'left', padding: '6px 8px', borderRadius: 4,
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>
                        {n.folder} · {new Date(n.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
