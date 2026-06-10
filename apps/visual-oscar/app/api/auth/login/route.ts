import { NextResponse } from 'next/server'
import { signToken, COOKIE_NAME } from '@/lib/auth/session'

const USERS = [
  { email: 'antonio@politeia.es', password: 'legaz',    name: 'Antonio Legaz', role: 'owner' },
  { email: 'oscar@politeia.es',   password: 'Garcia',   name: 'Oscar García',  role: 'admin' },
  { email: 'invitado@politeia.es', password: 'invitado', name: 'Invitado',      role: 'viewer' },
] as const

export async function POST(req: Request) {
  let email = '', password = ''
  try {
    const body = await req.json()
    email    = (body.email    ?? '').trim().toLowerCase()
    password = (body.password ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const user = USERS.find(u => u.email === email && u.password === password)
  if (!user) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = await signToken({ email: user.email, name: user.name, role: user.role })

  const res = NextResponse.json({
    ok: true,
    access_token: `local.${btoa(user.email)}.session`,
    refresh_token: `local.refresh.${Date.now()}`,
    user: { email: user.email, name: user.name, role: user.role },
  })

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge:   30 * 24 * 3600,   // 30 días · debe coincidir con SESSION_HOURS en lib/auth/session.ts
  })

  return res
}
