"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Graph from "graphology";
import { Sigma } from "sigma";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import { endpoints } from "@/lib/api/endpoints";
import type { ActorGraphData, ActorGraphNode } from "@/lib/api/endpoints";
import {
  Filter, RefreshCw, AlertTriangle,
  ZoomIn, ZoomOut, Maximize2, Play, Pause
} from "lucide-react";

const RELATION_META: Record<string, { color: string; label: string }> = {
  aliado:        { color: "#10B981", label: "Aliado" },
  coalicion:     { color: "#3B82F6", label: "Coalición" },
  rival:         { color: "#EF4444", label: "Rival" },
  tension:       { color: "#F59E0B", label: "Tensión" },
  mediatica:     { color: "#00D4FF", label: "Mediática" },
  institucional: { color: "#8B5CF6", label: "Institucional" },
  co_mencion:    { color: "#475569", label: "Co-mención" },
  ideologica:    { color: "#A78BFA", label: "Ideológica" },
  familiar:      { color: "#F97316", label: "Familiar" },
  empresarial:   { color: "#0EA5E9", label: "Empresarial" },
  juridica:      { color: "#DC2626", label: "Judicial" },
  internacional: { color: "#14B8A6", label: "Internacional" },
};

const FA2_SETTINGS = {
  settings: {
    gravity: 1,
    scalingRatio: 2,
    strongGravityMode: false,
    slowDown: 10,
    barnesHutOptimize: true,
    barnesHutTheta: 0.5,
    edgeWeightInfluence: 1,
    adjustSizes: true,
  },
};

function nodeSize(relevance: number): number {
  return Math.max(8, Math.min(24, 8 + (relevance / 100) * 16));
}

interface TooltipState {
  x: number;
  y: number;
  node: ActorGraphNode & { id: string };
}

interface Props {
  onNodeClick?: (actorId: string) => void;
}

