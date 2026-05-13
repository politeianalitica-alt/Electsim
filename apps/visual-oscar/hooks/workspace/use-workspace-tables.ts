"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceDataset } from "@/types/workspace";

export function useWorkspaceTables(workspaceId: string): HookResult<WorkspaceDataset[]> {
  return useMemo(() => {
    const data = workspaceRepository.getDatasets(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
