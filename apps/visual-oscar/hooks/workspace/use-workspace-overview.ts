"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceOverview } from "@/types/workspace";

export function useWorkspaceOverview(workspaceId: string): HookResult<WorkspaceOverview> {
  return useMemo(() => {
    const data = workspaceRepository.getOverview(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: !data,
    };
  }, [workspaceId]);
}
