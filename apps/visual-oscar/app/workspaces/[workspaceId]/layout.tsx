import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell";
import AppHeader from "@/app/_components/AppHeader";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: { workspaceId: string };
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  return (
    <WorkspaceProvider>
      {/* Mantenemos el chrome del dashboard arriba: la nav principal sigue
          visible al entrar al Workspace para que el usuario no sienta que
          ha "salido" de la plataforma. */}
      <AppHeader />
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
