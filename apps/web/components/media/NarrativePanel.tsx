"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from "lucide-react";

const MARCO_COLORS: Record<string, string> = {
  economico:     "#10B981",
  moralidad:     "#F59E0B",
  conflicto:     "#EF4444",
  interes_humano:"#3B82F6",
  estrategia:    "#8B5CF6",
};

const TENSION_CONFIG: Record<string, { badge: string; label: string }> = {
  alta:  { badge: "badge-red",   label: "Tensión alta" },
  media: { badge: "badge-amber", label: "Tensión media" },
  baja:  { badge: "badge-cyan",  label: "Tensión baja" },
};

const LIFECYCLE_CONFIG: Record<string, { badge: string; label: string }> = {
  peak:       { badge: "badge-red",   label: "Pico" },
  active:     { badge: "badge-amber", label: "Activa" },
  emergence:  { badge: "badge-blue",  label: "Emergente" },
  decline:    { badge: "badge-cyan",  label: "Declive" },
};

function VelocityIcon({ v }: { v: string }) {
  if (v === "up")   return <TrendingUp   className="w-4 h-4 text-red1" />;
  if (v === "down") return <TrendingDown className="w-4 h-4 text-green1" />;
  return <Minus className="w-4 h-4 text-text2" />;
}

function IntensityBar({ score }: { score: number }) {
  const pct = Math.min(score * 50, 100); // scale so ~2.0 = full
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct > 60 ? "#EF4444" : pct > 30 ? "#F59E0B" : "#00D4FF",
          }} />
      </div>
      <span className="text-[9px] text-muted w-6">{score.toFixed(2)}</span>
    </div>
  );
}

export function NarrativePanel() {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["media-intel", "narratives"],
    queryFn: () => endpoints.mediaIntelNarratives().catch(() => []),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const MARCOS = ["all", ...Array.from(new Set(data.map((n: any) => n.marco)))];

  const filtered = filter === "all" ? data : data.filter((n: any) => n.marco === filter);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-bg3 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {MARCOS.map(m => (
          <button key={m} onClick={() => setFilter(m)}
            className={`px-2.5 py-1 rounded text-xs transition ${
              filter === m
                ? "text-white font-semibold"
                : "text-text2 hover:text-text1 bg-bg3"
            }`}
            style={filter === m && m !== "all"
              ? { background: MARCO_COLORS[m] || "#00D4FF" }
              : filter === m
              ? { background: "#00D4FF", color: "#0f172a" }
              : {}}>
            {m === "all" ? "Todas" : m}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted self-center">
          {filtered.length} narrativas activas
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(filtered as any[]).map((n: any, i: number) => {
          const isSelected = selected === i;
          const marcoColor = MARCO_COLORS[n.marco] || "#00D4FF";
          const tension = TENSION_CONFIG[n.tension] || TENSION_CONFIG.baja;
          const lifecycle = LIFECYCLE_CONFIG[n.lifecycle] || LIFECYCLE_CONFIG.active;
          return (
            <div key={n.nombre}
              onClick={() => setSelected(isSelected ? null : i)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                  ? "border-cyan1/50 bg-bg2 shadow-lg"
                  : "border-border1 bg-bg2/70 hover:border-cyan1/30 hover:bg-bg2"
              }`}
              style={{ borderLeftWidth: "3px", borderLeftColor: marcoColor }}>

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <VelocityIcon v={n.velocity} />
                  <h3 className="text-sm font-bold text-text1 leading-snug">{n.nombre}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`badge ${lifecycle.badge} text-[9px]`}>{lifecycle.label}</span>
                  <span className={`badge ${tension.badge} text-[9px]`}>{tension.label}</span>
                </div>
              </div>

              {/* Intensity bar */}
              <IntensityBar score={n.score} />

              <div className="flex items-center gap-3 text-xs text-text2 mt-2">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {n.article_count} artículos matchados
                </span>
                <span>·</span>
                <span className="italic">{n.dominant_emotion}</span>
                <span className="ml-auto text-[9px]"
                  style={{ color: marcoColor }}>{n.marco}</span>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border1/60 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted block text-[9px] uppercase tracking-wide">Target</span>
                      <span className="text-text1">{n.target}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[9px] uppercase tracking-wide">Ideología</span>
                      <span className="text-text1 capitalize">{n.ideologia}</span>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 border flex items-start gap-2"
                    style={{ background: `${marcoColor}10`, borderColor: `${marcoColor}30` }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: marcoColor }} />
                    <p className="text-xs text-text1 leading-relaxed">{n.recommended_action}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-text2 text-sm">
          No hay narrativas activas en esta categoría.
        </div>
      )}
    </div>
  );
}
