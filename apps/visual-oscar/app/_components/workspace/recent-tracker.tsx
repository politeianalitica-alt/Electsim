"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getViewBySegment } from "@/lib/workspace/navigation";
import { recordRecent } from "@/lib/workspace/recents";
import { docRepository } from "@/lib/docs/doc-repository";
import { crmRepository } from "@/lib/crm/crm-repository";
import { researchRepository } from "@/lib/research/research-repository";
import { projectRepository } from "@/lib/projects/project-repository";

/** Componente invisible: registra la vista/entidad actual en "recientes". */
export function RecentTracker({ workspaceId }: { workspaceId: string }) {
  const path = usePathname() ?? "";
  useEffect(() => {
    const parts = path.split("/").filter(Boolean);
    const wsIdx = parts.indexOf("workspaces");
    if (wsIdx < 0) return;
    const viewSeg = parts[wsIdx + 2];
    const detailSeg = parts[wsIdx + 3];
    if (!viewSeg) return;
    const view = getViewBySegment(viewSeg);
    let label = view?.label ?? viewSeg;
    try {
      if (detailSeg && !["new", "matrix", "map", "feeds", "knowledge"].includes(detailSeg)) {
        if (viewSeg === "docs") label = docRepository.getDocWithBlocks(detailSeg, workspaceId)?.title ?? label;
        else if (viewSeg === "crm") label = (crmRepository.getActorById(detailSeg) as any)?.name ?? label;
        else if (viewSeg === "research") label = researchRepository.getThreadById(detailSeg, workspaceId)?.title ?? label;
        else if (viewSeg === "projects") label = projectRepository.getProjectById(detailSeg, workspaceId)?.title ?? label;
      } else if (view) {
        label = view.label;
      }
    } catch { /* repos en modo demo */ }
    recordRecent({ path, label });
  }, [path, workspaceId]);
  return null;
}
