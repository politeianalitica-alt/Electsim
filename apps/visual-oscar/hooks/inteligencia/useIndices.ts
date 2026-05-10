'use client';
import { useState, useEffect } from 'react';
import { inteligenciaApi } from '@/lib/api/inteligencia';
import type { IndiceCompuesto, IdIndice } from '@/types/inteligencia';

export function useIndices() {
  const [indices, setIndices] = useState<IndiceCompuesto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inteligenciaApi.getIndices()
      .then(r => setIndices(r.indices))
      .finally(() => setLoading(false));
  }, []);

  const getIndice = (id: IdIndice): IndiceCompuesto | null =>
    indices.find(i => i.id === id) ?? null;

  return { indices, loading, getIndice };
}
