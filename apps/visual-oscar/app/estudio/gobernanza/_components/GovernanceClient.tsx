'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { governanceApi } from '@/lib/estudio/api-client'
import { timeAgo } from '@/lib/estudio/utils'
import type { OrgRole } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './Governance.module.css'

type Tab = 'members' | 'audit' | 'apikeys'

const ROLE_META: Record<OrgRole, { label: string; color: string }> = {
  owner:    { label: 'Owner',     color: '#8b5cf6' },
  admin:    { label: 'Admin',     color: '#3b82f6' },
  analyst:  { label: 'Analista',  color: '#22c55e' },
  viewer:   { label: 'Viewer',    color: '#9ca3af' },
  api_only: { label: 'API Only',  color: '#f59e0b' },
}

const AUDIT_GLYPH: Record<string, string> = {
  dashboard: '⊟', dataset: '⊞', pipeline: '⇉', alert: '!',
  query: '⌨', member: 'U', api_key: '⚿',
}

const API_SCOPES = [
  'read:datasets', 'write:datasets',
  'read:dashboards', 'write:dashboards',
  'read:pipelines', 'run:pipelines',
  'read:alerts', 'write:alerts',
  'read:audit',
]

export default function GovernanceClient() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('members')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<OrgRole>('analyst')

  const [newKeyName,   setNewKeyName]   = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:datasets', 'read:dashboards'])
  const [createdKey,   setCreatedKey]   = useState<string | null>(null)

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey:  ['domo', 'governance', 'members'],
    queryFn:   governanceApi.listMembers,
    staleTime: 60_000,
  })

  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey:  ['domo', 'governance', 'audit'],
    queryFn:   () => governanceApi.listAuditLogs({ limit: 100 }),
    staleTime: 30_000,
    enabled:   tab === 'audit',
  })

  const { data: apiKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey:  ['domo', 'governance', 'api-keys'],
    queryFn:   governanceApi.listApiKeys,
    staleTime: 60_000,
    enabled:   tab === 'apikeys',
  })

  const inviteMutation = useMutation({
    mutationFn: () => governanceApi.inviteMember(inviteEmail, inviteRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domo', 'governance', 'members'] })
      setInviteEmail('')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: OrgRole }) => governanceApi.updateMemberRole(id, role),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'governance', 'members'] }),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => governanceApi.removeMember(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'governance', 'members'] }),
  })

  const createKeyMutation = useMutation({
    mutationFn: () => governanceApi.createApiKey({ name: newKeyName, scopes: newKeyScopes }),
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['domo', 'governance', 'api-keys'] })
      setCreatedKey(key.secret ?? null)
      setNewKeyName('')
    },
  })

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => governanceApi.revokeApiKey(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'governance', 'api-keys'] }),
  })

  const toggleScope = (scope: string) =>
    setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])

  const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
    { id: 'members', label: 'Miembros',  glyph: 'U' },
    { id: 'audit',   label: 'Auditoría', glyph: '≡' },
    { id: 'apikeys', label: 'API Keys',  glyph: '⚿' },
  ]

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gobernanza</h1>
          <p className={styles.subtitle}>Control de acceso, roles y trazabilidad de la organización</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}>
            <span style={{ marginRight: 4 }}>{t.glyph}</span> {t.label}
            {t.id === 'members' && members.length > 0 && (
              <span className={styles.tabCount}>{members.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className={styles.section}>
          <div className={styles.inviteBar}>
            <input
              type="email" placeholder="email@organización.es"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              className={styles.input} style={{ flex: 1 }}
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)} className={styles.input}>
              {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              className={styles.btnPrimary}
            >
              {inviteMutation.isPending ? '⟳' : '+ Invitar'}
            </button>
          </div>

          {loadingMembers ? (
            <div className={styles.list}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 60, borderRadius: 10 }} />)}
            </div>
          ) : (
            <div className={styles.list}>
              {members.map(m => {
                const rm = ROLE_META[m.role]
                return (
                  <div key={m.id} className={styles.memberRow}>
                    <div className={styles.memberAvatar}>
                      {m.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={m.avatarUrl} alt={m.name} />
                        : <span>{m.name.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{m.name}</span>
                      <span className={styles.memberEmail}>{m.email}</span>
                    </div>
                    <span className={styles.memberMeta}>
                      {m.lastActiveAt ? `Activo ${timeAgo(m.lastActiveAt)}` : 'Nunca activo'}
                    </span>
                    <select
                      value={m.role}
                      onChange={e => updateRoleMutation.mutate({ id: m.id, role: e.target.value as OrgRole })}
                      className={styles.roleSelect}
                      style={{ color: rm.color, borderColor: `${rm.color}40` }}
                    >
                      {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => { if (confirm(`¿Eliminar a ${m.name}?`)) removeMemberMutation.mutate(m.id) }}
                        className={styles.removeBtn} title="Eliminar miembro"
                      >✕</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className={styles.section}>
          {loadingAudit ? (
            <div className={styles.list}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: '1.75rem', opacity: 0.25 }}>≡</span>
              <p>No hay logs de auditoría todavía.</p>
            </div>
          ) : (
            <div className={styles.auditTable}>
              <div className={styles.auditHeader}>
                <span>Acción</span><span>Actor</span><span>Recurso</span><span>IP</span><span>Fecha</span>
              </div>
              {auditLogs.map(log => (
                <div key={log.id} className={styles.auditRow}>
                  <span className={styles.auditAction}>
                    <span className={styles.auditIcon}>{AUDIT_GLYPH[log.resourceType] ?? '●'}</span>
                    {log.action}
                  </span>
                  <span className={styles.auditActor}>{log.actorEmail}</span>
                  <span className={styles.auditResource}>{log.resourceName ?? log.resourceId ?? '—'}</span>
                  <span className={styles.auditIp}>{log.ipAddress ?? '—'}</span>
                  <span className={styles.auditTime}>{timeAgo(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'apikeys' && (
        <div className={styles.section}>
          {createdKey && (
            <div className={styles.createdKeyAlert}>
              <strong>! Guarda esta clave ahora — no volverá a mostrarse</strong>
              <code className={styles.createdKeyCode}>{createdKey}</code>
              <button onClick={() => { navigator.clipboard.writeText(createdKey) }} className={styles.copyBtn}>⎘ Copiar</button>
              <button onClick={() => setCreatedKey(null)} className={styles.dismissBtn}>✕</button>
            </div>
          )}

          <div className={styles.keyForm}>
            <span className={styles.keyFormTitle}>Nueva API Key</span>
            <input
              placeholder="Nombre descriptivo (ej: CI/CD pipeline)"
              value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              className={styles.input}
            />
            <div className={styles.scopeGrid}>
              {API_SCOPES.map(scope => (
                <button
                  key={scope} type="button"
                  onClick={() => toggleScope(scope)}
                  className={`${styles.scopeToggle} ${newKeyScopes.includes(scope) ? styles.scopeActive : ''}`}
                >
                  {scope}
                </button>
              ))}
            </div>
            <button
              onClick={() => createKeyMutation.mutate()}
              disabled={!newKeyName.trim() || newKeyScopes.length === 0 || createKeyMutation.isPending}
              className={styles.btnPrimary}
              style={{ alignSelf: 'flex-start' }}
            >
              {createKeyMutation.isPending ? '⟳ Generando…' : '+ Crear API Key'}
            </button>
          </div>

          {loadingKeys ? (
            <div className={styles.list}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 68, borderRadius: 10 }} />)}
            </div>
          ) : (
            <div className={styles.list}>
              {apiKeys.map(key => (
                <div key={key.id} className={`${styles.keyRow} ${!key.isActive ? styles.keyInactive : ''}`}>
                  <div className={styles.keyInfo}>
                    <div className={styles.keyNameRow}>
                      <span className={styles.keyName}>{key.name}</span>
                      {!key.isActive && <span className={styles.revokedBadge}>Revocada</span>}
                    </div>
                    <code className={styles.keyPrefix}>{key.prefix}••••••••••••••••</code>
                    <div className={styles.keyMeta}>
                      <span>Creada por {key.createdBy}</span>
                      {key.lastUsedAt && <span>· Último uso {timeAgo(key.lastUsedAt)}</span>}
                      {key.expiresAt && <span>· Expira {timeAgo(key.expiresAt)}</span>}
                    </div>
                    <div className={styles.scopeList}>
                      {key.scopes.map(s => <span key={s} className={styles.scopeBadge}>{s}</span>)}
                    </div>
                  </div>
                  {key.isActive && (
                    <button
                      onClick={() => { if (confirm(`¿Revocar "${key.name}"?`)) revokeKeyMutation.mutate(key.id) }}
                      className={styles.revokeBtn}
                    >Revocar</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
