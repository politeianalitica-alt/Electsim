import { NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST() {
  try {
    const res = await fetch(`${BACKEND}/api/domo/notification/read-all`, { method: 'POST' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 200 })
  }
}
