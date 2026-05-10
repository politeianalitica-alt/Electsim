import { NextResponse } from 'next/server'
import type { ActoAgenda } from '@/types/war-room'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK: ActoAgenda[] = [
  { fecha:'06/05/2026', hora:'09:00', tipo:'Reunión interna', titulo:'Comité de Campaña · briefing diario',                        ubicacion:'Génova 13, Madrid',           coverage:'Solo regional',  estado:'Confirmado' },
  { fecha:'06/05/2026', hora:'13:00', tipo:'Rueda de prensa', titulo:'Comparecencia post-Junta Directiva',                          ubicacion:'Génova 13, Madrid',           coverage:'TV nacional',    estado:'Confirmado' },
  { fecha:'06/05/2026', hora:'19:00', tipo:'Acto territorial',titulo:'Encuentro con autónomos del comercio',                        ubicacion:'Sevilla · Hotel Alfonso XIII', aforo:280, coverage:'Prensa nacional', estado:'Confirmado' },
  { fecha:'07/05/2026', hora:'10:30', tipo:'Visita',          titulo:'Visita al puerto de Algeciras · sector logístico',           ubicacion:'Algeciras, Cádiz',            coverage:'Solo regional',  estado:'Confirmado' },
  { fecha:'07/05/2026', hora:'21:00', tipo:'Entrevista',      titulo:'Entrevista en exclusiva · Carlos Alsina (Onda Cero)',         ubicacion:'Estudios Atresmedia',         coverage:'Prensa nacional',estado:'Confirmado' },
  { fecha:'08/05/2026', hora:'12:00', tipo:'Mitin',           titulo:'Gran mitin de campaña · Plaza de toros',                     ubicacion:'Valencia',                    aforo:8500, coverage:'TV nacional',  estado:'Confirmado' },
  { fecha:'09/05/2026', hora:'19:30', tipo:'Acto territorial',titulo:'Día de Europa · acto con eurodiputados',                      ubicacion:'Madrid · Auditorio Mutua',    aforo:1200, coverage:'Prensa nacional',estado:'Confirmado' },
  { fecha:'12/05/2026', hora:'21:30', tipo:'Debate',          titulo:'Debate televisado · TVE',                                     ubicacion:'TVE Prado del Rey',           coverage:'TV nacional',    estado:'Pendiente'  },
  { fecha:'14/05/2026', hora:'19:00', tipo:'Mitin',           titulo:'Mitin de cierre regional · Andalucía',                        ubicacion:'Málaga · Cortijo de Torres',  aforo:6500, coverage:'TV nacional',  estado:'Confirmado' },
]

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/agenda`, {
        headers: { 'X-API-Key': apiKey ?? '' },
        next: { revalidate: 300 },
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }
  }
  return NextResponse.json(MOCK)
}
