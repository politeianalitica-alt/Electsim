import type { InvestigationCanvas } from "@/types/canvas";
import { canvasMockData } from "./canvas-mock-data";

export const canvasRepository = {
  list(workspaceId: string): InvestigationCanvas[] {
    return canvasMockData.filter(c => c.workspaceId === workspaceId);
  },
  getCanvasById(canvasId: string, workspaceId: string): InvestigationCanvas | null {
    return canvasMockData.find(c => c.id === canvasId && c.workspaceId === workspaceId) ?? null;
  },
  saveCanvas(canvasId: string, patch: Partial<InvestigationCanvas>) {
    const idx = canvasMockData.findIndex(c => c.id === canvasId);
    if (idx !== -1) {
      canvasMockData[idx] = {
        ...canvasMockData[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    }
  },
};
