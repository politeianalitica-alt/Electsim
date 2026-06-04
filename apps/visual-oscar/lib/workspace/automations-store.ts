import type { WorkspaceAutomation } from '@/types/workspace'

/**
 * Automatizaciones creadas por el usuario (constructor "si esto → entonces eso"),
 * persistidas en localStorage por workspace. Conviven con las del mock del repo.
 */
const KEY = (ws: string) => `politeia:ws:${ws}:user-automations`

function read(ws: string): WorkspaceAutomation[] {
  if (typeof window === 'undefined') return []
  try {
    const r = window.localStorage.getItem(KEY(ws))
    return r ? (JSON.parse(r) as WorkspaceAutomation[]) : []
  } catch {
    return []
  }
}

function write(ws: string, list: WorkspaceAutomation[]): WorkspaceAutomation[] {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(KEY(ws), JSON.stringify(list)) } catch { /* ignore */ }
  }
  return list
}

export function getUserAutomations(ws: string): WorkspaceAutomation[] {
  return read(ws)
}

export interface NewAutomationInput {
  name: string
  triggerLabel: string
  actionLabel: string
  category: WorkspaceAutomation['category']
}

export function addUserAutomation(ws: string, input: NewAutomationInput): WorkspaceAutomation[] {
  const item: WorkspaceAutomation = {
    id: `auto_${Date.now().toString(36)}`,
    workspaceId: ws,
    name: input.name.trim() || 'Automatización',
    triggerLabel: input.triggerLabel,
    actionLabel: input.actionLabel,
    status: 'active',
    runCount: 0,
    category: input.category,
  }
  return write(ws, [item, ...read(ws)])
}

export function toggleUserAutomation(ws: string, id: string): WorkspaceAutomation[] {
  return write(
    ws,
    read(ws).map(a => (a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a)),
  )
}

export function deleteUserAutomation(ws: string, id: string): WorkspaceAutomation[] {
  return write(ws, read(ws).filter(a => a.id !== id))
}
