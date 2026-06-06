import { NextResponse } from 'next/server';
import camps from './data.json';

// Mayores campos de refugiados y asentamientos de desplazados (ACNUR/UNHCR,
// cifras 2024-2025). Dataset curado OSINT con coordenadas verificadas.
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ camps, total: camps.length });
}
