import { NextResponse } from 'next/server'
import type { CrisisWarRoom } from '@/types/war-room'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK: CrisisWarRoom[] = [
  { id:'c1', titulo:'Deepfake Feijóo en TikTok · "elecciones anticipadas"',     severidad:'ALTA',  tipo:'Tecnológica', estado:'Contenida' },
  { id:'c2', titulo:'Ataque coordinado #FeijóoElecciones · 412 cuentas',        severidad:'MEDIA', tipo:'Mediática',   estado:'Activa'    },
  { id:'c3', titulo:'Tensión interna pacto autonómico Castilla y León con VOX', severidad:'MEDIA', tipo:'Política',    estado:'Activa'    },
]

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/crisis`, {
        headers: { 'X-API-Key': apiKey ?? '' },
        next: { revalidate: 30 },
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }
  }
  return NextResponse.json(MOCK)
}
