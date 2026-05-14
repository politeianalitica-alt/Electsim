'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sharingApi } from '@/lib/estudio/api-client'
import { timeAgo } from '@/lib/estudio/utils'
import type { DashboardShare, ShareRole, ShareSubjectType } from '@/types/domo'
import styles from './DashboardShareModal.module.css'

interface Props {
  dashboardId:   string
  dashboardName: string
  onClose:       () => void
}

const ROLE_META: Record<ShareRole, { label: string; desc: string }> = {
  viewer: { label: 'Visualizador', desc: 'Solo puede ver' },
  editor: { label: 'Editor',       desc: 'Puede editar widgets' },
  admin:  { label: 'Admin',        desc: 'Control total' },
}

const SUBJ_GLYPH: Record<ShareSubjectType, string> = {
  user: 'U', team: 'T', org: 'O', public_link: '⊙',
}

export default function DashboardShareModal({ dashboardId, dashboardName, onClose }: Props) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'people' | 'link'>('people')
  const [newSubjectType, setNewSubjectType] = useState<ShareSubjectType>('user')
  const [newSubjectId,   setNewSubjectId]   = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newRole,        setNewRole]        = useState<ShareRole>('viewer')
  const [linkExpireDays, setLinkExpireDays] = useState<string>('7')
  const [copiedLink,     setCopiedLink]     = useState(false)

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['domo', 'dashboard-shares', dashboardId],
    queryFn:  () => sharingApi.listShares(dashboardId),
    staleTime: 30_000,
  })

  const publicLink   = shares.find(s => s.subjectType === 'public_link')
  const peopleShares = shares.filter(s => s.subjectType !== 'public_link')

  const addShareMutation = useMutation({
    mutationFn: (data: Partial<DashboardShare>) => sharingApi.addShare(dashboardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domo', 'dashboard-shares', dashboardId] })
      setNewSubjectId('')
      setNewSubjectName('')
    },
  })

  const updateShareMutation = useMutation({
    mutationFn: ({ shareId, role }: { shareId: string; role: ShareRole }) =>
      sharingApi.updateShare(dashboardId, shareId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domo', 'dashboard-shares', dashboardId] }),
  })

  const removeShareMutation = useMutation({
    mutationFn: (shareId: string) => sharingApi.removeShare(dashboardId, shareId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domo', 'dashboard-shares', dashboardId] }),
  })

  const createLinkMutation = useMutation({
    mutationFn: () => sharingApi.createPublicLink(dashboardId, linkExpireDays ? Number(linkExpireDays) : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domo', 'dashboard-shares', dashboardId] }),
  })

  const revokeLinkMutation = useMutation({
    mutationFn: () => sharingApi.revokePublicLink(dashboardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domo', 'dashboard-shares', dashboardId] }),
  })

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/estudio/dashboard/public/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleAddShare = () => {
    if (!newSubjectId.trim()) return
    addShareMutation.mutate({
      subjectType: newSubjectType,
      subjectId:   newSubjectId,
      subjectName: newSubjectName || newSubjectId,
      role:        newRole,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <span className={styles.title}>Compartir</span>
            <span className={styles.dashName}>{dashboardName}</span>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button onClick={() => setTab('people')} className={`${styles.tab} ${tab === 'people' ? styles.tabActive : ''}`}>
            Personas y equipos
          </button>
          <button onClick={() => setTab('link')} className={`${styles.tab} ${tab === 'link' ? styles.tabActive : ''}`}>
            Enlace público
            {publicLink && <span className={styles.activeLinkDot} />}
          </button>
        </div>

        <div className={styles.body}>
          {tab === 'people' && (
            <>
              <div className={styles.addShare}>
                <select value={newSubjectType} onChange={e => setNewSubjectType(e.target.value as ShareSubjectType)} className={styles.input} style={{ width: 100 }}>
                  <option value="user">Usuario</option>
                  <option value="team">Equipo</option>
                  <option value="org">Organización</option>
                </select>
                <input
                  type="text"
                  placeholder={newSubjectType === 'user' ? 'email o ID…' : 'ID del equipo/org…'}
                  value={newSubjectId}
                  onChange={e => setNewSubjectId(e.target.value)}
                  className={styles.input}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Nombre visible (opcional)"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className={styles.input}
                  style={{ flex: 1 }}
                />
                <select value={newRole} onChange={e => setNewRole(e.target.value as ShareRole)} className={styles.input} style={{ width: 120 }}>
                  {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={handleAddShare} disabled={!newSubjectId.trim() || addShareMutation.isPending} className={styles.addBtn}>
                  {addShareMutation.isPending ? '⟳' : '+ Añadir'}
                </button>
              </div>

              {isLoading ? (
                <div style={{ padding: '1rem' }}>Cargando…</div>
              ) : peopleShares.length === 0 ? (
                <div className={styles.empty}>Sin accesos configurados. Usa el formulario de arriba para invitar.</div>
              ) : (
                <div className={styles.shareList}>
                  {peopleShares.map(share => (
                    <div key={share.id} className={styles.shareRow}>
                      <span className={styles.shareIcon}>{SUBJ_GLYPH[share.subjectType]}</span>
                      <div className={styles.shareInfo}>
                        <span className={styles.shareName}>{share.subjectName ?? share.subjectId}</span>
                        <span className={styles.shareMeta}>{share.subjectType} · desde {timeAgo(share.createdAt)}</span>
                      </div>
                      <select
                        value={share.role}
                        onChange={e => updateShareMutation.mutate({ shareId: share.id, role: e.target.value as ShareRole })}
                        className={styles.roleSelect}
                      >
                        {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button
                        onClick={() => removeShareMutation.mutate(share.id)}
                        className={styles.removeBtn}
                        title="Revocar acceso"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'link' && (
            <div className={styles.linkTab}>
              {publicLink ? (
                <>
                  <div className={styles.linkActive}>
                    <span className={styles.linkActiveIcon}>⊙</span>
                    <div className={styles.linkInfo}>
                      <span className={styles.linkStatus}>Enlace activo</span>
                      {publicLink.expiresAt && (
                        <span className={styles.linkExpiry}>Expira {timeAgo(publicLink.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.linkRow}>
                    <code className={styles.linkCode}>
                      {typeof window !== 'undefined' ? window.location.origin : ''}/estudio/dashboard/public/{publicLink.token}
                    </code>
                    <button onClick={() => copyLink(publicLink.token!)} className={styles.copyBtn}>
                      {copiedLink ? '✓ Copiado' : '⎘ Copiar'}
                    </button>
                  </div>
                  <button onClick={() => revokeLinkMutation.mutate()} className={styles.revokeBtn}>
                    Revocar enlace
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.linkDesc}>
                    Genera un enlace público para que cualquier persona pueda ver este dashboard sin necesidad de cuenta.
                  </p>
                  <div className={styles.linkOptions}>
                    <label className={styles.linkLabel}>Expiración</label>
                    <select value={linkExpireDays} onChange={e => setLinkExpireDays(e.target.value)} className={styles.input}>
                      <option value="">Sin expiración</option>
                      <option value="1">1 día</option>
                      <option value="7">7 días</option>
                      <option value="30">30 días</option>
                      <option value="90">90 días</option>
                    </select>
                  </div>
                  <button onClick={() => createLinkMutation.mutate()} disabled={createLinkMutation.isPending} className={styles.createLinkBtn}>
                    {createLinkMutation.isPending ? '⟳ Generando…' : '+ Generar enlace público'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
