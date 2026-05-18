// lib/api/sectores.ts
import type { SectorReport, SectoresIndex, KPISectorial, ActorSectorial, EventoSectorial } from '@/types/sectores';
import type { SectorSignalsResponse } from '@/types/sector-signals';

const BASE = '/api/sectores';

async function get<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(path, { next: { revalidate } });
  if (!res.ok) throw new Error(`[sectores] ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const sectoresApi = {
  getIndex: () =>
    get<SectoresIndex>(`${BASE}/index`, 300),

  getSector: (id: string) =>
    get<SectorReport>(`${BASE}/${id}`, 300),

  getKPIs: (sectorId: string) =>
    get<{ kpis: KPISectorial[] }>(`${BASE}/${sectorId}/kpis`, 3600),

  getActores: (sectorId: string) =>
    get<{ actores: ActorSectorial[] }>(`${BASE}/${sectorId}/actores`, 86400),

  getEventos: (sectorId: string, params?: { desde?: string; hasta?: string; tipo?: string }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString() : '';
    return get<{ eventos: EventoSectorial[] }>(
      `${BASE}/${sectorId}/eventos${qs}`, 600
    );
  },

  getSignals: (sectorId: string, params?: { days?: number; limit?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return get<SectorSignalsResponse>(`${BASE}/${sectorId}/signals${qs}`, 300);
  },
};
