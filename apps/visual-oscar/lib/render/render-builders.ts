/**
 * Builders que transforman entidades del workspace a `PdfDocSpec`.
 *
 * Centraliza la lógica de "qué bloques mete cada tipo de entregable" para
 * que el endpoint /api/render/pdf reciba siempre un spec bien-formed.
 */

import type { PdfDocSpec } from "./pdf-renderer";
import type { Project, ProjectTask } from "@/types/project";
import type { DocWithBlocks } from "@/types/docs";
import type { RadarBatch } from "@/types/radar";

// ─── Doc → Spec ────────────────────────────────────────────────────────
export function docToSpec(doc: DocWithBlocks, workspace?: string): PdfDocSpec {
  const blocks: PdfDocSpec["blocks"] = [];
  for (const b of doc.blocks ?? []) {
    switch (b.type) {
      case "heading":
        blocks.push({ type: b.level === 1 ? "h1" : b.level === 2 ? "h2" : "h3", text: b.text ?? "" });
        break;
      case "paragraph":
        blocks.push({ type: "p", text: b.text ?? "" });
        break;
      case "bullet":
      case "numbered":
        blocks.push({ type: "bullet", text: b.text ?? "" });
        break;
      case "callout":
        blocks.push({ type: "callout", text: b.text ?? "", tone: "info" });
        break;
      case "context-block":
        blocks.push({ type: "callout", text: b.text ?? "", tone: "warn" });
        break;
      default:
        if ((b as any).text) blocks.push({ type: "p", text: (b as any).text });
    }
  }
  return {
    title:    doc.title || "Documento sin título",
    subtitle: doc.kind ? humanKind(doc.kind) : undefined,
    author:   doc.authorId,
    workspace,
    generatedAt: doc.updatedAt ?? new Date().toISOString(),
    blocks,
    meta: {
      estado: doc.status ?? "draft",
      tipo:   doc.kind ?? "documento",
      tags:   (doc.tags ?? []).join(", ") || "—",
    },
  };
}

// ─── Project → Spec ────────────────────────────────────────────────────
export function projectToSpec(project: Project, workspace?: string): PdfDocSpec {
  const blocks: PdfDocSpec["blocks"] = [];
  if (project.description) blocks.push({ type: "p", text: project.description });

  // Hitos
  if (project.milestones?.length) {
    blocks.push({ type: "h2", text: "Hitos clave" });
    for (const m of project.milestones.slice(0, 8)) {
      blocks.push({
        type: "bullet",
        text: `${new Date(m.date).toLocaleDateString("es-ES")} — ${m.title}${m.achieved ? " (cumplido)" : ""}`,
      });
    }
  }
  // Tareas top
  if (project.tasks?.length) {
    blocks.push({ type: "h2", text: "Tareas (top 12)" });
    const tasks = [...project.tasks]
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
      .slice(0, 12);
    for (const t of tasks) {
      blocks.push({
        type: "bullet",
        text: `[${t.status}] ${t.title} · prioridad ${t.priority} · ${t.progress}%`,
      });
    }
  }
  return {
    title:    project.title,
    subtitle: project.type,
    workspace,
    generatedAt: new Date().toISOString(),
    blocks,
    meta: {
      estado:     project.status,
      progreso: `${overallProgress(project.tasks ?? [])}%`,
      inicio:     new Date(project.startDate).toLocaleDateString("es-ES"),
      fin:        new Date(project.endDate).toLocaleDateString("es-ES"),
      tareas:     String(project.tasks?.length ?? 0),
      hitos:      String(project.milestones?.length ?? 0),
    },
  };
}

// ─── Radar → Spec ──────────────────────────────────────────────────────
export function radarToSpec(batch: RadarBatch, workspace?: string): PdfDocSpec {
  const blocks: PdfDocSpec["blocks"] = [
    { type: "p", text: `Radar generado por ${batch.source === "ollama" ? "Ollama" : "fallback mock"} a las ${new Date(batch.generatedAt).toLocaleString("es-ES")}.` },
    { type: "divider" },
  ];
  const sorted = [...batch.opportunities].sort((a, b) => b.score - a.score);
  for (const o of sorted) {
    blocks.push({ type: "h2", text: `${o.score} · ${o.title}` });
    blocks.push({ type: "p",  text: o.rationale });
    blocks.push({
      type: "kv",
      pairs: [
        ["Categoría", o.category],
        ["Horizonte", o.horizon],
        ["Impacto",   o.impact],
        ["Confianza", `${Math.round(o.confidence * 100)}%`],
      ],
    });
    if (o.actions?.length) {
      blocks.push({ type: "h3", text: "Acciones recomendadas" });
      for (const a of o.actions) {
        blocks.push({ type: "bullet", text: `${a.label} — ${a.timeline}${a.owner ? ` · ${a.owner}` : ""}` });
      }
    }
  }
  return {
    title: "Radar de Oportunidades",
    subtitle: `${batch.opportunities.length} oportunidades · ${batch.source === "ollama" ? "Ollama live" : "mock"}`,
    workspace,
    generatedAt: batch.generatedAt,
    blocks,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────
function humanKind(kind: string): string {
  switch (kind) {
    case "briefing":        return "Briefing";
    case "memo":            return "Memo interno";
    case "crisis-note":     return "Nota de crisis";
    case "analysis":        return "Análisis";
    case "client-report":   return "Informe cliente";
    case "positioning":     return "Documento de posicionamiento";
    case "talking-points":  return "Talking points";
    default:                return kind;
  }
}

function priorityRank(p: ProjectTask["priority"]): number {
  return p === "critical" ? 4 : p === "high" ? 3 : p === "medium" ? 2 : 1;
}

function overallProgress(tasks: ProjectTask[]): number {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length);
}
