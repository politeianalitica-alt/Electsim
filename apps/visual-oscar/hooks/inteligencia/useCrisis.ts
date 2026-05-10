'use client';
import { useState, useEffect } from 'react';
import { inteligenciaApi } from '@/lib/api/inteligencia';
import type { CrisisActiva } from '@/types/inteligencia';

export function useCrisis(pollingMs = 120_000) {
  const [crisis, setCrisis] = useState<CrisisActiva[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = () =>
    inteligenciaApi.getCrisis()
      .then(r => setCrisis(r.crisis))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, pollingMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingMs]);

  return { crisis, loading, refetch: fetch_ };
}
