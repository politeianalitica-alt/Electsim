"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceAutomation } from "@/types/workspace";

export function useWorkspaceAutomations(workspaceId: string): HookResult<WorkspaceAutomation[]> {
  return useMemo(() => {
    const data = workspaceRepository.getAutomations(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
