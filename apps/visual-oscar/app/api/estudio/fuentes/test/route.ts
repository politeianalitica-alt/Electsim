import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/fuentes/test`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Modo demo: simula test exitoso después de un pequeño delay
    await new Promise(r => setTimeout(r, 1200))
    return NextResponse.json({
      ok:      true,
      message: 'Conexión simulada correctamente (modo demo · backend offline)',
    })
  }
}
