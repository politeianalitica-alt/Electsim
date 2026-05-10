'use client';
import { useState, useEffect } from 'react';
import { inteligenciaApi } from '@/lib/api/inteligencia';
import type { SenalCritica } from '@/types/inteligencia';

export function useSenales(params?: { nivel?: string; categoria?: string; limit?: number }) {
  const [senales, setSenales] = useState<SenalCritica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inteligenciaApi.getSenales(params)
      .then(r => setSenales(r.senales))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.nivel, params?.categoria, params?.limit]);

  return { senales, loading };
}
