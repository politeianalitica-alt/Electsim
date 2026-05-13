"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceProject } from "@/types/workspace";

export function useWorkspaceProjects(workspaceId: string): HookResult<WorkspaceProject[]> {
  return useMemo(() => {
    const data = workspaceRepository.getProjects(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
