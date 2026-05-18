'use client';
import { useEffect, useState } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { SectorSignalsResponse } from '@/types/sector-signals';

/**
 * Hook · señales transversales del sector (BOE + prensa + signals).
 *
 * Lee de `/api/sectores/{id}/signals` que proxea a FastAPI
 * `/api/v1/sectores/{id}/signals`. Refresca cada 5 minutos.
 */
export function useSectorSignals(sectorId: string, opts?: { days?: number; limit?: number }) {
  const [data, setData] = useState<SectorSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sectorId) return;
    setLoading(true);
    setError(null);
    sectoresApi.getSignals(sectorId, opts)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorId, opts?.days, opts?.limit]);

  return { data, loading, error };
}
