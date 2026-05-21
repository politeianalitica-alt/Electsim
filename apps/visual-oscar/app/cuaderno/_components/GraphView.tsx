'use client'

/**
 * GraphView — grafo de notas tipo Obsidian.
 *
 * Simulación de fuerzas en vanilla TS (no requiere d3-force). Suficiente para
 * unas decenas / centenares de notas. Nodos arrastrables, click para abrir.
 */

import { useEffect, useRef } from 'react'
import type { GraphData } from '@/lib/cuaderno/store'

interface Props {
  data:        GraphData
  onSelect:    (slug: string) => void
  activeSlug?: string
}

interface Node {
  id:     string
  title:  string
  folder: string
  source: 'manual' | 'auto'
  degree: number
  x:      number
  y:      number
  vx:     number
  vy:     number
}

const FOLDER_COLORS: Record<string, string> = {
  'Inicio':         '#0071e3',
  'Investigación':  '#7C3AED',
  'Bitácora':       '#2d8a39',
  'Notas':          '#525258',
}
function colorOf(n: Node): string {
  return FOLDER_COLORS[n.folder] ?? '#6e6e73'
}

export default function GraphView({ data, onSelect, activeSlug }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Array<{ from: string; to: string }>>([])
  const draggingRef = useRef<{ node: Node; offX: number; offY: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  // Build / update nodes when data changes
  useEffect(() => {
    const prev = new Map(nodesRef.current.map(n => [n.id, n]))
    const w = canvasRef.current?.clientWidth ?? 800
    const h = canvasRef.current?.clientHeight ?? 600
    const nodes: Node[] = data.nodes.map(n => {
      const existing = prev.get(n.slug)
      if (existing) {
        return { ...existing, title: n.title, folder: n.folder, source: n.source, degree: n.degree }
      }
      return {
        id: n.slug, title: n.title, folder: n.folder, source: n.source, degree: n.degree,
        x: w/2 + (Math.random() - 0.5) * Math.min(w, h) * 0.8,
        y: h/2 + (Math.random() - 0.5) * Math.min(w, h) * 0.8,
        vx: 0, vy: 0,
      }
    })
    nodesRef.current = nodes
    edgesRef.current = data.edges
  }, [data])

  // Force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpi = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      if (!canvas) return
      canvas.width  = canvas.clientWidth  * dpi
      canvas.height = canvas.clientHeight * dpi
    }
    resize()
    window.addEventListener('resize', resize)

    function tick() {
      const ns = nodesRef.current
      const es = edgesRef.current
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      const cx = w / 2, cy = h / 2

      // Repulsion (n²) — fine for <300 nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j]
          let dx = b.x - a.x, dy = b.y - a.y
          let dist2 = dx*dx + dy*dy
          if (dist2 < 1) dist2 = 1
          const f = 3500 / dist2
          const dist = Math.sqrt(dist2)
          const fx = (dx / dist) * f
          const fy = (dy / dist) * f
          a.vx -= fx; a.vy -= fy
          b.vx += fx; b.vy += fy
        }
      }

      // Spring on edges
      const byId = new Map(ns.map(n => [n.id, n]))
      for (const e of es) {
        const a = byId.get(e.from), b = byId.get(e.to)
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx*dx + dy*dy) || 1
        const targetLen = 120
        const k = 0.012
        const f = (dist - targetLen) * k
        const fx = (dx / dist) * f
        const fy = (dy / dist) * f
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }

      // Gravity toward center
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.0008
        n.vy += (cy - n.y) * 0.0008
      }

      // Integration + damping
      for (const n of ns) {
        if (draggingRef.current?.node.id === n.id) continue
        n.vx *= 0.85; n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
        // Bounds
        if (n.x < 20)    n.x = 20
        if (n.y < 20)    n.y = 20
        if (n.x > w-20)  n.x = w-20
        if (n.y > h-20)  n.y = h-20
      }

      // Render
      const ctx = canvas!.getContext('2d')!
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Edges
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      for (const e of es) {
        const a = byId.get(e.from), b = byId.get(e.to)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      // Nodes
      for (const n of ns) {
        const r = Math.max(5, 6 + Math.sqrt(n.degree) * 2)
        const isActive = n.id === activeSlug
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (isActive ? 3 : 0), 0, Math.PI * 2)
        ctx.fillStyle = colorOf(n)
        ctx.globalAlpha = n.source === 'auto' ? 0.55 : 1
        ctx.fill()
        ctx.globalAlpha = 1
        if (isActive) {
          ctx.strokeStyle = '#0071e3'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
        // Label
        ctx.fillStyle = 'rgba(29,29,31,0.85)'
        ctx.font = '11px -apple-system,system-ui,sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(n.title.length > 30 ? n.title.slice(0,28) + '…' : n.title, n.x + r + 4, n.y - 6)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activeSlug])

  // Mouse interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function pick(x: number, y: number): Node | null {
      const ns = nodesRef.current
      for (let i = ns.length - 1; i >= 0; i--) {
        const n = ns[i]
        const r = Math.max(5, 6 + Math.sqrt(n.degree) * 2) + 6
        const dx = x - n.x, dy = y - n.y
        if (dx*dx + dy*dy < r*r) return n
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
        canvas!.style.cursor = n ? 'pointer' : 'default'
        return
      }
      const p = pos(e)
      d.node.x = p.x - d.offX
      d.node.y = p.y - d.offY
      d.node.vx = 0; d.node.vy = 0
    }
    function up(e: MouseEvent) {
      const d = draggingRef.current
      if (d) {
        const p = pos(e)
        const moved = Math.abs(p.x - (d.node.x + d.offX)) + Math.abs(p.y - (d.node.y + d.offY))
        if (moved < 4) onSelect(d.node.id)
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
  }, [onSelect])

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
  )
}
