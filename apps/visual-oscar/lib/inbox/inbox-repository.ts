/**
 * Repositorio de Inbox.
 *
 * Lectura in-memory desde `inboxMock`. La página persiste cambios de status
 * en localStorage para que el usuario pueda procesar items entre sesiones
 * sin necesidad de DB.
 *
 * Cuando se active la DB, sustituir las funciones por consultas a Drizzle.
 */

import type { InboxItem, InboxStatus } from "@/types/inbox";
import { inboxMock } from "./inbox-mock";

export const inboxRepository = {
  list(workspaceId: string, overrides?: Record<string, InboxStatus>): InboxItem[] {
    return inboxMock
      .filter(i => i.workspaceId === workspaceId)
      .map(i => overrides?.[i.id] ? { ...i, status: overrides[i.id] } : i)
      .sort((a, b) => b.score - a.score);
  },

  countByStatus(items: InboxItem[]): Record<InboxStatus, number> {
    const out: Record<InboxStatus, number> = { unread: 0, read: 0, archived: 0, actioned: 0 };
    for (const i of items) out[i.status] = (out[i.status] ?? 0) + 1;
    return out;
  },

  bySource(items: InboxItem[]) {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.source, (m.get(i.source) ?? 0) + 1);
    return m;
  },
};
