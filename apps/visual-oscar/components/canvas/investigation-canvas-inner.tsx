"use client";

import { memo, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type Connection,
  type Node,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  CanvasObject,
  CanvasHypothesis,
  ConnectionType,
  InvestigationCanvas,
} from "@/types/canvas";
import {
  OBJECT_TYPE_CONFIG,
  HYPOTHESIS_STATUS_CONFIG,
  CONNECTION_TYPE_CONFIG,
} from "@/lib/canvas/canvas-config";
import { canvasToFlow } from "@/lib/canvas/canvas-adapter";

// ============================================================
//  Nodo base: actores, eventos, conceptos, etc.
// ============================================================
const CanvasBaseNode = memo(function CanvasBaseNode({
  data,
  selected,
}: NodeProps<{ object: CanvasObject }>) {
  const config = OBJECT_TYPE_CONFIG[data.object.type];
  return (
    <div
      className={`relative rounded-xl border px-3 py-2 min-w-[140px] max-w-[200px] transition-all cursor-grab active:cursor-grabbing ${
        selected
          ? "border-indigo-500 shadow-lg shadow-indigo-500/20 bg-slate-800"
          : "border-slate-700 bg-slate-900 hover:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-slate-600 !bg-slate-700" />
      <div className="flex items-start gap-2">
        <span
          className="flex-none rounded px-1 py-0.5 text-[8px] font-bold tracking-wider"
          style={{ background: `${config.color}25`, color: config.color }}
        >
          {config.mark}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-100 leading-tight">{data.object.label}</p>
          {data.object.confidence !== undefined && (
            <p className="text-[9px] text-slate-500 mt-0.5">
              {Math.round(data.object.confidence * 100)}% confianza
            </p>
          )}
        </div>
      </div>
      {data.object.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {data.object.tags.slice(0, 2).map(t => (
            <span key={t} className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-400">
              {t}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-slate-600 !bg-slate-700" />
    </div>
  );
});

// ============================================================
//  Nodo hipótesis
// ============================================================
const CanvasHypothesisNode = memo(function CanvasHypothesisNode({
  data,
  selected,
}: NodeProps<{ hypothesis: CanvasHypothesis }>) {
  const config = HYPOTHESIS_STATUS_CONFIG[data.hypothesis.status];
  return (
    <div
      className={`rounded-xl border-2 border-dashed px-3 py-2.5 min-w-[180px] max-w-[240px] ${
        selected ? "border-violet-500 bg-violet-500/10" : "bg-slate-900/80"
      }`}
      style={{ borderColor: selected ? undefined : `${config.color}60` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
          Hipótesis
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-medium"
          style={{ background: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
        <span className="ml-auto text-[9px] text-slate-400">
          {Math.round(data.hypothesis.confidence * 100)}%
        </span>
      </div>
      <p className="text-xs text-slate-200 leading-snug">{data.hypothesis.title}</p>
      <div className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${data.hypothesis.confidence * 100}%`, background: config.color }}
        />
      </div>
    </div>
  );
});

// ============================================================
//  Nodo nota libre
// ============================================================
const CanvasNoteNode = memo(function CanvasNoteNode({
  data,
  selected,
}: NodeProps<{ object: CanvasObject }>) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 min-w-[160px] max-w-[220px] bg-amber-950/40 ${
        selected ? "border-amber-500" : "border-amber-900/60"
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Nota</span>
      <p className="text-xs text-amber-100/90 leading-snug mt-1">
        {data.object.description ?? data.object.label}
      </p>
    </div>
  );
});

// ============================================================
//  Edge custom
// ============================================================
const CanvasEdge = memo(function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const conn = (data ?? {}) as { type?: ConnectionType; label?: string; confidence?: number };
  const config = CONNECTION_TYPE_CONFIG[conn.type ?? "related_to"];
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const strokeWidth = selected ? 2 : Math.max(1, (conn.confidence ?? 0.5) * 2);
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: config.color,
          strokeWidth,
          strokeDasharray: config.dashed ? "5 4" : undefined,
          opacity: selected ? 1 : 0.6,
        }}
      />
      {conn.label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="pointer-events-none absolute rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"
          >
            {conn.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// nodeTypes/edgeTypes DEFINIDOS FUERA DEL COMPONENTE para evitar re-renders.
const nodeTypes = {
  object: CanvasBaseNode,
  hypothesis: CanvasHypothesisNode,
  note: CanvasNoteNode,
};

const edgeTypes = {
  canvas: CanvasEdge,
};

interface InvestigationCanvasInnerProps {
  canvas: InvestigationCanvas;
  onNodeClick?: (objectId: string) => void;
  onEdgeClick?: (connectionId: string) => void;
  onPaneClick?: () => void;
}

export function InvestigationCanvasInner({
  canvas,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
}: InvestigationCanvasInnerProps) {
  const initial = useMemo(() => canvasToFlow(canvas), [canvas]);
  const [nodes, _setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({ ...connection, type: "canvas" }, eds));
    },
    [setEdges]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onEdgeClick={(_, edge) => onEdgeClick?.(edge.id)}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode="Delete"
        colorMode="dark"
        className="bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls className="!border-slate-700 !bg-slate-900" showInteractive={false} />
        <MiniMap
          className="!border-slate-700 !bg-slate-900"
          nodeColor={(node: Node) => (node.type === "hypothesis" ? "#8b5cf6" : "#6366f1")}
          maskColor="rgba(2,6,23,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
