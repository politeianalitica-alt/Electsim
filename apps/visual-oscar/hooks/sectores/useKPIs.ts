'use client';
import { useState, useEffect } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { KPISectorial } from '@/types/sectores';

export function useKPIs(sectorId: string) {
  const [kpis, setKpis] = useState<KPISectorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sectorId) return;
    sectoresApi.getKPIs(sectorId)
      .then(r => setKpis(r.kpis))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [sectorId]);

  return { kpis, loading, error };
}
