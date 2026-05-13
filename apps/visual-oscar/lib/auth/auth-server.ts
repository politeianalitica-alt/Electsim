/**
 * Resolver de sesión server-side.
 *
 * Uso en route handlers / Server Components:
 *
 *   import { currentUser } from "@/lib/auth/auth-server";
 *   const user = await currentUser();
 *   if (!user) return new Response("unauthorized", { status: 401 });
 *
 * En modo dev (sin Clerk configurado) devuelve siempre DEV_USER.
 */

import { AUTH_CONFIG, DEV_USER, isAuthEnabled, type SessionUser } from "./auth-config";

export async function currentUser(): Promise<SessionUser | null> {
  if (!isAuthEnabled()) {
    return { ...DEV_USER };
  }
  try {
    const clerkMod = "@clerk/nextjs/server";
    const clerk = (await import(/* webpackIgnore: true */ clerkMod)) as any;
    const { userId, sessionClaims } = clerk.auth();
    if (!userId) return null;

    // Obtener perfil completo
    const user = await clerk.currentUser();
    if (!user) return null;

    return {
      id:        user.id,
      email:     user.primaryEmailAddress?.emailAddress ?? "",
      name:      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Usuario",
      avatarUrl: user.imageUrl ?? undefined,
      tenantId:  (sessionClaims?.tenantId as string) ?? "tenant_default",
      role:      ((sessionClaims?.role as string) ?? "analyst") as SessionUser["role"],
    };
  } catch {
    // Clerk no instalado o falló — fallback al modo mock
    return { ...DEV_USER };
  }
}

/**
 * Wrapper para route handlers: garantiza usuario o devuelve 401.
 *
 *   export const GET = withUser(async (req, user) => { ... });
 */
export function withUser<T extends (req: Request, user: SessionUser) => Promise<Response>>(handler: T) {
  return async (req: Request): Promise<Response> => {
    const user = await currentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req, user);
  };
}
