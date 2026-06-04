import { NextResponse } from 'next/server';
import coverage from './coverage.json';

// Cobertura/rendimiento móvil (Ookla Open Data, Q1 2026).
// Teselas z9 (~78 km) con velocidad de bajada/subida y latencia móvil media,
// agregadas desde ~3,2 M teselas z16 ponderando por nº de tests.
// Fuente: Speedtest by Ookla Global Mobile Network Performance (open data).
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ coverage, total: (coverage as any).features.length });
}
