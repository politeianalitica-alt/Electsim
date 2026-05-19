'use client'
import type { PinnedEntity } from '@/types/investigations'
import { KIND_LABEL, KIND_COLOR } from '@/types/ontology'

export function PinnedSidebar({
  pinned,
  onUnpin,
}: {
  pinned: PinnedEntity[]
  onUnpin: (entityId: number) => void
}) {
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
        Entidades fijadas · {pinned.length}
      </h3>
      {pinned.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-ink-5)', lineHeight: 1.45 }}>
          Aún no hay entidades fijadas. Usa{' '}
          <kbd style={{
            background: 'var(--color-surface-sunken)',
            padding: '1px 5px', borderRadius: 4, fontSize: 10,
          }}>⌘P</kbd>{' '}para buscar y fijar actores, partidos, leyes o territorios.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pinned.map((p) => {
            const ent = p.entity
            if (!ent) return null
            return (
              <li key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-hairline-soft)',
              }}>
                <span style={{
                  width: 4, height: 28, borderRadius: 2,
                  background: KIND_COLOR[ent.kind], flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ent.display_name}
                  </div>
                  <div style={{
                    fontSize: 9.5, color: 'var(--color-ink-5)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {KIND_LABEL[ent.kind]}
                  </div>
                </div>
                <button
                  onClick={() => onUnpin(ent.id)}
                  title="Desfijar"
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--color-ink-5)', cursor: 'pointer',
                    fontSize: 14, padding: 4,
                  }}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
