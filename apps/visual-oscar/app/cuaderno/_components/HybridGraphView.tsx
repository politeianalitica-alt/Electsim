'use client'

/**
 * <HybridGraphView> · grafo unificado de notas + entidades del registry.
 *
 * Sprint Cuaderno N5 · constelación del Cuaderno.
 *
 * Nodos:
 *   ● note           · círculo color carpeta · click → abre nota
 *   ◉ person/party/  · disco color KIND + glyph · click → navega a /figuras/X
 *     ccaa/sector/                                            · /partidos/X · etc
 *     company/inst/
 *     country
 *
 * Aristas:
 *   note ↔ note      · gris claro (wikilink interno)
 *   note → entity    · color KIND con alpha 0.35 (mención)
 *
 * Interacción:
 *   - drag para reposicionar nodos
 *   - click para abrir (nota o entidad según tipo)
 *   - hover · cursor pointer + tooltip con role/folder
 *   - panel lateral arriba-derecha con filtros por kind (toggle + count)
 *
 * Implementación: canvas + simulación de fuerzas vanilla (sin d3-force).
 * Suficiente para hasta ~500 nodos. Para más usaríamos quadtree (Barnes-Hut).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { KIND_COLORS } from '@/lib/cuaderno/entity-registry'
import type { HybridGraphData, HybridGraphNode, HybridNodeKind } from '@/lib/cuaderno/store'

interface Props {
  data: HybridGraphData
  onSelectNote: (slug: string) => void
  onSelectEntity: (entitySlug: string, link: string) => void
  activeNoteSlug?: string
}

interface SimNode {
  id:        string
  kind:      HybridNodeKind
  label:     string
  degree:    number
  folder?:   string
  source?:   'manual' | 'auto'
  entitySlug?:  string
  entityLink?:  string
  entityRole?:  string
  x: number
  y: number
  vx: number
  vy: number
}

const FOLDER_COLORS: Record<string, string> = {
  Inicio:        '#1F4E8C',
  Investigación: '#7C3AED',
  Bitácora:      '#2d8a39',
  Notas:         '#525258',
}

function noteColor(folder: string | undefined): string {
  if (!folder) return '#6e6e73'
  return FOLDER_COLORS[folder] ?? '#6e6e73'
}

const KIND_LABELS: Record<HybridNodeKind, string> = {
  note:        'Notas',
  person:      'Personas',
  party:       'Partidos',
  ccaa:        'CCAA',
  sector:      'Sectores',
  company:     'Empresas',
  institution: 'Instituciones',
  country:     'Países',
}

const KIND_ORDER: HybridNodeKind[] = [
  'note', 'person', 'party', 'institution', 'ccaa', 'sector', 'company', 'country',
]

export default function HybridGraphView({
  data,
  onSelectNote,
  onSelectEntity,
  activeNoteSlug,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<HybridGraphData['edges']>([])
  const draggingRef = useRef<{ node: SimNode; offX: number; offY: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  // Estado de filtros · qué kinds están visibles
  const [visible, setVisible] = useState<Record<HybridNodeKind, boolean>>({
    note: true,
    person: true,
    party: true,
    ccaa: true,
    sector: true,
    company: true,
    institution: true,
    country: true,
  })

  // Counts por kind para el panel de filtros
  const counts = useMemo(() => {
    const out: Record<HybridNodeKind, number> = {
      note: 0, person: 0, party: 0, ccaa: 0,
      sector: 0, company: 0, institution: 0, country: 0,
    }
    for (const n of data.nodes) out[n.kind]++
    return out
  }, [data])

  // Refresca/actualiza nodos cuando los datos cambian (preserva posiciones existentes)
  useEffect(() => {
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]))
    const w = canvasRef.current?.clientWidth ?? 800
    const h = canvasRef.current?.clientHeight ?? 600
    const filtered = data.nodes.filter((n) => visible[n.kind])
    const filteredIds = new Set(filtered.map((n) => n.id))
    const nodes: SimNode[] = filtered.map((n) => {
      const e = prev.get(n.id)
      if (e) return { ...e, ...nodeOverlay(n) }
      return {
        ...nodeOverlay(n),
        x: w / 2 + (Math.random() - 0.5) * Math.min(w, h) * 0.8,
        y: h / 2 + (Math.random() - 0.5) * Math.min(w, h) * 0.8,
        vx: 0,
        vy: 0,
      }
    })
    nodesRef.current = nodes
    edgesRef.current = data.edges.filter((e) => filteredIds.has(e.from) && filteredIds.has(e.to))
  }, [data, visible])

  // Loop de simulación + render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpi = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      if (!canvas) return
      canvas.width = canvas.clientWidth * dpi
      canvas.height = canvas.clientHeight * dpi
    }
    resize()
    window.addEventListener('resize', resize)

    function tick() {
      const ns = nodesRef.current
      const es = edgesRef.current
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      const cx = w / 2
      const cy = h / 2

      // Repulsión n² · suficiente para <500 nodos
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i]
          const b = ns[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let d2 = dx * dx + dy * dy
          if (d2 < 1) d2 = 1
          const f = 3200 / d2
          const d = Math.sqrt(d2)
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }

      // Spring en cada arista · longitud objetivo más larga para entidades
      const byId = new Map(ns.map((n) => [n.id, n]))
      for (const e of es) {
        const a = byId.get(e.from)
        const b = byId.get(e.to)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const target = e.kind === 'note-entity' ? 140 : 110
        const k = e.kind === 'note-entity' ? 0.010 : 0.013
        const f = (d - target) * k
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      // Gravedad suave al centro
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.0008
        n.vy += (cy - n.y) * 0.0008
      }

      // Integración + damping + bounds
      for (const n of ns) {
        if (draggingRef.current?.node.id === n.id) continue
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
        if (n.x < 20) n.x = 20
        if (n.y < 20) n.y = 20
        if (n.x > w - 20) n.x = w - 20
        if (n.y > h - 20) n.y = h - 20
      }

      // Render
      const ctx = canvas!.getContext('2d')!
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Aristas · primero las note-entity con kind color suave, luego las note-note grises
      for (const e of es) {
        const a = byId.get(e.from)
        const b = byId.get(e.to)
        if (!a || !b) continue
        if (e.kind === 'note-entity') {
          const target = byId.get(e.to)
          const c = target && target.kind !== 'note' ? KIND_COLORS[target.kind] : null
          ctx.strokeStyle = c ? c.border : 'rgba(0,0,0,0.10)'
          ctx.lineWidth = 1
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'
          ctx.lineWidth = 1
        }
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      // Nodos
      for (const n of ns) {
        const isNote = n.kind === 'note'
        const r = Math.max(5, 6 + Math.sqrt(n.degree) * 2)
        const isActive = isNote && n.entitySlug === undefined && n.id === 'note:' + activeNoteSlug
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (isActive ? 3 : 0), 0, Math.PI * 2)
        if (isNote) {
          ctx.fillStyle = noteColor(n.folder)
          ctx.globalAlpha = n.source === 'auto' ? 0.5 : 1
        } else {
          const c = KIND_COLORS[n.kind]
          ctx.fillStyle = c.fg
          ctx.globalAlpha = 1
        }
        ctx.fill()
        ctx.globalAlpha = 1
        if (isActive) {
          ctx.strokeStyle = '#1F4E8C'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
        // Glyph para entidades · ej. ◆ ⊕ ⊞
        if (!isNote) {
          const c = KIND_COLORS[n.kind]
          ctx.fillStyle = '#fff'
          ctx.font = `${Math.min(11, r + 2)}px -apple-system,system-ui,sans-serif`
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.fillText(c.glyph, n.x, n.y)
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
        }
        // Label
        ctx.fillStyle = isNote ? 'rgba(29,29,31,0.85)' : KIND_COLORS[n.kind].fg
        ctx.font = isNote ? '11px -apple-system,system-ui,sans-serif' : '11px -apple-system,system-ui,sans-serif'
        ctx.textBaseline = 'top'
        const text = n.label.length > 30 ? n.label.slice(0, 28) + '…' : n.label
        ctx.fillText(text, n.x + r + 4, n.y - 6)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activeNoteSlug])

  // Interacción ratón
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function pick(x: number, y: number): SimNode | null {
      const ns = nodesRef.current
      for (let i = ns.length - 1; i >= 0; i--) {
        const n = ns[i]
        const r = Math.max(5, 6 + Math.sqrt(n.degree) * 2) + 6
        const dx = x - n.x
        const dy = y - n.y
        if (dx * dx + dy * dy < r * r) return n
      }
      return null
    }
    function pos(e: MouseEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function down(e: MouseEvent) {
      const p = pos(e)
      const n = pick(p.x, p.y)
      if (n) draggingRef.current = { node: n, offX: p.x - n.x, offY: p.y - n.y }
    }
    function move(e: MouseEvent) {
      const d = draggingRef.current
      if (!d) {
        const p = pos(e)
        const n = pick(p.x, p.y)
        if (canvas) {
          canvas.style.cursor = n ? 'pointer' : 'default'
          canvas.title = n
            ? n.kind === 'note'
              ? `${n.label} · ${n.folder ?? ''}`
              : `${n.label}${n.entityRole ? ' · ' + n.entityRole : ''}`
            : ''
        }
        return
      }
      const p = pos(e)
      d.node.x = p.x - d.offX
      d.node.y = p.y - d.offY
      d.node.vx = 0
      d.node.vy = 0
    }
    function up(e: MouseEvent) {
      const d = draggingRef.current
      if (d) {
        const p = pos(e)
        const moved = Math.abs(p.x - (d.node.x + d.offX)) + Math.abs(p.y - (d.node.y + d.offY))
        if (moved < 4) {
          if (d.node.kind === 'note') {
            const slug = d.node.id.replace(/^note:/, '')
            onSelectNote(slug)
          } else if (d.node.entitySlug && d.node.entityLink) {
            onSelectEntity(d.node.entitySlug, d.node.entityLink)
          }
        }
      }
      draggingRef.current = null
    }
    canvas.addEventListener('mousedown', down)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      canvas.removeEventListener('mousedown', down)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [onSelectNote, onSelectEntity])

  // Panel de filtros arriba-derecha
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 11,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          minWidth: 180,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Filtros · {data.nodes.length} nodos · {data.edges.length} aristas
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {KIND_ORDER.map((kind) => {
            if (counts[kind] === 0) return null
            const c = kind === 'note' ? { glyph: '●', fg: '#525258', bg: '#f3f4f6', border: '#e5e7eb' } : KIND_COLORS[kind]
            const isVisible = visible[kind]
            return (
              <button
                key={kind}
                onClick={() => setVisible((v) => ({ ...v, [kind]: !v[kind] }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 6px',
                  border: `1px solid ${isVisible ? c.border : '#e5e7eb'}`,
                  borderRadius: 4,
                  background: isVisible ? c.bg : '#f8fafc',
                  color: isVisible ? c.fg : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                  textAlign: 'left',
                  opacity: isVisible ? 1 : 0.55,
                }}
              >
                <span style={{ fontSize: 11, width: 14 }}>{c.glyph}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{KIND_LABELS[kind]}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{counts[kind]}</span>
              </button>
            )
          })}
        </div>
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #e5e7eb',
            fontSize: 10,
            color: '#94a3b8',
            lineHeight: 1.4,
          }}
        >
          Drag para mover · click para abrir
        </div>
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function nodeOverlay(n: HybridGraphNode) {
  return {
    id: n.id,
    kind: n.kind,
    label: n.label,
    degree: n.degree,
    folder: n.folder,
    source: n.source,
    entitySlug: n.entitySlug,
    entityLink: n.entityLink,
    entityRole: n.entityRole,
  }
}
