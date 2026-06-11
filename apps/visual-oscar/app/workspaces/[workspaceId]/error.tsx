"use client";

/**
 * Error boundary del segmento /workspaces/[workspaceId]/*.
 * Al vivir DENTRO del layout del workspace, un fallo en una vista conserva
 * el chrome (AppHeader, sidebar, topbar). Panel unificado: ErrorPanel.
 */

import ErrorPanel, { type ErrorBoundaryProps } from "@/app/_components/ErrorPanel";

export default function WorkspaceError({ error, reset }: ErrorBoundaryProps) {
  return (
 <ErrorPanel
      error={error}
      reset={reset}
      scope="workspace"
      titulo="Esta vista ha fallado"
      descripcion="El resto del workspace sigue disponible desde el sidebar."
    />
  );
}
