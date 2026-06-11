"use client";

import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import PreinformesModule from "@/app/_components/preinformes/PreinformesModule";

export default function PreinformesPage() {
  return (
 <div>
 <WorkspaceViewHeader
        view="preinformes"
        title="Preinformes"
        eyebrow="Contenido · Informes preliminares"
        description="Asistente en 4 pasos para generar borradores de informe: plantilla, fuentes (paneles, vigilantes, notas, macroargumentos), secciones y exportación a Markdown o PDF."
      />
 <PreinformesModule espacio="command-center" />
 </div>
  );
}
