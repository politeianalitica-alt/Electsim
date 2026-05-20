"use client";

import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { InboxView } from "@/components/inbox/inbox-view";

export default function InboxPage({ params }: { params: { workspaceId: string } }) {
  return (
    <div>
      <WorkspaceViewHeader
        view="inbox"
        eyebrow="Workspace · Bandeja"
        title="Inbox"
        description="Señal sin ruido · RSS · BOE · Alerts · X · Newsletters · Agente"
        badge="C N K A · atajos"
      />
      <InboxView workspaceId={params.workspaceId} />
    </div>
  );
}
