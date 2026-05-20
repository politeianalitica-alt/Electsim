'use client'
/**
 * CommandPalette · Sprint 6 · S6.1
 *
 * Palette estilo Linear/Raycast usando `cmdk` (Vercel/Paco Coursey).
 * Atajos:
 *   ⌘K / Ctrl+K  · abre
 *   Esc          · cierra
 *   ↑↓ + Enter   · navega + ejecuta
 *
 * Comandos por grupo:
 *   - Navegación · MODULES.items aplanados (rutas)
 *   - Investigaciones · últimas N (localStorage 'politeia.recent_invs')
 *   - Acciones rápidas · nueva investigación, abrir Brain, etc.
 *
 * Complementa el GlobalSearch existente (que indexa entidades vía API).
 * Aquí el foco es navegación rápida + acciones · no fetch externo.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { MODULES } from './navigation'

interface QuickAction {
  id: string
  label: string
  hint?: string
  onSelect: () => void
}

interface RecentInvestigation {
  id: string | number
  title: string
}

function readRecentInvestigations(): RecentInvestigation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem('politeia.recent_invs')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 8) : []
  } catch {
    return []
  }
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<RecentInvestigation[]>([])

  // Toggle con ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Cargar recientes al abrir
  useEffect(() => {
    if (open) setRecent(readRecentInvestigations())
  }, [open])

  const navItems = useMemo(() => {
    return MODULES.flatMap((m) =>
      m.items
        .filter((i) => !i.hidden)
        .map((i) => ({
          id: `nav_${i.href}`,
          label: i.label,
          module: m.label,
          href: i.href,
        })),
    )
  }, [])

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'qa_new_inv',
        label: 'Nueva investigación',
        hint: 'Crear caso vacío',
        onSelect: () => router.push('/investigations'),
      },
      {
        id: 'qa_estudio',
        label: 'Abrir Estudio',
        hint: 'BI · dashboards · query',
        onSelect: () => router.push('/estudio'),
      },
      {
        id: 'qa_briefing',
        label: 'Morning Briefing',
        hint: 'Resumen del día',
        onSelect: () => router.push('/briefing'),
      },
      {
        id: 'qa_alertas',
        label: 'Alertas prioritarias',
        hint: 'Eventos críticos abiertos',
        onSelect: () => router.push('/alertas'),
      },
    ],
    [router],
  )

  if (!open) return null

  function run(action: () => void) {
    setOpen(false)
    // micro-delay para que el dialog se cierre antes de navegar
    setTimeout(action, 0)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 17, 21, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      >
        <Command
          label="Paleta de comandos · Politeia"
          loop
          shouldFilter
        >
          <Command.Input
            autoFocus
            placeholder="Buscar páginas, acciones, investigaciones recientes…"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              padding: '16px 18px',
              fontSize: 15,
              borderBottom: '1px solid #e5e7eb',
              fontFamily: 'inherit',
            }}
          />
          <Command.List
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              padding: 6,
            }}
          >
            <Command.Empty
              style={{
                padding: 18,
                fontSize: 13,
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              Sin resultados.
            </Command.Empty>

            <Command.Group
              heading="Acciones rápidas"
              style={{ fontSize: 11, color: '#6b7280', padding: '8px 10px 4px' }}
            >
              {quickActions.map((a) => (
                <Command.Item
                  key={a.id}
                  value={`${a.label} ${a.hint ?? ''}`}
                  onSelect={() => run(a.onSelect)}
                  style={itemStyle}
                >
                  <span style={{ fontWeight: 600 }}>{a.label}</span>
                  {a.hint && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{a.hint}</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {recent.length > 0 && (
              <Command.Group
                heading="Investigaciones recientes"
                style={{ fontSize: 11, color: '#6b7280', padding: '8px 10px 4px' }}
              >
                {recent.map((inv) => (
                  <Command.Item
                    key={`recent_${inv.id}`}
                    value={`inv ${inv.title}`}
                    onSelect={() => run(() => router.push(`/investigations/${inv.id}`))}
                    style={itemStyle}
                  >
                    <span style={{ fontWeight: 500 }}>{inv.title}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>#{inv.id}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Navegación"
              style={{ fontSize: 11, color: '#6b7280', padding: '8px 10px 4px' }}
            >
              {navItems.map((n) => (
                <Command.Item
                  key={n.id}
                  value={`${n.module} ${n.label} ${n.href}`}
                  onSelect={() => run(() => router.push(n.href))}
                  style={itemStyle}
                >
                  <span style={{ fontWeight: 500 }}>{n.label}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {n.module} · {n.href}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <footer
            style={{
              padding: '8px 14px',
              borderTop: '1px solid #f1f5f9',
              fontSize: 11,
              color: '#94a3b8',
              display: 'flex',
              gap: 14,
              justifyContent: 'space-between',
            }}
          >
            <span>↑↓ navegar · Enter ejecutar · Esc cerrar</span>
            <span>cmdk · Politeia ⌘K</span>
          </footer>
        </Command>
      </div>
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '9px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  gap: 12,
}
