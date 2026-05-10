// Intelligence API client - calls Next.js route handlers under /api/intelligence/*
// All methods use fetch with explicit no-store cache.

import type {
  Evidencia, EvidenciaDraft, EvidenciaSnapshot,
  Canvas, CanvasSnapshot, HipotesisACH, Hipotesis,
  Notebook, NotebookSnapshot, WorkspaceBlock,
  DraftDocument, DraftSnapshot, SeccionDraft, EstadoDraft, TipoProducto,
  RiskSnapshot, Signal, SignalsSnapshot,
  Fuente, FuenteSnapshot, TipoFuente,
  TeamSnapshot,
  Watchlist, WatchlistSnapshot,
  BrainMessage, BrainSnapshot,
  TipoCanvas, ClasificacionDraft, CredibilidadFuente, ConfianzaContenido,
} from '@/types/intelligence'

const BASE = '/api/intelligence'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Intelligence API error ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Intelligence API error ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Intelligence API error ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Intelligence API error ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const intelligenceApi = {
  // ── Evidencias ──
  getEvidencias(filters?: {
    fuente_tipo?: TipoFuente
    clasificacion?: ClasificacionDraft
    q?: string
  }): Promise<EvidenciaSnapshot> {
    const qs = filters
      ? '?' + new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return getJson(`${BASE}/evidencias${qs}`)
  },
  createEvidencia(draft: EvidenciaDraft): Promise<Evidencia> {
    return postJson(`${BASE}/evidencias`, draft)
  },
  getEvidencia(id: string): Promise<Evidencia> {
    return getJson(`${BASE}/evidencias/${id}`)
  },
  updateEvidencia(id: string, patch: Partial<EvidenciaDraft>): Promise<Evidencia> {
    return patchJson(`${BASE}/evidencias/${id}`, patch)
  },
  deleteEvidencia(id: string): Promise<{ ok: true }> {
    return deleteJson(`${BASE}/evidencias/${id}`)
  },
  scrapeUrl(url: string): Promise<EvidenciaDraft> {
    return postJson(`${BASE}/evidencias/scrape`, { url })
  },

  // ── Canvas ──
  getCanvas(tipo?: TipoCanvas): Promise<CanvasSnapshot> {
    const qs = tipo ? `?tipo=${tipo}` : ''
    return getJson(`${BASE}/canvas${qs}`)
  },
  createCanvas(payload: { tipo: TipoCanvas; titulo: string; descripcion?: string; tags?: string[] }): Promise<Canvas> {
    return postJson(`${BASE}/canvas`, payload)
  },
  getCanvasById(id: string): Promise<Canvas> {
    return getJson(`${BASE}/canvas/${id}`)
  },

  // ── Hipotesis (ACH) ──
  getHipotesis(canvas_id: string): Promise<HipotesisACH> {
    return getJson(`${BASE}/hipotesis?canvas_id=${encodeURIComponent(canvas_id)}`)
  },
  createHipotesis(payload: { canvas_id: string; enunciado: string; orden?: number }): Promise<Hipotesis> {
    return postJson(`${BASE}/hipotesis`, payload)
  },
  updateAchScore(hipotesis_id: string, payload: { evidencia_id: string; score: -2 | -1 | 0 | 1 | 2; nota?: string }): Promise<{ ok: true }> {
    return patchJson(`${BASE}/hipotesis/${hipotesis_id}/ach`, payload)
  },

  // ── Notebooks ──
  getNotebooks(): Promise<NotebookSnapshot> {
    return getJson(`${BASE}/notebooks`)
  },
  createNotebook(payload: { titulo: string; tags?: string[] }): Promise<Notebook> {
    return postJson(`${BASE}/notebooks`, payload)
  },
  getNotebook(id: string): Promise<Notebook> {
    return getJson(`${BASE}/notebooks/${id}`)
  },
  addBlock(notebookId: string, payload: { tipo: WorkspaceBlock['tipo']; contenido: string; orden?: number }): Promise<WorkspaceBlock> {
    return postJson(`${BASE}/notebooks/${notebookId}/blocks`, payload)
  },
  updateBlock(notebookId: string, blockId: string, patch: Partial<{ tipo: WorkspaceBlock['tipo']; contenido: string; orden: number }>): Promise<WorkspaceBlock> {
    return patchJson(`${BASE}/notebooks/${notebookId}/blocks/${blockId}`, patch)
  },
  deleteBlock(notebookId: string, blockId: string): Promise<{ ok: true }> {
    return deleteJson(`${BASE}/notebooks/${notebookId}/blocks/${blockId}`)
  },

  // ── Drafts ──
  getDrafts(): Promise<DraftSnapshot> {
    return getJson(`${BASE}/drafts`)
  },
  createDraft(payload: { titulo: string; tipo: TipoProducto; clasificacion?: ClasificacionDraft }): Promise<DraftDocument> {
    return postJson(`${BASE}/drafts`, payload)
  },
  getDraft(id: string): Promise<DraftDocument> {
    return getJson(`${BASE}/drafts/${id}`)
  },
  updateDraftSection(id: string, payload: { seccion_id: string; contenido?: string; titulo?: string }): Promise<SeccionDraft> {
    return patchJson(`${BASE}/drafts/${id}`, { kind: 'section', ...payload })
  },
  advanceDraftEstado(id: string, estado: EstadoDraft): Promise<DraftDocument> {
    return patchJson(`${BASE}/drafts/${id}`, { kind: 'estado', estado })
  },

  // ── Risk & Signals ──
  getRiskIndex(): Promise<RiskSnapshot> {
    return getJson(`${BASE}/risk/index`)
  },
  getRiskHistory(): Promise<{ historia: { ts: string; valor: number }[] }> {
    return getJson(`${BASE}/risk/index?history=1`)
  },
  getSignals(filters?: { dominio?: string; relevancia?: string }): Promise<SignalsSnapshot> {
    const qs = filters
      ? '?' + new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return getJson(`${BASE}/signals${qs}`)
  },

  // ── Fuentes ──
  getFuentes(): Promise<FuenteSnapshot> {
    return getJson(`${BASE}/fuentes`)
  },
  createFuente(payload: { nombre: string; tipo: TipoFuente; url?: string; credibilidad_default?: CredibilidadFuente; descripcion?: string }): Promise<Fuente> {
    return postJson(`${BASE}/fuentes`, payload)
  },
  updateFuente(id: string, patch: Partial<Fuente>): Promise<Fuente> {
    return patchJson(`${BASE}/fuentes/${id}`, patch)
  },
  deleteFuente(id: string): Promise<{ ok: true }> {
    return deleteJson(`${BASE}/fuentes/${id}`)
  },

  // ── Team ──
  getTeam(): Promise<TeamSnapshot> {
    return getJson(`${BASE}/team`)
  },

  // ── Watchlists ──
  getWatchlists(): Promise<WatchlistSnapshot> {
    return getJson(`${BASE}/watchlists`)
  },
  createWatchlist(payload: { nombre: string; terminos: string[]; descripcion?: string }): Promise<Watchlist> {
    return postJson(`${BASE}/watchlists`, payload)
  },

  // ── Brain ──
  getBrainHistory(): Promise<BrainSnapshot> {
    return getJson(`${BASE}/brain/chat`)
  },
  /**
   * Sends a chat message. Returns text reply (mock returns synthesized text).
   * If the backend returns an SSE stream we read it as text concatenated.
   */
  async sendBrainMessage(messages: { role: BrainMessage['role']; content: string }[]): Promise<string> {
    const res = await fetch(`${BASE}/brain/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) throw new Error(`Brain API error ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json() as { content?: string }
      return data.content ?? ''
    }
    // Plain text or stream — read all
    return await res.text()
  },
}

export type IntelligenceApi = typeof intelligenceApi
