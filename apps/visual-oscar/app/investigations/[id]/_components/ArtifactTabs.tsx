'use client'
import { useState } from 'react'
import { investigationsApi } from '@/lib/api/investigations'
import type { InvestigationDetail, ArtifactKind, Artifact } from '@/types/investigations'
import { CanvasView } from './CanvasView'
import { EntityGraphView } from './EntityGraphView'

const TABS: { key: Tab; label: string; kind: ArtifactKind | null }[] = [
  { key: 'notebook',   label: 'Notebook',     kind: 'notebook_block' },
  { key: 'hypothesis', label: 'Hipótesis',    kind: 'hypothesis' },
  { key: 'evidence',   label: 'Evidencias',   kind: 'evidence' },
  { key: 'graph',      label: 'Grafo',        kind: null },
  { key: 'canvas',     label: 'Canvas',       kind: 'canvas_state' },
  { key: 'briefs',     label: 'Briefings',    kind: 'brief_version' },
]

type Tab = 'notebook' | 'hypothesis' | 'evidence' | 'graph' | 'canvas' | 'briefs'

export function ArtifactTabs({
  tab, onTabChange, detail, onArtifactsChanged,
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  detail: InvestigationDetail
  onArtifactsChanged: () => void | Promise<void>
}) {
  const currentTab = TABS.find(t => t.key === tab)!
  const artifacts = detail.artifacts.filter(a => a.artifact_kind === currentTab.kind)

  return (
    <section style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-hairline)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-xs)',
      minHeight: 400,
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: 8,
        borderBottom: '1px solid var(--color-hairline-soft)',
        background: 'var(--color-surface-raised)',
        borderRadius: '14px 14px 0 0',
      }}>
        {TABS.map(t => {
          const count = detail.artifacts.filter(a => a.artifact_kind === t.kind).length
          const isActive = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                background: isActive ? 'var(--color-surface)' : 'transparent',
                color: isActive ? 'var(--color-ink)' : 'var(--color-ink-4)',
                border: 'none',
                padding: '8px 14px', borderRadius: 8,
                fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 700,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-ink-5)',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: 18 }}>
        {tab === 'notebook' && (
          <NotebookTab
            artifacts={artifacts}
            investigationId={detail.id}
            onAdded={onArtifactsChanged}
          />
        )}
        {tab === 'hypothesis' && (
          <HypothesisTab
            artifacts={artifacts}
            investigationId={detail.id}
            onAdded={onArtifactsChanged}
          />
        )}
        {tab === 'evidence' && (
          <EvidenceTab
            artifacts={artifacts}
            investigationId={detail.id}
            onAdded={onArtifactsChanged}
          />
        )}
        {tab === 'graph' && (
          <EntityGraphView
            pinnedEntities={detail.pinned
              .filter((p) => p.entity)
              .map((p) => ({
                id: String(p.entity_id),
                name: p.entity?.display_name ?? `#${p.entity_id}`,
                kind: p.entity?.kind ?? 'organization',
                slug: p.entity?.slug ?? '',
              }))}
          />
        )}
        {tab === 'canvas' && <CanvasView investigationId={detail.id} />}
        {tab === 'briefs' && (
          <BriefsTab
            artifacts={artifacts}
            investigationId={detail.id}
            onAdded={onArtifactsChanged}
          />
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tab implementations
// ─────────────────────────────────────────────────────────────────

function NotebookTab({ artifacts, investigationId, onAdded }: TabProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  async function add() {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await investigationsApi.addArtifact(investigationId, {
        artifact_kind: 'notebook_block',
        title: text.split('\n')[0].slice(0, 80),
        payload: { content: text, format: 'markdown' },
      })
      setText('')
      await onAdded()
    } finally { setBusy(false) }
  }
  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Escribe una nota, hipótesis o reflexión. Markdown soportado."
        style={{
          width: '100%', minHeight: 100,
          padding: 12, borderRadius: 10,
          border: '1px solid var(--color-hairline)',
          background: 'var(--color-bg)',
          fontFamily: 'var(--font-text)', fontSize: 13.5, color: 'var(--color-ink)',
          resize: 'vertical', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={add} disabled={!text.trim() || busy}
          style={primaryBtn(busy, !text.trim())}
        >
          {busy ? 'Guardando…' : 'Añadir bloque'}
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0',
                   display: 'flex', flexDirection: 'column', gap: 10 }}>
        {artifacts.map(a => (
          <li key={a.id} style={artifactCardStyle()}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-3)', marginBottom: 6 }}>
              {a.title || '(sin título)'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {String(a.payload?.content ?? '')}
            </div>
            <ArtifactMeta artifact={a} />
          </li>
        ))}
        {artifacts.length === 0 && <EmptyMini text="Sin bloques. Empieza escribiendo arriba." />}
      </ul>
    </div>
  )
}

function HypothesisTab({ artifacts, investigationId, onAdded }: TabProps) {
  const [statement, setStatement] = useState('')
  const [busy, setBusy] = useState(false)
  async function add() {
    if (!statement.trim() || busy) return
    setBusy(true)
    try {
      await investigationsApi.addArtifact(investigationId, {
        artifact_kind: 'hypothesis',
        title: statement.slice(0, 120),
        payload: {
          statement,
          status: 'open',
          ach_scores: {},
          confidence: 0.5,
        },
      })
      setStatement('')
      await onAdded()
    } finally { setBusy(false) }
  }
  return (
    <div>
      <input
        value={statement}
        onChange={e => setStatement(e.target.value)}
        placeholder="Hipótesis · ej. «El Gobierno convocará elecciones anticipadas antes de Q4 2026»"
        style={inputStyle()}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={add} disabled={!statement.trim() || busy}
          style={primaryBtn(busy, !statement.trim())}
        >
          {busy ? 'Guardando…' : 'Añadir hipótesis'}
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0',
                   display: 'flex', flexDirection: 'column', gap: 10 }}>
        {artifacts.map(a => (
          <li key={a.id} style={artifactCardStyle()}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.4 }}>
              {String(a.payload?.statement ?? a.title)}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11, color: 'var(--color-ink-4)' }}>
              <span>estado: <strong>{String(a.payload?.status ?? 'open')}</strong></span>
              <span>confianza: <strong>{Number(a.payload?.confidence ?? 0.5).toFixed(2)}</strong></span>
            </div>
            <ArtifactMeta artifact={a} />
          </li>
        ))}
        {artifacts.length === 0 && <EmptyMini text="Sin hipótesis. Formula la primera para iniciar un análisis ACH." />}
      </ul>
    </div>
  )
}

