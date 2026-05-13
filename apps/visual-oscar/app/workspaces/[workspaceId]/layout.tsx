import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: { workspaceId: string };
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell workspaceId={params.workspaceId}>
        {children}
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

export function generateMetadata({ params }: { params: { workspaceId: string } }) {
  return {
    title: `Workspace — ${params.workspaceId} · Politeia Analítica`,
  };
}
