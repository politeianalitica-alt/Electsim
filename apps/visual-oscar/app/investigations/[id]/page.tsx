'use client'
/**
 * /investigations/[id] · vista de caso (Pilar 2).
 *
 * Layout Palantir-style:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Header  · título · acciones                         │
 *   ├──────────┬──────────────────────────┬───────────────┤
 *   │ Pinned   │  Vista activa            │ Audit trail   │
 *   │ entities │  (tabs: notebook ·       │ (eventos)     │
 *   │ (sidebar)│   hipótesis · evidencia ·│               │
 *   │          │   canvas · briefings)    │               │
 *   └──────────┴──────────────────────────┴───────────────┘
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { investigationsApi } from '@/lib/api/investigations'
import { entitiesApi } from '@/lib/api/entities'
import type { InvestigationDetail } from '@/types/investigations'
import type { EntitySearchResult } from '@/types/ontology'
import { KIND_LABEL, KIND_COLOR } from '@/types/ontology'
import { PinnedSidebar } from './_components/PinnedSidebar'
import { ArtifactTabs } from './_components/ArtifactTabs'
import { EventsRail } from './_components/EventsRail'
import { EntitySearchModal } from './_components/EntitySearchModal'
import { BrainCopilotPanel } from './_components/BrainCopilotPanel'

type Tab = 'notebook' | 'hypothesis' | 'evidence' | 'graph' | 'canvas' | 'briefs'

export default function InvestigationDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const invId = Number(params?.id)

  const [detail, setDetail] = useState<InvestigationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('notebook')
  const [searchOpen, setSearchOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    if (!invId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, invId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await investigationsApi.get(invId)
      setDetail(d)
    } catch (e) {
      setError(String(e).slice(0, 200))
    } finally {
      setLoading(false)
    }
  }, [invId])

  // Cmd+P para pin entity · Cmd+J para brain copilot
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setSearchOpen(true)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setCopilotOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function pinEntity(entityId: number) {
    if (!invId) return
    try {
      await investigationsApi.pinEntity(invId, entityId)
      await load()
      setSearchOpen(false)
    } catch (e) {
      setError(String(e).slice(0, 200))
    }
  }

  async function unpinEntity(entityId: number) {
    if (!invId) return
    try {
      await investigationsApi.unpinEntity(invId, entityId)
      await load()
    } catch (e) {
      setError(String(e).slice(0, 200))
    }
  }

  if (loading && !detail) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <AppHeader />
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
          <div style={{ height: 32, background: 'var(--color-surface)', borderRadius: 8, marginBottom: 24, opacity: 0.4 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 320, background: 'var(--color-surface)', borderRadius: 12, opacity: 0.4 }} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <AppHeader />
        <main style={{ maxWidth: 800, margin: '0 auto', padding: 60, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '0 0 10px' }}>
            No pudimos cargar este caso
          </h1>
          <p style={{ color: 'var(--color-ink-4)', fontSize: 13, marginBottom: 20 }}>
            {error ?? 'Investigación no encontrada.'}
          </p>
          <Link href="/investigations" style={{
            display: 'inline-block', padding: '8px 18px',
            background: 'var(--color-accent)', color: '#fff',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>
            Volver al listado
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh',
                  fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 60px' }}>
        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <Link href="/investigations" style={{
            fontSize: 11, color: 'var(--color-ink-4)',
            textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ← Workspace
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
                       letterSpacing: '-0.018em', margin: '6px 0 4px' }}>
            {detail.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                        fontSize: 12, color: 'var(--color-ink-4)' }}>
            <span>actualizado {new Date(detail.updated_at).toLocaleString('es-ES')}</span>
            <span>·</span>
            <span>{detail.counts.pinned} entidades</span>
            <span>·</span>
            <span>{detail.counts.evidence ?? 0} evidencias</span>
            <span>·</span>
            <span>{detail.counts.hypotheses ?? 0} hipótesis</span>
            <span>·</span>
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                marginLeft: 'auto', padding: '4px 12px',
                background: 'var(--color-surface)', border: '1px solid var(--color-hairline)',
                borderRadius: 8, fontSize: 11, fontWeight: 600,
                color: 'var(--color-ink-2)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Fijar entidad <kbd style={{ marginLeft: 6, opacity: 0.6 }}>⌘P</kbd>
            </button>
            <button
              onClick={() => setCopilotOpen((v) => !v)}
              style={{
                padding: '4px 12px',
                background: copilotOpen ? 'var(--color-accent)' : 'var(--color-surface)',
                border: '1px solid var(--color-accent)',
                borderRadius: 8, fontSize: 11, fontWeight: 600,
                color: copilotOpen ? '#fff' : 'var(--color-accent-text)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {copilotOpen ? 'Cerrar copiloto' : 'Abrir copiloto'} <kbd style={{
                marginLeft: 6,
                opacity: 0.7,
                color: copilotOpen ? '#fff' : 'inherit',
              }}>⌘J</kbd>
            </button>
          </div>
        </header>

        {/* Layout 3 columnas · sidebar / vista / events */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, alignItems: 'start' }}>
          <PinnedSidebar pinned={detail.pinned} onUnpin={unpinEntity} />
          <ArtifactTabs
            tab={tab}
            onTabChange={setTab}
            detail={detail}
            onArtifactsChanged={load}
          />
          <EventsRail events={detail.recent_events} />
        </div>
      </main>

      {searchOpen && (
        <EntitySearchModal
          onClose={() => setSearchOpen(false)}
          onSelect={(r) => pinEntity(r.entity.id)}
        />
      )}

      <BrainCopilotPanel
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        detail={detail}
      />
    </div>
  )
}
