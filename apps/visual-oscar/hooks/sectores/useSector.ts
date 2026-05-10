'use client';
import { useState, useEffect } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { SectorReport } from '@/types/sectores';

export function useSector(sectorId: string) {
  const [data, setData] = useState<SectorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sectorId) return;
    setLoading(true);
    setError(null);
    sectoresApi.getSector(sectorId)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [sectorId]);

  return { data, loading, error };
}
