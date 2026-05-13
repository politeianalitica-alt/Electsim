/**
 * Middleware Next.js — sólo activo cuando Clerk está configurado.
 *
 * Sin CLERK_SECRET_KEY el middleware pasa todo sin tocarlo (modo dev).
 * Con Clerk configurado, protege /workspaces/* y /api/workspace/*.
 *
 * NOTA: el import `@clerk/nextjs/server` se hace dinámico con try/catch
 * para que el build no falle cuando la dep no está instalada.
 */

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATTERNS = [/^\/workspaces(\/|$)/, /^\/api\/workspace(\/|$)/];

export async function middleware(req: NextRequest) {
  if (process.env.DEV_MODE === "true") return NextResponse.next();
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (!PROTECTED_PATTERNS.some(p => p.test(path))) return NextResponse.next();

  try {
    const clerkMod = "@clerk/nextjs/server";
    const clerk = (await import(/* webpackIgnore: true */ clerkMod)) as any;
    if (typeof clerk.clerkMiddleware === "function") {
      return await clerk.clerkMiddleware()(req);
    }
    // Compat con versiones anteriores
    if (typeof clerk.authMiddleware === "function") {
      return await clerk.authMiddleware({
        publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api/health"],
      })(req);
    }
  } catch {
    // Clerk no instalado todavía — pasamos
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
