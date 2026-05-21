/**
 * Role-based access control para el Workspace.
 *
 * Roles (en orden de privilegio):
 *   owner   → todo + delete workspace + manage billing
 *   admin   → todo dentro del workspace + invitar miembros
 *   analyst → read + write contenido (issues/docs/research) + run agent
 *   viewer  → sólo read
 */

import type { WorkspaceRole, SessionUser } from "./auth-config";

export type Permission =
  // Workspace management
  | "workspace.delete"
  | "workspace.settings"
  | "workspace.invite"
  // Content
  | "content.read"
  | "content.write"
  | "content.publish"
  | "content.delete"
  // Agent / AI
  | "agent.run"
  | "agent.configure"
  // Reporting / exports
  | "report.export"
  | "report.distribute"
  // Audit
  | "audit.read";

const MATRIX: Record<WorkspaceRole, Set<Permission>> = {
  owner:   new Set([
 "workspace.delete", "workspace.settings", "workspace.invite",
 "content.read", "content.write", "content.publish", "content.delete",
 "agent.run", "agent.configure",
 "report.export", "report.distribute",
 "audit.read",
  ]),
  admin:   new Set([
 "workspace.settings", "workspace.invite",
 "content.read", "content.write", "content.publish", "content.delete",
 "agent.run", "agent.configure",
 "report.export", "report.distribute",
 "audit.read",
  ]),
  analyst: new Set([
 "content.read", "content.write", "content.publish",
 "agent.run",
 "report.export",
  ]),
  viewer:  new Set([
 "content.read",
  ]),
};

export function can(user: SessionUser | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  return MATRIX[user.role]?.has(perm) ?? false;
}

export function assertCan(user: SessionUser | null | undefined, perm: Permission): void {
  if (!can(user, perm)) {
    throw new Error(`forbidden: missing permission '${perm}'`);
  }
}

/** Wrapper para route handlers que requieren un permiso concreto. */
export function withPermission<T extends (req: Request, user: SessionUser) => Promise<Response>>(
  perm: Permission,
  handler: T,
) {
  return async (req: Request, user: SessionUser): Promise<Response> => {
    if (!can(user, perm)) {
      return new Response(JSON.stringify({ error: "forbidden", permission: perm }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req, user);
  };
}
