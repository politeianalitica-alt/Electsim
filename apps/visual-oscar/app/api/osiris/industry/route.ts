import { NextResponse } from 'next/server';
import data from './data.json';

// Industria estratégica: refinerías, terminales de GNL, fábricas de
// semiconductores, centrales nucleares y grandes presas hidroeléctricas.
// Dataset curado OSINT con coordenadas verificadas.
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    refineries: data.refineries,
    lng_terminals: data.lng_terminals,
    fabs: data.fabs,
    nuclear: data.nuclear,
    dams: data.dams,
    total: data.refineries.length + data.lng_terminals.length + data.fabs.length + data.nuclear.length + data.dams.length,
  });
}
