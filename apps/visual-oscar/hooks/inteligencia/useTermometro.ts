'use client';
import { useState, useEffect } from 'react';
import { inteligenciaApi } from '@/lib/api/inteligencia';
import type { TermometroSnapshot } from '@/types/inteligencia';

export function useTermometro(pollingMs?: number) {
  const [data, setData] = useState<TermometroSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch_ = () =>
    inteligenciaApi.getTermometro()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));

  useEffect(() => {
    fetch_();
    if (!pollingMs) return;
    const id = setInterval(fetch_, pollingMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingMs]);

  return { data, loading, error, refetch: fetch_ };
}
