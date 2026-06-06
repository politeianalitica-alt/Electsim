import { NextResponse } from 'next/server';
import data from './data.json';

// Infraestructura digital: puntos de intercambio de internet (IXP),
// estaciones de aterrizaje de cables submarinos y apagones/cortes de internet
// notables (2023-2026). Dataset curado OSINT.
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    ixps: data.ixps,
    landings: data.landings,
    shutdowns: data.shutdowns,
    total: data.ixps.length + data.landings.length + data.shutdowns.length,
  });
}
