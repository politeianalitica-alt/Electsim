import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth/session'

// Rutas que no requieren sesión
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/health',
  '/api/admin/init_workspace',
  '/api/cron/',
  '/api/system/',
  '/_next',
  '/favicon',
  // Proxies a APIs públicas externas · no exponen secretos sensibles
  // (sólo passthrough de datos abiertos macro/comercio/energía/geopolítica/medios)
  '/api/acled/',
  '/api/bis/',
  '/api/comtrade/',
  '/api/ember/',
  '/api/entsoe/',
  '/api/eurostat/',
  '/api/finnhub/',
  '/api/iati/',
  '/api/imf/',
  '/api/newsapi/',
  '/api/oec/',
  '/api/oecd/',
  '/api/openfigi/',
  '/api/portwatch/',
  '/api/reliefweb/',
  '/api/ine/',
  '/api/datos-gob/',
  '/api/ecb/',
  '/api/cis/',
  '/api/wto/',
  '/api/global-intel/',
  '/api/macro-finance/',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Archivos estáticos y rutas públicas
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.includes('.')) return NextResponse.next()

  // Verificar cookie de sesión
  const session = req.cookies.get(COOKIE_NAME)?.value
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}
