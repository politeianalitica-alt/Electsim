"use client";

import { useMemo } from "react";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { buildAnalytics, type AnalyticsSnapshot } from "@/lib/workspace/analytics-builder";
import type { HookResult } from "@/types/workspace";

export function useWorkspaceAnalytics(workspaceId: string): HookResult<AnalyticsSnapshot> {
  const data = useMemo<AnalyticsSnapshot>(() => {
    return buildAnalytics({
      issues:        workspaceRepository.getIssues(workspaceId),
      actions:       workspaceRepository.getActions(workspaceId),
      alerts:        workspaceRepository.getAlerts(workspaceId),
      decisions:     workspaceRepository.getDecisions(workspaceId),
      documents:     workspaceRepository.getDocuments(workspaceId),
      research:      workspaceRepository.getResearchThreads(workspaceId),
      projects:      workspaceRepository.getProjects(workspaceId),
      opportunities: workspaceRepository.getOpportunities(workspaceId),
    });
  }, [workspaceId]);

  return { data, isLoading: false, error: null, isEmpty: data.kpis.every(k => k.value === 0) };
}
