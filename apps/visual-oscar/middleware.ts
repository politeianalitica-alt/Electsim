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
  '/api/gdelt/',
  '/api/factcheck/',
  '/api/wikidata/',
  '/api/wto/',
  '/api/global-intel/',
  '/api/macro-finance/',
  // Sprint W.1 · proxies que faltaban en el whitelist · cuando un route
  // handler hacía fetch server-to-server contra estos paths (sin cookie),
  // el middleware redirigía a /login → HTML → JSON.parse fallaba en el
  // caller. Identificado por el probe data-probe.ts contra 277 indicadores:
  // 63 fallos clasificados como `error` con preview "<!DOCTYPE html>" eran
  // por esta causa raíz (no por endpoint inexistente).
  '/api/spanish-stats/',
  '/api/cis-snapshot/',
  '/api/governance-indices/',
  '/api/aemet/',
  '/api/macro/derived/',
  '/api/tesoro/',
  '/api/bde/',
  '/api/undp/',
  '/api/esios/',
  '/api/worldbank/',
  // Sprint 0+1 Prensa · capa canónica · contratos públicos para frontend.
  // Estos endpoints son "adaptadores" sobre /api/medios/intel (legacy, auth
  // required). Server-side fetch desde estos handlers contra intel sin cookie
  // se redirigía a /login → JSON.parse fallaba. Causa raíz idéntica a la
  // del Sprint W.1. Mantenemos /api/medios/intel auth-required (legacy);
  // sólo exponemos los nuevos endpoints canónicos (lectura de datos
  // agregados públicos sobre catálogo y RSS).
  '/api/medios/pulso',
  '/api/medios/clusters',
  '/api/medios/fuentes-status',
  '/api/medios/pipeline-metrics',
  '/api/medios/narrativas',
  '/api/medios/actores/',
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
