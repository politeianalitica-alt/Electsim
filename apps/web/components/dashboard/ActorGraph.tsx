"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { endpoints } from "@/lib/api/endpoints";
import type { ActorGraphData } from "@/lib/api/endpoints";
import { Filter, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  onNodeClick?: (actorId: string) => void;
}

const RELATION_COLORS: Record<string, string> = {
  aliado:        "#10B981",
  coalicion:     "#3B82F6",
  rival:         "#EF4444",
  tension:       "#F59E0B",
  mediatica:     "#00D4FF",
  institucional: "#8B5CF6",
};

const RELATION_DASH: Record<string, string> = {
  rival:   "6 3",
  tension: "4 2",
};

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  party: string;
  color: string;
  role: string;
  relevance: number;
  exposure: number;
  sentiment: string;
  mentions_24h: number;
  group: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
  weight: number;
  label: string;
}

export function ActorGraph({ onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [minWeight, setMinWeight] = useState(0.05);
  const [relFilter, setRelFilter] = useState<string>("all");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null);

  const { data, isLoading, isFetching, refetch, isError } = useQuery<ActorGraphData>({
    queryKey: ["actor-graph", minWeight, relFilter],
    queryFn: () => endpoints.actors.graph({
      min_weight: minWeight,
      ...(relFilter !== "all" ? { relation_type: relFilter } : {}),
    }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    const { nodes, edges } = data;
    if (nodes.length === 0) return;

    const container = containerRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ── zoom + pan
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom as any);

    // ── arrow markers per relation
    const defs = svg.append("defs");
    Object.entries(RELATION_COLORS).forEach(([type, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color)
        .attr("opacity", 0.7);
    });

    // ── prepare nodes & links (deep copy to avoid mutating cache)
    const simNodes: SimNode[] = nodes.map(n => ({ ...n }));
    const simLinks: SimLink[] = edges.map(e => ({ ...e, source: e.source, target: e.target }));

    function nodeRadius(d: SimNode): number {
      return 8 + Math.min(20, (d.relevance / 100) * 18);
    }

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(d => 130 - d.weight * 70)
        .strength(d => Math.max(0.05, d.weight * 0.6)))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 8));

    // ── edges
    const link = g.append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", d => RELATION_COLORS[d.type] ?? "#475569")
      .attr("stroke-width", d => 1 + d.weight * 3)
      .attr("stroke-opacity", 0.55)
      .attr("stroke-dasharray", d => RELATION_DASH[d.type] ?? null)
      .attr("marker-end", d => `url(#arrow-${d.type})`);

    link.append("title").text(d => `${d.label} (${(d.weight * 100).toFixed(0)}%)`);

    // ── nodes group
    const nodeG = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x ?? null;
            d.fy = d.y ?? null;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      )
      .on("click", (event: MouseEvent, d: SimNode) => {
        event.stopPropagation();
        if (onNodeClick) onNodeClick(d.id);
      })
      .on("mouseover", (event: MouseEvent, d: SimNode) => {
        const rect = container.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
      })
      .on("mouseout", () => setTooltip(null));

    // node circle
    nodeG.append("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => d.color || "#475569")
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

    // node initials
    nodeG.append("text")
      .text(d => {
        const parts = d.name.split(" ").filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return d.name.slice(0, 2).toUpperCase();
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => `${nodeRadius(d) * 0.85}px`)
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none");

    // name label below
    nodeG.append("text")
      .text(d => d.name.split(" ").slice(0, 2).join(" "))
      .attr("text-anchor", "middle")
      .attr("dy", d => nodeRadius(d) + 12)
      .attr("font-size", "9.5px")
      .attr("fill", "#94A3B8")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as SimNode).x ?? 0)
        .attr("y1", d => (d.source as SimNode).y ?? 0)
        .attr("x2", d => (d.target as SimNode).x ?? 0)
        .attr("y2", d => (d.target as SimNode).y ?? 0);
      nodeG.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [data, onNodeClick]);

  return (
    <div className="premium-card p-0 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-3 p-4 border-b border-border1 flex-wrap">
        <Filter className="w-4 h-4 text-cyan1 shrink-0" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-text2">Relación:</span>
          <select
            value={relFilter}
            onChange={e => setRelFilter(e.target.value)}
            className="bg-bg3 border border-border1 rounded px-2 py-1 text-xs text-text1 focus:border-cyan1 focus:outline-none"
          >
            <option value="all">Todas</option>
            <option value="aliado">Aliados</option>
            <option value="rival">Rivales</option>
            <option value="coalicion">Coalición</option>
            <option value="tension">Tensión</option>
            <option value="mediatica">Mediática</option>
            <option value="institucional">Institucional</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text2">Peso mín:</span>
          <input
            type="range" min="0" max="0.8" step="0.05"
            value={minWeight}
            onChange={e => setMinWeight(parseFloat(e.target.value))}
            className="w-24 accent-cyan-400"
          />
          <span className="text-xs text-muted font-mono w-10">{(minWeight * 100).toFixed(0)}%</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {Object.entries(RELATION_COLORS).slice(0, 4).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-muted capitalize">{type}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 transition"
            title="Refrescar"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text2 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ height: 600 }}>
        {isError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text2">
            <AlertTriangle className="w-8 h-8 text-amber1" />
            <p className="text-sm">Error al cargar el grafo</p>
            <button onClick={() => refetch()} className="px-3 py-1.5 text-xs rounded bg-cyan1 text-bg font-semibold">Reintentar</button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 text-cyan1 animate-spin" />
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text2">
            <AlertTriangle className="w-8 h-8 text-amber1" />
            <p className="text-sm">Sin datos del grafo. Pulsa <strong>Descubrir figuras</strong> en el header para ingestar relaciones.</p>
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height="100%" className="bg-bg" />
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 premium-card p-3 text-xs pointer-events-none min-w-[200px] shadow-xl"
            style={{ left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 800) - 220), top: Math.max(tooltip.y - 10, 8) }}
          >
            <div className="font-bold text-text1 mb-1">{tooltip.node.name}</div>
            <div className="text-muted text-[10px] uppercase tracking-wider mb-1">
              {tooltip.node.party} · {tooltip.node.role}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[10px] text-muted">Relevancia</div>
                <div className="text-cyan1 font-mono text-sm">{Math.round(tooltip.node.relevance)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted">Menciones 24h</div>
                <div className="text-text1 font-mono text-sm">{tooltip.node.mentions_24h}</div>
              </div>
            </div>
            <div className="text-[10px] text-cyan1 mt-2">click para abrir dossier</div>
          </div>
        )}
      </div>
    </div>
  );
}
