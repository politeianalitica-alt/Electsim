"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceKnowledgeItem } from "@/types/workspace";

export function useWorkspaceKnowledge(workspaceId: string): HookResult<WorkspaceKnowledgeItem[]> {
  return useMemo(() => {
    const data = workspaceRepository.getKnowledgeItems(workspaceId);
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: data.length === 0,
    };
  }, [workspaceId]);
}
