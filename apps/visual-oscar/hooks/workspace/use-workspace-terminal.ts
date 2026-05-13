"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import type { HookResult, WorkspaceActivityEvent, WorkspaceAlert } from "@/types/workspace";

interface TerminalData {
  activity: WorkspaceActivityEvent[];
  alerts: WorkspaceAlert[];
}

export function useWorkspaceTerminal(workspaceId: string): HookResult<TerminalData> {
  return useMemo(() => {
    const activity = workspaceRepository.getActivity(workspaceId);
    const alerts = workspaceRepository.getActiveAlerts(workspaceId);
    const data: TerminalData = { activity, alerts };
    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: activity.length === 0 && alerts.length === 0,
    };
  }, [workspaceId]);
}
