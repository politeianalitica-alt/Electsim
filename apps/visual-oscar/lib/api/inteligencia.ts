// lib/api/inteligencia.ts
import type {
  TermometroSnapshot, TermometroHistorico,
  MatrizRiesgo, Escenario, CrisisActiva,
  MapaGeopolitico, PanelMacro, NowcastReport,
  PanelIndices, SenalCritica,
} from '@/types/inteligencia';

const BASE = '/api/inteligencia';

async function get<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(path, { next: { revalidate } });
  if (!res.ok) throw new Error(`[intel] ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const inteligenciaApi = {
  getSenales: (params?: { nivel?: string; categoria?: string; limit?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return get<{ senales: SenalCritica[] }>(`${BASE}/senales${qs}`, 60);
  },

  getTermometro: () =>
    get<TermometroSnapshot>(`${BASE}/termometro`, 300),

  getTermometroHistorico: (dias = 30) =>
    get<TermometroHistorico>(`${BASE}/termometro/historico?dias=${dias}`, 3600),

  getRiesgo: () =>
    get<MatrizRiesgo>(`${BASE}/riesgo`, 300),

  getEscenarios: (estado?: string) =>
    get<{ escenarios: Escenario[] }>(
      `${BASE}/escenarios${estado ? `?estado=${estado}` : ''}`,
      600
    ),

  getEscenario: (id: string) =>
    get<Escenario>(`${BASE}/escenarios/${id}`, 600),

  getCrisis: () =>
    get<{ crisis: CrisisActiva[] }>(`${BASE}/crisis`, 120),

  getCrisisById: (id: string) =>
    get<CrisisActiva>(`${BASE}/crisis/${id}`, 120),

  getGeopolitica: () =>
    get<MapaGeopolitico>(`${BASE}/geopolitica`, 600),

  getMacro: () =>
    get<PanelMacro>(`${BASE}/macro`, 3600),

  getNowcast: () =>
    get<NowcastReport>(`${BASE}/nowcasting`, 3600),

  getIndices: () =>
    get<PanelIndices>(`${BASE}/indices`, 300),
};
