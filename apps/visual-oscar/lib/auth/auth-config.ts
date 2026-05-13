/**
 * Auth provider configuration.
 *
 * Politeia usa Clerk como provider — pero la app funciona sin él en modo
 * "dev" hasta que provisionéis la cuenta y configuréis las keys.
 *
 * Variables de entorno (Vercel Settings → Environment Variables):
 *   CLERK_SECRET_KEY                  — sk_test_… o sk_live_…
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — pk_test_… o pk_live_…
 *   CLERK_WEBHOOK_SECRET              — para /api/webhooks/clerk
 *   DEV_MODE                          — "true" fuerza el modo mock incluso si hay keys
 */

export const AUTH_CONFIG = {
  clerkSecretKey:      process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  webhookSecret:       process.env.CLERK_WEBHOOK_SECRET ?? "",
  devMode:             process.env.DEV_MODE === "true",
} as const;

export function isAuthEnabled(): boolean {
  if (AUTH_CONFIG.devMode) return false;
  return Boolean(AUTH_CONFIG.clerkSecretKey && AUTH_CONFIG.clerkPublishableKey);
}

/** Usuario mock devuelto cuando Clerk no está configurado. */
export const DEV_USER = {
  id:        "user_dev",
  email:     "analyst@politeia.local",
  name:      "Analista Demo",
  avatarUrl: undefined as string | undefined,
  tenantId:  "tenant_dev",
  role:      "owner" as const,
} as const;

export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";

export interface SessionUser {
  id:        string;
  email:     string;
  name:      string;
  avatarUrl?: string;
  tenantId:  string;
  role:      WorkspaceRole;
}
