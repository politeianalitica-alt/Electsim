"use client";

import { useState, useMemo } from "react";
import { useWorkspaceOverview } from "@/hooks/workspace/use-workspace-overview";
import { buildMorningBrief } from "@/lib/workspace/morning-brief-builder";
import { getTopOpportunities, getIssuesBySeverity } from "@/lib/workspace/workspace-selectors";
import { getNext24h, demoAgenda } from "@/lib/workspace/agenda-builder";
import { OverviewSkeleton } from "@/app/_components/workspace/overview-skeleton";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";
import { MorningBriefWidget } from "@/app/_components/workspace/widgets/morning-brief-widget";
import { KpiStripWidget } from "@/app/_components/workspace/widgets/kpi-strip-widget";
import { AgendaWidget } from "@/app/_components/workspace/widgets/agenda-widget";
import { IssuesWidget } from "@/app/_components/workspace/widgets/issues-widget";
import { ActionsWidget } from "@/app/_components/workspace/widgets/actions-widget";
import { TeamWidget } from "@/app/_components/workspace/widgets/team-widget";
import { DecisionsWidget } from "@/app/_components/workspace/widgets/decisions-widget";
import { CanvasSummaryWidget } from "@/app/_components/workspace/widgets/canvas-summary-widget";
import { RadarTopWidget } from "@/app/_components/workspace/widgets/radar-top-widget";
import { CrmAlertsPanel } from "@/components/crm/crm-alerts-panel";
import { InboxMiniWidget } from "@/app/_components/workspace/widgets/inbox-mini-widget";

export default function WorkspaceOverviewPage({ params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;
  const { data, isLoading, isEmpty } = useWorkspaceOverview(workspaceId);
  const [briefSeed, setBriefSeed] = useState(0);

  const brief = useMemo(
    () => data ? buildMorningBrief(data.issues, data.actions, data.alerts) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, briefSeed]
  );
  const topOpportunities = useMemo(
    () => data ? getTopOpportunities(data.opportunities, 3) : [],
    [data]
  );
  const criticalIssues = useMemo(
    () => data ? getIssuesBySeverity(data.criticalIssues) : [],
    [data]
  );
  const agendaEvents = useMemo(() => getNext24h(demoAgenda), []);

  if (isLoading) return <OverviewSkeleton />;
  if (isEmpty || !data || !brief) {
    return (
      <WorkspaceEmptyState
        view="overview"
        title="Workspace sin datos"
        description={`No encontramos información para «${workspaceId}».`}
      />
    );
  }

  return (
    <div className="grid grid-cols-12 grid-rows-[auto_auto_1fr_1fr] gap-3 h-full min-h-[800px]">
      <div className="col-span-4 row-span-2">
        <MorningBriefWidget
          brief={brief}
          onRegenerate={() => setBriefSeed(s => s + 1)}
        />
      </div>
      <div className="col-span-8 h-28">
        <KpiStripWidget data={data} workspaceId={workspaceId} />
      </div>
      <div className="col-span-8">
        <AgendaWidget events={agendaEvents} workspaceId={workspaceId} />
      </div>

      <div className="col-span-4">
        <IssuesWidget issues={criticalIssues} workspaceId={workspaceId} />
      </div>
      <div className="col-span-4">
        <ActionsWidget actions={data.actions} workspaceId={workspaceId} />
      </div>
      <div className="col-span-4">
        <TeamWidget members={data.members} />
      </div>

      <div className="col-span-4">
        <DecisionsWidget decisions={data.decisions} workspaceId={workspaceId} />
      </div>
      <div className="col-span-4">
        <CanvasSummaryWidget canvas={data.canvas} workspaceId={workspaceId} />
      </div>
      <div className="col-span-4">
        <RadarTopWidget opportunities={topOpportunities} workspaceId={workspaceId} />
      </div>

      {/* Fila adicional: Inbox mini + CRM alerts */}
      <div className="col-span-8">
        <InboxMiniWidget workspaceId={workspaceId} />
      </div>
      <div className="col-span-4">
        <CrmAlertsPanel workspaceId={workspaceId} />
      </div>
    </div>
  );
}
