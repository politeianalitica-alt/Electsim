"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";

const IDEOLOGY_ORDER = ["izquierda", "centroizquierda", "centro", "centroderecha", "derecha", "nacionalista"];
const IDEOLOGY_COLORS: Record<string, string> = {
  "izquierda":       "#E03A3E",
  "centroizquierda": "#F59E0B",
  "centro":          "#94A3B8",
  "centroderecha":   "#3B82F6",
  "derecha":         "#1F77FF",
  "nacionalista":    "#10B981",
};
const IDEOLOGY_LABELS: Record<string, string> = {
  "izquierda":       "Izq.",
  "centroizquierda": "C-Izq.",
  "centro":          "Centro",
  "centroderecha":   "C-Der.",
  "derecha":         "Der.",
  "nacionalista":    "Nac.",
};

function SentimentDot({ score }: { score: number }) {
  const color = score > 0.05 ? "#10B981" : score < -0.05 ? "#EF4444" : "#94A3B8";
  const label = score > 0.05 ? "+" : score < -0.05 ? "–" : "~";
  return (
    <span className="text-[9px] font-bold ml-1" style={{ color }}>
      {label}{Math.abs(score).toFixed(2)}
    </span>
  );
}

export function BiasSpectrum() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["media-intel", "bias-spectrum"],
    queryFn: () => endpoints.mediaIntelBiasSpectrum().catch(() => []),
    staleTime: 10 * 60 * 1000,
  });

  const grouped: Record<string, any[]> = {};
  for (const item of data) {
    const key = item.ideology || "centro";
    grouped[key] = [...(grouped[key] || []), item];
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-bg3 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // Visual spectrum bar
  const totals: Record<string, number> = {};
  for (const [ideo, items] of Object.entries(grouped)) {
    totals[ideo] = items.reduce((s, i) => s + (i.audiencia || 0), 0);
  }
  const grandTotal = Math.max(1, Object.values(totals).reduce((a, b) => a + b, 0));

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text2 mb-2">Audiencia por tendencia ideológica (millones)</p>
        <div className="flex h-6 rounded-full overflow-hidden border border-border1">
          {IDEOLOGY_ORDER.filter(k => totals[k] > 0).map(k => (
            <div key={k}
              className="flex items-center justify-center text-[8px] font-bold text-white transition-all"
              style={{
                background: IDEOLOGY_COLORS[k],
                width: `${(totals[k] / grandTotal) * 100}%`,
                minWidth: totals[k] > 0 ? "2%" : "0",
              }}
              title={`${IDEOLOGY_LABELS[k]}: ${totals[k].toFixed(1)}M`}>
              {(totals[k] / grandTotal) > 0.08 ? IDEOLOGY_LABELS[k] : ""}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {IDEOLOGY_ORDER.filter(k => totals[k] > 0).map(k => (
            <span key={k} className="flex items-center gap-1 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: IDEOLOGY_COLORS[k] }} />
              <span className="text-text2">{IDEOLOGY_LABELS[k]} {totals[k].toFixed(1)}M</span>
            </span>
          ))}
        </div>
      </div>

      {/* Per-source listing */}
      <div className="space-y-1">
        {IDEOLOGY_ORDER.map(ideo => {
          const items = grouped[ideo];
          if (!items?.length) return null;
          const color = IDEOLOGY_COLORS[ideo];
          return (
            <div key={ideo}>
              <div className="flex items-center gap-2 mb-1 mt-3">
                <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color }}>
                  {ideo}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {items.sort((a, b) => (b.audiencia || 0) - (a.audiencia || 0)).map((s: any) => (
                  <div key={s.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border1 hover:border-opacity-60 transition"
                    style={{ borderLeftColor: color, borderLeftWidth: "3px" }}>
                    <div className="min-w-0">
                      <span className="text-xs text-text1 font-medium truncate block">{s.name}</span>
                      <span className="text-[9px] text-muted">{s.tipo} · {s.grupo}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs text-text2">{s.audiencia?.toFixed(1)}M</div>
                      {s.article_count > 0 && (
                        <div className="text-[9px] text-muted">
                          {s.article_count} arts.
                          <SentimentDot score={s.avg_sentiment || 0} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Polar bias scale — bubbles sized by audience, contained in overflow-visible wrapper */}
      <div className="pt-2 border-t border-border1">
        <p className="text-[10px] uppercase tracking-wider text-text2 mb-2">Espectro político</p>
        {/* Track + bubbles: give enough vertical room so bubbles don't clip neighbours */}
        <div className="relative" style={{ height: "36px", marginBottom: "4px" }}>
          {/* Gradient rail — vertically centred */}
          <div className="absolute rounded-full" style={{
            top: "50%", transform: "translateY(-50%)",
            left: 0, right: 0, height: "8px",
            background: "linear-gradient(to right, #E03A3E, #F59E0B, #94A3B8, #3B82F6, #1F77FF)",
          }} />
          {data.filter((s: any) => s.audiencia > 0).map((s: any) => {
            const pos = ((s.ideology_pos ?? 5) / 10) * 100;
            // Cap bubble diameter to 28px so they stay within the 36px container
            const diam = Math.min(8 + (s.audiencia || 0) * 1.5, 28);
            return (
              <div key={s.name}
                className="absolute cursor-default group"
                style={{
                  left: `${pos}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1,
                }}
                title={`${s.name} (${s.ideology_pos?.toFixed(1)})`}>
                <div className="rounded-full border-2 border-bg"
                  style={{
                    background: IDEOLOGY_COLORS[s.ideology] || "#94A3B8",
                    width: `${diam}px`,
                    height: `${diam}px`,
                  }} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                  bg-bg2 border border-border1 px-1.5 py-0.5 rounded text-[9px] text-text1
                  whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  style={{ zIndex: 20 }}>
                  {s.name} · {s.audiencia?.toFixed(1)}M
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted mt-1">
          <span>◀ Izquierda</span><span>Centro</span><span>Derecha ▶</span>
        </div>
      </div>
    </div>
  );
}
