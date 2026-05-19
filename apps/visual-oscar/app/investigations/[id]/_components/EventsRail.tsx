'use client'
import type { AnalystEvent } from '@/types/investigations'

const VERB_COLOR: Record<string, string> = {
  create_investigation: 'var(--color-accent)',
  update_investigation: 'var(--color-ink-3)',
  archive_investigation: 'var(--color-ink-4)',
  pin_entity: 'var(--color-success)',
  unpin_entity: 'var(--color-warn)',
  add_notebook_block: 'var(--color-info)',
  add_hypothesis: 'var(--color-info)',
  add_evidence: 'var(--color-info)',
  add_brief_version: 'var(--color-info)',
}

const VERB_LABEL: Record<string, string> = {
  create_investigation: 'creó el caso',
  update_investigation: 'actualizó campos',
  archive_investigation: 'archivó',
  pin_entity: 'fijó entidad',
  unpin_entity: 'desfijó entidad',
  add_notebook_block: 'añadió bloque',
  add_hypothesis: 'añadió hipótesis',
  add_evidence: 'ingresó evidencia',
  add_canvas_state: 'editó canvas',
  add_brief_version: 'guardó briefing',
  add_comment: 'comentó',
}

export function EventsRail({ events }: { events: AnalystEvent[] }) {
  return (
    <aside style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-hairline)',
      borderRadius: 14, padding: 16,
      boxShadow: 'var(--shadow-xs)',
      position: 'sticky', top: 80,
    }}>
      <h3 style={{
        margin: '0 0 12px', fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--color-ink-4)',
      }}>
        Timeline · audit
      </h3>
      {events.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-ink-5)', lineHeight: 1.45 }}>
          Sin actividad todavía. Cada acción tuya queda registrada aquí
          para reconstrucción del análisis.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0,
                     display: 'flex', flexDirection: 'column', gap: 10,
                     maxHeight: 480, overflowY: 'auto' }}>
          {events.map((e) => {
            const color = VERB_COLOR[e.verb] ?? 'var(--color-ink-4)'
            const label = VERB_LABEL[e.verb] ?? e.verb.replace(/_/g, ' ')
            return (
              <li key={e.id} style={{
                display: 'flex', gap: 8, fontSize: 11.5, lineHeight: 1.4,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: color,
                  flexShrink: 0, marginTop: 6,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--color-ink-2)' }}>
                    <strong style={{ fontSize: 11.5 }}>{e.actor_id}</strong> {label}
                  </div>
                  <div style={{ color: 'var(--color-ink-5)', fontSize: 10.5 }}>
                    {new Date(e.ts).toLocaleString('es-ES', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
