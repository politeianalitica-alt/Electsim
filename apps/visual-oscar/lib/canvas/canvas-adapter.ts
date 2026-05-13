import type { Node, Edge } from "@xyflow/react";
import type { InvestigationCanvas } from "@/types/canvas";

export function canvasToFlow(canvas: InvestigationCanvas): { nodes: Node[]; edges: Edge[] } {
  const objectNodes: Node[] = canvas.objects.map(obj => ({
    id: obj.id,
    type: obj.type === "note" ? "note" : "object",
    position: obj.position,
    data: { object: obj },
    draggable: true,
  }));

  const hypothesisNodes: Node[] = canvas.hypotheses.map((hyp, idx) => ({
    id: hyp.id,
    type: "hypothesis",
    position: { x: -400, y: idx * 180 },
    data: { hypothesis: hyp },
    draggable: true,
  }));

  const edges: Edge[] = canvas.connections.map(conn => ({
    id: conn.id,
    source: conn.sourceId,
    target: conn.targetId,
    type: "canvas",
    data: {
      type: conn.type,
      label: conn.label,
      confidence: conn.confidence,
    },
  }));

  return { nodes: [...objectNodes, ...hypothesisNodes], edges };
}
