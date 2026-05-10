import type {
  AtaqueNarrativo, MediosNarrativaSnapshot,
  BriefingDiario, BriefingItem, CommunicationIntelSnapshot,
} from '@/types/narrativa'

const BASE = '/api/narrativa'

async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(path, { next: { revalidate } })
  if (!res.ok) throw new Error(`[narrativa] ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function apatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`[narrativa] PATCH ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const narrativaApi = {
  getAtaques: () =>
    get<{ ataques: AtaqueNarrativo[] }>(`${BASE}/ataques`, 120),
  getMediosSnapshot: () =>
    get<MediosNarrativaSnapshot>(`${BASE}/medios`, 300),
  getBriefingDiario: () =>
    get<BriefingDiario>(`${BASE}/briefing`, 1800),
  marcarBriefingLeido: (id: string) =>
    apatch<BriefingItem>(`${BASE}/briefing/${id}/leido`, {}),
  getCommIntel: () =>
    get<CommunicationIntelSnapshot>(`${BASE}/comm-intel`, 120),
}
