'use client';
import { useState, useEffect } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { SectoresIndex } from '@/types/sectores';

export function useSectoresIndex() {
  const [data, setData] = useState<SectoresIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    sectoresApi.getIndex()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
