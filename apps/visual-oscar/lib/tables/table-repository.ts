import type { PoliteiTable } from "@/types/tables";
import { tablesMockData } from "./tables-mock-data";
import { hydrate, persist } from "@/lib/workspace/persist";

const PKEY = "politeia:ws:tables";
hydrate(PKEY, tablesMockData);

export const tableRepository = {
  list(workspaceId: string): PoliteiTable[] {
    return tablesMockData.filter(t => t.workspaceId === workspaceId);
  },
  getTableById(tableId: string, workspaceId: string): PoliteiTable | null {
    return tablesMockData.find(t => t.id === tableId && t.workspaceId === workspaceId) ?? null;
  },
  saveTable(tableId: string, patch: Partial<PoliteiTable>) {
    const idx = tablesMockData.findIndex(t => t.id === tableId);
    if (idx !== -1) {
      tablesMockData[idx] = {
        ...tablesMockData[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      persist(PKEY, tablesMockData);
    }
  },
  /** Crea una tabla nueva (p. ej. importada de CSV) y la persiste. */
  createTable(table: PoliteiTable): PoliteiTable {
    tablesMockData.unshift(table);
    persist(PKEY, tablesMockData);
    return table;
  },
};