function EvidenceTab({ artifacts, investigationId, onAdded }: TabProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  async function add() {
    if (!url.trim() || busy) return
    setBusy(true)
    try {
      await investigationsApi.addArtifact(investigationId, {
        artifact_kind: 'evidence',
        title: title.trim() || url,
        payload: {
          url,
          credibility: 'C',
          confidence_rating: 3,
          source: '',
          notes: '',
        },
      })
      setUrl(''); setTitle('')
      await onAdded()
    } finally { setBusy(false) }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Título corto (opcional)"
          style={{ ...inputStyle(), flex: 1 }}
        />
      </div>
      <input
        value={url} onChange={e => setUrl(e.target.value)}
        placeholder="https://… URL de la evidencia"
        style={inputStyle()}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={add} disabled={!url.trim() || busy} style={primaryBtn(busy, !url.trim())}>
          {busy ? 'Guardando…' : 'Ingresar evidencia'}
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0',
                   display: 'flex', flexDirection: 'column', gap: 10 }}>
        {artifacts.map(a => (
          <li key={a.id} style={artifactCardStyle()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                background: 'var(--color-info-subtle)', color: 'var(--color-info)',
                padding: '2px 6px', borderRadius: 4,
              }}>
                {String(a.payload?.credibility ?? 'C')}{String(a.payload?.confidence_rating ?? '3')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {a.title}
                </div>
                {Boolean(a.payload?.url) && (
                  <a href={String(a.payload.url)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11.5, color: 'var(--color-accent-text)',
                             textDecoration: 'underline', wordBreak: 'break-all' }}>
                    {String(a.payload.url)}
                  </a>
                )}
              </div>
            </div>
            <ArtifactMeta artifact={a} />
          </li>
        ))}
        {artifacts.length === 0 && <EmptyMini text="Sin evidencias. Pega una URL para empezar." />}
      </ul>
    </div>
  )
}

function BriefsTab({ artifacts, investigationId, onAdded }: TabProps) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-ink-4)' }}>
        Los briefings (SITREP, INTSUM, policy_brief, executive_memo) se generan
        automáticamente desde el brain copiloto Cmd+J usando los bloques del
        notebook + hipótesis + evidencias de este caso. Próximo sprint.
      </p>
      {artifacts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0',
                     display: 'flex', flexDirection: 'column', gap: 10 }}>
          {artifacts.map(a => (
            <li key={a.id} style={artifactCardStyle()}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                {a.title} <span style={{ fontSize: 10, color: 'var(--color-ink-5)' }}>v{a.version}</span>
              </div>
              <ArtifactMeta artifact={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-ink-4)' }}>
      Sección «{name}» — disponible en el próximo sprint. La estructura de datos
      (artifact_kind=canvas_state) ya existe en el backend y se renderizará aquí
      con un editor visual de stakeholder map / causal map / timeline.
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────

interface TabProps {
  artifacts: Artifact[]
  investigationId: number
  onAdded: () => void | Promise<void>
}

function ArtifactMeta({ artifact }: { artifact: Artifact }) {
  return (
    <div style={{
      marginTop: 8, fontSize: 10.5, color: 'var(--color-ink-5)',
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      por {artifact.author_id} · {new Date(artifact.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
    </div>
  )
}

function EmptyMini({ text }: { text: string }) {
  return (
    <li style={{
      padding: 20, textAlign: 'center', fontSize: 12,
      color: 'var(--color-ink-5)',
      border: '1px dashed var(--color-hairline)',
      borderRadius: 10, listStyle: 'none',
    }}>{text}</li>
  )
}

function primaryBtn(busy: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 18px', borderRadius: 8, border: 'none',
    background: 'var(--color-accent)', color: '#fff',
    fontSize: 12.5, fontWeight: 600,
    cursor: busy || disabled ? 'not-allowed' : 'pointer',
    opacity: busy || disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  }
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '10px 14px',
    borderRadius: 10, border: '1px solid var(--color-hairline)',
    background: 'var(--color-bg)',
    fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
    color: 'var(--color-ink)',
  }
}

function artifactCardStyle(): React.CSSProperties {
  return {
    padding: 14, borderRadius: 10,
    background: 'var(--color-bg)',
    border: '1px solid var(--color-hairline-soft)',
  }
}
