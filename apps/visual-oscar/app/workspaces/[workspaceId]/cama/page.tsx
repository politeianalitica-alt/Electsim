"use client";

import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import CamaModule from "@/app/_components/cama/CamaModule";

export default function CamaPage() {
  return (
 <div>
 <WorkspaceViewHeader
        view="cama"
        title="Cama"
        eyebrow="Contenido · Campañas y Macroargumentos"
        description="Narrativas centrales versionadas: argumentarios con evidencias, indicadores de impacto y comparador. Repositorio compartido con Estudio, War Room, Toolbox y Cuaderno."
      />
 <CamaModule espacio="command-center" />
 </div>
  );
}
