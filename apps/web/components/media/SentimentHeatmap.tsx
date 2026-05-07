"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";

const PARTY_COLORS: Record<string, string> = {
  PP: "#1F77FF", PSOE: "#E03A3E", VOX: "#5BC035",
  SUMAR: "#D81E5B", PODEMOS: "#A020F0", JUNTS: "#00C2A8",
  ERC: "#F4B400", PNV: "#1D8042", BILDU: "#A4D65E",
};

function sentColor(val: number): string {
  if (val > 0.15)  return "#10B981"; // green
  if (val > 0.05)  return "#34D399";
  if (val < -0.15) return "#EF4444"; // red
  if (val < -0.05) return "#F87171";
  return "#94A3B8"; // grey neutral
}

function Cell({ val, n }: { val: number; n: number }) {
  const bg = sentColor(val);
  const opacity = Math.min(0.2 + Math.abs(val) * 2, 1);
  return (
    <td className="text-center p-0.5" title={`${val > 0 ? "+" : ""}${val.toFixed(3)} (${n} noticias)`}>
      <div className="w-full h-7 rounded flex items-center justify-center text-[9px] font-bold transition"
        style={{ background: `${bg}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`, color: bg }}>
        {n > 0 ? (val > 0 ? "+" : "") + val.toFixed(2) : ""}
      </div>
    </td>
  );
}

export function SentimentHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ["media-intel", "sentiment-heatmap"],
    queryFn: () => endpoints.mediaIntelSentimentHeatmap().catch(() => ({ rows: [], parties: [], dates: [], mode: "error" })),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="h-48 bg-bg3 rounded animate-pulse" />;
  }

  const rows: any[] = data?.rows || [];
  const parties: string[] = data?.parties || [];
  const dates: string[] = data?.dates || [];

  if (!rows.length) {
    return (
      <div className="text-center py-8 text-text2 text-sm">
        No hay datos de sentimiento disponibles.
      </div>
    );
  }

  // Build lookup: date × party → { sentimiento_medio, n_noticias }
  const lookup: Record<string, Record<string, { s: number; n: number }>> = {};
  for (const r of rows) {
    const d = String(r.fecha || "").slice(0, 10);
    const e = r.entidad;
    if (!lookup[d]) lookup[d] = {};
    lookup[d][e] = { s: Number(r.sentimiento_medio || 0), n: Number(r.n_noticias || 0) };
  }

  // Show max 10 most recent dates
  const shownDates = dates.slice(-10);

  return (
    <div className="space-y-3 overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="text-left text-[10px] text-text2 font-medium pb-2 pr-3 w-20">Partido</th>
            {shownDates.map(d => (
              <th key={d} className="text-center text-[9px] text-muted font-normal pb-2 px-0.5 min-w-[52px]">
                {d.slice(5)} {/* MM-DD */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parties.map(party => (
            <tr key={party}>
              <td className="pr-3 py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: PARTY_COLORS[party] || "#94A3B8" }} />
                  <span className="font-semibold text-text1">{party}</span>
                </div>
              </td>
              {shownDates.map(d => {
                const cell = lookup[d]?.[party];
                return <Cell key={d} val={cell?.s ?? 0} n={cell?.n ?? 0} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <span className="text-[10px] text-text2">Sentimiento:</span>
        {[
          { label: "Muy positivo", color: "#10B981" },
          { label: "Positivo", color: "#34D399" },
          { label: "Neutro", color: "#94A3B8" },
          { label: "Negativo", color: "#F87171" },
          { label: "Muy negativo", color: "#EF4444" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: color }} />
            <span className="text-[9px] text-text2">{label}</span>
          </span>
        ))}
        <span className="ml-auto text-[9px] text-muted">Hover sobre cada celda para ver detalles</span>
      </div>
    </div>
  );
}
