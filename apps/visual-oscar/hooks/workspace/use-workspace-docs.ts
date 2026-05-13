"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceDocument } from "@/types/workspace";

export function useWorkspaceDocs(workspaceId: string): HookResult<WorkspaceDocument[]> {
  return useMemo(() => {
    const data = workspaceRepository.getDocuments(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
