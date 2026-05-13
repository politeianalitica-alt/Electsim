"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceResearchThread } from "@/types/workspace";

export function useWorkspaceResearch(workspaceId: string): HookResult<WorkspaceResearchThread[]> {
  return useMemo(() => {
    const data = workspaceRepository.getResearchThreads(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
