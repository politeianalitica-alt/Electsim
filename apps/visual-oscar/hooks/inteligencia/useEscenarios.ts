'use client';
import { useState, useEffect } from 'react';
import { inteligenciaApi } from '@/lib/api/inteligencia';
import type { Escenario } from '@/types/inteligencia';

export function useEscenarios(estado?: string) {
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    inteligenciaApi.getEscenarios(estado)
      .then(r => setEscenarios(r.escenarios))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [estado]);

  return { escenarios, loading, error };
}