export function ActorGraph({ onNodeClick }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const sigmaRef      = useRef<Sigma | null>(null);
  const graphRef      = useRef<Graph | null>(null);
  const fa2Ref        = useRef<InstanceType<typeof FA2Layout> | null>(null);
  // Fix 3 — isRunning ref avoids stale closure in init effect
  const isRunningRef  = useRef(true);

  const [minWeight,    setMinWeight]    = useState(0.05);
  const [relFilter,    setRelFilter]    = useState<string>("all");
  const [isRunning,    setIsRunning]    = useState(true);
  const [showLegend,   setShowLegend]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip,      setTooltip]      = useState<TooltipState | null>(null);

  // Fix 3 — keep ref in sync
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const { data, isLoading, isFetching, refetch, isError } = useQuery<ActorGraphData>({
    queryKey: ["actor-graph", minWeight, relFilter],
    queryFn: () => endpoints.actors.graph({
      min_weight: minWeight,
      ...(relFilter !== "all" ? { relation_type: relFilter } : {}),
    }),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const buildGraph = useCallback((graphData: ActorGraphData): Graph => {
    const g = new Graph({ multi: false, type: "directed" });

    const total = graphData.nodes.length;
    graphData.nodes.forEach((n, idx) => {
      const angle = (idx / Math.max(1, total)) * 2 * Math.PI;
      // Fix 4 — store original color for exact restore in leaveNode
      const originalColor = n.party_color ?? "#475569";
      g.addNode(n.id, {
        x: Math.cos(angle),
        y: Math.sin(angle),
        label: n.name.split(" ").slice(0, 2).join(" "),
        size: nodeSize(n.relevance),
        color: originalColor,
        _originalColor: originalColor,
        highlighted: n.trending ?? false,
        _raw: n,
      });
    });

    for (const e of graphData.edges) {
      if (g.hasEdge(e.source, e.target)) continue;
      const meta = RELATION_META[e.type] ?? { color: "#475569" };
      try {
        g.addEdge(e.source, e.target, {
          size: 0.8 + (e.weight ?? 0.1) * 2.5,
          color: meta.color + "99",
          label: meta.label,
          type: "arrow",
          _type: e.type,
          _weight: e.weight,
        });
      } catch { /* skip invalid edges */ }
    }

    return g;
  }, []);

  useEffect(() => {
    if (!containerRef.current || !data || data.nodes.length === 0) return;

    fa2Ref.current?.stop();
    fa2Ref.current?.kill();
    sigmaRef.current?.kill();

    const g = buildGraph(data);
    graphRef.current = g;

    const renderer = new Sigma(g as any, containerRef.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 6,
      labelFont: "-apple-system, 'SF Pro Text', sans-serif",
      labelSize: 10,
      labelColor: { color: "#94A3B8" },
      defaultEdgeType: "arrow",
      allowInvalidContainer: true,
    });
    sigmaRef.current = renderer;

    renderer.on("enterNode", ({ node }) => {
      const nodeAttrs = g.getNodeAttributes(node);
      const { x, y } = renderer.graphToViewport({ x: nodeAttrs.x as number, y: nodeAttrs.y as number });
      const rawNode = nodeAttrs._raw as ActorGraphNode;
      setTooltip({ x, y, node: { ...rawNode, id: node } });

      g.forEachNode((n) => {
        if (n !== node && !g.hasEdge(node, n) && !g.hasEdge(n, node)) {
          // Fix 4 — dim by appending opacity suffix to original color
          const orig = g.getNodeAttribute(n, "_originalColor") as string;
          g.setNodeAttribute(n, "color", orig + "30");
        }
      });
      g.forEachEdge((_edge, _attrs, src, tgt) => {
        if (src !== node && tgt !== node) g.setEdgeAttribute(_edge, "hidden", true);
      });
      renderer.refresh();
    });

    renderer.on("leaveNode", () => {
      setTooltip(null);
      // Fix 4 — restore exact original color, not party_color fallback
      g.forEachNode((n) => {
        g.setNodeAttribute(n, "color", g.getNodeAttribute(n, "_originalColor") as string);
      });
      g.forEachEdge((edge) => g.removeEdgeAttribute(edge, "hidden"));
      renderer.refresh();
    });

    renderer.on("clickNode", ({ node }) => {
      if (onNodeClick) onNodeClick(node);
    });

    // Fix 7 — ResizeObserver so Sigma reacts to container size changes
    const ro = new ResizeObserver(() => renderer.refresh());
    ro.observe(containerRef.current!);

    const fa2 = new FA2Layout(g as any, FA2_SETTINGS);
    fa2Ref.current = fa2;
    // Fix 3 — use ref to avoid stale closure on isRunning
    if (isRunningRef.current) fa2.start();

    return () => {
      // Fix 2 — null out refs to prevent double-kill on hot reload
      ro.disconnect();
      fa2.stop();
      fa2.kill();
      renderer.kill();
      fa2Ref.current = null;
      sigmaRef.current = null;
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, buildGraph]);

  useEffect(() => {
    if (!fa2Ref.current) return;
    if (isRunning) fa2Ref.current.start();
    else fa2Ref.current.stop();
  }, [isRunning]);

  const zoomIn  = useCallback(() => sigmaRef.current?.getCamera().animatedZoom({ duration: 300 }), []);
  const zoomOut = useCallback(() => sigmaRef.current?.getCamera().animatedUnzoom({ duration: 300 }), []);
  const fitAll  = useCallback(() => sigmaRef.current?.getCamera().animatedReset({ duration: 400 }), []);

  return (
    <div className={`premium-card p-0 overflow-hidden ${isFullscreen ? "fixed inset-4 z-50 flex flex-col" : ""}`}>

      {/* Controls bar */}
      <div className="flex items-center gap-3 p-4 border-b border-border1 flex-wrap shrink-0">
        <Filter className="w-4 h-4 text-cyan1 shrink-0" />

        <select
          value={relFilter}
          onChange={e => setRelFilter(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-xs text-text1 focus:border-cyan1 focus:outline-none"
        >
          <option value="all">Todas las relaciones</option>
          <optgroup label="Políticas">
            <option value="aliado">Aliados</option>
            <option value="rival">Rivales</option>
            <option value="coalicion">Coalición</option>
            <option value="tension">Tensión</option>
            <option value="ideologica">Ideológica</option>
          </optgroup>
          <optgroup label="Factuales">
            <option value="co_mencion">Co-mención</option>
            <option value="mediatica">Mediática</option>
            <option value="empresarial">Empresarial</option>
            <option value="juridica">Judicial</option>
          </optgroup>
          <optgroup label="Personal / Institucional">
            <option value="familiar">Familiar</option>
            <option value="institucional">Institucional</option>
            <option value="internacional">Internacional</option>
          </optgroup>
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text2">Peso:</span>
          <input
            type="range" min="0" max="0.8" step="0.05"
            value={minWeight}
            onChange={e => setMinWeight(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400"
          />
          <span className="text-xs text-muted font-mono w-8">{(minWeight * 100).toFixed(0)}%</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Fix 5 — leyenda colapsable en lugar de hidden xl:flex */}
          <button
            onClick={() => setShowLegend(l => !l)}
            className={`px-2 py-1 text-[10px] border rounded transition ${
              showLegend
                ? "border-cyan1/40 text-cyan1 bg-cyan1/5"
                : "border-border1 text-text2 hover:border-cyan1/30"
            }`}
          >
            Leyenda
          </button>
          <button
            onClick={() => setIsRunning(r => !r)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
              isRunning
                ? "bg-cyan1/10 border-cyan1/40 text-cyan1 hover:bg-cyan1/20"
                : "bg-bg3 border-border1 text-text2 hover:border-cyan1/30"
            }`}
          >
            {isRunning ? <><Pause className="w-3 h-3" /> FA2</> : <><Play className="w-3 h-3" /> FA2</>}
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 transition">
            <ZoomIn className="w-3.5 h-3.5 text-text2" />
          </button>
          <button onClick={zoomOut} className="p-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 transition">
            <ZoomOut className="w-3.5 h-3.5 text-text2" />
          </button>
          <button onClick={fitAll} className="p-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 transition" title="Encuadrar todo">
            <Maximize2 className="w-3.5 h-3.5 text-text2" />
          </button>
          <button onClick={() => refetch()} className="p-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 transition">
            <RefreshCw className={`w-3.5 h-3.5 text-text2 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="px-2 py-1 text-[10px] text-text2 border border-border1 rounded hover:border-cyan1/30 transition"
          >
            {isFullscreen ? "Reducir" : "Ampliar"}
          </button>
        </div>
      </div>

      {/* Fix 5 — leyenda expandible, fuera de la barra de controles */}
      {showLegend && (
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap px-4 py-2.5 border-b border-border1/40 bg-bg3/20 shrink-0">
          {Object.entries(RELATION_META).map(([type, meta]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
              <span className="text-[10px] text-text2">{meta.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-bg3/30 border-b border-border1/30 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-cyan1 animate-pulse" : "bg-muted"}`} />
        <span className="text-[9px] text-muted uppercase tracking-wider">
          {isRunning ? "Force-Atlas 2 activo" : "Layout pausado"}
          {data && ` · ${data.nodes.length} nodos · ${data.edges.length} aristas`}
          {" · auto-refresh 5 min"}
        </span>
        {isFetching && <span className="text-[9px] text-cyan1 ml-auto">Sincronizando…</span>}
      </div>

      {/* Fix 1 — canvasWrapRef para tooltip bounds dinámicos */}
      {/* Fix 8 — altura con clase Tailwind pura, sin graphHeight variable */}
      <div
        ref={canvasWrapRef}
        className={`relative flex-1 bg-[#050A14] ${isFullscreen ? "h-[calc(100vh-120px)]" : "h-[600px]"}`}
      >
        {/* Fix 9 — spinner cubre el estado de error durante refetch */}
        {isError && !isFetching ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text2">
            <AlertTriangle className="w-8 h-8 text-amber1" />
            <p className="text-sm">Error al cargar el grafo.</p>
            <button onClick={() => refetch()} className="px-3 py-1.5 text-xs rounded bg-cyan1 text-bg font-semibold">
              Reintentar
            </button>
          </div>
        ) : isLoading || isFetching ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 text-cyan1 animate-spin" />
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text2">
            <AlertTriangle className="w-8 h-8 text-amber1" />
            <p className="text-sm">Sin datos. Activa el discovery.</p>
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}

        {/* Fix 6 — tooltip con AnimatePresence para entrada/salida suave */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{    opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="absolute z-20 premium-card p-3 pointer-events-none min-w-[220px] max-w-[260px]"
              style={{
                // Fix 1 — clamp uses real container width, not hardcoded 520
                left: Math.min(tooltip.x + 14, (canvasWrapRef.current?.clientWidth ?? 600) - 280),
                top:  Math.max(tooltip.y - 12, 8),
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                {tooltip.node.photo_url ? (
                  <img src={tooltip.node.photo_url} alt={tooltip.node.name}
                    className="w-9 h-9 rounded-full object-cover border border-border1 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: tooltip.node.party_color ?? "#475569" }}>
                    {tooltip.node.name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text1 truncate">{tooltip.node.name}</div>
                  <div className="text-[10px] text-muted uppercase tracking-wider truncate">
                    {tooltip.node.party ?? "—"} · {tooltip.node.role ?? "—"}
                  </div>
                </div>
                {tooltip.node.trending && (
                  <span className="badge badge-amber text-[9px] ml-auto shrink-0">↑ Trending</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <div className="text-center">
                  <div className="text-[9px] text-muted uppercase">Relevancia</div>
                  <div className="text-cyan1 font-mono text-sm font-bold">{Math.round(tooltip.node.relevance)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted uppercase">Aprob.</div>
                  <div className="text-text1 font-mono text-sm">
                    {tooltip.node.approval != null ? `${Math.round(tooltip.node.approval)}%` : "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted uppercase">7d</div>
                  <div className="text-text1 font-mono text-sm">
                    {tooltip.node.mention_count_7d ?? tooltip.node.mentions_24h ?? 0}
                  </div>
                </div>
              </div>

              {tooltip.node.top_narrative && (
                <div className="text-[10px] text-amber1 border-t border-border1/40 pt-2 line-clamp-2">
                  ↗ {tooltip.node.top_narrative}
                </div>
              )}
              {(tooltip.node.risk_score ?? 0) > 0.3 && (
                <div className="text-[10px] text-red1 mt-1">
                  ⚠ Riesgo: {((tooltip.node.risk_score ?? 0) * 100).toFixed(0)}
                </div>
              )}
              <div className="text-[10px] text-cyan1 border-t border-border1/40 mt-2 pt-2">
                Click → abrir dossier
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
